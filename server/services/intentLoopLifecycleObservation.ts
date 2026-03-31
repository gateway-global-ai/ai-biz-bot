/**
 * Intent loop Phase B2 — lifecycle (L) observation only from trusted site/session JSON.
 * No transcript, no routing or entitlement effects. See INTENT_LOOP_GOVERNANCE_V1.md § Phase B2.
 */

import type {
  IntentLoopActorClass,
  IntentLoopDecisionReasonCode,
  IntentLoopLifecycleStage,
  IntentLoopManagementStage,
} from "../../shared/intentLoopContract";
import type { SiteRuntimeContext } from "../../shared/siteRuntimeContext";
import type { VisitorSessionSecurityProbe } from "./canvasDirectiveValidator.js";

export type IntentLoopLifecycleSource = "site_runtime" | "session" | "unknown";

export interface IntentLoopLifecycleObservationResult {
  /** Relationship / buyer funnel stage (customer–vendor lifecycle plane). */
  lifecycleStage: IntentLoopLifecycleStage | "unknown";
  /** Management control plane — deferred in B2 (observe unknown). */
  managementControlStage?: IntentLoopManagementStage | "unknown";
  lifecycleSource: IntentLoopLifecycleSource;
  lifecycleConfidence: number;
  /** Logs / JSON only — never routing authority (mirror actorHypothesis discipline). */
  lifecycleHypothesis?: { lifecycleStage: IntentLoopLifecycleStage; confidence: number };
  lifecycleReasonCodes: IntentLoopDecisionReasonCode[];
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

function tenantLifecycleFromSite(
  identity: SiteRuntimeContext["identity"],
): { stage: IntentLoopLifecycleStage; conf: number } | null {
  if (identity.workspaceState === "archived") {
    return { stage: "retention", conf: 0.82 };
  }
  if (identity.claimStatus === "claimed") {
    const conf = identity.workspaceState === "demo" ? 0.62 : 0.8;
    return { stage: "operations", conf };
  }
  if (
    identity.claimStatus === "unclaimed" ||
    identity.claimStatus === "invite_sent" ||
    identity.claimStatus === "payment_pending"
  ) {
    return { stage: "onboarding", conf: 0.74 };
  }
  if (identity.workspaceState === "demo") {
    return { stage: "outreach", conf: 0.55 };
  }
  if (
    identity.workspaceState === "active" ||
    identity.workspaceState === "provisioned" ||
    identity.workspaceState === "claimed"
  ) {
    return { stage: "operations", conf: 0.72 };
  }
  return null;
}

function lifecycleFromBuyerPhase(
  phase: string,
): { stage: IntentLoopLifecycleStage; conf: number } | null {
  switch (phase) {
    case "awareness":
    case "consideration":
      return { stage: "outreach", conf: 0.78 };
    case "demo":
    case "trial":
      return { stage: "onboarding", conf: 0.8 };
    case "activation":
      return { stage: "operations", conf: 0.82 };
    case "retention":
      return { stage: "retention", conf: 0.8 };
    default:
      return null;
  }
}

function useBuyerJourneyForActor(actorClass: IntentLoopActorClass | "unknown"): boolean {
  return actorClass === "customer" || actorClass === "vendor" || actorClass === "unknown";
}

/**
 * Deterministic L from site identity + allowlisted buyer_journey.phase (when actor permits).
 */
export function resolveIntentLoopLifecycleObservation(params: {
  siteRuntime: SiteRuntimeContext;
  actorClass: IntentLoopActorClass | "unknown";
  visitorSessionProbe: VisitorSessionSecurityProbe;
}): IntentLoopLifecycleObservationResult {
  const { siteRuntime, actorClass, visitorSessionProbe } = params;
  const tenant = tenantLifecycleFromSite(siteRuntime.identity);
  const buyerPhase =
    visitorSessionProbe.sessionRowFound && visitorSessionProbe.buyerJourneyPhase
      ? visitorSessionProbe.buyerJourneyPhase
      : null;

  if (actorClass === "management") {
    return {
      lifecycleStage: "unknown",
      managementControlStage: "unknown",
      lifecycleSource: "unknown",
      lifecycleConfidence: 0,
      lifecycleHypothesis: tenant
        ? { lifecycleStage: tenant.stage, confidence: Math.round(tenant.conf * 0.35 * 100) / 100 }
        : undefined,
      lifecycleReasonCodes: uniq(["lifecycle_unknown"]),
    };
  }

  if (actorClass === "employee") {
    if (tenant) {
      return {
        lifecycleStage: tenant.stage,
        lifecycleSource: "site_runtime",
        lifecycleConfidence: Math.round(tenant.conf * 0.9 * 100) / 100,
        lifecycleReasonCodes: uniq(["lifecycle_from_site_workspace"]),
      };
    }
    return {
      lifecycleStage: "unknown",
      lifecycleSource: "unknown",
      lifecycleConfidence: 0,
      lifecycleReasonCodes: uniq(["lifecycle_unknown"]),
    };
  }

  if (useBuyerJourneyForActor(actorClass) && buyerPhase) {
    const b = lifecycleFromBuyerPhase(buyerPhase);
    if (b) {
      return {
        lifecycleStage: b.stage,
        lifecycleSource: "session",
        lifecycleConfidence: b.conf,
        lifecycleReasonCodes: uniq(["lifecycle_from_buyer_journey"]),
      };
    }
  }

  if (tenant) {
    return {
      lifecycleStage: tenant.stage,
      lifecycleSource: "site_runtime",
      lifecycleConfidence: tenant.conf,
      lifecycleReasonCodes: uniq(["lifecycle_from_site_workspace"]),
    };
  }

  return {
    lifecycleStage: "unknown",
    lifecycleSource: "unknown",
    lifecycleConfidence: 0,
    lifecycleHypothesis: { lifecycleStage: "outreach", confidence: 0.3 },
    lifecycleReasonCodes: uniq(["lifecycle_unknown"]),
  };
}
