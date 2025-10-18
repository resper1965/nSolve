/**
 * n.Solve - Governance API Worker
 * API para governança manual e edição em massa de achados
 */

import { D1Database } from '@cloudflare/workers-types';
import { NSolveFinding, Severity, StatusVLM, isStatusTransitionAllowed, STATUS_TRANSITIONS } from '../shared/types';

export interface Env {
  VLM_DB: D1Database;
  JWT_SECRET: string;
}

interface JWTPayload {
  user_id: string;
  organization_id: string;
  role: string;
}

/**
 * Verify JWT Token
 */
async function verifyJWT(request: Request, secret: string): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    
    const payload = JSON.parse(atob(payloadB64));
    
    // Verificação básica de expiração
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    
    return {
      user_id: payload.sub || payload.user_id,
      organization_id: payload.organization_id || payload.tenant_id,
      role: payload.role || 'user',
    };
  } catch (error) {
    console.error('[GovernanceAPI] JWT verification failed:', error);
    return null;
  }
}

/**
 * PATCH /findings/{uuid}
 * Edição manual de um único achado
 */
async function updateSingleFinding(
  request: Request,
  env: Env,
  findingId: string,
  context: JWTPayload
): Promise<Response> {
  try {
    const body = await request.json() as Partial<NSolveFinding>;
    
    // VALIDAÇÃO CRÍTICA: Campos IMUTÁVEIS nunca podem ser alterados
    const immutableFields = ['correlation_key', 'raw_title', 'severidade_original', 'created_at', 'id', 'tenant_id'];
    for (const field of immutableFields) {
      if (field in body) {
        return new Response(JSON.stringify({
          error: 'Forbidden',
          message: `Campo '${field}' é imutável e não pode ser alterado`,
        }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    }
    
    // Verificar se o achado existe e pertence ao tenant
    const existing = await env.VLM_DB
      .prepare('SELECT * FROM vulnerabilities WHERE id = ? AND tenant_id = ?')
      .bind(findingId, context.organization_id)
      .first();
    
    if (!existing) {
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: 'Achado não encontrado ou não pertence ao seu tenant',
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    
    const existingData = existing as any;
    
    // Validar transição de status (se status_vlm está sendo alterado)
    if (body.status_vlm && body.status_vlm !== existingData.status_vlm) {
      const isAllowed = isStatusTransitionAllowed(
        existingData.status_vlm as StatusVLM,
        body.status_vlm as StatusVLM
      );
      
      if (!isAllowed) {
        return new Response(JSON.stringify({
          error: 'Forbidden',
          message: `Transição de status ${existingData.status_vlm} → ${body.status_vlm} não permitida`,
          allowed_transitions: STATUS_TRANSITIONS[existingData.status_vlm as StatusVLM] || [],
        }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    }
    
    // Validar justificativa para status INACTIVE_*
    if (body.status_vlm && body.status_vlm.startsWith('INACTIVE_')) {
      if (!body.justification && !existingData.justification) {
        return new Response(JSON.stringify({
          error: 'Bad Request',
          message: `Status ${body.status_vlm} requer campo 'justification'`,
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }
    
    // Construir query de UPDATE apenas com campos permitidos
    const allowedFields: Array<keyof NSolveFinding> = [
      'title_user_edited',
      'severity_manual',
      'is_verified',
      'is_false_positive',
      'risk_accepted',
      'justification',
      'tags',
      'description',
      'status_vlm',
      'group_id',
    ];
    
    const updates: string[] = [];
    const values: any[] = [];
    let statusChanged = false;
    
    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'status_vlm') {
          statusChanged = true;
        }
        
        if (field === 'tags' && Array.isArray(body.tags)) {
          updates.push('tags = ?');
          values.push(JSON.stringify(body.tags));
        } else if (typeof body[field] === 'boolean') {
          updates.push(`${field} = ?`);
          values.push(body[field] ? 1 : 0);
        } else {
          updates.push(`${field} = ?`);
          values.push(body[field]);
        }
      }
    }
    
    if (updates.length === 0) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'Nenhum campo válido para atualizar',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Adicionar updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP');
    
    // Adicionar last_status_change_date se status foi alterado
    if (statusChanged) {
      updates.push('last_status_change_date = CURRENT_TIMESTAMP');
    }
    values.push(findingId);
    values.push(context.organization_id);
    
    // Executar UPDATE
    await env.VLM_DB
      .prepare(`UPDATE vulnerabilities SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`)
      .bind(...values)
      .run();
    
    // Retornar achado atualizado
    const updated = await env.VLM_DB
      .prepare('SELECT * FROM vulnerabilities WHERE id = ? AND tenant_id = ?')
      .bind(findingId, context.organization_id)
      .first();
    
    // Registrar auditoria
    await env.VLM_DB
      .prepare(`
        INSERT INTO audit_log (id, tenant_id, user_id, action, resource_type, resource_id, details, created_at)
        VALUES (?, ?, ?, 'UPDATE', 'finding', ?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(
        `audit-${crypto.randomUUID()}`,
        context.organization_id,
        context.user_id,
        findingId,
        JSON.stringify({ updated_fields: Object.keys(body) })
      )
      .run();
    
    return new Response(JSON.stringify({
      success: true,
      data: updated,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    console.error('[GovernanceAPI] Error updating finding:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

/**
 * PATCH /findings/bulk_update
 * Edição em massa de achados
 */
async function bulkUpdateFindings(
  request: Request,
  env: Env,
  context: JWTPayload
): Promise<Response> {
  try {
    const body = await request.json() as {
      finding_ids: string[];
      updates: Partial<NSolveFinding>;
    };
    
    if (!Array.isArray(body.finding_ids) || body.finding_ids.length === 0) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'finding_ids deve ser um array não vazio',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Validar campos imutáveis
    const immutableFields = ['correlation_key', 'raw_title', 'severidade_original', 'created_at', 'id', 'tenant_id'];
    for (const field of immutableFields) {
      if (field in body.updates) {
        return new Response(JSON.stringify({
          error: 'Forbidden',
          message: `Campo '${field}' é imutável e não pode ser alterado`,
        }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    }
    
    // RESTRIÇÃO DE ESCOPO: Verificar se todos os achados pertencem ao mesmo tenant e asset
    const placeholders = body.finding_ids.map(() => '?').join(',');
    const findings = await env.VLM_DB
      .prepare(`
        SELECT id, tenant_id, asset_id, test_run_id 
        FROM vulnerabilities 
        WHERE id IN (${placeholders}) AND tenant_id = ?
      `)
      .bind(...body.finding_ids, context.organization_id)
      .all();
    
    if (!findings.results || findings.results.length === 0) {
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: 'Nenhum achado encontrado ou não pertence ao seu tenant',
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    
    if (findings.results.length !== body.finding_ids.length) {
      return new Response(JSON.stringify({
        error: 'Forbidden',
        message: `Apenas ${findings.results.length} de ${body.finding_ids.length} achados pertencem ao seu tenant`,
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Verificar se todos são do mesmo asset_id
    const assetIds = new Set((findings.results as any[]).map(f => f.asset_id));
    if (assetIds.size > 1) {
      return new Response(JSON.stringify({
        error: 'Forbidden',
        message: 'Edição em massa só é permitida para achados do mesmo asset',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Construir query de UPDATE
    const allowedFields: Array<keyof NSolveFinding> = [
      'title_user_edited',
      'severity_manual',
      'is_verified',
      'is_false_positive',
      'risk_accepted',
      'justification',
      'tags',
      'status_vlm',
      'group_id',
    ];
    
    const updates: string[] = [];
    const values: any[] = [];
    
    for (const field of allowedFields) {
      if (field in body.updates) {
        if (field === 'tags' && Array.isArray(body.updates.tags)) {
          updates.push('tags = ?');
          values.push(JSON.stringify(body.updates.tags));
        } else if (typeof body.updates[field] === 'boolean') {
          updates.push(`${field} = ?`);
          values.push(body.updates[field] ? 1 : 0);
        } else {
          updates.push(`${field} = ?`);
          values.push(body.updates[field]);
        }
      }
    }
    
    if (updates.length === 0) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'Nenhum campo válido para atualizar',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Adicionar updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(...body.finding_ids);
    values.push(context.organization_id);
    
    // Executar UPDATE em batch
    await env.VLM_DB
      .prepare(`
        UPDATE vulnerabilities 
        SET ${updates.join(', ')} 
        WHERE id IN (${placeholders}) AND tenant_id = ?
      `)
      .bind(...values)
      .run();
    
    // Registrar auditoria
    await env.VLM_DB
      .prepare(`
        INSERT INTO audit_log (id, tenant_id, user_id, action, resource_type, resource_id, details, created_at)
        VALUES (?, ?, ?, 'BULK_UPDATE', 'finding', ?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(
        `audit-${crypto.randomUUID()}`,
        context.organization_id,
        context.user_id,
        'bulk',
        JSON.stringify({ 
          finding_count: body.finding_ids.length,
          updated_fields: Object.keys(body.updates)
        })
      )
      .run();
    
    return new Response(JSON.stringify({
      success: true,
      updated_count: body.finding_ids.length,
      message: `${body.finding_ids.length} achados atualizados com sucesso`,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    console.error('[GovernanceAPI] Error in bulk update:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

/**
 * POST /finding-groups
 * Criar um novo grupo de achados
 */
async function createFindingGroup(
  request: Request,
  env: Env,
  context: JWTPayload
): Promise<Response> {
  try {
    const body = await request.json() as {
      name: string;
      description?: string;
      finding_ids: string[];
    };
    
    if (!body.name || !Array.isArray(body.finding_ids) || body.finding_ids.length === 0) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'name e finding_ids são obrigatórios',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Validar que todos os achados compartilham o mesmo asset_id e test_run_id
    const placeholders = body.finding_ids.map(() => '?').join(',');
    const findings = await env.VLM_DB
      .prepare(`
        SELECT id, asset_id, test_run_id, severity
        FROM vulnerabilities
        WHERE id IN (${placeholders}) AND tenant_id = ?
      `)
      .bind(...body.finding_ids, context.organization_id)
      .all();
    
    if (!findings.results || findings.results.length === 0) {
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: 'Nenhum achado encontrado',
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    
    const findingsData = findings.results as any[];
    const assetIds = new Set(findingsData.map(f => f.asset_id));
    const testRunIds = new Set(findingsData.map(f => f.test_run_id).filter(Boolean));
    
    if (assetIds.size > 1) {
      return new Response(JSON.stringify({
        error: 'Forbidden',
        message: 'Todos os achados de um grupo devem ser do mesmo asset_id',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    
    if (testRunIds.size > 1) {
      return new Response(JSON.stringify({
        error: 'Forbidden',
        message: 'Todos os achados de um grupo devem ser do mesmo test_run_id',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Calcular estatísticas
    const stats = {
      critical: findingsData.filter(f => f.severity === 'critical').length,
      high: findingsData.filter(f => f.severity === 'high').length,
      medium: findingsData.filter(f => f.severity === 'medium').length,
      low: findingsData.filter(f => f.severity === 'low').length,
    };
    
    const groupId = `group-${crypto.randomUUID()}`;
    const assetId = Array.from(assetIds)[0];
    const testRunId = testRunIds.size > 0 ? Array.from(testRunIds)[0] : null;
    
    // Criar grupo
    await env.VLM_DB
      .prepare(`
        INSERT INTO finding_groups (
          id, tenant_id, asset_id, test_run_id, name, description,
          finding_count, critical_count, high_count, medium_count, low_count,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
      .bind(
        groupId, context.organization_id, assetId, testRunId, body.name, body.description || null,
        findingsData.length, stats.critical, stats.high, stats.medium, stats.low,
        context.user_id
      )
      .run();
    
    // Atualizar achados com group_id
    await env.VLM_DB
      .prepare(`
        UPDATE vulnerabilities
        SET group_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders}) AND tenant_id = ?
      `)
      .bind(groupId, ...body.finding_ids, context.organization_id)
      .run();
    
    return new Response(JSON.stringify({
      success: true,
      group_id: groupId,
      finding_count: findingsData.length,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    console.error('[GovernanceAPI] Error creating group:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

/**
 * Main Handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Verificar JWT
    const context = await verifyJWT(request, env.JWT_SECRET);
    if (!context) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let response: Response;
    
    // Rotas
    if (url.pathname === '/findings/bulk_update' && request.method === 'PATCH') {
      response = await bulkUpdateFindings(request, env, context);
    } else if (url.pathname.match(/^\/findings\/[^/]+$/) && request.method === 'PATCH') {
      const findingId = url.pathname.split('/')[2];
      response = await updateSingleFinding(request, env, findingId, context);
    } else if (url.pathname === '/finding-groups' && request.method === 'POST') {
      response = await createFindingGroup(request, env, context);
    } else if (url.pathname === '/health') {
      response = new Response(JSON.stringify({ status: 'healthy' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      response = new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Adicionar CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  },
};

