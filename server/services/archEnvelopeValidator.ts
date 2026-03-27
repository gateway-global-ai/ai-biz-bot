/**
 * ARCH output envelope validation — deterministic checks on **model text** after chat generation.
 *
 * Responsibility: enforce handoff/next-step cues (and SAFE-mode claim checks) for website chat
 * and `POST /api/chat`. This is **not** the "Sovereign Sentinel" — that name is reserved for
 * `securitySentinel.ts` (admin override reason classification). Do not conflate in telemetry or docs.
 *
 * Voice / Gemini Live: do not add blocking calls here to execution-plane voice files; see
 * `docs-governance/COMMUNICATION_PLANE_CONTRACT.md` and `EXECUTION_PLANE_BOUNDARY_SPEC.md`.
 *
 * PPP shadow scoring (`pppShadowValidator`) reuses `hasHandoffCue`; it is separate telemetry, not Sentinel.
 */
import type { ArchProfile } from "@shared/schema";

export type ArchValidationMode = string | undefined;

export interface ArchValidationContext {
  operationalMode?: ArchValidationMode;
  archProfile?: ArchProfile | null;
  /** When true, handoff (H) required */
  requireHandoff?: boolean;
}

export interface ArchValidationResult {
  ok: boolean;
  violations: string[];
  /** Use when ok is false */
  fallbackResponse?: string;
}

const HANDOFF_FALLBACK =
  "What would you like to do next — I can help you with another question, or connect you with someone on the team. Which works best for you?";

/** Detect explicit next-step question or clear binary choice. Shared with PPP shadow scoring. */
export function hasHandoffCue(text: string): boolean {
  const t = text.trim();
  if (/\?\s*$/.test(t)) return true;
  if (/\b(or|which|would you|could you|can I)\b/i.test(t) && t.length < 1200) return true;
  if (/\b(let me know|reply with|choose|select)\b/i.test(t)) return true;
  return false;
}

export function validateArchEnvelope(
  text: string,
  ctx: ArchValidationContext
): ArchValidationResult {
  const violations: string[] = [];
  const mode = (ctx.operationalMode || "").toUpperCase();
  const handoffSlider = ctx.archProfile?.handoff ?? 40;

  const requireStrongHandoff =
    mode === "CUSTOMER_SUPPORT" ||
    mode === "CUSTOMER_SERVICE" ||
    mode === "CASHIER" ||
    mode === "SALES" ||
    (ctx.requireHandoff ?? false) ||
    handoffSlider >= 50;

  if (requireStrongHandoff && !hasHandoffCue(text)) {
    violations.push("missing_handoff_or_next_step");
  }

  if (mode === "SAFE" && /\b(i will |we will |i'll |scheduled|charged your|completed)\b/i.test(text)) {
    violations.push("safe_mode_action_claim");
  }

  const ok = violations.length === 0;
  return {
    ok,
    violations,
    fallbackResponse: ok ? undefined : HANDOFF_FALLBACK,
  };
}
