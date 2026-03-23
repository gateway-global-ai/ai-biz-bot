import { getLocalVoiceConfig } from "../config";

export interface LocalTranscriptionResult {
  text: string;
  language?: string | null;
  duration_ms: number;
  processing_ms: number;
  model: string;
  audio_bytes: number;
  language_probability?: number | null;
}

export async function executeFasterWhisper(
  audioBuffer: Buffer
): Promise<LocalTranscriptionResult> {
  const config = getLocalVoiceConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(`${config.pythonSidecarBaseUrl}/transcribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Audio-Sample-Rate": "16000",
      },
      body: audioBuffer,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`STT sidecar returned ${response.status}`);
    }

    const payload = (await response.json()) as Partial<LocalTranscriptionResult>;
    if (!payload.text?.trim()) {
      throw new Error("STT sidecar returned an empty transcript.");
    }

    return {
      text: payload.text.trim(),
      language: payload.language ?? null,
      duration_ms: payload.duration_ms ?? 0,
      processing_ms: payload.processing_ms ?? 0,
      model: payload.model ?? "unknown",
      audio_bytes: payload.audio_bytes ?? audioBuffer.length,
      language_probability: payload.language_probability ?? null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
