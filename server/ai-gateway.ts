/**
 * Sovereign AI Gateway — Gemini sole provider.
 * All other providers are decommissioned.
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

if (!process.env.GEMINI_MODEL_FALLBACK) {
  console.error('[GOVERNANCE] GEMINI_MODEL_FALLBACK is not set in Doppler — ai-gateway text model is degraded. Add GEMINI_MODEL_FALLBACK to Doppler immediately.');
}

/** Single model alias for all text/chat. */
export const GEMINI_MODELS = {
  FALLBACK: process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.0-flash',
  K2_5: process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.0-flash',
  K2_TURBO: process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.0-flash',
} as const;

function getGeminiClient(): OpenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: GEMINI_BASE_URL });
}

/** For callers that need a client (e.g. classroom). Throws if Gemini not configured. */
export function getGeminiClientOrThrow(): OpenAI {
  const client = getGeminiClient();
  if (!client) throw new Error('[AI Gateway] GEMINI_API_KEY is not configured.');
  return client;
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.0-flash';
}

/** Chat completion for text tasks. */
export async function chat(options: { messages: GatewayMessage[]; model?: string; temperature?: number; max_tokens?: number }): Promise<string> {
  const out = await gatewayChat({
    messages: options.messages,
    model: options.model || getGeminiModel(),
    temperature: options.temperature,
    max_tokens: options.max_tokens ?? 1000,
  });
  return out.response;
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

// ─── Task parsing and SMS helpers (via gateway chat) ─────────────────────────

/** Parse a task description into structured fields. */
export async function parseTask(taskDescription: string): Promise<{
  task: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  estimatedHours: number;
  keywords: string[];
}> {
  const response = await chat({
    messages: [
      {
        role: 'system',
        content: `You are a task parser. Extract structured information from task descriptions.
Output a JSON object with these fields:
- task: The core task (string)
- category: One of "research", "writing", "scheduling", "communication", "analysis", "creative", "other"
- urgency: "low", "medium", or "high"
- estimatedHours: Estimated hours to complete (number, 1-24)
- keywords: Array of relevant keywords (max 5)`,
      },
      { role: 'user', content: taskDescription },
    ],
    model: GEMINI_MODELS.K2_TURBO,
    temperature: 0.3,
    max_tokens: 500,
  });
  const raw = response.trim();
  const jsonStr = raw.startsWith('{') ? raw : raw.replace(/^[^{]*/, '').replace(/[^}]*$/, '') || '{}';
  try {
    return JSON.parse(jsonStr.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as {
      task: string;
      category: string;
      urgency: 'low' | 'medium' | 'high';
      estimatedHours: number;
      keywords: string[];
    };
  } catch {
    return {
      task: taskDescription,
      category: 'other',
      urgency: 'medium',
      estimatedHours: 12,
      keywords: [],
    };
  }
}

/** Generate task progress update SMS for the 24-hour sequence. */
export async function generateTaskUpdate(options: {
  agentName: string;
  taskDescription: string;
  hoursElapsed: number;
  totalHours: number;
  updateType: 'start' | 'progress' | 'midpoint' | 'complete';
}): Promise<string> {
  const { agentName, taskDescription, hoursElapsed, totalHours, updateType } = options;
  const updatePrompts: Record<string, string> = {
    start: `You just received a new task. Send a warm first message confirming you got it and you're starting now. Ask if they have any specific requirements or preferences.`,
    progress: `Check in naturally. Ask if they have any questions or want to share more details about what they need.`,
    midpoint: `It's been a while since you started. Check in and ask if they want any adjustments or have additional context to share.`,
    complete: `You've finished the task! Briefly describe what you accomplished and ask for their feedback.`,
  };
  const systemPrompt = `You are ${agentName}, an AI assistant texting a user about their task.
Task: "${taskDescription}"

${updatePrompts[updateType]}

ABSOLUTE GUARDRAILS - NEVER VIOLATE:
- NEVER make up completion percentages (e.g. "85% done")
- NEVER lie about progress or fabricate details
- NEVER promise specific times beyond "within 24 hours"
- Be honest about what you're working on

RULES:
- SMS format: under 160 chars if possible, max 320
- Be specific about the actual task, not generic
- Sound human, warm, and helpful
- Focus on the customer's needs, ask questions`;

  return chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate the SMS for this ${updateType} update (hours elapsed: ${hoursElapsed}, total: ${totalHours}). Reply with only the message text.` },
    ],
    model: GEMINI_MODELS.K2_TURBO,
    temperature: 0.8,
    max_tokens: 200,
  });
}

/** Generate the Navigator's first-login "Call Coordinates" SMS. */
export async function generateNavigatorIntroduction(options: {
  userName: string;
  agentName: string;
  taskDescription: string;
  callCoordinates: string;
}): Promise<string> {
  const { userName, agentName, taskDescription, callCoordinates } = options;
  const systemPrompt = `You are ${agentName}, an AI Navigator for Gateway Global AI.
A new user named ${userName} just unlocked their account. Their task: "${taskDescription}"

Send a SHORT, exciting first SMS that:
1. Greets them by first name and confirms you're their Navigator
2. Gives them their "Call Coordinates" (the number they can call to talk to you live): ${callCoordinates}
3. Tells them to call anytime — you're already working on their task

ABSOLUTE GUARDRAILS:
- NEVER invent data or progress percentages
- Include the phone number "${callCoordinates}" exactly as given
- SMS format: 2-3 sentences MAX, under 320 chars total
- Warm, energetic, confident tone — this is their "UNLOCKED" moment`;

  return chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate the Navigator intro SMS. Reply with only the message text.' },
    ],
    model: GEMINI_MODELS.K2_TURBO,
    temperature: 0.8,
    max_tokens: 200,
  });
}
