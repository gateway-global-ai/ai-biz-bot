import type { WebSocket } from "ws";

import { getLocalVoiceConfig } from "../config";

function chunkToBase64(chunk: Uint8Array): string {
  return Buffer.from(chunk).toString("base64");
}

export async function streamKokoroTTS(ws: WebSocket, text: string): Promise<void> {
  const config = getLocalVoiceConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  const startedAt = performance.now();
  let audioBytes = 0;

  try {
    const response = await fetch(`${config.pythonSidecarBaseUrl}/synthesize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`TTS sidecar returned ${response.status}`);
    }

    if (!response.body) {
      throw new Error("TTS sidecar returned no audio stream.");
    }

    const sampleRate = Number(response.headers.get("X-TTS-Sample-Rate") || 24000);
    const voice = response.headers.get("X-TTS-Voice");
    const model = response.headers.get("X-TTS-Model");
    const textLength = Number(response.headers.get("X-TTS-Text-Length") || text.length);

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value?.length) {
        audioBytes += value.length;
        ws.send(
          JSON.stringify({
            type: "audio_output",
            data: chunkToBase64(value),
            sample_rate: sampleRate,
          })
        );
      }
    }

    ws.send(
      JSON.stringify({
        type: "tts_metadata",
        voice,
        model,
        text_length: textLength,
        processing_ms: Math.round(performance.now() - startedAt),
        sample_rate: sampleRate,
        audio_bytes: audioBytes,
      })
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Streaming PCM chunk generator for the sovereign Twilio pipeline.
 *
 * Yields raw 16-bit PCM chunks at 24kHz as they stream from the Kokoro sidecar.
 * The caller is responsible for resampling (24kHz → 8kHz) and μ-law encoding
 * before forwarding each chunk to Twilio — enabling true TTFB streaming with
 * zero buffering.
 */
export async function* streamKokoroPCMChunks(
  text: string
): AsyncGenerator<Buffer, void, unknown> {
  const config = getLocalVoiceConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(`${config.pythonSidecarBaseUrl}/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`TTS sidecar returned ${response.status}`);
    }

    if (!response.body) {
      throw new Error("TTS sidecar returned no audio stream.");
    }

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.length) {
        yield Buffer.from(value);
      }
    }
  } finally {
    clearTimeout(timeout);
  }
}
