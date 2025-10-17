# 🚀 Processo de Deploy - n.Solve

## 📊 Visão Geral do Deploy Automático

Criei um script que faz **TUDO automaticamente**: `deploy-auto.sh`

---

## 🔄 Fluxo do Deploy Automático

```
┌─────────────────────────────────────────────────────────┐
│ VOCÊ EXECUTA:                                           │
│ ./deploy-auto.sh                                        │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 1: Verificações                                    │
│ ✓ Wrangler instalado?                                   │
│ ✓ Autenticado no Cloudflare?                           │
│ ✓ Dependências npm instaladas?                         │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 2: Criar Recursos                                  │
│ ✓ wrangler d1 create ness_vlm_db                       │
│   → Captura database_id automaticamente                │
│ ✓ wrangler r2 bucket create ness-vlm-storage           │
│ ✓ wrangler kv:namespace create RATE_LIMIT_KV           │
│   → Captura kv_id automaticamente                      │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 3: Atualizar Configuração                         │
│ ✓ Backup wrangler.toml → wrangler.toml.backup         │
│ ✓ sed -i "s/your-d1-database-id/$D1_ID/g"            │
│   (substitui em 3 lugares automaticamente)              │
│ ✓ sed -i "s/your-kv-namespace-id/$KV_ID/g"           │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 4: Inicializar Banco                              │
│ ✓ wrangler d1 execute --file=schema/d1-schema.sql     │
│ ✓ Verifica se tabelas foram criadas                    │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 5: Configurar Secrets                             │
│ ✓ openssl rand -hex 32 → webhook-secret.txt           │
│ ✓ wrangler secret put WEBHOOK_SECRET                   │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 6: Preparar Código                                │
│ ✓ Comenta linha do Jira automaticamente                │
│   sed -i 's/ctx.waitUntil(queueForJira/\/\/...'       │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 7: Deploy Workers (ordem correta)                 │
│ ✓ 1. translation-agent (Durable Object)                │
│ ✓ 2. jira-integration (Durable Object)                 │
│ ✓ 3. core-processor (usa os DOs)                       │
│   → Captura URL do core-processor                      │
│ ✓ 4. webhook-receiver (atualiza com URL do core)       │
│   → Re-deploy automático com URL correta               │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 8: Teste Automático                               │
│ ✓ Gera payload de teste                                │
│ ✓ Calcula HMAC-SHA256                                  │
│ ✓ curl -X POST webhook-receiver                        │
│ ✓ Verifica resposta (success: true?)                   │
│ ✓ Consulta D1 para confirmar persistência              │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 9: Salvar Informações                             │
│ ✓ Cria deployment-urls.txt com todas as URLs           │
│ ✓ Mostra resumo completo                               │
│ ✓ Indica próximos passos                               │
└─────────────────────────────────────────────────────────┘
                    ↓
                 ✅ PRONTO!
```

---

## ⚡ Como Usar o Deploy Automático

### Opção 1: Automático Total (Recomendado)

```bash
cd /home/resper/ness-vlm-cloudflare
./deploy-auto.sh
```

**O script faz TUDO sozinho:**
- ✅ Verifica pré-requisitos
- ✅ Cria todos os recursos
- ✅ Captura IDs automaticamente
- ✅ Atualiza wrangler.toml
- ✅ Executa schema SQL
- ✅ Gera e configura secrets
- ✅ Desabilita Jira
- ✅ Deploy dos 4 workers
- ✅ Testa automaticamente
- ✅ Salva todas as URLs

**Você só precisa:**
1. Estar logado no Cloudflare (`npx wrangler login`)
2. Executar o script
3. Aguardar ~2-3 minutos

---

### Opção 2: Semi-Automático (Etapas)

Se quiser fazer por etapas:

```bash
# 1. Recursos
npx wrangler d1 create ness_vlm_db          # Copiar ID
npx wrangler r2 bucket create ness-vlm-storage
npx wrangler kv:namespace create "RATE_LIMIT_KV"  # Copiar ID

# 2. Atualizar wrangler.toml manualmente

# 3. Schema
npx wrangler d1 execute ness_vlm_db --file=schema/d1-schema.sql

# 4. Secrets
openssl rand -hex 32 | tee webhook-secret.txt | npx wrangler secret put WEBHOOK_SECRET --name webhook-receiver

# 5. Deploy
npx wrangler deploy --name translation-agent
npx wrangler deploy --name jira-integration
npx wrangler deploy --name core-processor
npx wrangler deploy --name webhook-receiver
```

---

### Opção 3: Script de Deploy (Já Exists)

```bash
./scripts/deploy.sh
```

**Este script:**
- ✅ Faz deploy dos workers
- ❌ NÃO cria recursos (você precisa criar antes)
- ❌ NÃO atualiza wrangler.toml

---

## 📊 Comparação dos Scripts

| Script | Cria Recursos | Atualiza Config | Deploy | Testa |
|--------|---------------|-----------------|--------|-------|
| **deploy-auto.sh** | ✅ | ✅ | ✅ | ✅ |
| deploy.sh | ❌ | ❌ | ✅ | ❌ |
| setup-secrets.sh | ❌ | ❌ | ❌ | ❌ |
| setup-domain.sh | ❌ | ❌ | ❌ | ✅ |

**Recomendação:** Use **deploy-auto.sh** na primeira vez!

---

## 🎯 O Que Acontece em Cada Deploy

### Deploy de um Worker:

```
npx wrangler deploy --name webhook-receiver
  ↓
1. Wrangler lê wrangler.toml
2. Compila TypeScript → JavaScript
3. Bundling do código
4. Upload para Cloudflare
5. Deploy em 300+ POPs globalmente
6. Retorna URL
  ↓
✅ https://webhook-receiver.xyz.workers.dev
```

**Tempo:** ~10-30 segundos por worker

---

## 🔍 Como Monitorar o Deploy

### Durante o Deploy:

```bash
# Ver logs em tempo real
npx wrangler tail webhook-receiver --format=pretty

# Em outro terminal, faça o deploy
npx wrangler deploy --name webhook-receiver
```

### Depois do Deploy:

```bash
# Ver últimos deploys
wrangler deployments list --name webhook-receiver

# Ver versões
wrangler versions list --name webhook-receiver

# Rollback se necessário
wrangler rollback --name webhook-receiver --message "Reverting to previous version"
```

---

## 🐛 Troubleshooting do Deploy

### Erro: "Module not found"

```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Invalid configuration"

```bash
# Validar wrangler.toml
npx wrangler deploy --dry-run --name webhook-receiver

# Ver erros detalhados
npx wrangler deploy --name webhook-receiver --verbose
```

### Erro: "Durable Object binding not found"

**Solução:** Deploy os workers com Durable Objects PRIMEIRO:

```bash
npx wrangler deploy --name translation-agent
npx wrangler deploy --name jira-integration
# Depois:
npx wrangler deploy --name core-processor
```

### Deploy muito lento

```bash
# Verificar internet
ping cloudflare.com

# Verificar status Cloudflare
curl https://www.cloudflarestatus.com
```

---

## 📈 Métricas de Deploy

### Tempo Esperado:

| Fase | Tempo |
|------|-------|
| Criar recursos | ~30s |
| Atualizar config | ~1s |
| Executar schema | ~5s |
| Configurar secrets | ~10s |
| Deploy 4 workers | ~60s |
| Teste automático | ~10s |
| **Total** | **~2 minutos** ⚡ |

### Build Size:

| Worker | Size (gzipped) |
|--------|----------------|
| webhook-receiver | ~15 KB |
| core-processor | ~25 KB |
| translation-agent | ~20 KB |
| jira-integration | ~18 KB |
| **Total** | **~78 KB** |

---

## 🎉 Benefícios do Deploy Automático

✅ **Rápido:** 2-3 minutos total
✅ **Confiável:** Sem erros de digitação
✅ **Repetível:** Mesmo resultado sempre
✅ **Documentado:** Salva todas as URLs
✅ **Testado:** Valida que funcionou
✅ **Seguro:** Gera secrets fortes
✅ **Backup:** Salva wrangler.toml original

---

## 📞 Suporte

**Se o deploy automático falhar:**
1. Verifique os logs no terminal
2. Execute manualmente cada comando
3. Abra issue: security@ness.com

**Dashboard Cloudflare:**
- Workers: https://dash.cloudflare.com → Workers & Pages
- D1: https://dash.cloudflare.com → D1
- R2: https://dash.cloudflare.com → R2

---

**Desenvolvido com ❤️ pela ness.**
