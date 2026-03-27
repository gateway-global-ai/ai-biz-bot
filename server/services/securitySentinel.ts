/**
 * Sovereign Sentinel — deterministic classification for **human-entered admin override reason**
 * text (no LLM). Used for knowledge certification queues and audit posture.
 *
 * Not related to ARCH envelope validation (`archEnvelopeValidator.ts`). Naming collision is
 * historical; docs use "Sovereign Sentinel" for this module only — see
 * `docs-governance/COMMUNICATION_PLANE_CONTRACT.md`.
 */

export type SentinelClassification = "ok" | "review_required";

export interface SentinelAuditResult {
  classification: SentinelClassification;
  auditDetail: {
    wordCount: number;
    hasVerificationKeyword: boolean;
    hasPricingSignal: boolean;
    reason: string;
  };
}

const VERIFICATION_KEYWORDS =
  /\b(verified|verification|otp|pms|reservation|invoice|payment|policy|compliance|audit)\b/i;
const PRICING_SIGNAL = /\$|€|£|\b(price|pricing|rate|fee)\b/i;

/**
 * Classify human-entered override reason text for governance review queue.
 */
export function classifyOverrideReasonText(reasonText: string): SentinelAuditResult {
  const trimmed = (reasonText || "").trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const hasVerificationKeyword = VERIFICATION_KEYWORDS.test(trimmed);
  const hasPricingSignal = PRICING_SIGNAL.test(trimmed);

  let classification: SentinelClassification = "ok";
  let reason = "within_heuristic_baseline";

  if (wordCount < 8) {
    classification = "review_required";
    reason = "too_few_words";
  } else if (wordCount < 40 && !hasVerificationKeyword) {
    classification = "review_required";
    reason = "short_without_verification_context";
  } else if (hasPricingSignal && !hasVerificationKeyword) {
    classification = "review_required";
    reason = "pricing_signal_without_verification_anchor";
  }

  return {
    classification,
    auditDetail: {
      wordCount,
      hasVerificationKeyword,
      hasPricingSignal,
      reason,
    },
  };
}
