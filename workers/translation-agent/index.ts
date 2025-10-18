/**
 * n.Solve - Translation Agent
 * Tradução técnica de vulnerabilidades usando Workers AI
 */

export interface Env {
  AI: any;
  VLM_DB: D1Database;
}

/**
 * Traduz e contextualiza descrição de vulnerabilidade
 */
async function translateAndContextualize(
  text: string,
  targetLang: string,
  env: Env
): Promise<string> {
  try {
    const prompt = `You are a cybersecurity expert translator. Translate this technical vulnerability description to ${targetLang}, maintaining technical accuracy and context.

Original text:
${text}

Provide ONLY the translated text, no explanations.`;

    const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        {
          role: 'system',
          content: 'You are a technical translator specializing in cybersecurity. Translate accurately and maintain technical terms.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return response.response || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original
  }
}

/**
 * Main Worker Handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // POST /translate - Translate text
      if (url.pathname === '/translate' && request.method === 'POST') {
        const body = await request.json() as any;
        const { text, target_language = 'pt-BR' } = body;

        if (!text) {
          return new Response(JSON.stringify({ error: 'Text is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const translated = await translateAndContextualize(text, target_language, env);

        return new Response(JSON.stringify({
          success: true,
          data: {
            original: text,
            translated,
            target_language
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /translate-vulnerability - Translate vulnerability description
      if (url.pathname === '/translate-vulnerability' && request.method === 'POST') {
        const body = await request.json() as any;
        const { vulnerability_id, target_language = 'pt-BR' } = body;

        if (!vulnerability_id) {
          return new Response(JSON.stringify({ error: 'vulnerability_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get vulnerability from database
        const vuln = await env.VLM_DB
          .prepare('SELECT * FROM vulnerabilities WHERE id = ?')
          .bind(vulnerability_id)
          .first();

        if (!vuln) {
          return new Response(JSON.stringify({ error: 'Vulnerability not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Translate description
        const translatedDesc = await translateAndContextualize(
          (vuln as any).description,
          target_language,
          env
        );

        return new Response(JSON.stringify({
          success: true,
          data: {
            vulnerability_id,
            original_description: (vuln as any).description,
            translated_description: translatedDesc,
            target_language
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /batch-translate - Translate multiple vulnerabilities
      if (url.pathname === '/batch-translate' && request.method === 'POST') {
        const body = await request.json() as any;
        const { vulnerability_ids, target_language = 'pt-BR' } = body;

        if (!vulnerability_ids || !Array.isArray(vulnerability_ids)) {
          return new Response(JSON.stringify({ error: 'vulnerability_ids array is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const results = [];

        for (const vulnId of vulnerability_ids.slice(0, 10)) { // Limit to 10 per request
          const vuln = await env.VLM_DB
            .prepare('SELECT * FROM vulnerabilities WHERE id = ?')
            .bind(vulnId)
            .first();

          if (vuln) {
            const translated = await translateAndContextualize(
              (vuln as any).description,
              target_language,
              env
            );

            results.push({
              vulnerability_id: vulnId,
              translated_description: translated
            });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          count: results.length,
          data: results
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Health check
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          worker: 'translation-agent',
          ai_available: !!env.AI,
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
      console.error('Translation Agent Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};
