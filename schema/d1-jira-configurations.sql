-- n.Solve - Jira Configurations Table
-- Tabela para armazenar configurações de integração com Jira por tenant

CREATE TABLE IF NOT EXISTS jira_configurations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  jira_url TEXT NOT NULL,
  jira_email TEXT NOT NULL,
  jira_token TEXT NOT NULL,
  jira_project TEXT NOT NULL,
  custom_field_id TEXT DEFAULT 'customfield_10001',
  enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_jira_config_tenant ON jira_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jira_config_enabled ON jira_configurations(enabled);

-- Tabela para mapear vulnerabilidades com tickets do Jira
CREATE TABLE IF NOT EXISTS jira_issues (
  id TEXT PRIMARY KEY,
  vulnerability_id TEXT NOT NULL REFERENCES vulnerabilities(id),
  jira_key TEXT NOT NULL,
  jira_id TEXT NOT NULL,
  status TEXT DEFAULT 'Open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT NOT NULL REFERENCES tenants(id)
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_jira_issues_vuln ON jira_issues(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_jira_issues_tenant ON jira_issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jira_issues_jira_key ON jira_issues(jira_key);
