/**
 * n.Solve - Reimport Module
 * Módulo para testes recorrentes de CI/CD com fechamento e reabertura automática
 */

import { D1Database } from '@cloudflare/workers-types';
import { NSolveFinding, AssetConfig } from '../shared/types';

export interface ReimportResult {
  closed_findings: number;
  reactivated_findings: number;
  new_findings: number;
  unchanged_findings: number;
  details: {
    closed_ids: string[];
    reactivated_ids: string[];
    new_correlation_keys: string[];
  };
}

/**
 * Process Recurring Reimport
 * Gerencia fechamento e reabertura de achados em scans recorrentes
 * 
 * @param currentFindings - Array de achados do scan atual
 * @param assetId - ID do ativo sendo scaneado
 * @param sourceTool - Ferramenta de origem (ex: 'pentest-tools', 'zap')
 * @param assetConfig - Configuração do ativo com políticas de reimport
 * @param db - D1 Database binding
 * @returns ReimportResult com estatísticas e detalhes
 */
export async function processRecurringReimport(
  currentFindings: NSolveFinding[],
  assetId: string,
  sourceTool: string,
  assetConfig: AssetConfig,
  db: D1Database
): Promise<ReimportResult> {
  
  const result: ReimportResult = {
    closed_findings: 0,
    reactivated_findings: 0,
    new_findings: 0,
    unchanged_findings: 0,
    details: {
      closed_ids: [],
      reactivated_ids: [],
      new_correlation_keys: [],
    },
  };

  try {
    // Criar mapa de correlation_keys do scan atual para busca rápida
    const currentCorrelationKeys = new Set(
      currentFindings.map(f => f.correlation_key)
    );

    // 1. Recuperar todos os achados ATIVOS existentes no D1 para o asset_id e source_tool
    const existingActiveFindings = await db
      .prepare(`
        SELECT id, correlation_key, status_vlm, is_duplicate
        FROM vulnerabilities
        WHERE asset_id = ? 
          AND source_tool = ?
          AND status_vlm NOT IN ('CLOSED', 'FALSE_POSITIVE', 'RISK_ACCEPTED')
          AND is_duplicate = FALSE
      `)
      .bind(assetId, sourceTool)
      .all();

    const activeFindings = existingActiveFindings.results || [];

    console.log(`[Reimport] Found ${activeFindings.length} active findings for asset ${assetId}`);

    // 2. LÓGICA DE FECHAMENTO (CLOSE)
    if (assetConfig.close_old_findings) {
      for (const existingFinding of activeFindings as any[]) {
        // Se o achado existente NÃO está no scan atual, fechar
        if (!currentCorrelationKeys.has(existingFinding.correlation_key)) {
          await db
            .prepare(`
              UPDATE vulnerabilities
              SET status_vlm = 'CLOSED',
                  mitigated_date = CURRENT_TIMESTAMP,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `)
            .bind(existingFinding.id)
            .run();

          result.closed_findings++;
          result.details.closed_ids.push(existingFinding.id);

          console.log(`[Reimport] CLOSED finding ${existingFinding.id} (not in current scan)`);
        } else {
          result.unchanged_findings++;
        }
      }
    }

    // 3. LÓGICA DE REABERTURA (REACTIVATE)
    if (!assetConfig.do_not_reactivate) {
      // Buscar achados FECHADOS que podem ser reabertos
      const closedFindings = await db
        .prepare(`
          SELECT id, correlation_key, status_vlm
          FROM vulnerabilities
          WHERE asset_id = ?
            AND source_tool = ?
            AND status_vlm = 'CLOSED'
            AND is_duplicate = FALSE
        `)
        .bind(assetId, sourceTool)
        .all();

      for (const closedFinding of (closedFindings.results || []) as any[]) {
        // Se o achado fechado ESTÁ no scan atual, reabrir
        if (currentCorrelationKeys.has(closedFinding.correlation_key)) {
          await db
            .prepare(`
              UPDATE vulnerabilities
              SET status_vlm = 'PENDING_TRIAGE',
                  mitigated_date = NULL,
                  updated_at = CURRENT_TIMESTAMP,
                  last_seen_timestamp = CURRENT_TIMESTAMP
              WHERE id = ?
            `)
            .bind(closedFinding.id)
            .run();

          result.reactivated_findings++;
          result.details.reactivated_ids.push(closedFinding.id);

          console.log(`[Reimport] REACTIVATED finding ${closedFinding.id} (found in current scan)`);

          // Remover do conjunto para não criar duplicado
          currentCorrelationKeys.delete(closedFinding.correlation_key);
        }
      }
    }

    // 4. Identificar achados NOVOS (não existem no D1)
    // Os que sobraram em currentCorrelationKeys são novos
    const existingCorrelationKeys = new Set(
      activeFindings.map((f: any) => f.correlation_key)
    );

    for (const finding of currentFindings) {
      if (!existingCorrelationKeys.has(finding.correlation_key) &&
          currentCorrelationKeys.has(finding.correlation_key)) {
        result.new_findings++;
        result.details.new_correlation_keys.push(finding.correlation_key);
      }
    }

    console.log(`[Reimport] Summary:`, {
      closed: result.closed_findings,
      reactivated: result.reactivated_findings,
      new: result.new_findings,
      unchanged: result.unchanged_findings,
    });

    return result;

  } catch (error) {
    console.error('[Reimport] Error during reimport process:', error);
    throw error;
  }
}

/**
 * Filter New Findings
 * Filtra o array de achados atuais para retornar apenas os NOVOS
 * (que devem ser inseridos no D1)
 * 
 * @param currentFindings - Array de achados do scan atual
 * @param reimportResult - Resultado do processRecurringReimport
 * @returns Array filtrado apenas com achados novos
 */
export function filterNewFindings(
  currentFindings: NSolveFinding[],
  reimportResult: ReimportResult
): NSolveFinding[] {
  const newCorrelationKeys = new Set(reimportResult.details.new_correlation_keys);
  
  return currentFindings.filter(finding => 
    newCorrelationKeys.has(finding.correlation_key)
  );
}

