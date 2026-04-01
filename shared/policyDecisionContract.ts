/**
 * PolicyDecision contract (v1).
 *
 * The structured output of every policy evaluation. Replaces boolean
 * evaluatePolicyGate() with a typed, auditable decision that carries:
 *   - verdict (allow / deny / escalate / degrade)
 *   - the full context that produced the decision (actor, lifecycle, role, gate)
 *   - rationale codes for auditability
 *   - enforcement metadata (what to do next)
 *
 * Canonical governance:
 *   docs-governance/canonical/AI_OS_OPERATING_DOCTRINE_V1.md  § Doctrine 1
 *   docs-governance/canonical/CLASSIFICATION_GOVERNANCE_SPEC_V1.md
 *   docs-governance/canonical/AGENT_BEHAVIOR_SPEC_V1.md
 *
 * This contract is consumed by:
 *   - evaluatePolicyGate()  → produces PolicyDecision
 *   - executeAction()       → gates on PolicyDecision.verdict
 *   - IntentLoopResolver    → merge step that constrains views/actions
 *   - audit_events table    → serialized as JSONB evidence
 */

import { z } from "zod";
import {
  KNOWLEDGE_CERTIFICATION_LEVELS,
  KNOWLEDGE_SOURCE_TYPES,
} from "./knowledgeCertificationContract";

export const POLICY_DECISION_CONTRACT_VERSION = "policy_decision.v1" as const;

export const POLICY_VERDICTS = ["allow", "deny", "escalate", "degrade"] as const;

export const POLICY_DENIAL_REASONS = [
  "gate_not_registered",
  "gate_disabled",
  "actor_class_mismatch",
  "lifecycle_stage_mismatch",
  "role_not_in_swarm",
  "role_forbidden_combination",
  "swarm_limit_exceeded",
  "write_capable_limit_exceeded",
  "capability_not_granted",
  "mutation_level_denied",
  "proficiency_probe_failed",
  "deploy_posture_review_required",
  "entitlement_missing",
  "safe_mode_active",
  "identity_not_verified",
  "session_expired",
  "rate_limit_exceeded",
] as const;

export const POLICY_ESCALATION_REASONS = [
  "restricted_combination_detected",
  "management_review_required",
  "approval_required",
  "high_impact_action",
  "financial_side_effect",
  "cross_actor_class_override",
] as const;

export const POLICY_DEGRADE_REASONS = [
  "knowledge_gap_detected",
  "confidence_below_threshold",
  "fallback_to_safe_mode",
  "domain_journey_unknown",
  "actor_unknown_degrade",
] as const;

/**
 * Doctrine violation codes — machine-enforceable invariants from
 * AI_OS_OPERATING_DOCTRINE_V1.md. Each maps 1:1 to a doctrine principle.
 *
 * These are structural violations detected at runtime or CI — not
 * business-logic denials. A doctrine violation means the *system itself*
 * is misconfigured, not that a user lacks permission.
 */
export const DOCTRINE_VIOLATION_CODES = [
  /** Doctrine 2: Action executed without PolicyDecision (bypass detected). */
  "DOCTRINE_VIOLATION_DIRECT_EXECUTION",
  /** Doctrine 2: Permission derived from prompt text, not registry/policy. */
  "DOCTRINE_VIOLATION_PROMPT_POLICY",
  /** Doctrine 5: Model invoked tool/MCP directly, bypassing skill adapter. */
  "DOCTRINE_VIOLATION_DIRECT_TOOL_CALL",
  /** Doctrine 6: Response missing handoff/next-step when H >= threshold. */
  "DOCTRINE_VIOLATION_NO_FALLBACK",
  /** Doctrine 7: View rendered that is not in the canvas view registry. */
  "DOCTRINE_VIOLATION_UNREGISTERED_VIEW",
  /** Doctrine 7: Action executed that is not in the actions registry. */
  "DOCTRINE_VIOLATION_UNREGISTERED_ACTION",
  /** Doctrine 10: Multiple sources defining the same authority class. */
  "DOCTRINE_VIOLATION_SPLIT_AUTHORITY",
  /** Doctrine 10: Route added to legacy routes.ts instead of modular file. */
  "DOCTRINE_VIOLATION_MONOLITH_ROUTE",
  /** Doctrine 4: Agent deployed below proficiency threshold. */
  "DOCTRINE_VIOLATION_UNPROFICIENT_DEPLOYMENT",
  /** Doctrine 1: Execution happened outside the intent loop. */
  "DOCTRINE_VIOLATION_BYPASS_INTENT_LOOP",
  /** Doctrine 3: Behavioral profile defined as prose, not numeric DISC/ARCH. */
  "DOCTRINE_VIOLATION_PROSE_BEHAVIOR",
  /** Doctrine 8: Canvas view rendered without being in allowedViewIds. */
  "DOCTRINE_VIOLATION_CANVAS_BYPASS",
  /** Doctrine 11: Knowledge injected without certification filtering. */
  "DOCTRINE_VIOLATION_UNCERTIFIED_KNOWLEDGE",
  /** Doctrine 11: LLM inference output treated as authoritative knowledge source. */
  "DOCTRINE_VIOLATION_INFERENCE_AS_AUTHORITY",
  /** Doctrine 12: External code executed inside quarantine without approval. */
  "DOCTRINE_VIOLATION_QUARANTINE_EXECUTION",
  /** Doctrine 12: Package installed bypassing quarantine scan pipeline. */
  "DOCTRINE_VIOLATION_PACKAGE_INSTALL_BYPASS",
  /** Doctrine 12: External source imported into workspace without quarantine scan. */
  "DOCTRINE_VIOLATION_UNSCANNED_IMPORT",
] as const;

export type DoctrineViolationCode = (typeof DOCTRINE_VIOLATION_CODES)[number];

export type PolicyVerdict = (typeof POLICY_VERDICTS)[number];
export type PolicyDenialReason = (typeof POLICY_DENIAL_REASONS)[number];
export type PolicyEscalationReason = (typeof POLICY_ESCALATION_REASONS)[number];
export type PolicyDegradeReason = (typeof POLICY_DEGRADE_REASONS)[number];

export type PolicyReasonCode =
  | PolicyDenialReason
  | PolicyEscalationReason
  | PolicyDegradeReason;

/**
 * Swarm role context — the agent's classification at decision time.
 * Sourced from registry-yaml/agent-classification-policy/ + agents row.
 */
export const SwarmRoleContextSchema = z.object({
  roleType: z.string().min(1),
  primaryActorClass: z.enum(["customer", "employee", "vendor", "management"]),
  secondaryActorClasses: z.array(z.enum(["customer", "employee", "vendor", "management"])).default([]),
  primaryStageClass: z.string().min(1),
  secondaryStageClasses: z.array(z.string()).default([]),
  operationalMode: z.string().optional(),
  schematicId: z.string().optional(),
  deployPosture: z.enum(["review_required", "auto_deploy", "simulation_only"]).optional(),
});

/**
 * Intent context — the caller's state vector at decision time.
 * Sourced from IntentLoopResolver Phase A/B observations.
 */
export const IntentContextSchema = z.object({
  actorClass: z.enum(["customer", "employee", "vendor", "management", "unknown"]).default("unknown"),
  actorConfidence: z.number().min(0).max(1).default(0),
  lifecycleStage: z.string().default("unknown"),
  lifecycleConfidence: z.number().min(0).max(1).default(0),
  domainJourneyKey: z.string().default("unknown"),
  domainConfidence: z.number().min(0).max(1).default(0),
  sessionRef: z.string().optional(),
  entitlementPlan: z.string().optional(),
});

/**
 * The structured policy decision — the output of every gate evaluation.
 */
export const PolicyDecisionSchema = z.object({
  contractVersion: z.literal(POLICY_DECISION_CONTRACT_VERSION),

  /** Unique decision id for audit trail correlation. */
  decisionId: z.string().min(1),

  /** The policy gate that was evaluated. */
  policyGate: z.string().min(1),

  verdict: z.enum(POLICY_VERDICTS),

  /**
   * Primary reason codes explaining the verdict.
   * Empty for `allow`; populated for deny/escalate/degrade.
   */
  reasonCodes: z.array(z.string()).default([]),

  /** Human-readable rationale for operator dashboards and audit. */
  rationale: z.string().optional(),

  /** The swarm role that was active when the decision was made. */
  swarmRoleContext: SwarmRoleContextSchema.optional(),

  /** The intent loop state vector at decision time. */
  intentContext: IntentContextSchema.optional(),

  /** Action-specific: the actionId being gated (when applicable). */
  actionId: z.string().optional(),

  /**
   * Enforcement directives — what the caller should do.
   *
   * For `deny`:     fallbackViewId or refusal message
   * For `escalate`: escalation target (human, management agent, etc.)
   * For `degrade`:  reduced capability set, safe mode profile
   */
  enforcement: z.object({
    fallbackViewId: z.string().optional(),
    fallbackMessage: z.string().optional(),
    escalationTarget: z.string().optional(),
    degradedCapabilities: z.array(z.string()).optional(),
    safeModeProfile: z.string().optional(),
  }).default({}),

  /**
   * Knowledge governance — what certification levels this decision permits.
   * When set, the intent loop MUST filter injected knowledge to only these levels.
   * When absent, defaults to ["approved", "trusted"] (concierge preset).
   */
  allowedKnowledgeLevels: z
    .array(z.enum(KNOWLEDGE_CERTIFICATION_LEVELS))
    .optional(),

  /**
   * Knowledge governance — which source types are admissible.
   * When set, knowledge from other source types is excluded.
   * When absent, all non-inference types are allowed.
   */
  allowedKnowledgeSourceTypes: z
    .array(z.enum(KNOWLEDGE_SOURCE_TYPES))
    .optional(),

  /**
   * Doctrine violations detected during this evaluation.
   * Empty for normal policy decisions; populated when the *system itself*
   * is misconfigured (bypass, split authority, unregistered artifact).
   */
  doctrineViolations: z.array(z.enum(DOCTRINE_VIOLATION_CODES)).default([]),

  /** ISO timestamp of decision. */
  decidedAt: z.string().datetime(),

  /** Site config anchor. */
  siteConfigId: z.string().optional(),
});

export type SwarmRoleContext = z.infer<typeof SwarmRoleContextSchema>;
export type IntentContext = z.infer<typeof IntentContextSchema>;
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export function parsePolicyDecision(raw: unknown): PolicyDecision {
  return PolicyDecisionSchema.parse(raw);
}

/**
 * Create an allow decision (fast path).
 */
export function allowDecision(params: {
  decisionId: string;
  policyGate: string;
  siteConfigId?: string;
  swarmRoleContext?: SwarmRoleContext;
  intentContext?: IntentContext;
  actionId?: string;
}): PolicyDecision {
  return {
    contractVersion: POLICY_DECISION_CONTRACT_VERSION,
    decisionId: params.decisionId,
    policyGate: params.policyGate,
    verdict: "allow",
    reasonCodes: [],
    swarmRoleContext: params.swarmRoleContext,
    intentContext: params.intentContext,
    actionId: params.actionId,
    siteConfigId: params.siteConfigId,
    enforcement: {},
    decidedAt: new Date().toISOString(),
  };
}

/**
 * Create a deny decision with structured rationale.
 */
export function denyDecision(params: {
  decisionId: string;
  policyGate: string;
  reasonCodes: PolicyReasonCode[];
  rationale: string;
  siteConfigId?: string;
  swarmRoleContext?: SwarmRoleContext;
  intentContext?: IntentContext;
  actionId?: string;
  enforcement?: PolicyDecision["enforcement"];
}): PolicyDecision {
  return {
    contractVersion: POLICY_DECISION_CONTRACT_VERSION,
    decisionId: params.decisionId,
    policyGate: params.policyGate,
    verdict: "deny",
    reasonCodes: params.reasonCodes,
    rationale: params.rationale,
    swarmRoleContext: params.swarmRoleContext,
    intentContext: params.intentContext,
    actionId: params.actionId,
    siteConfigId: params.siteConfigId,
    enforcement: params.enforcement ?? {},
    decidedAt: new Date().toISOString(),
  };
}

/**
 * Create an escalation decision — action requires human or management review.
 */
export function escalateDecision(params: {
  decisionId: string;
  policyGate: string;
  reasonCodes: PolicyEscalationReason[];
  rationale: string;
  escalationTarget: string;
  siteConfigId?: string;
  swarmRoleContext?: SwarmRoleContext;
  intentContext?: IntentContext;
  actionId?: string;
}): PolicyDecision {
  return {
    contractVersion: POLICY_DECISION_CONTRACT_VERSION,
    decisionId: params.decisionId,
    policyGate: params.policyGate,
    verdict: "escalate",
    reasonCodes: params.reasonCodes,
    rationale: params.rationale,
    swarmRoleContext: params.swarmRoleContext,
    intentContext: params.intentContext,
    actionId: params.actionId,
    siteConfigId: params.siteConfigId,
    enforcement: { escalationTarget: params.escalationTarget },
    decidedAt: new Date().toISOString(),
  };
}

/**
 * Create a degrade decision — reduce capabilities rather than hard deny.
 * Maps to safe mode, fallback routes, reduced tool sets.
 */
export function degradeDecision(params: {
  decisionId: string;
  policyGate: string;
  reasonCodes: PolicyDegradeReason[];
  rationale: string;
  siteConfigId?: string;
  swarmRoleContext?: SwarmRoleContext;
  intentContext?: IntentContext;
  actionId?: string;
  enforcement?: PolicyDecision["enforcement"];
}): PolicyDecision {
  return {
    contractVersion: POLICY_DECISION_CONTRACT_VERSION,
    decisionId: params.decisionId,
    policyGate: params.policyGate,
    verdict: "degrade",
    reasonCodes: params.reasonCodes,
    rationale: params.rationale,
    swarmRoleContext: params.swarmRoleContext,
    intentContext: params.intentContext,
    actionId: params.actionId,
    siteConfigId: params.siteConfigId,
    enforcement: params.enforcement ?? {},
    decidedAt: new Date().toISOString(),
  };
}

/**
 * Compact audit line for operator trace and log indexing.
 */
export function formatPolicyDecisionSummary(d: PolicyDecision): string {
  const parts: string[] = [
    `gate=${d.policyGate}`,
    `verdict=${d.verdict}`,
  ];
  if (d.actionId) parts.push(`action=${d.actionId}`);
  if (d.reasonCodes.length > 0) parts.push(`reasons=${d.reasonCodes.join(",")}`);
  if (d.swarmRoleContext) parts.push(`role=${d.swarmRoleContext.roleType}`);
  if (d.intentContext?.actorClass && d.intentContext.actorClass !== "unknown") {
    parts.push(`actor=${d.intentContext.actorClass}`);
  }
  if (d.intentContext?.lifecycleStage && d.intentContext.lifecycleStage !== "unknown") {
    parts.push(`lc=${d.intentContext.lifecycleStage}`);
  }
  if (d.allowedKnowledgeLevels && d.allowedKnowledgeLevels.length > 0) {
    parts.push(`knowledge=${d.allowedKnowledgeLevels.join(",")}`);
  }
  if (d.doctrineViolations && d.doctrineViolations.length > 0) {
    parts.push(`doctrine=${d.doctrineViolations.join(",")}`);
  }
  if (d.siteConfigId) parts.push(`site=${d.siteConfigId.slice(0, 8)}…`);
  return parts.join(" ");
}
