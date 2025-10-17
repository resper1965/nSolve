# n.Solve - Configuração D1 Database

## 🗄️ Inicialização do Banco D1

### 1️⃣ **Criar Database D1**

```bash
# Criar database D1
wrangler d1 create ness_vlm_db

# Anotar o database_id retornado
# Exemplo: database_id = "abc123def456ghi789"
```

### 2️⃣ **Atualizar wrangler.toml**

```toml
[[d1_databases]]
binding = "VLM_DB"
database_name = "ness_vlm_db"
database_id = "abc123def456ghi789"  # ← Substituir pelo ID real
```

### 3️⃣ **Executar Schema**

```bash
# Inicializar schema
npm run db:init

# Ou manualmente:
wrangler d1 execute ness_vlm_db --file=schema/d1-schema.sql
```

## 📊 Schema D1 (SQLite)

### Tabelas Principais

```sql
-- Vulnerabilities
CREATE TABLE vulnerabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correlation_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low')),
    status TEXT CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Translations
CREATE TABLE translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vulnerability_id INTEGER REFERENCES vulnerabilities(id),
    language TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Jira Issues
CREATE TABLE jira_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vulnerability_id INTEGER REFERENCES vulnerabilities(id),
    jira_key TEXT UNIQUE NOT NULL,
    jira_url TEXT,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Webhook Events
CREATE TABLE webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    payload TEXT,
    processed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Script de Inicialização

```bash
#!/bin/bash
# init-d1.sh

echo "🗄️ n.Solve - Inicialização D1 Database"
echo "====================================="

# Verificar se database existe
echo "🔍 Verificando database D1..."
wrangler d1 list | grep ness_vlm_db

if [ $? -ne 0 ]; then
    echo "📦 Criando database D1..."
    wrangler d1 create ness_vlm_db
    echo "⚠️  IMPORTANTE: Atualize o database_id no wrangler.toml"
fi

# Executar schema
echo "📊 Executando schema..."
npm run db:init

echo "✅ D1 Database inicializado!"
```

## 🔧 Comandos Úteis

```bash
# Listar databases
wrangler d1 list

# Executar query
wrangler d1 execute ness_vlm_db --command "SELECT * FROM vulnerabilities"

# Backup database
wrangler d1 export ness_vlm_db --output backup.sql

# Restore database
wrangler d1 execute ness_vlm_db --file backup.sql
```

## 🎯 Próximo Passo

Após inicializar D1, configure o domínio:
```bash
npm run domain:setup
```
