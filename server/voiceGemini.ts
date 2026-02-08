/**
 * Gemini-based voice pipeline for Twilio phone calls.
 * Used when KIMI is not used for voice (KIMI reserved for research and other tasks).
 * Provides: STT (transcribe caller audio), LLM response text, and TTS audio for the voice stream.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_VOICE = "Puck";

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
    model: "gemini-2.0-flash",
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
 * Generate a short voice response using Gemini (for phone calls).
 */
export async function generateVoiceResponseGemini(
  systemPrompt: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[],
  userMessage: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[VoiceGemini] GEMINI_API_KEY not configured");
    return "I'm sorry, I'm having trouble right now. Please try again in a moment.";
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      maxOutputTokens: 150,
      temperature: 0.8,
    },
  });

  const historyParts = conversationHistory
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");
  const prompt = `${systemPrompt}

CONVERSATION SO FAR:
${historyParts || "(Just started)"}

User: ${userMessage}

Assistant (short, natural, under 100 words):`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return (text || "").trim() || "I didn't catch that. Could you say it again?";
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
