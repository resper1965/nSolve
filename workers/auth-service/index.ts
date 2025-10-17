/**
 * n.Solve - Auth Service Worker (RBAC Multi-tenant)
 * Serviço de autenticação com suporte a multi-tenancy e RBAC
 */

interface Env {
  VLM_DB: D1Database;
  JWT_SECRET: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  tenant_id: string;
  is_super_admin: boolean;
  created_at: string;
  last_login?: string;
}

interface UserTenantRole {
  user_id: string;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  role: string;
}

interface LoginRequest {
  email: string;
  password: string;
  tenant_slug?: string; // Opcional: para quando usuário está em múltiplos tenants
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  tenant_slug?: string;
}

/**
 * Hash password usando Web Crypto API
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Gerar JWT token com tenant info
 */
async function generateToken(user: Partial<User>, tenantInfo: UserTenantRole, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    tenant_id: tenantInfo.tenant_id,
    tenant_slug: tenantInfo.tenant_slug,
    tenant_name: tenantInfo.tenant_name,
    role: tenantInfo.role,
    is_super_admin: user.is_super_admin || false,
    exp: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
  }));

  const signature = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ),
    new TextEncoder().encode(`${header}.${payload}`)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${header}.${payload}.${signatureBase64}`;
}

/**
 * Verificar JWT token
 */
async function verifyToken(token: string, secret: string): Promise<any> {
  try {
    const [header, payload, signature] = token.split('.');
    
    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
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
    
    // Verificar expiração
    if (decoded.exp < Date.now()) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Buscar tenants do usuário
 */
async function getUserTenants(userId: string, env: Env): Promise<UserTenantRole[]> {
  const results = await env.VLM_DB
    .prepare(`
      SELECT 
        utr.user_id,
        t.id as tenant_id,
        t.slug as tenant_slug,
        t.name as tenant_name,
        r.name as role
      FROM user_tenant_roles utr
      JOIN tenants t ON utr.tenant_id = t.id
      JOIN roles r ON utr.role_id = r.id
      WHERE utr.user_id = ?
        AND t.status = 'active'
      ORDER BY utr.created_at ASC
    `)
    .bind(userId)
    .all<UserTenantRole>();

  return results.results || [];
}

/**
 * Handler: POST /auth/login
 */
async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const body: LoginRequest = await request.json();

    if (!body.email || !body.password) {
      return new Response(JSON.stringify({ message: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Buscar usuário no D1
    const passwordHash = await hashPassword(body.password);
    const result = await env.VLM_DB
      .prepare('SELECT * FROM users WHERE email = ? AND password_hash = ?')
      .bind(body.email, passwordHash)
      .first<User>();

    if (!result) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Buscar tenants do usuário
    const userTenants = await getUserTenants(result.id, env);

    if (userTenants.length === 0 && !result.is_super_admin) {
      return new Response(JSON.stringify({ message: 'User has no tenant access' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Se tenant_slug foi especificado, usar esse tenant
    let selectedTenant = userTenants[0]; // Default: primeiro tenant
    
    if (body.tenant_slug) {
      const found = userTenants.find(t => t.tenant_slug === body.tenant_slug);
      if (found) {
        selectedTenant = found;
      } else {
        return new Response(JSON.stringify({ message: 'User does not have access to this tenant' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Atualizar last_login
    await env.VLM_DB
      .prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(result.id)
      .run();

    // Gerar token com info do tenant
    const token = await generateToken(result, selectedTenant, env.JWT_SECRET);

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        is_super_admin: result.is_super_admin,
      },
      tenant: {
        id: selectedTenant.tenant_id,
        slug: selectedTenant.tenant_slug,
        name: selectedTenant.tenant_name,
        role: selectedTenant.role,
      },
      available_tenants: userTenants.map(t => ({
        id: t.tenant_id,
        slug: t.tenant_slug,
        name: t.tenant_name,
        role: t.role,
      })),
      token,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handler: POST /auth/register
 */
async function handleRegister(request: Request, env: Env): Promise<Response> {
  try {
    const body: RegisterRequest = await request.json();

    if (!body.email || !body.password || !body.name) {
      return new Response(JSON.stringify({ message: 'Email, password, and name are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verificar se usuário já existe
    const existing = await env.VLM_DB
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(body.email)
      .first();

    if (existing) {
      return new Response(JSON.stringify({ message: 'User already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hash password
    const passwordHash = await hashPassword(body.password);

    // Determinar tenant (ou criar novo)
    let tenantId = 'tenant_ness'; // Default
    
    if (body.tenant_slug) {
      const tenant = await env.VLM_DB
        .prepare('SELECT id FROM tenants WHERE slug = ?')
        .bind(body.tenant_slug)
        .first<{id: string}>();
      
      if (tenant) {
        tenantId = tenant.id;
      }
    }

    // Criar usuário
    const userId = crypto.randomUUID();
    await env.VLM_DB
      .prepare('INSERT INTO users (id, email, name, password_hash, tenant_id) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, body.email, body.name, passwordHash, tenantId)
      .run();

    // Atribuir role 'user' por padrão
    const roleId = 'role_user';
    await env.VLM_DB
      .prepare('INSERT INTO user_tenant_roles (id, user_id, tenant_id, role_id) VALUES (?, ?, ?, ?)')
      .bind(`utr_${userId}`, userId, tenantId, roleId)
      .run();

    // Buscar usuário criado
    const user = await env.VLM_DB
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    if (!user) {
      throw new Error('Failed to create user');
    }

    // Buscar tenant info
    const userTenants = await getUserTenants(userId, env);
    const tenantInfo = userTenants[0];

    // Gerar token
    const token = await generateToken(user, tenantInfo, env.JWT_SECRET);

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tenant: {
        id: tenantInfo.tenant_id,
        slug: tenantInfo.tenant_slug,
        name: tenantInfo.tenant_name,
        role: tenantInfo.role,
      },
      token,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handler: GET /auth/verify
 */
async function handleVerify(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = await verifyToken(token, env.JWT_SECRET);

  if (!decoded) {
    return new Response(JSON.stringify({ message: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    user: decoded,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handler: POST /auth/switch-tenant
 * Trocar de tenant (quando usuário tem acesso a múltiplos tenants)
 */
async function handleSwitchTenant(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = await verifyToken(token, env.JWT_SECRET);

  if (!decoded) {
    return new Response(JSON.stringify({ message: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body: { tenant_slug: string } = await request.json();

  if (!body.tenant_slug) {
    return new Response(JSON.stringify({ message: 'tenant_slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Buscar todos os tenants do usuário
  const userTenants = await getUserTenants(decoded.id, env);
  const newTenant = userTenants.find(t => t.tenant_slug === body.tenant_slug);

  if (!newTenant) {
    return new Response(JSON.stringify({ message: 'User does not have access to this tenant' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Buscar user info
  const user = await env.VLM_DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(decoded.id)
    .first<User>();

  if (!user) {
    return new Response(JSON.stringify({ message: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Gerar novo token com novo tenant
  const newToken = await generateToken(user, newTenant, env.JWT_SECRET);

  return new Response(JSON.stringify({
    success: true,
    tenant: {
      id: newTenant.tenant_id,
      slug: newTenant.tenant_slug,
      name: newTenant.tenant_name,
      role: newTenant.role,
    },
    token: newToken,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handler: POST /auth/logout
 */
async function handleLogout(): Promise<Response> {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Main Worker Handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Routing
    if (url.pathname === '/auth/login' && request.method === 'POST') {
      const response = await handleLogin(request, env);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    if (url.pathname === '/auth/register' && request.method === 'POST') {
      const response = await handleRegister(request, env);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    if (url.pathname === '/auth/verify' && request.method === 'GET') {
      const response = await handleVerify(request, env);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    if (url.pathname === '/auth/switch-tenant' && request.method === 'POST') {
      const response = await handleSwitchTenant(request, env);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    if (url.pathname === '/auth/logout' && request.method === 'POST') {
      const response = await handleLogout();
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
