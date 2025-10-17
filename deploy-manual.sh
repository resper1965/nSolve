#!/bin/bash

# n.Solve - Deploy Manual (Solução GitHub Auth)
# Contorna problema de autenticação GitHub no Cloudflare

echo "🚀 n.Solve - Deploy Manual"
echo "=========================="
echo ""

# Verificar se Wrangler está instalado
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler não encontrado. Instalando..."
    npm install -g wrangler
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao instalar Wrangler"
        exit 1
    fi
fi

# Verificar autenticação
echo "🔐 Verificando autenticação..."
wrangler whoami
if [ $? -ne 0 ]; then
    echo "❌ Não autenticado. Execute: wrangler auth login"
    exit 1
fi

echo ""
echo "🔧 Iniciando deploy manual dos 4 Workers..."
echo ""

# Deploy Webhook Receiver
echo "📡 Deploying webhook-receiver..."
wrangler deploy workers/webhook-receiver/index.ts --name webhook-receiver
if [ $? -ne 0 ]; then
    echo "❌ Erro no deploy do webhook-receiver"
    exit 1
fi

# Deploy Core Processor  
echo "⚙️ Deploying core-processor..."
wrangler deploy workers/core-processor/index.ts --name core-processor
if [ $? -ne 0 ]; then
    echo "❌ Erro no deploy do core-processor"
    exit 1
fi

# Deploy Translation Agent
echo "🌐 Deploying translation-agent..."
wrangler deploy workers/translation-agent/index.ts --name translation-agent
if [ $? -ne 0 ]; then
    echo "❌ Erro no deploy do translation-agent"
    exit 1
fi

# Deploy Jira Integration
echo "🎫 Deploying jira-integration..."
wrangler deploy workers/jira-integration/index.ts --name jira-integration
if [ $? -ne 0 ]; then
    echo "❌ Erro no deploy do jira-integration"
    exit 1
fi

echo ""
echo "✅ Deploy manual concluído com sucesso!"
echo "🎯 n.Solve está online!"
echo ""
echo "📊 Workers deployados:"
echo "   - webhook-receiver.workers.dev"
echo "   - core-processor.workers.dev"
echo "   - translation-agent.workers.dev"
echo "   - jira-integration.workers.dev"
echo ""
echo "🔑 Próximos passos:"
echo "   1. Configurar secrets (WEBHOOK_SECRET, JIRA_TOKEN, etc.)"
echo "   2. Inicializar D1 Database com schema"
echo "   3. Configurar domínio ness.tec.br"
echo "   4. Testar Workers funcionando"
