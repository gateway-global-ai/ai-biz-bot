/**
 * Intent loop control-plane contract (v1).
 * Canonical prose: docs-governance/canonical/INTENT_LOOP_GOVERNANCE_V1.md
 * Research draft: user_uploads/governane_plan3_26/plan3_27/intent_loop_plan.md
 */

export const INTENT_LOOP_CONTRACT_VERSION = "intent_loop.v1" as const;

/**
 * Explainable reason tags for intent-loop telemetry (log analysis, tests).
 * **Non-authoritative** — does not replace validators or routing; grows as A/L/D are populated.
 */
export const INTENT_LOOP_DECISION_REASON_CODES = [
  "keyword_match",
  "tier2_inference",
  "fallback_tier_3",
  "disambiguation_branch",
  "workspace_claim_detected",
  "security_gate",
  /** Visitor session row was loaded (correlation / provenance). */
  "actor_from_session",
  /** Actor class derived from resolved security / auth (visitor_sessions authoritative path). */
  "actor_from_security_context",
  /** Actor class from trusted site/runtime signal (owner linkage, etc.) — sparse in B1. */
  "actor_from_site_role",
  "actor_unknown",
  /** Envelope channel hint disagrees with resolved security (observe-only). */
  "actor_channel_hint_diverged",
  /** Client envelope security hint ≠ server-resolved security when session row exists. */
  "actor_client_hint_diverged",
  "lifecycle_unknown",
  /** L from site_configs-derived identity (workspace + claim). */
  "lifecycle_from_site_workspace",
  /** L from allowlisted visitor_sessions.buyer_journey.phase (structured JSON only). */
  "lifecycle_from_buyer_journey",
  /** Deprecated tag — prefer lifecycle_from_site_workspace / lifecycle_from_buyer_journey. */
  "lifecycle_inferred_operations",
  /**
   * D not yet observed from trusted vertical evidence (B3).
   * Never from transcript, workspace claim, L, or generic business category alone.
   */
  "domain_unknown",
  /** D from allowlisted `visitor_sessions.buyer_journey.intent_loop_domain_v1` (PMS guest journey snapshot). */
  "domain_from_pms_guest_journey_v1",
] as const;

export type IntentLoopDecisionReasonCode =
  (typeof INTENT_LOOP_DECISION_REASON_CODES)[number];

/** Actor class per INTENT_LOOP_GOVERNANCE_V1 state vector (A). */
export type IntentLoopActorClass =
  | "customer"
  | "employee"
  | "vendor"
  | "management";

/** Customer/employee/vendor lifecycle stage (L) — extend via registry as needed. */
export type IntentLoopLifecycleStage =
  | "outreach"
  | "onboarding"
  | "operations"
  | "retention";

/** Management control stage when actor is management (L) — see AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1. */
export type IntentLoopManagementStage =
  | "planning"
  | "tracking"
  | "reporting"
  | "optimization";

/** Partial state vector inputs to resolution (observability + future resolver). */
export interface IntentLoopStateVector {
  actorClass?: IntentLoopActorClass;
  lifecycle?: IntentLoopLifecycleStage | IntentLoopManagementStage;
  /** Domain journey key (e.g. hospitality guest journey). */
  domainJourneyKey?: string;
  /** Opaque session / visitor identifiers — no PII in logs. */
  sessionRef?: string;
  /** Entitlement snapshot keys only (e.g. plan tier, allowed view ids). */
  entitlementKeys?: string[];
  /** Active swarm / role context (ids or slugs from DB/registry). */
  swarmRoleRef?: string;
  operationalMode?: string;
}

/** Merge order step applied (audit). */
export type IntentLoopMergeStep =
  | "classification"
  | "domain"
  | "role"
  | "tenant"
  | "turn";

/**
 * Target output of IntentLoopResolver (Phase B+).
 * Fields optional until wired; use for typing traces and API drafts.
 */
export interface IntentLoopResolution {
  contractVersion: typeof INTENT_LOOP_CONTRACT_VERSION;
  /** Stable id for audit correlation. */
  resolutionId: string;
  stateVector: IntentLoopStateVector;
  mergeStepsApplied: IntentLoopMergeStep[];
  /** Registry references (YAML id + semver when available). */
  swarmSchematicRef?: { id: string; version?: string };
  allowedCanvasViewIds?: string[];
  allowedActionIds?: string[];
  /** Human or structured rationale for denials / clarifications. */
  auditNotes?: string[];
}

/**
 * Provenance for `canvas.resolve` (Sub-agent C): Tier-1/Tier-3 router output vs merged
 * server authority. Phase A logs still describe **router** signals; this trace is the
 * explicit **final** view for debugging without rebuilding Phase A payloads.
 */
export interface IntentLoopResolveAuthorityTrace {
  routerSelectedViewId?: string;
  finalSelectedViewId?: string;
  routerRenderMode: "replace" | "patch" | "noop" | "disambiguate";
  finalRenderMode: "replace" | "patch" | "noop" | "disambiguate";
}

/** Which inputs contributed to Phase A observation (audit / trace). */
export type IntentLoopPhaseASignalSource =
  | "site_runtime"
  | "visitor_session"
  | "envelope_security_hint"
  | "transcript_metrics"
  | "canvas_intent_router";

/**
 * Phase A — structured observation for server logs and optional operator trace.
 * No raw transcript or PII; session/site ids may appear only as truncated refs when needed for correlation.
 */
export interface IntentLoopPhaseAObservation {
  event: "intent_loop.phase_a";
  contractVersion: typeof INTENT_LOOP_CONTRACT_VERSION;
  syscallId: string;
  turnId: string;
  siteConfigId: string;
  /** Truncated session id for log correlation (first 8 chars + …). */
  sessionRef?: string;
  syscallSource?: string;
  signalSources: IntentLoopPhaseASignalSource[];
  stateVectorHints?: {
    /** Actor class (A) — `unknown` when evidence is weak (Phase B1 observe-only). */
    actorClass?: IntentLoopActorClass | "unknown";
    /** Provenance for `actorClass` (trusted path label). */
    actorSource?: "security_context" | "site_runtime" | "session" | "unknown";
    /** 0–1 confidence in actor observation (not routing authority). */
    actorConfidence?: number;
    /**
     * Non-authoritative hypothesis when `actorClass` is `unknown` — **logs / JSON only**,
     * not used for routing or entitlements.
     */
    actorHypothesis?: { actorClass: IntentLoopActorClass; confidence: number };
    /** Lifecycle (L) — Phase B2 observe-only. */
    lifecycleStage?: IntentLoopLifecycleStage | "unknown";
    managementControlStage?: IntentLoopManagementStage | "unknown";
    lifecycleSource?: "site_runtime" | "session" | "unknown";
    lifecycleConfidence?: number;
    /**
     * Non-authoritative when lifecycle is weak — **logs / JSON only**;
     * do not treat as soft truth downstream until explicitly blessed.
     */
    lifecycleHypothesis?: { lifecycleStage: IntentLoopLifecycleStage; confidence: number };
    /**
     * Domain journey (D) — Phase B3. Values align with PMS guest-journey classification when observed;
     * default `unknown` when no allowlisted snapshot on the resolve chain.
     */
    domainJourneyKey?: string;
    /** Provenance for domain observation (trusted snapshot path vs none). */
    domainSource?: "pms_guest_journey_snapshot_v1" | "unknown";
    domainConfidence?: number;
    /** B3 reason tags (subset of decisionReasonCodes; repeated for explicit D telemetry). */
    domainReasonCodes?: IntentLoopDecisionReasonCode[];
    /**
     * Non-authoritative when D is unknown — logs / JSON only; same discipline as actor/lifecycle hypotheses.
     */
    domainHypothesis?: { domainJourneyKey: string; confidence: number };
    entitlementPlan?: string;
    allowedCanvasViewCount?: number;
    enabledSkillCount?: number;
    visitorSecurityLevel?: string;
    authState?: string;
    workspaceState?: string;
    claimStatus?: string;
  };
  routingHints?: {
    canvasRouterTier?: 1 | 2 | 3;
    selectedViewId?: string;
    renderMode?: string;
  };
  /** Transcript length only — not content. */
  transcriptCharLength?: number;
  /**
   * Deterministic tags explaining which factors appear in this observation.
   * Omitted or empty when not yet computed; prefer stable enum values for dashboards.
   */
  decisionReasonCodes?: IntentLoopDecisionReasonCode[];
}

/** Compact, PII-free line for dev operator trace (`?canvasTrace=1`). */
export function formatIntentLoopResolutionSummary(
  obs: Pick<IntentLoopPhaseAObservation, "stateVectorHints" | "routingHints">,
): string {
  const r = obs.routingHints;
  const s = obs.stateVectorHints;
  const parts: string[] = [];
  if (r?.canvasRouterTier != null) parts.push(`t${r.canvasRouterTier}`);
  if (r?.selectedViewId) parts.push(`view=${r.selectedViewId}`);
  if (r?.renderMode) parts.push(`mode=${r.renderMode}`);
  if (s?.actorClass === "unknown") parts.push("actor=unknown");
  else if (s?.actorClass) parts.push(`actor=${s.actorClass}`);
  if (s?.lifecycleStage === "unknown") parts.push("lc=unknown");
  else if (s?.lifecycleStage) parts.push(`lc=${s.lifecycleStage}`);
  if (s?.domainJourneyKey === "unknown" || !s?.domainJourneyKey) parts.push("dj=unknown");
  else if (s.domainJourneyKey) parts.push(`dj=${s.domainJourneyKey}`);
  if (s?.entitlementPlan) parts.push(`plan=${s.entitlementPlan}`);
  if (s?.workspaceState) parts.push(`ws=${s.workspaceState}`);
  if (s?.visitorSecurityLevel) parts.push(`sec=${s.visitorSecurityLevel}`);
  return parts.length > 0 ? parts.join(" ") : "intent_loop.phase_a";
}
