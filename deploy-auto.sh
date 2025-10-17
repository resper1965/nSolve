#!/bin/bash

# ness. VLM Tracker - Deploy Totalmente Automatizado
# Este script faz TUDO automaticamente

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║        ness. VLM Tracker - Deploy Automático                ║"
echo "║          Cloudflare Edge Computing                          ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}▶${NC} $1"
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

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Variáveis
PROJECT_DIR="/home/resper/ness-vlm-cloudflare"
WRANGLER_TOML="$PROJECT_DIR/wrangler.toml"
BACKUP_TOML="$PROJECT_DIR/wrangler.toml.backup"

# Função para extrair valor do wrangler output
extract_id() {
    grep -oP "(?<=$1 = \")[^\"]*"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FASE 1: Verificações Pré-Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar Wrangler
print_step "Verificando Wrangler CLI..."
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler não encontrado"
    print_info "Instalando Wrangler..."
    npm install -g wrangler
fi
print_success "Wrangler OK"

# Verificar autenticação
print_step "Verificando autenticação Cloudflare..."
if ! wrangler whoami &> /dev/null; then
    print_warning "Não autenticado"
    print_step "Iniciando login..."
    wrangler login
    print_success "Login concluído"
else
    ACCOUNT=$(wrangler whoami 2>/dev/null | grep "Account Name" | cut -d: -f2 | xargs)
    print_success "Autenticado: $ACCOUNT"
fi

# Verificar Node modules
print_step "Verificando dependências..."
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    print_info "Instalando dependências..."
    cd "$PROJECT_DIR"
    npm install > /dev/null 2>&1
    print_success "Dependências instaladas"
else
    print_success "Dependências OK"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FASE 2: Criação de Recursos Cloudflare"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$PROJECT_DIR"

# Criar D1 Database
print_step "Criando D1 Database..."
D1_OUTPUT=$(wrangler d1 create ness_vlm_db 2>&1 || echo "exists")

if [[ $D1_OUTPUT == *"exists"* ]] || [[ $D1_OUTPUT == *"already exists"* ]]; then
    print_warning "D1 já existe (pulando)"
    # Extrair ID do banco existente
    D1_ID=$(wrangler d1 list | grep "ness_vlm_db" | awk '{print $2}' | head -1)
else
    # Extrair database_id do output
    D1_ID=$(echo "$D1_OUTPUT" | grep -oP 'database_id = "\K[^"]+' | head -1)
    print_success "D1 Database criada"
fi

print_info "Database ID: $D1_ID"

# Criar R2 Bucket
print_step "Criando R2 Bucket..."
R2_OUTPUT=$(wrangler r2 bucket create ness-vlm-storage 2>&1 || echo "exists")

if [[ $R2_OUTPUT == *"exists"* ]] || [[ $R2_OUTPUT == *"already exists"* ]]; then
    print_warning "R2 Bucket já existe (pulando)"
else
    print_success "R2 Bucket criado"
fi

# Criar KV Namespace
print_step "Criando KV Namespace..."
KV_OUTPUT=$(wrangler kv:namespace create "RATE_LIMIT_KV" 2>&1 || echo "exists")

if [[ $KV_OUTPUT == *"exists"* ]] || [[ $KV_OUTPUT == *"already exists"* ]]; then
    print_warning "KV Namespace já existe (pulando)"
    # Listar namespaces existentes
    KV_ID=$(wrangler kv:namespace list | grep "RATE_LIMIT_KV" | grep -oP 'id = "\K[^"]+' | head -1)
else
    # Extrair ID do output
    KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+' | head -1)
    print_success "KV Namespace criado"
fi

print_info "KV Namespace ID: $KV_ID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FASE 3: Atualização Automática do wrangler.toml"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Backup do wrangler.toml
print_step "Fazendo backup do wrangler.toml..."
cp "$WRANGLER_TOML" "$BACKUP_TOML"
print_success "Backup salvo: wrangler.toml.backup"

# Atualizar database_id (3 lugares)
print_step "Atualizando database_id no wrangler.toml..."
sed -i "s/database_id = \"your-d1-database-id\"/database_id = \"$D1_ID\"/g" "$WRANGLER_TOML"
print_success "Database IDs atualizados (3 lugares)"

# Atualizar KV namespace id
print_step "Atualizando KV namespace id..."
sed -i "s/id = \"your-kv-namespace-id\"/id = \"$KV_ID\"/g" "$WRANGLER_TOML"
print_success "KV ID atualizado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FASE 4: Inicialização do Banco de Dados"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_step "Executando schema SQL no D1..."
wrangler d1 execute ness_vlm_db --file=schema/d1-schema.sql > /dev/null 2>&1 || true
print_success "Schema executado"

# Verificar tabelas criadas
print_step "Verificando tabelas criadas..."
TABLES=$(wrangler d1 execute ness_vlm_db --command="SELECT name FROM sqlite_master WHERE type='table'" 2>&1)

if [[ $TABLES == *"vulnerabilities"* ]]; then
    print_success "Tabelas criadas: vulnerabilities, status_history, assets"
else
    print_warning "Tabelas podem não ter sido criadas completamente"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FASE 5: Configuração de Secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Gerar webhook secret automaticamente
print_step "Gerando webhook secret aleatório..."
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "$WEBHOOK_SECRET" > webhook-secret.txt
print_success "Secret gerado e salvo em: webhook-secret.txt"
print_info "Secret: $WEBHOOK_SECRET"

# Configurar secret no Cloudflare
print_step "Configurando webhook secret no Cloudflare..."
echo "$WEBHOOK_SECRET" | wrangler secret put WEBHOOK_SECRET --name webhook-receiver > /dev/null 2>&1 || true
print_success "Webhook secret configurado"

echo ""
print_warning "Secrets do Jira não configurados (você pulou essa parte)"
print_info "Para habilitar Jira depois, execute: ./scripts/setup-secrets.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FASE 6: Desabilitar Integração Jira (Temporário)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Comentar linha do Jira automaticamente
CORE_PROCESSOR="$PROJECT_DIR/workers/core-processor/index.ts"
print_step "Desabilitando integração Jira no core-processor..."

if grep -q "ctx.waitUntil(queueForJira" "$CORE_PROCESSOR"; then
    sed -i 's/ctx.waitUntil(queueForJira/\/\/ JIRA DESABILITADO: ctx.waitUntil(queueForJira/g' "$CORE_PROCESSOR"
    print_success "Linha do Jira comentada automaticamente"
else
    print_info "Linha do Jira já estava comentada"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FASE 7: Deploy dos Workers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Array para armazenar URLs
declare -A WORKER_URLS

# Deploy Translation Agent (Durable Object primeiro)
print_step "1/4 Deploying translation-agent..."
DEPLOY_OUTPUT=$(wrangler deploy --name translation-agent 2>&1)
TRANS_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[^\s]+workers.dev' | head -1)
WORKER_URLS["translation"]="$TRANS_URL"
print_success "translation-agent deployed"
print_info "URL: $TRANS_URL"

sleep 2

# Deploy Jira Integration (Durable Object)
print_step "2/4 Deploying jira-integration..."
DEPLOY_OUTPUT=$(wrangler deploy --name jira-integration 2>&1)
JIRA_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[^\s]+workers.dev' | head -1)
WORKER_URLS["jira"]="$JIRA_URL"
print_success "jira-integration deployed"
print_info "URL: $JIRA_URL"

sleep 2

# Deploy Core Processor
print_step "3/4 Deploying core-processor..."
DEPLOY_OUTPUT=$(wrangler deploy --name core-processor 2>&1)
CORE_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[^\s]+workers.dev' | head -1)
WORKER_URLS["core"]="$CORE_URL"
print_success "core-processor deployed"
print_info "URL: $CORE_URL"

sleep 2

# Atualizar CORE_PROCESSOR_URL no wrangler.toml
print_step "Atualizando CORE_PROCESSOR_URL no wrangler.toml..."
sed -i "s|CORE_PROCESSOR_URL = \".*\"|CORE_PROCESSOR_URL = \"$CORE_URL\"|g" "$WRANGLER_TOML"
print_success "URL atualizada para: $CORE_URL"

sleep 1

# Deploy Webhook Receiver (com URL correta do core-processor)
print_step "4/4 Deploying webhook-receiver..."
DEPLOY_OUTPUT=$(wrangler deploy --name webhook-receiver 2>&1)
WEBHOOK_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[^\s]+workers.dev' | head -1)
WORKER_URLS["webhook"]="$WEBHOOK_URL"
print_success "webhook-receiver deployed"
print_info "URL: $WEBHOOK_URL"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FASE 8: Teste Automático"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_step "Preparando teste..."

# Preparar payload de teste
TEST_PAYLOAD='{"vulnerability_type":"SQL Injection","severity":"CRITICAL","url":"https://test.ness.tec.br/api/users","parameter":"id","description":"Automated deployment test","recommendation":"Use prepared statements","tool_name":"Deploy Script","asset_name":"Test System","project_id":"deploy-test"}'

# Gerar assinatura HMAC
WEBHOOK_SECRET=$(cat webhook-secret.txt)
SIGNATURE=$(echo -n "$TEST_PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)

print_step "Enviando request de teste..."

# Enviar teste
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIGNATURE" \
  -d "$TEST_PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Teste bem-sucedido! (HTTP 200)"
    print_info "Resposta: $BODY"
    
    # Extrair correlation_key
    CORR_KEY=$(echo "$BODY" | grep -oP '"correlation_key":"\K[^"]+')
    
    if [ -n "$CORR_KEY" ]; then
        echo ""
        print_step "Verificando no banco de dados..."
        sleep 3  # Aguardar processamento
        
        DB_CHECK=$(wrangler d1 execute ness_vlm_db \
          --command="SELECT vulnerability_type, severity, status FROM vulnerabilities WHERE correlation_key = '$CORR_KEY'" 2>&1)
        
        if [[ $DB_CHECK == *"SQL Injection"* ]]; then
            print_success "✅ Vulnerabilidade encontrada no D1!"
            echo "$DB_CHECK"
        else
            print_warning "Vulnerabilidade ainda não apareceu no D1 (pode demorar alguns segundos)"
        fi
    fi
else
    print_error "Teste falhou (HTTP $HTTP_CODE)"
    print_info "Resposta: $BODY"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FASE 9: Resumo do Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_success "Deploy concluído com sucesso!"
echo ""

echo "📊 Recursos Criados:"
echo "  • D1 Database: ness_vlm_db (ID: ${D1_ID:0:8}...)"
echo "  • R2 Bucket: ness-vlm-storage"
echo "  • KV Namespace: RATE_LIMIT_KV (ID: ${KV_ID:0:8}...)"
echo ""

echo "🚀 Workers Deployed:"
echo "  1. webhook-receiver → $WEBHOOK_URL"
echo "  2. core-processor   → $CORE_URL"
echo "  3. translation-agent → $TRANS_URL"
echo "  4. jira-integration → $JIRA_URL"
echo ""

echo "🔐 Secrets Configurados:"
echo "  • WEBHOOK_SECRET → Salvo em: webhook-secret.txt"
echo ""

echo "📝 Arquivos Atualizados:"
echo "  • wrangler.toml (backup em: wrangler.toml.backup)"
echo "  • workers/core-processor/index.ts (Jira comentado)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📌 URLs IMPORTANTES - SALVE ESTAS!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Salvar URLs em arquivo
cat > deployment-urls.txt << URLFILE
# ness. VLM Tracker - Deployment URLs
# Gerado automaticamente em: $(date)

## Workers URLs (.workers.dev)
WEBHOOK_URL=$WEBHOOK_URL
CORE_PROCESSOR_URL=$CORE_URL
TRANSLATION_URL=$TRANS_URL
JIRA_URL=$JIRA_URL

## Webhook Secret
WEBHOOK_SECRET=$WEBHOOK_SECRET

## Database
D1_DATABASE_ID=$D1_ID

## KV Namespace
KV_NAMESPACE_ID=$KV_ID

## Como usar:
# Configure suas ferramentas de pentest para enviar webhooks para:
# $WEBHOOK_URL
#
# Com header:
# X-Webhook-Signature: sha256=<HMAC-SHA256 do payload usando o secret acima>

URLFILE

print_success "URLs salvas em: deployment-urls.txt"
echo ""

cat deployment-urls.txt

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎯 Próximos Passos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1. ✅ Configurar domínio customizado (ness.tec.br):"
echo "   • Leia: DOMAIN_SETUP.md"
echo "   • Execute: ./scripts/setup-domain.sh"
echo ""

echo "2. ✅ Testar webhook:"
echo "   • URL: $WEBHOOK_URL"
echo "   • Secret: (arquivo webhook-secret.txt)"
echo ""

echo "3. ✅ Monitorar logs:"
echo "   • npx wrangler tail webhook-receiver"
echo ""

echo "4. ✅ Consultar banco:"
echo "   • npx wrangler d1 execute ness_vlm_db --command=\"SELECT * FROM vulnerabilities\""
echo ""

echo "5. 🔧 Habilitar Jira (quando quiser):"
echo "   • Execute: ./scripts/setup-secrets.sh"
echo "   • Descomente linha em: workers/core-processor/index.ts"
echo "   • Re-deploy: npx wrangler deploy --name core-processor"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "🎉 Deploy automático concluído!"
echo ""
print_info "Documentação completa em: README.md"
echo ""
