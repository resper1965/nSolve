# n.Solve - Guia de Testes

## 🧪 Testes dos 4 Workers

### 1️⃣ **Webhook Receiver** (`webhook-receiver`)

```bash
# Teste básico
curl -X POST https://webhook-receiver.workers.dev/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data", "source": "manual"}'

# Teste com HMAC (se configurado)
curl -X POST https://webhook-receiver.workers.dev/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=..." \
  -d '{"vulnerability": {"title": "Test Vuln", "severity": "high"}}'
```

**Resposta esperada:**
```json
{
  "status": "success",
  "message": "Webhook received",
  "correlation_key": "vlm_2024_..."
}
```

### 2️⃣ **Core Processor** (`core-processor`)

```bash
# Health check
curl https://core-processor.workers.dev/health

# Processar vulnerabilidade
curl -X POST https://core-processor.workers.dev/process \
  -H "Content-Type: application/json" \
  -d '{
    "correlation_key": "vlm_2024_test123",
    "vulnerability": {
      "title": "SQL Injection",
      "description": "Vulnerability description",
      "severity": "high"
    }
  }'
```

**Resposta esperada:**
```json
{
  "status": "success",
  "correlation_key": "vlm_2024_test123",
  "processed": true
}
```

### 3️⃣ **Translation Agent** (`translation-agent`)

```bash
# Health check
curl https://translation-agent.workers.dev/health

# Traduzir vulnerabilidade
curl -X POST https://translation-agent.workers.dev/translate \
  -H "Content-Type: application/json" \
  -d '{
    "correlation_key": "vlm_2024_test123",
    "language": "pt-BR",
    "text": "SQL Injection vulnerability"
  }'
```

**Resposta esperada:**
```json
{
  "status": "success",
  "correlation_key": "vlm_2024_test123",
  "translation": "Vulnerabilidade de Injeção SQL",
  "language": "pt-BR"
}
```

### 4️⃣ **Jira Integration** (`jira-integration`)

```bash
# Health check
curl https://jira-integration.workers.dev/health

# Criar issue no Jira
curl -X POST https://jira-integration.workers.dev/create-issue \
  -H "Content-Type: application/json" \
  -d '{
    "correlation_key": "vlm_2024_test123",
    "vulnerability": {
      "title": "SQL Injection",
      "severity": "high"
    }
  }'
```

**Resposta esperada:**
```json
{
  "status": "success",
  "correlation_key": "vlm_2024_test123",
  "jira_key": "VLM-123",
  "jira_url": "https://ness.atlassian.net/browse/VLM-123"
}
```

## 🚀 Script de Teste Automático

```bash
#!/bin/bash
# test-all.sh

echo "🧪 n.Solve - Teste de Todos os Workers"
echo "====================================="

# Teste Webhook Receiver
echo "📡 Testando webhook-receiver..."
curl -X POST https://webhook-receiver.workers.dev/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -w "\nStatus: %{http_code}\n\n"

# Teste Core Processor
echo "⚙️ Testando core-processor..."
curl https://core-processor.workers.dev/health \
  -w "\nStatus: %{http_code}\n\n"

# Teste Translation Agent
echo "🌐 Testando translation-agent..."
curl https://translation-agent.workers.dev/health \
  -w "\nStatus: %{http_code}\n\n"

# Teste Jira Integration
echo "🎫 Testando jira-integration..."
curl https://jira-integration.workers.dev/health \
  -w "\nStatus: %{http_code}\n\n"

echo "✅ Testes concluídos!"
```

## 🔍 Monitoramento

```bash
# Logs em tempo real
npm run tail:webhook
npm run tail:core
npm run tail:translation
npm run tail:jira

# Status dos Workers
wrangler whoami
wrangler d1 list
```

## ✅ Checklist de Testes

- [ ] Webhook Receiver responde
- [ ] Core Processor processa dados
- [ ] Translation Agent traduz texto
- [ ] Jira Integration cria issues
- [ ] D1 Database armazena dados
- [ ] Logs funcionando
- [ ] Domínio customizado OK

## 🎯 n.Solve está funcionando!
