# n.Solve - Configuração de Domínio ness.tec.br

## 🌐 Configuração de Domínio

### 1️⃣ **Verificar Domínio no Cloudflare**

```bash
# Verificar se domínio está no Cloudflare
wrangler whoami
# Deve mostrar sua conta Cloudflare
```

### 2️⃣ **Configurar DNS**

No Cloudflare Dashboard:
1. Acesse **DNS** → **Records**
2. Adicione os seguintes registros:

```
Tipo: CNAME
Nome: webhooks
Conteúdo: webhook-receiver.workers.dev
Proxy: ✅ (Laranja)

Tipo: CNAME  
Nome: api
Conteúdo: core-processor.workers.dev
Proxy: ✅ (Laranja)

Tipo: CNAME
Nome: translate
Conteúdo: translation-agent.workers.dev
Proxy: ✅ (Laranja)

Tipo: CNAME
Nome: jira
Conteúdo: jira-integration.workers.dev
Proxy: ✅ (Laranja)
```

### 3️⃣ **Configurar Routes no wrangler.toml**

```toml
# Routes (custom domains)
routes = [
  "webhooks.ness.tec.br/*",
  "api.ness.tec.br/*",
  "translate.ness.tec.br/*",
  "jira.ness.tec.br/*"
]
```

### 4️⃣ **Deploy com Domínio**

```bash
# Deploy com rotas customizadas
npm run deploy:manual
```

## 🚀 Script de Configuração de Domínio

```bash
#!/bin/bash
# setup-domain.sh

echo "🌐 n.Solve - Configuração de Domínio"
echo "===================================="

# Verificar se domínio está no Cloudflare
echo "🔍 Verificando domínio ness.tec.br..."
wrangler whoami

# Configurar DNS (manual)
echo "📋 Configure os seguintes registros DNS:"
echo ""
echo "Tipo: CNAME | Nome: webhooks | Conteúdo: webhook-receiver.workers.dev"
echo "Tipo: CNAME | Nome: api | Conteúdo: core-processor.workers.dev"
echo "Tipo: CNAME | Nome: translate | Conteúdo: translation-agent.workers.dev"
echo "Tipo: CNAME | Nome: jira | Conteúdo: jira-integration.workers.dev"
echo ""

# Deploy com domínio
echo "🚀 Deploying com domínio customizado..."
npm run deploy:manual

echo "✅ Domínio configurado!"
```

## 🎯 URLs Finais

Após configuração:
- **Webhook Receiver**: `https://webhooks.ness.tec.br`
- **Core Processor**: `https://api.ness.tec.br`
- **Translation Agent**: `https://translate.ness.tec.br`
- **Jira Integration**: `https://jira.ness.tec.br`

## 🔧 Comandos de Teste

```bash
# Testar webhook receiver
curl -X POST https://webhooks.ness.tec.br/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Testar core processor
curl https://api.ness.tec.br/health

# Testar translation agent
curl https://translate.ness.tec.br/health

# Testar jira integration
curl https://jira.ness.tec.br/health
```

## ✅ Checklist Final

- [ ] Domínio ness.tec.br no Cloudflare
- [ ] DNS configurado (4 registros CNAME)
- [ ] Workers deployados
- [ ] Secrets configurados
- [ ] D1 Database inicializado
- [ ] Rotas funcionando
- [ ] Testes de conectividade OK

## 🎯 n.Solve está online!
