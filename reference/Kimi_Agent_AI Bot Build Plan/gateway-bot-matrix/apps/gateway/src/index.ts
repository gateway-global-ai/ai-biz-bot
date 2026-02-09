/**
 * Gateway Bot Matrix - AI Gateway Worker
 * Cloudflare Worker that uniformly wraps Kimi / Claude / GPT-4
 * Built-in retry / fall-back (Claude ↗︎ GPT-4 ↗︎ Kimi)
 */

export interface Env {
  // API Keys
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  KIMI_API_KEY: string;
  
  // Optional: Rate limiting
  RATE_LIMITER?: any;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  botId: string;
  messages: ChatMessage[];
  stream?: boolean;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'kimi';
  model: string;
  apiKey: string;
  endpoint: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Error response helper
function errorResponse(message: string, status: number = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Success response helper
function successResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Get model configuration based on provider
function getModelConfig(provider: string, env: Env): ModelConfig | null {
  const configs: Record<string, ModelConfig> = {
    openai: {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: env.OPENAI_API_KEY,
      endpoint: 'https://api.openai.com/v1/chat/completions',
    },
    anthropic: {
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      apiKey: env.ANTHROPIC_API_KEY,
      endpoint: 'https://api.anthropic.com/v1/messages',
    },
    kimi: {
      provider: 'kimi',
      model: 'kimi-k2',
      apiKey: env.KIMI_API_KEY,
      endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    },
  };

  return configs[provider] || null;
}

// Call OpenAI API
async function callOpenAI(config: ModelConfig, messages: ChatMessage[], stream: boolean = false): Promise<Response> {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${error}`);
  }

  if (stream) {
    return response;
  }

  const data = await response.json();
  return successResponse({
    message: data.choices[0]?.message?.content || '',
    usage: data.usage,
    provider: 'openai',
    model: config.model,
  });
}

// Call Anthropic API
async function callAnthropic(config: ModelConfig, messages: ChatMessage[], stream: boolean = false): Promise<Response> {
  // Convert messages to Anthropic format
  const systemMessage = messages.find(m => m.role === 'system')?.content;
  const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      messages: chatMessages,
      system: systemMessage,
      stream,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic error: ${error}`);
  }

  if (stream) {
    return response;
  }

  const data = await response.json();
  return successResponse({
    message: data.content[0]?.text || '',
    usage: data.usage,
    provider: 'anthropic',
    model: config.model,
  });
}

// Call Kimi API (OpenAI-compatible)
async function callKimi(config: ModelConfig, messages: ChatMessage[], stream: boolean = false): Promise<Response> {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi error: ${error}`);
  }

  if (stream) {
    return response;
  }

  const data = await response.json();
  return successResponse({
    message: data.choices[0]?.message?.content || '',
    usage: data.usage,
    provider: 'kimi',
    model: config.model,
  });
}

// Call AI provider with fallback
async function callAIWithFallback(
  preferredProvider: string,
  env: Env,
  messages: ChatMessage[],
  stream: boolean = false
): Promise<Response> {
  // Fallback order: preferred → openai → anthropic → kimi
  const providers = [preferredProvider, 'openai', 'anthropic', 'kimi'].filter(
    (p, i, arr) => arr.indexOf(p) === i
  );

  let lastError: Error | null = null;

  for (const provider of providers) {
    const config = getModelConfig(provider, env);
    if (!config || !config.apiKey) continue;

    try {
      switch (config.provider) {
        case 'openai':
          return await callOpenAI(config, messages, stream);
        case 'anthropic':
          return await callAnthropic(config, messages, stream);
        case 'kimi':
          return await callKimi(config, messages, stream);
      }
    } catch (error) {
      lastError = error as Error;
      console.error(`[Gateway] ${provider} failed:`, error);
      // Continue to next provider
    }
  }

  return errorResponse(
    `All AI providers failed. Last error: ${lastError?.message}`,
    503
  );
}

// Mock bot config (in production, fetch from Supabase)
async function getBotConfig(botId: string, env: Env): Promise<any> {
  // This would be a Supabase query in production
  return {
    id: botId,
    name: 'Demo Bot',
    model_provider: 'openai',
    system_prompt: 'You are a helpful AI assistant.',
  };
}

// Main request handler
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (path === '/health') {
    return successResponse({ status: 'ok', timestamp: new Date().toISOString() });
  }

  // Chat endpoint
  if (path === '/v1/chat' || path === '/edge/chat') {
    if (request.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    try {
      const body: ChatRequest = await request.json();
      
      if (!body.botId) {
        return errorResponse('botId is required');
      }

      if (!body.messages || !Array.isArray(body.messages)) {
        return errorResponse('messages array is required');
      }

      // Get bot config
      const botConfig = await getBotConfig(body.botId, env);
      
      // Prepend system prompt if exists
      const messages = botConfig.system_prompt
        ? [{ role: 'system' as const, content: botConfig.system_prompt }, ...body.messages]
        : body.messages;

      // Call AI with fallback
      return await callAIWithFallback(
        botConfig.model_provider || 'openai',
        env,
        messages,
        body.stream
      );
    } catch (error) {
      return errorResponse(`Invalid request: ${(error as Error).message}`);
    }
  }

  // Public bot config endpoint
  if (path.startsWith('/page_bots/') && path.endsWith('/public')) {
    const botId = path.split('/')[2];
    const botConfig = await getBotConfig(botId, env);
    
    return successResponse({
      id: botConfig.id,
      name: botConfig.name,
      ui_config: botConfig.ui_config || {
        interface: 'chat',
        position: 'bottom-right',
        primaryColor: '#10b981',
      },
      greeting_message: botConfig.greeting_message,
    });
  }

  // Voice endpoint (placeholder)
  if (path === '/v1/voice') {
    return errorResponse('Voice not implemented yet', 501);
  }

  return errorResponse('Not found', 404);
}

// Export fetch handler for Cloudflare Workers
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env);
  },
};
