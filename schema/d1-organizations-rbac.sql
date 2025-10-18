-- ============================================
-- n.Solve - Organizations & RBAC Schema
-- Multi-Tenant with Cloudflare Zero Trust
-- ============================================

-- Drop existing tables if needed (for clean setup)
-- DROP TABLE IF EXISTS audit_logs;
-- DROP TABLE IF EXISTS user_sessions;
-- DROP TABLE IF EXISTS user_permissions;
-- DROP TABLE IF EXISTS role_permissions;
-- DROP TABLE IF EXISTS permissions;
-- DROP TABLE IF EXISTS user_organization_roles;
-- DROP TABLE IF EXISTS roles;
-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS organizations;
-- DROP TABLE IF EXISTS platform_admins;

-- ============================================
-- 1. ORGANIZATIONS (Tenants)
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSON DEFAULT '{}',
    subscription_plan TEXT DEFAULT 'free',
    max_users INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. USERS (with Zero Trust integration)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    
    -- Zero Trust Integration
    cf_access_id TEXT UNIQUE,  -- Cloudflare Access User ID
    identity_provider TEXT,     -- google, azure, okta, etc
    
    -- Legacy auth (mantido para compatibilidade)
    password_hash TEXT,
    
    -- Platform Admin flag
    is_platform_admin BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at DATETIME,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. ROLES (per organization)
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, name)
);

-- ============================================
-- 4. PERMISSIONS (granular access control)
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    resource TEXT NOT NULL,       -- vulnerabilities, jira, reports, users, settings
    action TEXT NOT NULL,          -- create, read, update, delete, manage
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource, action)
);

-- ============================================
-- 5. USER-ORGANIZATION-ROLE (many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS user_organization_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_by TEXT REFERENCES users(id),
    UNIQUE(user_id, organization_id, role_id)
);

-- ============================================
-- 6. ROLE-PERMISSIONS (many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- ============================================
-- 7. USER-PERMISSIONS (direct permissions)
-- ============================================
CREATE TABLE IF NOT EXISTS user_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    granted_by TEXT REFERENCES users(id),
    UNIQUE(user_id, organization_id, permission_id)
);

-- ============================================
-- 8. PLATFORM ADMINS (super admins)
-- ============================================
CREATE TABLE IF NOT EXISTS platform_admins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    permissions JSON DEFAULT '["*"]',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT REFERENCES users(id)
);

-- ============================================
-- 9. USER SESSIONS (JWT tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    cf_ray_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. AUDIT LOGS (compliance)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    organization_id TEXT REFERENCES organizations(id),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    changes JSON,
    ip_address TEXT,
    user_agent TEXT,
    cf_ray_id TEXT,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_cf_access_id ON users(cf_access_id);
CREATE INDEX IF NOT EXISTS idx_users_platform_admin ON users(is_platform_admin);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain);

CREATE INDEX IF NOT EXISTS idx_user_org_roles_user ON user_organization_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_org_roles_org ON user_organization_roles(organization_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- ============================================
-- INITIAL DATA: Default Permissions
-- ============================================
INSERT OR IGNORE INTO permissions (id, resource, action, description) VALUES
-- Vulnerabilities
('perm-vuln-create', 'vulnerabilities', 'create', 'Create vulnerabilities'),
('perm-vuln-read', 'vulnerabilities', 'read', 'View vulnerabilities'),
('perm-vuln-update', 'vulnerabilities', 'update', 'Update vulnerabilities'),
('perm-vuln-delete', 'vulnerabilities', 'delete', 'Delete vulnerabilities'),
('perm-vuln-manage', 'vulnerabilities', 'manage', 'Full vulnerability management'),

-- Jira Integration
('perm-jira-read', 'jira', 'read', 'View Jira configuration'),
('perm-jira-configure', 'jira', 'configure', 'Configure Jira integration'),
('perm-jira-sync', 'jira', 'sync', 'Sync with Jira'),

-- Reports
('perm-reports-read', 'reports', 'read', 'View reports'),
('perm-reports-create', 'reports', 'create', 'Generate reports'),
('perm-reports-export', 'reports', 'export', 'Export reports'),

-- Users
('perm-users-read', 'users', 'read', 'View users'),
('perm-users-create', 'users', 'create', 'Invite users'),
('perm-users-update', 'users', 'update', 'Update users'),
('perm-users-delete', 'users', 'delete', 'Remove users'),
('perm-users-manage', 'users', 'manage', 'Full user management'),

-- Settings
('perm-settings-read', 'settings', 'read', 'View settings'),
('perm-settings-update', 'settings', 'update', 'Update settings'),

-- Organization
('perm-org-manage', 'organization', 'manage', 'Manage organization');

-- ============================================
-- INITIAL DATA: Default Organization (ness.)
-- ============================================
INSERT OR IGNORE INTO organizations (id, name, domain, slug, subscription_plan, max_users) VALUES
('org-ness', 'ness.', 'ness.tec.br', 'ness', 'enterprise', 100);

-- ============================================
-- INITIAL DATA: Default Roles for ness.
-- ============================================
INSERT OR IGNORE INTO roles (id, organization_id, name, description, is_system_role) VALUES
('role-ness-admin', 'org-ness', 'Admin', 'Full access to organization', TRUE),
('role-ness-user', 'org-ness', 'User', 'Standard user access', TRUE),
('role-ness-viewer', 'org-ness', 'Viewer', 'Read-only access', TRUE);

-- ============================================
-- INITIAL DATA: Admin Role Permissions
-- ============================================
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
-- Admin has all permissions
('rp-admin-1', 'role-ness-admin', 'perm-vuln-manage'),
('rp-admin-2', 'role-ness-admin', 'perm-jira-configure'),
('rp-admin-3', 'role-ness-admin', 'perm-jira-sync'),
('rp-admin-4', 'role-ness-admin', 'perm-reports-create'),
('rp-admin-5', 'role-ness-admin', 'perm-reports-export'),
('rp-admin-6', 'role-ness-admin', 'perm-users-manage'),
('rp-admin-7', 'role-ness-admin', 'perm-settings-update'),
('rp-admin-8', 'role-ness-admin', 'perm-org-manage');

-- ============================================
-- INITIAL DATA: User Role Permissions
-- ============================================
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
('rp-user-1', 'role-ness-user', 'perm-vuln-create'),
('rp-user-2', 'role-ness-user', 'perm-vuln-read'),
('rp-user-3', 'role-ness-user', 'perm-vuln-update'),
('rp-user-4', 'role-ness-user', 'perm-jira-read'),
('rp-user-5', 'role-ness-user', 'perm-jira-sync'),
('rp-user-6', 'role-ness-user', 'perm-reports-read'),
('rp-user-7', 'role-ness-user', 'perm-reports-create'),
('rp-user-8', 'role-ness-user', 'perm-settings-read');

-- ============================================
-- INITIAL DATA: Viewer Role Permissions
-- ============================================
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
('rp-viewer-1', 'role-ness-viewer', 'perm-vuln-read'),
('rp-viewer-2', 'role-ness-viewer', 'perm-jira-read'),
('rp-viewer-3', 'role-ness-viewer', 'perm-reports-read'),
('rp-viewer-4', 'role-ness-viewer', 'perm-settings-read');

-- ============================================
-- INITIAL DATA: Platform Super Admin (YOU)
-- ============================================
INSERT OR IGNORE INTO users (id, email, name, is_platform_admin, is_active, email_verified) VALUES
('user-resper', 'resper@ness.com.br', 'Resper Silva', TRUE, TRUE, TRUE);

INSERT OR IGNORE INTO platform_admins (id, user_id, permissions, notes) VALUES
('padmin-1', 'user-resper', '["*"]', 'Platform founder and super administrator');

-- Assign super admin to ness. organization as Admin
INSERT OR IGNORE INTO user_organization_roles (id, user_id, organization_id, role_id, assigned_by) VALUES
('uor-resper-ness', 'user-resper', 'org-ness', 'role-ness-admin', 'user-resper');

-- ============================================
-- Update existing vulnerabilities with org
-- ============================================
UPDATE vulnerabilities SET tenant_id = 'org-ness' WHERE tenant_id = 'tenant-1' OR tenant_id IS NULL;

-- ============================================
-- Update existing jira_configurations with org
-- ============================================
UPDATE jira_configurations SET tenant_id = 'org-ness' WHERE tenant_id = 'tenant-1' OR tenant_id IS NULL;

-- ============================================
-- COMPLETED
-- ============================================

