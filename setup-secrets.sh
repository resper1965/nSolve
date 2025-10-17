#!/bin/bash

# n.Solve - Configuração de Secrets
# Script para configurar todos os secrets necessários

echo "🔑 n.Solve - Configuração de Secrets"
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
echo "🔧 Configurando secrets para os 4 Workers..."
echo ""

# WEBHOOK_SECRET
echo "📡 Configurando WEBHOOK_SECRET para webhook-receiver..."
echo "💡 Use uma chave secreta forte (ex: vlm_webhook_2024_ness_secure_key_xyz789)"
wrangler secret put WEBHOOK_SECRET --name webhook-receiver

# JIRA_TOKEN
echo ""
echo "🎫 Configurando JIRA_TOKEN para jira-integration..."
echo "💡 Use seu token Jira real (ex: ATATT3xFfGF0...)"
wrangler secret put JIRA_TOKEN --name jira-integration

# JIRA_URL
echo ""
echo "🌐 Configurando JIRA_URL para jira-integration..."
echo "💡 Use a URL base do seu Jira (ex: https://ness.atlassian.net)"
wrangler secret put JIRA_URL --name jira-integration

# JIRA_EMAIL
echo ""
echo "📧 Configurando JIRA_EMAIL para jira-integration..."
echo "💡 Use seu email Jira (ex: security@ness.com)"
wrangler secret put JIRA_EMAIL --name jira-integration

# TRANSLATION_API_KEY (Opcional)
echo ""
echo "🌍 Configurando TRANSLATION_API_KEY para translation-agent (opcional)..."
echo "💡 Deixe vazio se usar apenas Workers AI"
wrangler secret put TRANSLATION_API_KEY --name translation-agent

echo ""
echo "✅ Secrets configurados com sucesso!"
echo ""
echo "🔑 Secrets configurados:"
echo "   - WEBHOOK_SECRET (webhook-receiver)"
echo "   - JIRA_TOKEN (jira-integration)"
echo "   - JIRA_URL (jira-integration)"
echo "   - JIRA_EMAIL (jira-integration)"
echo "   - TRANSLATION_API_KEY (translation-agent)"
echo ""
echo "🎯 Próximo passo: npm run db:init"
