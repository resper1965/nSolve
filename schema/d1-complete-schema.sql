-- n.Solve - Complete Database Schema with Tenant Isolation
-- Schema completo com RBAC Multi-tenant

-- ============================================
-- TABELAS PRINCIPAIS
-- ============================================

-- Vulnerabilities (Core data)
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    correlation_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low', 'informational')),
    status TEXT CHECK(status IN ('open', 'in_progress', 'resolved', 'closed', 'false_positive')) DEFAULT 'open',
    url_target TEXT,
    affected_param TEXT,
    tool_source TEXT,
    asset_name TEXT,
    cvss_score REAL,
    cve_id TEXT,
    discovered_at DATETIME,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id)
);

-- Translations
CREATE TABLE IF NOT EXISTS translations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    vulnerability_id TEXT REFERENCES vulnerabilities(id),
    language TEXT NOT NULL,
    title_translated TEXT,
    description_translated TEXT,
    recommendation_translated TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Jira Issues
CREATE TABLE IF NOT EXISTS jira_issues (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    vulnerability_id TEXT REFERENCES vulnerabilities(id),
    jira_key TEXT NOT NULL,
    jira_url TEXT,
    jira_status TEXT,
    jira_assignee TEXT,
    jira_priority TEXT,
    sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'failed')) DEFAULT 'pending',
    last_sync_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Webhook Events
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    event_type TEXT NOT NULL,
    source TEXT,
    payload TEXT,
    status TEXT CHECK(status IN ('received', 'processing', 'processed', 'failed')) DEFAULT 'received',
    correlation_key TEXT,
    error_message TEXT,
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log (para compliance)
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT, -- JSON
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Vulnerabilities
CREATE INDEX IF NOT EXISTS idx_vuln_tenant ON vulnerabilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vuln_correlation ON vulnerabilities(correlation_key);
CREATE INDEX IF NOT EXISTS idx_vuln_severity ON vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vuln_status ON vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_vuln_created ON vulnerabilities(created_at DESC);

-- Translations
CREATE INDEX IF NOT EXISTS idx_trans_tenant ON translations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trans_vuln ON translations(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_trans_lang ON translations(language);

-- Jira Issues
CREATE INDEX IF NOT EXISTS idx_jira_tenant ON jira_issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jira_vuln ON jira_issues(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_jira_key ON jira_issues(jira_key);
CREATE INDEX IF NOT EXISTS idx_jira_status ON jira_issues(jira_status);

-- Webhook Events
CREATE INDEX IF NOT EXISTS idx_webhook_tenant ON webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_created ON webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_correlation ON webhook_events(correlation_key);

-- Audit Log
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View: Vulnerabilities com informações de tenant e usuário
CREATE VIEW IF NOT EXISTS v_vulnerabilities_full AS
SELECT 
    v.*,
    t.name as tenant_name,
    t.slug as tenant_slug,
    u1.name as created_by_name,
    u2.name as updated_by_name
FROM vulnerabilities v
LEFT JOIN tenants t ON v.tenant_id = t.id
LEFT JOIN users u1 ON v.created_by = u1.id
LEFT JOIN users u2 ON v.updated_by = u2.id;

-- View: Estatísticas por tenant
CREATE VIEW IF NOT EXISTS v_tenant_stats AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    COUNT(DISTINCT v.id) as total_vulnerabilities,
    COUNT(DISTINCT CASE WHEN v.severity = 'critical' THEN v.id END) as critical_count,
    COUNT(DISTINCT CASE WHEN v.severity = 'high' THEN v.id END) as high_count,
    COUNT(DISTINCT CASE WHEN v.severity = 'medium' THEN v.id END) as medium_count,
    COUNT(DISTINCT CASE WHEN v.severity = 'low' THEN v.id END) as low_count,
    COUNT(DISTINCT CASE WHEN v.status = 'open' THEN v.id END) as open_count,
    COUNT(DISTINCT CASE WHEN v.status = 'resolved' THEN v.id END) as resolved_count,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT j.id) as total_jira_issues
FROM tenants t
LEFT JOIN vulnerabilities v ON t.id = v.tenant_id
LEFT JOIN user_tenant_roles utr ON t.id = utr.tenant_id
LEFT JOIN users u ON utr.user_id = u.id
LEFT JOIN jira_issues j ON t.id = j.tenant_id
GROUP BY t.id, t.name, t.slug;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Atualizar updated_at em vulnerabilities
CREATE TRIGGER IF NOT EXISTS update_vulnerabilities_updated_at
AFTER UPDATE ON vulnerabilities
FOR EACH ROW
BEGIN
    UPDATE vulnerabilities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger: Atualizar updated_at em jira_issues
CREATE TRIGGER IF NOT EXISTS update_jira_issues_updated_at
AFTER UPDATE ON jira_issues
FOR EACH ROW
BEGIN
    UPDATE jira_issues SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger: Audit log para vulnerabilities (INSERT)
CREATE TRIGGER IF NOT EXISTS audit_vulnerability_insert
AFTER INSERT ON vulnerabilities
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (id, tenant_id, user_id, action, resource_type, resource_id, details)
    VALUES (
        hex(randomblob(16)),
        NEW.tenant_id,
        NEW.created_by,
        'CREATE',
        'vulnerability',
        NEW.id,
        json_object('title', NEW.title, 'severity', NEW.severity)
    );
END;

-- Trigger: Audit log para vulnerabilities (UPDATE)
CREATE TRIGGER IF NOT EXISTS audit_vulnerability_update
AFTER UPDATE ON vulnerabilities
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (id, tenant_id, user_id, action, resource_type, resource_id, details)
    VALUES (
        hex(randomblob(16)),
        NEW.tenant_id,
        NEW.updated_by,
        'UPDATE',
        'vulnerability',
        NEW.id,
        json_object('old_status', OLD.status, 'new_status', NEW.status)
    );
END;

-- Trigger: Audit log para vulnerabilities (DELETE)
CREATE TRIGGER IF NOT EXISTS audit_vulnerability_delete
BEFORE DELETE ON vulnerabilities
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (id, tenant_id, action, resource_type, resource_id, details)
    VALUES (
        hex(randomblob(16)),
        OLD.tenant_id,
        'DELETE',
        'vulnerability',
        OLD.id,
        json_object('title', OLD.title, 'severity', OLD.severity)
    );
END;

