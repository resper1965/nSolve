/**
 * n.Solve - Cross-Tool Vulnerability Sync
 * Inspirado no DefectDojo para deduplicação entre ferramentas
 */

import { D1Database } from '@cloudflare/workers-types';
import { NSolveFinding, Severity } from '../shared/types';
import {
  generateCrossToolHash,
  generateCorrelationKey,
  normalizeSeverity,
  extractSourceToolId,
  getDeduplicationStrategy,
  DeduplicationStrategy,
} from '../shared/deduplication-utils';

export interface VulnerabilityIngestPayload {
  // Identificação
  asset_id: string;
  tenant_id: string;
  
  // Dados da Vulnerabilidade
  title: string;
  description: string;
  severity: string;
  
  // Ferramenta de Origem
  source_tool: string;              // WAZUH, DEFECTDOJO, NESSUS, PENTEST-TOOLS, ZAP
  source_tool_id?: string;          // ID original na ferramenta
  
  // Dados Adicionais
  cve_id?: string;
  cvss_score?: number;
  cwe?: string;
  url?: string;
  parameter?: string;
  location_detail?: string;
  
  // Status
  status?: 'ACTIVE' | 'MITIGATED' | 'FALSE_POSITIVE';
  
  // Timestamps
  discovered_date?: string;
  
  // Payload original (para referência)
  raw_payload?: any;
}

export interface SyncResult {
  action: 'CREATED' | 'UPDATED' | 'NO_CHANGE';
  finding_id: string;
  deduplication_strategy: DeduplicationStrategy;
  matched_by?: 'SOURCE_TOOL_ID' | 'CROSS_TOOL_HASH' | 'CORRELATION_KEY';
}

/**
 * Sync Vulnerability (UPSERT com Cross-Tool Deduplication)
 * 
 * Estratégias de busca (em ordem):
 * 1. SOURCE_TOOL_ID: Busca por (source_tool_id + source_tool)
 * 2. CROSS_TOOL_HASH: Busca por (deduplication_hash + asset_id)
 * 3. CORRELATION_KEY: Busca por (correlation_key + asset_id)
 * 
 * @param db - D1 Database
 * @param payload - Dados da vulnerabilidade
 * @returns Resultado do sync (CREATED/UPDATED/NO_CHANGE)
 */
export async function syncVulnerability(
  db: D1Database,
  payload: VulnerabilityIngestPayload
): Promise<SyncResult> {
  
  // 1. Normalizar e preparar dados
  const normalizedSeverity = normalizeSeverity(payload.severity);
  const sourceToolId = payload.source_tool_id || extractSourceToolId(payload.raw_payload || {}, payload.source_tool);
  
  // 2. Calcular hashes
  const deduplicationHash = await generateCrossToolHash(
    payload.title,
    normalizedSeverity,
    payload.asset_id
  );
  
  const correlationKey = await generateCorrelationKey(
    payload.title,
    payload.url || payload.location_detail || '',
    payload.parameter || ''
  );
  
  // 3. Determinar estratégia de deduplicação
  const strategy = getDeduplicationStrategy(payload.source_tool);
  
  // 4. Buscar achado existente (Multi-Strategy)
  let existingFinding: any = null;
  let matchedBy: 'SOURCE_TOOL_ID' | 'CROSS_TOOL_HASH' | 'CORRELATION_KEY' | undefined;
  
  // Estratégia 1: SOURCE_TOOL_ID (se disponível)
  if (sourceToolId && (strategy === DeduplicationStrategy.SOURCE_TOOL_ID || strategy === DeduplicationStrategy.HYBRID)) {
    existingFinding = await db
      .prepare(`
        SELECT * FROM vulnerabilities
        WHERE source_tool_id = ? AND source_tool = ?
        LIMIT 1
      `)
      .bind(sourceToolId, payload.source_tool)
      .first();
    
    if (existingFinding) {
      matchedBy = 'SOURCE_TOOL_ID';
      console.log(`[CrossToolSync] Found by SOURCE_TOOL_ID: ${sourceToolId}`);
    }
  }
  
  // Estratégia 2: CROSS_TOOL_HASH (fallback ou estratégia primária)
  if (!existingFinding && (strategy === DeduplicationStrategy.CROSS_TOOL_HASH || strategy === DeduplicationStrategy.HYBRID)) {
    existingFinding = await db
      .prepare(`
        SELECT * FROM vulnerabilities
        WHERE deduplication_hash = ? AND asset_id = ?
        LIMIT 1
      `)
      .bind(deduplicationHash, payload.asset_id)
      .first();
    
    if (existingFinding) {
      matchedBy = 'CROSS_TOOL_HASH';
      console.log(`[CrossToolSync] Found by CROSS_TOOL_HASH: ${deduplicationHash.substring(0, 16)}...`);
    }
  }
  
  // Estratégia 3: CORRELATION_KEY (fallback final)
  if (!existingFinding && (strategy === DeduplicationStrategy.CORRELATION_KEY || strategy === DeduplicationStrategy.HYBRID)) {
    existingFinding = await db
      .prepare(`
        SELECT * FROM vulnerabilities
        WHERE correlation_key = ? AND asset_id = ?
        LIMIT 1
      `)
      .bind(correlationKey, payload.asset_id)
      .first();
    
    if (existingFinding) {
      matchedBy = 'CORRELATION_KEY';
      console.log(`[CrossToolSync] Found by CORRELATION_KEY: ${correlationKey.substring(0, 16)}...`);
    }
  }
  
  // 5. UPSERT: UPDATE ou INSERT
  if (existingFinding) {
    // UPDATE: Achado existente encontrado
    await db
      .prepare(`
        UPDATE vulnerabilities
        SET 
          title = ?,
          raw_title = ?,
          description = ?,
          severity = ?,
          severidade_original = ?,
          severidade_ajustada = ?,
          cve = ?,
          cvss_score = ?,
          cwe = ?,
          status = ?,
          source_tool_id = ?,
          deduplication_hash = ?,
          correlation_key = ?,
          last_seen_timestamp = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
        payload.title,
        payload.title,
        payload.description,
        normalizedSeverity,
        normalizedSeverity,
        normalizedSeverity,
        payload.cve_id || null,
        payload.cvss_score || null,
        payload.cwe || null,
        payload.status || 'ACTIVE',
        sourceToolId || null,
        deduplicationHash,
        correlationKey,
        existingFinding.id
      )
      .run();
    
    console.log(`[CrossToolSync] UPDATED finding: ${existingFinding.id}`);
    
    return {
      action: 'UPDATED',
      finding_id: existingFinding.id,
      deduplication_strategy: strategy,
      matched_by: matchedBy,
    };
    
  } else {
    // INSERT: Novo achado
    const newFindingId = `vuln-${crypto.randomUUID()}`;
    
    await db
      .prepare(`
        INSERT INTO vulnerabilities (
          id, tenant_id, asset_id,
          title, raw_title, description,
          severity, severidade_original, severidade_ajustada,
          cve, cvss_score, cwe,
          status, status_vlm,
          source_tool, source_tool_id,
          deduplication_hash, correlation_key,
          discovered_date, first_seen_timestamp, last_seen_timestamp,
          created_at, updated_at, last_status_change_date,
          is_duplicate, is_verified, is_false_positive, risk_accepted,
          tags
        ) VALUES (
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, 'ACTIVE',
          ?, ?,
          ?, ?,
          ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
          FALSE, FALSE, FALSE, FALSE,
          '[]'
        )
      `)
      .bind(
        newFindingId, payload.tenant_id, payload.asset_id,
        payload.title, payload.title, payload.description,
        normalizedSeverity, normalizedSeverity, normalizedSeverity,
        payload.cve_id || null, payload.cvss_score || null, payload.cwe || null,
        payload.status || 'ACTIVE',
        payload.source_tool, sourceToolId || null,
        deduplicationHash, correlationKey,
        payload.discovered_date || new Date().toISOString()
      )
      .run();
    
    console.log(`[CrossToolSync] CREATED new finding: ${newFindingId}`);
    
    return {
      action: 'CREATED',
      finding_id: newFindingId,
      deduplication_strategy: strategy,
    };
  }
}

/**
 * Batch Sync Vulnerabilities
 * Processa múltiplas vulnerabilidades em lote
 * 
 * @param db - D1 Database
 * @param payloads - Array de vulnerabilidades
 * @returns Array de resultados
 */
export async function batchSyncVulnerabilities(
  db: D1Database,
  payloads: VulnerabilityIngestPayload[]
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  
  for (const payload of payloads) {
    try {
      const result = await syncVulnerability(db, payload);
      results.push(result);
    } catch (error) {
      console.error(`[CrossToolSync] Error syncing vulnerability:`, error);
      // Continuar processamento mesmo com erros
    }
  }
  
  return results;
}

