/**
 * n.Solve - Core Processor Worker (RBAC Multi-tenant)
 */

export interface Env {
  VLM_DB: D1Database;
  VLM_STORAGE: R2Bucket;
  JWT_SECRET: string;
}

interface TenantContext {
  user_id: string;
  tenant_id: string;
  tenant_slug: string;
  role: string;
  is_super_admin: boolean;
}

/**
 * Verify JWT
 */
async function verifyJWT(request: Request, secret: string): Promise<TenantContext | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.replace('Bearer ', '');
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    
    if (decoded.exp < Date.now()) return null;

    return {
      user_id: decoded.id,
      tenant_id: decoded.tenant_id,
      tenant_slug: decoded.tenant_slug,
      role: decoded.role,
      is_super_admin: decoded.is_super_admin || false,
    };
  } catch {
    return null;
  }
}

/**
 * Generate correlation key
 */
async function generateKey(type: string, url: string, param: string): Promise<string> {
  const data = `${type}|${url}|${param}`.toLowerCase();
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Process vulnerability
 */
async function processVulnerability(request: Request, env: Env): Promise<Response> {
  const context = await verifyJWT(request, env.JWT_SECRET);
  if (!context) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json() as any;
    
    const key = await generateKey(body.vulnerability_type, body.url, body.parameter);
    
    // Check existing
    const existing = await env.VLM_DB
      .prepare('SELECT id FROM vulnerabilities WHERE correlation_key = ? AND tenant_id = ?')
      .bind(key, context.tenant_id)
      .first();

    if (existing) {
      return new Response(JSON.stringify({
        status: 'duplicate',
        correlation_key: key,
        tenant_id: context.tenant_id
      }), { status: 200 });
    }

    // Insert new
    const id = crypto.randomUUID();
    await env.VLM_DB
      .prepare(`
        INSERT INTO vulnerabilities (
          id, tenant_id, correlation_key, vulnerability_type, severity,
          url_target, affected_param, description, tool_source, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        context.tenant_id,
        key,
        body.vulnerability_type,
        body.severity.toUpperCase(),
        body.url,
        body.parameter,
        body.description || '',
        body.tool_name || 'unknown',
        'open'
      )
      .run();

    return new Response(JSON.stringify({
      status: 'created',
      correlation_key: key,
      vulnerability_id: id,
      tenant_id: context.tenant_id
    }), { status: 201 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/**
 * List vulnerabilities
 */
async function listVulnerabilities(request: Request, env: Env): Promise<Response> {
  const context = await verifyJWT(request, env.JWT_SECRET);
  if (!context) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const results = await env.VLM_DB
      .prepare('SELECT * FROM vulnerabilities WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50')
      .bind(context.tenant_id)
      .all();

    return new Response(JSON.stringify({
      vulnerabilities: results.results,
      count: results.results?.length || 0,
      tenant_id: context.tenant_id
    }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/**
 * Main Handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (url.pathname === '/process' && request.method === 'POST') {
      return await processVulnerability(request, env);
    }

    if (url.pathname === '/vulnerabilities' && request.method === 'GET') {
      return await listVulnerabilities(request, env);
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'healthy' }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
  },
};
