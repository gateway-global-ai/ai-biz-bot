/**
 * Intent loop Phase A / B1 — structured observation for canvas.resolve (no routing or entitlement changes).
 * Canonical: docs-governance/canonical/INTENT_LOOP_GOVERNANCE_V1.md
 */

import type { CanvasResolveResult, CanvasSyscallEnvelope } from "../../shared/canvasViewContract";
import type { SiteRuntimeContext } from "../../shared/siteRuntimeContext";
import {
  formatIntentLoopResolutionSummary,
  INTENT_LOOP_CONTRACT_VERSION,
  type IntentLoopDecisionReasonCode,
  type IntentLoopPhaseAObservation,
  type IntentLoopResolveAuthorityTrace,
} from "../../shared/intentLoopContract";
import type {
  ResolvedVisitorSecurity,
  VisitorSessionSecurityProbe,
} from "./canvasDirectiveValidator.js";
import { resolveIntentLoopActorObservation } from "./intentLoopActorObservation.js";
import { resolveIntentLoopLifecycleObservation } from "./intentLoopLifecycleObservation.js";
import { resolveIntentLoopDomainObservation } from "./intentLoopDomainObservation.js";

function phaseALogEnabled(): boolean {
  const v = process.env.INTENT_LOOP_PHASE_A_LOG;
  if (v === "0" || v === "false") return false;
  return true;
}

function dedupeReasonCodes(codes: IntentLoopDecisionReasonCode[]): IntentLoopDecisionReasonCode[] {
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
 * Routing / workspace / tier tags merged with actor observation codes (deterministic).
 */
export function buildIntentLoopDecisionReasonCodes(params: {
  resolveResult: CanvasResolveResult;
  visitorIdPresent: boolean;
  siteRuntime: SiteRuntimeContext;
  actorReasonCodes: IntentLoopDecisionReasonCode[];
  lifecycleReasonCodes: IntentLoopDecisionReasonCode[];
  domainReasonCodes: IntentLoopDecisionReasonCode[];
}): IntentLoopDecisionReasonCode[] {
  const { resolveResult, visitorIdPresent, siteRuntime, actorReasonCodes, lifecycleReasonCodes, domainReasonCodes } =
    params;
  const codes: IntentLoopDecisionReasonCode[] = [
    ...actorReasonCodes,
    ...lifecycleReasonCodes,
    ...domainReasonCodes,
  ];

  const tier = resolveResult.intentRouterTier;
  if (tier === 1) codes.push("keyword_match");
  else if (tier === 2) codes.push("tier2_inference");
  else if (tier === 3) codes.push("fallback_tier_3");

  if (resolveResult.renderMode === "disambiguate") {
    codes.push("disambiguation_branch");
  }

  if (visitorIdPresent) {
    codes.push("security_gate");
  }

  const { workspaceState, claimStatus } = siteRuntime.identity;
  if (
    claimStatus === "claimed" ||
    workspaceState === "active" ||
    workspaceState === "provisioned" ||
    workspaceState === "claimed"
  ) {
    codes.push("workspace_claim_detected");
  }

  return dedupeReasonCodes(codes);
}

export function buildIntentLoopPhaseAObservation(params: {
  envelope: CanvasSyscallEnvelope;
  siteRuntime: SiteRuntimeContext;
  resolvedSecurity: ResolvedVisitorSecurity;
  visitorSessionProbe: VisitorSessionSecurityProbe;
  resolveResult: CanvasResolveResult;
  visitorIdPresent: boolean;
}): IntentLoopPhaseAObservation {
  const { envelope, siteRuntime, resolvedSecurity, visitorSessionProbe, resolveResult, visitorIdPresent } =
    params;
  const payload = envelope.payload as { transcript?: string } | undefined;
  const transcript = typeof payload?.transcript === "string" ? payload.transcript : "";

  const signalSources: IntentLoopPhaseAObservation["signalSources"] = [
    "site_runtime",
    "canvas_intent_router",
    "transcript_metrics",
  ];
  if (visitorIdPresent) signalSources.push("visitor_session");
  signalSources.push("envelope_security_hint");

  const sessionRef =
    envelope.sessionId.length > 8
      ? `${envelope.sessionId.slice(0, 8)}…`
      : envelope.sessionId;

  const actorObs = resolveIntentLoopActorObservation({
    resolvedSecurity,
    visitorIdPresent,
    visitorSessionProbe,
    envelopeSecurityLevel: envelope.security.securityLevel,
    intentLoopActorChannel: envelope.context?.intentLoopActorChannel,
  });

  const lifecycleObs = resolveIntentLoopLifecycleObservation({
    siteRuntime,
    actorClass: actorObs.actorClass,
    visitorSessionProbe,
  });

  const domainObs = resolveIntentLoopDomainObservation({
    visitorSessionProbe,
  });

  const decisionReasonCodes = buildIntentLoopDecisionReasonCodes({
    resolveResult,
    visitorIdPresent,
    siteRuntime,
    actorReasonCodes: actorObs.actorReasonCodes,
    lifecycleReasonCodes: lifecycleObs.lifecycleReasonCodes,
    domainReasonCodes: domainObs.domainReasonCodes,
  });

  const stateVectorHints: IntentLoopPhaseAObservation["stateVectorHints"] = {
    actorClass: actorObs.actorClass,
    actorSource: actorObs.actorSource,
    actorConfidence: actorObs.actorConfidence,
    lifecycleStage: lifecycleObs.lifecycleStage,
    managementControlStage: lifecycleObs.managementControlStage,
    lifecycleSource: lifecycleObs.lifecycleSource,
    lifecycleConfidence: lifecycleObs.lifecycleConfidence,
    domainJourneyKey: domainObs.domainJourneyKey,
    domainSource: domainObs.domainSource,
    domainConfidence: domainObs.domainConfidence,
    domainReasonCodes: domainObs.domainReasonCodes,
    entitlementPlan: siteRuntime.entitlements.plan,
    allowedCanvasViewCount: siteRuntime.entitlements.allowedCanvasViews.length,
    enabledSkillCount: siteRuntime.entitlements.enabledSkills.length,
    visitorSecurityLevel: resolvedSecurity.securityLevel,
    authState: resolvedSecurity.authState,
    workspaceState: siteRuntime.identity.workspaceState,
    claimStatus: siteRuntime.identity.claimStatus,
  };
  if (actorObs.actorHypothesis) {
    stateVectorHints.actorHypothesis = actorObs.actorHypothesis;
  }
  if (lifecycleObs.lifecycleHypothesis) {
    stateVectorHints.lifecycleHypothesis = lifecycleObs.lifecycleHypothesis;
  }

  return {
    event: "intent_loop.phase_a",
    contractVersion: INTENT_LOOP_CONTRACT_VERSION,
    syscallId: envelope.syscallId,
    turnId: envelope.turnId,
    siteConfigId: envelope.siteConfigId,
    sessionRef,
    syscallSource: envelope.source,
    signalSources,
    decisionReasonCodes,
    stateVectorHints,
    routingHints: {
      canvasRouterTier: resolveResult.intentRouterTier,
      selectedViewId: resolveResult.selectedViewId,
      renderMode: resolveResult.renderMode,
    },
    transcriptCharLength: transcript.length,
  };
}

export function logIntentLoopPhaseA(observation: IntentLoopPhaseAObservation): void {
  if (!phaseALogEnabled()) return;
  try {
    console.log("[intent_loop.phase_a]", JSON.stringify(observation));
  } catch {
    console.log("[intent_loop.phase_a]", observation.event, observation.syscallId);
  }
}

/** Router vs merged authority — same log gate as Phase A (`INTENT_LOOP_PHASE_A_LOG`). */
export function logIntentLoopResolveAuthority(payload: {
  siteConfigId: string;
  syscallId: string;
  turnId: string;
  trace: IntentLoopResolveAuthorityTrace;
}): void {
  if (!phaseALogEnabled()) return;
  try {
    console.log("[intent_loop.resolve_authority]", JSON.stringify(payload));
  } catch {
    console.log("[intent_loop.resolve_authority]", payload.syscallId);
  }
}

export function withIntentLoopResolutionSummary(
  resolveResult: CanvasResolveResult,
  observation: IntentLoopPhaseAObservation,
): CanvasResolveResult {
  const formatted = formatIntentLoopResolutionSummary(observation);
  const prior = resolveResult.resolutionSummary;
  const resolutionSummary =
    prior?.startsWith("continuity:") ? `${prior} | ${formatted}` : formatted;
  return {
    ...resolveResult,
    resolutionSummary,
  };
}
