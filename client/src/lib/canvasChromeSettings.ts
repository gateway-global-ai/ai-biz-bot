/**
 * Persisted canvas chrome — background tint, idle card, and typography.
 * Lets operators tune layout over the governed background library without replacing the effect.
 */

const STORAGE_KEY = 'gateway_canvas_chrome_v1';

export type CanvasChromeSettings = {
  /** Full-area tint on top of the animated library layer (0 = effect at full strength). */
  bgOverlayColor: string;
  bgOverlayOpacity: number;
  /** Idle / picker card surface */
  cardBackgroundColor: string;
  cardOpacity: number;
  cardBorderOpacity: number;
  cardBlurPx: number;
  primaryTextColor: string;
  mutedTextColor: string;
};

export const DEFAULT_CANVAS_CHROME: CanvasChromeSettings = {
  bgOverlayColor: '#ffffff',
  bgOverlayOpacity: 0,
  cardBackgroundColor: '#ffffff',
  cardOpacity: 0.78,
  cardBorderOpacity: 0.55,
  cardBlurPx: 24,
  primaryTextColor: '#0f172a',
  mutedTextColor: '#475569',
};

const PRESETS: Record<string, Partial<CanvasChromeSettings>> = {
  light_glass: {
    bgOverlayColor: '#ffffff',
    bgOverlayOpacity: 0,
    cardBackgroundColor: '#ffffff',
    cardOpacity: 0.82,
    cardBorderOpacity: 0.5,
    cardBlurPx: 28,
    primaryTextColor: '#0f172a',
    mutedTextColor: '#64748b',
  },
  dark_glass: {
    bgOverlayColor: '#020617',
    bgOverlayOpacity: 0.35,
    cardBackgroundColor: '#0f172a',
    cardOpacity: 0.75,
    cardBorderOpacity: 0.35,
    cardBlurPx: 24,
    primaryTextColor: '#f8fafc',
    mutedTextColor: '#94a3b8',
  },
  full_bleed: {
    bgOverlayColor: '#ffffff',
    bgOverlayOpacity: 0,
    cardBackgroundColor: '#ffffff',
    cardOpacity: 0.92,
    cardBorderOpacity: 0.65,
    cardBlurPx: 16,
    primaryTextColor: '#0f172a',
    mutedTextColor: '#475569',
  },
  minimal_tint: {
    bgOverlayColor: '#0f172a',
    bgOverlayOpacity: 0.08,
    cardBackgroundColor: '#ffffff',
    cardOpacity: 0.88,
    cardBorderOpacity: 0.45,
    cardBlurPx: 20,
    primaryTextColor: '#0f172a',
    mutedTextColor: '#475569',
  },
};

export function getChromePresets(): Record<string, Partial<CanvasChromeSettings>> {
  return PRESETS;
}

export function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (h.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function mergeChrome(partial: Partial<CanvasChromeSettings>): CanvasChromeSettings {
  return { ...DEFAULT_CANVAS_CHROME, ...partial };
}

export function loadCanvasChromeSettings(): CanvasChromeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CANVAS_CHROME };
    const parsed = JSON.parse(raw) as Partial<CanvasChromeSettings>;
    return mergeChrome(parsed);
  } catch {
    return { ...DEFAULT_CANVAS_CHROME };
  }
}

export function saveCanvasChromeSettings(settings: CanvasChromeSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function applyPreset(
  presetId: keyof typeof PRESETS | string,
  base: CanvasChromeSettings,
): CanvasChromeSettings {
  const patch = PRESETS[presetId as keyof typeof PRESETS];
  if (!patch) return base;
  return mergeChrome({ ...base, ...patch });
}

export function normalizeChromeInput(
  key: keyof CanvasChromeSettings,
  value: number | string,
): Partial<CanvasChromeSettings> {
  switch (key) {
    case 'bgOverlayOpacity':
    case 'cardOpacity':
    case 'cardBorderOpacity':
      return { [key]: clamp(Number(value), 0, 1) };
    case 'cardBlurPx':
      return { cardBlurPx: clamp(Math.round(Number(value)), 0, 40) };
    case 'bgOverlayColor':
    case 'cardBackgroundColor':
    case 'primaryTextColor':
    case 'mutedTextColor':
      return { [key]: String(value) };
    default:
      return {};
  }
}
