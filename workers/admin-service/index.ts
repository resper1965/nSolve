/**
 * n.Solve - Admin Service Worker
 * Gestão de Organizações, Usuários e RBAC
 */

interface Env {
  VLM_DB: D1Database;
  JWT_SECRET: string;
}

interface JWTPayload {
  id: string;
  email: string;
  organization_id: string;
  is_platform_admin: boolean;
  permissions: string[];
}

/**
 * Verificar JWT e extrair payload
 */
async function verifyToken(request: Request, env: Env): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const [header, payload, signature] = token.split('.');
    
    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(env.JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ),
      new TextEncoder().encode(`${header}.${payload}`)
    );

    const expectedSignatureBase64 = btoa(String.fromCharCode(...new Uint8Array(expectedSignature)));

    if (signature !== expectedSignatureBase64) {
      return null;
    }

    const decoded = JSON.parse(atob(payload));
    
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verificar se usuário tem permissão
 */
function hasPermission(user: JWTPayload, resource: string, action: string): boolean {
  if (user.is_platform_admin) return true;
  return user.permissions.includes(`${resource}:${action}`) || user.permissions.includes(`${resource}:manage`);
}

/**
 * ORGANIZATIONS CRUD
 */

// GET /organizations
async function listOrganizations(request: Request, env: Env): Promise<Response> {
  const user = await verifyToken(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let query = 'SELECT * FROM organizations WHERE 1=1';
  const params: string[] = [];

  // Se não é platform admin, só vê sua org
  if (!user.is_platform_admin) {
    query += ' AND id = ?';
    params.push(user.organization_id);
  }

  query += ' ORDER BY created_at DESC';

  const result = await env.VLM_DB.prepare(query).bind(...params).all();

  return new Response(JSON.stringify({ success: true, data: result.results }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// POST /organizations
async function createOrganization(request: Request, env: Env): Promise<Response> {
  const user = await verifyToken(request, env);
  if (!user || !user.is_platform_admin) {
    return new Response(JSON.stringify({ error: 'Forbidden: Platform admin required' }), { status: 403 });
  }

  const body = await request.json() as any;
  const { name, domain, slug, max_users = 10, subscription_plan = 'free' } = body;

  if (!name || !slug) {
    return new Response(JSON.stringify({ error: 'Name and slug are required' }), { status: 400 });
  }

  const id = `org-${crypto.randomUUID()}`;

  await env.VLM_DB.prepare(`
    INSERT INTO organizations (id, name, domain, slug, max_users, subscription_plan, is_active)
    VALUES (?, ?, ?, ?, ?, ?, TRUE)
  `).bind(id, name, domain, slug, max_users, subscription_plan).run();

  // Criar roles padrão para a organização
  const roleIds = {
    admin: `role-${id}-admin`,
    user: `role-${id}-user`,
    viewer: `role-${id}-viewer`
  };

  await env.VLM_DB.batch([
    env.VLM_DB.prepare(`
      INSERT INTO roles (id, organization_id, name, description, is_system_role)
      VALUES (?, ?, 'Admin', 'Full access to organization', TRUE)
    `).bind(roleIds.admin, id),
    env.VLM_DB.prepare(`
      INSERT INTO roles (id, organization_id, name, description, is_system_role)
      VALUES (?, ?, 'User', 'Standard user access', TRUE)
    `).bind(roleIds.user, id),
    env.VLM_DB.prepare(`
      INSERT INTO roles (id, organization_id, name, description, is_system_role)
      VALUES (?, ?, 'Viewer', 'Read-only access', TRUE)
    `).bind(roleIds.viewer, id)
  ]);

  const org = await env.VLM_DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(id).first();

  return new Response(JSON.stringify({ success: true, data: org }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

// GET /organizations/:id
async function getOrganization(id: string, request: Request, env: Env): Promise<Response> {
  const user = await verifyToken(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  if (!user.is_platform_admin && user.organization_id !== id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const org = await env.VLM_DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(id).first();

  if (!org) {
    return new Response(JSON.stringify({ error: 'Organization not found' }), { status: 404 });
  }

  return new Response(JSON.stringify({ success: true, data: org }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// PUT /organizations/:id
async function updateOrganization(id: string, request: Request, env: Env): Promise<Response> {
  const user = await verifyToken(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  if (!user.is_platform_admin && !hasPermission(user, 'organization', 'manage')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  if (!user.is_platform_admin && user.organization_id !== id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const body = await request.json() as any;
  const updates: string[] = [];
  const values: any[] = [];

  if (body.name) { updates.push('name = ?'); values.push(body.name); }
  if (body.domain !== undefined) { updates.push('domain = ?'); values.push(body.domain); }
  if (body.logo_url !== undefined) { updates.push('logo_url = ?'); values.push(body.logo_url); }
  if (body.max_users) { updates.push('max_users = ?'); values.push(body.max_users); }
  if (body.subscription_plan) { updates.push('subscription_plan = ?'); values.push(body.subscription_plan); }
  if (body.is_active !== undefined) { updates.push('is_active = ?'); values.push(body.is_active); }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await env.VLM_DB.prepare(`UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const org = await env.VLM_DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(id).first();

  return new Response(JSON.stringify({ success: true, data: org }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// DELETE /organizations/:id
async function deleteOrganization(id: string, request: Request, env: Env): Promise<Response> {
  const user = await verifyToken(request, env);
  if (!user || !user.is_platform_admin) {
    return new Response(JSON.stringify({ error: 'Forbidden: Platform admin required' }), { status: 403 });
  }

  await env.VLM_DB.prepare('DELETE FROM organizations WHERE id = ?').bind(id).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * USERS CRUD
 */

// GET /organizations/:orgId/users
async function listUsers(orgId: string, request: Request, env: Env): Promise<Response> {
  const user = await verifyToken(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  if (!user.is_platform_admin && user.organization_id !== orgId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  if (!hasPermission(user, 'users', 'read')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const result = await env.VLM_DB.prepare(`
    SELECT 
      u.id, u.email, u.name, u.is_platform_admin, u.is_active, u.created_at,
      r.name as role
    FROM users u
    JOIN user_organization_roles uor ON u.id = uor.user_id
    JOIN roles r ON uor.role_id = r.id
    WHERE uor.organization_id = ?
    ORDER BY u.created_at DESC
  `).bind(orgId).all();

  return new Response(JSON.stringify({ success: true, data: result.results }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// POST /organizations/:orgId/users
async function createUser(orgId: string, request: Request, env: Env): Promise<Response> {
  const user = await verifyToken(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  if (!user.is_platform_admin && user.organization_id !== orgId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  if (!hasPermission(user, 'users', 'create')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const body = await request.json() as any;
  const { email, name, role_name = 'User' } = body;

  if (!email || !name) {
    return new Response(JSON.stringify({ error: 'Email and name are required' }), { status: 400 });
  }

  // Verificar se usuário já existe
  const existing = await env.VLM_DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  
  let userId: string;
  
  if (existing) {
    userId = (existing as any).id;
  } else {
    userId = `user-${crypto.randomUUID()}`;
    await env.VLM_DB.prepare(`
      INSERT INTO users (id, email, name, is_active, email_verified)
      VALUES (?, ?, ?, TRUE, FALSE)
    `).bind(userId, email, name).run();
  }

  // Buscar role
  const role = await env.VLM_DB.prepare(`
    SELECT id FROM roles WHERE organization_id = ? AND name = ?
  `).bind(orgId, role_name).first();

  if (!role) {
    return new Response(JSON.stringify({ error: 'Role not found' }), { status: 404 });
  }

  // Criar user_organization_role
  await env.VLM_DB.prepare(`
    INSERT INTO user_organization_roles (id, user_id, organization_id, role_id, assigned_by)
    VALUES (?, ?, ?, ?, ?)
  `).bind(`uor-${crypto.randomUUID()}`, userId, orgId, (role as any).id, user.id).run();

  const newUser = await env.VLM_DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

  return new Response(JSON.stringify({ success: true, data: newUser }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

// PUT /organizations/:orgId/users/:userId
async function updateUser(orgId: string, userId: string, request: Request, env: Env): Promise<Response> {
  const user = await verifyToken(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  if (!user.is_platform_admin && user.organization_id !== orgId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  if (!hasPermission(user, 'users', 'update')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const body = await request.json() as any;
  const updates: string[] = [];
  const values: any[] = [];

  if (body.name) { updates.push('name = ?'); values.push(body.name); }
  if (body.is_active !== undefined) { updates.push('is_active = ?'); values.push(body.is_active); }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);
    await env.VLM_DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  // Atualizar role se fornecida
  if (body.role_name) {
    const role = await env.VLM_DB.prepare(`
      SELECT id FROM roles WHERE organization_id = ? AND name = ?
    `).bind(orgId, body.role_name).first();

    if (role) {
      await env.VLM_DB.prepare(`
        UPDATE user_organization_roles 
        SET role_id = ? 
        WHERE user_id = ? AND organization_id = ?
      `).bind((role as any).id, userId, orgId).run();
    }
  }

  const updatedUser = await env.VLM_DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

  return new Response(JSON.stringify({ success: true, data: updatedUser }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// DELETE /organizations/:orgId/users/:userId
async function deleteUser(orgId: string, userId: string, request: Request, env: Env): Promise<Response> {
  const user = await verifyToken(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  if (!user.is_platform_admin && user.organization_id !== orgId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  if (!hasPermission(user, 'users', 'delete')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // Remover da organização (não deletar o usuário, apenas remover o vínculo)
  await env.VLM_DB.prepare(`
    DELETE FROM user_organization_roles 
    WHERE user_id = ? AND organization_id = ?
  `).bind(userId, orgId).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * ROLES & PERMISSIONS
 */

// GET /organizations/:orgId/roles
async function listRoles(orgId: string, request: Request, env: Env): Promise<Response> {
  const user = await verifyToken(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const result = await env.VLM_DB.prepare(`
    SELECT * FROM roles WHERE organization_id = ? ORDER BY created_at ASC
  `).bind(orgId).all();

  return new Response(JSON.stringify({ success: true, data: result.results }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// GET /permissions
async function listPermissions(request: Request, env: Env): Promise<Response> {
  const user = await verifyToken(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const result = await env.VLM_DB.prepare('SELECT * FROM permissions ORDER BY resource, action').all();

  return new Response(JSON.stringify({ success: true, data: result.results }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Main Worker Handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response: Response;

      // Organizations routes
      if (path === '/organizations' && method === 'GET') {
        response = await listOrganizations(request, env);
      } else if (path === '/organizations' && method === 'POST') {
        response = await createOrganization(request, env);
      } else if (path.match(/^\/organizations\/[^/]+$/) && method === 'GET') {
        const id = path.split('/')[2];
        response = await getOrganization(id, request, env);
      } else if (path.match(/^\/organizations\/[^/]+$/) && method === 'PUT') {
        const id = path.split('/')[2];
        response = await updateOrganization(id, request, env);
      } else if (path.match(/^\/organizations\/[^/]+$/) && method === 'DELETE') {
        const id = path.split('/')[2];
        response = await deleteOrganization(id, request, env);
      }
      
      // Users routes
      else if (path.match(/^\/organizations\/[^/]+\/users$/) && method === 'GET') {
        const orgId = path.split('/')[2];
        response = await listUsers(orgId, request, env);
      } else if (path.match(/^\/organizations\/[^/]+\/users$/) && method === 'POST') {
        const orgId = path.split('/')[2];
        response = await createUser(orgId, request, env);
      } else if (path.match(/^\/organizations\/[^/]+\/users\/[^/]+$/) && method === 'PUT') {
        const parts = path.split('/');
        response = await updateUser(parts[2], parts[4], request, env);
      } else if (path.match(/^\/organizations\/[^/]+\/users\/[^/]+$/) && method === 'DELETE') {
        const parts = path.split('/');
        response = await deleteUser(parts[2], parts[4], request, env);
      }
      
      // Roles & Permissions routes
      else if (path.match(/^\/organizations\/[^/]+\/roles$/) && method === 'GET') {
        const orgId = path.split('/')[2];
        response = await listRoles(orgId, request, env);
      } else if (path === '/permissions' && method === 'GET') {
        response = await listPermissions(request, env);
      }
      
      else {
        response = new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
      }

      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('Admin Service error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

