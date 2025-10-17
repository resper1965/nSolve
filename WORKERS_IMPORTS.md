# 📦 Imports em Cloudflare Workers - Guia Completo

## ✅ O Que PODE Importar

### 1. Pacotes npm Compatíveis com Web Standards

```typescript
// ✅ FUNCIONA - Pacotes que usam apenas Web APIs
import { parse } from 'cookie';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { Hono } from 'hono';
import { z } from 'zod';
```

**Por quê funciona?**
- Usam apenas APIs Web padrão (fetch, crypto, etc)
- Wrangler faz bundling automático
- Sem dependências Node.js nativas

---

### 2. Seus Próprios Módulos TypeScript

```typescript
// ✅ FUNCIONA - Imports relativos
import { generateCorrelationKey } from './utils/crypto';
import { validatePayload } from './validators';
import type { Finding } from './types';
```

**Wrangler compila tudo junto automaticamente.**

---

### 3. Pacotes do Cloudflare

```typescript
// ✅ FUNCIONA - Bibliotecas oficiais Cloudflare
import { WorkersAI } from '@cloudflare/ai';
import type { ExecutionContext } from '@cloudflare/workers-types';
```

---

## ❌ O Que NÃO PODE Importar

### 1. Pacotes Node.js Nativos

```typescript
// ❌ NÃO FUNCIONA - APIs Node.js
import fs from 'fs';              // Sem filesystem
import path from 'path';          // Sem paths
import crypto from 'crypto';      // Use Web Crypto API
import process from 'process';    // Sem process
import { Buffer } from 'buffer';  // Use ArrayBuffer/Uint8Array
```

**Por quê não funciona?**
Workers roda no V8 isolado, sem acesso ao sistema operacional.

---

### 2. Pacotes Grandes ou Com Dependências Node.js

```typescript
// ❌ NÃO FUNCIONA - Muito grande ou usa Node.js
import pandas from 'pandas-js';     // Muito grande
import axios from 'axios';          // Use fetch nativo
import express from 'express';     // Use Hono ou workers direto
import mongoose from 'mongoose';   // Use D1 diretamente
```

---

### 3. Repositórios Git Diretos (Sem Build)

```typescript
// ❌ NÃO FUNCIONA DIRETAMENTE
import { algo } from 'https://github.com/user/repo';
```

**Mas você PODE fazer isso:**

1. **Adicionar como dependência npm:**
```json
// package.json
{
  "dependencies": {
    "minha-lib": "github:resper1965/minha-lib#v1.0.0"
  }
}
```

2. **Importar normalmente:**
```typescript
import { minhaFuncao } from 'minha-lib';
```

---

## 🔧 Alternativas e Workarounds

### Problema: Preciso usar um pacote Node.js

**Solução 1: Use equivalentes Web**

| Node.js | Cloudflare Workers |
|---------|-------------------|
| `crypto.createHash()` | `crypto.subtle.digest()` |
| `Buffer` | `Uint8Array`, `ArrayBuffer` |
| `fs.readFile()` | R2 bucket, KV |
| `http.request()` | `fetch()` |
| `path.join()` | Template strings |

**Exemplo - Nosso Código:**

```typescript
// ❌ Python/Node.js antigo:
import hashlib
hash = hashlib.sha256(data.encode()).hexdigest()

// ✅ Workers (Web Crypto API):
const encoder = new TextEncoder();
const data_bytes = encoder.encode(data);
const hashBuffer = await crypto.subtle.digest('SHA-256', data_bytes);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
```

---

**Solução 2: Use Polyfills**

```bash
npm install node-libs-browser
```

```typescript
import { Buffer } from 'buffer/';
// Agora pode usar Buffer (emulado)
```

---

**Solução 3: Copie o código necessário**

Se é uma biblioteca pequena, copie apenas a função que você precisa:

```typescript
// Ao invés de:
import { smallFunction } from 'huge-library';

// Faça:
// ./utils/copied-function.ts
export function smallFunction() {
  // Código copiado e adaptado
}
```

---

## 🎯 Exemplo Prático: n.Solve

### Nosso Código Atual (✅ Funciona):

```typescript
// workers/core-processor/index.ts

// ✅ Web Crypto API (nativo do Workers)
async function generateCorrelationKey(
  vulnerabilityType: string,
  urlTarget: string,
  affectedParam: string
): Promise<string> {
  const concatenated = `${vulnerabilityType}|${urlTarget}|${affectedParam}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(concatenated);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ✅ Fetch API (nativo do Workers)
const response = await fetch(jiraUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${btoa(`${user}:${token}`)}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});
```

---

### Se Você Quiser Adicionar Bibliotecas:

**Exemplo: Validação com Zod**

```bash
cd /home/resper/ness-vlm-cloudflare
npm install zod
```

```typescript
// workers/webhook-receiver/index.ts
import { z } from 'zod';

// Schema de validação
const FindingSchema = z.object({
  vulnerability_type: z.string().min(1),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']),
  url: z.string().url(),
  parameter: z.string(),
  description: z.string().optional(),
});

// Usar
try {
  const validated = FindingSchema.parse(await request.json());
  // validated é type-safe!
} catch (error) {
  return new Response('Invalid payload', { status: 400 });
}
```

**✅ Funciona perfeitamente!** Zod é compatível com Workers.

---

### Exemplo: Framework Hono (Router)

```bash
npm install hono
```

```typescript
// workers/webhook-receiver/index.ts
import { Hono } from 'hono';

const app = new Hono();

app.post('/webhook', async (c) => {
  const body = await c.req.json();
  // Processar...
  return c.json({ success: true });
});

app.get('/health', (c) => {
  return c.json({ status: 'healthy' });
});

export default app;
```

**✅ Hono é MUITO bom para Workers!** (criado especificamente para edge)

---

## 📋 Pacotes Recomendados para Workers

### Validação
- ✅ `zod` - Schema validation
- ✅ `superstruct` - Data validation
- ✅ `joi` - Schema validation (alguns)

### HTTP/Router
- ✅ `hono` - Ultra-fast web framework
- ✅ `itty-router` - Tiny router
- ✅ `worktop` - Workers toolkit

### Utilidades
- ✅ `date-fns` - Manipulação de datas
- ✅ `uuid` - Gerar UUIDs
- ✅ `jose` - JWT operations

### Crypto
- ✅ `@noble/hashes` - Crypto primitives
- ✅ `bcryptjs` - Password hashing (JS puro)

### Database
- ✅ `drizzle-orm` - ORM para D1
- ✅ `kysely` - SQL query builder

---

## ⚠️ Limitações Importantes

### 1. Tamanho Máximo

**Workers tem limite de tamanho:**
- Código bundled: **1 MB** (após compressão)
- Código descompactado: **10 MB**

**Dica:** Use tree-shaking (Wrangler faz automaticamente)

---

### 2. Sem Node.js APIs

**Não tem acesso a:**
- Filesystem (use R2 ou KV)
- Process/OS (sem `process.env`, use `env` do Worker)
- Child processes
- Network sockets (só HTTP via fetch)

---

### 3. Runtime Limitado

- **CPU Time:** 50ms free, 30s paid (seu plano)
- **Memory:** 128 MB
- **Subrequests:** 50 por request (fetches externos)

---

## 🔧 Como Adicionar Pacote Externo

### Passo a Passo:

```bash
# 1. Navegar para o projeto
cd /home/resper/ness-vlm-cloudflare

# 2. Instalar pacote
npm install nome-do-pacote

# 3. Importar no seu Worker
# workers/seu-worker/index.ts
import { algo } from 'nome-do-pacote';

# 4. Deploy (Wrangler faz bundling)
npx wrangler deploy --name seu-worker
```

**Wrangler automaticamente:**
- ✅ Compila TypeScript
- ✅ Faz bundle de todas as dependências
- ✅ Tree-shaking (remove código não usado)
- ✅ Minifica
- ✅ Valida tamanho

---

## 🎯 Para o n.Solve - Recomendações

### Melhorias Sugeridas:

**1. Adicionar Validação (Zod)**

```bash
npm install zod
```

```typescript
// workers/webhook-receiver/index.ts
import { z } from 'zod';

const FindingSchema = z.object({
  vulnerability_type: z.string(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']),
  url: z.string().url(),
  parameter: z.string(),
});

// Validar payload
const validated = FindingSchema.parse(rawFinding);
```

---

**2. Adicionar ORM para D1 (Drizzle)**

```bash
npm install drizzle-orm
```

```typescript
import { drizzle } from 'drizzle-orm/d1';
import { vulnerabilities } from './schema';

const db = drizzle(env.VLM_DB);

// Query type-safe
const results = await db
  .select()
  .from(vulnerabilities)
  .where(eq(vulnerabilities.severity, 'CRITICAL'));
```

---

**3. Adicionar Router (Hono)**

```bash
npm install hono
```

```typescript
import { Hono } from 'hono';

const app = new Hono();

app.post('/webhook', handleWebhook);
app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/metrics', handleMetrics);

export default app;
```

---

## 📝 Exemplo Completo com Imports

```typescript
/**
 * n.Solve - Worker com Dependências Externas
 */

// ✅ Pacotes npm compatíveis
import { Hono } from 'hono';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ✅ Seus próprios módulos
import { generateCorrelationKey } from './utils/crypto';
import { validateSignature } from './utils/auth';
import type { Finding, Env } from './types';

// ✅ Cloudflare types
import type { ExecutionContext } from '@cloudflare/workers-types';

const app = new Hono<{ Bindings: Env }>();

// Schema de validação
const FindingSchema = z.object({
  vulnerability_type: z.string().min(1),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']),
  url: z.string().url(),
  parameter: z.string(),
});

app.post('/webhook', async (c) => {
  try {
    // Validar payload
    const body = await c.req.json();
    const validated = FindingSchema.parse(body);
    
    // Gerar correlation key
    const correlationKey = await generateCorrelationKey(
      validated.vulnerability_type,
      validated.url,
      validated.parameter
    );
    
    // Salvar no D1
    await c.env.VLM_DB
      .prepare('INSERT INTO vulnerabilities (...) VALUES (...)')
      .bind(correlationKey, ...)
      .run();
    
    return c.json({ success: true, correlation_key: correlationKey });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid payload', details: error.errors }, 400);
    }
    return c.json({ error: 'Internal error' }, 500);
  }
});

export default app;
```

---

## 🚫 Pacotes Que NÃO Funcionam

### Lista de Pacotes Incompatíveis:

```typescript
// ❌ NÃO FUNCIONA
import axios from 'axios';        // Use fetch nativo
import lodash from 'lodash';      // Use lodash-es (ES modules)
import moment from 'moment';      // Use date-fns
import express from 'express';    // Use Hono
import request from 'request';    // Use fetch
import nodemailer from 'nodemailer'; // Use Email Workers
import pg from 'pg';              // Use D1
import redis from 'redis';        // Use KV ou Durable Objects
```

### Por Que Não Funcionam?

1. Dependem de Node.js APIs (`fs`, `net`, `http`)
2. Muito grandes (> 1 MB bundled)
3. Código CommonJS (não ES modules)

---

## 🔧 Como Saber Se Um Pacote Funciona?

### Teste 1: Verificar Dependências

```bash
npm info <pacote> dependencies
```

Se mostrar `fs`, `path`, `http`, `crypto` (Node.js) = ❌ Provavelmente não funciona

---

### Teste 2: Verificar Exports

```bash
npm info <pacote> exports
```

Se tem `"type": "module"` ou `.mjs` = ✅ Melhor chance

---

### Teste 3: Testar Localmente

```bash
cd /home/resper/ness-vlm-cloudflare
npm install <pacote>

# Adicionar import no Worker
# Testar local:
npx wrangler dev
```

Se funciona local, funciona em produção!

---

## 📦 Importar de Repositório GitHub

### Opção 1: Via npm (Recomendado)

```bash
# Adicionar dependência do GitHub
npm install github:resper1965/meu-repo#v1.0.0
```

```json
// package.json
{
  "dependencies": {
    "meu-pacote": "github:resper1965/meu-repo#v1.0.0"
  }
}
```

```typescript
// Importar
import { minhaFuncao } from 'meu-pacote';
```

---

### Opção 2: Git Submodule + Imports Relativos

```bash
# Adicionar como submodule
git submodule add https://github.com/resper1965/lib.git workers/lib

# Importar relativamente
```

```typescript
import { funcao } from '../lib/index';
```

---

### Opção 3: Copiar Código Diretamente

Se é código pequeno/específico:

```bash
# Copiar arquivos necessários
cp ../outro-repo/utils/crypto.ts workers/utils/
```

```typescript
import { funcao } from './utils/crypto';
```

---

## 🎯 Recomendações para n.Solve

### Pacotes Úteis para Adicionar:

```bash
cd /home/resper/ness-vlm-cloudflare

# Validação robusta
npm install zod

# Router melhorado
npm install hono

# Datas
npm install date-fns

# JWT (se precisar autenticação)
npm install @tsndr/cloudflare-worker-jwt

# ORM type-safe para D1
npm install drizzle-orm
npm install -D drizzle-kit
```

---

### Exemplo: Melhorar Webhook Receiver com Hono + Zod

```typescript
// workers/webhook-receiver/index.ts
import { Hono } from 'hono';
import { z } from 'zod';

const app = new Hono();

const WebhookSchema = z.object({
  vulnerability_type: z.string(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']),
  url: z.string().url(),
  parameter: z.string(),
});

app.post('/webhook', async (c) => {
  // Validação automática
  const body = await c.req.json();
  const validated = WebhookSchema.parse(body);
  
  // Continua processamento...
  return c.json({ success: true });
});

app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy',
    version: '2.0.0',
    service: 'n.Solve webhook-receiver'
  });
});

export default app;
```

---

## 🐛 Troubleshooting de Imports

### Erro: "Module not found"

```bash
# Reinstalar
npm install

# Verificar package.json
cat package.json
```

---

### Erro: "Cannot find module 'fs'"

Um pacote está tentando usar Node.js APIs.

**Solução:**
1. Procure alternativa compatível com Workers
2. Use polyfill
3. Reescreva a funcionalidade

---

### Erro: "Script too large"

Pacote muito grande (> 1 MB bundled).

**Solução:**
1. Use import seletivo: `import { funcao } from 'lib/funcao'`
2. Encontre alternativa menor
3. Copie apenas código necessário

---

### Erro de tipo TypeScript

```bash
# Instalar types
npm install -D @types/<pacote>
```

---

## ✅ Checklist de Import

Antes de adicionar um pacote:

- [ ] Verifica se é compatível com Web Standards
- [ ] Não depende de Node.js APIs
- [ ] Tamanho razoável (< 100 KB ideal)
- [ ] Tem tipos TypeScript ou @types
- [ ] Testado com `wrangler dev`

---

## 📚 Recursos

- **Cloudflare Compatible Packages:** https://workers.cloudflare.com/built-with
- **Workers Examples:** https://github.com/cloudflare/workers-sdk/tree/main/templates
- **Hono Framework:** https://hono.dev/
- **Drizzle ORM:** https://orm.drizzle.team/docs/get-started-sqlite

---

**Desenvolvido pela ness. | n.Solve**
