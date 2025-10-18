-- n.Solve - Asset Configs Table
-- Tabela para configuração de assets com políticas de deduplicação

CREATE TABLE IF NOT EXISTS asset_configs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    
    -- Orquestração
    system_type TEXT CHECK(system_type IN ('JIRA', 'ADO', 'SERVICENOW', 'GITHUB')),
    
    -- SLA Configuration (JSON)
    sla_config TEXT, -- JSON: {"CRITICAL": 7, "HIGH": 30, "MEDIUM": 90}
    
    -- Deduplication Policy
    enable_deduplication BOOLEAN DEFAULT TRUE,
    deduplication_scope TEXT DEFAULT 'TENANT' CHECK(deduplication_scope IN ('ASSET', 'TENANT')),
    delete_duplicate_findings BOOLEAN DEFAULT FALSE,
    max_duplicates INTEGER DEFAULT 10,
    
    -- Configurations (JSON)
    ado_config TEXT, -- JSON
    jira_config TEXT, -- JSON
    github_config TEXT, -- JSON
    notification_config TEXT, -- JSON
    
    -- Settings
    auto_create_tickets BOOLEAN DEFAULT FALSE,
    auto_triage_enabled BOOLEAN DEFAULT FALSE,
    sla_monitoring_enabled BOOLEAN DEFAULT FALSE,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_asset_configs_tenant ON asset_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_configs_system_type ON asset_configs(system_type);
CREATE INDEX IF NOT EXISTS idx_asset_configs_deletion_policy 
ON asset_configs(delete_duplicate_findings, enable_deduplication) 
WHERE delete_duplicate_findings = TRUE AND enable_deduplication = TRUE;

