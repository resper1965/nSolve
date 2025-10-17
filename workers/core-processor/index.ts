/**
 * ness. VLM Tracker - Core Processor Worker
 * Cloudflare Workers - Edge Computing
 * 
 * Responsabilidades:
 * - Gerar chave de correlação determinística (SHA-256)
 * - Normalizar achados de ferramentas de pentest
 * - Persistir no D1 (SQLite)
 * - Orquestrar próximos passos (tradução, Jira)
 */

export interface Env {
  // D1 Database binding
  VLM_DB: D1Database;
  
  // Durable Object bindings
  TRANSLATION_QUEUE: DurableObjectNamespace;
  JIRA_QUEUE: DurableObjectNamespace;
  
  // R2 Storage binding
  VLM_STORAGE: R2Bucket;
  
  // Secrets
  WEBHOOK_SECRET: string;
  JIRA_BASE_URL: string;
  JIRA_USER: string;
  JIRA_API_TOKEN: string;
}

export interface RawFinding {
  vulnerability_type: string;
  severity: string;
  url: string;
  parameter: string;
  description?: string;
  recommendation?: string;
  tool_name?: string;
  timestamp?: string;
  asset_name?: string;
  project_id?: string;
}

export interface NormalizedFinding {
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
  project_id: string;
  status: string;
}

/**
 * Gera chave de correlação SHA-256 determinística
 * 
 * Reescrito de Python para TypeScript
 * Mantém a mesma lógica: hash(tipo + url + param)
 */
async function generateCorrelationKey(
  vulnerabilityType: string,
  urlTarget: string,
  affectedParam: string
): Promise<string> {
  // Normaliza as entradas (lowercase e trim)
  const normalizedType = vulnerabilityType.trim().toLowerCase();
  const normalizedUrl = urlTarget.trim().toLowerCase();
  const normalizedParam = affectedParam.trim().toLowerCase();
  
  // Concatena com pipe separator
  const concatenated = `${normalizedType}|${normalizedUrl}|${normalizedParam}`;
  
  // Gera SHA-256 usando Web Crypto API (disponível no Workers)
  const encoder = new TextEncoder();
  const data = encoder.encode(concatenated);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Converte para hexadecimal
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Normaliza um achado bruto de ferramentas de pentest
 */
async function normalizeFinding(rawFinding: RawFinding): Promise<NormalizedFinding> {
  const correlationKey = await generateCorrelationKey(
    rawFinding.vulnerability_type,
    rawFinding.url,
    rawFinding.parameter
  );
  
  return {
    correlation_key: correlationKey,
    vulnerability_type: rawFinding.vulnerability_type,
    severity: rawFinding.severity.toUpperCase(),
    url_target: rawFinding.url,
    affected_param: rawFinding.parameter,
    description: rawFinding.description || '',
    recommendation: rawFinding.recommendation || '',
    tool_source: rawFinding.tool_name || 'Unknown',
    scan_timestamp: rawFinding.timestamp || new Date().toISOString(),
    asset_name: rawFinding.asset_name || 'Unknown Asset',
    project_id: rawFinding.project_id || 'default',
    status: 'open'
  };
}

/**
 * Persiste achado no D1 Database
 */
async function persistFinding(
  db: D1Database,
  finding: NormalizedFinding
): Promise<void> {
  // Verifica se já existe (por correlation_key)
  const existing = await db
    .prepare('SELECT id, detection_count FROM vulnerabilities WHERE correlation_key = ?')
    .bind(finding.correlation_key)
    .first();
  
  if (existing) {
    // Atualiza: incrementa counter e atualiza last_detected
    await db
      .prepare(`
        UPDATE vulnerabilities 
        SET 
          last_detected = ?,
          detection_count = detection_count + 1,
          status = CASE WHEN status = 'closed' THEN 'reopened' ELSE status END
        WHERE correlation_key = ?
      `)
      .bind(finding.scan_timestamp, finding.correlation_key)
      .run();
    
    console.log(`Updated existing finding: ${finding.correlation_key}`);
  } else {
    // Insere novo achado
    await db
      .prepare(`
        INSERT INTO vulnerabilities (
          correlation_key, vulnerability_type, severity, url_target, 
          affected_param, description, recommendation, tool_source,
          scan_timestamp, asset_name, project_id, status,
          first_detected, last_detected, detection_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        finding.correlation_key,
        finding.vulnerability_type,
        finding.severity,
        finding.url_target,
        finding.affected_param,
        finding.description,
        finding.recommendation,
        finding.tool_source,
        finding.scan_timestamp,
        finding.asset_name,
        finding.project_id,
        finding.status,
        finding.scan_timestamp,
        finding.scan_timestamp,
        1
      )
      .run();
    
    console.log(`Inserted new finding: ${finding.correlation_key}`);
  }
}

/**
 * Enfileira achado para tradução via Durable Object
 */
async function queueForTranslation(
  namespace: DurableObjectNamespace,
  finding: NormalizedFinding
): Promise<void> {
  const id = namespace.idFromName('translation-queue');
  const stub = namespace.get(id);
  
  await stub.fetch('https://dummy/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      correlation_key: finding.correlation_key,
      recommendation: finding.recommendation,
      target_language: 'pt-BR',
      tech_stack: 'Python/Django' // TODO: extrair do asset metadata
    })
  });
}

/**
 * Enfileira achado para criação de ticket Jira
 */
async function queueForJira(
  namespace: DurableObjectNamespace,
  finding: NormalizedFinding
): Promise<void> {
  const id = namespace.idFromName('jira-queue');
  const stub = namespace.get(id);
  
  await stub.fetch('https://dummy/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(finding)
  });
}

/**
 * Handler principal do Worker
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle OPTIONS (CORS preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Apenas POST é permitido
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders
      });
    }
    
    try {
      // Parse do body
      const rawFinding: RawFinding = await request.json();
      
      // Validação básica
      if (!rawFinding.vulnerability_type || !rawFinding.url || !rawFinding.parameter) {
        return new Response('Missing required fields', { 
          status: 400,
          headers: corsHeaders
        });
      }
      
      // Normaliza o achado
      const normalized = await normalizeFinding(rawFinding);
      
      // Persiste no D1
      await persistFinding(env.VLM_DB, normalized);
      
      // Enfileira para tradução (async, não bloqueia)
      ctx.waitUntil(queueForTranslation(env.TRANSLATION_QUEUE, normalized));
      
      // Enfileira para Jira (async, não bloqueia)
      ctx.waitUntil(queueForJira(env.JIRA_QUEUE, normalized));
      
      // Armazena raw finding no R2 (backup)
      const rawKey = `findings/${normalized.correlation_key}/${Date.now()}.json`;
      ctx.waitUntil(
        env.VLM_STORAGE.put(rawKey, JSON.stringify(rawFinding, null, 2))
      );
      
      return new Response(
        JSON.stringify({
          success: true,
          correlation_key: normalized.correlation_key,
          message: 'Finding processed successfully'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
      
    } catch (error) {
      console.error('Error processing finding:', error);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
  }
};
