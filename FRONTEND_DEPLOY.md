# n.Solve - Deploy do Frontend

## 📱 **ONDE O FRONTEND RODA:**

O frontend **Next.js** pode rodar em **3 lugares**:

---

## 🎯 **OPÇÃO 1: Cloudflare Pages** (RECOMENDADO para produção)

### **Configuração:**

1. **Via GitHub (Automático):**
   - Cloudflare Dashboard → Pages → Create project
   - Connect to Git → Selecionar `resper1965/nSolve`
   - Build settings:
     - **Framework:** Next.js
     - **Build command:** `cd frontend && npm install && npm run build`
     - **Build output:** `frontend/.next`
   - Deploy

2. **URL Final:**
   ```
   https://nsolve.pages.dev
   ou
   https://app.ness.tec.br (custom domain)
   ```

---

## 💻 **OPÇÃO 2: Local Development** (Para desenvolvimento)

### **Rodar localmente:**

```bash
cd /home/resper/ness-vlm-cloudflare/frontend

# Criar .env.local
cat > .env.local << EOF
NEXT_PUBLIC_AUTH_URL=https://auth-service.ness.workers.dev
NEXT_PUBLIC_API_URL=https://api.ness.tec.br
EOF

# Instalar dependências
npm install

# Rodar dev server
npm run dev
```

### **URL Local:**
```
http://localhost:3000
```

### **Páginas disponíveis:**
- `http://localhost:3000/auth/v2/login` - Login
- `http://localhost:3000/auth/v2/register` - Registro
- `http://localhost:3000/dashboard` - Dashboard (após login)

---

## 🚀 **OPÇÃO 3: Cloudflare Pages via CLI** (Avançado)

### **Problema Atual:**
O template usa Next.js 15.5.5, mas `@cloudflare/next-on-pages` ainda não suporta.

### **Solução Temporária:**
Downgrade Next.js ou aguardar atualização do adapter.

```bash
# Downgrade Next.js (se necessário)
cd frontend
npm install next@15.5.2 --save-exact

# Build e Deploy
npx @cloudflare/next-on-pages
npx wrangler pages deploy .vercel/output/static --project-name nsolve
```

---

## 🌐 **RECOMENDAÇÃO FINAL:**

### **Para AGORA (Desenvolvimento):**
✅ **OPÇÃO 2** - Rodar localmente
```bash
cd /home/resper/ness-vlm-cloudflare/frontend
npm run dev
```

### **Para PRODUÇÃO:**
✅ **OPÇÃO 1** - Cloudflare Pages via GitHub
- Configurar no Dashboard
- Auto-deploy no push
- SSL automático
- CDN global

---

## 📋 **URLs Finais:**

| Ambiente | URL | Como |
|----------|-----|------|
| **Desenvolvimento** | `http://localhost:3000` | `npm run dev` |
| **Staging** | `https://nsolve.pages.dev` | Cloudflare Pages |
| **Produção** | `https://app.ness.tec.br` | Custom Domain |

---

## 🎯 **ARQUITETURA COMPLETA:**

```
Frontend (Next.js)
  ├─ localhost:3000 (dev)
  ├─ nsolve.pages.dev (staging)
  └─ app.ness.tec.br (prod)
       ↓ API calls
Backend (Workers)
  ├─ auth.ness.tec.br
  ├─ api.ness.tec.br
  ├─ translate.ness.tec.br
  ├─ jira.ness.tec.br
  └─ webhooks.ness.tec.br
       ↓
Database (D1)
  └─ Multi-tenant + RBAC
```

---

## ✅ **STATUS:**

- ✅ Frontend: Next.js + shadcn instalado
- ✅ Auth: Integrado com auth-service
- ✅ Backend: 5 Workers funcionando
- ✅ Database: RBAC Multi-tenant OK
- ⏳ Deploy: Pendente (use Opção 1 ou 2)

**Quer que eu rode localmente agora para você testar?** 🚀

