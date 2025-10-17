# 🚀 Deploy Rápido - ness. VLM Tracker

## ⚡ Guia Simplificado (SEM Jira)

**Você já tem:** Workers Paid **$5/mês** ✅

**Tempo estimado:** 10-15 minutos

---

## 📋 Checklist Rápida

1. ✅ Login no Cloudflare
2. ✅ Criar D1 database
3. ✅ Criar R2 bucket  
4. ✅ Criar KV namespace
5. ✅ Configurar webhook secret
6. ✅ Deploy 4 Workers
7. ✅ Testar

---

## 🎯 Passo a Passo

### 1️⃣ Preparar Projeto

```bash
cd /home/resper/ness-vlm-cloudflare
npm install
```

---

### 2️⃣ Login Cloudflare

```bash
npx wrangler login
```

Abre o navegador → você autoriza → terminal confirma

**Verificar:**
```bash
npx wrangler whoami
```

---

### 3️⃣ Criar D1 Database

```bash
npx wrangler d1 create ness_vlm_db
```

**VOCÊ VAI VER:**
```
✅ Successfully created DB 'ness_vlm_db'

[[d1_databases]]
binding = "VLM_DB"
database_name = "ness_vlm_db"
database_id = "12345678-abcd-1234-abcd-123456789abc"  # ← COPIE!
```

**📝 COPIE O database_id!**

---

### 4️⃣ Atualizar wrangler.toml

Abra `wrangler.toml` e substitua `database_id = "your-d1-database-id"` pelo ID real.

**IMPORTANTE:** Substitua em **3 lugares**:
- Linha ~70: core-processor
- Linha ~120: translation-agent  
- Linha ~160: jira-integration

**Antes:**
```toml
database_id = "your-d1-database-id"
```

**Depois:**
```toml
database_id = "12345678-abcd-1234-abcd-123456789abc"  # Seu ID real
```

---

### 5️⃣ Criar R2 Bucket

```bash
npx wrangler r2 bucket create ness-vlm-storage
```

**Esperado:** `✅ Created bucket 'ness-vlm-storage'`

---

### 6️⃣ Criar KV Namespace

```bash
npx wrangler kv:namespace create "RATE_LIMIT_KV"
```

**VOCÊ VAI VER:**
```
✅ Created KV namespace with id "abc123..."

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "abc123def456..."  # ← COPIE!
```

**Atualize wrangler.toml** (linha ~40):
```toml
# Antes:
id = "your-kv-namespace-id"

# Depois:
id = "abc123def456..."  # Seu ID real
```

---

### 7️⃣ Criar Tabelas no Banco

```bash
npx wrangler d1 execute ness_vlm_db --file=schema/d1-schema.sql
```

**Esperado:** `✅ Executed 15+ commands successfully`

**Verificar:**
```bash
npx wrangler d1 execute ness_vlm_db \
  --command="SELECT name FROM sqlite_master WHERE type='table'"
```

Deve retornar: `vulnerabilities`, `status_history`, `assets`

---

### 8️⃣ Configurar Webhook Secret

```bash
# Gerar secret aleatório
WEBHOOK_SECRET=$(openssl rand -hex 32)

# Mostrar e salvar
echo "Seu Webhook Secret: $WEBHOOK_SECRET"
echo "$WEBHOOK_SECRET" > webhook-secret.txt

# Configurar no Cloudflare
echo "$WEBHOOK_SECRET" | npx wrangler secret put WEBHOOK_SECRET --name webhook-receiver
```

**📝 IMPORTANTE:** Guarde o secret! Está em `webhook-secret.txt`

---

### 9️⃣ Desabilitar Jira (Temporário)

Edite `workers/core-processor/index.ts`

**Procure a linha ~150:**
```typescript
// Enfileira para Jira (async, não bloqueia)
ctx.waitUntil(queueForJira(env.JIRA_QUEUE, normalized));
```

**Comente:**
```typescript
// Temporariamente desabilitado - sem Jira
// ctx.waitUntil(queueForJira(env.JIRA_QUEUE, normalized));
```

**Salve o arquivo.**

---

### 🔟 Deploy dos Workers

**ORDEM IMPORTANTE:**

```bash
# 1. Translation Agent (tem Durable Object)
npx wrangler deploy --name translation-agent

# 2. Jira Integration (tem Durable Object)
npx wrangler deploy --name jira-integration

# 3. Core Processor (usa os Durable Objects acima)
npx wrangler deploy --name core-processor

# 4. Webhook Receiver (endpoint público)
npx wrangler deploy --name webhook-receiver
```

**Para cada deploy:**
```
✅ Deployed translation-agent
   https://translation-agent.SEU-SUBDOMINIO.workers.dev
```

**📝 ANOTE AS 4 URLs!**

---

### 1️⃣1️⃣ Atualizar URL do Core Processor

Copie a URL do core-processor e atualize no `wrangler.toml` (linha ~25):

```toml
# Antes:
CORE_PROCESSOR_URL = "https://core-processor.ness-vlm.workers.dev"

# Depois:
CORE_PROCESSOR_URL = "https://core-processor.SEU-SUBDOMINIO.workers.dev"
```

**Re-deploy webhook-receiver:**
```bash
npx wrangler deploy --name webhook-receiver
```

---

### 1️⃣2️⃣ Testar!

```bash
# Ler secret
WEBHOOK_SECRET=$(cat webhook-secret.txt)

# Sua URL (substitua SEU-SUBDOMINIO)
WEBHOOK_URL="https://webhook-receiver.SEU-SUBDOMINIO.workers.dev"

# Payload de teste
PAYLOAD='{"vulnerability_type":"SQL Injection","severity":"HIGH","url":"https://test.com/api","parameter":"id","description":"Test vulnerability","recommendation":"Use prepared statements","tool_name":"Manual Test","asset_name":"Test API","project_id":"test"}'

# Gerar assinatura HMAC
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)

# Enviar!
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

**RESPOSTA ESPERADA:**
```json
{
  "success": true,
  "correlation_key": "abc123def456...",
  "message": "Finding processed successfully"
}
```

---

### 1️⃣3️⃣ Verificar no Banco

```bash
# Ver vulnerabilidade criada
npx wrangler d1 execute ness_vlm_db \
  --command="SELECT vulnerability_type, severity, url_target, status FROM vulnerabilities"
```

**Deve mostrar:** SQL Injection, HIGH, test.com/api, open

---

### 1️⃣4️⃣ Monitorar Logs (Opcional)

```bash
# Logs em tempo real
npx wrangler tail webhook-receiver --format=pretty

# Ou do core processor
npx wrangler tail core-processor --format=pretty
```

---

## ✅ CHECKLIST FINAL

- [ ] `npx wrangler whoami` funciona
- [ ] D1 database criada (ID copiado)
- [ ] database_id atualizado em 3 lugares no wrangler.toml
- [ ] R2 bucket criado
- [ ] KV namespace criado (ID copiado)
- [ ] KV id atualizado no wrangler.toml
- [ ] Schema executado (3 tabelas criadas)
- [ ] Webhook secret configurado (salvo em webhook-secret.txt)
- [ ] Linha Jira comentada no core-processor
- [ ] 4 Workers deployed (URLs anotadas)
- [ ] CORE_PROCESSOR_URL atualizada no wrangler.toml
- [ ] Teste retornou `success: true`
- [ ] Vulnerabilidade aparece no D1

---

## 🎉 PRONTO!

Seu **ness. VLM Tracker** está no ar!

**URLs:**
- Webhook: `https://webhook-receiver.SEU-SUBDOMINIO.workers.dev`
- Secret: arquivo `webhook-secret.txt`

---

## 📊 Limites do Plano ($5/mês)

| Recurso | Incluído Grátis | Depois Custa |
|---------|-----------------|--------------|
| **Workers** | 10M requests/mês | $0.50 por 1M |
| **D1** | 5GB storage | $0.75 por GB |
| **D1 Reads** | 5M reads/dia | Incluído |
| **D1 Writes** | 100k writes/dia | Incluído |
| **R2** | 10GB storage | $0.015 por GB |
| **R2 Egress** | **Ilimitado grátis** | $0.00 sempre! |
| **Workers AI** | 10k neurons/dia | Depois paga |
| **Durable Objects** | 1M requests/mês | $0.15 por 1M |
| **KV** | 100k reads/dia | Incluído |

**Para 10k vulnerabilidades/mês:**
- Workers: ~50k requests → ✅ Dentro
- D1: < 1GB → ✅ Dentro  
- R2: < 1GB → ✅ Dentro
- **Custo extra: $0** 🎉

---

## 🔧 Próximos Passos

### Configurar Ferramenta de Pentest

**URL do Webhook:**
```
https://webhook-receiver.SEU-SUBDOMINIO.workers.dev
```

**Headers obrigatórios:**
```
Content-Type: application/json
X-Webhook-Signature: sha256=<HMAC-SHA256>
```

**Exemplo Python (calcular signature):**
```python
import hmac
import hashlib
import json

secret = "SEU_WEBHOOK_SECRET"  # Do arquivo webhook-secret.txt
payload = {"vulnerability_type": "XSS", ...}
payload_str = json.dumps(payload, separators=(',', ':'))

signature = hmac.new(
    secret.encode(),
    payload_str.encode(),
    hashlib.sha256
).hexdigest()

# Header: X-Webhook-Signature: sha256={signature}
```

---

### Habilitar Jira Depois

Quando quiser habilitar Jira:

```bash
# 1. Descomente a linha no core-processor/index.ts

# 2. Configure secrets
echo "https://empresa.atlassian.net" | npx wrangler secret put JIRA_BASE_URL --name jira-integration
echo "email@empresa.com" | npx wrangler secret put JIRA_USER --name jira-integration
echo "SEU_TOKEN" | npx wrangler secret put JIRA_API_TOKEN --name jira-integration

# 3. Re-deploy
npx wrangler deploy --name core-processor
```

---

## 🐛 Troubleshooting

### Erro: "database_id not found"
→ Verifique as **3 substituições** no wrangler.toml

### Erro: "Unauthorized"  
→ `npx wrangler logout && npx wrangler login`

### Erro: "Invalid signature"
→ Verifique o secret: `cat webhook-secret.txt`

### Worker não responde
→ `npx wrangler tail nome-do-worker`

### Erro ao criar D1
→ Verifique se o plano Paid está ativo no Dashboard

---

## 📝 Resumo de Comandos

```bash
# Setup inicial (uma vez)
cd /home/resper/ness-vlm-cloudflare
npm install
npx wrangler login

# Criar recursos (uma vez)
npx wrangler d1 create ness_vlm_db
npx wrangler r2 bucket create ness-vlm-storage
npx wrangler kv:namespace create "RATE_LIMIT_KV"

# Configurar (uma vez)
# → Editar wrangler.toml com os IDs
# → Executar schema
# → Configurar secrets
# → Comentar linha Jira

# Deploy (sempre que atualizar)
npx wrangler deploy --name translation-agent
npx wrangler deploy --name jira-integration
npx wrangler deploy --name core-processor
npx wrangler deploy --name webhook-receiver

# Monitorar
npx wrangler tail webhook-receiver
npx wrangler d1 execute ness_vlm_db --command="SELECT * FROM vulnerabilities"
```

---

**IMPORTANTE:** 
- ❌ Você NÃO precisa de "Workers for Platforms"
- ❌ Você NÃO precisa de "Dispatch Namespaces"
- ✅ Apenas Workers + D1 + R2 + KV (que você já tem!)

**Suporte:** security@ness.com
