#!/bin/bash

# n.Solve - Criar Registros DNS via Cloudflare API
# Cria CNAMEs para os Workers

echo "🌐 n.Solve - Criar Registros DNS"
echo "================================"

# Configuração
ZONE_ID="your-zone-id"  # ID da zona ness.tec.br
API_TOKEN="your-api-token"  # Seu Cloudflare API Token
ZONE_NAME="ness.tec.br"

# Função para criar CNAME
create_cname() {
    local name=$1
    local target=$2
    
    echo "📡 Criando CNAME: $name.$ZONE_NAME → $target"
    
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{
            "type": "CNAME",
            "name": "'$name'",
            "content": "'$target'",
            "ttl": 1,
            "proxied": true
        }'
    
    echo ""
}

# Criar CNAMEs para os 5 Workers
create_cname "auth" "auth-service.ness.workers.dev"
create_cname "webhooks" "webhook-receiver.ness.workers.dev"
create_cname "api" "core-processor.ness.workers.dev"
create_cname "translate" "translation-agent.ness.workers.dev"
create_cname "jira" "jira-integration.ness.workers.dev"

echo "✅ CNAMEs criados!"

