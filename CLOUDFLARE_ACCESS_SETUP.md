# 🔐 Cloudflare Access Setup Guide - n.Solve

## 📋 Overview

Este guia configura Cloudflare Zero Trust Access para autenticação SSO no n.Solve.

**Benefícios:**
- ✅ SSO gratuito até 50 usuários
- ✅ MFA nativo (TOTP, WebAuthn)
- ✅ Suporte Google, Microsoft, Azure AD, Okta
- ✅ Auditoria completa de acessos
- ✅ WAF e DDoS integrados

---

## 🚀 Passo 1: Configurar Cloudflare Zero Trust

### 1.1 Acessar Zero Trust Dashboard

```bash
# Via navegador
https://one.dash.cloudflare.com/
```

1. Login na Cloudflare
2. Selecione sua conta
3. Vá em **Zero Trust** no menu lateral

---

### 1.2 Configurar Team Domain

1. Em **Settings** → **General**
2. Defina seu **Team name**: `ness` (ou outro de sua preferência)
3. Isso criará: `ness.cloudflareaccess.com`

---

## 🔑 Passo 2: Configurar Identity Providers

### 2.1 Google Workspace / Gmail

1. Vá em **Settings** → **Authentication** → **Login methods**
2. Clique em **Add new** → **Google**
3. Configure:
   - **App ID**: (auto-gerado)
   - **Client ID**: Obter do Google Cloud Console
   - **Client Secret**: Obter do Google Cloud Console

**Obter Google OAuth:**
```
1. https://console.cloud.google.com/
2. Create Project: "n.Solve Auth"
3. APIs & Services → Credentials
4. Create OAuth 2.0 Client ID
5. Authorized redirect URIs:
   https://ness.cloudflareaccess.com/cdn-cgi/access/callback
```

### 2.2 Microsoft Azure AD

1. **Settings** → **Authentication** → **Azure AD**
2. Configure:
   - **Application ID**: Do Azure Portal
   - **Application Secret**: Do Azure Portal
   - **Directory ID**: Do Azure Portal

**Obter Azure AD:**
```
1. https://portal.azure.com/
2. Azure Active Directory → App registrations
3. New registration: "n.Solve"
4. Redirect URI:
   https://ness.cloudflareaccess.com/cdn-cgi/access/callback
```

### 2.3 Okta / SAML

1. **Settings** → **Authentication** → **SAML**
2. Configure conforme seu IdP

---

## 🌐 Passo 3: Configurar Access Applications

### 3.1 Criar Application para n.Solve

1. Vá em **Access** → **Applications**
2. Clique em **Add an application**
3. Escolha **Self-hosted**

**Configuração:**
```yaml
Application name: n.Solve
Session Duration: 24h
Application domain: nsolve.ness.tec.br

Subdomain: nsolve
Domain: ness.tec.br
Path: (deixe vazio para proteger todo o domínio)

# Ou proteger apenas rotas específicas:
Path: /dashboard/*
```

### 3.2 Configurar Policies

**Policy 1: Allow Platform Admins**
```yaml
Name: Platform Admins
Action: Allow
Include:
  - Emails: resper@ness.com.br
```

**Policy 2: Allow Organization Members**
```yaml
Name: Organization Members
Action: Allow
Include:
  - Email domain: ness.tec.br
  - Emails ending in: @your-company.com
```

**Policy 3: MFA Required**
```yaml
Name: MFA Required
Action: Require
Require:
  - Authentication method: MFA
```

### 3.3 Advanced Settings

```yaml
Enable:
  ✅ Cookie Settings → HttpOnly
  ✅ Cookie Settings → SameSite: Lax
  ✅ CORS Settings → Allow credentials
  ✅ Identity → Email header (Cf-Access-Authenticated-User-Email)
  ✅ Identity → JWT header (Cf-Access-Jwt-Assertion)
```

---

## 🔗 Passo 4: Integrar com n.Solve Auth Service

### 4.1 Headers Cloudflare Access

Quando Access está ativo, Cloudflare adiciona headers:
```
Cf-Access-Jwt-Assertion: eyJ...
Cf-Access-Authenticated-User-Email: user@domain.com
```

### 4.2 Auth Service já está configurado!

O endpoint `/auth/cf-access` já está implementado:

```typescript
// POST https://auth-service.ness.workers.dev/auth/cf-access
// Headers automáticos do CF Access:
//   Cf-Access-Jwt-Assertion
//   Cf-Access-Authenticated-User-Email

// Fluxo:
1. Cloudflare Access autentica usuário (SSO/MFA)
2. Access adiciona headers na request
3. Auth Service lê headers
4. Cria ou busca usuário no D1
5. Gera JWT customizado com org+permissions
6. Retorna para frontend
```

---

## 🖥️ Passo 5: Atualizar Frontend

### 5.1 Detectar Cloudflare Access

```typescript
// frontend/src/lib/auth.ts

export async function loginWithCfAccess() {
  // Cloudflare Access já autenticou via SSO
  // Apenas chamar nosso auth-service para pegar o JWT customizado
  
  const response = await fetch('https://auth-service.ness.workers.dev/auth/cf-access', {
    method: 'POST',
    credentials: 'include', // Importante para cookies do CF Access
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('auth_token', data.token);
    return data;
  }

  throw new Error('CF Access authentication failed');
}
```

### 5.2 Atualizar Login Page

```typescript
// frontend/src/app/(main)/auth/v2/login/page.tsx

useEffect(() => {
  // Verificar se Cloudflare Access está ativo
  const cfAccessEmail = document.cookie
    .split('; ')
    .find(row => row.startsWith('CF_Authorization='));

  if (cfAccessEmail) {
    // Usuário já autenticado via CF Access
    loginWithCfAccess().then(() => {
      window.location.href = '/dashboard';
    });
  }
}, []);
```

---

## 📊 Passo 6: Configurar DNS

### 6.1 Adicionar DNS Record (se ainda não existe)

```bash
# Via Cloudflare Dashboard ou CLI
wrangler dns create ness.tec.br nsolve CNAME nsolve.pages.dev --proxied
```

### 6.2 Verificar SSL/TLS

1. **SSL/TLS** → **Overview**
2. Modo: **Full (strict)**
3. **Edge Certificates** → Always Use HTTPS: **On**

---

## 🧪 Passo 7: Testar

### 7.1 Acessar Application

```
1. https://nsolve.ness.tec.br
2. Cloudflare Access aparece
3. Escolher IdP (Google, Azure, etc)
4. Autenticar + MFA
5. Redirect automático para dashboard
```

### 7.2 Verificar Headers

```bash
curl -I https://nsolve.ness.tec.br

# Deve retornar:
HTTP/2 302
location: https://ness.cloudflareaccess.com/...
```

---

## 🎯 Passo 8: Auto-Provisioning

### 8.1 Comportamento Atual

```typescript
// Auth Service já implementado!

// Quando novo usuário autentica via CF Access:
1. Verifica se usuário existe no D1
2. Se NÃO existe:
   - Cria usuário automaticamente
   - Adiciona à organização padrão (ness)
   - Atribui role "User"
3. Se existe:
   - Atualiza last_login
   - Gera novo JWT
```

### 8.2 Customizar Auto-Provisioning

Edite `workers/auth-service/index.ts`:

```typescript
// Linha ~370
const defaultOrg = await env.VLM_DB
  .prepare('SELECT id FROM organizations WHERE slug = ? AND is_active = TRUE')
  .bind('ness') // ← Alterar para sua org padrão
  .first<{ id: string }>();
```

---

## 🔒 Segurança

### Verificar JWT do Cloudflare Access (Opcional)

```typescript
// Adicionar validação extra do CF Access JWT

import { jwtVerify } from '@cloudflare/workers-jwt';

const cfJwt = request.headers.get('Cf-Access-Jwt-Assertion');
const teamDomain = 'ness.cloudflareaccess.com';

// Verificar assinatura do CF Access
const certs = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`).then(r => r.json());
// Validar JWT contra certificados públicos do CF
```

---

## 📋 Checklist Final

- [ ] Zero Trust configurado
- [ ] Team domain criado
- [ ] Identity Provider configurado (Google/Azure/Okta)
- [ ] Access Application criada para nsolve.ness.tec.br
- [ ] Policies configuradas (Allow + MFA)
- [ ] DNS configurado
- [ ] SSL/TLS Full (strict)
- [ ] Auth Service deployado
- [ ] Frontend atualizado (opcional)
- [ ] Testado login SSO
- [ ] Testado auto-provisioning

---

## 🎉 Pronto!

Seu n.Solve agora tem:
- ✅ SSO gratuito (Google, Microsoft, etc)
- ✅ MFA nativo
- ✅ RBAC customizado (via D1)
- ✅ Multi-tenancy
- ✅ Auto-provisioning
- ✅ Você como Platform Admin

**Custo:** $0 até 50 usuários!

---

## 📞 Suporte

**Cloudflare Zero Trust Docs:**
- https://developers.cloudflare.com/cloudflare-one/
- https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/

**n.Solve Workers:**
- Auth Service: https://auth-service.ness.workers.dev
- Admin Service: https://admin-service.ness.workers.dev

