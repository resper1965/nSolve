/**
 * n.Solve - Translation Agent Worker
 * Cloudflare Workers AI - Edge Computing
 * 
 * Responsabilidades:
 * - Traduzir recomendações técnicas usando Workers AI
 * - Contextualizar para tech stack específica
 * - Formato de task para desenvolvedores
 */

export interface Env {
  // Workers AI binding
  AI: any; // Cloudflare AI binding
  
  // D1 Database
  VLM_DB: D1Database;
}

export interface TranslationRequest {
  correlation_key: string;
  recommendation: string;
  target_language: string;
  tech_stack: string;
}

/**
 * Mapeia códigos de idioma para nomes completos
 */
const LANGUAGE_NAMES: Record<string, string> = {
  'pt-BR': 'português brasileiro',
  'en': 'inglês',
  'es': 'espanhol',
  'fr': 'francês',
  'de': 'alemão',
  'it': 'italiano',
  'ja': 'japonês',
  'zh': 'chinês',
  'ko': 'coreano'
};

/**
 * Traduz e contextualiza recomendação usando Workers AI
 * 
 * Migrado de Vertex AI/Gemini para Workers AI
 */
async function translateAndContextualize(
  ai: any,
  recommendationText: string,
  targetLanguage: string,
  techStack: string
): Promise<string> {
  const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  
  // Prompt otimizado para Workers AI (Llama 2 ou similar)
  const prompt = `Você é um especialista em segurança de aplicações e tradução técnica.

Sua tarefa é:
1. Traduzir a seguinte recomendação de segurança para ${languageName}
2. Reescrever o texto no formato de TASK para desenvolvedores
3. Contextualizar a recomendação especificamente para um projeto que usa: ${techStack}

IMPORTANTE:
- Use linguagem clara e direta, como se estivesse delegando uma tarefa
- Comece com "Task:" seguido de um título conciso
- No corpo, faça referência específica ao tech stack (ex: "Em seu projeto Django, ...")
- Inclua exemplos de código quando apropriado para o tech stack mencionado
- Mantenha o tom profissional mas acessível
- Foque em ações práticas que o desenvolvedor deve tomar

Recomendação Original:
${recommendationText}

Traduza e contextualize agora:`;

  try {
    // Chama Workers AI
    // Modelo: @cf/meta/llama-2-7b-chat-int8 ou @cf/mistral/mistral-7b-instruct-v0.1
    const response = await ai.run('@cf/meta/llama-2-7b-chat-int8', {
      prompt: prompt,
      max_tokens: 512,
      temperature: 0.3 // Baixa temperatura para consistência
    });
    
    return response.response || response.text || recommendationText;
    
  } catch (error) {
    console.error('Workers AI error:', error);
    // Fallback: retorna original
    return recommendationText;
  }
}

/**
 * Atualiza achado no D1 com recomendação traduzida
 */
async function updateFindingWithTranslation(
  db: D1Database,
  correlationKey: string,
  translatedRecommendation: string,
  targetLanguage: string
): Promise<void> {
  await db
    .prepare(`
      UPDATE vulnerabilities 
      SET 
        recommendation_translated = ?,
        translation_language = ?
      WHERE correlation_key = ?
    `)
    .bind(translatedRecommendation, targetLanguage, correlationKey)
    .run();
}

/**
 * Durable Object para fila de tradução
 */
export class TranslationQueue {
  state: DurableObjectState;
  env: Env;
  queue: TranslationRequest[] = [];
  processing: boolean = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/enqueue' && request.method === 'POST') {
      const task: TranslationRequest = await request.json();
      this.queue.push(task);
      
      // Inicia processamento se não estiver rodando
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
      const task = this.queue.shift()!;
      
      try {
        // Traduz
        const translated = await translateAndContextualize(
          this.env.AI,
          task.recommendation,
          task.target_language,
          task.tech_stack
        );
        
        // Atualiza no D1
        await updateFindingWithTranslation(
          this.env.VLM_DB,
          task.correlation_key,
          translated,
          task.target_language
        );
        
        console.log(`Translated: ${task.correlation_key}`);
        
      } catch (error) {
        console.error(`Translation error for ${task.correlation_key}:`, error);
        // Em caso de erro, não perde o item - poderia implementar retry
      }
      
      // Pequeno delay para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 100));
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
      const { recommendation, target_language, tech_stack } = await request.json();
      
      const translated = await translateAndContextualize(
        env.AI,
        recommendation,
        target_language,
        tech_stack
      );
      
      return new Response(
        JSON.stringify({ translated }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Translation failed' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
};
