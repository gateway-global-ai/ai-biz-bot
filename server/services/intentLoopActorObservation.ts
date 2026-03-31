/**
 * Intent loop Phase B1 — actor (A) observation only from trusted session/site/runtime signals.
 * Does not affect routing, entitlements, or UI. Canonical: INTENT_LOOP_GOVERNANCE_V1.md § Phase B1.
 */

import type { CanvasSyscallEnvelope } from "../../shared/canvasViewContract";
import type {
  IntentLoopActorClass,
  IntentLoopDecisionReasonCode,
} from "../../shared/intentLoopContract";
import type {
  ResolvedVisitorSecurity,
  VisitorSessionSecurityProbe,
} from "./canvasDirectiveValidator.js";

export type IntentLoopActorSource = "security_context" | "site_runtime" | "session" | "unknown";

export interface IntentLoopActorObservationResult {
  actorClass: IntentLoopActorClass | "unknown";
  actorSource: IntentLoopActorSource;
  actorConfidence: number;
  actorHypothesis?: { actorClass: IntentLoopActorClass; confidence: number };
  actorReasonCodes: IntentLoopDecisionReasonCode[];
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
 * Resolve actor observation from trusted signals only (no transcript).
 * Server-resolved security from visitor_sessions wins over envelope hints for classification.
 */
export function resolveIntentLoopActorObservation(params: {
  resolvedSecurity: ResolvedVisitorSecurity;
  visitorIdPresent: boolean;
  visitorSessionProbe: VisitorSessionSecurityProbe;
  envelopeSecurityLevel: CanvasSyscallEnvelope["security"]["securityLevel"];
  intentLoopActorChannel?: "public" | "operator";
}): IntentLoopActorObservationResult {
  const {
    resolvedSecurity,
    visitorIdPresent,
    visitorSessionProbe,
    envelopeSecurityLevel,
    intentLoopActorChannel,
  } = params;

  const codes: IntentLoopDecisionReasonCode[] = [];
  const sessionConsulted = visitorIdPresent && visitorSessionProbe.sessionRowFound;
  if (sessionConsulted) {
    codes.push("actor_from_session");
  }

  if (
    intentLoopActorChannel === "operator" &&
    resolvedSecurity.securityLevel === "public" &&
    resolvedSecurity.authState === "anonymous"
  ) {
    codes.push("actor_unknown", "actor_channel_hint_diverged");
    return {
      actorClass: "unknown",
      actorSource: "unknown",
      actorConfidence: 0,
      actorHypothesis: { actorClass: "employee", confidence: 0.22 },
      actorReasonCodes: uniq(codes),
    };
  }

  if (
    visitorIdPresent &&
    visitorSessionProbe.sessionRowFound &&
    envelopeSecurityLevel !== resolvedSecurity.securityLevel
  ) {
    codes.push("actor_client_hint_diverged");
  }

  if (!visitorIdPresent) {
    codes.push("actor_unknown");
    return {
      actorClass: "unknown",
      actorSource: "unknown",
      actorConfidence: 0,
      actorHypothesis: { actorClass: "customer", confidence: 0.35 },
      actorReasonCodes: uniq(codes),
    };
  }

  if (!visitorSessionProbe.sessionRowFound) {
    codes.push("actor_unknown");
    return {
      actorClass: "unknown",
      actorSource: "unknown",
      actorConfidence: 0,
      actorHypothesis: { actorClass: "customer", confidence: 0.28 },
      actorReasonCodes: uniq(codes),
    };
  }

  codes.push("actor_from_security_context");

  if (resolvedSecurity.securityLevel === "admin") {
    return {
      actorClass: "management",
      actorSource: "security_context",
      actorConfidence: 0.95,
      actorReasonCodes: uniq(codes),
    };
  }

  if (resolvedSecurity.securityLevel === "staff") {
    return {
      actorClass: "employee",
      actorSource: "security_context",
      actorConfidence: 0.9,
      actorReasonCodes: uniq(codes),
    };
  }

  if (resolvedSecurity.securityLevel === "verified") {
    return {
      actorClass: "customer",
      actorSource: "security_context",
      actorConfidence: 0.82,
      actorReasonCodes: uniq(codes),
    };
  }

  // public + anonymous (typical anonymous visitor on /biz)
  codes.push("actor_unknown");
  return {
    actorClass: "unknown",
    actorSource: "unknown",
    actorConfidence: 0,
    actorHypothesis: { actorClass: "customer", confidence: 0.4 },
    actorReasonCodes: uniq(codes),
  };
}
