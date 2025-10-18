/**
 * n.Solve - Core Processor Persistence Logic
 * Distinguish between Reimportation (Filtering) and Deduplication
 */

import { NSolveFinding } from '../shared/types';

export interface Env {
  VLM_DB: D1Database;
}

export type PersistenceStatus = 
  | 'NEW_FINDING'           // Achado novo, criado no D1
  | 'REIMPORTED_FILTERED'   // Achado reimportado do mesmo asset, apenas timestamp atualizado
  | 'DUPLICATE_CREATED';    // Achado duplicado de asset diferente, marcado como duplicate

export interface PersistenceResult {
  status: PersistenceStatus;
  finding_uuid: string;
  original_finding_uuid?: string;
  message: string;
}

/**
 * Process Finding for Persistence
 * Core logic for reimportation vs deduplication
 */
export async function processFindingForPersistence(
  finding: Partial<NSolveFinding>,
  assetId: string,
  env: Env
): Promise<PersistenceResult> {
  try {
    const correlationKey = finding.correlation_key;
    
    if (!correlationKey) {
      throw new Error('correlation_key is required');
    }

    // Step 1: Try to find existing finding by correlation_key
    const originalFinding = await env.VLM_DB
      .prepare(`
        SELECT * FROM vulnerabilities 
        WHERE correlation_key = ? 
          AND is_duplicate = FALSE
        ORDER BY created_at ASC
        LIMIT 1
      `)
      .bind(correlationKey)
      .first();

    const currentTimestamp = new Date().toISOString();

    // CASO 1: Original Finding encontrado
    if (originalFinding) {
      const original = originalFinding as any;

      // LÓGICA DE REIMPORTAÇÃO (mesmo asset)
      if (original.asset_id === assetId) {
        // Apenas atualiza last_seen_timestamp
        await env.VLM_DB.prepare(`
          UPDATE vulnerabilities 
          SET last_seen_timestamp = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(currentTimestamp, original.id).run();

        console.log(`✅ REIMPORTED_FILTERED: ${original.id} from asset ${assetId}`);

        return {
          status: 'REIMPORTED_FILTERED',
          finding_uuid: original.id,
          original_finding_uuid: original.id,
          message: `Finding reimported from same asset, timestamp updated`
        };
      }

      // LÓGICA DE DEDUPLICAÇÃO (asset diferente)
      else {
        // Criar novo registro marcado como duplicado
        const duplicateId = `vuln-${crypto.randomUUID()}`;

        await env.VLM_DB.prepare(`
          INSERT INTO vulnerabilities (
            id, title, description, severity, severidade_ajustada, status, status_vlm,
            correlation_key, original_finding_uuid, is_duplicate,
            asset_id, tenant_id, source_tool, location_type,
            cve, cvss_score, cwe,
            first_seen_timestamp, last_seen_timestamp,
            created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, 'INACTIVE_DUPLICATE',
            ?, ?, TRUE,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `).bind(
          duplicateId,
          finding.titulo || finding.title,
          finding.description || finding.descricao,
          finding.severidade_original || finding.severity || 'MEDIUM',
          finding.severidade_ajustada || finding.severity || 'MEDIUM',
          'open',
          correlationKey,
          original.id, // Reference to original
          assetId,
          finding.tenant_id || 'org-ness',
          finding.source_tool || 'unknown',
          finding.location_type || 'WEB',
          finding.cve,
          finding.cvss_score,
          finding.cwe,
          currentTimestamp,
          currentTimestamp
        ).run();

        console.log(`🔁 DUPLICATE_CREATED: ${duplicateId} (original: ${original.id}) from asset ${assetId}`);

        return {
          status: 'DUPLICATE_CREATED',
          finding_uuid: duplicateId,
          original_finding_uuid: original.id,
          message: `Duplicate finding created for different asset, marked as INACTIVE_DUPLICATE`
        };
      }
    }

    // CASO 2: Nenhum Original Finding encontrado - Novo achado primário
    else {
      const newId = `vuln-${crypto.randomUUID()}`;

      await env.VLM_DB.prepare(`
        INSERT INTO vulnerabilities (
          id, title, description, severity, severidade_ajustada, status, status_vlm,
          correlation_key, original_finding_uuid, is_duplicate,
          asset_id, tenant_id, source_tool, location_type,
          cve, cvss_score, cwe,
          first_seen_timestamp, last_seen_timestamp,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, 'PENDING_TRIAGE',
          ?, NULL, FALSE,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `).bind(
        newId,
        finding.titulo || finding.title,
        finding.description || finding.descricao,
        finding.severidade_original || finding.severity || 'MEDIUM',
        finding.severidade_ajustada || finding.severity || 'MEDIUM',
        'open',
        correlationKey,
        assetId,
        finding.tenant_id || 'org-ness',
        finding.source_tool || 'unknown',
        finding.location_type || 'WEB',
        finding.cve,
        finding.cvss_score,
        finding.cwe,
        currentTimestamp,
        currentTimestamp
      ).run();

      console.log(`✨ NEW_FINDING: ${newId} from asset ${assetId}`);

      return {
        status: 'NEW_FINDING',
        finding_uuid: newId,
        message: `New primary finding created with status PENDING_TRIAGE`
      };
    }

  } catch (error) {
    console.error('Persistence processing error:', error);
    throw error;
  }
}

/**
 * Get duplicate findings for a primary finding
 */
export async function getDuplicateFindings(
  originalFindingUuid: string,
  env: Env
): Promise<any[]> {
  try {
    const result = await env.VLM_DB.prepare(`
      SELECT * FROM vulnerabilities 
      WHERE original_finding_uuid = ? 
        AND is_duplicate = TRUE
      ORDER BY created_at DESC
    `).bind(originalFindingUuid).all();

    return result.results || [];
  } catch (error) {
    console.error('Error getting duplicates:', error);
    return [];
  }
}

/**
 * Merge duplicate back to original (if fixed in one asset)
 */
export async function mergeDuplicateToOriginal(
  duplicateId: string,
  env: Env
): Promise<boolean> {
  try {
    // Get duplicate
    const duplicate = await env.VLM_DB
      .prepare('SELECT * FROM vulnerabilities WHERE id = ?')
      .bind(duplicateId)
      .first() as any;

    if (!duplicate || !duplicate.original_finding_uuid) {
      return false;
    }

    // Update original finding with fix info
    await env.VLM_DB.prepare(`
      UPDATE vulnerabilities 
      SET status_vlm = 'AWAITING_RETEST',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(duplicate.original_finding_uuid).run();

    // Mark duplicate as merged
    await env.VLM_DB.prepare(`
      UPDATE vulnerabilities 
      SET status = 'merged',
          status_vlm = 'CLOSED',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(duplicateId).run();

    return true;
  } catch (error) {
    console.error('Error merging duplicate:', error);
    return false;
  }
}

