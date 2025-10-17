/**
 * n.Solve - RBAC Middleware
 * Middleware compartilhado para validação de tenant e permissions
 */

export interface TenantContext {
  user_id: string;
  email: string;
  name: string;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  role: 'admin' | 'user';
  is_super_admin: boolean;
}

export interface Permission {
  resource: string;
  action: string;
}

/**
 * Verificar JWT token e extrair tenant context
 */
export async function verifyAndExtractContext(request: Request, jwtSecret: string): Promise<TenantContext | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const [header, payload, signature] = token.split('.');
    
    // Verificar signature
    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(jwtSecret),
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

    return {
      user_id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      tenant_id: decoded.tenant_id,
      tenant_slug: decoded.tenant_slug,
      tenant_name: decoded.tenant_name,
      role: decoded.role,
      is_super_admin: decoded.is_super_admin || false,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Verificar se usuário tem permission
 */
export async function checkPermission(
  context: TenantContext,
  resource: string,
  action: string,
  db: D1Database
): Promise<boolean> {
  // Super admin tem acesso a tudo
  if (context.is_super_admin) {
    return true;
  }

  // Admin do tenant tem acesso a quase tudo
  if (context.role === 'admin') {
    // Admins podem fazer tudo exceto deletar o próprio tenant
    if (resource === 'tenant' && action === 'delete') {
      return false;
    }
    return true;
  }

  // Para users, verificar permissions específicas
  const result = await db
    .prepare(`
      SELECT COUNT(*) as has_permission
      FROM user_tenant_roles utr
      JOIN role_permissions rp ON utr.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE utr.user_id = ?
        AND utr.tenant_id = ?
        AND p.resource = ?
        AND p.action = ?
    `)
    .bind(context.user_id, context.tenant_id, resource, action)
    .first<{has_permission: number}>();

  return (result?.has_permission || 0) > 0;
}

/**
 * Middleware: Require Authentication  
 */
export async function requireAuth(request: Request, jwtSecret: string): Promise<TenantContext | Response> {
  const context = await verifyAndExtractContext(request, jwtSecret);
  
  if (!context) {
    return errorResponse('Valid authentication required', 401);
  }

  return context;
}

/**
 * Middleware: Require Permission
 */
export async function requirePermission(
  context: TenantContext,
  resource: string,
  action: string,
  db: D1Database
): Promise<true | Response> {
  const hasPermission = await checkPermission(context, resource, action, db);
  
  if (!hasPermission) {
    return errorResponse(
      `Permission denied: ${action} ${resource}`,
      403,
      { required_permission: `${resource}:${action}` }
    );
  }

  return true;
}

/**
 * Middleware: Require Role
 */
export function requireRole(context: TenantContext, allowedRoles: string[]): true | Response {
  if (context.is_super_admin) {
    return true;
  }

  if (!allowedRoles.includes(context.role)) {
    return errorResponse(
      `Role '${context.role}' is not authorized`,
      403,
      { required_roles: allowedRoles }
    );
  }

  return true;
}

/**
 * Helper: Add tenant filter to SQL WHERE clause
 */
export function addTenantFilter(baseQuery: string, context: TenantContext): string {
  // Super admin pode ver tudo
  if (context.is_super_admin) {
    return baseQuery;
  }

  // Adicionar filtro de tenant
  if (baseQuery.toLowerCase().includes('where')) {
    return `${baseQuery} AND tenant_id = '${context.tenant_id}'`;
  } else {
    return `${baseQuery} WHERE tenant_id = '${context.tenant_id}'`;
  }
}

/**
 * Helper: Criar audit log
 */
export async function createAuditLog(
  context: TenantContext,
  action: string,
  resource_type: string,
  resource_id: string,
  details: any,
  db: D1Database,
  ip_address?: string
): Promise<void> {
  try {
    await db
      .prepare(`
        INSERT INTO audit_log (
          id, tenant_id, user_id, action, resource_type, resource_id, details, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        context.tenant_id,
        context.user_id,
        action,
        resource_type,
        resource_id,
        JSON.stringify(details),
        ip_address || null
      )
      .run();
  } catch (error) {
    console.error('Audit log error:', error);
    // Não falhar a operação se audit log falhar
  }
}

/**
 * Helper: Response com CORS
 */
export function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Helper: Error response
 */
export function errorResponse(message: string, status: number = 400, details?: any): Response {
  return jsonResponse({
    error: true,
    message,
    ...(details && { details }),
  }, status);
}

/**
 * Helper: Success response
 */
export function successResponse(data: any, message?: string): Response {
  return jsonResponse({
    success: true,
    ...(message && { message }),
    ...data,
  });
}

