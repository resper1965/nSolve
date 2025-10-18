-- n.Solve - Status VLM Formal Terms
-- Migração para termos formais de status

-- Adicionar campo last_status_change_date
ALTER TABLE vulnerabilities ADD COLUMN last_status_change_date DATETIME;

-- Atualizar status existentes para novos termos formais
UPDATE vulnerabilities SET status_vlm = 'ACTIVE' WHERE status_vlm = 'PENDING_TRIAGE';
UPDATE vulnerabilities SET status_vlm = 'ACTIVE_VERIFIED' WHERE status_vlm = 'VALIDATED';
UPDATE vulnerabilities SET status_vlm = 'INACTIVE_FALSE_POSITIVE' WHERE status_vlm = 'FALSE_POSITIVE';
UPDATE vulnerabilities SET status_vlm = 'INACTIVE_RISK_ACCEPTED' WHERE status_vlm = 'RISK_ACCEPTED';
UPDATE vulnerabilities SET status_vlm = 'INACTIVE_MITIGATED' WHERE status_vlm IN ('CLOSED', 'IN_REMEDIATION', 'AWAITING_RETEST');

-- Criar índice para busca por status
CREATE INDEX IF NOT EXISTS idx_vuln_status_vlm_formal ON vulnerabilities(status_vlm);

