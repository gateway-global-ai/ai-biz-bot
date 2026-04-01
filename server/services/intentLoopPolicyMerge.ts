/**
 * Intent loop policy merge step.
 *
 * Applies PolicyDecision constraints to IntentLoopResolution output.
 * This is the bridge between swarm classification, actor/lifecycle state,
 * and the view/action constraints the intent loop produces.
 *
 * Position in merge chain:
 *   classification → domain → role → tenant → **policy** → turn
 *
 * Canonical governance:
 *   INTENT_LOOP_GOVERNANCE_V1.md § Merge order
 *   AI_OS_OPERATING_DOCTRINE_V1.md § Doctrine 1 (Policy is physics)
 *   CLASSIFICATION_GOVERNANCE_SPEC_V1.md § Classification Authority
 */

import type {
  IntentLoopResolution,
  IntentLoopMergeStep,
  IntentLoopStateVector,
} from "../../shared/intentLoopContract.js";
import type {
  PolicyDecision,
  SwarmRoleContext,
  IntentContext,
} from "../../shared/policyDecisionContract.js";
import { formatPolicyDecisionSummary } from "../../shared/policyDecisionContract.js";

export interface PolicyMergeInput {
  resolution: IntentLoopResolution;
  policyDecision: PolicyDecision;
}

export interface PolicyMergeResult {
  resolution: IntentLoopResolution;
  policyApplied: boolean;
  policyAuditLine: string;
}

/**
 * Build IntentContext from IntentLoopStateVector for policy evaluation.
 */
export function intentContextFromStateVector(sv: IntentLoopStateVector): IntentContext {
  return {
    actorClass: sv.actorClass ?? "unknown",
    actorConfidence: 0,
    lifecycleStage: (sv.lifecycle as string) ?? "unknown",
    lifecycleConfidence: 0,
    domainJourneyKey: sv.domainJourneyKey ?? "unknown",
    domainConfidence: 0,
    sessionRef: sv.sessionRef,
    entitlementPlan: sv.entitlementKeys?.find((k) => k.startsWith("plan:"))?.replace("plan:", ""),
  };
}

/**
 * Apply a PolicyDecision to an IntentLoopResolution.
 *
 * - `allow`: pass through unchanged (add audit note)
 * - `deny`: clear allowedCanvasViewIds, force fallback view if specified
 * - `escalate`: preserve views but add escalation audit, restrict actions
 * - `degrade`: reduce to safe mode views/actions
 */
export function applyPolicyMerge(input: PolicyMergeInput): PolicyMergeResult {
  const { policyDecision } = input;
  const resolution = structuredClone(input.resolution);
  const auditLine = formatPolicyDecisionSummary(policyDecision);

  if (!resolution.auditNotes) {
    resolution.auditNotes = [];
  }

  if (!resolution.mergeStepsApplied.includes("policy" as IntentLoopMergeStep)) {
    resolution.mergeStepsApplied = [
      ...resolution.mergeStepsApplied,
      "policy" as IntentLoopMergeStep,
    ];
  }

  switch (policyDecision.verdict) {
    case "allow": {
      resolution.auditNotes.push(`policy:allow ${auditLine}`);
      return { resolution, policyApplied: true, policyAuditLine: auditLine };
    }

    case "deny": {
      const fallback = policyDecision.enforcement.fallbackViewId;
      if (fallback) {
        resolution.allowedCanvasViewIds = [fallback];
      } else {
        resolution.allowedCanvasViewIds = [];
      }
      resolution.allowedActionIds = [];
      resolution.auditNotes.push(`policy:deny ${auditLine}`);
      return { resolution, policyApplied: true, policyAuditLine: auditLine };
    }

    case "escalate": {
      resolution.allowedActionIds = (resolution.allowedActionIds ?? []).filter(
        (a) => !a.includes("write") && !a.includes("mutate"),
      );
      resolution.auditNotes.push(`policy:escalate ${auditLine}`);
      return { resolution, policyApplied: true, policyAuditLine: auditLine };
    }

    case "degrade": {
      const safeFallback = policyDecision.enforcement.fallbackViewId;
      if (safeFallback && resolution.allowedCanvasViewIds) {
        resolution.allowedCanvasViewIds = resolution.allowedCanvasViewIds.filter(
          (v) => v === safeFallback || v === "welcome" || v === "support_home",
        );
        if (resolution.allowedCanvasViewIds.length === 0) {
          resolution.allowedCanvasViewIds = [safeFallback];
        }
      }
      if (policyDecision.enforcement.degradedCapabilities) {
        resolution.allowedActionIds = policyDecision.enforcement.degradedCapabilities;
      }
      resolution.auditNotes.push(`policy:degrade ${auditLine}`);
      return { resolution, policyApplied: true, policyAuditLine: auditLine };
    }

    default:
      resolution.auditNotes.push(`policy:unknown_verdict ${auditLine}`);
      return { resolution, policyApplied: false, policyAuditLine: auditLine };
  }
}

/**
 * Enrich the state vector with swarm role information when available.
 */
export function enrichStateVectorWithRole(
  sv: IntentLoopStateVector,
  role: SwarmRoleContext,
): IntentLoopStateVector {
  return {
    ...sv,
    swarmRoleRef: `${role.schematicId ?? "unknown"}/${role.roleType}`,
    operationalMode: role.operationalMode ?? sv.operationalMode,
  };
}
