import { loadActions } from "../registry-loader/loadActions";
import type { ActionResult } from "../registry-loader/types";
import { evaluatePolicyGate } from "../policy-registry/evaluatePolicyGate";
import {
  evaluatePolicyDecision,
  type EvaluatePolicyGateInput,
} from "../policy-registry/evaluatePolicyGate";
import type {
  PolicyDecision,
  SwarmRoleContext,
  IntentContext,
} from "../../../../../shared/policyDecisionContract.js";
import { formatPolicyDecisionSummary } from "../../../../../shared/policyDecisionContract.js";

interface ExecuteActionInput {
  actionId: string;
  contextKeys: Record<string, string>;
  payload?: Record<string, unknown>;
  /** Optional: swarm role context for structured policy decisions. */
  swarmRoleContext?: SwarmRoleContext;
  /** Optional: intent loop context for structured policy decisions. */
  intentContext?: IntentContext;
}

export interface ExecuteActionResult {
  actionResult: ActionResult;
  policyDecision: PolicyDecision;
}

function ensureRequiredContext(
  requiredContextKeys: string[],
  contextKeys: Record<string, string>
) {
  for (const key of requiredContextKeys) {
    if (!contextKeys[key]) {
      throw new Error(`Missing required context key: ${key}`);
    }
  }
}

export async function executeAction({
  actionId,
  contextKeys,
  payload = {},
  swarmRoleContext,
  intentContext,
}: ExecuteActionInput): Promise<ExecuteActionResult> {
  const actions = loadActions();
  const action = actions.actions.find((entry) => entry.actionId === actionId);

  if (!action) {
    throw new Error(`Unknown action: ${actionId}`);
  }

  ensureRequiredContext(action.requiredContextKeys, contextKeys);

  const decision = evaluatePolicyDecision({
    policyGate: action.requiredPolicy,
    siteConfigId: contextKeys.siteConfigId,
    swarmRoleContext,
    intentContext,
    actionId,
  });

  if (decision.verdict === "deny") {
    return {
      actionResult: {
        status: "denied",
        actionId,
        entity: action.entity,
        entityId: contextKeys[action.requiredContextKeys[0]] ?? "",
        changedFields: [],
        message: decision.enforcement.fallbackMessage
          ?? `Policy denied: ${formatPolicyDecisionSummary(decision)}`,
        nextSuggestedActions: decision.enforcement.fallbackViewId
          ? [decision.enforcement.fallbackViewId]
          : [],
      },
      policyDecision: decision,
    };
  }

  if (decision.verdict === "escalate") {
    return {
      actionResult: {
        status: "escalated",
        actionId,
        entity: action.entity,
        entityId: contextKeys[action.requiredContextKeys[0]] ?? "",
        changedFields: [],
        message: decision.rationale
          ?? `Escalation required: ${formatPolicyDecisionSummary(decision)}`,
        nextSuggestedActions: decision.enforcement.escalationTarget
          ? [`escalate_to:${decision.enforcement.escalationTarget}`]
          : ["escalate_to:management"],
      },
      policyDecision: decision,
    };
  }

  const wrapResult = (actionResult: ActionResult): ExecuteActionResult => ({
    actionResult,
    policyDecision: decision,
  });

  switch (actionId) {
    case "agent.proposeDominanceChange": {
      const value = Number(payload.value ?? 0);
      const previousValue = Number(payload.previousValue ?? 0);
      const entityId = contextKeys.agentId;

      return wrapResult({
        status: "success",
        actionId,
        entity: action.entity,
        entityId,
        changedFields: ["dominance"],
        change: {
          parameter: "DOMINANCE",
          previousValue,
          newValue: value,
        },
        nextSuggestedActions: [
          "review_safe_mode",
          "adjust_allowed_tools",
          "return_to_agent_config",
        ],
        message: `Dominance updated to ${value}.`,
      });
    }
    case "agent.applySafeModeProfile": {
      const profile = String(payload.profile ?? "");
      const previousValue = String(payload.previousValue ?? "");
      const entityId = contextKeys.agentId;

      return wrapResult({
        status: "success",
        actionId,
        entity: action.entity,
        entityId,
        changedFields: ["safeModeProfile"],
        change: {
          parameter: "SAFE_MODE_PROFILE",
          previousValue,
          newValue: profile,
        },
        nextSuggestedActions: [
          "adjust_dominance",
          "review_allowed_tools",
          "return_to_agent_config",
        ],
        message: `Safe Mode profile updated to ${profile}.`,
      });
    }
    case "agent.applyGroundingImportance": {
      const value = Number(payload.value ?? 0);
      const previousValue = Number(payload.previousValue ?? 0);
      const entityId = contextKeys.agentId;

      return wrapResult({
        status: "success",
        actionId,
        entity: action.entity,
        entityId,
        changedFields: ["groundingImportance"],
        change: {
          parameter: "GROUNDING_IMPORTANCE",
          previousValue,
          newValue: value,
        },
        nextSuggestedActions: [
          "adjust_filter_transparency",
          "review_required_filters",
          "return_to_agent_config",
        ],
        message: `Grounding importance updated to ${value}.`,
      });
    }
    case "session.joinAssist": {
      const sessionId = contextKeys.sessionId;
      const previousValue = String(payload.previousState ?? "AI_ACTIVE");
      const nextMode = String(payload.nextMode ?? "OPERATOR_JOINED");
      return wrapResult({
        status: "success",
        actionId,
        entity: action.entity,
        entityId: sessionId,
        auditEvent: action.auditEvent,
        changedFields: ["workflowState", "assistMode", "escalationState"],
        change: {
          parameter: "WORKFLOW_STATE",
          previousValue,
          newValue: nextMode,
        },
        nextSuggestedActions: ["review_transcript", "capture_outcome", "return_to_queue"],
        message: "Operator joined the session in assisted mode.",
      });
    }
    case "session.endAssist": {
      const sessionId = contextKeys.sessionId;
      const previousValue = String(payload.previousState ?? "OPERATOR_JOINED");
      const nextMode = String(payload.nextMode ?? "AI_ACTIVE");
      return wrapResult({
        status: "success",
        actionId,
        entity: action.entity,
        entityId: sessionId,
        auditEvent: action.auditEvent,
        changedFields: ["workflowState", "assistMode", "escalationState"],
        change: {
          parameter: "WORKFLOW_STATE",
          previousValue,
          newValue: nextMode,
        },
        nextSuggestedActions: ["monitor_queue", "capture_outcome", "review_next_session"],
        message: "Operator ended assist mode and returned session to AI.",
      });
    }
    case "session.resolveOutcome": {
      const sessionId = contextKeys.sessionId;
      const previousValue = String(payload.previousState ?? "OPERATOR_JOINED");
      const nextMode = "RESOLVED";
      const outcomeType = String(payload.outcomeType ?? "resolved_no_action");
      return wrapResult({
        status: "success",
        actionId,
        entity: action.entity,
        entityId: sessionId,
        auditEvent: action.auditEvent,
        changedFields: ["workflowState", "escalationState", "outcomeType"],
        change: {
          parameter: "WORKFLOW_STATE",
          previousValue,
          newValue: nextMode,
        },
        nextSuggestedActions: ["open_next_session", "review_daily_metrics"],
        message: `Session resolved and outcome captured (${outcomeType}).`,
      });
    }
    default:
      throw new Error(`No local handler implemented for action: ${actionId}`);
  }
}
