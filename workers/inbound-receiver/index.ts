/**
 * n.Solve - Inbound Receiver Worker
 * Webhook listener para receber payloads de ferramentas de pentest
 */

import { handlePentestToolsPayload } from './adapters/pentest-tools-adapter';
import { handleZapPayload } from './adapters/zap-adapter';
import { handleJiraWebhook } from './handlers/jira-webhook-handler';
import { handleAdoServiceHook } from './handlers/ado-webhook-handler';

export interface Env {
  VLM_DB: D1Database;
  CORRELATION_ENGINE: DurableObjectNamespace;
  JWT_SECRET: string;
}

/**
 * Verificar HMAC signature para segurança
 */
async function verifyHMAC(request: Request, secret: string): Promise<boolean> {
  const signature = request.headers.get('X-Signature');
  if (!signature) return false;

  const body = await request.clone().text();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return signature === expectedSignature;
}

/**
 * Main Worker Handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Source-Tool, X-Signature',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route: POST /webhook - Receive pentest tool webhooks
      if (url.pathname === '/webhook' && request.method === 'POST') {
        const sourceTool = request.headers.get('X-Source-Tool');

        if (!sourceTool) {
          return new Response(JSON.stringify({ error: 'Missing X-Source-Tool header' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Verificar HMAC (opcional mas recomendado)
        // const isValid = await verifyHMAC(request, env.WEBHOOK_SECRET || 'default-secret');
        // if (!isValid) {
        //   return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
        // }

        const payload = await request.json();

        // Save raw payload to R2 for future analysis
        const scanId = crypto.randomUUID();
        const rawKey = `raw_scans/${scanId}.json`;
        await env.VLM_STORAGE.put(rawKey, JSON.stringify({
          scan_id: scanId,
          source_tool: sourceTool,
          received_at: new Date().toISOString(),
          payload: payload
        }, null, 2), {
          httpMetadata: {
            contentType: 'application/json',
          },
        });

        console.log(`✅ Raw payload saved to R2: ${rawKey}`);

        let result;
        switch (sourceTool.toLowerCase()) {
          case 'pentest-tools':
            result = await handlePentestToolsPayload(payload, env);
            break;
          case 'zap':
          case 'owasp-zap':
            result = await handleZapPayload(payload, env);
            break;
          default:
            return new Response(JSON.stringify({ error: 'Unknown source tool' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Route: POST /jira-status-update - Receive Jira webhook callbacks
      if (url.pathname === '/jira-status-update' && request.method === 'POST') {
        const payload = await request.json();
        const result = await handleJiraWebhook(payload, env);

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Route: POST /ado-service-hook - Receive Azure DevOps webhooks
      if (url.pathname === '/ado-service-hook' && request.method === 'POST') {
        const payload = await request.json();
        const result = await handleAdoServiceHook(payload, env);

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Health check
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ 
          status: 'healthy',
          worker: 'inbound-receiver',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Inbound Receiver Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};

