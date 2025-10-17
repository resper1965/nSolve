# 🌐 Configuração do Domínio ness.tec.br

## 📋 Visão Geral

Você vai configurar subdomínios no **ness.tec.br** para o VLM Tracker:

| Subdomínio | Função | Worker |
|------------|--------|--------|
| **webhooks.ness.tec.br** | Recebe webhooks de ferramentas | webhook-receiver |
| **api.ness.tec.br** | Processa vulnerabilidades | core-processor |

---

## ✅ Pré-requisito

**O domínio ness.tec.br DEVE estar no Cloudflare:**

1. Acesse: https://dash.cloudflare.com
2. Clique em "Add a Site"
3. Digite: `ness.tec.br`
4. Escolha plano Free (suficiente)
5. Cloudflare vai mostrar os nameservers
6. **Atualize os nameservers no registro.br** (onde você registrou o domínio)

**Nameservers Cloudflare (exemplo):**
```
luna.ns.cloudflare.com
otto.ns.cloudflare.com
```

⏱️ **Propagação DNS:** 5 minutos a 24 horas

---

## 🚀 Opção 1: Configuração Automática (Via Dashboard)

### Passo 1: Deploy dos Workers (sem domínio primeiro)

```bash
cd /home/resper/ness-vlm-cloudflare

# Deploy inicial (vai usar .workers.dev)
npx wrangler deploy --name webhook-receiver
npx wrangler deploy --name core-processor
npx wrangler deploy --name translation-agent
npx wrangler deploy --name jira-integration
```

### Passo 2: Adicionar Domínios Customizados

**Para webhook-receiver:**

1. Acesse: https://dash.cloudflare.com
2. Workers & Pages → webhook-receiver
3. Settings → Triggers → Custom Domains
4. Clique em "Add Custom Domain"
5. Digite: `webhooks.ness.tec.br`
6. Clique em "Add Custom Domain"

✅ Pronto! DNS é criado automaticamente.

**Para core-processor:**

1. Workers & Pages → core-processor
2. Settings → Triggers → Custom Domains
3. Add: `api.ness.tec.br`

---

## 🚀 Opção 2: Configuração Via Código (wrangler.toml)

### Passo 1: Usar o wrangler.toml com domínios

```bash
# Substituir o wrangler.toml atual
cp wrangler-with-domain.toml wrangler.toml
```

### Passo 2: Atualizar IDs

Edite `wrangler.toml` e atualize:
- `database_id` (3 lugares)
- `kv_namespace id` (1 lugar)

### Passo 3: Deploy

```bash
npx wrangler deploy --name webhook-receiver
npx wrangler deploy --name core-processor
```

⚠️ **IMPORTANTE:** Se o domínio ainda não estiver no Cloudflare, você verá erro:
```
Error: Could not find zone for ness.tec.br
```

**Solução:** Adicione o domínio no Cloudflare primeiro (Opção 1, depois volte aqui).

---

## 🧪 Testar Domínio

### Verificar DNS

```bash
# Ver se o DNS foi criado
dig webhooks.ness.tec.br
dig api.ness.tec.br

# Ou use nslookup
nslookup webhooks.ness.tec.br
```

### Testar Webhook

```bash
# Gerar signature
WEBHOOK_SECRET=$(cat webhook-secret.txt)
PAYLOAD='{"vulnerability_type":"XSS","severity":"HIGH","url":"https://test.com","parameter":"q"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)

# Testar com domínio customizado
curl -X POST https://webhooks.ness.tec.br/ \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

**Esperado:**
```json
{
  "success": true,
  "correlation_key": "...",
  "message": "Finding processed successfully"
}
```

---

## 📝 URLs Finais

Após configurar tudo:

| Serviço | URL | Uso |
|---------|-----|-----|
| **Webhook** | `https://webhooks.ness.tec.br` | Ferramentas de pentest |
| **API** | `https://api.ness.tec.br` | Processamento interno |
| **Dashboard** | (futuro) `https://dashboard.ness.tec.br` | Interface web |

---

## 🔒 SSL/TLS

✅ **Automático!** Cloudflare gera certificado SSL grátis para todos os subdomínios.

Você pode verificar em:
- Dashboard → ness.tec.br → SSL/TLS
- Mode: "Full" ou "Full (strict)" (recomendado)

---

## 🔧 Atualizar Variáveis de Ambiente

Depois de configurar os domínios, atualize no código:

**wrangler.toml** (linha ~25):
```toml
[workers.vars]
CORE_PROCESSOR_URL = "https://api.ness.tec.br"
```

**Re-deploy:**
```bash
npx wrangler deploy --name webhook-receiver
```

---

## 📋 Checklist de Domínio

- [ ] ness.tec.br adicionado no Cloudflare
- [ ] Nameservers atualizados no registro.br
- [ ] DNS propagado (teste com `dig`)
- [ ] Workers deployed
- [ ] webhooks.ness.tec.br adicionado como Custom Domain
- [ ] api.ness.tec.br adicionado como Custom Domain
- [ ] CORE_PROCESSOR_URL atualizada para api.ness.tec.br
- [ ] Teste de webhook bem-sucedido
- [ ] SSL ativo (cadeado verde no navegador)

---

## 🐛 Troubleshooting

### Erro: "Could not find zone"
→ Adicione ness.tec.br no Cloudflare primeiro

### DNS não resolve
→ Aguarde propagação (até 24h)
→ Verifique nameservers no registro.br

### SSL não funciona
→ Cloudflare → SSL/TLS → Mode: "Full"
→ Aguarde alguns minutos

### "Too many redirects"
→ SSL/TLS mode em "Flexible" ou "Full"

---

## 📊 Vantagens do Domínio Customizado

✅ **Profissional:** webhooks.ness.tec.br vs webhook-xyz.workers.dev
✅ **Branding:** Sua marca, seu domínio
✅ **SSL Grátis:** Certificados automáticos
✅ **Estável:** URL não muda nunca
✅ **Multi-ambiente:** dev.ness.tec.br, staging.ness.tec.br, etc

---

## 🎯 Configuração Recomendada

```
ness.tec.br (domínio principal)
├── webhooks.ness.tec.br    → webhook-receiver
├── api.ness.tec.br          → core-processor
├── dashboard.ness.tec.br    → frontend (futuro)
├── docs.ness.tec.br         → documentação (futuro)
└── status.ness.tec.br       → status page (futuro)
```

---

## 📞 Suporte

**Cloudflare Support:**
- Docs: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Community: https://community.cloudflare.com

**ness. Support:**
- Email: security@ness.com
