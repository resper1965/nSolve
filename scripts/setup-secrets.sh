#!/bin/bash

# ness. VLM Tracker - Setup Secrets
# Configuração de secrets no Cloudflare

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║        ness. VLM Tracker - Setup Secrets                    ║"
echo "║              Cloudflare Workers                              ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

read -p "Deseja configurar os secrets agora? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelado"
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Configurando Webhook Secret"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Gerando webhook secret aleatório..."
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Secret gerado: $WEBHOOK_SECRET"
echo ""
echo "$WEBHOOK_SECRET" | wrangler secret put WEBHOOK_SECRET --name webhook-receiver

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Configurando Jira Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
read -p "Jira Base URL (ex: https://company.atlassian.net): " JIRA_URL
echo "$JIRA_URL" | wrangler secret put JIRA_BASE_URL --name jira-integration

read -p "Jira User Email: " JIRA_USER
echo "$JIRA_USER" | wrangler secret put JIRA_USER --name jira-integration

read -sp "Jira API Token: " JIRA_TOKEN
echo ""
echo "$JIRA_TOKEN" | wrangler secret put JIRA_API_TOKEN --name jira-integration

echo ""
echo "✓ Secrets configurados com sucesso!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Resumo"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "WEBHOOK_SECRET: $WEBHOOK_SECRET"
echo "JIRA_BASE_URL: $JIRA_URL"
echo "JIRA_USER: $JIRA_USER"
echo "JIRA_API_TOKEN: [hidden]"
echo ""
echo "⚠  Guarde o WEBHOOK_SECRET - você precisará dele para configurar"
echo "   as ferramentas de pentest!"
echo ""
