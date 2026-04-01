const randomUUID = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

import {
  type PolicyDecision,
  type SwarmRoleContext,
  type IntentContext,
  POLICY_DECISION_CONTRACT_VERSION,
  allowDecision,
  denyDecision,
  escalateDecision,
} from "../../../../../shared/policyDecisionContract.js";
import {
  evaluateSwarmClassification,
  hasClassificationDenials,
  hasClassificationEscalations,
} from "./swarmClassificationEvaluator.js";
import { isRegisteredGate } from "./policyGateCatalog.js";

/**
 * Legacy hardcoded gate set — used ONLY by the backward-compatible
 * boolean evaluatePolicyGate() function. New code uses the catalog.
 */
const ALPHA_ALLOWED_GATES = new Set([
  "os_boot_ready",
  "admin_access",
  "workspace_access",
  "agent_config_access",
  "agent_behavior_control",
  "support_public",
  "admin.onboarding.read",
  "admin.onboarding.write",
  "runtime_chaos_mutate",
  "telephony.paid_activation.write",
  "messaging.verification_only",
  "messaging.customer_care",
  "messaging.marketing",
  "frontdesk.assist.write",
  "frontdesk.outcome.write",
]);

/**
 * Gates that require specific actor classes (deny if actor doesn't match).
 */
const ACTOR_GATED: Record<string, Set<string>> = {
  "admin_access":                new Set(["employee", "management"]),
  "admin.onboarding.read":       new Set(["employee", "management"]),
  "admin.onboarding.write":      new Set(["employee", "management"]),
  "agent_config_access":         new Set(["employee", "management"]),
  "agent_behavior_control":      new Set(["management"]),
  "runtime_chaos_mutate":        new Set(["management"]),
  "telephony.paid_activation.write": new Set(["employee", "management"]),
  "frontdesk.assist.write":      new Set(["employee", "management"]),
  "frontdesk.outcome.write":     new Set(["employee", "management"]),
};

/**
 * Gates that require management review when a restricted combination is detected.
 */
const ESCALATION_GATES = new Set([
  "agent_behavior_control",
  "runtime_chaos_mutate",
  "telephony.paid_activation.write",
]);

export interface EvaluatePolicyGateInput {
  policyGate: string;
  siteConfigId?: string;
  swarmRoleContext?: SwarmRoleContext;
  intentContext?: IntentContext;
  actionId?: string;
}

/**
 * Structured policy evaluation — replaces the boolean gate with a full
 * PolicyDecision carrying verdict, rationale, and enforcement directives.
 *
 * Backward-compatible: callers that only need boolean can use
 * `evaluatePolicyGate(gate)` which still returns boolean.
 */
export function evaluatePolicyDecision(input: EvaluatePolicyGateInput): PolicyDecision {
  const decisionId = randomUUID();
  const { policyGate, siteConfigId, swarmRoleContext, intentContext, actionId } = input;

  if (!isRegisteredGate(policyGate)) {
    return denyDecision({
      decisionId,
      policyGate,
      reasonCodes: ["gate_not_registered"],
      rationale: `Gate "${policyGate}" is not in the registry catalog (actions.yaml + logical-routes.yaml + views.yaml + server gates)`,
      siteConfigId,
      swarmRoleContext,
      intentContext,
      actionId,
      enforcement: {
        fallbackMessage: `Action requires policy gate "${policyGate}" which is not registered`,
      },
    });
  }

  const actorClass = intentContext?.actorClass;
  const actorRequirement = ACTOR_GATED[policyGate];
  if (actorRequirement && actorClass && actorClass !== "unknown") {
    if (!actorRequirement.has(actorClass)) {
      return denyDecision({
        decisionId,
        policyGate,
        reasonCodes: ["actor_class_mismatch"],
        rationale: `Gate "${policyGate}" requires actor class [${[...actorRequirement].join(", ")}] but got "${actorClass}"`,
        siteConfigId,
        swarmRoleContext,
        intentContext,
        actionId,
        enforcement: {
          fallbackMessage: "This action is not available for your role",
          fallbackViewId: "canvas.refusal",
        },
      });
    }
  }

  if (ESCALATION_GATES.has(policyGate) && swarmRoleContext) {
    const hasManagement =
      swarmRoleContext.primaryActorClass === "management" ||
      swarmRoleContext.secondaryActorClasses.includes("management");
    if (!hasManagement && swarmRoleContext.deployPosture === "review_required") {
      return escalateDecision({
        decisionId,
        policyGate,
        reasonCodes: ["management_review_required"],
        rationale: `Gate "${policyGate}" on role "${swarmRoleContext.roleType}" requires management review (deploy_posture: review_required)`,
        escalationTarget: "management_agent",
        siteConfigId,
        swarmRoleContext,
        intentContext,
        actionId,
      });
    }
  }

  if (swarmRoleContext) {
    const classViolations = evaluateSwarmClassification(swarmRoleContext);

    if (hasClassificationDenials(classViolations)) {
      const denials = classViolations.filter((v) => v.type === "deny");
      return denyDecision({
        decisionId,
        policyGate,
        reasonCodes: denials.map((d) => d.reason),
        rationale: denials.map((d) => d.detail).join("; "),
        siteConfigId,
        swarmRoleContext,
        intentContext,
        actionId,
        enforcement: {
          fallbackMessage: "Agent role classification is invalid — action blocked",
          fallbackViewId: "canvas.refusal",
        },
      });
    }

    if (hasClassificationEscalations(classViolations)) {
      const escalations = classViolations.filter((v) => v.type === "escalate");
      return escalateDecision({
        decisionId,
        policyGate,
        reasonCodes: escalations.map((e) => e.reason) as import("../../../../../shared/policyDecisionContract.js").PolicyEscalationReason[],
        rationale: escalations.map((e) => e.detail).join("; "),
        escalationTarget: "management_agent",
        siteConfigId,
        swarmRoleContext,
        intentContext,
        actionId,
      });
    }
  }

  return allowDecision({
    decisionId,
    policyGate,
    siteConfigId,
    swarmRoleContext,
    intentContext,
    actionId,
  });
}

/**
 * Legacy boolean API — backward compatible with existing callers.
 * New code should use evaluatePolicyDecision() for structured decisions.
 */
export function evaluatePolicyGate(policyGate: string): boolean {
  return ALPHA_ALLOWED_GATES.has(policyGate);
}
