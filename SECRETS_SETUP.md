# n.Solve - Configuração de Secrets

## 🔑 Secrets Necessários

### 1️⃣ **WEBHOOK_SECRET**
```bash
# Gerar secret para validação HMAC
wrangler secret put WEBHOOK_SECRET --name webhook-receiver
# Valor: [sua-chave-secreta-aqui]
```

### 2️⃣ **JIRA_TOKEN**
```bash
# Token de autenticação Jira
wrangler secret put JIRA_TOKEN --name jira-integration
# Valor: [seu-token-jira-aqui]
```

### 3️⃣ **JIRA_URL**
```bash
# URL base do Jira
wrangler secret put JIRA_URL --name jira-integration
# Valor: https://sua-empresa.atlassian.net
```

### 4️⃣ **JIRA_EMAIL**
```bash
# Email do usuário Jira
wrangler secret put JIRA_EMAIL --name jira-integration
# Valor: seu-email@empresa.com
```

### 5️⃣ **TRANSLATION_API_KEY** (Opcional)
```bash
# Chave da API de tradução (se não usar Workers AI)
wrangler secret put TRANSLATION_API_KEY --name translation-agent
# Valor: [sua-chave-api-traducao]
```

## 🚀 Script de Configuração Automática

```bash
#!/bin/bash
# setup-secrets.sh

echo "🔑 n.Solve - Configuração de Secrets"
echo "===================================="

# WEBHOOK_SECRET
echo "📡 Configurando WEBHOOK_SECRET..."
wrangler secret put WEBHOOK_SECRET --name webhook-receiver

# JIRA_TOKEN
echo "🎫 Configurando JIRA_TOKEN..."
wrangler secret put JIRA_TOKEN --name jira-integration

# JIRA_URL
echo "🌐 Configurando JIRA_URL..."
wrangler secret put JIRA_URL --name jira-integration

# JIRA_EMAIL
echo "📧 Configurando JIRA_EMAIL..."
wrangler secret put JIRA_EMAIL --name jira-integration

echo "✅ Secrets configurados com sucesso!"
```

## 🔐 Valores de Exemplo

### WEBHOOK_SECRET
```
vlm_webhook_2024_ness_secure_key_xyz789
```

### JIRA_TOKEN
```
ATATT3xFfGF0... (token Jira real)
```

### JIRA_URL
```
https://ness.atlassian.net
```

### JIRA_EMAIL
```
security@ness.com
```

## ⚠️ Importante

1. **Nunca commite secrets** no Git
2. **Use valores reais** de produção
3. **Teste a conectividade** após configurar
4. **Mantenha backups** dos secrets

## 🎯 Próximo Passo

Após configurar os secrets, execute:
```bash
npm run db:init  # Inicializar D1 Database
```
