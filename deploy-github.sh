#!/bin/bash

# n.Solve - Deploy Script para GitHub Actions
# Script específico para GitHub Actions

echo "🚀 n.Solve - Deploy via GitHub Actions"
echo "======================================="

# Verificar se estamos no GitHub Actions
if [ "$GITHUB_ACTIONS" = "true" ]; then
    echo "✅ Executando no GitHub Actions"
else
    echo "⚠️  Executando localmente"
fi

# Deploy Webhook Receiver
echo "📡 Deploying webhook-receiver..."
npx wrangler deploy --name webhook-receiver
if [ $? -ne 0 ]; then
    echo "❌ Erro no deploy do webhook-receiver"
    exit 1
fi

# Deploy Core Processor  
echo "⚙️ Deploying core-processor..."
npx wrangler deploy --name core-processor
if [ $? -ne 0 ]; then
    echo "❌ Erro no deploy do core-processor"
    exit 1
fi

# Deploy Translation Agent
echo "🌐 Deploying translation-agent..."
npx wrangler deploy --name translation-agent
if [ $? -ne 0 ]; then
    echo "❌ Erro no deploy do translation-agent"
    exit 1
fi

# Deploy Jira Integration
echo "🎫 Deploying jira-integration..."
npx wrangler deploy --name jira-integration
if [ $? -ne 0 ]; then
    echo "❌ Erro no deploy do jira-integration"
    exit 1
fi

echo ""
echo "✅ Todos os Workers deployados com sucesso!"
echo "🎯 n.Solve está online!"
echo ""
echo "📊 Workers deployados:"
echo "   - webhook-receiver.workers.dev"
echo "   - core-processor.workers.dev"
echo "   - translation-agent.workers.dev"
echo "   - jira-integration.workers.dev"
