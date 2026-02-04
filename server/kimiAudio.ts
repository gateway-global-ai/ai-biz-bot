import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export interface KimiAudioResponse {
  audioUrl: string;
  transcript: string;
  success: boolean;
  error?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  type: "audio" | "text";
  content: string; // URL for audio, text for text
}

export async function processAudioWithKimi(
  audioUrl: string,
  conversationHistory: ConversationMessage[] = [],
  systemPrompt?: string
): Promise<KimiAudioResponse> {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("[Kimi-Audio] REPLICATE_API_TOKEN not configured");
      return {
        audioUrl: "",
        transcript: "",
        success: false,
        error: "Replicate API token not configured",
      };
    }

    console.log("[Kimi-Audio] Processing audio:", audioUrl);
    console.log("[Kimi-Audio] History length:", conversationHistory.length);

    // Build messages for multi-turn conversation
    const messages: Array<{ role: string; message_type: string; content: string }> = [];

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: "system",
        message_type: "text",
        content: systemPrompt,
      });
    }

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        message_type: msg.type,
        content: msg.content,
      });
    }

    // Add current user audio
    messages.push({
      role: "user",
      message_type: "audio",
      content: audioUrl,
    });

    console.log("[Kimi-Audio] Sending to Replicate with", messages.length, "messages");

    // Call Kimi-Audio via Replicate
    const output = await replicate.run(
      "zsxkib/kimi-audio-7b-instruct:40ab49e15bb65fc63a67f8207c821e592ed4a545e0e1452c34ba7268c64f7a0a",
      {
        input: {
          messages: JSON.stringify(messages),
          output_type: "audio",
          audio_top_k: 10,
          text_top_k: 5,
          audio_temperature: 0.8,
          text_temperature: 0.0,
          audio_repetition_penalty: 1.0,
          text_repetition_penalty: 1.0,
          audio_repetition_window_size: 64,
          text_repetition_window_size: 16,
        },
      }
    );

    console.log("[Kimi-Audio] Raw output:", output);

    // Parse the response (Replicate returns different formats)
    let audioOutputUrl = "";
    let textTranscript = "";

    // Cast to unknown for type safety
    const result: unknown = output;

    if (Array.isArray(result)) {
      for (const item of result) {
        if (typeof item === "string" && item.startsWith("http")) {
          audioOutputUrl = item;
        } else if (typeof item === "string") {
          textTranscript = item;
        }
      }
    } else if (typeof result === "object" && result !== null) {
      const obj = result as Record<string, unknown>;
      if (typeof obj.audio === "string") {
        audioOutputUrl = obj.audio;
      }
      if (typeof obj.text === "string") {
        textTranscript = obj.text;
      }
      if (typeof obj.output === "object" && obj.output !== null) {
        const inner = obj.output as Record<string, unknown>;
        if (typeof inner.audio === "string") audioOutputUrl = inner.audio;
        if (typeof inner.text === "string") textTranscript = inner.text;
      }
    } else if (typeof result === "string") {
      if (result.startsWith("http")) {
        audioOutputUrl = result;
      } else {
        textTranscript = result;
      }
    }

    console.log("[Kimi-Audio] Processed - Audio URL:", audioOutputUrl);
    console.log("[Kimi-Audio] Processed - Transcript:", textTranscript);

    return {
      audioUrl: audioOutputUrl,
      transcript: textTranscript,
      success: true,
    };
  } catch (error: any) {
    console.error("[Kimi-Audio] Error:", error);
    return {
      audioUrl: "",
      transcript: "",
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

export async function transcribeAudio(audioUrl: string): Promise<string> {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN not configured");
    }

    console.log("[Kimi-Audio] Transcribing:", audioUrl);

    const output = await replicate.run(
      "zsxkib/kimi-audio-7b-instruct:40ab49e15bb65fc63a67f8207c821e592ed4a545e0e1452c34ba7268c64f7a0a",
      {
        input: {
          messages: JSON.stringify([
            {
              role: "user",
              message_type: "audio",
              content: audioUrl,
            },
          ]),
          output_type: "text",
          text_temperature: 0.0,
          text_top_k: 5,
        },
      }
    );

    console.log("[Kimi-Audio] Transcription output:", output);

    // Extract text from response
    if (typeof output === "string") {
      return output;
    }
    if (typeof output === "object" && output !== null && "text" in output) {
      return (output as any).text;
    }
    if (Array.isArray(output) && output.length > 0) {
      return String(output[0]);
    }

    return "";
  } catch (error: any) {
    console.error("[Kimi-Audio] Transcription error:", error);
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

    // Use text-to-speech mode
    const output = await replicate.run(
      "zsxkib/kimi-audio-7b-instruct:40ab49e15bb65fc63a67f8207c821e592ed4a545e0e1452c34ba7268c64f7a0a",
      {
        input: {
          messages: JSON.stringify([
            {
              role: "user",
              message_type: "text",
              content: `Please say the following in a ${voiceStyle} tone: "${text}"`,
            },
          ]),
          output_type: "audio",
          audio_temperature: 0.8,
          audio_top_k: 10,
        },
      }
    );

    console.log("[Kimi-Audio] TTS output:", output);

    // Extract audio URL with proper type handling
    const result: unknown = output;
    
    if (Array.isArray(result)) {
      for (const item of result) {
        if (typeof item === "string" && item.startsWith("http")) {
          return item;
        }
      }
    } else if (typeof result === "object" && result !== null) {
      const obj = result as Record<string, unknown>;
      if (typeof obj.audio === "string") {
        return obj.audio;
      }
    } else if (typeof result === "string" && result.startsWith("http")) {
      return result;
    }

    return "";
  } catch (error: any) {
    console.error("[Kimi-Audio] TTS error:", error);
    throw error;
  }
}

export function isKimiAudioConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}
