-- n.Solve - Adicionar campos de deduplicação à tabela vulnerabilities

-- Adicionar campos se não existirem
-- SQLite não suporta ALTER TABLE IF COLUMN NOT EXISTS, então usamos try/catch no script

-- Campo: asset_id (usado para deduplicação)
ALTER TABLE vulnerabilities ADD COLUMN asset_id TEXT DEFAULT 'default-asset';

-- Campo: original_finding_uuid
ALTER TABLE vulnerabilities ADD COLUMN original_finding_uuid TEXT;

-- Campo: is_duplicate
ALTER TABLE vulnerabilities ADD COLUMN is_duplicate BOOLEAN DEFAULT FALSE;

-- Campo: last_seen_timestamp
ALTER TABLE vulnerabilities ADD COLUMN last_seen_timestamp DATETIME;

-- Campo: first_seen_timestamp
ALTER TABLE vulnerabilities ADD COLUMN first_seen_timestamp DATETIME;

-- Campo: status_vlm (se não existir)
ALTER TABLE vulnerabilities ADD COLUMN status_vlm TEXT DEFAULT 'PENDING_TRIAGE';

-- Campo: source_tool (se não existir)
ALTER TABLE vulnerabilities ADD COLUMN source_tool TEXT;

-- Campo: cve (se não existir, diferente de cve_id)
ALTER TABLE vulnerabilities ADD COLUMN cve TEXT;

-- Campo: title
ALTER TABLE vulnerabilities ADD COLUMN title TEXT;

-- Campo: cvss_score
ALTER TABLE vulnerabilities ADD COLUMN cvss_score REAL;

-- Criar índices para otimizar queries de deduplicação
CREATE INDEX IF NOT EXISTS idx_vuln_original_finding 
ON vulnerabilities(original_finding_uuid) 
WHERE is_duplicate = TRUE;

CREATE INDEX IF NOT EXISTS idx_vuln_correlation_key_duplicate 
ON vulnerabilities(correlation_key, is_duplicate);

CREATE INDEX IF NOT EXISTS idx_vuln_dedup_cleanup 
ON vulnerabilities(original_finding_uuid, is_duplicate, created_at) 
WHERE is_duplicate = TRUE;

CREATE INDEX IF NOT EXISTS idx_vuln_asset_id ON vulnerabilities(asset_id);
CREATE INDEX IF NOT EXISTS idx_vuln_status_vlm ON vulnerabilities(status_vlm);

