# ⚡ Deploy Rápido - ness.tec.br JÁ está na Cloudflare!

## ✅ Pré-requisito OK!

O domínio **ness.tec.br** já está na Cloudflare = você pode fazer deploy AGORA!

---

## 🚀 Deploy em 2 Comandos (2-3 minutos)

### Passo 1: Login no Cloudflare

```bash
cd /home/resper/ness-vlm-cloudflare
npx wrangler login
```

**Use a conta:** resper@ness.com.br

---

### Passo 2: Deploy Automático

```bash
./deploy-auto.sh
```

**O script faz tudo:**
- ✅ Cria D1 Database (captura ID)
- ✅ Cria R2 Bucket
- ✅ Cria KV Namespace (captura ID)
- ✅ Atualiza wrangler.toml automaticamente
- ✅ Executa schema SQL (3 tabelas)
- ✅ Gera webhook secret
- ✅ Deploy de 4 Workers
- ✅ Testa automaticamente
- ✅ Salva todas as URLs

**Tempo:** ~2 minutos ⏱️

---

## 📝 Você Vai Receber:

No final do script:

```
✅ Deploy concluído!

📊 Recursos Criados:
  • D1 Database: ness_vlm_db
  • R2 Bucket: ness-vlm-storage
  • KV Namespace: RATE_LIMIT_KV

🚀 Workers Deployed:
  1. webhook-receiver → https://webhook-receiver.resper.workers.dev
  2. core-processor   → https://core-processor.resper.workers.dev
  3. translation-agent → https://translation-agent.resper.workers.dev
  4. jira-integration → https://jira-integration.resper.workers.dev

🔐 Secrets:
  • WEBHOOK_SECRET → Salvo em: webhook-secret.txt

📝 URLs salvas em: deployment-urls.txt
```

---

## 🌐 Passo 3: Configurar Custom Domains (2 minutos)

**Como ness.tec.br JÁ ESTÁ na Cloudflare, isso é super rápido!**

### No Dashboard Cloudflare:

1. Acesse: https://dash.cloudflare.com
2. Login: **resper@ness.com.br**

**Para webhook-receiver:**

3. **Workers & Pages** → **webhook-receiver**
4. **Settings** → **Triggers** → **Custom Domains**
5. Clique **"Add Custom Domain"**
6. Digite: **webhooks.ness.tec.br**
7. Clique **"Add Domain"**

✅ **Pronto!** DNS criado automaticamente em ~30 segundos.

**Para core-processor:**

8. **Workers & Pages** → **core-processor**
9. **Settings** → **Triggers** → **Custom Domains**
10. Digite: **api.ness.tec.br**
11. **"Add Domain"**

✅ **Pronto!** Seus workers estão nos domínios customizados!

---

## 🧪 Passo 4: Testar (1 minuto)

```bash
# Ler o webhook secret
WEBHOOK_SECRET=$(cat webhook-secret.txt)

# Testar com domínio customizado
PAYLOAD='{"vulnerability_type":"SQL Injection","severity":"CRITICAL","url":"https://test.ness.tec.br/api","parameter":"id"}'

SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)

curl -X POST https://webhooks.ness.tec.br/ \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
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

## ✅ PRONTO!

Seu **ness. VLM Tracker** está funcionando em:

- 🌐 **https://webhooks.ness.tec.br** ← Endpoint público
- 🌐 **https://api.ness.tec.br** ← API interna
- 🔒 **SSL automático**
- ⚡ **Edge Computing global** (300+ POPs)

---

## 📊 Tempo Total:

| Etapa | Tempo |
|-------|-------|
| Login | 30s |
| Deploy automático | 2 min |
| Custom domains | 2 min |
| Teste | 30s |
| **TOTAL** | **~5 minutos** ⚡ |

---

## 🎯 Resumo dos 3 Comandos:

```bash
# 1. Login
cd /home/resper/ness-vlm-cloudflare
npx wrangler login    # Use: resper@ness.com.br

# 2. Deploy automático
./deploy-auto.sh      # Aguarde 2-3 minutos

# 3. Adicionar domínios (via Dashboard)
# webhooks.ness.tec.br → webhook-receiver
# api.ness.tec.br → core-processor
```

**E PRONTO!** 🎉

---

## 💰 Custo Final:

```
Plano Workers:  $5/mês
Extras:         $0 (tudo incluído para 10k vulns/mês)
───────────────────────
TOTAL:          $5/mês
```

**Economia vs GCP:** $190/mês 🎉

---

## 📞 Suporte:

- Email: security@ness.com  
- Conta: resper@ness.com.br
- Dashboard: https://dash.cloudflare.com

---

**Desenvolvido pela ness. | Powered by Cloudflare**
