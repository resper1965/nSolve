# n.Solve - Módulo de Governança Manual e Edição em Massa

## Visão Geral

O **Módulo de Governança** permite que analistas de segurança sobrescrevam metadados de achados, realizem triage manual, marquem falsos positivos, aceitem riscos e gerenciem achados em massa através de grupos e edição em lote.

---

## 🎯 Funcionalidades Implementadas

### 1. Edição Manual de Achados Individuais
- ✅ Atualização de título (`title_user_edited`)
- ✅ Ajuste manual de severidade (`severity_manual`)
- ✅ Marcação de triage (`is_verified`)
- ✅ Marcação de falso positivo (`is_false_positive`)
- ✅ Aceite de risco (`risk_accepted`)
- ✅ Justificativas (`justification`)
- ✅ Tags customizadas (`tags`)

### 2. Edição em Massa (Bulk Update)
- ✅ Atualização de múltiplos achados simultaneamente
- ✅ Restrição de escopo (mesmo tenant e asset)
- ✅ Validação de integridade

### 3. Agrupamento de Achados
- ✅ Criação de grupos contextuais
- ✅ Validação de integridade (mesmo asset_id e test_run_id)
- ✅ Estatísticas automáticas por grupo
- ✅ Gerenciamento de relacionamentos

---

## 📋 Campos da Interface NSolveFinding

### Campos Imutáveis (NÃO EDITÁVEIS)
```typescript
{
  raw_title: string;              // Título original do scanner
  severidade_original: Severity;  // Severidade original do scanner
  correlation_key: string;        // Chave de correlação
  tenant_id: string;              // Tenant
  created_at: string;             // Data de criação
}
```

**⚠️ CRÍTICO:** Estes campos **NUNCA** podem ser alterados via API de governança.

### Campos Editáveis (Governança Manual)
```typescript
{
  title_user_edited?: string;     // Título customizado pelo analista
  severity_manual?: Severity;     // Severidade ajustada manualmente
  is_verified: boolean;           // Triage confirmado
  is_false_positive: boolean;     // Marcado como FP
  risk_accepted: boolean;         // Risco aceito
  justification?: string;         // Justificativa para FP/Risk Accepted
  tags: string[];                 // Tags do analista
  description: string;            // Descrição (editável)
  status_vlm: StatusVLM;          // Status do VLM
  group_id?: string;              // ID do grupo
}
```

### Campos de Agrupamento
```typescript
{
  test_run_id?: string;           // ID do scan/teste
  group_id?: string;              // ID do grupo
}
```

---

## 🔌 API Endpoints

### Base URL
```
https://governance.ness.tec.br
```

### Autenticação
Todas as requisições requerem JWT token:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

### 1. PATCH /findings/{uuid}
**Edição Manual de um Único Achado**

#### Request
```http
PATCH /findings/vuln-123-456-789
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "title_user_edited": "SQL Injection - Confirmed Critical",
  "severity_manual": "CRITICAL",
  "is_verified": true,
  "tags": ["Q4_2025", "High_Priority", "Customer_Facing"]
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "vuln-123-456-789",
    "raw_title": "SQL Injection in Login",
    "title_user_edited": "SQL Injection - Confirmed Critical",
    "severidade_original": "HIGH",
    "severity_manual": "CRITICAL",
    "is_verified": true,
    "tags": ["Q4_2025", "High_Priority", "Customer_Facing"],
    "updated_at": "2025-10-18T12:34:56Z"
  }
}
```

#### Campos Permitidos
- `title_user_edited`
- `severity_manual`
- `is_verified`
- `is_false_positive`
- `risk_accepted`
- `justification`
- `tags`
- `description`
- `status_vlm`
- `group_id`

#### Erros

**403 Forbidden** - Tentativa de alterar campo imutável:
```json
{
  "error": "Forbidden",
  "message": "Campo 'correlation_key' é imutável e não pode ser alterado"
}
```

**404 Not Found** - Achado não encontrado:
```json
{
  "error": "Not Found",
  "message": "Achado não encontrado ou não pertence ao seu tenant"
}
```

---

### 2. PATCH /findings/bulk_update
**Edição em Massa de Achados**

#### Request
```http
PATCH /findings/bulk_update
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "finding_ids": [
    "vuln-001",
    "vuln-002",
    "vuln-003"
  ],
  "updates": {
    "severity_manual": "HIGH",
    "tags": ["Q4_Focus", "Remediation_Priority"],
    "is_verified": true
  }
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "updated_count": 3,
  "message": "3 achados atualizados com sucesso"
}
```

#### Validações

1. **Tenant Isolation:** Todos os achados devem pertencer ao tenant do usuário
2. **Asset Scope:** Todos os achados devem ser do mesmo `asset_id`
3. **Immutable Fields:** Não permite alteração de campos imutáveis

#### Erros

**403 Forbidden** - Achados de assets diferentes:
```json
{
  "error": "Forbidden",
  "message": "Edição em massa só é permitida para achados do mesmo asset"
}
```

---

### 3. POST /finding-groups
**Criar Grupo de Achados**

#### Request
```http
POST /finding-groups
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "name": "Q4 2025 Critical Findings",
  "description": "Vulnerabilidades críticas para remediar no Q4",
  "finding_ids": [
    "vuln-001",
    "vuln-002",
    "vuln-003"
  ]
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "group_id": "group-abc-def-123",
  "finding_count": 3
}
```

#### Validações de Integridade

1. **Mesmo Asset:** Todos os achados devem compartilhar o mesmo `asset_id`
2. **Mesmo Test Run:** Se `test_run_id` estiver presente, todos devem ter o mesmo
3. **Tenant Isolation:** Todos os achados devem pertencer ao tenant do usuário

#### Estatísticas Automáticas

O grupo calcula automaticamente:
- `finding_count`: Total de achados
- `critical_count`: Achados CRITICAL
- `high_count`: Achados HIGH
- `medium_count`: Achados MEDIUM
- `low_count`: Achados LOW

#### Erros

**403 Forbidden** - Integridade violada:
```json
{
  "error": "Forbidden",
  "message": "Todos os achados de um grupo devem ser do mesmo asset_id"
}
```

---

## 🗄️ Schema do Banco D1

### Tabela: `vulnerabilities` (MODIFICADA)

**Campos Adicionados:**
```sql
-- Título
ALTER TABLE vulnerabilities ADD COLUMN raw_title TEXT;
ALTER TABLE vulnerabilities ADD COLUMN title_user_edited TEXT;

-- Severidade
ALTER TABLE vulnerabilities ADD COLUMN severity_manual TEXT;

-- Governança
ALTER TABLE vulnerabilities ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE vulnerabilities ADD COLUMN is_false_positive BOOLEAN DEFAULT FALSE;
ALTER TABLE vulnerabilities ADD COLUMN risk_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE vulnerabilities ADD COLUMN justification TEXT;
ALTER TABLE vulnerabilities ADD COLUMN tags TEXT; -- JSON array

-- Agrupamento
ALTER TABLE vulnerabilities ADD COLUMN test_run_id TEXT;
ALTER TABLE vulnerabilities ADD COLUMN group_id TEXT;
```

### Tabela: `finding_groups` (NOVA)

```sql
CREATE TABLE finding_groups (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    test_run_id TEXT,
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Estatísticas
    finding_count INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Índices Criados

```sql
CREATE INDEX idx_vuln_group_id ON vulnerabilities(group_id);
CREATE INDEX idx_vuln_test_run ON vulnerabilities(test_run_id);
CREATE INDEX idx_vuln_tags ON vulnerabilities(tags);
CREATE INDEX idx_vuln_governance ON vulnerabilities(is_false_positive, risk_accepted, is_verified);
CREATE INDEX idx_finding_groups_tenant_asset ON finding_groups(tenant_id, asset_id);
```

---

## 🔒 Segurança e Validações

### 1. Campos Imutáveis
```typescript
const IMMUTABLE_FIELDS = [
  'correlation_key',
  'raw_title',
  'severidade_original',
  'created_at',
  'id',
  'tenant_id'
];
```

A API **rejeita** qualquer tentativa de modificar estes campos com `403 Forbidden`.

### 2. Isolamento de Tenant
- Todos os endpoints validam que o achado pertence ao tenant do usuário
- Bulk update valida que **todos** os achados pertencem ao tenant

### 3. Restrição de Escopo (Bulk Update)
- Bulk update só é permitido para achados do **mesmo asset_id**
- Previne atualização acidental de achados não relacionados

### 4. Integridade de Grupos
- Grupos só podem conter achados do **mesmo asset_id**
- Se `test_run_id` estiver presente, todos devem ter o **mesmo test_run_id**
- Garante consistência contextual

### 5. Auditoria
Todas as operações são registradas na tabela `audit_log`:
```sql
INSERT INTO audit_log (
  id, tenant_id, user_id, action, resource_type, resource_id, details
) VALUES (
  'audit-123', 'tenant-001', 'user-456', 'UPDATE', 'finding', 'vuln-789',
  '{"updated_fields": ["severity_manual", "tags"]}'
);
```

---

## 💡 Casos de Uso

### Caso 1: Triage Manual de Vulnerabilidade

**Cenário:** Analista confirma que uma vulnerabilidade de XSS é legítima e ajusta severidade.

```bash
curl -X PATCH https://governance.ness.tec.br/findings/vuln-xss-001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_verified": true,
    "severity_manual": "HIGH",
    "justification": "Confirmado em produção, permite roubo de sessão"
  }'
```

---

### Caso 2: Marcar Falso Positivo

**Cenário:** Analista identifica um SQL Injection como falso positivo.

```bash
curl -X PATCH https://governance.ness.tec.br/findings/vuln-sql-002 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_false_positive": true,
    "justification": "Parametrização correta, WAF em camada superior",
    "status_vlm": "FALSE_POSITIVE"
  }'
```

---

### Caso 3: Aceite de Risco

**Cenário:** Equipe decide aceitar risco de uma vulnerabilidade LOW.

```bash
curl -X PATCH https://governance.ness.tec.br/findings/vuln-low-003 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "risk_accepted": true,
    "justification": "Vulnerabilidade em ambiente interno, sem acesso externo",
    "expiration_date": "2026-01-01",
    "status_vlm": "RISK_ACCEPTED"
  }'
```

---

### Caso 4: Edição em Massa de Prioridades

**Cenário:** Equipe quer marcar todos os achados CRITICAL de um scan como alta prioridade.

```bash
curl -X PATCH https://governance.ness.tec.br/findings/bulk_update \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "finding_ids": ["vuln-001", "vuln-002", "vuln-003", "vuln-004"],
    "updates": {
      "tags": ["Q4_Critical", "High_Priority", "Customer_Impact"],
      "is_verified": true
    }
  }'
```

---

### Caso 5: Criar Grupo de Remedição

**Cenário:** Agrupar vulnerabilidades de um pentest para tracking.

```bash
curl -X POST https://governance.ness.tec.br/finding-groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pentest Q4 2025 - Customer Portal",
    "description": "Vulnerabilidades encontradas no pentest do portal de clientes",
    "finding_ids": [
      "vuln-001", "vuln-002", "vuln-003", 
      "vuln-004", "vuln-005"
    ]
  }'
```

---

## 📊 Queries Úteis

### Achados Verificados (Triage Completo)
```sql
SELECT id, raw_title, severity_manual, is_verified, tags
FROM vulnerabilities
WHERE tenant_id = 'tenant-001'
  AND is_verified = TRUE
ORDER BY severity_manual DESC;
```

### Falsos Positivos com Justificativa
```sql
SELECT id, raw_title, justification, created_at
FROM vulnerabilities
WHERE tenant_id = 'tenant-001'
  AND is_false_positive = TRUE
ORDER BY created_at DESC;
```

### Achados por Tag
```sql
SELECT id, raw_title, tags
FROM vulnerabilities
WHERE tenant_id = 'tenant-001'
  AND tags LIKE '%Q4_Focus%'
ORDER BY created_at DESC;
```

### Estatísticas de Grupo
```sql
SELECT 
  fg.name,
  fg.finding_count,
  fg.critical_count,
  fg.high_count,
  fg.created_at
FROM finding_groups fg
WHERE fg.tenant_id = 'tenant-001'
ORDER BY fg.created_at DESC;
```

### Achados de um Grupo
```sql
SELECT v.id, v.raw_title, v.severity_manual
FROM vulnerabilities v
WHERE v.group_id = 'group-123'
ORDER BY v.severity_manual DESC;
```

---

## 🚀 Deployment

### Worker Deployed
- **Nome:** `governance-api`
- **Version ID:** `4bfd94cd-b9d2-4a97-86e8-879376bf36d7`
- **Endpoint:** `https://governance.ness.tec.br/*`
- **Status:** ✅ DEPLOYED

### Schema Aplicado
```bash
wrangler d1 execute ness_vlm_db \
  --file=schema/d1-governance-fields.sql \
  --remote
```

**Resultado:** ✅ 18 queries executadas, 20 rows escritas

---

## 🎯 Próximos Passos

### 1. Frontend UI
Criar interfaces para:
- Editor de achados individuais
- Bulk editor com seleção múltipla
- Gerenciador de grupos
- Dashboard de triage

### 2. Notificações
Implementar alertas quando:
- Achado marcado como falso positivo
- Risco aceito (requer aprovação)
- Grupo criado/modificado

### 3. Workflows de Aprovação
- Falsos positivos requerem aprovação de 2 analistas
- Aceite de risco requer aprovação de gerente
- Histórico de aprovações

### 4. Analytics
- Taxa de falsos positivos por scanner
- Taxa de verificação (triage)
- Tempo médio de triage
- Distribuição de tags

---

## ✅ Checklist de Implementação

- [x] Interface `NSolveFinding` estendida com campos de governança
- [x] Worker `governance-api` criado
- [x] Endpoint PATCH /findings/{uuid} implementado
- [x] Endpoint PATCH /findings/bulk_update implementado
- [x] Endpoint POST /finding-groups implementado
- [x] Tabela `finding_groups` criada no D1
- [x] Campos de governança adicionados à tabela `vulnerabilities`
- [x] Índices otimizados criados
- [x] Validações de campos imutáveis implementadas
- [x] Restrições de escopo (tenant, asset) implementadas
- [x] Auditoria de alterações implementada
- [x] Schema D1 aplicado
- [x] Worker deployed
- [x] JWT_SECRET configurado
- [x] Documentação completa

---

**Módulo de Governança implementado com sucesso!** 🎉
