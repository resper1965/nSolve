#!/bin/bash

# n.Solve - Domain Setup Helper
# Facilita configuração do domínio ness.tec.br

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║        n.Solve - Domain Setup                     ║"
echo "║              ness.tec.br                                     ║"
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

# Verificar se os workers já foram deployed
print_step "Verificando workers..."

if ! wrangler deployments list --name webhook-receiver &>/dev/null; then
    print_warning "Workers ainda não foram deployed"
    echo ""
    echo "Execute primeiro:"
    echo "  npx wrangler deploy --name webhook-receiver"
    echo "  npx wrangler deploy --name core-processor"
    echo "  npx wrangler deploy --name translation-agent"
    echo "  npx wrangler deploy --name jira-integration"
    echo ""
    read -p "Deseja continuar mesmo assim? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

print_success "Workers encontrados"

# Verificar DNS
echo ""
print_step "Verificando DNS do ness.tec.br..."

if dig +short ness.tec.br | grep -q "."; then
    print_success "DNS ativo para ness.tec.br"
    
    # Verificar nameservers Cloudflare
    NS=$(dig +short NS ness.tec.br | head -1)
    if [[ $NS == *"cloudflare"* ]]; then
        print_success "Usando nameservers da Cloudflare"
    else
        print_warning "Domínio não está usando nameservers da Cloudflare"
        echo "  Nameservers atuais: $NS"
        echo "  Você precisa usar os nameservers da Cloudflare"
        echo ""
        echo "  1. Acesse: https://dash.cloudflare.com"
        echo "  2. Adicione o site ness.tec.br"
        echo "  3. Atualize os nameservers no registro.br"
    fi
else
    print_warning "DNS não encontrado para ness.tec.br"
    echo "  O domínio precisa estar configurado no Cloudflare primeiro"
    echo ""
    echo "  1. Acesse: https://dash.cloudflare.com"
    echo "  2. Clique em 'Add a Site'"
    echo "  3. Digite: ness.tec.br"
    echo "  4. Siga as instruções"
fi

# Instruções de configuração
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Configuração Manual no Dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Acesse: https://dash.cloudflare.com"
echo ""
echo "2. Workers & Pages → webhook-receiver"
echo "   → Settings → Triggers → Custom Domains"
echo "   → Add Custom Domain: webhooks.ness.tec.br"
echo ""
echo "3. Workers & Pages → core-processor"
echo "   → Settings → Triggers → Custom Domains"
echo "   → Add Custom Domain: api.ness.tec.br"
echo ""
echo "4. Aguardar ~2 minutos para propagação"
echo ""
echo "5. Testar:"
echo "   curl https://webhooks.ness.tec.br"
echo ""

# Perguntar se quer testar
read -p "Já configurou os domínios? Testar agora? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    print_step "Testando webhooks.ness.tec.br..."
    
    if curl -s -o /dev/null -w "%{http_code}" https://webhooks.ness.tec.br | grep -q "405"; then
        print_success "webhooks.ness.tec.br está funcionando! (405 = método não permitido, esperado)"
    else
        print_warning "webhooks.ness.tec.br não responde ainda"
        echo "  Aguarde alguns minutos para propagação DNS"
    fi
    
    echo ""
    print_step "Testando api.ness.tec.br..."
    
    if curl -s -o /dev/null -w "%{http_code}" https://api.ness.tec.br | grep -q "405"; then
        print_success "api.ness.tec.br está funcionando!"
    else
        print_warning "api.ness.tec.br não responde ainda"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  URLs Finais"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Webhook Público:"
echo "  https://webhooks.ness.tec.br"
echo ""
echo "API Interna:"
echo "  https://api.ness.tec.br"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "Setup completo!"
echo ""
echo "Documentação completa em: DOMAIN_SETUP.md"
echo ""
