/**
 * n.Solve - Jira Integration Worker
 * Cloudflare Workers - Edge Computing
 * 
 * Responsabilidades:
 * - Criar tickets no Jira via REST API
 * - Atualizar tickets existentes
 * - Mapear severidade → prioridade
 */

export interface Env {
  JIRA_BASE_URL: string;
  JIRA_USER: string;
  JIRA_API_TOKEN: string;
  JIRA_PROJECT_KEY: string;
  
  VLM_DB: D1Database;
}

export interface Finding {
  correlation_key: string;
  vulnerability_type: string;
  severity: string;
  url_target: string;
  affected_param: string;
  description: string;
  recommendation: string;
  tool_source: string;
  scan_timestamp: string;
  asset_name: string;
}

/**
 * Mapeia severidade para prioridade Jira
 */
const SEVERITY_TO_PRIORITY: Record<string, string> = {
  'CRITICAL': 'Highest',
  'HIGH': 'High',
  'MEDIUM': 'Medium',
  'LOW': 'Low',
  'INFORMATIONAL': 'Lowest'
};

/**
 * Cria ticket no Jira
 * 
 * Migrado de Python requests para fetch API
 */
async function createJiraIssue(
  env: Env,
  finding: Finding
): Promise<string> {
  const priority = SEVERITY_TO_PRIORITY[finding.severity] || 'Medium';
  
  // Summary
  const summary = `[${finding.severity}] ${finding.vulnerability_type} - ${finding.asset_name}`;
  
  // Description em formato Jira Wiki Markup
  const description = `h2. Detalhes da Vulnerabilidade

*Tipo:* ${finding.vulnerability_type}
*Severidade:* ${finding.severity}
*Ativo:* ${finding.asset_name}
*URL Alvo:* ${finding.url_target}
*Parâmetro Afetado:* ${finding.affected_param}

h3. Descrição
${finding.description || 'N/A'}

h3. Recomendação
${finding.recommendation || 'N/A'}

h3. Informações Técnicas
*Chave de Correlação:* ${finding.correlation_key}
*Ferramenta de Origem:* ${finding.tool_source}
*Timestamp do Scan:* ${finding.scan_timestamp}

---
_Ticket criado automaticamente pelo n.Solve (Cloudflare Edge)_`;

  // Payload Jira API v3
  const payload = {
    fields: {
      project: {
        key: env.JIRA_PROJECT_KEY
      },
      summary: summary,
      description: description,
      issuetype: {
        name: 'Bug'
      },
      priority: {
        name: priority
      },
      labels: [
        'security',
        'vulnerability',
        finding.vulnerability_type.replace(/\s+/g, '-').toLowerCase(),
        `severity-${finding.severity.toLowerCase()}`
      ]
    }
  };
  
  // Basic Auth
  const credentials = btoa(`${env.JIRA_USER}:${env.JIRA_API_TOKEN}`);
  
  const response = await fetch(`${env.JIRA_BASE_URL}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jira API error: ${response.status} - ${errorText}`);
  }
  
  const data: any = await response.json();
  return data.key; // Ex: 'APPWEB-1234'
}

/**
 * Atualiza finding no D1 com ticket Jira
 */
async function updateFindingWithJiraTicket(
  db: D1Database,
  correlationKey: string,
  jiraKey: string
): Promise<void> {
  await db
    .prepare(`
      UPDATE vulnerabilities 
      SET jira_ticket_key = ?
      WHERE correlation_key = ?
    `)
    .bind(jiraKey, correlationKey)
    .run();
}

/**
 * Durable Object para fila de Jira
 */
export class JiraQueue {
  state: DurableObjectState;
  env: Env;
  queue: Finding[] = [];
  processing: boolean = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/enqueue' && request.method === 'POST') {
      const finding: Finding = await request.json();
      this.queue.push(finding);
      
      if (!this.processing) {
        this.processQueue();
      }
      
      return new Response('Enqueued', { status: 202 });
    }
    
    if (url.pathname === '/status') {
      return new Response(
        JSON.stringify({
          queue_length: this.queue.length,
          processing: this.processing
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response('Not found', { status: 404 });
  }

  async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const finding = this.queue.shift()!;
      
      try {
        // Cria ticket Jira
        const jiraKey = await createJiraIssue(this.env, finding);
        
        // Atualiza no D1
        await updateFindingWithJiraTicket(
          this.env.VLM_DB,
          finding.correlation_key,
          jiraKey
        );
        
        console.log(`Jira ticket created: ${jiraKey} for ${finding.correlation_key}`);
        
      } catch (error) {
        console.error(`Jira error for ${finding.correlation_key}:`, error);
        // Poderia implementar retry logic aqui
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    this.processing = false;
  }
}

/**
 * Worker principal (HTTP endpoint)
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    
    try {
      const finding: Finding = await request.json();
      
      const jiraKey = await createJiraIssue(env, finding);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          jira_key: jiraKey 
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
};
