-- n.Solve - Reimport Module Fields
-- Adicionar campos necessários para o módulo de reimportação

-- Campo: mitigated_date (data de mitigação/fechamento)
ALTER TABLE vulnerabilities ADD COLUMN mitigated_date DATETIME;

-- Campos de política de reimportação na tabela asset_configs
ALTER TABLE asset_configs ADD COLUMN reimport_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE asset_configs ADD COLUMN close_old_findings BOOLEAN DEFAULT FALSE;
ALTER TABLE asset_configs ADD COLUMN do_not_reactivate BOOLEAN DEFAULT FALSE;

-- Criar índice para otimizar queries de reimport
CREATE INDEX IF NOT EXISTS idx_vuln_reimport_lookup 
ON vulnerabilities(asset_id, source_tool, status_vlm, is_duplicate);

-- Criar índice para buscar achados fechados
CREATE INDEX IF NOT EXISTS idx_vuln_closed_findings 
ON vulnerabilities(asset_id, source_tool, status_vlm) 
WHERE status_vlm = 'CLOSED' AND is_duplicate = FALSE;

-- Criar índice para buscar achados ativos
CREATE INDEX IF NOT EXISTS idx_vuln_active_findings 
ON vulnerabilities(asset_id, source_tool, status_vlm, is_duplicate) 
WHERE status_vlm NOT IN ('CLOSED', 'FALSE_POSITIVE', 'RISK_ACCEPTED') AND is_duplicate = FALSE;

