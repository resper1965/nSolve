#!/bin/bash

# n.Solve - Configuração de Domínio ness.tec.br
# Script para configurar domínio customizado

echo "🌐 n.Solve - Configuração de Domínio"
echo "===================================="
echo ""

# Verificar se Wrangler está instalado
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler não encontrado. Instalando..."
    npm install -g wrangler
fi

# Verificar autenticação
echo "🔐 Verificando autenticação..."
wrangler whoami
if [ $? -ne 0 ]; then
    echo "❌ Não autenticado. Execute: wrangler auth login"
    exit 1
fi

echo ""
echo "📋 Configure os seguintes registros DNS no Cloudflare Dashboard:"
echo ""
echo "🔧 DNS Records necessários:"
echo "=========================="
echo ""
echo "Tipo: CNAME | Nome: webhooks | Conteúdo: webhook-receiver.workers.dev | Proxy: ✅"
echo "Tipo: CNAME | Nome: api      | Conteúdo: core-processor.workers.dev     | Proxy: ✅"
echo "Tipo: CNAME | Nome: translate| Conteúdo: translation-agent.workers.dev   | Proxy: ✅"
echo "Tipo: CNAME | Nome: jira    | Conteúdo: jira-integration.workers.dev    | Proxy: ✅"
echo ""
echo "🌐 URLs finais após configuração:"
echo "================================="
echo "   - Webhook Receiver: https://webhooks.ness.tec.br"
echo "   - Core Processor:   https://api.ness.tec.br"
echo "   - Translation Agent: https://translate.ness.tec.br"
echo "   - Jira Integration:  https://jira.ness.tec.br"
echo ""

# Aguardar confirmação
echo "⚠️  IMPORTANTE: Configure os registros DNS primeiro!"
echo ""
read -p "Pressione Enter após configurar os registros DNS..."

# Deploy com domínio
echo ""
echo "🚀 Deploying com domínio customizado..."
npm run deploy:manual

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Domínio configurado com sucesso!"
    echo ""
    echo "🎯 n.Solve está online com domínio customizado!"
    echo ""
    echo "🔧 Comandos de teste:"
    echo "   curl -X POST https://webhooks.ness.tec.br/webhook"
    echo "   curl https://api.ness.tec.br/health"
    echo "   curl https://translate.ness.tec.br/health"
    echo "   curl https://jira.ness.tec.br/health"
else
    echo "❌ Erro no deploy com domínio"
    exit 1
fi
