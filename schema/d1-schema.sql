-- ness. VLM Tracker - D1 Database Schema
-- SQLite (Cloudflare D1)
-- 
-- Migrado de PostgreSQL para SQLite
-- Principais diferenças:
-- - Sem ENUM types (usa TEXT com CHECK)
-- - Sem UUID nativo (usa TEXT)
-- - Simplificação de índices

-- Tabela principal de vulnerabilidades
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    
    -- Chave de correlação (SHA-256)
    correlation_key TEXT NOT NULL UNIQUE,
    
    -- Dados da vulnerabilidade
    vulnerability_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL')),
    url_target TEXT NOT NULL,
    affected_param TEXT,
    
    -- Descrições
    description TEXT,
    description_translated TEXT,
    
    -- Recomendações
    recommendation TEXT,
    recommendation_translated TEXT,
    
    -- Metadados de tradução
    translation_language TEXT,
    
    -- Origem
    tool_source TEXT,
    asset_name TEXT,
    project_id TEXT DEFAULT 'default',
    
    -- Status do ciclo de vida
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN (
        'open', 'in_review', 'assigned', 'in_progress', 
        'fixed', 'verified', 'closed', 'reopened'
    )),
    
    -- Integração Jira
    jira_ticket_key TEXT,
    
    -- Timestamps
    scan_timestamp TEXT,
    first_detected TEXT NOT NULL DEFAULT (datetime('now')),
    last_detected TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Contadores
    detection_count INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps de auditoria
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_correlation_key ON vulnerabilities(correlation_key);
CREATE INDEX IF NOT EXISTS idx_severity ON vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_status ON vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_asset_name ON vulnerabilities(asset_name);
CREATE INDEX IF NOT EXISTS idx_project_id ON vulnerabilities(project_id);
CREATE INDEX IF NOT EXISTS idx_first_detected ON vulnerabilities(first_detected);
CREATE INDEX IF NOT EXISTS idx_jira_ticket ON vulnerabilities(jira_ticket_key);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER IF NOT EXISTS update_vulnerabilities_timestamp 
AFTER UPDATE ON vulnerabilities
BEGIN
    UPDATE vulnerabilities 
    SET updated_at = datetime('now') 
    WHERE id = NEW.id;
END;

-- Tabela de histórico de mudanças de status (auditoria)
CREATE TABLE IF NOT EXISTS status_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    vulnerability_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT,
    changed_at TEXT NOT NULL DEFAULT (datetime('now')),
    notes TEXT,
    
    FOREIGN KEY (vulnerability_id) REFERENCES vulnerabilities(id)
);

CREATE INDEX IF NOT EXISTS idx_status_history_vuln ON status_history(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_status_history_date ON status_history(changed_at);

-- Tabela de assets (opcional - para normalização)
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    type TEXT, -- 'web', 'api', 'mobile', etc
    tech_stack TEXT, -- 'Python/Django', 'Node.js/Express', etc
    criticality TEXT CHECK(criticality IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    owner_team TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assets_name ON assets(name);
CREATE INDEX IF NOT EXISTS idx_assets_criticality ON assets(criticality);

-- Views úteis para relatórios
CREATE VIEW IF NOT EXISTS v_open_critical_vulnerabilities AS
SELECT 
    v.*,
    a.tech_stack,
    a.owner_team
FROM vulnerabilities v
LEFT JOIN assets a ON v.asset_name = a.name
WHERE v.status IN ('open', 'in_review', 'assigned', 'in_progress')
AND v.severity IN ('CRITICAL', 'HIGH')
ORDER BY 
    CASE v.severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
    END,
    v.first_detected ASC;

-- View para análise de reincidência
CREATE VIEW IF NOT EXISTS v_recurring_vulnerabilities AS
SELECT 
    correlation_key,
    vulnerability_type,
    severity,
    url_target,
    affected_param,
    detection_count,
    first_detected,
    last_detected,
    status
FROM vulnerabilities
WHERE detection_count > 1
ORDER BY detection_count DESC, last_detected DESC;

-- View para métricas por asset
CREATE VIEW IF NOT EXISTS v_vulnerabilities_by_asset AS
SELECT 
    asset_name,
    COUNT(*) as total_vulnerabilities,
    SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
    SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high_count,
    SUM(CASE WHEN severity = 'MEDIUM' THEN 1 ELSE 0 END) as medium_count,
    SUM(CASE WHEN severity = 'LOW' THEN 1 ELSE 0 END) as low_count,
    SUM(CASE WHEN status IN ('open', 'in_review', 'assigned', 'in_progress') THEN 1 ELSE 0 END) as open_count
FROM vulnerabilities
GROUP BY asset_name
ORDER BY critical_count DESC, high_count DESC;

-- Dados de exemplo para assets
INSERT OR IGNORE INTO assets (name, type, tech_stack, criticality, owner_team) VALUES
('API Gateway', 'api', 'Python/Django', 'CRITICAL', 'Platform Team'),
('Web Portal', 'web', 'Next.js/React', 'HIGH', 'Frontend Team'),
('Mobile App API', 'api', 'Node.js/Express', 'HIGH', 'Mobile Team'),
('Admin Dashboard', 'web', 'React/TypeScript', 'MEDIUM', 'Admin Team');
