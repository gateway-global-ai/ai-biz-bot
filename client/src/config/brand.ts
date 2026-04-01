/**
 * Brand Token System — Single Source of Truth
 *
 * SHELL zones (header, visualizer, footer): always SHELL.bg
 * CANVAS zone (content area): always CANVAS.bg
 *
 * Import from here. Never hardcode zone background colors inline.
 * Enforced by: .cursor/rules/brand-tokens.mdc
 */

// Shell zones — always dark navy, never conditional
export const SHELL = {
  bg: '#0f172a',
  bgMuted: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  border: 'rgba(99,102,241,0.20)',
  borderStrong: 'rgba(99,102,241,0.40)',
} as const;

// Canvas zone — always white, never conditional
export const CANVAS = {
  bg: '#ffffff',
  bgSubtle: '#f8fafc',
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
} as const;

/**
 * Token-bound Tailwind background for the canvas zone — use this instead of `style={{ backgroundColor: CANVAS.bg }}`.
 * See `docs-governance/canonical/CANVAS_OS_TOOL_MANDATE_V1.md`.
 */
export const CANVAS_BG_CLASSNAME = `bg-[${CANVAS.bg}]` as const;

// Platform brand colors — navy/green/blue (no purple as a primary)
export const BRAND = {
  navy: '#0f172a',
  green: '#008a3e',
  greenLight: '#10b981',
  blue: '#2962ff',
  blueLight: '#6366f1',
} as const;

// DISC behavioral profile colors
export const DISC_COLORS = {
  D: '#ef4444', // Dominance — red
  I: '#f59e0b', // Influence — amber
  S: '#10b981', // Steadiness — emerald
  C: '#6366f1', // Conscientiousness — indigo
} as const;

// ARCH conversation mechanic colors
export const ARCH_COLORS = {
  A: '#6366f1', // Acknowledge — indigo
  R: '#8b5cf6', // Reflect — violet
  C: '#06b6d4', // Context — cyan
  H: '#10b981', // Handoff — emerald
} as const;

// Operational mode status colors
export const MODE_COLORS = {
  SAFE: '#10b981',
  CONCIERGE: '#6366f1',
  RECEPTIONIST: '#3b82f6',
  SALES: '#f59e0b',
  CASHIER: '#ef4444',
  EMERGENCY: '#dc2626',
  CUSTOMER_SERVICE: '#0891b2',
} as const;

// ── Layout & Sizing Tokens (governed — never use literal size values) ──────────

/** Icon sizes — import these instead of writing size={22} or size={16}. */
export const ICON_SIZES = {
  footerControl: 24,
  footerPrimary: 28,
  menuItem: 22,
  canvasControl: 20,
  statusIndicator: 14,
} as const;

/** Minimum touch target dimensions (px) — WCAG AAA mobile compliance. */
export const TOUCH_TARGETS = {
  footerButton: 48,
  menuItem: 44,
  chip: 36,
} as const;

/** Footer zone — constitutional dimensions, not changeable by agents. */
export const FOOTER_ZONE = {
  height: 120,
  statusStripHeight: 24,
  logoHeight: 36,
  slotWidthPercent: { left: 22, center: 46, right: 16 },
} as const;

/** Visualizer zone — governs the circular pulse and AIOS logo sizing. */
export const VISUALIZER_ZONE = {
  ringRadiusFactor: 0.28,
  logoSize: 140,
  logoOpacity: 0.85,
} as const;

// ── Visual Elevation Model (6 Planes) ────────────────────────────────────────
// Canonical z-index tokens — never use raw z-[N] values.
// See: docs-governance/canonical/VISUAL_ELEVATION_AND_TURN_VISIBILITY_CONTRACT_V1.md
//
// Stack (bottom -> top):
//   Background -> Canvas Content -> App/Menu -> Interaction -> Agent -> System
//
// Rule: persistent surfaces for system/content/control.
//       Transient surfaces for active interaction only.

export const ELEVATION = {
  // Background Plane — always bottom
  background: 0,

  // Canvas Content Plane — persistent business content
  canvasContent: 10,
  activeExperience: 20,

  // App/Menu Plane — operational UI
  menuOverlay: 50,
  menuLoginGate: 52,
  menuSubView: 55,
  signInOverlay: 58,

  // Interaction Plane — turn-scoped, transient (mount/unmount with PTT lifecycle)
  interactionBase: 70,     // dim scrim behind visualizer
  interactionVisual: 72,   // visualizer + AIOS logo
  interactionUI: 74,       // transcript strip, turn controls

  // Agent Plane — who is operating
  agentIdentity: 80,

  // System Plane — non-negotiable, always wins
  novaGate: 90,
  systemOverlay: 100,
  splash: 200,
} as const;

// ── PTT Turn Visibility Types ────────────────────────────────────────────────
// UI appears only during active interaction. Idle = content-first, no overlays.

export type PttUiMode = 'idle' | 'recording' | 'processing' | 'speaking';

export interface VisibilityPolicy {
  visualizer: boolean;
  liveTranscript: boolean;
  thinkingMotion: boolean;
  appCanvas: boolean;
}

// Type exports for strict usage
export type ShellTokens = typeof SHELL;
export type CanvasTokens = typeof CANVAS;
export type BrandTokens = typeof BRAND;
export type ElevationTokens = typeof ELEVATION;

/**
 * Brand Theme Presets — curated named themes for business customization.
 *
 * Rules:
 * - Never add arbitrary hex values here — each entry is a fully-tested, governed theme.
 * - Step 3 of the onboarding flow selects from this map. No free-form color pickers.
 * - Business configs store `brandTheme: BrandThemeKey` — the canvas reads BRAND_THEMES[key].
 * - Default theme is 'gateway-dark'.
 */
export const BRAND_THEMES = {
  'gateway-dark': {
    label: 'Gateway Dark',
    description: 'Navy shell, white canvas, green accent — the core platform look.',
    shell:  { bg: '#0f172a', text: '#f8fafc', accent: '#008a3e' },
    canvas: { bg: '#ffffff', text: '#1e293b', accent: '#008a3e' },
  },
} as const;

export type BrandThemeKey = keyof typeof BRAND_THEMES;
export type BrandTheme = typeof BRAND_THEMES[BrandThemeKey];
