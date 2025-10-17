# n.Solve - Cloudflare Edge Computing Edition

![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square)
![D1](https://img.shields.io/badge/D1-SQLite-green?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)

**Vulnerability Lifecycle Management Tracker** na arquitetura **Cloudflare Edge Computing**.

## 🚀 Migração Completa: GCP → Cloudflare

Esta é a versão **2.0** do n.Solve, totalmente reescrita para aproveitar a **Rede Global da Cloudflare** e **Edge Computing**.

### 🔄 Mapeamento de Tecnologias

| Componente | GCP (v1.0) | Cloudflare (v2.0) | Ganho Principal |
|------------|-----------|-------------------|-----------------|
| **Computação** | Cloud Functions (Python) | **Workers (TypeScript)** | ⚡ Latência < 50ms global |
| **Banco de Dados** | Cloud SQL (PostgreSQL) | **D1 (SQLite)** | 🌍 Dados no edge |
| **Mensageria** | Cloud Pub/Sub | **Durable Objects** | 🔒 Estado consistente |
| **Storage** | Cloud Storage | **R2** | 💰 Zero egress fees |
| **IA** | Vertex AI/Gemini | **Workers AI** | ⚡ IA no edge |
| **Frontend** | Next.js (externo) | **Pages** | 🚀 CDN global integrado |

## 📦 Estrutura do Projeto

```
ness-vlm-cloudflare/
│
├── workers/                        # Cloudflare Workers (TypeScript)
│   ├── webhook-receiver/           # Recebe webhooks com validação
│   │   └── index.ts
│   ├── core-processor/             # Processamento central + correlação
│   │   └── index.ts
│   ├── translation-agent/          # Tradução com Workers AI
│   │   └── index.ts
│   └── jira-integration/           # Integração Jira
│       └── index.ts
│
├── schema/                         # D1 Database Schema
│   └── d1-schema.sql               # SQLite schema + views
│
├── frontend/                       # Next.js para Cloudflare Pages
│   ├── components/
│   │   └── FindingDetail.tsx      # Componente React
│   └── public/locales/
│       ├── en/common.json
│       └── pt-BR/common.json
│
├── scripts/                        # Scripts de automação
│   ├── deploy.sh                   # Deploy completo
│   └── setup-secrets.sh            # Configurar secrets
│
├── wrangler.toml                   # Configuração Wrangler
├── tsconfig.json                   # TypeScript config
├── package.json                    # Dependências
└── README.md                       # Este arquivo
```

## 🎯 Principais Mudanças Arquiteturais

### 1. **Backend: Python → TypeScript**

**Antes (Python):**
```python
def generate_correlation_key(vuln_type, url, param):
    concatenated = f"{vuln_type}|{url}|{param}"
    return hashlib.sha256(concatenated.encode()).hexdigest()
```

**Agora (TypeScript):**
```typescript
async function generateCorrelationKey(
  vulnerabilityType: string,
  urlTarget: string,
  affectedParam: string
): Promise<string> {
  const concatenated = `${vulnerabilityType}|${urlTarget}|${affectedParam}`;
  const data = new TextEncoder().encode(concatenated);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### 2. **Database: PostgreSQL → SQLite (D1)**

**Principais Adaptações:**
- ❌ Sem ENUM types → CHECK constraints
- ❌ Sem stored procedures → Lógica no Worker
- ✅ Views para queries complexas
- ✅ Triggers para auditoria automática

### 3. **Mensageria: Pub/Sub → Durable Objects**

**Vantagens:**
- Estado consistente e durável
- Garantia de ordenação (FIFO)
- Processamento em lote eficiente

### 4. **IA: Gemini → Workers AI**

**Modelo Usado:** `@cf/meta/llama-2-7b-chat-int8`

Executa **diretamente na rede Cloudflare**, sem cold starts!

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- Conta Cloudflare com Workers Paid plan
- Wrangler CLI instalado

### 1. Instalação

```bash
# Clone ou acesse o diretório
cd ness-vlm-cloudflare

# Instale dependências
npm install

# Login no Cloudflare
npx wrangler login
```

### 2. Configurar D1 Database

```bash
# Criar banco de dados D1
npx wrangler d1 create ness_vlm_db

# Anotar o database_id retornado e atualizar wrangler.toml

# Executar schema
npx wrangler d1 execute ness_vlm_db --file=schema/d1-schema.sql
```

### 3. Configurar Secrets

```bash
# Webhook secret
npx wrangler secret put WEBHOOK_SECRET

# Jira credentials
npx wrangler secret put JIRA_BASE_URL
npx wrangler secret put JIRA_USER
npx wrangler secret put JIRA_API_TOKEN
```

### 4. Deploy

```bash
# Deploy todos os workers
npm run deploy

# Ou deploy individual
npm run deploy:webhook
npm run deploy:core
npm run deploy:translation
npm run deploy:jira
```

### 5. Testar

```bash
# Tail logs em tempo real
npm run tail:webhook
npm run tail:core

# Testar webhook
curl -X POST https://webhooks.vlm-tracker.ness.com/ \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=..." \
  -d '{
    "vulnerability_type": "XSS",
    "severity": "HIGH",
    "url": "https://example.com/search",
    "parameter": "q"
  }'
```

## 🔐 Segurança

### Proteção Nativa da Cloudflare

✅ **WAF (Web Application Firewall)** - Automático
✅ **DDoS Protection** - Camada 3, 4, 7
✅ **Rate Limiting** - 100 req/min por IP
✅ **Bot Management** - Detecção de bots maliciosos
✅ **SSL/TLS** - Certificados automáticos

### Validação de Webhooks

```typescript
// Validação HMAC-SHA256
const isValid = await validateSignature(request, env.WEBHOOK_SECRET);
if (!isValid) {
  return new Response('Invalid signature', { status: 401 });
}
```

## 📊 Performance

### Métricas Esperadas

| Métrica | GCP v1.0 | Cloudflare v2.0 | Melhoria |
|---------|----------|-----------------|----------|
| **Latência P50** | ~150ms | **~30ms** | 🚀 5x mais rápido |
| **Latência P99** | ~2s | **~200ms** | 🚀 10x mais rápido |
| **Cold Start** | ~3s | **0ms** | ⚡ Eliminado |
| **Disponibilidade** | 99.5% | **99.99%** | 📈 Maior SLA |

### Distribuição Global

Seu código roda em **300+ data centers** da Cloudflare!

```
🌍 Americas: 100+ POPs
🌍 Europe: 100+ POPs
🌍 Asia-Pacific: 80+ POPs
🌍 Africa & Middle East: 20+ POPs
```

## 💰 Custos Estimados

### Cenário: 10k vulnerabilidades/mês

| Serviço | Custo Mensal |
|---------|--------------|
| Workers (100k req) | $5 |
| D1 Database | $5 |
| Durable Objects | $10 |
| R2 Storage (100GB) | $1.50 |
| Workers AI (1M tokens) | $10 |
| **Total** | **~$32/mês** |

**Economia:** ~$163/mês vs GCP (83% redução!)

## 🔧 Comandos Úteis

```bash
# Desenvolvimento local
npm run dev

# Type checking
npm run type-check

# Visualizar logs
npx wrangler tail webhook-receiver --format=pretty

# Consultar D1
npx wrangler d1 execute ness_vlm_db \
  --command="SELECT * FROM vulnerabilities LIMIT 10"

# Backup D1
npx wrangler d1 export ness_vlm_db --output=backup.sql

# Listar secrets
npx wrangler secret list
```

## 📈 Roadmap

### Q1 2025
- [x] Migração completa para Cloudflare
- [x] Workers TypeScript (4 workers)
- [x] D1 Database com schema otimizado
- [x] Durable Objects para filas
- [x] Workers AI para tradução

### Q2 2025
- [ ] Analytics com Workers Analytics Engine
- [ ] Hyperdrive para conexões externas
- [ ] Queues (beta) ao invés de Durable Objects
- [ ] Vectorize para busca semântica

### Q3 2025
- [ ] Multi-tenant com isolamento
- [ ] API pública RESTful
- [ ] Webhooks outbound
- [ ] Mobile app (React Native)

## 🐛 Troubleshooting

### Worker não responde

```bash
# Verificar deploy
npx wrangler deployments list

# Ver logs
npx wrangler tail <worker-name>
```

### Erro de D1

```bash
# Verificar conexão
npx wrangler d1 execute ness_vlm_db --command="SELECT 1"

# Re-executar migrations
npx wrangler d1 migrations apply ness_vlm_db
```

### Workers AI falha

Fallback automático implementado - retorna recomendação original.

## 📚 Recursos

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Durable Objects Docs](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/)
- [Workers AI Docs](https://developers.cloudflare.com/workers-ai/)

## 🆘 Suporte

- 📧 Email: security@ness.com
- 📖 Docs: https://docs.ness.com/vlm-tracker-cloudflare
- 💬 Discord: ness. Community

---

**Desenvolvido com ❤️ pela ness. | Powered by Cloudflare Edge Computing**
