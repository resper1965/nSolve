# n.Solve - Deploy Frontend no Cloudflare Pages

## 🎯 **SITUAÇÃO ATUAL:**

| Componente | Status | Localização |
|------------|--------|-------------|
| **Backend (5 Workers)** | ✅ Deployado | Cloudflare Workers |
| **Database (D1)** | ✅ Configurado | Cloudflare D1 |
| **Frontend (Next.js)** | ⏳ Local | localhost:3002 |

**Precisamos:** Deploy do Frontend no Cloudflare Pages!

---

## 🚀 **DEPLOY VIA CLOUDFLARE DASHBOARD** (RECOMENDADO)

### **Passo 1: Criar Projeto Pages**

1. Acesse: https://dash.cloudflare.com
2. Vá em **Workers & Pages** → **Create application**
3. Escolha **Pages** → **Connect to Git**
4. Selecione o repositório: **resper1965/nSolve**

### **Passo 2: Configurar Build**

```yaml
Framework preset: Next.js
Build command: cd frontend && npm install && npm run build
Build output directory: frontend/.next
Root directory: /
Branch: main
```

### **Passo 3: Configurar Environment Variables**

Adicione estas variáveis:

```
NEXT_PUBLIC_API_URL=https://core-processor.ness.workers.dev
NEXT_PUBLIC_AUTH_URL=https://auth-service.ness.workers.dev
NEXT_PUBLIC_TRANSLATE_URL=https://translation-agent.ness.workers.dev
NEXT_PUBLIC_JIRA_URL=https://jira-integration.ness.workers.dev
NEXT_PUBLIC_WEBHOOKS_URL=https://webhook-receiver.ness.workers.dev
NEXT_PUBLIC_APP_NAME=n.Solve
NEXT_PUBLIC_COMPANY_NAME=ness.
```

### **Passo 4: Deploy**

1. Clique em **Save and Deploy**
2. Aguarde build completar (~2-3 min)
3. Frontend estará disponível em: `https://nsolve.pages.dev`

### **Passo 5: Configurar Domínio Customizado (Opcional)**

1. No projeto Pages → **Custom domains**
2. Adicione: `app.ness.tec.br`
3. Cloudflare configura SSL automaticamente

---

## 🖥️ **ARQUITETURA FINAL:**

```
Frontend (Cloudflare Pages)
  └─ https://nsolve.pages.dev
  └─ https://app.ness.tec.br (custom)
       ↓ HTTPS API Calls
Backend (Cloudflare Workers)
  ├─ auth-service.ness.workers.dev
  ├─ core-processor.ness.workers.dev
  ├─ translation-agent.ness.workers.dev
  ├─ jira-integration.ness.workers.dev
  └─ webhook-receiver.ness.workers.dev
       ↓
Database (Cloudflare D1)
  └─ ness_vlm_db (Multi-tenant + RBAC)
```

---

## ⚡ **VANTAGENS DO CLOUDFLARE PAGES:**

- ✅ **Auto-deploy:** Cada push no GitHub = deploy automático
- ✅ **SSL grátis:** HTTPS automático
- ✅ **CDN global:** Edge caching mundial
- ✅ **Rollback fácil:** Voltar para versão anterior
- ✅ **Preview URLs:** Cada PR gera URL de preview
- ✅ **Integração total:** Frontend + Backend na mesma plataforma

---

## 📊 **APÓS DEPLOY:**

### **URLs Finais:**

| Serviço | URL Produção |
|---------|--------------|
| **Frontend** | `https://nsolve.pages.dev` ou `app.ness.tec.br` |
| **Auth** | `https://auth.ness.tec.br` |
| **API** | `https://api.ness.tec.br` |
| **Translate** | `https://translate.ness.tec.br` |
| **Jira** | `https://jira.ness.tec.br` |
| **Webhooks** | `https://webhooks.ness.tec.br` |

---

## 🎯 **PRÓXIMO PASSO:**

**Acesse o Cloudflare Dashboard agora e siga os passos acima!**

Ou quer que eu tente fazer via CLI (mais complexo com Next.js SSR)?

---

## ✅ **CHECKLIST:**

- [x] Backend deployado
- [x] Database configurado
- [x] Frontend build OK
- [ ] Frontend deploy Cloudflare Pages ← **VOCÊ ESTÁ AQUI**
- [ ] Domínio customizado (opcional)
- [ ] Testes end-to-end

**Vá para o Cloudflare Dashboard e crie o projeto Pages agora! 🚀**

