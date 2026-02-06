import { getKimiClient } from "./kimi";

const HF_API_BASE = "https://router.huggingface.co/hf-inference/models";
const HF_ASR_MODEL = "openai/whisper-large-v3-turbo";
const HF_TTS_MODEL = "facebook/mms-tts-eng";

export interface ConversationMessage {
  role: "user" | "assistant";
  type: "audio" | "text";
  content: string;
}

export interface DirectVoiceResponse {
  audioBuffer: Buffer | null;
  transcript: string;
  responseText: string;
  success: boolean;
  error?: string;
}

function getHfToken(): string | null {
  return process.env.HF_TOKEN || null;
}

export function isDirectVoiceConfigured(): boolean {
  return !!(getHfToken() && process.env.MOONSHOT_API_KEY);
}

export async function transcribeAudioDirect(audioBuffer: Buffer): Promise<string> {
  const hfToken = getHfToken();
  if (!hfToken) throw new Error("HF_TOKEN not configured");

  console.log("[KimiDirect] Transcribing audio via HuggingFace Whisper...");

  const response = await fetch(`${HF_API_BASE}/${HF_ASR_MODEL}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${hfToken}`,
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[KimiDirect] ASR error:", response.status, errorText);
    throw new Error(`ASR failed: ${response.status} ${errorText}`);
  }

  const result = await response.json() as { text?: string };
  const transcript = result.text || "";
  console.log("[KimiDirect] Transcribed:", transcript.substring(0, 100));
  return transcript;
}

export async function generateAIResponse(
  userText: string,
  conversationHistory: ConversationMessage[] = [],
  systemPrompt?: string
): Promise<string> {
  if (!process.env.MOONSHOT_API_KEY) throw new Error("MOONSHOT_API_KEY not configured");

  console.log("[KimiDirect] Generating AI response via Moonshot Kimi...");

  const client = getKimiClient();

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    if (msg.type === "text" && msg.content) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: userText });

  const response = await client.chat.completions.create({
    model: "kimi-k2.5",
    messages,
    temperature: 0.7,
    max_tokens: 300,
  });

  const responseText = response.choices?.[0]?.message?.content || "";
  console.log("[KimiDirect] AI response:", responseText.substring(0, 100));
  return responseText;
}

export async function generateAIResponseStream(
  userText: string,
  conversationHistory: ConversationMessage[] = [],
  systemPrompt?: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  if (!process.env.MOONSHOT_API_KEY) throw new Error("MOONSHOT_API_KEY not configured");

  console.log("[KimiDirect] Streaming AI response via Moonshot Kimi...");

  const client = getKimiClient();

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    if (msg.type === "text" && msg.content) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: userText });

  const stream = await client.chat.completions.create({
    model: "kimi-k2.5",
    messages,
    temperature: 0.7,
    max_tokens: 300,
    stream: true,
  });

  let fullText = "";
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content || "";
    if (delta) {
      fullText += delta;
      onChunk?.(delta);
    }
  }

  console.log("[KimiDirect] Streamed response:", fullText.substring(0, 100));
  return fullText;
}

export async function synthesizeSpeechDirect(text: string): Promise<Buffer> {
  const hfToken = getHfToken();
  if (!hfToken) throw new Error("HF_TOKEN not configured");

  console.log("[KimiDirect] Synthesizing speech via HuggingFace TTS...");

  const response = await fetch(`${HF_API_BASE}/${HF_TTS_MODEL}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${hfToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: text }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[KimiDirect] TTS error:", response.status, errorText);
    throw new Error(`TTS failed: ${response.status} ${errorText}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  console.log("[KimiDirect] TTS generated:", audioBuffer.length, "bytes");
  return audioBuffer;
}

export async function processVoiceDirect(
  audioBuffer: Buffer,
  conversationHistory: ConversationMessage[] = [],
  systemPrompt?: string
): Promise<DirectVoiceResponse> {
  try {
    if (!isDirectVoiceConfigured()) {
      return {
        audioBuffer: null,
        transcript: "",
        responseText: "",
        success: false,
        error: "Direct voice not configured (need HF_TOKEN + MOONSHOT_API_KEY)",
      };
    }

    const transcript = await transcribeAudioDirect(audioBuffer);

    if (!transcript.trim()) {
      return {
        audioBuffer: null,
        transcript: "",
        responseText: "",
        success: false,
        error: "No speech detected in audio",
      };
    }

    const responseText = await generateAIResponse(
      transcript,
      conversationHistory,
      systemPrompt
    );

    if (!responseText.trim()) {
      return {
        audioBuffer: null,
        transcript,
        responseText: "",
        success: false,
        error: "AI generated empty response",
      };
    }

    const responseAudio = await synthesizeSpeechDirect(responseText);

    return {
      audioBuffer: responseAudio,
      transcript,
      responseText,
      success: true,
    };
  } catch (error: any) {
    console.error("[KimiDirect] Pipeline error:", error.message);
    return {
      audioBuffer: null,
      transcript: "",
      responseText: "",
      success: false,
      error: error.message,
    };
  }
}

export async function generateGreetingDirect(greetingText: string): Promise<Buffer | null> {
  try {
    if (!getHfToken()) {
      console.error("[KimiDirect] HF_TOKEN not configured for TTS");
      return null;
    }
    return await synthesizeSpeechDirect(greetingText);
  } catch (error: any) {
    console.error("[KimiDirect] Greeting TTS error:", error.message);
    return null;
  }
}
