/**
 * n.Solve - Auth Service Worker
 * Cloudflare Zero Trust + RBAC Multi-tenant
 */

interface Env {
  VLM_DB: D1Database;
  JWT_SECRET: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  cf_access_id?: string;
  identity_provider?: string;
  is_platform_admin: boolean;
  is_active: boolean;
  password_hash?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface UserOrgRole {
  user_id: string;
  organization_id: string;
  organization_slug: string;
  organization_name: string;
  role_id: string;
  role_name: string;
  permissions: string[];
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
 * Buscar permissions do usuário em uma organização
 */
async function getUserPermissions(userId: string, orgId: string, env: Env): Promise<string[]> {
  try {
    // Permissions via roles
    const rolePerms = await env.VLM_DB
      .prepare(`
        SELECT DISTINCT p.resource || ':' || p.action as permission
        FROM user_tenant_roles utr
        JOIN role_permissions rp ON utr.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE utr.user_id = ?
          AND utr.tenant_id = ?
      `)
      .bind(userId, orgId)
      .all<{ permission: string }>();

    // Retornar apenas permissions via roles (sem direct user permissions por enquanto)
    const allPerms = rolePerms.results?.map(r => r.permission) || [];

    return [...new Set(allPerms)];
  } catch (error) {
    console.error('Error fetching permissions:', error);
    // Retornar permissões padrão em caso de erro
    return ['vulnerability:read', 'vulnerability:write', 'dashboard:read'];
  }
}

/**
 * Buscar organizações do usuário
 */
async function getUserOrganizations(userId: string, env: Env): Promise<UserOrgRole[]> {
  try {
    const results = await env.VLM_DB
      .prepare(`
        SELECT 
          utr.user_id,
          t.id as organization_id,
          t.slug as organization_slug,
          t.name as organization_name,
          r.id as role_id,
          r.name as role_name
        FROM user_tenant_roles utr
        JOIN tenants t ON utr.tenant_id = t.id
        JOIN roles r ON utr.role_id = r.id
        WHERE utr.user_id = ?
          AND t.status = 'active'
        ORDER BY utr.created_at ASC
      `)
      .bind(userId)
      .all<UserOrgRole>();

    if (!results.results || results.results.length === 0) {
      console.log('[Auth] No organizations found for user:', userId);
      return [];
    }

    // Buscar permissions para cada organização
    const orgsWithPerms = await Promise.all(
      (results.results || []).map(async (org) => ({
        ...org,
        permissions: await getUserPermissions(userId, org.organization_id, env)
      }))
    );

    return orgsWithPerms;
  } catch (error) {
    console.error('[Auth] Error in getUserOrganizations:', error);
    throw error;
  }
}

/**
 * Base64 URL encode (sem padding)
 */
function base64urlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL decode
 */
function base64urlDecode(str: string): string {
  // Adicionar padding se necessário
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  return atob(base64);
}

/**
 * Gerar JWT token com org info e permissions
 */
async function generateToken(user: User, orgInfo: UserOrgRole, secret: string): Promise<string> {
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64urlEncode(JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    organization_id: orgInfo.organization_id,
    organization_slug: orgInfo.organization_slug,
    organization_name: orgInfo.organization_name,
    role: orgInfo.role_name,
    permissions: orgInfo.permissions,
    is_platform_admin: user.is_platform_admin,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
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

  const signatureBase64 = base64urlEncode(String.fromCharCode(...new Uint8Array(signature)));
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

    const expectedSignatureBase64 = base64urlEncode(String.fromCharCode(...new Uint8Array(expectedSignature)));

    if (signature !== expectedSignatureBase64) {
      return null;
    }

    const decoded = JSON.parse(base64urlDecode(payload));
    
    // Verificar expiração
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Handler: POST /auth/login
 * Login tradicional com email/senha
 */
async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { email: string; password: string; organization_slug?: string };

    console.log('[Auth] Login attempt for:', body.email);

    if (!body.email || !body.password) {
      return new Response(JSON.stringify({ message: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Buscar usuário no D1
    const passwordHash = await hashPassword(body.password);
    console.log('[Auth] Password hash:', passwordHash.substring(0, 16) + '...');
    
    const user = await env.VLM_DB
      .prepare('SELECT * FROM users WHERE email = ? AND password_hash = ?')
      .bind(body.email, passwordHash)
      .first<User>();

    if (!user) {
      console.log('[Auth] User not found or invalid password');
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Auth] User found:', user.id, user.email);

    // Buscar organizações do usuário
    const userOrgs = await getUserOrganizations(user.id, env);
    console.log('[Auth] User organizations:', userOrgs.length);

    if (userOrgs.length === 0 && !user.is_platform_admin) {
      console.log('[Auth] No organizations found, checking platform admin:', user.is_platform_admin);
      return new Response(JSON.stringify({ message: 'User has no organization access' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Selecionar organização
    let selectedOrg = userOrgs[0];
    
    if (body.organization_slug) {
      const found = userOrgs.find(o => o.organization_slug === body.organization_slug);
      if (found) {
        selectedOrg = found;
      } else {
        return new Response(JSON.stringify({ message: 'User does not have access to this organization' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Atualizar last_login
    await env.VLM_DB
      .prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(user.id)
      .run();

    // Gerar token
    const token = await generateToken(user, selectedOrg, env.JWT_SECRET);

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_platform_admin: user.is_platform_admin,
      },
      organization: {
        id: selectedOrg.organization_id,
        slug: selectedOrg.organization_slug,
        name: selectedOrg.organization_name,
        role: selectedOrg.role_name,
        permissions: selectedOrg.permissions,
      },
      available_organizations: userOrgs.map(o => ({
        id: o.organization_id,
        slug: o.organization_slug,
        name: o.organization_name,
        role: o.role_name,
      })),
      token,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[Auth] Error stack:', errorStack);
    
    return new Response(JSON.stringify({ 
      message: 'Internal server error',
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handler: POST /auth/cf-access
 * Login via Cloudflare Access (SSO)
 */
async function handleCfAccessLogin(request: Request, env: Env): Promise<Response> {
  try {
    // Cloudflare Access adiciona headers
    const cfAccessJwt = request.headers.get('Cf-Access-Jwt-Assertion');
    const cfAccessEmail = request.headers.get('Cf-Access-Authenticated-User-Email');

    if (!cfAccessJwt || !cfAccessEmail) {
      return new Response(JSON.stringify({ message: 'Cloudflare Access authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Buscar ou criar usuário baseado no email do CF Access
    let user = await env.VLM_DB
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(cfAccessEmail)
      .first<User>();

    // Se usuário não existe, criar automaticamente (auto-provisioning)
    if (!user) {
      const userId = `user-${crypto.randomUUID()}`;
      const name = cfAccessEmail.split('@')[0]; // Nome temporário
      
      await env.VLM_DB
        .prepare(`
          INSERT INTO users (id, email, name, cf_access_id, identity_provider, is_active, email_verified)
          VALUES (?, ?, ?, ?, ?, TRUE, TRUE)
        `)
        .bind(userId, cfAccessEmail, name, cfAccessJwt, 'cloudflare-access')
        .run();

      // Atribuir ao org padrão como User
      const defaultOrg = await env.VLM_DB
        .prepare('SELECT id FROM organizations WHERE slug = ? AND is_active = TRUE')
        .bind('ness')
        .first<{ id: string }>();

      if (defaultOrg) {
        const defaultRole = await env.VLM_DB
          .prepare('SELECT id FROM roles WHERE organization_id = ? AND name = ? AND is_system_role = TRUE')
          .bind(defaultOrg.id, 'User')
          .first<{ id: string }>();

        if (defaultRole) {
          await env.VLM_DB
            .prepare(`
              INSERT INTO user_organization_roles (id, user_id, organization_id, role_id, assigned_by)
              VALUES (?, ?, ?, ?, ?)
            `)
            .bind(`uor-${userId}`, userId, defaultOrg.id, defaultRole.id, 'system')
            .run();
        }
      }

      user = await env.VLM_DB
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first<User>();
    }

    if (!user) {
      throw new Error('Failed to create or retrieve user');
    }

    // Buscar organizações
    const userOrgs = await getUserOrganizations(user.id, env);

    if (userOrgs.length === 0 && !user.is_platform_admin) {
      return new Response(JSON.stringify({ message: 'User has no organization access' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const selectedOrg = userOrgs[0];

    // Atualizar last_login
    await env.VLM_DB
      .prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(user.id)
      .run();

    // Gerar token
    const token = await generateToken(user, selectedOrg, env.JWT_SECRET);

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_platform_admin: user.is_platform_admin,
      },
      organization: {
        id: selectedOrg.organization_id,
        slug: selectedOrg.organization_slug,
        name: selectedOrg.organization_name,
        role: selectedOrg.role_name,
        permissions: selectedOrg.permissions,
      },
      available_organizations: userOrgs.map(o => ({
        id: o.organization_id,
        slug: o.organization_slug,
        name: o.organization_name,
        role: o.role_name,
      })),
      token,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('CF Access login error:', error);
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
 * Handler: POST /auth/switch-organization
 */
async function handleSwitchOrganization(request: Request, env: Env): Promise<Response> {
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

  const body = await request.json() as { organization_slug: string };

  if (!body.organization_slug) {
    return new Response(JSON.stringify({ message: 'organization_slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userOrgs = await getUserOrganizations(decoded.id, env);
  const newOrg = userOrgs.find(o => o.organization_slug === body.organization_slug);

  if (!newOrg) {
    return new Response(JSON.stringify({ message: 'User does not have access to this organization' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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

  const newToken = await generateToken(user, newOrg, env.JWT_SECRET);

  return new Response(JSON.stringify({
    success: true,
    organization: {
      id: newOrg.organization_id,
      slug: newOrg.organization_slug,
      name: newOrg.organization_name,
      role: newOrg.role_name,
      permissions: newOrg.permissions,
    },
    token: newToken,
  }), {
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

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cf-Access-Jwt-Assertion, Cf-Access-Authenticated-User-Email',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response: Response;

      if (url.pathname === '/auth/login' && request.method === 'POST') {
        response = await handleLogin(request, env);
      } else if (url.pathname === '/auth/cf-access' && request.method === 'POST') {
        response = await handleCfAccessLogin(request, env);
      } else if (url.pathname === '/auth/verify' && request.method === 'GET') {
        response = await handleVerify(request, env);
      } else if (url.pathname === '/auth/switch-organization' && request.method === 'POST') {
        response = await handleSwitchOrganization(request, env);
      } else if (url.pathname === '/auth/logout' && request.method === 'POST') {
        response = new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (url.pathname === '/debug' && request.method === 'GET') {
        // Debug endpoint
        const tables = await env.VLM_DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        response = new Response(JSON.stringify({ 
          tables: tables.results,
          db_connected: true 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        response = new Response('Not Found', { status: 404 });
      }

      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('Auth Service error:', error);
      return new Response(JSON.stringify({ message: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
