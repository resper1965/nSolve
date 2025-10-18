-- n.Solve - Deduplication Policy Migration
-- Adiciona campos de política de deduplicação à tabela asset_configs

-- Adicionar campos de política de deduplicação
ALTER TABLE asset_configs ADD COLUMN enable_deduplication BOOLEAN DEFAULT TRUE;
ALTER TABLE asset_configs ADD COLUMN deduplication_scope TEXT DEFAULT 'TENANT' CHECK(deduplication_scope IN ('ASSET', 'TENANT'));
ALTER TABLE asset_configs ADD COLUMN delete_duplicate_findings BOOLEAN DEFAULT FALSE;
ALTER TABLE asset_configs ADD COLUMN max_duplicates INTEGER DEFAULT 10;

-- Criar índice para otimizar queries do DuplicateCleanupAgent
CREATE INDEX IF NOT EXISTS idx_asset_configs_deletion_policy 
ON asset_configs(delete_duplicate_findings, enable_deduplication) 
WHERE delete_duplicate_findings = TRUE AND enable_deduplication = TRUE;

-- Adicionar campos de deduplicação à tabela vulnerabilities (se ainda não existirem)
-- Estes campos já foram adicionados anteriormente, mas incluímos aqui para garantir
-- CREATE TABLE IF NOT EXISTS tem proteção contra duplicação

-- Verificar se os campos já existem antes de adicionar
-- SQLite não suporta ALTER TABLE IF NOT EXISTS, então tentamos adicionar
-- e ignoramos erros se já existirem

-- Campo: original_finding_uuid
-- ALTER TABLE vulnerabilities ADD COLUMN original_finding_uuid TEXT REFERENCES vulnerabilities(id);

-- Campo: is_duplicate
-- ALTER TABLE vulnerabilities ADD COLUMN is_duplicate BOOLEAN DEFAULT FALSE;

-- Campo: last_seen_timestamp
-- ALTER TABLE vulnerabilities ADD COLUMN last_seen_timestamp DATETIME;

-- Criar índices para otimizar queries de deduplicação
CREATE INDEX IF NOT EXISTS idx_vuln_original_finding 
ON vulnerabilities(original_finding_uuid) 
WHERE is_duplicate = TRUE;

CREATE INDEX IF NOT EXISTS idx_vuln_correlation_key_duplicate 
ON vulnerabilities(correlation_key, is_duplicate);

CREATE INDEX IF NOT EXISTS idx_vuln_dedup_cleanup 
ON vulnerabilities(original_finding_uuid, is_duplicate, created_at) 
WHERE is_duplicate = TRUE;

-- Comentários sobre a política de deduplicação:
-- 
-- enable_deduplication: 
--   - TRUE: Sistema busca por achados duplicados antes de criar novos registros
--   - FALSE: Todos os achados são criados como novos (bypass de deduplicação)
--
-- deduplication_scope:
--   - 'ASSET': Busca duplicatas apenas dentro do mesmo asset_id
--   - 'TENANT': Busca duplicatas em todos os assets do mesmo tenant_id
--
-- delete_duplicate_findings:
--   - TRUE: DuplicateCleanupAgent deleta duplicatas antigas automaticamente
--   - FALSE: Duplicatas são mantidas indefinidamente
--
-- max_duplicates:
--   - Número máximo de duplicatas permitidas por achado original
--   - Quando excedido, o DuplicateCleanupAgent remove as mais antigas
--   - Recomendado: 5-10 para maioria dos casos

