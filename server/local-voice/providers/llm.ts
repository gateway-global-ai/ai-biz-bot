import { getLocalVoiceConfig } from "../config";

export interface LocalLlmResult {
  isToolCall: boolean;
  toolName?: string;
  args?: Record<string, unknown>;
  text?: string;
}

function buildPrompt(
  transcript: string,
  systemContext: string,
  allowedTools: string[]
): string {
  return [
    systemContext,
    `Allowed tools: ${allowedTools.join(", ") || "none"}`,
    `Operator request: ${transcript}`,
    "Return a JSON object only.",
    'For a valid tool call, return: {"isToolCall": true, "toolName": "mutate_chaos_settings", "args": {...}}',
    'For plain speech, return: {"isToolCall": false, "text": "..."}',
  ].join("\n\n");
}

export async function executeLocalLLM(
  transcript: string,
  systemContext: string,
  allowedTools: string[]
): Promise<LocalLlmResult> {
  const config = getLocalVoiceConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt: buildPrompt(transcript, systemContext, allowedTools),
        stream: false,
        format: "json",
        options: {
          temperature: 0.1,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Local LLM returned ${response.status}`);
    }

    const payload = (await response.json()) as { response?: string };
    const rawJson = payload.response?.trim();
    if (!rawJson) {
      throw new Error("Local LLM returned an empty response.");
    }

    const parsed = JSON.parse(rawJson) as LocalLlmResult;
    if (typeof parsed.isToolCall !== "boolean") {
      throw new Error("Local LLM response missing isToolCall boolean.");
    }

    if (!parsed.isToolCall && typeof parsed.text !== "string") {
      throw new Error("Plain-text local LLM response missing text.");
    }

    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}
