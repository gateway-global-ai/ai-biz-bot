/**
 * kimiAudioReplicate.ts - Replicate-hosted Kimi-Audio
 * EXCLUSIVELY for Twilio phone voice (needs hosted audio URLs).
 * Browser voice uses kimiAudioDirect.ts instead (HuggingFace + Moonshot direct).
 */
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const KIMI_AUDIO_MODEL = "zsxkib/kimi-audio-7b-instruct:7500b32387695e89da3d09271850319ba027969f0c714dfc226361609ff29f2b";

export interface KimiAudioResponse {
  audioUrl: string;
  transcript: string;
  success: boolean;
  error?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  type: "audio" | "text";
  content: string;
}

function extractOutput(output: unknown): { audioUrl: string; transcript: string } {
  let audioUrl = "";
  let transcript = "";

  if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item === "string" && item.startsWith("http")) {
        audioUrl = item;
      } else if (typeof item === "string") {
        transcript = item;
      } else if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        if (typeof obj.json_str === "string") transcript = obj.json_str;
        if (typeof obj.media_path === "string") audioUrl = obj.media_path;
        if (typeof obj.text === "string") transcript = obj.text;
        if (typeof obj.audio === "string") audioUrl = obj.audio;
      }
    }
  } else if (typeof output === "object" && output !== null) {
    const obj = output as Record<string, unknown>;
    if (typeof obj.json_str === "string") transcript = obj.json_str;
    if (typeof obj.media_path === "string") audioUrl = obj.media_path;
    if (typeof obj.audio === "string") audioUrl = obj.audio;
    if (typeof obj.text === "string") transcript = obj.text;
    if (typeof obj.output === "object" && obj.output !== null) {
      const inner = obj.output as Record<string, unknown>;
      if (typeof inner.audio === "string") audioUrl = inner.audio;
      if (typeof inner.text === "string") transcript = inner.text;
      if (typeof inner.json_str === "string") transcript = inner.json_str;
      if (typeof inner.media_path === "string") audioUrl = inner.media_path;
    }
  } else if (typeof output === "string") {
    if (output.startsWith("http")) {
      audioUrl = output;
    } else {
      transcript = output;
    }
  }

  return { audioUrl, transcript };
}

export async function processAudioWithKimi(
  audioUrl: string,
  conversationHistory: ConversationMessage[] = [],
  systemPrompt?: string
): Promise<KimiAudioResponse> {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("[Kimi-Audio] REPLICATE_API_TOKEN not configured");
      return { audioUrl: "", transcript: "", success: false, error: "Replicate API token not configured" };
    }

    console.log("[Kimi-Audio] Processing audio:", audioUrl);
    console.log("[Kimi-Audio] History length:", conversationHistory.length);

    let promptParts: string[] = [];
    if (systemPrompt) {
      promptParts.push(systemPrompt);
    }
    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-6);
      const historyText = recentHistory
        .filter(m => m.type === "text" && m.content)
        .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");
      if (historyText) {
        promptParts.push(`Recent conversation context:\n${historyText}`);
      }
    }
    promptParts.push("Please respond naturally to the user's audio input.");
    const prompt = promptParts.join("\n\n");

    const output = await replicate.run(KIMI_AUDIO_MODEL, {
      input: {
        audio: audioUrl,
        prompt: prompt,
        output_type: "both",
        return_json: true,
        audio_top_k: 10,
        text_top_k: 5,
        audio_temperature: 0.8,
        text_temperature: 0.0,
        audio_repetition_penalty: 1.0,
        text_repetition_penalty: 1.0,
        audio_repetition_window_size: 64,
        text_repetition_window_size: 16,
      },
    });

    console.log("[Kimi-Audio] Raw output type:", typeof output);

    const { audioUrl: audioOutputUrl, transcript } = extractOutput(output);

    console.log("[Kimi-Audio] Processed - Audio URL:", audioOutputUrl ? "yes" : "none");
    console.log("[Kimi-Audio] Processed - Transcript:", transcript.substring(0, 100));

    return {
      audioUrl: audioOutputUrl,
      transcript,
      success: true,
    };
  } catch (error: any) {
    console.error("[Kimi-Audio] Error:", error.message || error);
    return { audioUrl: "", transcript: "", success: false, error: error.message || "Unknown error" };
  }
}

export async function transcribeAudio(audioUrl: string): Promise<string> {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN not configured");
    }

    console.log("[Kimi-Audio] Transcribing:", audioUrl);

    const output = await replicate.run(KIMI_AUDIO_MODEL, {
      input: {
        audio: audioUrl,
        prompt: "Please transcribe this audio accurately.",
        output_type: "text",
        return_json: true,
        text_temperature: 0.0,
        text_top_k: 5,
      },
    });

    console.log("[Kimi-Audio] Transcription output type:", typeof output);

    const { transcript } = extractOutput(output);
    return transcript;
  } catch (error: any) {
    console.error("[Kimi-Audio] Transcription error:", error.message);
    throw error;
  }
}

export async function generateSpeech(
  text: string,
  voiceStyle: "helpful" | "friendly" | "professional" = "helpful"
): Promise<string> {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN not configured");
    }

    console.log("[Kimi-Audio] Generating speech for:", text.substring(0, 100));

    const output = await replicate.run(KIMI_AUDIO_MODEL, {
      input: {
        prompt: `Please say the following in a ${voiceStyle} tone: "${text}"`,
        output_type: "audio",
        return_json: false,
        audio_temperature: 0.8,
        audio_top_k: 10,
      },
    });

    console.log("[Kimi-Audio] TTS output type:", typeof output);

    const { audioUrl } = extractOutput(output);

    if (!audioUrl) {
      console.error("[Kimi-Audio] TTS returned no audio URL");
    }

    return audioUrl;
  } catch (error: any) {
    console.error("[Kimi-Audio] TTS error:", error.message);
    throw error;
  }
}

export function isKimiAudioConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}
