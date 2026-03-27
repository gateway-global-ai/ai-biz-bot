/**
 * Gemini-based voice pipeline for Twilio phone calls.
 *
 * Audit fixes applied (2026-03-26):
 * 1. CRITICAL — Removed undocumented /v1beta/interactions endpoint. Migrated to standard
 *    v1beta/models/[model]:generateContent with a conversation history array.
 * 2. CRITICAL — Removed LLM-as-STT latency trap. transcribeWithGemini() now uses
 *    Google Cloud Speech-to-Text v1 (sub-300ms) instead of a generative LLM round-trip.
 */

import { GoogleGenerativeAI, type Content, type Tool } from "@google/generative-ai";
import { SpeechClient } from "@google-cloud/speech";
import { HOTEL_MCP_TOOLS } from "./mcp-hotels.js";
import { executeHotelTool } from "./mcp-hotels-executor.js";

const DEFAULT_VOICE = "Puck";
// api-lockdown: model resolved from env only — never hardcoded
const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID;
const GEMINI_TTS_MODEL_ID = process.env.GEMINI_TTS_MODEL_ID || "gemini-2.5-flash-preview-tts";

if (!GEMINI_MODEL_ID) {
  console.error("[VoiceGemini] WARNING: GEMINI_MODEL_ID is not set. Voice calls will fail.");
}

/** Lazy-initialised Google Cloud Speech client (credentials from ADC / env). */
let _speechClient: SpeechClient | null = null;
function getSpeechClient(): SpeechClient {
  if (!_speechClient) _speechClient = new SpeechClient();
  return _speechClient;
}

/**
 * Transcribe caller audio (WAV buffer) to text using Google Cloud Speech-to-Text v1.
 * WAV should be 16 kHz mono 16-bit (from audioCodec AudioBuffer.getWavBuffer()).
 *
 * Replaced LLM-based transcription — GCS Speech-to-Text delivers results in <300ms
 * vs 1.5–3s for a generative LLM round-trip, which caused dead air on phone calls.
 */
export async function transcribeWithGemini(wavBuffer: Buffer): Promise<string> {
  try {
    const client = getSpeechClient();
    const [response] = await client.recognize({
      audio: { content: wavBuffer.toString("base64") },
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: "en-US",
        model: "phone_call",
        useEnhanced: true,
      },
    });
    const transcript = response.results
      ?.map((r) => r.alternatives?.[0]?.transcript ?? "")
      .join(" ")
      .trim();
    return transcript || "";
  } catch (err) {
    console.error("[VoiceGemini] Speech-to-Text error:", err);
    return "";
  }
}

/**
 * Generate a short voice response using the standard Gemini generateContent API.
 * Maintains conversation context via a passed-in history array (caller owns state).
 *
 * Replaced the undocumented /v1beta/interactions endpoint, which is not publicly
 * supported and can be shut off without warning. Standard generateContent is stable,
 * versioned, and documented.
 */
export async function generateVoiceResponseGemini(
  systemPrompt: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[],
  userMessage: string,
  _previousInteractionId?: string | null
): Promise<{ text: string; interactionId: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[VoiceGemini] GEMINI_API_KEY not configured");
    return { text: "I'm sorry, I'm having trouble right now. Please try again.", interactionId: null };
  }
  if (!GEMINI_MODEL_ID) {
    return { text: "Voice service is not configured. Please contact support.", interactionId: null };
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Build function declarations from HOTEL_MCP_TOOLS for tool-calling support.
  // HOTEL_MCP_TOOLS uses JSON-schema-shaped literals; SDK expects FunctionDeclarationSchema (narrow SchemaType).
  // Cast at the boundary only — runtime payload is unchanged (voice-governed typing pass).
  const tools: Tool[] | undefined =
    HOTEL_MCP_TOOLS.length > 0
      ? ([
          {
            functionDeclarations: HOTEL_MCP_TOOLS.map((t) => ({
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            })),
          },
        ] as unknown as Tool[])
      : undefined;

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL_ID,
    systemInstruction: `${systemPrompt}\n\nWhen the user asks about hotels, travel, or accommodations, use the search_hotels or enrich_hotels_with_rates tools to find real rates. Keep voice responses SHORT (under 100 words). Summarize tool results concisely for the caller.`,
    tools,
    generationConfig: {
      maxOutputTokens: 512,
      temperature: 0.8,
    },
  });

  // Convert conversation history to Gemini Content format
  const history: Content[] = conversationHistory.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({ history });

  const maxIterations = 5;
  let currentMessage: string = userMessage;

  for (let i = 0; i < maxIterations; i++) {
    const result = await chat.sendMessage(currentMessage);
    const response = result.response;

    // Check for function calls
    const functionCalls = response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      console.log(`[VoiceGemini] Tool call: ${call.name}`);
      const toolArgs: Record<string, unknown> =
        call.args && typeof call.args === "object" ? { ...call.args } : {};
      const resultJson = await executeHotelTool(call.name, toolArgs);
      let resultObj: unknown;
      try {
        resultObj = JSON.parse(resultJson);
      } catch {
        resultObj = { result: resultJson };
      }
      // Feed the function result back as the next message
      currentMessage = JSON.stringify({
        functionResponse: { name: call.name, response: resultObj },
      });
      continue;
    }

    const text = response.text().trim();
    if (text) {
      return { text, interactionId: null };
    }

    return { text: "I didn't catch that. Could you say it again?", interactionId: null };
  }

  return { text: "I'm having trouble processing that. Please try again.", interactionId: null };
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL_ID}:generateContent?key=${apiKey}`;
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
