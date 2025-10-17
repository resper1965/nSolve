#!/bin/bash

# n.Solve - Script de Início Rápido
# Para a conta: resper@ness.com.br
# Domínio: ness.tec.br

set -e

clear

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║              n.Solve - Deploy                     ║"
echo "║                                                              ║"
echo "║          Cloudflare Edge Computing Edition                  ║"
echo "║                                                              ║"
echo "║          Conta: resper@ness.com.br                          ║"
echo "║          Domínio: ness.tec.br                               ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Verificando Pré-requisitos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se está logado
print_step "Verificando login no Cloudflare..."

if wrangler whoami &> /dev/null; then
    LOGGED_EMAIL=$(wrangler whoami 2>&1 | grep -oP '(?<=│ )[^\s]+@[^\s]+' | head -1)
    
    if [ "$LOGGED_EMAIL" = "resper@ness.com.br" ]; then
        print_success "Logado com a conta correta: resper@ness.com.br"
    else
        print_warning "Logado com conta diferente: $LOGGED_EMAIL"
        echo ""
        read -p "Deseja fazer logout e logar com resper@ness.com.br? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            wrangler logout
            print_step "Faça login com: resper@ness.com.br"
            wrangler login
        fi
    fi
else
    print_warning "Não autenticado"
    print_step "Por favor, faça login com: resper@ness.com.br"
    wrangler login
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Escolha o Tipo de Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1) 🚀 Deploy Automático Total (~2 minutos)"
echo "   • Cria TODOS os recursos"
echo "   • Atualiza configurações automaticamente"
echo "   • Deploy de todos os workers"
echo "   • Testa automaticamente"
echo "   • Recomendado para primeira vez"
echo ""

echo "2) 📋 Deploy Manual Guiado"
echo "   • Você executa cada comando"
echo "   • Guia passo a passo"
echo "   • Mais controle"
echo ""

echo "3) 🌐 Configurar Domínio ness.tec.br"
echo "   • Instruções para apontar DNS"
echo "   • Configurar Custom Domains"
echo ""

echo "4) 📚 Ver Documentação"
echo "   • README completo"
echo "   • Guias de migração"
echo ""

read -p "Escolha (1-4): " -n 1 -r
echo ""
echo ""

case $REPLY in
    1)
        print_info "Iniciando deploy automático..."
        echo ""
        ./deploy-auto.sh
        ;;
    2)
        print_info "Abrindo guia manual..."
        echo ""
        cat QUICK_DEPLOY.md | less
        ;;
    3)
        print_info "Abrindo guia de DNS..."
        echo ""
        cat DNS_SETUP.md | less
        ;;
    4)
        print_info "Abrindo documentação..."
        echo ""
        cat README.md | less
        ;;
    *)
        print_warning "Opção inválida"
        echo ""
        echo "Execute novamente: ./START.sh"
        ;;
esac

echo ""
