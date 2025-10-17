#!/bin/bash

# n.Solve - Teste de Todos os Workers
# Script para testar todos os 4 Workers

echo "🧪 n.Solve - Teste de Todos os Workers"
echo "====================================="
echo ""

# Função para testar endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    
    echo "🔍 Testando $name..."
    echo "   URL: $url"
    echo "   Method: $method"
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        response=$(curl -s -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "\nHTTP_CODE:%{http_code}")
    else
        response=$(curl -s "$url" -w "\nHTTP_CODE:%{http_code}")
    fi
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo "   ✅ Status: $http_code"
        echo "   📄 Response: $body"
    else
        echo "   ❌ Status: $http_code"
        echo "   📄 Response: $body"
    fi
    echo ""
}

# Teste 1: Webhook Receiver
test_endpoint "Webhook Receiver" \
    "https://webhook-receiver.workers.dev/webhook" \
    "POST" \
    '{"test": "data", "source": "manual_test"}'

# Teste 2: Core Processor Health
test_endpoint "Core Processor Health" \
    "https://core-processor.workers.dev/health"

# Teste 3: Translation Agent Health
test_endpoint "Translation Agent Health" \
    "https://translation-agent.workers.dev/health"

# Teste 4: Jira Integration Health
test_endpoint "Jira Integration Health" \
    "https://jira-integration.workers.dev/health"

# Teste 5: Core Processor Process
test_endpoint "Core Processor Process" \
    "https://core-processor.workers.dev/process" \
    "POST" \
    '{
        "correlation_key": "vlm_2024_test_'$(date +%s)'",
        "vulnerability": {
            "title": "Test Vulnerability",
            "description": "Test description",
            "severity": "medium"
        }
    }'

# Teste 6: Translation Agent Translate
test_endpoint "Translation Agent Translate" \
    "https://translation-agent.workers.dev/translate" \
    "POST" \
    '{
        "correlation_key": "vlm_2024_test_'$(date +%s)'",
        "language": "pt-BR",
        "text": "SQL Injection vulnerability"
    }'

echo "🎯 Testes concluídos!"
echo ""
echo "📊 Resumo dos testes:"
echo "   - Webhook Receiver: Teste de recebimento"
echo "   - Core Processor: Health + Processamento"
echo "   - Translation Agent: Health + Tradução"
echo "   - Jira Integration: Health"
echo ""
echo "🔍 Para logs em tempo real:"
echo "   npm run tail:webhook"
echo "   npm run tail:core"
echo "   npm run tail:translation"
echo "   npm run tail:jira"
