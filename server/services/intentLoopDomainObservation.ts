/**
 * Intent loop Phase B3 — domain journey (D) observation from allowlisted server evidence only.
 * Does not use transcript, workspace claim, L (lifecycle), buyer phase, or generic business category.
 * Canonical: docs-governance/canonical/INTENT_LOOP_GOVERNANCE_V1.md § Phase B3
 */

import type { GuestJourneyKind } from "../tools/cloudbedsGuestJourneyClassification.js";
import type { IntentLoopDecisionReasonCode } from "../../shared/intentLoopContract";
import type { VisitorSessionSecurityProbe } from "./canvasDirectiveValidator.js";

export type IntentLoopDomainSource = "pms_guest_journey_snapshot_v1" | "unknown";

export interface IntentLoopDomainObservationResult {
  /** Hospitality guest-journey class from trusted snapshot, or logical unknown. */
  domainJourneyKey: GuestJourneyKind | "unknown";
  domainSource: IntentLoopDomainSource;
  /** 0–1; not routing authority. */
  domainConfidence: number;
  domainReasonCodes: IntentLoopDecisionReasonCode[];
  /**
   * Logs / JSON only when D stays unknown — not used in B3 v1 (no weak inference).
   */
  domainHypothesis?: { domainJourneyKey: GuestJourneyKind; confidence: number };
}

function uniq(codes: IntentLoopDecisionReasonCode[]): IntentLoopDecisionReasonCode[] {
  const seen = new Set<IntentLoopDecisionReasonCode>();
  const out: IntentLoopDecisionReasonCode[] = [];
  for (const c of codes) {
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}

/**
 * D observes **vertical guest journey** only from trusted PMS snapshot on the resolve chain.
 * Ignores site workspace, claim, buyer_journey.phase (L), businessType, and transcript.
 */
export function resolveIntentLoopDomainObservation(params: {
  visitorSessionProbe: VisitorSessionSecurityProbe;
}): IntentLoopDomainObservationResult {
  const snap = params.visitorSessionProbe.intentLoopDomainSnapshot ?? null;

  if (snap) {
    const codes: IntentLoopDecisionReasonCode[] = ["domain_from_pms_guest_journey_v1"];
    return {
      domainJourneyKey: snap.domainJourneyKey,
      domainSource: "pms_guest_journey_snapshot_v1",
      domainConfidence: snap.confidence,
      domainReasonCodes: uniq(codes),
    };
  }

  return {
    domainJourneyKey: "unknown",
    domainSource: "unknown",
    domainConfidence: 0,
    domainReasonCodes: uniq(["domain_unknown"]),
  };
}
