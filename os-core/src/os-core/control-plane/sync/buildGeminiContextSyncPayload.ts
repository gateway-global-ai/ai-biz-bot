import type { ActionResult } from "../registry-loader/types";
import type {
  GeminiContextSyncPayload,
  GeminiOsState,
  GeminiSyncUpdateType,
} from "../../execution-plane/contracts/SyncPayload";
import type { CanvasSnapshot } from "../../../shell/SharedCanvasProvider";

function getUpdateType(actionId: string): GeminiSyncUpdateType {
  switch (actionId) {
    case "agent.proposeDominanceChange":
      return "BEHAVIORAL_SLIDER";
    case "agent.applySafeModeProfile":
      return "SAFE_MODE_PROFILE";
    case "agent.applyGroundingImportance":
      return "GROUNDING_POLICY";
    default:
      return "BEHAVIORAL_SLIDER";
  }
}

function buildSystemInjection(result: ActionResult): string {
  switch (result.actionId) {
    case "agent.proposeDominanceChange":
      return `SYSTEM NOTICE: The human operator adjusted your behavioral controls. Your DOMINANCE score is now ${result.change.newValue}/100. Immediately adopt a more decisive and assertive tone in your next response.`;
    case "agent.applySafeModeProfile":
      return `SYSTEM NOTICE: The human operator changed your SAFE MODE PROFILE to ${result.change.newValue}. Immediately follow the new runtime boundaries in your next response.`;
    case "agent.applyGroundingImportance":
      return `SYSTEM NOTICE: The human operator changed your GROUNDING IMPORTANCE to ${result.change.newValue}/100. Adjust your next response so retrieval and clarification effort match this new grounding requirement.`;
    default:
      return "SYSTEM NOTICE: Your runtime behavior settings were updated. Adopt the new configuration in your next response.";
  }
}

export function buildGeminiContextSyncPayload(
  result: ActionResult,
  osState: GeminiOsState
): GeminiContextSyncPayload {
  return {
    timestamp: new Date().toISOString(),
    target_agent_id: result.entityId,
    update_type: getUpdateType(result.actionId),
    changes: {
      parameter: result.change.parameter,
      previous_value: result.change.previousValue,
      new_value: result.change.newValue,
    },
    os_state: osState,
    system_injection: buildSystemInjection(result),
  };
}

export function buildOsState(snapshot: CanvasSnapshot): GeminiOsState {
  return {
    shell_mode: snapshot.shellMode,
    active_route_id: snapshot.currentRouteId,
    active_view_id: snapshot.currentViewId,
    breadcrumbs: snapshot.breadcrumb,
  };
}

export function buildRouteNavigationSyncPayload(
  previousState: GeminiOsState,
  nextState: GeminiOsState,
  targetAgentId: string
): GeminiContextSyncPayload {
  return {
    timestamp: new Date().toISOString(),
    target_agent_id: targetAgentId,
    update_type: "ROUTE_NAVIGATION",
    changes: {
      parameter: "ACTIVE_ROUTE_ID",
      previous_value: previousState.active_route_id,
      new_value: nextState.active_route_id,
    },
    os_state: nextState,
    system_injection: `SYSTEM NOTICE: The human operator navigated to route ${nextState.active_route_id} in shell mode ${nextState.shell_mode}. The active view is now ${nextState.active_view_id}. Align your next response to this operating context.`,
  };
}
