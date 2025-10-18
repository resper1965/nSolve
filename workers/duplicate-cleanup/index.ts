/**
 * n.Solve - Duplicate Cleanup Agent
 * Worker agendado (Cron Trigger) para limpeza automática de duplicatas antigas
 * Executa diariamente e remove duplicatas que excedem o limite configurado
 */

import { D1Database } from '@cloudflare/workers-types';

export interface Env {
  VLM_DB: D1Database;
}

/**
 * Interface para AssetConfig (subset relevante)
 */
interface AssetConfigPolicy {
  id: string;
  tenant_id: string;
  enable_deduplication: boolean;
  delete_duplicate_findings: boolean;
  max_duplicates: number;
}

/**
 * Executa a limpeza de duplicatas antigas
 */
async function executeDuplicateCleanup(env: Env): Promise<{
  total_processed: number;
  total_deleted: number;
  details: Array<{
    original_finding_id: string;
    duplicates_found: number;
    duplicates_deleted: number;
  }>;
}> {
  const results = {
    total_processed: 0,
    total_deleted: 0,
    details: [] as Array<{
      original_finding_id: string;
      duplicates_found: number;
      duplicates_deleted: number;
    }>,
  };

  try {
    // 1. Buscar todos os AssetConfigs com política de exclusão ativa
    const assetConfigs = await env.VLM_DB
      .prepare(`
        SELECT id, tenant_id, enable_deduplication, delete_duplicate_findings, max_duplicates
        FROM asset_configs
        WHERE delete_duplicate_findings = TRUE AND enable_deduplication = TRUE
      `)
      .all();

    if (!assetConfigs.results || assetConfigs.results.length === 0) {
      console.log('[DuplicateCleanup] No asset configs with deletion policy found');
      return results;
    }

    console.log(`[DuplicateCleanup] Found ${assetConfigs.results.length} assets with deletion policy`);

    // 2. Para cada AssetConfig, buscar achados primários (originais) desse tenant
    for (const config of assetConfigs.results as AssetConfigPolicy[]) {
      // Buscar todos os achados primários (não duplicados) do tenant
      const originalFindings = await env.VLM_DB
        .prepare(`
          SELECT id, correlation_key
          FROM vulnerabilities
          WHERE tenant_id = ? AND is_duplicate = FALSE
        `)
        .bind(config.tenant_id)
        .all();

      if (!originalFindings.results || originalFindings.results.length === 0) {
        continue;
      }

      console.log(`[DuplicateCleanup] Processing ${originalFindings.results.length} original findings for tenant ${config.tenant_id}`);

      // 3. Para cada achado original, verificar duplicatas
      for (const original of originalFindings.results as any[]) {
        results.total_processed++;

        // Buscar todas as duplicatas deste achado, ordenadas por created_at ASC (mais antigas primeiro)
        const duplicates = await env.VLM_DB
          .prepare(`
            SELECT id, created_at
            FROM vulnerabilities
            WHERE original_finding_uuid = ? AND is_duplicate = TRUE
            ORDER BY created_at ASC
          `)
          .bind(original.id)
          .all();

        const duplicateCount = duplicates.results?.length || 0;

        if (duplicateCount === 0) {
          continue;
        }

        // 4. Se o número de duplicatas exceder max_duplicates, deletar as mais antigas
        if (duplicateCount > config.max_duplicates) {
          const duplicatesToDelete = duplicateCount - config.max_duplicates;
          const idsToDelete = (duplicates.results as any[])
            .slice(0, duplicatesToDelete)
            .map((d) => d.id);

          console.log(
            `[DuplicateCleanup] Deleting ${duplicatesToDelete} oldest duplicates for finding ${original.id} (total: ${duplicateCount}, max: ${config.max_duplicates})`
          );

          // Executar DELETE em batch
          for (const id of idsToDelete) {
            await env.VLM_DB
              .prepare('DELETE FROM vulnerabilities WHERE id = ?')
              .bind(id)
              .run();
          }

          results.total_deleted += duplicatesToDelete;

          results.details.push({
            original_finding_id: original.id,
            duplicates_found: duplicateCount,
            duplicates_deleted: duplicatesToDelete,
          });
        }
      }
    }

    console.log(`[DuplicateCleanup] Cleanup completed: ${results.total_deleted} duplicates deleted from ${results.total_processed} findings`);
    return results;

  } catch (error) {
    console.error('[DuplicateCleanup] Error during cleanup:', error);
    throw error;
  }
}

/**
 * Main Handler (Cron Trigger)
 */
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[DuplicateCleanup] Starting scheduled cleanup at ${new Date().toISOString()}`);
    
    try {
      const results = await executeDuplicateCleanup(env);
      
      console.log(`[DuplicateCleanup] Results:`, {
        total_processed: results.total_processed,
        total_deleted: results.total_deleted,
        findings_with_deletions: results.details.length,
      });

      // TODO: Enviar notificação/alerta se muitas duplicatas foram deletadas
      if (results.total_deleted > 100) {
        console.warn(`[DuplicateCleanup] High deletion count: ${results.total_deleted} duplicates removed`);
      }

    } catch (error) {
      console.error('[DuplicateCleanup] Scheduled task failed:', error);
    }
  },

  /**
   * HTTP Handler (para testes manuais)
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/cleanup' && request.method === 'POST') {
      try {
        const results = await executeDuplicateCleanup(env);
        
        return new Response(JSON.stringify({
          success: true,
          results,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message,
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'healthy' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};

