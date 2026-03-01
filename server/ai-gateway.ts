/**
 * Sovereign AI Gateway — Gemini sole provider.
 * All other providers (Kimi, OpenAI, Anthropic) are decommissioned.
 * Model is controlled by Doppler: GEMINI_MODEL_FALLBACK for text/chat tasks.
 * Voice pipeline uses GEMINI_MODEL_ID — do NOT route voice through this gateway.
 */
import OpenAI from 'openai';

export type ModelProvider = 'gemini';

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

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

function getGeminiClient(): OpenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: GEMINI_BASE_URL });
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.0-flash';
}

export async function gatewayChat(options: GatewayChatOptions): Promise<{
  response: string;
  provider: ModelProvider;
  model: string;
}> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('[AI Gateway] GEMINI_API_KEY is not configured in Doppler.');
  }

  const model = options.model || getGeminiModel();

  const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: options.messages.map(m => ({ role: m.role, content: m.content })),
    max_tokens: options.max_tokens || 1000,
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
  };

  try {
    const completion = await client.chat.completions.create(params);
    return {
      response: completion.choices[0]?.message?.content || '',
      provider: 'gemini',
      model,
    };
  } catch (error) {
    throw new Error(`[AI Gateway] Gemini failed: ${(error as Error).message}`);
  }
}

export function getAvailableProviders(): { provider: ModelProvider; model: string }[] {
  if (!process.env.GEMINI_API_KEY) return [];
  return [{ provider: 'gemini', model: getGeminiModel() }];
}

console.log('[AI Gateway] Sovereign Gemini Gateway loaded. Provider: gemini |', getGeminiModel());
