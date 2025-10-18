-- n.Solve - Cross-Tool Deduplication Schema
-- Inspirado no DefectDojo para deduplicação entre ferramentas

-- ============================================
-- TABELA: vulnerabilities (MODIFICAÇÕES)
-- ============================================

-- Campos para Cross-Tool Deduplication
ALTER TABLE vulnerabilities ADD COLUMN source_tool_id TEXT; -- ID original da ferramenta
ALTER TABLE vulnerabilities ADD COLUMN deduplication_hash TEXT NOT NULL DEFAULT ''; -- Hash cross-tool (SHA-256)
ALTER TABLE vulnerabilities ADD COLUMN discovered_date DATETIME DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- ÍNDICES PARA DEDUPLICAÇÃO CROSS-TOOL
-- ============================================

-- Índice para busca por source_tool_id + source_tool (estratégia primária)
CREATE INDEX IF NOT EXISTS idx_vuln_source_tool_lookup 
ON vulnerabilities(source_tool_id, source_tool) 
WHERE source_tool_id IS NOT NULL;

-- Índice para busca por deduplication_hash + asset_id (estratégia fallback)
CREATE INDEX IF NOT EXISTS idx_vuln_dedup_hash_asset 
ON vulnerabilities(deduplication_hash, asset_id);

-- Índice para busca por correlation_key + asset_id (estratégia location-based)
CREATE INDEX IF NOT EXISTS idx_vuln_correlation_asset 
ON vulnerabilities(correlation_key, asset_id);

-- Índice composto para deduplicação híbrida
CREATE INDEX IF NOT EXISTS idx_vuln_hybrid_dedup 
ON vulnerabilities(asset_id, source_tool, deduplication_hash, correlation_key);

-- ============================================
-- CONSTRAINT UNIQUE (OPCIONAL)
-- ============================================

-- SQLite não suporta ALTER TABLE ADD CONSTRAINT para UNIQUE composto
-- mas podemos criar um índice UNIQUE para garantir unicidade

-- Garantir que source_tool_id + source_tool sejam únicos (quando presentes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vuln_unique_source_tool 
ON vulnerabilities(source_tool_id, source_tool) 
WHERE source_tool_id IS NOT NULL AND source_tool_id != '';

-- ============================================
-- COMENTÁRIOS E OBSERVAÇÕES
-- ============================================

-- source_tool_id:
--   - ID original da vulnerabilidade na ferramenta de origem
--   - Exemplos: Wazuh alert_id, DefectDojo finding_id, Nessus plugin_id
--   - Usado como chave primária de deduplicação quando disponível
--   - Pode ser NULL para ferramentas que não fornecem ID estável
--
-- deduplication_hash:
--   - Hash SHA-256 calculado a partir de: title + severity + asset_id
--   - Normalizado (lowercase, trim, spaces)
--   - Permite deduplicação entre diferentes ferramentas
--   - Inspirado no DefectDojo
--   - NOT NULL DEFAULT '' para garantir presença
--
-- discovered_date:
--   - Data de descoberta da vulnerabilidade
--   - Default: CURRENT_TIMESTAMP
--   - Diferente de created_at (criação no n.Solve)
--
-- Estratégias de Deduplicação (em ordem de prioridade):
--   1. SOURCE_TOOL_ID: Busca por (source_tool_id + source_tool)
--   2. CROSS_TOOL_HASH: Busca por (deduplication_hash + asset_id)
--   3. CORRELATION_KEY: Busca por (correlation_key + asset_id)
--   4. HYBRID: Tenta todas as estratégias acima
--
-- Fluxo de Ingestão (POST /vulnerabilities/ingest):
--   1. Calcular deduplication_hash do achado
--   2. Buscar por source_tool_id (se disponível)
--   3. Se não encontrar, buscar por deduplication_hash + asset_id
--   4. Se não encontrar, buscar por correlation_key + asset_id (fallback)
--   5. Se encontrar: UPDATE (UPSERT)
--   6. Se não encontrar: INSERT (novo achado)

