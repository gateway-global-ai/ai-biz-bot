/**
 * Model–voice compatibility per README / gemini-*.md docs.
 * - Native Audio: 30 HD voices (we expose Puck, Charon, Kore, Fenrir, Zephyr).
 * - Flash latest: 4 HD voices only — Puck, Charon, Kore, Fenrir (no Zephyr).
 * - Pro preview: Not designed for Live API voice (separate STT/TTS); same 4 as Flash for UI consistency.
 */

export const NATIVE_AUDIO_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
export const FLASH_LATEST_MODEL = 'gemini-2.5-flash-latest';
export const PRO_PREVIEW_MODEL = 'gemini-2.5-pro-preview';

/** Voice IDs supported by Native Audio (all 5 Gemini Live voices) */
const VOICES_NATIVE_AUDIO = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] as const;

/** Voice IDs supported by Flash latest and Pro (4 voices only per docs) */
const VOICES_FLASH_AND_PRO = ['Puck', 'Charon', 'Kore', 'Fenrir'] as const;

/** Technology used for Live API voice (only Gemini prebuilt voices apply) */
export const LIVE_API_VOICE_TECH = 'Gemini' as const;

const MODEL_VOICES: Record<string, readonly string[]> = {
  [NATIVE_AUDIO_MODEL]: VOICES_NATIVE_AUDIO,
  [FLASH_LATEST_MODEL]: VOICES_FLASH_AND_PRO,
  [PRO_PREVIEW_MODEL]: VOICES_FLASH_AND_PRO,
};

/**
 * Returns the list of voice IDs allowed for the given model.
 * Defaults to Native Audio list for unknown models.
 */
export function getVoiceIdsForModel(modelId: string): string[] {
  return [...(MODEL_VOICES[modelId] ?? VOICES_NATIVE_AUDIO)];
}

/**
 * Returns the default (first) voice ID for the given model.
 */
export function getDefaultVoiceForModel(modelId: string): string {
  const ids = getVoiceIdsForModel(modelId);
  return ids[0] ?? 'Puck';
}

/** Whether this model uses Live API Gemini voices only (no Chirp/Neural2/WaveNet in this app). */
export function isLiveApiModel(modelId: string): boolean {
  return modelId in MODEL_VOICES;
}

/** Live API only accepts short names: Puck, Charon, Kore, Fenrir, Zephyr. Legacy IDs (e.g. en-US-Chirp3-HD-Kore) cause WebSocket errors. */
const LIVE_API_VOICE_NAMES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] as const;

/**
 * Normalizes any voice value to a short identifier accepted by the Gemini 2.5 Live API.
 * Use this before passing voice to ai.live.connect() to avoid "Requested voice api_name 'en-US-Chirp3-HD-Kore' is not available".
 */
export function normalizeVoiceForLiveApi(voice: string): string {
  const v = voice?.trim() || '';
  if (LIVE_API_VOICE_NAMES.includes(v as (typeof LIVE_API_VOICE_NAMES)[number])) return v;
  // Legacy IDs may contain the short name (e.g. en-US-Chirp3-HD-Kore -> Kore)
  for (const name of LIVE_API_VOICE_NAMES) {
    if (v.includes(name)) return name;
  }
  return LIVE_API_VOICE_NAMES[0]; // default Puck
}
