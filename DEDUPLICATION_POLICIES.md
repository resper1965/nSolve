# n.Solve - Políticas Configuráveis de Deduplicação

## Visão Geral

O n.Solve implementa um sistema sofisticado de deduplicação de vulnerabilidades que permite controle granular sobre como achados duplicados são tratados. Este documento descreve as políticas configuráveis e como utilizá-las.

## Conceitos Fundamentais

### 1. Achado Original (Original Finding)
- Primeiro achado criado com uma `correlation_key` específica
- `is_duplicate = FALSE`
- Serve como referência para todos os duplicados
- Gera tickets no sistema de orquestração (Jira/ADO)

### 2. Achado Duplicado (Duplicate Finding)
- Achado com a mesma `correlation_key` de um Original Finding
- `is_duplicate = TRUE`
- Referencia o Original via `original_finding_uuid`
- Status automático: `INACTIVE_DUPLICATE`
- **NÃO gera tickets** automaticamente

### 3. Reimportação (Reimportation)
- Quando o mesmo achado é recebido novamente do mesmo `asset_id`
- Atualiza apenas `last_seen_timestamp` do Original Finding
- **NÃO cria novo registro**

## Campos de Configuração (AssetConfig)

### `enable_deduplication`
- **Tipo:** `boolean`
- **Default:** `true`
- **Descrição:** Ativa/desativa o sistema de deduplicação
- **Comportamento:**
  - `true`: Sistema busca por correlation_key antes de criar achados
  - `false`: Todos os achados são criados como novos (bypass completo)

**Caso de Uso:** Desative para ambientes de teste onde você quer todos os achados separados.

### `deduplication_scope`
- **Tipo:** `'ASSET' | 'TENANT'`
- **Default:** `'TENANT'`
- **Descrição:** Define o escopo da busca por duplicatas
- **Comportamento:**
  - `'ASSET'`: Busca duplicatas apenas dentro do mesmo asset_id
  - `'TENANT'`: Busca duplicatas em todos os assets do tenant_id

**Caso de Uso:**
- Use `'ASSET'` quando cada aplicação/sistema deve ter seus próprios achados, mesmo que sejam idênticos
- Use `'TENANT'` para consolidar achados em toda a organização

### `delete_duplicate_findings`
- **Tipo:** `boolean`
- **Default:** `false`
- **Descrição:** Ativa limpeza automática de duplicatas antigas
- **Comportamento:**
  - `true`: DuplicateCleanupAgent deleta duplicatas antigas diariamente
  - `false`: Duplicatas são mantidas indefinidamente

**Caso de Uso:** Ative para evitar acúmulo de registros duplicados no banco de dados.

### `max_duplicates`
- **Tipo:** `number`
- **Default:** `10`
- **Descrição:** Número máximo de duplicatas permitidas por Original Finding
- **Comportamento:** Quando excedido, o DuplicateCleanupAgent remove as duplicatas mais antigas

**Recomendações:**
- **Ambiente de produção:** 5-10 duplicatas
- **Ambiente de teste:** 20-50 duplicatas (para análise)
- **Ambiente corporativo grande:** 3-5 duplicatas (alta frequência de scans)

## Fluxo de Decisão

```
Achado recebido
    ↓
enable_deduplication = TRUE?
    ↓ NO → Criar como NEW_FINDING
    ↓ YES
    ↓
Buscar Original Finding (escopo: deduplication_scope)
    ↓
Original encontrado?
    ↓ NO → Criar como NEW_FINDING
    ↓ YES
    ↓
Original.asset_id == achado.asset_id?
    ↓ YES → REIMPORTAÇÃO (atualizar last_seen_timestamp)
    ↓ NO → DEDUPLICAÇÃO (criar registro DUPLICATE_CREATED)
```

## DuplicateCleanupAgent

### Agendamento
- **Trigger:** Cron diário às 3:00 AM UTC
- **Endpoint manual:** `POST https://duplicate-cleanup.ness.tec.br/cleanup`

### Lógica de Limpeza

1. Busca todos os `AssetConfig` com `delete_duplicate_findings = TRUE`
2. Para cada AssetConfig, busca todos os Original Findings do tenant
3. Para cada Original Finding:
   - Conta duplicatas existentes
   - Se duplicatas > `max_duplicates`:
     - Calcula quantos deletar: `total - max_duplicates`
     - Deleta os registros **mais antigos** (ordenados por `created_at ASC`)
     - Mantém os `max_duplicates` mais recentes

### Exemplo

**Cenário:**
- Original Finding: `vuln-001`
- Duplicatas: 15 registros
- `max_duplicates`: 10
- `delete_duplicate_findings`: TRUE

**Ação:**
- Ordenar 15 duplicatas por `created_at ASC`
- Deletar os 5 registros mais antigos
- Manter os 10 mais recentes

**Resultado:**
```json
{
  "original_finding_id": "vuln-001",
  "duplicates_found": 15,
  "duplicates_deleted": 5
}
```

## Configuração via Admin Service

### Criar AssetConfig com Políticas

```bash
curl -X POST https://admin-service.ness.tec.br/asset-configs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Web App",
    "asset_type": "WEB",
    "tenant_id": "org-ness",
    "system_type": "JIRA",
    "enable_deduplication": true,
    "deduplication_scope": "TENANT",
    "delete_duplicate_findings": true,
    "max_duplicates": 5,
    "sla_config": {
      "CRITICAL": 7,
      "HIGH": 30,
      "MEDIUM": 90
    }
  }'
```

### Atualizar Políticas

```bash
curl -X PUT https://admin-service.ness.tec.br/asset-configs/asset-123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enable_deduplication": false,
    "deduplication_scope": "ASSET",
    "max_duplicates": 20
  }'
```

## Monitoramento

### Logs do DuplicateCleanupAgent

```bash
# Acompanhar logs em tempo real
wrangler tail duplicate-cleanup-agent

# Buscar logs históricos
wrangler tail duplicate-cleanup-agent --format pretty
```

### Métricas Importantes

- `total_processed`: Total de Original Findings verificados
- `total_deleted`: Total de duplicatas removidas
- `findings_with_deletions`: Quantos Original Findings tiveram duplicatas deletadas

### Alertas

O sistema emite um warning quando:
- Mais de 100 duplicatas são deletadas em uma única execução
- Indica possível problema de configuração ou alta taxa de duplicação

## Casos de Uso

### 1. Ambiente de Desenvolvimento/Teste
```json
{
  "enable_deduplication": false,
  "delete_duplicate_findings": false
}
```
**Rationale:** Manter todos os achados separados para análise completa.

### 2. Produção - Aplicação Única
```json
{
  "enable_deduplication": true,
  "deduplication_scope": "ASSET",
  "delete_duplicate_findings": true,
  "max_duplicates": 5
}
```
**Rationale:** Deduplicação por asset, limpeza automática moderada.

### 3. Produção - Organização Corporativa
```json
{
  "enable_deduplication": true,
  "deduplication_scope": "TENANT",
  "delete_duplicate_findings": true,
  "max_duplicates": 3
}
```
**Rationale:** Deduplicação global, limpeza agressiva para reduzir ruído.

### 4. Compliance/Auditoria
```json
{
  "enable_deduplication": true,
  "deduplication_scope": "TENANT",
  "delete_duplicate_findings": false,
  "max_duplicates": 999
}
```
**Rationale:** Deduplicação ativa mas manter histórico completo para auditoria.

## Troubleshooting

### Problema: Muitas duplicatas sendo criadas

**Diagnóstico:**
```sql
SELECT 
  original_finding_uuid, 
  COUNT(*) as duplicate_count
FROM vulnerabilities
WHERE is_duplicate = TRUE
GROUP BY original_finding_uuid
ORDER BY duplicate_count DESC
LIMIT 10;
```

**Solução:**
- Reduzir `max_duplicates`
- Ativar `delete_duplicate_findings`
- Revisar `deduplication_scope`

### Problema: Achados legítimos marcados como duplicados

**Diagnóstico:**
- Verificar lógica de `generateCorrelationKey`
- Revisar se `deduplication_scope` está correto

**Solução:**
- Ajustar `deduplication_scope` de `TENANT` para `ASSET`
- Revisar campos usados na correlation_key

### Problema: DuplicateCleanupAgent não está executando

**Diagnóstico:**
```bash
# Verificar cron trigger
wrangler deployments list --name duplicate-cleanup-agent

# Testar manualmente
curl -X POST https://duplicate-cleanup.ness.tec.br/cleanup
```

**Solução:**
- Verificar se o Worker está deployed
- Confirmar cron trigger no wrangler.toml
- Testar via endpoint HTTP

## Referências

- **AssetConfig Interface:** `workers/shared/types.ts`
- **Persistence Logic:** `workers/inbound-receiver/adapters/pentest-tools-adapter.ts`
- **Cleanup Agent:** `workers/duplicate-cleanup/index.ts`
- **Migration Schema:** `schema/d1-deduplication-policy-migration.sql`

