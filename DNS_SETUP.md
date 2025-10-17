# 🌐 Como Apontar o DNS do ness.tec.br para Cloudflare

## 📋 Visão Geral

Você vai **mudar os nameservers** do ness.tec.br de onde ele está agora (provavelmente registro.br ou outro provedor) para os nameservers da Cloudflare.

**Tempo total:** 5-10 minutos de configuração + até 24h de propagação

---

## 🎯 Passo a Passo Completo

### PARTE 1: Adicionar Domínio no Cloudflare

#### 1️⃣ Acessar Cloudflare Dashboard

```
https://dash.cloudflare.com
```

Faça login com sua conta.

---

#### 2️⃣ Adicionar o Site

1. Na página inicial, clique no botão **"Add a Site"** (+ Add a site)

2. Digite: **ness.tec.br** (sem www, sem http)

3. Clique em **"Add site"**

---

#### 3️⃣ Escolher o Plano

1. Cloudflare vai mostrar os planos disponíveis

2. Escolha **"Free"** ($0/mês) - É SUFICIENTE!

3. Clique em **"Continue"**

**O plano Free inclui:**
- ✅ DNS global
- ✅ SSL grátis
- ✅ CDN
- ✅ DDoS protection
- ✅ Tudo que você precisa!

---

#### 4️⃣ Cloudflare Escaneia Seus DNS (Aguarde)

Cloudflare vai **escanear automaticamente** seus registros DNS existentes.

**Isso demora ~1 minuto.**

Você verá uma tela com:
- Registros A (IPs)
- Registros CNAME
- Registros MX (email)
- Etc.

**✅ Revise:** Cloudflare vai copiar todos os registros existentes automaticamente.

Clique em **"Continue"**

---

#### 5️⃣ IMPORTANTE: ANOTE OS NAMESERVERS

Você vai ver uma tela como esta:

```
╔══════════════════════════════════════════════════════════╗
║  Change your nameservers                                 ║
║                                                          ║
║  Update your nameservers at registro.br to:             ║
║                                                          ║
║  📌 luna.ns.cloudflare.com                              ║
║  📌 otto.ns.cloudflare.com                              ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

**📝 COPIE ESSES DOIS NAMESERVERS!**

Eles serão algo como:
- `luna.ns.cloudflare.com`
- `otto.ns.cloudflare.com`

Ou outros nomes (cada conta tem nameservers únicos).

**NÃO FECHE ESTA PÁGINA AINDA!**

---

### PARTE 2: Atualizar Nameservers no Registro.br

#### 6️⃣ Acessar o Registro.br

```
https://registro.br
```

Faça login na sua conta onde você registrou o **ness.tec.br**

---

#### 7️⃣ Acessar o Domínio

1. No menu, procure por **"Meus domínios"** ou **"Domínios"**

2. Clique em **ness.tec.br**

3. Procure por **"DNS"** ou **"Nameservers"** ou **"Servidores DNS"**

---

#### 8️⃣ Mudar os Nameservers

**Você vai ver algo assim (registro.br):**

```
Servidores DNS atuais:
┌────────────────────────────────────────┐
│ DNS1: a.sec.dns.br                     │
│ DNS2: b.sec.dns.br                     │
└────────────────────────────────────────┘

[ Usar DNS do Registro.br ]
[ Usar meus próprios servidores DNS ] ← Escolha esta opção!
```

**Passos:**

1. Selecione **"Usar meus próprios servidores DNS"** (ou similar)

2. **Apague os nameservers antigos**

3. **Cole os nameservers da Cloudflare:**
   - DNS1: `luna.ns.cloudflare.com` (exemplo - use os seus!)
   - DNS2: `otto.ns.cloudflare.com`

4. Clique em **"Salvar"** ou **"Atualizar"**

---

#### 9️⃣ Confirmar no Registro.br

Você verá uma mensagem de confirmação:

```
✅ Nameservers atualizados com sucesso!

Novos servidores:
- luna.ns.cloudflare.com
- otto.ns.cloudflare.com

Propagação: até 24 horas
```

---

### PARTE 3: Finalizar no Cloudflare

#### 🔟 Voltar para o Cloudflare

1. Volte para a aba do Cloudflare que você deixou aberta

2. Clique em **"Done, check nameservers"**

3. Cloudflare vai verificar se você já mudou (pode demorar)

**Você verá:**
```
⏳ Waiting for nameserver update...

This can take up to 24 hours.
We'll email you when it's done.
```

---

#### 1️⃣1️⃣ Aguardar Ativação

**Tempo:** 5 minutos a 24 horas (geralmente < 1 hora)

Você receberá um **email** quando estiver ativo:

```
✅ ness.tec.br is now active on Cloudflare!
```

---

## 🧪 Como Testar se Funcionou

### Teste 1: Via Terminal

```bash
# Linux/Mac
dig NS ness.tec.br

# Ou
nslookup -type=NS ness.tec.br

# Windows PowerShell
nslookup -type=NS ness.tec.br
```

**Esperado (depois da propagação):**
```
ness.tec.br.    nameserver = luna.ns.cloudflare.com.
ness.tec.br.    nameserver = otto.ns.cloudflare.com.
```

---

### Teste 2: Via Online Tools

1. Acesse: https://www.whatsmydns.net/
2. Digite: `ness.tec.br`
3. Selecione: **NS** (Nameserver)
4. Clique em **Search**

Você verá os nameservers em vários países. Quando todos mostrarem `cloudflare.com`, está propagado! ✅

---

### Teste 3: No Dashboard Cloudflare

1. Acesse: https://dash.cloudflare.com
2. Clique em **ness.tec.br**
3. No topo da página você verá:

**Antes:**
```
⚠️ Status: Pending nameserver update
```

**Depois:**
```
✅ Status: Active
```

---

## ⏱️ Linha do Tempo Típica

| Tempo | O Que Acontece |
|-------|----------------|
| **0 min** | Você muda os nameservers no registro.br |
| **5-15 min** | Propagação inicial começa |
| **15-60 min** | Maioria dos servidores DNS já atualizados |
| **1-4 horas** | 95% dos servidores atualizados |
| **24 horas** | 100% propagado globalmente |

**Média real:** 30 minutos a 2 horas ✅

---

## 📊 O Que Muda Depois da Ativação?

### ✅ O que você GANHA:

1. **SSL Automático** - Certificados grátis para ness.tec.br e todos os subdomínios
2. **CDN Global** - Seu site fica mais rápido no mundo todo
3. **DDoS Protection** - Proteção contra ataques
4. **DNS Rápido** - Resolução de DNS em < 20ms
5. **Workers** - Você pode adicionar Custom Domains!

### ✅ O que NÃO muda:

- ❌ Seus emails continuam funcionando (MX records são copiados)
- ❌ Seu site continua no mesmo servidor
- ❌ Você ainda é o dono do domínio no registro.br

**Cloudflare só gerencia o DNS e adiciona proteção/cache.**

---

## 🎯 Depois da Ativação: Configurar Workers

Quando o domínio estiver **Active** no Cloudflare:

### 1. Adicionar Custom Domains

```bash
# Via Dashboard (mais fácil)
1. Cloudflare → Workers & Pages → webhook-receiver
2. Settings → Triggers → Custom Domains
3. Add: webhooks.ness.tec.br

4. Workers & Pages → core-processor
5. Settings → Triggers → Custom Domains
6. Add: api.ness.tec.br
```

✅ **DNS é criado automaticamente!**

### 2. Testar

```bash
# Teste básico (deve retornar 405 - método não permitido)
curl https://webhooks.ness.tec.br

# Teste com webhook real
WEBHOOK_SECRET=$(cat webhook-secret.txt)
PAYLOAD='{"vulnerability_type":"XSS","severity":"HIGH","url":"https://test.com","parameter":"q"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)

curl -X POST https://webhooks.ness.tec.br/ \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

**Esperado:**
```json
{"success":true,"correlation_key":"..."}
```

---

## 🐛 Troubleshooting

### Problema: "Nameserver update not detected"

**Solução:**
1. Aguarde mais tempo (pode demorar 24h)
2. Verifique se copiou os nameservers corretos
3. No registro.br, confirme que salvou as mudanças
4. Use `nslookup -type=NS ness.tec.br` para verificar

---

### Problema: Email parou de funcionar

**Solução:**
1. Cloudflare → ness.tec.br → DNS
2. Verifique se os registros MX existem
3. Se não, adicione manualmente:
   ```
   Tipo: MX
   Nome: @
   Conteúdo: seu.servidor.de.email.com
   Prioridade: 10
   ```

---

### Problema: Site parou de funcionar

**Solução:**
1. Cloudflare → ness.tec.br → DNS
2. Verifique se existe registro A ou CNAME para @ (root)
3. Se não, adicione:
   ```
   Tipo: A
   Nome: @
   Conteúdo: IP.DO.SEU.SERVIDOR
   Proxy: Ativado (nuvem laranja)
   ```

---

### Problema: Demora muito para propagar

**Solução:**
1. É normal! Pode demorar até 24h
2. Limpe cache DNS local:
   ```bash
   # Linux
   sudo systemd-resolve --flush-caches
   
   # Mac
   sudo dscacheutil -flushcache
   
   # Windows
   ipconfig /flushdns
   ```
3. Use DNS público temporariamente:
   - Google: 8.8.8.8
   - Cloudflare: 1.1.1.1

---

## 📋 Checklist Final

- [ ] Conta criada no Cloudflare
- [ ] ness.tec.br adicionado no Cloudflare
- [ ] Plano Free selecionado
- [ ] Nameservers da Cloudflare anotados
- [ ] Login no registro.br
- [ ] Nameservers atualizados no registro.br
- [ ] Cloudflare notificado ("Done, check nameservers")
- [ ] Email de confirmação recebido
- [ ] Status "Active" no Cloudflare
- [ ] DNS propagado (teste com `nslookup`)
- [ ] Custom Domains adicionados para Workers
- [ ] Webhooks funcionando

---

## 🎉 Pronto!

Depois que o domínio estiver **Active**:

**Suas URLs finais:**
- 🌐 **webhooks.ness.tec.br** - Endpoint público
- 🌐 **api.ness.tec.br** - API interna
- 🔒 **SSL automático** em todos!

---

## 📞 Suporte

**Cloudflare:**
- Docs: https://developers.cloudflare.com/dns/
- Support: https://dash.cloudflare.com/?to=/:account/support

**Registro.br:**
- Suporte: https://registro.br/suporte/
- Telefone: 11 5509-3500

**ness.:**
- Email: security@ness.com
