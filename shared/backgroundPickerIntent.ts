/**
 * Shared canvas **appearance** intent — single authority for:
 * - `canvasIntentRouter` Tier 0 (server)
 * - `VoiceTurnOrchestrator` recovery when `canvas.resolve` returns no viewId (client)
 *
 * Keep all phrase/category logic here to avoid drift with chip copy or speech strings.
 */

export const BACKGROUND_SPEECH_SUMMARY =
  "Canvas appearance: choose a background effect, then tune card and text for readability. Effects come from the governed catalog.";

export const BACKGROUND_SPEAKING_INSTRUCTIONS =
  'The canvas appearance panel is open. In one or two short sentences: mention they can pick a category and effect, use Canvas & layout for contrast, and the buttons for default or favorites. Do NOT pivot to unrelated Gateway marketing, pricing, or generic services — stay on this UI only.';

/**
 * Explicit phrase substrings (longer / specific — matched first).
 * Formerly split across `canvasIntentRouter` Tier 0 keywords + Tier 1 background rule.
 */
export const BACKGROUND_PICKER_TRANSCRIPT_SUBSTRINGS: readonly string[] = [
  'change background',
  'change the background',
  'change my background',
  'can you change the background',
  'canvas background',
  'animated background',
  'background animation',
  'pick a background',
  'choose a background',
  'different background',
  'new background',
  'switch background',
  'switch the background',
  'customize background',
  'customize the background',
  'customize the look',
  'wallpaper',
  'shadcn background',
  'background effects',
  'visual background',
  'backdrop',
  'background picker',
  'canvas appearance',
  'visual theme',
  'make it darker',
  'make the card',
  'background tint',
  'what categories',
  'which categories',
  'show categories',
  'immersive',
  'make it visual',
  'something visual',
  'moving background',
  'animated backdrop',
  'mesh gradient',
  'pick one',
  'choose one',
  'open the picker',
];

/** Broad visual / catalog cues (shorter tokens — use with care; keep out generic “home” / “menu”). */
const BACKGROUND_PICKER_BROAD_KEYWORDS: readonly string[] = [
  'background',
  'backdrop',
  'wallpaper',
  'shadcn',
  'starfield',
  'aurora',
  'particle',
  'particles',
  'bokeh',
  'confetti',
  'fireflies',
  'animated background',
  'canvas background',
  'visual effect',
  'visual effects',
  'gradient animation',
  'mesh gradient',
  'pick a background',
  'choose a background',
  'background effects',
  /** “Open the picker” / in-picker navigation */
  'picker',
];

/**
 * Category / effect follow-ups (“which category”, “particle effects”) without repeating “background”.
 */
function backgroundPickerCategoryCue(lower: string): boolean {
  return (
    (lower.includes('categor') &&
      (lower.includes('background') ||
        lower.includes('effect') ||
        lower.includes('canvas') ||
        lower.includes('visual') ||
        lower.includes('pick') ||
        lower.includes('choose'))) ||
    (lower.includes('effect') &&
      (lower.includes('background') ||
        lower.includes('canvas') ||
        lower.includes('visual') ||
        lower.includes('animated')))
  );
}

/**
 * Returns true when the transcript should open **canvas_backgrounds** (appearance composer).
 * Used by server Tier 0 and client orchestrator recovery.
 */
export function transcriptMatchesBackgroundPickerIntent(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  if (lower.length < 2) return false;

  if (backgroundPickerCategoryCue(lower)) return true;

  for (const p of BACKGROUND_PICKER_TRANSCRIPT_SUBSTRINGS) {
    if (lower.includes(p)) return true;
  }
  return BACKGROUND_PICKER_BROAD_KEYWORDS.some((k) => lower.includes(k));
}
