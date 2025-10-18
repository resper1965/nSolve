# n.Solve - Módulo de Reimportação (CI/CD Recorrente)

## Visão Geral

O **Módulo de Reimportação** permite que o n.Solve gerencie inteligentemente testes de segurança recorrentes em pipelines CI/CD, fechando automaticamente vulnerabilidades corrigidas e reabrindo vulnerabilidades que reaparecem.

---

## 🎯 Casos de Uso

### 1. Pipeline CI/CD com Scans Recorrentes
**Cenário:** Você executa testes DAST diariamente no mesmo ambiente/aplicação.

**Problema sem Reimport:**
- Vulnerabilidades corrigidas permanecem abertas indefinidamente
- Vulnerabilidades que reaparecem não são detectadas como regressões
- Acúmulo de achados obsoletos no dashboard

**Solução com Reimport:**
- ✅ Achados não encontrados no scan atual são **automaticamente fechados**
- ✅ Achados previamente fechados que reaparecem são **automaticamente reabertos**
- ✅ Dashboard sempre reflete o estado atual da aplicação

---

## 📋 Campos de Política (AssetConfig)

### `reimport_enabled` (boolean)
- **Descrição:** Ativa/desativa o módulo de reimportação
- **Default:** `false`
- **Quando usar:** 
  - `true`: Para ambientes com scans recorrentes (CI/CD, prod contínua)
  - `false`: Para scans one-time ou pentests manuais

### `close_old_findings` (boolean)
- **Descrição:** Fecha achados que não foram encontrados no scan atual
- **Default:** `false`
- **Comportamento:**
  - `true`: Achados ativos não presentes no scan atual → `status_vlm = 'CLOSED'`
  - `false`: Achados ativos permanecem abertos mesmo se não estiverem no scan

**⚠️ Importante:** Só funciona se `reimport_enabled = true`

### `do_not_reactivate` (boolean)
- **Descrição:** Controla se achados fechados podem ser reabertos
- **Default:** `false`
- **Comportamento:**
  - `true`: Achados fechados nunca são reabertos (ignorados permanentemente)
  - `false`: Achados fechados encontrados no scan atual → `status_vlm = 'PENDING_TRIAGE'`

**⚠️ Importante:** Só funciona se `reimport_enabled = true`

---

## 🔄 Fluxo de Processamento

```
┌─────────────────────────────────────────────────────────┐
│ 1. Webhook recebido com achados do scan atual          │
│    - Array de findings (ex: 10 vulnerabilidades)       │
│    - asset_id: "app-prod"                              │
│    - source_tool: "pentest-tools"                      │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Buscar AssetConfig do D1                            │
│    - reimport_enabled?                                 │
│    - close_old_findings?                               │
│    - do_not_reactivate?                                │
└─────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────┴─────────────────┐
        │                                    │
      YES (reimport_enabled)               NO
        │                                    │
        ↓                                    ↓
┌────────────────────────┐    ┌──────────────────────────┐
│ MÓDULO DE REIMPORTAÇÃO │    │ BYPASS - Processar       │
│                        │    │ todos os achados         │
│ STEP 1: FECHAMENTO     │    │ normalmente              │
│ - Buscar achados       │    └──────────────────────────┘
│   ATIVOS no D1         │
│ - Comparar com scan    │
│   atual                │
│ - Achados FALTANTES:   │
│   → UPDATE status_vlm  │
│      = 'CLOSED'        │
│                        │
│ STEP 2: REABERTURA     │
│ - Buscar achados       │
│   FECHADOS no D1       │
│ - Comparar com scan    │
│   atual                │
│ - Achados PRESENTES:   │
│   → UPDATE status_vlm  │
│      = 'PENDING_TRIAGE'│
│                        │
│ STEP 3: FILTRAR NOVOS  │
│ - Retornar apenas      │
│   achados NOVOS para   │
│   processar            │
└────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Processar achados filtrados                         │
│    - Deduplicação (se habilitada)                      │
│    - Persistência no D1                                │
│    - Orquestração de tickets                           │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 Exemplos de Configuração

### Exemplo 1: CI/CD Agressivo (Fechar e Reabrir)
**Cenário:** Pipeline diário, quer refletir estado exato da aplicação

```json
{
  "id": "asset-app-prod",
  "reimport_enabled": true,
  "close_old_findings": true,
  "do_not_reactivate": false
}
```

**Resultado:**
- ✅ Vulnerabilidades corrigidas são **automaticamente fechadas**
- ✅ Vulnerabilidades que retornam são **automaticamente reabertas**
- ✅ Dashboard sempre sincronizado com último scan

---

### Exemplo 2: CI/CD Conservador (Fechar, mas Não Reabrir)
**Cenário:** Quer fechar corrigidos, mas evitar reaberturas automáticas (requer análise manual)

```json
{
  "id": "asset-app-staging",
  "reimport_enabled": true,
  "close_old_findings": true,
  "do_not_reactivate": true
}
```

**Resultado:**
- ✅ Vulnerabilidades corrigidas são **automaticamente fechadas**
- ❌ Vulnerabilidades que retornam **NÃO são reabertas** (permanecem fechadas)
- 📊 Analista precisa revisar achados fechados manualmente

---

### Exemplo 3: Apenas Reabertura (Manter Histórico)
**Cenário:** Não quer fechar nada automaticamente, mas quer detectar regressões

```json
{
  "id": "asset-app-dev",
  "reimport_enabled": true,
  "close_old_findings": false,
  "do_not_reactivate": false
}
```

**Resultado:**
- ❌ Vulnerabilidades corrigidas **permanecem abertas** (não fechadas)
- ✅ Vulnerabilidades fechadas manualmente que retornam são **reabertas**
- 📈 Acúmulo de histórico completo

---

### Exemplo 4: Pentest Manual (Sem Reimport)
**Cenário:** Pentest one-time, não quer fechamento/reabertura automática

```json
{
  "id": "asset-pentest-2025-q1",
  "reimport_enabled": false,
  "close_old_findings": false,
  "do_not_reactivate": false
}
```

**Resultado:**
- ❌ Módulo de reimportação **desabilitado**
- 📝 Todos os achados são processados normalmente
- 🔍 Análise manual completa necessária

---

## 📊 Campos do Banco de Dados

### Tabela: `vulnerabilities`

**Campo adicionado:**
- `mitigated_date` (DATETIME) - Data de mitigação/fechamento do achado

**Transições de Status:**

| Status Inicial | Ação | Status Final | mitigated_date |
|----------------|------|--------------|----------------|
| `PENDING_TRIAGE` | Não encontrado no scan (close_old_findings=true) | `CLOSED` | `CURRENT_TIMESTAMP` |
| `VALIDATED` | Não encontrado no scan (close_old_findings=true) | `CLOSED` | `CURRENT_TIMESTAMP` |
| `CLOSED` | Encontrado no scan (do_not_reactivate=false) | `PENDING_TRIAGE` | `NULL` |

---

## 🧪 Testes e Exemplos

### Cenário de Teste: Scan Inicial

**Scan 1 (Dia 1):**
```json
{
  "asset_id": "asset-prod-web-01",
  "findings": [
    {"name": "SQL Injection", "url": "/login", "parameter": "username"},
    {"name": "XSS", "url": "/search", "parameter": "q"}
  ]
}
```

**Resultado:**
- 2 achados criados: `vuln-001` (SQL Injection), `vuln-002` (XSS)
- Status: `PENDING_TRIAGE`

---

### Cenário de Teste: Scan Recorrente (Vulnerabilidade Corrigida)

**Configuração:**
```json
{
  "reimport_enabled": true,
  "close_old_findings": true,
  "do_not_reactivate": false
}
```

**Scan 2 (Dia 2 - SQL Injection corrigido):**
```json
{
  "asset_id": "asset-prod-web-01",
  "findings": [
    {"name": "XSS", "url": "/search", "parameter": "q"}
  ]
}
```

**Resultado do Reimport:**
- `vuln-001` (SQL Injection): **FECHADO** (`status_vlm = 'CLOSED'`, `mitigated_date = '2025-10-18'`)
- `vuln-002` (XSS): **Inalterado** (`status_vlm = 'PENDING_TRIAGE'`)

**Logs:**
```
[Reimport] Found 2 active findings for asset asset-prod-web-01
[Reimport] CLOSED finding vuln-001 (not in current scan)
[Reimport] After reimport: 0 findings to process (closed: 1, reactivated: 0)
```

---

### Cenário de Teste: Regressão (Vulnerabilidade Retorna)

**Scan 3 (Dia 5 - SQL Injection retorna):**
```json
{
  "asset_id": "asset-prod-web-01",
  "findings": [
    {"name": "SQL Injection", "url": "/login", "parameter": "username"},
    {"name": "XSS", "url": "/search", "parameter": "q"}
  ]
}
```

**Resultado do Reimport:**
- `vuln-001` (SQL Injection): **REABERTO** (`status_vlm = 'PENDING_TRIAGE'`, `mitigated_date = NULL`)
- `vuln-002` (XSS): **Inalterado**

**Logs:**
```
[Reimport] Found 1 active findings for asset asset-prod-web-01
[Reimport] REACTIVATED finding vuln-001 (found in current scan)
[Reimport] After reimport: 0 findings to process (closed: 0, reactivated: 1)
```

---

## 🔍 Queries Úteis

### Verificar Achados Fechados Hoje

```sql
SELECT id, title, correlation_key, mitigated_date
FROM vulnerabilities
WHERE asset_id = 'asset-prod-web-01'
  AND status_vlm = 'CLOSED'
  AND DATE(mitigated_date) = DATE('now')
ORDER BY mitigated_date DESC;
```

### Achados Reabertos (Regressões)

```sql
SELECT id, title, correlation_key, updated_at
FROM vulnerabilities
WHERE asset_id = 'asset-prod-web-01'
  AND status_vlm = 'PENDING_TRIAGE'
  AND mitigated_date IS NULL
  AND updated_at > created_at
ORDER BY updated_at DESC;
```

### Estatísticas de Reimport

```sql
SELECT 
  asset_id,
  COUNT(CASE WHEN status_vlm = 'CLOSED' AND mitigated_date IS NOT NULL THEN 1 END) as total_closed,
  COUNT(CASE WHEN status_vlm = 'PENDING_TRIAGE' AND updated_at > created_at THEN 1 END) as total_reactivated
FROM vulnerabilities
WHERE source_tool = 'pentest-tools'
GROUP BY asset_id;
```

---

## 📈 Métricas e Dashboards

### Métricas Importantes

1. **Taxa de Correção:** 
   - `closed_findings / total_active_findings`
   - Indica eficiência da equipe de desenvolvimento

2. **Taxa de Regressão:**
   - `reactivated_findings / total_closed_findings`
   - Indica qualidade das correções

3. **Tempo Médio de Correção:**
   - `AVG(mitigated_date - first_seen_at)`
   - MTTR (Mean Time To Remediation)

---

## ⚠️ Considerações Importantes

### 1. Correlation Key é Crítico
O módulo de reimportação depende completamente da `correlation_key`. Se a chave mudar (ex: URL muda), o sistema tratará como achado diferente.

**Exemplo de Problema:**
```
Scan 1: SQL Injection em /login?user=admin
Scan 2: SQL Injection em /login?username=admin  (URL mudou)
```
→ Sistema cria **2 achados separados** em vez de reconhecer como o mesmo.

### 2. Source Tool Deve ser Consistente
O reimport filtra por `source_tool`. Se você alternar entre ferramentas, o fechamento automático não funcionará corretamente.

### 3. Asset ID Deve ser Consistente
Cada asset tem seu próprio ciclo de reimport. Se você mudar o `asset_id`, o sistema não reconhecerá o histórico anterior.

### 4. Falsos Positivos Não São Fechados
Achados com `status_vlm IN ('FALSE_POSITIVE', 'RISK_ACCEPTED')` **nunca** são fechados ou reabertos pelo reimport.

---

## 🚀 Deployment

### 1. Schema Aplicado
```bash
wrangler d1 execute ness_vlm_db \
  --file=schema/d1-reimport-fields.sql \
  --remote
```

### 2. Worker Deployed
```bash
cd workers/inbound-receiver
wrangler deploy
```

**Version ID:** `a7f6d0cb-1088-4fdd-ae2e-f6684e6c04b8`

### 3. Configurar AssetConfig

```bash
wrangler d1 execute ness_vlm_db \
  --command="UPDATE asset_configs SET reimport_enabled = TRUE, close_old_findings = TRUE, do_not_reactivate = FALSE WHERE id = 'asset-prod-web-01';" \
  --remote
```

---

## 📚 Arquivos Relacionados

- **Interface:** `workers/shared/types.ts` (AssetConfig)
- **Módulo Core:** `workers/core-processor/reimport.ts`
- **Integração:** `workers/inbound-receiver/adapters/pentest-tools-adapter.ts`
- **Schema:** `schema/d1-reimport-fields.sql`

---

## ✅ Checklist de Implementação

- [x] Interface `AssetConfig` estendida com 3 campos de política
- [x] Função `processRecurringReimport` criada
- [x] Lógica de FECHAMENTO implementada
- [x] Lógica de REABERTURA implementada
- [x] Integração no `pentest-tools-adapter`
- [x] Campo `mitigated_date` adicionado ao schema
- [x] Índices otimizados criados
- [x] Worker deployed
- [x] AssetConfig de exemplo configurado
- [x] Documentação completa

---

**Módulo de Reimportação implementado com sucesso!** 🎉

