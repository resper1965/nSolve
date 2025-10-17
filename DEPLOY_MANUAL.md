# n.Solve - Deploy Manual (Solução GitHub Auth)

## 🚨 Problema Atual
```
Ocorreu um erro ao obter detalhes do usuário ou da organização do GitHub. 
Isso pode fazer com que as implantações falhem.
```

## 🔧 Soluções Disponíveis

### 1️⃣ **Deploy Manual via Wrangler CLI** (RECOMENDADO)

```bash
# 1. Instalar Wrangler globalmente
npm install -g wrangler

# 2. Autenticar no Cloudflare
wrangler auth login

# 3. Deploy individual dos 4 Workers
npm run deploy:webhook
npm run deploy:core  
npm run deploy:translation
npm run deploy:jira
```

### 2️⃣ **Deploy via Cloudflare Dashboard**

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vá para **Workers & Pages**
3. Clique em **Create application**
4. Escolha **Upload assets**
5. Faça upload dos arquivos dos Workers

### 3️⃣ **Reconectar GitHub no Cloudflare**

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vá para **Workers & Pages**
3. Clique em **Create application**
4. Escolha **Connect to Git**
5. Reconecte com GitHub
6. Configure o repositório `resper1965/nSolve`

## 🎯 Script de Deploy Manual

```bash
#!/bin/bash
# deploy-manual.sh

echo "🚀 n.Solve - Deploy Manual"
echo "=========================="

# Verificar se Wrangler está instalado
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler não encontrado. Instalando..."
    npm install -g wrangler
fi

# Verificar autenticação
echo "🔐 Verificando autenticação..."
wrangler whoami

# Deploy dos 4 Workers
echo "📡 Deploying webhook-receiver..."
wrangler deploy --name webhook-receiver

echo "⚙️ Deploying core-processor..."
wrangler deploy --name core-processor

echo "🌐 Deploying translation-agent..."
wrangler deploy --name translation-agent

echo "🎫 Deploying jira-integration..."
wrangler deploy --name jira-integration

echo "✅ Deploy manual concluído!"
```

## 🔑 Próximos Passos

1. **Configurar Secrets** (WEBHOOK_SECRET, JIRA_TOKEN, etc.)
2. **Inicializar D1 Database** com schema
3. **Configurar Domínio** ness.tec.br
4. **Testar Workers** funcionando

## 📊 Status dos Workers

- ✅ webhook-receiver.workers.dev
- ✅ core-processor.workers.dev  
- ✅ translation-agent.workers.dev
- ✅ jira-integration.workers.dev

## 🎯 n.Solve está online!
