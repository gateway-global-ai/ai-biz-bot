import OpenAI from 'openai';

const MOONSHOT_BASE_URL = 'https://api.moonshot.ai/v1';

// Kimi model options
export const KIMI_MODELS = {
  K2_5: 'kimi-k2.5',           // Best reasoning, multimodal, 256K context
  K2_TURBO: 'kimi-k2-turbo-preview', // Faster, 256K context
  K2_THINKING: 'kimi-k2-thinking',   // Deep reasoning with visible thought process
} as const;

export type KimiModel = typeof KIMI_MODELS[keyof typeof KIMI_MODELS];

// Create a Kimi client using OpenAI-compatible SDK
export function createKimiClient(): OpenAI {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error('MOONSHOT_API_KEY environment variable is not set');
  }
  
  return new OpenAI({
    apiKey,
    baseURL: MOONSHOT_BASE_URL,
  });
}

// Singleton client instance
let kimiClient: OpenAI | null = null;

export function getKimiClient(): OpenAI {
  if (!kimiClient) {
    kimiClient = createKimiClient();
  }
  return kimiClient;
}

// Types for chat messages
export interface KimiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  partial?: boolean;
  tool_call_id?: string;
}

// Types for tool definitions
export interface KimiTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// Chat completion options
export interface KimiChatOptions {
  model?: KimiModel;
  messages: KimiMessage[];
  tools?: KimiTool[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  thinking?: { type: 'enabled' | 'disabled' };
}

// Generate a chat completion
export async function chat(options: KimiChatOptions): Promise<string> {
  const client = getKimiClient();
  const model = options.model || KIMI_MODELS.K2_TURBO;
  
  // For kimi-k2.5, temperature/top_p are fixed - don't send them
  const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: options.messages.map(msg => {
      const baseMsg: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      };
      
      // Add partial flag for prefilling (Kimi-specific)
      if (msg.partial && msg.role === 'assistant') {
        (baseMsg as any).partial = true;
      }
      
      // Add name for character consistency
      if (msg.name) {
        (baseMsg as any).name = msg.name;
      }
      
      return baseMsg;
    }),
    max_tokens: options.max_tokens || 4096,
  };
  
  // Only add temperature for turbo models (k2.5 has fixed sampling)
  if (model === KIMI_MODELS.K2_TURBO && options.temperature !== undefined) {
    requestParams.temperature = options.temperature;
  }
  
  // Add tools if provided
  if (options.tools && options.tools.length > 0) {
    requestParams.tools = options.tools;
  }
  
  const completion = await client.chat.completions.create(requestParams);
  
  return completion.choices[0]?.message?.content || '';
}

// Parse a task using Partial Mode for structured JSON extraction
export async function parseTask(taskDescription: string): Promise<{
  task: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  estimatedHours: number;
  keywords: string[];
}> {
  const client = getKimiClient();
  
  const completion = await client.chat.completions.create({
    model: KIMI_MODELS.K2_TURBO,
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
      {
        role: 'user',
        content: taskDescription,
      },
      {
        role: 'assistant',
        content: '{',
        // @ts-ignore - Kimi-specific partial mode
        partial: true,
      },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });
  
  const response = '{' + (completion.choices[0]?.message?.content || '');
  
  try {
    return JSON.parse(response);
  } catch (e) {
    // Fallback if parsing fails
    return {
      task: taskDescription,
      category: 'other',
      urgency: 'medium',
      estimatedHours: 12,
      keywords: [],
    };
  }
}

// Generate an SMS response with personality (DISC profile)
export async function generateSmsResponse(options: {
  agentName: string;
  personality: string;
  discProfile?: { dominance: number; influence: number; steadiness: number; conscientiousness: number };
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  userMessage: string;
  taskContext?: string;
}): Promise<string> {
  const { agentName, personality, discProfile, conversationHistory, userMessage, taskContext } = options;
  
  // Build DISC personality description
  let discDescription = '';
  if (discProfile) {
    const traits: string[] = [];
    if (discProfile.dominance > 60) traits.push('direct, results-oriented, decisive');
    if (discProfile.influence > 60) traits.push('enthusiastic, optimistic, collaborative');
    if (discProfile.steadiness > 60) traits.push('patient, reliable, team-oriented');
    if (discProfile.conscientiousness > 60) traits.push('analytical, precise, quality-focused');
    discDescription = traits.length > 0 ? `Communication style: ${traits.join(', ')}.` : '';
  }
  
  const systemPrompt = `You are ${agentName}, an AI assistant communicating via SMS.
${personality}
${discDescription}

ABSOLUTE GUARDRAILS - NEVER VIOLATE THESE:
- NEVER make up completion percentages (e.g. "85% done", "almost finished")
- NEVER promise specific dates or deadlines beyond "within 24 hours"
- NEVER claim work is almost done unless you have concrete proof
- NEVER lie or exaggerate about progress - honesty is mandatory
- NEVER fabricate details about work you haven't done
- All demo tasks are completed WITHIN 24 HOURS - that's your only timeline promise
- If you don't know something, say "I'll find out" - don't make things up
- Be honest about what you can and cannot do

24-HOUR DEMO TASK WORKFLOW:
1. First message to new user: Confirm their phone number works, introduce yourself warmly
2. Ask what they need help with, any specific requirements or preferences
3. During the task: Stay in touch, ask clarifying questions if needed
4. On completion: Deliver the result, ask for feedback, offer next steps

CRITICAL SMS RULES:
- Keep responses SHORT (under 160 characters when possible, max 320)
- Be conversational and human-like
- No markdown, no bullet points, no formatting
- Use natural language, contractions, casual tone
- Only mention REAL progress on tasks, never fabricate status
${taskContext ? `\nCurrent task context: ${taskContext}` : ''}`;

  const messages: KimiMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
    { role: 'assistant', name: agentName, content: '', partial: true },
  ];
  
  return chat({
    model: KIMI_MODELS.K2_TURBO,
    messages,
    temperature: 0.7,
    max_tokens: 200,
  });
}

// Generate task progress update for the 24-hour sequence
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
    model: KIMI_MODELS.K2_TURBO,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'assistant', name: agentName, content: '', partial: true },
    ],
    temperature: 0.8,
    max_tokens: 200,
  });
}

// Generate a voice response (for voice calls)
export async function generateVoiceResponse(
  userMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  discProfile?: { D: number; I: number; S: number; C: number }
): Promise<string> {
  let discDescription = '';
  if (discProfile) {
    const traits: string[] = [];
    if (discProfile.D > 60) traits.push('direct and decisive');
    if (discProfile.I > 60) traits.push('enthusiastic and warm');
    if (discProfile.S > 60) traits.push('patient and supportive');
    if (discProfile.C > 60) traits.push('thoughtful and precise');
    discDescription = traits.length > 0 ? `Your communication style is ${traits.join(', ')}.` : '';
  }
  
  const systemPrompt = `You are a helpful AI voice assistant for Gateway Global AI.
${discDescription}

VOICE CALL RULES:
- Keep responses SHORT and conversational (under 100 words)
- Speak naturally as if on a phone call
- Use simple, clear language
- Be warm, engaging, and helpful
- Ask follow-up questions when appropriate
- Never use markdown, bullet points, or formatting
- Avoid technical jargon`;

  const messages: KimiMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];
  
  return chat({
    model: KIMI_MODELS.K2_TURBO,
    messages,
    temperature: 0.8,
    max_tokens: 150,
  });
}

// Legacy module - used by old voice endpoints (browserVoice, voiceStream)
// New dual-engine system uses Gemini Multimodal Live API exclusively
