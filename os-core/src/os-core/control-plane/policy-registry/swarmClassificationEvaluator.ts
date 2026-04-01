/**
 * Swarm classification runtime evaluator.
 *
 * Validates agent role classification against composition rules,
 * restricted combinations, and swarm limits at policy decision time.
 *
 * This is the runtime companion to scripts/validate-agent-classification.ts
 * (build-time). It operates on SwarmRoleContext from the PolicyDecision
 * contract, not raw YAML.
 *
 * Source registry:
 *   registry-yaml/agent-classification-policy/composition_rules.v1.yaml
 *   registry-yaml/agent-classification-policy/restricted_combinations.v1.yaml
 *   registry-yaml/agent-classification-policy/swarm_limits.v1.yaml
 */

import type { SwarmRoleContext } from "../../../../../shared/policyDecisionContract.js";
import type { PolicyDenialReason, PolicyEscalationReason } from "../../../../../shared/policyDecisionContract.js";

export type ActorClass = "customer" | "employee" | "vendor" | "management";
const LIFECYCLE_STAGES = new Set(["outreach", "onboarding", "operations", "retention"]);
const CONTROL_STAGES = new Set(["planning", "tracking", "reporting", "optimization"]);

export interface ClassificationViolation {
  type: "deny" | "escalate";
  reason: PolicyDenialReason | PolicyEscalationReason;
  detail: string;
}

/**
 * Composition rules (hardened from composition_rules.v1.yaml).
 *
 * - lifecycle actors (customer, employee, vendor): stages from lifecycle namespace
 * - management actors: stages from control namespace
 */
function checkCompositionRules(ctx: SwarmRoleContext): ClassificationViolation[] {
  const violations: ClassificationViolation[] = [];
  const isManagement = ctx.primaryActorClass === "management";

  if (isManagement) {
    if (!CONTROL_STAGES.has(ctx.primaryStageClass)) {
      violations.push({
        type: "deny",
        reason: "role_forbidden_combination",
        detail: `Management actor must use control stages (planning/tracking/reporting/optimization), got "${ctx.primaryStageClass}"`,
      });
    }
    for (const s of ctx.secondaryStageClasses) {
      if (!CONTROL_STAGES.has(s)) {
        violations.push({
          type: "deny",
          reason: "role_forbidden_combination",
          detail: `Management actor secondary stage "${s}" is not a control stage`,
        });
      }
    }
  } else {
    if (!LIFECYCLE_STAGES.has(ctx.primaryStageClass)) {
      violations.push({
        type: "deny",
        reason: "role_forbidden_combination",
        detail: `${ctx.primaryActorClass} actor must use lifecycle stages (outreach/onboarding/operations/retention), got "${ctx.primaryStageClass}"`,
      });
    }
    for (const s of ctx.secondaryStageClasses) {
      if (!LIFECYCLE_STAGES.has(s) && !CONTROL_STAGES.has(s)) {
        violations.push({
          type: "deny",
          reason: "role_forbidden_combination",
          detail: `${ctx.primaryActorClass} actor secondary stage "${s}" is not a valid stage`,
        });
      }
    }
  }

  if (ctx.secondaryActorClasses.length > 2) {
    violations.push({
      type: "deny",
      reason: "swarm_limit_exceeded",
      detail: `Max 2 secondary actor classes, got ${ctx.secondaryActorClasses.length}`,
    });
  }

  if (ctx.secondaryStageClasses.length > 3) {
    violations.push({
      type: "deny",
      reason: "swarm_limit_exceeded",
      detail: `Max 3 secondary stage classes, got ${ctx.secondaryStageClasses.length}`,
    });
  }

  return violations;
}

/**
 * Forbidden primary pairs (hardened from composition_rules.v1.yaml).
 */
const FORBIDDEN_PRIMARY_PAIRS: Array<{
  actorClass: ActorClass;
  stageClass: string;
  reason: string;
}> = [
  {
    actorClass: "customer",
    stageClass: "planning",
    reason: "Customer-facing agents must not use control-only stage as primary",
  },
  {
    actorClass: "customer",
    stageClass: "optimization",
    reason: "Optimization is a management control class",
  },
];

function checkForbiddenPairs(ctx: SwarmRoleContext): ClassificationViolation[] {
  const violations: ClassificationViolation[] = [];
  for (const pair of FORBIDDEN_PRIMARY_PAIRS) {
    if (ctx.primaryActorClass === pair.actorClass && ctx.primaryStageClass === pair.stageClass) {
      violations.push({
        type: "deny",
        reason: "role_forbidden_combination",
        detail: pair.reason,
      });
    }
  }
  return violations;
}

/**
 * Restricted combinations requiring escalation
 * (hardened from restricted_combinations.v1.yaml).
 */
function checkRestrictedCombinations(ctx: SwarmRoleContext): ClassificationViolation[] {
  const violations: ClassificationViolation[] = [];

  if (ctx.primaryStageClass === "outreach" && ctx.secondaryStageClasses.includes("retention")) {
    violations.push({
      type: "escalate",
      reason: "approval_required",
      detail: "Outreach primary with retention secondary requires explicit approval",
    });
  }

  if (ctx.primaryStageClass === "operations" && ctx.secondaryStageClasses.includes("optimization")) {
    violations.push({
      type: "escalate",
      reason: "management_review_required",
      detail: "Operations + optimization overlap requires management review",
    });
  }

  if (ctx.primaryActorClass === "management") {
    violations.push({
      type: "escalate",
      reason: "management_review_required",
      detail: "Management-class agent in active prod requires review",
    });
  }

  return violations;
}

/**
 * Deploy posture check — review_required agents cannot auto-deploy.
 */
function checkDeployPosture(ctx: SwarmRoleContext): ClassificationViolation[] {
  if (ctx.deployPosture === "simulation_only") {
    return [{
      type: "deny",
      reason: "deploy_posture_review_required",
      detail: `Role "${ctx.roleType}" is simulation_only — not deployable`,
    }];
  }
  return [];
}

/**
 * Run all classification checks against a swarm role context.
 * Returns empty array if all checks pass.
 */
export function evaluateSwarmClassification(ctx: SwarmRoleContext): ClassificationViolation[] {
  return [
    ...checkCompositionRules(ctx),
    ...checkForbiddenPairs(ctx),
    ...checkRestrictedCombinations(ctx),
    ...checkDeployPosture(ctx),
  ];
}

/**
 * Quick check: does the role have any hard denials?
 */
export function hasClassificationDenials(violations: ClassificationViolation[]): boolean {
  return violations.some((v) => v.type === "deny");
}

/**
 * Quick check: does the role require escalation?
 */
export function hasClassificationEscalations(violations: ClassificationViolation[]): boolean {
  return violations.some((v) => v.type === "escalate");
}
