-- n.Solve - RBAC Multi-tenant Schema for D1 Database
-- Sistema de controle de acesso baseado em roles e tenants

-- Tabela de Tenants (Organizações/Empresas)
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT,
    logo_url TEXT,
    settings TEXT, -- JSON com configurações do tenant
    status TEXT CHECK(status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Atualizar tabela users para incluir tenant_id
ALTER TABLE users ADD COLUMN tenant_id TEXT REFERENCES tenants(id);
ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;

-- Tabela de Roles (apenas 2: admin e user)
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT CHECK(name IN ('admin', 'user')) NOT NULL,
    description TEXT
);

-- Inserir roles padrão
INSERT OR IGNORE INTO roles (id, name, description) VALUES 
    ('role_admin', 'admin', 'Administrador com acesso total ao tenant'),
    ('role_user', 'user', 'Usuário com acesso limitado ao tenant');

-- Tabela de User-Tenant-Role (Relacionamento M:N)
CREATE TABLE IF NOT EXISTS user_tenant_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    role_id TEXT NOT NULL REFERENCES roles(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tenant_id) -- Um usuário tem apenas 1 role por tenant
);

-- Tabela de Permissions (O que cada role pode fazer)
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    resource TEXT NOT NULL, -- Ex: vulnerabilities, users, settings
    action TEXT NOT NULL, -- Ex: create, read, update, delete
    description TEXT
);

-- Inserir permissions padrão
INSERT OR IGNORE INTO permissions (id, name, resource, action, description) VALUES 
    -- Vulnerabilities
    ('perm_vuln_create', 'create_vulnerability', 'vulnerabilities', 'create', 'Criar vulnerabilidades'),
    ('perm_vuln_read', 'read_vulnerability', 'vulnerabilities', 'read', 'Visualizar vulnerabilidades'),
    ('perm_vuln_update', 'update_vulnerability', 'vulnerabilities', 'update', 'Atualizar vulnerabilidades'),
    ('perm_vuln_delete', 'delete_vulnerability', 'vulnerabilities', 'delete', 'Deletar vulnerabilidades'),
    
    -- Users
    ('perm_user_create', 'create_user', 'users', 'create', 'Criar usuários'),
    ('perm_user_read', 'read_user', 'users', 'read', 'Visualizar usuários'),
    ('perm_user_update', 'update_user', 'users', 'update', 'Atualizar usuários'),
    ('perm_user_delete', 'delete_user', 'users', 'delete', 'Deletar usuários'),
    
    -- Settings
    ('perm_settings_read', 'read_settings', 'settings', 'read', 'Visualizar configurações'),
    ('perm_settings_update', 'update_settings', 'settings', 'update', 'Atualizar configurações'),
    
    -- Reports
    ('perm_report_read', 'read_report', 'reports', 'read', 'Visualizar relatórios'),
    ('perm_report_export', 'export_report', 'reports', 'export', 'Exportar relatórios'),
    
    -- Jira
    ('perm_jira_create', 'create_jira', 'jira', 'create', 'Criar issues no Jira'),
    ('perm_jira_update', 'update_jira', 'jira', 'update', 'Atualizar issues no Jira');

-- Tabela de Role-Permissions (O que cada role pode fazer)
CREATE TABLE IF NOT EXISTS role_permissions (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL REFERENCES roles(id),
    permission_id TEXT NOT NULL REFERENCES permissions(id),
    UNIQUE(role_id, permission_id)
);

-- Atribuir permissions ao role ADMIN (todas)
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
    ('rp_admin_1', 'role_admin', 'perm_vuln_create'),
    ('rp_admin_2', 'role_admin', 'perm_vuln_read'),
    ('rp_admin_3', 'role_admin', 'perm_vuln_update'),
    ('rp_admin_4', 'role_admin', 'perm_vuln_delete'),
    ('rp_admin_5', 'role_admin', 'perm_user_create'),
    ('rp_admin_6', 'role_admin', 'perm_user_read'),
    ('rp_admin_7', 'role_admin', 'perm_user_update'),
    ('rp_admin_8', 'role_admin', 'perm_user_delete'),
    ('rp_admin_9', 'role_admin', 'perm_settings_read'),
    ('rp_admin_10', 'role_admin', 'perm_settings_update'),
    ('rp_admin_11', 'role_admin', 'perm_report_read'),
    ('rp_admin_12', 'role_admin', 'perm_report_export'),
    ('rp_admin_13', 'role_admin', 'perm_jira_create'),
    ('rp_admin_14', 'role_admin', 'perm_jira_update');

-- Atribuir permissions ao role USER (limitadas)
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
    ('rp_user_1', 'role_user', 'perm_vuln_read'),
    ('rp_user_2', 'role_user', 'perm_vuln_update'),
    ('rp_user_3', 'role_user', 'perm_user_read'),
    ('rp_user_4', 'role_user', 'perm_report_read'),
    ('rp_user_5', 'role_user', 'perm_jira_create');

-- Atualizar tabelas existentes para incluir tenant_id
-- (Apenas se as tabelas existirem)
-- ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
-- ALTER TABLE translations ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
-- ALTER TABLE jira_issues ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
-- ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_user ON user_tenant_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_tenant ON user_tenant_roles(tenant_id);

-- Criar tenant padrão NESS
INSERT OR IGNORE INTO tenants (id, name, slug, domain, status) 
VALUES (
    'tenant_ness',
    'ness.',
    'ness',
    'ness.tec.br',
    'active'
);

-- Atribuir usuários existentes ao tenant NESS como admin
UPDATE users SET tenant_id = 'tenant_ness' WHERE tenant_id IS NULL;

INSERT OR IGNORE INTO user_tenant_roles (id, user_id, tenant_id, role_id)
SELECT 
    'utr_' || users.id,
    users.id,
    'tenant_ness',
    'role_admin'
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM user_tenant_roles WHERE user_id = users.id
);

-- Triggers
CREATE TRIGGER IF NOT EXISTS update_tenants_updated_at
AFTER UPDATE ON tenants
FOR EACH ROW
BEGIN
    UPDATE tenants SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

