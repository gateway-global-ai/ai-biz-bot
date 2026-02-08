import OpenAI from 'openai';

export type ModelProvider = 'kimi' | 'gemini' | 'openai' | 'anthropic';

export interface GatewayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GatewayChatOptions {
  messages: GatewayMessage[];
  provider?: ModelProvider;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

interface ProviderConfig {
  provider: ModelProvider;
  client: OpenAI;
  model: string;
  available: boolean;
}

const DEFAULT_MODELS: Record<ModelProvider, string> = {
  kimi: 'kimi-k2-turbo-preview',
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
};

const PROVIDER_CONFIGS: Record<ModelProvider, { baseURL: string; envKey: string }> = {
  kimi: { baseURL: 'https://api.moonshot.ai/v1', envKey: 'MOONSHOT_API_KEY' },
  gemini: { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', envKey: 'GEMINI_API_KEY' },
  openai: { baseURL: 'https://api.openai.com/v1', envKey: 'OPENAI_API_KEY' },
  anthropic: { baseURL: 'https://api.anthropic.com/v1', envKey: 'ANTHROPIC_API_KEY' },
};

const FALLBACK_ORDER: ModelProvider[] = ['kimi', 'gemini', 'openai', 'anthropic'];

function getProviderClient(provider: ModelProvider): ProviderConfig | null {
  const config = PROVIDER_CONFIGS[provider];
  const apiKey = process.env[config.envKey];
  if (!apiKey) return null;

  return {
    provider,
    client: new OpenAI({ apiKey, baseURL: config.baseURL }),
    model: DEFAULT_MODELS[provider],
    available: true,
  };
}

async function callProvider(
  config: ProviderConfig,
  messages: GatewayMessage[],
  model?: string,
  temperature?: number,
  max_tokens?: number,
): Promise<string> {
  const requestModel = model || config.model;

  const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: requestModel,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    max_tokens: max_tokens || 1000,
  };

  if (requestModel !== 'kimi-k2.5' && temperature !== undefined) {
    params.temperature = temperature;
  }

  const completion = await config.client.chat.completions.create(params);
  return completion.choices[0]?.message?.content || '';
}

export async function gatewayChat(options: GatewayChatOptions): Promise<{
  response: string;
  provider: ModelProvider;
  model: string;
}> {
  const preferred = options.provider || 'kimi';
  const providers = [preferred, ...FALLBACK_ORDER.filter(p => p !== preferred)];

  let lastError: Error | null = null;

  for (const providerName of providers) {
    const config = getProviderClient(providerName);
    if (!config) continue;

    try {
      const response = await callProvider(
        config,
        options.messages,
        providerName === preferred ? options.model : undefined,
        options.temperature,
        options.max_tokens,
      );

      return {
        response,
        provider: providerName,
        model: providerName === preferred && options.model ? options.model : config.model,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`[AI Gateway] ${providerName} failed:`, (error as Error).message);
    }
  }

  throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
}

export function getAvailableProviders(): { provider: ModelProvider; model: string }[] {
  return FALLBACK_ORDER
    .filter(p => !!process.env[PROVIDER_CONFIGS[p].envKey])
    .map(p => ({ provider: p, model: DEFAULT_MODELS[p] }));
}

console.log('[AI Gateway] Multi-model gateway loaded. Available providers:', getAvailableProviders().map(p => p.provider).join(', '));
