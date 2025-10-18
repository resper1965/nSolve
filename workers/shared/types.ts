/**
 * n.Solve - Shared Types and Interfaces
 * Modelo Canônico de Dados (CDM)
 */

/**
 * Status VLM (Vulnerability Lifecycle Management)
 * Termos formais com transições controladas
 */
export type StatusVLM = 
  | 'ACTIVE'                      // Achado ativo, aguardando triagem
  | 'ACTIVE_VERIFIED'             // Achado ativo e verificado (confirmado)
  | 'UNDER_REVIEW'                // Em análise/revisão
  | 'INACTIVE_MITIGATED'          // Inativo - Corrigido/Mitigado
  | 'INACTIVE_FALSE_POSITIVE'     // Inativo - Falso Positivo (BLOQUEADO para reativação)
  | 'INACTIVE_RISK_ACCEPTED'      // Inativo - Risco Aceito pela organização
  | 'INACTIVE_OUT_OF_SCOPE'       // Inativo - Fora de escopo
  | 'INACTIVE_DUPLICATE';         // Inativo - Duplicado (legado)

/**
 * Status Transitions Map
 * Define transições permitidas entre status
 */
export const STATUS_TRANSITIONS: Record<StatusVLM, StatusVLM[]> = {
  'ACTIVE': [
    'ACTIVE_VERIFIED',
    'UNDER_REVIEW',
    'INACTIVE_MITIGATED',
    'INACTIVE_FALSE_POSITIVE',
    'INACTIVE_RISK_ACCEPTED',
    'INACTIVE_OUT_OF_SCOPE',
  ],
  'ACTIVE_VERIFIED': [
    'UNDER_REVIEW',
    'INACTIVE_MITIGATED',
    'INACTIVE_FALSE_POSITIVE',
    'INACTIVE_RISK_ACCEPTED',
    'INACTIVE_OUT_OF_SCOPE',
  ],
  'UNDER_REVIEW': [
    'ACTIVE',
    'ACTIVE_VERIFIED',
    'INACTIVE_MITIGATED',
    'INACTIVE_FALSE_POSITIVE',
    'INACTIVE_RISK_ACCEPTED',
    'INACTIVE_OUT_OF_SCOPE',
  ],
  'INACTIVE_MITIGATED': [
    'ACTIVE',  // Reativação permitida (regressão)
    'ACTIVE_VERIFIED',
  ],
  'INACTIVE_FALSE_POSITIVE': [
    // BLOQUEADO: Não permite nenhuma transição automática
    // Apenas edição manual pode alterar
  ],
  'INACTIVE_RISK_ACCEPTED': [
    'ACTIVE',  // Reativação se risco não for mais aceito
    'ACTIVE_VERIFIED',
  ],
  'INACTIVE_OUT_OF_SCOPE': [
    'ACTIVE',  // Reativação se voltar ao escopo
    'ACTIVE_VERIFIED',
  ],
  'INACTIVE_DUPLICATE': [
    // Duplicados geralmente não são reativados
  ],
};

/**
 * Check if status transition is allowed
 */
export function isStatusTransitionAllowed(from: StatusVLM, to: StatusVLM): boolean {
  const allowedTransitions = STATUS_TRANSITIONS[from] || [];
  return allowedTransitions.includes(to);
}

/**
 * Severity Levels
 */
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

/**
 * Location Types
 */
export type LocationType = 'WEB' | 'API' | 'MOBILE' | 'INFRASTRUCTURE' | 'CODE';

/**
 * System Types for Ticket Creation
 */
export type SystemType = 'JIRA' | 'ADO' | 'SERVICENOW' | 'GITHUB';

/**
 * n.Solve Finding (Modelo Canônico de Dados)
 */
export interface NSolveFinding {
  // Identificação
  id: string;
  tenant_id: string;
  asset_id: string;
  correlation_key: string;
  
  // Dados da Vulnerabilidade (Scanner Original - IMUTÁVEL)
  raw_title: string;                    // Título original do scanner (NÃO EDITÁVEL)
  title_user_edited?: string;           // Título editado pelo analista
  description: string;
  severidade_original: Severity;        // Severidade do scanner (NÃO EDITÁVEL)
  severidade_ajustada: Severity;        // Severidade ajustada automaticamente
  severity_manual?: Severity;           // Severidade ajustada MANUALMENTE pelo analista
  location_type: LocationType;
  source_tool: string;
  
  // CVE/CWE
  cve?: string;
  cvss_score?: number;
  cwe?: string;
  
  // Status e Lifecycle
  status: string; // open, in_progress, resolved, closed
  status_vlm: StatusVLM;
  
  // Governança Manual
  is_verified: boolean;                 // Confirmação manual do achado (Triage)
  is_false_positive: boolean;           // Marcação de Falso Positivo
  risk_accepted: boolean;               // Marcação de Aceite de Risco
  justification?: string;               // Justificativa para FP ou Risk Accepted
  tags: string[];                       // Tags do analista (ex: ["Q4_Focus", "High_Priority"])
  
  // Governança Legada (mantida para compatibilidade)
  justificativa_desativacao?: string;   // Deprecated - usar 'justification'
  expiration_date?: string;             // Para exceções temporárias
  control_mapping: string[];            // Controles de compliance (ex: ["NIST-800-53", "PCI-DSS-6.5.1"])
  
  // Agrupamento (para análise contextual)
  test_run_id?: string;                 // ID do teste/scan que gerou o achado
  group_id?: string;                    // ID do grupo ao qual o achado pertence
  
  // Timestamps
  created_at: string;
  updated_at: string;
  first_seen_at: string;
  last_seen_at: string;
  fixed_at?: string;
  last_status_change_date?: string;     // Data da última mudança de status (para SLA)
  
  // Compatibilidade com código existente
  titulo?: string;                      // Alias para raw_title (deprecated)
}

/**
 * Deduplication Scope
 */
export type DeduplicationScope = 'ASSET' | 'TENANT';

/**
 * Asset Configuration
 */
export interface AssetConfig {
  id: string;
  tenant_id: string;
  name: string;
  asset_type: string;
  
  // Orquestração Modular
  system_type: SystemType;
  
  // SLA Configuration
  sla_config: {
    CRITICAL: number;  // Dias para resolver (ex: 7)
    HIGH: number;      // Dias para resolver (ex: 30)
    MEDIUM: number;    // Dias para resolver (ex: 90)
    LOW?: number;      // Dias para resolver (ex: 180)
  };
  
  // Deduplication Policy
  enable_deduplication: boolean;           // Ativa/desativa deduplicação
  deduplication_scope: DeduplicationScope; // Escopo da busca ('ASSET' | 'TENANT')
  delete_duplicate_findings: boolean;      // Auto-deletar duplicatas antigas
  max_duplicates: number;                  // Máximo de duplicatas permitidas
  
  // Reimport Policy (para CI/CD recorrente)
  reimport_enabled: boolean;               // Ativa/desativa módulo de reimportação
  close_old_findings: boolean;             // Fechar achados não encontrados no scan atual
  do_not_reactivate: boolean;              // Não reabrir achados previamente fechados
  
  // Azure DevOps Configuration
  ado_config?: {
    url: string;              // https://dev.azure.com/organization
    pat: string;              // Personal Access Token
    project: string;          // Project name
    area_path?: string;       // Work item area
    iteration_path?: string;  // Work item iteration
  };
  
  // Jira Configuration
  jira_config?: {
    url: string;              // https://company.atlassian.net
    email: string;
    token: string;
    project: string;          // Project key (ex: VULN)
    issue_type?: string;      // Default: Bug
    custom_field_id?: string; // Para armazenar vuln_id
  };
  
  // GitHub Configuration (para PR commenting)
  github_config?: {
    owner: string;
    repo: string;
    token: string;
  };
  
  // Notification Configuration
  notification_config?: {
    slack_webhook?: string;
    pagerduty_key?: string;
    email_recipients?: string[];
  };
  
  // Settings
  auto_create_tickets: boolean;
  auto_triage_enabled: boolean;
  sla_monitoring_enabled: boolean;
  
  created_at: string;
  updated_at: string;
}

/**
 * Governance Rule
 */
export interface GovernanceRule {
  id: string;
  tenant_id: string;
  rule_type: 'SUPPRESS' | 'ESCALATE' | 'AUTO_ACCEPT';
  
  // Conditions
  severity?: Severity;
  cwe_list?: string[];
  source_tools?: string[];
  
  // Actions
  auto_justify?: string;
  expiration_days?: number;
  
  enabled: boolean;
  created_at: string;
}

/**
 * Triage Decision
 */
export interface TriageDecision {
  finding_id: string;
  decision: 'VALIDATE' | 'FALSE_POSITIVE' | 'RISK_ACCEPT' | 'DUPLICATE';
  justification: string;
  decided_by: string;
  decided_at: string;
}

