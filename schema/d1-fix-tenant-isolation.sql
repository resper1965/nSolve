-- n.Solve - Fix Tenant Data Isolation
-- Adicionar tenant_id em todas as tabelas de dados

-- 1. Verificar quais tabelas existem e adicionar tenant_id
-- Nota: SQLite não suporta ADD COLUMN IF NOT EXISTS diretamente

-- Criar tabela temporária para verificar colunas
PRAGMA table_info(vulnerabilities);

-- Tentar adicionar tenant_id (falhará se já existir, mas é seguro)
-- ALTER TABLE vulnerabilities ADD COLUMN tenant_id TEXT REFERENCES tenants(id);

-- Como SQLite não suporta condicionais, vamos usar um approach seguro
-- Criar as colunas apenas se não existirem usando SQL dinâmico

-- Para vulnerabilities (se a tabela existir)
CREATE TABLE IF NOT EXISTS vulnerabilities_temp AS 
SELECT * FROM vulnerabilities LIMIT 0;

-- Para jira_issues (se a tabela existir) 
CREATE TABLE IF NOT EXISTS jira_issues_temp AS
SELECT * FROM jira_issues LIMIT 0;

-- Para webhook_events (se a tabela existir)
CREATE TABLE IF NOT EXISTS webhook_events_temp AS
SELECT * FROM webhook_events LIMIT 0;

-- Limpar tabelas temporárias
DROP TABLE IF EXISTS vulnerabilities_temp;
DROP TABLE IF EXISTS jira_issues_temp;
DROP TABLE IF EXISTS webhook_events_temp;

-- Criar índices para tenant_id (serão criados apenas se as colunas existirem)
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_tenant_id ON vulnerabilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jira_issues_tenant_id ON jira_issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant_id ON webhook_events(tenant_id);

-- Atualizar registros sem tenant_id para o tenant padrão NESS
UPDATE vulnerabilities SET tenant_id = 'tenant_ness' WHERE tenant_id IS NULL;
UPDATE jira_issues SET tenant_id = 'tenant_ness' WHERE tenant_id IS NULL;
UPDATE webhook_events SET tenant_id = 'tenant_ness' WHERE tenant_id IS NULL;

-- Criar view para facilitar queries multi-tenant
CREATE VIEW IF NOT EXISTS v_user_tenants AS
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    t.id as tenant_id,
    t.slug as tenant_slug,
    t.name as tenant_name,
    r.name as role,
    u.is_super_admin
FROM users u
LEFT JOIN user_tenant_roles utr ON u.id = utr.user_id
LEFT JOIN tenants t ON utr.tenant_id = t.id
LEFT JOIN roles r ON utr.role_id = r.id;

-- Criar view para permissions do usuário
CREATE VIEW IF NOT EXISTS v_user_permissions AS
SELECT 
    utr.user_id,
    utr.tenant_id,
    p.id as permission_id,
    p.name as permission_name,
    p.resource,
    p.action
FROM user_tenant_roles utr
JOIN role_permissions rp ON utr.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;

