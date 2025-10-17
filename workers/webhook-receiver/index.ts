/**
 * ness. VLM Tracker - Webhook Receiver Worker
 * Cloudflare Workers - Edge Computing
 * 
 * Responsabilidades:
 * - Receber webhooks de ferramentas de pentest
 * - Validar autenticidade (HMAC-SHA256)
 * - Rate limiting via Cloudflare
 * - Enviar para Core Processor
 */

export interface Env {
  WEBHOOK_SECRET: string;
  CORE_PROCESSOR_URL: string;
  
  // KV para rate limiting (opcional, complementa o rate limiting nativo)
  RATE_LIMIT_KV: KVNamespace;
}

/**
 * Valida assinatura HMAC-SHA256 do webhook
 * 
 * Headers esperados:
 * X-Webhook-Signature: sha256=<hash>
 */
async function validateSignature(
  request: Request,
  secret: string
): Promise<boolean> {
  const signature = request.headers.get('X-Webhook-Signature');
  
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }
  
  const providedHash = signature.substring(7); // Remove 'sha256='
  
  // Clone request para ler body (só pode ser lido uma vez)
  const body = await request.clone().text();
  
  // Calcula HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature_buffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  
  // Converte para hex
  const hashArray = Array.from(new Uint8Array(signature_buffer));
  const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return calculatedHash === providedHash;
}

/**
 * Verifica rate limit por IP
 */
async function checkRateLimit(
  kv: KVNamespace,
  ip: string
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rate_limit:${ip}`;
  const limit = 100; // 100 requests
  const window = 60; // por minuto
  
  const current = await kv.get(key);
  const count = current ? parseInt(current) : 0;
  
  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  
  // Incrementa contador
  await kv.put(key, (count + 1).toString(), { expirationTtl: window });
  
  return { allowed: true, remaining: limit - count - 1 };
}

/**
 * Handler principal do Worker
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Signature',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Apenas POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders
      });
    }
    
    try {
      // Rate limiting por IP
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      
      if (env.RATE_LIMIT_KV) {
        const rateLimit = await checkRateLimit(env.RATE_LIMIT_KV, ip);
        
        if (!rateLimit.allowed) {
          return new Response('Rate limit exceeded', {
            status: 429,
            headers: {
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': '60',
              ...corsHeaders
            }
          });
        }
      }
      
      // Validação de assinatura (segurança)
      const isValid = await validateSignature(request, env.WEBHOOK_SECRET);
      
      if (!isValid) {
        console.warn(`Invalid signature from IP: ${ip}`);
        
        return new Response('Invalid signature', {
          status: 401,
          headers: corsHeaders
        });
      }
      
      // Forward para Core Processor
      const body = await request.text();
      
      const response = await fetch(env.CORE_PROCESSOR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': ip,
          'X-Source': 'webhook-receiver'
        },
        body: body
      });
      
      // Log de auditoria
      console.log({
        timestamp: new Date().toISOString(),
        ip: ip,
        status: response.status,
        url: new URL(request.url).pathname
      });
      
      // Retorna resposta do Core Processor
      const responseBody = await response.text();
      
      return new Response(responseBody, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
      
    } catch (error) {
      console.error('Webhook receiver error:', error);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal server error'
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
