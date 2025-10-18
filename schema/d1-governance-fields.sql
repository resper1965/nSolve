-- n.Solve - Governance Module Schema
-- Campos para governança manual e edição em massa

-- ============================================
-- TABELA: vulnerabilities (MODIFICAÇÕES)
-- ============================================

-- Campos de Título
ALTER TABLE vulnerabilities ADD COLUMN raw_title TEXT; -- Título original do scanner (IMUTÁVEL)
ALTER TABLE vulnerabilities ADD COLUMN title_user_edited TEXT; -- Título editado pelo analista

-- Campos de Severidade
-- severidade_original já existe (severity)
ALTER TABLE vulnerabilities ADD COLUMN severity_manual TEXT; -- Severidade manual do analista

-- Campos de Governança Manual
ALTER TABLE vulnerabilities ADD COLUMN is_verified BOOLEAN DEFAULT FALSE; -- Triage confirmado
ALTER TABLE vulnerabilities ADD COLUMN is_false_positive BOOLEAN DEFAULT FALSE; -- Falso Positivo
ALTER TABLE vulnerabilities ADD COLUMN risk_accepted BOOLEAN DEFAULT FALSE; -- Aceite de Risco
ALTER TABLE vulnerabilities ADD COLUMN justification TEXT; -- Justificativa para FP/Risk Accepted
ALTER TABLE vulnerabilities ADD COLUMN tags TEXT; -- JSON array de tags (ex: ["Q4_Focus", "Critical"])

-- Campos de Agrupamento
ALTER TABLE vulnerabilities ADD COLUMN test_run_id TEXT; -- ID do scan/teste
ALTER TABLE vulnerabilities ADD COLUMN group_id TEXT; -- ID do grupo

-- ============================================
-- TABELA: finding_groups (NOVA)
-- ============================================

CREATE TABLE IF NOT EXISTS finding_groups (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    asset_id TEXT NOT NULL, -- Restrição: todos os achados devem ser do mesmo asset
    test_run_id TEXT, -- Opcional: todos os achados devem ser do mesmo test_run
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Estatísticas do grupo (calculadas)
    finding_count INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    
    -- Metadados
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice para busca por grupo
CREATE INDEX IF NOT EXISTS idx_vuln_group_id 
ON vulnerabilities(group_id) 
WHERE group_id IS NOT NULL;

-- Índice para busca por test_run
CREATE INDEX IF NOT EXISTS idx_vuln_test_run 
ON vulnerabilities(test_run_id) 
WHERE test_run_id IS NOT NULL;

-- Índice para busca por tags (full-text search)
CREATE INDEX IF NOT EXISTS idx_vuln_tags 
ON vulnerabilities(tags) 
WHERE tags IS NOT NULL;

-- Índice para governança (FP, Risk Accepted, Verified)
CREATE INDEX IF NOT EXISTS idx_vuln_governance 
ON vulnerabilities(is_false_positive, risk_accepted, is_verified);

-- Índice para finding_groups por tenant e asset
CREATE INDEX IF NOT EXISTS idx_finding_groups_tenant_asset 
ON finding_groups(tenant_id, asset_id);

-- Índice para finding_groups por test_run
CREATE INDEX IF NOT EXISTS idx_finding_groups_test_run 
ON finding_groups(test_run_id) 
WHERE test_run_id IS NOT NULL;

-- ============================================
-- TRIGGERS PARA AUDITORIA
-- ============================================

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER IF NOT EXISTS trg_finding_groups_updated_at
AFTER UPDATE ON finding_groups
FOR EACH ROW
BEGIN
    UPDATE finding_groups SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- COMENTÁRIOS E OBSERVAÇÕES
-- ============================================

-- raw_title: 
--   - Armazena o título ORIGINAL do scanner
--   - NUNCA deve ser modificado após criação
--   - Usado para correlação e histórico
--
-- title_user_edited:
--   - Título editado pelo analista
--   - Se NULL, usar raw_title
--   - Frontend deve exibir title_user_edited ?? raw_title
--
-- severity_manual:
--   - Severidade ajustada MANUALMENTE pelo analista
--   - Se NULL, usar severidade_ajustada
--   - Prioridade: severity_manual > severidade_ajustada > severidade_original
--
-- tags:
--   - Armazenado como JSON string: '["tag1", "tag2"]'
--   - Permite busca e filtragem flexível
--   - Frontend deve fazer parse do JSON
--
-- finding_groups:
--   - Restrição de integridade: todos os achados de um grupo devem compartilhar:
--     * Mesmo tenant_id
--     * Mesmo asset_id
--     * Mesmo test_run_id (se aplicável)
--   - Estatísticas são calculadas e armazenadas para performance

