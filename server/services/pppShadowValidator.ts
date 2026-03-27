/**
 * PPP shadow-mode adherence — fast heuristics on assistant text (chat only). Audit/telemetry; does not block.
 * Align skip/urgent logic with `buildPppEngagementFragment` / `pppEngagementFragment.ts`.
 */
import type { PppEngagementConfig, PppShadowScore } from "@shared/conversationGrounding";
import { getOperationalMode, isModeNoDriftLocked } from "../config/operationalModes";
import { hasHandoffCue } from "./archEnvelopeValidator";

export interface PppShadowContext {
  operationalMode?: string | null;
  pppEngagement: PppEngagementConfig;
}

export function skippedPppShadowScore(
  reason: "ppp_disabled" | "urgent_minimal" | "platform_landing"
): PppShadowScore {
  return {
    compositeScore: 0,
    hasPurpose: false,
    hasPlan: false,
    hasPressure: false,
    hasHandoff: false,
    isViolation: false,
    skipped: true,
    skippedReason: reason,
  };
}

/** v1 keyword heuristics — tune lists as product learns; avoid inferring inner states. */
function detectPurposeSignals(lower: string): boolean {
  return /(goal|outcome|achieve|target|looking for|help you with|resolve|what you('re| are) trying|objective)/i.test(
    lower
  );
}

function detectPlanSignals(lower: string): boolean {
  return /(plan|step|process|first|next|system|currently|approach|path forward|roadmap)/i.test(lower);
}

function detectPressureSignals(lower: string): boolean {
  return /(when|timeline|deadline|today|urgent|soon|by|date|this week|end of|asap|mileston)/i.test(lower);
}

function violationThreshold(ctx: PppShadowContext): number {
  const salesEmphasis =
    String(ctx.operationalMode ?? "").toUpperCase() === "SALES" ||
    ctx.pppEngagement?.mode === "sales_emphasis";
  const salesT = Number(process.env.PPP_SHADOW_SALES_THRESHOLD);
  const defaultT = Number(process.env.PPP_SHADOW_VIOLATION_THRESHOLD);
  if (salesEmphasis) {
    return Number.isFinite(salesT) && salesT > 0 ? salesT : 75;
  }
  return Number.isFinite(defaultT) && defaultT > 0 ? defaultT : 50;
}

function isUrgentMinimalMode(modeId: string | null | undefined): boolean {
  if (modeId === "EMERGENCY") return true;
  if (isModeNoDriftLocked(modeId)) return true;
  const modeDef = getOperationalMode(modeId);
  return modeDef?.noDriftLocked === true;
}

/**
 * Score assistant text for observable Purpose / Plan / Pressure / Handoff cues.
 */
export function analyzePppShadow(text: string, ctx: PppShadowContext): PppShadowScore {
  if (ctx.pppEngagement?.enabled === false) {
    return skippedPppShadowScore("ppp_disabled");
  }

  if (isUrgentMinimalMode(ctx.operationalMode)) {
    return skippedPppShadowScore("urgent_minimal");
  }

  const lowerText = text.toLowerCase();

  const hasPurpose = detectPurposeSignals(lowerText);
  const hasPlan = detectPlanSignals(lowerText);
  const hasPressure = detectPressureSignals(lowerText);
  const hasHandoff = hasHandoffCue(text);

  let score = 0;
  if (hasPurpose) score += 25;
  if (hasPlan) score += 25;
  if (hasPressure) score += 25;
  if (hasHandoff) score += 25;

  const threshold = violationThreshold(ctx);
  const isViolation = score < threshold;

  return {
    compositeScore: score,
    hasPurpose,
    hasPlan,
    hasPressure,
    hasHandoff,
    isViolation,
  };
}
