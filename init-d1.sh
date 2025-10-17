#!/bin/bash

# n.Solve - Inicialização D1 Database
# Script para criar e inicializar o banco D1

echo "🗄️ n.Solve - Inicialização D1 Database"
echo "====================================="
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
echo "🔍 Verificando database D1 existente..."

# Verificar se database já existe
DB_EXISTS=$(wrangler d1 list | grep "ness_vlm_db" | wc -l)

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "📦 Criando database D1..."
    echo "💡 IMPORTANTE: Anote o database_id retornado!"
    echo ""
    
    wrangler d1 create ness_vlm_db
    
    echo ""
    echo "⚠️  IMPORTANTE: Atualize o database_id no wrangler.toml"
    echo "   Exemplo: database_id = \"abc123def456ghi789\""
    echo ""
    echo "Pressione Enter após atualizar o wrangler.toml..."
    read -p "Pressione Enter para continuar..."
else
    echo "✅ Database D1 já existe"
fi

# Executar schema
echo ""
echo "📊 Executando schema D1..."
npm run db:init

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ D1 Database inicializado com sucesso!"
    echo ""
    echo "📊 Tabelas criadas:"
    echo "   - vulnerabilities"
    echo "   - translations"
    echo "   - jira_issues"
    echo "   - webhook_events"
    echo ""
    echo "🎯 Próximo passo: npm run domain:setup"
else
    echo "❌ Erro ao executar schema D1"
    exit 1
fi
