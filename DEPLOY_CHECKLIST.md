# ✅ Checklist de Deploy - ness. VLM Tracker Cloudflare

## 📋 PRÉ-REQUISITOS

### 1. Conta Cloudflare
- [ ] Conta Cloudflare criada
- [ ] Workers Paid Plan ativado ($5/mês)
- [ ] Cartão de crédito cadastrado

**Como ativar:**
1. Acesse: https://dash.cloudflare.com
2. Workers & Pages → Planos
3. Upgrade para Workers Paid ($5/mês)

---

### 2. Credenciais Jira
- [ ] Jira Base URL anotada
- [ ] Email do usuário Jira anotado
- [ ] API Token do Jira criado

**Como criar API Token:**
1. Acesse: https://id.atlassian.com/manage-profile/security/api-tokens
2. Clique em "Create API token"
3. Dê um nome: "ness VLM Tracker"
4. Copie o token (só aparece uma vez!)

---

### 3. Ferramentas Instaladas
- [ ] Node.js 18+ instalado
- [ ] npm funcionando
- [ ] Git instalado (opcional)

**Verificar versões:**
```bash
node --version  # Deve ser >= 18
npm --version
```

---

## 🚀 PASSO A PASSO DO DEPLOY

### Passo 1: Instalar Dependências
```bash
cd /home/resper/ness-vlm-cloudflare
npm install
```

**Esperado:** Instalação sem erros, criação de `node_modules/`

---

### Passo 2: Login no Cloudflare
```bash
npx wrangler login
```

**O que acontece:**
1. Abre o navegador
2. Você faz login na Cloudflare
3. Autoriza o Wrangler
4. Terminal confirma autenticação

**Verificar login:**
```bash
npx wrangler whoami
```

---

### Passo 3: Criar D1 Database
```bash
npx wrangler d1 create ness_vlm_db
```

**Importante:** Copie o `database_id` que aparece!

Exemplo de output:
```
✅ Successfully created DB 'ness_vlm_db'

[[d1_databases]]
binding = "DB"
database_name = "ness_vlm_db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← COPIE ISTO!
```

---

### Passo 4: Atualizar wrangler.toml

Edite o arquivo `wrangler.toml` e substitua os `database_id`:

```toml
# Procure por:
database_id = "your-d1-database-id"

# Substitua por:
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # O ID que você copiou
```

**Quantas vezes?** 3 vezes (core-processor, translation-agent, jira-integration)

---

### Passo 5: Criar R2 Bucket
```bash
npx wrangler r2 bucket create ness-vlm-storage
```

**Esperado:** Bucket criado com sucesso

---

### Passo 6: Criar KV Namespace (Rate Limiting)
```bash
npx wrangler kv:namespace create "RATE_LIMIT_KV"
```

**Copie o `id` retornado** e atualize em `wrangler.toml`:

```toml
[[workers.kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # ← Cole aqui
```

---

### Passo 7: Executar Schema D1
```bash
npx wrangler d1 execute ness_vlm_db --file=schema/d1-schema.sql
```

**Esperado:** Tabelas, índices e views criadas

**Verificar:**
```bash
npx wrangler d1 execute ness_vlm_db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

Deve retornar: `vulnerabilities`, `status_history`, `assets`

---

### Passo 8: Configurar Secrets

Execute o script interativo:
```bash
./scripts/setup-secrets.sh
```

**Ou configure manualmente:**

```bash
# 1. Webhook Secret (gerar aleatório)
echo $(openssl rand -hex 32) | npx wrangler secret put WEBHOOK_SECRET --name webhook-receiver

# 2. Jira Base URL
echo "https://sua-empresa.atlassian.net" | npx wrangler secret put JIRA_BASE_URL --name jira-integration

# 3. Jira User
echo "security@sua-empresa.com" | npx wrangler secret put JIRA_USER --name jira-integration

# 4. Jira API Token
echo "SEU_TOKEN_AQUI" | npx wrangler secret put JIRA_API_TOKEN --name jira-integration
```

---

### Passo 9: Deploy dos Workers

**Opção A: Deploy completo automatizado**
```bash
./scripts/deploy.sh
```

**Opção B: Deploy manual (um por um)**
```bash
# 1. Webhook Receiver
npx wrangler deploy workers/webhook-receiver/index.ts --name webhook-receiver

# 2. Translation Agent (com Durable Object)
npx wrangler deploy workers/translation-agent/index.ts --name translation-agent

# 3. Jira Integration (com Durable Object)
npx wrangler deploy workers/jira-integration/index.ts --name jira-integration

# 4. Core Processor (depende dos outros)
npx wrangler deploy workers/core-processor/index.ts --name core-processor
```

**Esperado:** Cada deploy mostra a URL do Worker

---

### Passo 10: Anotar URLs

Após o deploy, você receberá URLs como:

```
✅ webhook-receiver
   https://webhook-receiver.SEU-SUBDOMINIO.workers.dev

✅ core-processor
   https://core-processor.SEU-SUBDOMINIO.workers.dev

✅ translation-agent
   https://translation-agent.SEU-SUBDOMINIO.workers.dev

✅ jira-integration
   https://jira-integration.SEU-SUBDOMINIO.workers.dev
```

**Atualize wrangler.toml:**
```toml
[workers.vars]
CORE_PROCESSOR_URL = "https://core-processor.SEU-SUBDOMINIO.workers.dev"
```

---

### Passo 11: Testar o Deploy

```bash
# Obter o webhook secret
npx wrangler secret list --name webhook-receiver

# Testar webhook (substitua URL e SECRET)
curl -X POST https://webhook-receiver.SEU-SUBDOMINIO.workers.dev \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$(echo -n '{"test":true}' | openssl dgst -sha256 -hmac 'SEU_SECRET' | cut -d' ' -f2)" \
  -d '{
    "vulnerability_type": "Cross-Site Scripting (XSS)",
    "severity": "HIGH",
    "url": "https://test.example.com/search",
    "parameter": "q",
    "description": "Test vulnerability for deployment",
    "recommendation": "Sanitize user input",
    "tool_name": "Manual Test",
    "asset_name": "Test API",
    "project_id": "test-project"
  }'
```

**Esperado:**
```json
{
  "success": true,
  "correlation_key": "abc123...",
  "message": "Finding processed successfully"
}
```

---

### Passo 12: Verificar Dados no D1

```bash
# Ver achados criados
npx wrangler d1 execute ness_vlm_db \
  --command="SELECT * FROM vulnerabilities ORDER BY created_at DESC LIMIT 5"

# Ver status de tradução
npx wrangler d1 execute ness_vlm_db \
  --command="SELECT correlation_key, recommendation_translated FROM vulnerabilities WHERE recommendation_translated IS NOT NULL"

# Ver tickets Jira
npx wrangler d1 execute ness_vlm_db \
  --command="SELECT correlation_key, jira_ticket_key FROM vulnerabilities WHERE jira_ticket_key IS NOT NULL"
```

---

### Passo 13: Monitorar Logs

```bash
# Logs do Webhook Receiver
npx wrangler tail webhook-receiver --format=pretty

# Logs do Core Processor
npx wrangler tail core-processor --format=pretty

# Logs em tempo real (abre em nova aba)
npx wrangler tail webhook-receiver --format=json | jq
```

---

## 🔧 CONFIGURAÇÕES OPCIONAIS

### Domínio Customizado

Se você tem um domínio na Cloudflare:

1. Dashboard Cloudflare → Workers & Pages
2. Selecione o worker
3. Settings → Triggers → Add Custom Domain
4. Adicione: `webhooks.vlm-tracker.seu-dominio.com`

Atualize `wrangler.toml`:
```toml
[[workers.routes]]
pattern = "webhooks.vlm-tracker.seu-dominio.com/*"
zone_name = "seu-dominio.com"
```

---

### Configurar Ferramentas de Pentest

Depois do deploy, configure suas ferramentas para enviar webhooks:

**URL do Webhook:**
```
https://webhook-receiver.SEU-SUBDOMINIO.workers.dev
```

**Headers obrigatórios:**
- `Content-Type: application/json`
- `X-Webhook-Signature: sha256=<hash>`

**Como gerar signature:**
```bash
echo -n '{"seu":"payload"}' | openssl dgst -sha256 -hmac 'SEU_WEBHOOK_SECRET'
```

---

## 🐛 TROUBLESHOOTING

### Erro: "Unauthorized"
**Solução:** Refaça o login
```bash
npx wrangler logout
npx wrangler login
```

### Erro: "Database not found"
**Solução:** Verifique o `database_id` no `wrangler.toml`

### Erro: "Secret not found"
**Solução:** Configure o secret novamente
```bash
npx wrangler secret put NOME_DO_SECRET --name nome-do-worker
```

### Worker não responde
**Solução:** Veja os logs
```bash
npx wrangler tail nome-do-worker
```

### Tradução não funciona
**Solução:** Workers AI precisa do plano pago ativado

---

## 📊 CUSTOS ESPERADOS

| Serviço | Uso Estimado (10k vulns/mês) | Custo |
|---------|-------------------------------|-------|
| Workers Paid Plan | Base | $5.00 |
| Workers (100k req) | Incluído | $0.00 |
| D1 (1M reads, 100k writes) | Incluído | $0.00 |
| Durable Objects (1M req) | Incluído no primeiro 1M | $0.00 |
| R2 (100GB storage) | $0.015/GB | $1.50 |
| Workers AI (1M tokens) | $0.01/1k tokens | $10.00 |
| **Total** | | **~$17/mês** |

**Nota:** Valores podem variar. Monitore no Dashboard.

---

## ✅ CHECKLIST FINAL

Após completar tudo acima:

- [ ] Todos os Workers deployed
- [ ] D1 database criada e populada
- [ ] R2 bucket criado
- [ ] Secrets configurados
- [ ] Teste de webhook bem-sucedido
- [ ] Dados aparecendo no D1
- [ ] Tradução funcionando (se aplicável)
- [ ] Ticket Jira criado (se aplicável)
- [ ] Logs monitorados
- [ ] URLs documentadas

---

## 🎉 PRONTO!

Seu **ness. VLM Tracker** está rodando no Edge da Cloudflare!

**Próximos passos:**
1. Configure suas ferramentas de pentest
2. Configure domínio customizado (opcional)
3. Configure alertas no Dashboard Cloudflare
4. Implemente monitoring adicional

---

**Suporte:** security@ness.com
**Docs:** https://docs.ness.com/vlm-tracker-cloudflare
