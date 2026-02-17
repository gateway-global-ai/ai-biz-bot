/**
 * Gemini-based voice pipeline for Twilio phone calls.
 * Used when KIMI is not used for voice (KIMI reserved for research and other tasks).
 * Provides: STT (transcribe caller audio), LLM response text, and TTS audio for the voice stream.
 * Uses Gemini Interactions API for stateful context and hotel search tool calling.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { HOTEL_MCP_TOOLS } from "./mcp-hotels.js";
import { executeHotelTool } from "./mcp-hotels-executor.js";

const DEFAULT_VOICE = "Puck";
const GEMINI_MODEL = "gemini-3.0-flash";
const GEMINI_MODEL_FALLBACK = "gemini-2.0-flash";
const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

/** Interactions API output types */
interface InteractionOutput {
  type: string;
  text?: string;
  name?: string;
  id?: string;
  arguments?: Record<string, unknown>;
}

interface InteractionResponse {
  id?: string;
  status?: string;
  outputs?: InteractionOutput[];
}

/** Convert HOTEL_MCP_TOOLS to Interactions API Tool format */
function getInteractionsTools() {
  return HOTEL_MCP_TOOLS.map((t) => ({
    type: "function" as const,
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

/**
 * Transcribe caller audio (WAV buffer) to text using Gemini multimodal input.
 * WAV should be 16 kHz mono 16-bit (e.g. from audioCodec AudioBuffer.getWavBuffer()).
 */
export async function transcribeWithGemini(wavBuffer: Buffer): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[VoiceGemini] GEMINI_API_KEY not configured for STT");
    return "";
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL_FALLBACK,
    generationConfig: {
      maxOutputTokens: 256,
      temperature: 0,
    },
  });

  const base64Audio = wavBuffer.toString("base64");

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "audio/wav",
        data: base64Audio,
      },
    },
    {
      text: "Transcribe the speech in this audio. Output only the exact words spoken, in the same language. If you hear nothing or only silence, output: [silence]. Do not add punctuation unless it is clearly intended. One line only.",
    },
  ]);

  const text = result.response.text();
  const transcript = (text || "").trim();
  if (transcript.toLowerCase() === "[silence]" || !transcript) {
    return "";
  }
  return transcript;
}

/**
 * Generate a short voice response using the Gemini Interactions API.
 * Uses server-side state (previous_interaction_id) for context; tool calls and results are persisted.
 * Returns { text, interactionId } so the caller can store the interaction ID for the next turn.
 */
export async function generateVoiceResponseGemini(
  systemPrompt: string,
  _conversationHistory: { role: "user" | "assistant"; content: string }[],
  userMessage: string,
  previousInteractionId?: string | null
): Promise<{ text: string; interactionId: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[VoiceGemini] GEMINI_API_KEY not configured");
    return {
      text: "I'm sorry, I'm having trouble right now. Please try again in a moment.",
      interactionId: previousInteractionId ?? null,
    };
  }

  const systemInstruction = `${systemPrompt}

When the user asks about hotels, travel, or accommodations, use the search_hotels or enrich_hotels_with_rates tools to find real rates.
Keep voice responses SHORT (under 100 words). Summarize tool results concisely for the caller.`;

  const tools = getInteractionsTools();
  let modelId = GEMINI_MODEL;
  let interactionId: string | null = previousInteractionId ?? null;
  let nextInput: string | Array<{ type: string; name: string; call_id: string; result: unknown }> = userMessage;
  const maxIterations = 5;

  for (let i = 0; i < maxIterations; i++) {
    const body: Record<string, unknown> = {
      model: modelId,
      system_instruction: systemInstruction,
      tools,
      generation_config: {
        max_output_tokens: 512,
        temperature: 0.8,
      },
      input: nextInput,
    };
    if (interactionId) {
      body.previous_interaction_id = interactionId;
    }

    const res = await fetch(INTERACTIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (i === 0 && (res.status === 404 || errText.includes("404"))) {
        modelId = GEMINI_MODEL_FALLBACK;
        continue;
      }
      console.error("[VoiceGemini] Interactions API error:", res.status, errText);
      return {
        text: "I'm having trouble right now. Please try again.",
        interactionId,
      };
    }

    const data = (await res.json()) as InteractionResponse;
    interactionId = data.id ?? interactionId;
    const outputs = data.outputs ?? [];

    const textOutput = outputs.find((o) => o.type === "text");
    const fnCallOutput = outputs.find((o) => o.type === "function_call");

    if (textOutput?.text) {
      const text = (textOutput.text || "").trim();
      return {
        text: text || "I didn't catch that. Could you say it again?",
        interactionId,
      };
    }

    if (fnCallOutput?.type === "function_call" && fnCallOutput.name && fnCallOutput.id) {
      const { name, id: callId, arguments: args } = fnCallOutput;
      const resultJson = await executeHotelTool(name, args ?? {});
      let resultObj: unknown;
      try {
        resultObj = JSON.parse(resultJson);
      } catch {
        resultObj = { result: resultJson };
      }
      nextInput = [
        {
          type: "function_result",
          name,
          call_id: callId,
          result: resultObj,
        },
      ];
      continue;
    }

    return {
      text: "I didn't catch that. Could you say it again?",
      interactionId,
    };
  }

  return {
    text: "I'm having trouble processing that. Please try again.",
    interactionId,
  };
}

/**
 * Synthesize speech from text using Gemini TTS. Returns WAV buffer (or raw audio buffer).
 * Used to send audio back to Twilio (caller hears the response).
 */
export async function synthesizeGeminiTTS(
  text: string,
  voiceName: string = DEFAULT_VOICE
): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[VoiceGemini] GEMINI_API_KEY not configured for TTS");
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[VoiceGemini] TTS request failed:", res.status, err);
    return null;
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
    }>;
  };
  const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  const b64 = part?.data;
  const mimeType = part?.mimeType || "";
  if (!b64) {
    console.error("[VoiceGemini] No audio in TTS response");
    return null;
  }
  const buf = Buffer.from(b64, "base64");
  // Twilio expects WAV (we convert to μ-law in voiceStream). If Gemini returns raw PCM, wrap in WAV header.
  if (mimeType.includes("wav") || buf.length > 44) {
    const riff = buf.readUInt32BE(0);
    if (riff === 0x52494646) return buf; // "RIFF" = already WAV
  }
  // Assume raw PCM 24kHz mono 16-bit; wrap in WAV header for convertWavToTwilioAudio
  const sampleRate = 24000;
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * 2;
  const dataSize = buf.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, buf]);
}
