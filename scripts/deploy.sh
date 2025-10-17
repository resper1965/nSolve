#!/bin/bash

# ness. VLM Tracker - Deploy Script
# Cloudflare Edge Computing
#
# Este script automatiza o deploy completo

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║        ness. VLM Tracker - Cloudflare Deploy                ║"
echo "║              Edge Computing Edition                          ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}→${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar Wrangler
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler não encontrado"
    echo "Instale com: npm install -g wrangler"
    exit 1
fi

print_success "Wrangler encontrado"

# Verificar login
print_step "Verificando autenticação Cloudflare..."
if ! wrangler whoami &> /dev/null; then
    print_warning "Não autenticado"
    print_step "Fazendo login..."
    wrangler login
fi

print_success "Autenticado"

# Type check
print_step "Type checking TypeScript..."
npm run type-check
print_success "Types OK"

# Deploy Workers
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deploying Workers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_step "1/4 Deploying Webhook Receiver..."
wrangler deploy workers/webhook-receiver/index.ts --name webhook-receiver
print_success "Webhook Receiver deployed"

print_step "2/4 Deploying Translation Agent..."
wrangler deploy workers/translation-agent/index.ts --name translation-agent
print_success "Translation Agent deployed"

print_step "3/4 Deploying Jira Integration..."
wrangler deploy workers/jira-integration/index.ts --name jira-integration
print_success "Jira Integration deployed"

print_step "4/4 Deploying Core Processor..."
wrangler deploy workers/core-processor/index.ts --name core-processor
print_success "Core Processor deployed"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deployment URLs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Webhook Receiver:"
echo "  https://webhook-receiver.<your-subdomain>.workers.dev"
echo ""
echo "Core Processor:"
echo "  https://core-processor.<your-subdomain>.workers.dev"
echo ""
echo "Translation Agent:"
echo "  https://translation-agent.<your-subdomain>.workers.dev"
echo ""
echo "Jira Integration:"
echo "  https://jira-integration.<your-subdomain>.workers.dev"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Configure secrets (se ainda não fez):"
echo "   ./scripts/setup-secrets.sh"
echo ""
echo "2. Teste o webhook:"
echo "   curl -X POST <webhook-url> -H 'Content-Type: application/json' -d '{}'"
echo ""
echo "3. Monitore logs:"
echo "   npm run tail:webhook"
echo ""

print_success "Deploy concluído!"
