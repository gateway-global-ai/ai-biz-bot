import { loadAgentPolicies } from "../registry-loader/loadAgentPolicies";
import { loadLogicalRoutes } from "../registry-loader/loadLogicalRoutes";
import { loadUIElements } from "../registry-loader/loadUIElements";
import {
  findUIElementByElementId,
  findUIElementBySemanticAlias,
} from "../registry-loader/uiElementQueries";
import type { GeminiIncomingAction } from "../../execution-plane/contracts/IncomingAction";
import { searchMockDatabase } from "./searchMockDatabase";
import type { BusinessCandidate } from "../../../shell/SharedCanvasProvider";

export interface IncomingActionDecision {
  allowed: boolean;
  reason: string;
  actionType:
    | "route"
    | "highlight"
    | "focus"
    | "mutate"
    | "runtimeMutate"
    | "support"
    | "supportDraft"
    | "candidateSelection"
    | "onboardingDraft"
    | "unsupported";
  targetRoutePath?: string;
  targetRouteId?: string;
  highlight?: {
    elementId: string;
    durationMs: number;
    valid: boolean;
  };
  stagedSupportText?: string;
  candidateResults?: BusinessCandidate[];
  stagedOnboardingData?: Partial<{
    business_name: string;
    city: string;
    state: string;
    zip: string;
    contact_email: string;
    category: string;
  }>;
  behaviorMutation?:
    | { key: "dominance"; value: number }
    | { key: "groundingImportance"; value: number }
    | { key: "safeModeProfile"; value: string };
  runtimeMutation?: {
    chaosEnabled: boolean;
    minLatencyMs: number;
    maxLatencyMs: number;
    dropRate: number;
  };
}

export function handleIncomingAction(
  action: GeminiIncomingAction,
  currentContext: { siteConfigId?: string; agentId?: string } = {}
): IncomingActionDecision {
  const policies = loadAgentPolicies();
  const routes = loadLogicalRoutes();
  const uiElements = loadUIElements();

  const agent = policies.agents.find(
    (policy) => policy.agentId === action.target_agent_id
  );
  if (!agent) {
    return {
      allowed: false,
      reason: `Unknown agent policy: ${action.target_agent_id}`,
      actionType: "unsupported",
    };
  }

  if (action.tool_name === "switch_view") {
    if (agent.safeModeProfile === "strict") {
      return {
        allowed: false,
        reason: `Policy block: ${action.target_agent_id} is operating in strict Safe Mode.`,
        actionType: "route",
      };
    }

    if (!agent.allowedActions.includes("route.navigate")) {
      return {
        allowed: false,
        reason: `Policy block: ${action.target_agent_id} may not navigate routes.`,
        actionType: "route",
      };
    }

    const route = routes.routes.find(
      (entry) => entry.routeId === action.args.target_logical_route
    );

    if (!route || !route.optionalBrowserPath) {
      return {
        allowed: false,
        reason: `Unknown or non-browser-routable route: ${action.args.target_logical_route}`,
        actionType: "route",
      };
    }

    return {
      allowed: true,
      reason: "Incoming action approved by Action Registry.",
      actionType: "route",
      targetRouteId: route.routeId,
      targetRoutePath: route.optionalBrowserPath,
    };
  }

  if (action.tool_name === "highlight_ui_element") {
    if (!agent.allowedActions.includes("ui.highlight")) {
      return {
        allowed: false,
        reason: `Policy block: ${action.target_agent_id} may not highlight UI elements.`,
        actionType: "highlight",
      };
    }

    const target = findUIElementByElementId(
      uiElements,
      action.args.element_id
    );
    const valid = Boolean(target);
    return {
      allowed: true,
      reason: valid
        ? "Incoming highlight action approved by Action Registry."
        : `Highlight target ${action.args.element_id} does not exist on the current governed surface.`,
      actionType: "highlight",
      highlight: {
        elementId: action.args.element_id,
        durationMs: action.args.duration_ms,
        valid,
      },
    };
  }

  if (action.tool_name === "focus_behavior_control") {
    if (agent.safeModeProfile === "strict") {
      return {
        allowed: false,
        reason: `Policy block: ${action.target_agent_id} is operating in strict Safe Mode.`,
        actionType: "focus",
      };
    }

    if (
      !agent.allowedActions.includes("route.navigate") ||
      !agent.allowedActions.includes("ui.highlight")
    ) {
      return {
        allowed: false,
        reason: `Policy block: ${action.target_agent_id} may not focus behavior controls.`,
        actionType: "focus",
      };
    }

    const target = findUIElementBySemanticAlias(
      uiElements,
      action.args.target_setting
    );

    if (!target) {
      return {
        allowed: false,
        reason: `Unknown behavior target: ${action.args.target_setting}`,
        actionType: "focus",
      };
    }

    const siteConfigId = currentContext.siteConfigId ?? "demo-site";
    const agentId = currentContext.agentId ?? "demo-agent";
    const route = routes.routes.find(
      (entry) => entry.routeId === target.required_route
    );

    if (!route || !route.optionalBrowserPath) {
      return {
        allowed: false,
        reason: `Target route ${target.required_route} is unavailable for focus behavior control.`,
        actionType: "focus",
      };
    }

    const targetRoutePath = route.optionalBrowserPath
      .replace(":siteId", siteConfigId)
      .replace(":agentId", agentId);

    return {
      allowed: true,
      reason: "Incoming macro action approved by Action Registry.",
      actionType: "focus",
      targetRouteId: route.routeId,
      targetRoutePath,
      highlight: {
        elementId: target.elementId,
        durationMs: 2000,
        valid: true,
      },
    };
  }

  if (action.tool_name === "mutate_agent_behavior") {
    if (agent.safeModeProfile === "strict") {
      return {
        allowed: false,
        reason: `Policy block: ${action.target_agent_id} is operating in strict Safe Mode.`,
        actionType: "mutate",
      };
    }

    if (
      !agent.allowedActions.includes("route.navigate") ||
      !agent.allowedActions.includes("ui.highlight") ||
      !agent.allowedActions.includes("behavior.mutate")
    ) {
      return {
        allowed: false,
        reason: `Policy block: ${action.target_agent_id} may not mutate behavior controls.`,
        actionType: "mutate",
      };
    }

    const target = findUIElementBySemanticAlias(
      uiElements,
      action.args.setting
    );

    if (!target) {
      return {
        allowed: false,
        reason: `Unknown behavior setting target: ${action.args.setting}`,
        actionType: "mutate",
      };
    }

    const siteConfigId = currentContext.siteConfigId ?? "demo-site";
    const agentId = currentContext.agentId ?? "demo-agent";
    const route = routes.routes.find(
      (entry) => entry.routeId === target.required_route
    );

    if (!route || !route.optionalBrowserPath) {
      return {
        allowed: false,
        reason: `Target route ${target.required_route} is unavailable for mutate_agent_behavior.`,
        actionType: "mutate",
      };
    }

    if (
      (action.args.setting === "dominance" ||
        action.args.setting === "grounding") &&
      typeof action.args.value !== "number"
    ) {
      return {
        allowed: false,
        reason: `Invalid numeric value for ${action.args.setting}.`,
        actionType: "mutate",
      };
    }

    if (
      action.args.setting === "safe_mode" &&
      typeof action.args.value !== "string"
    ) {
      return {
        allowed: false,
        reason: "Invalid safe_mode profile value.",
        actionType: "mutate",
      };
    }

    const behaviorMutation =
      action.args.setting === "dominance"
        ? { key: "dominance" as const, value: action.args.value as number }
        : action.args.setting === "grounding"
          ? {
              key: "groundingImportance" as const,
              value: action.args.value as number,
            }
          : {
              key: "safeModeProfile" as const,
              value: action.args.value as string,
            };

    return {
      allowed: true,
      reason: "Incoming behavior mutation approved by Action Registry.",
      actionType: "mutate",
      targetRouteId: route.routeId,
      targetRoutePath: route.optionalBrowserPath
        .replace(":siteId", siteConfigId)
        .replace(":agentId", agentId),
      highlight: {
        elementId: target.elementId,
        durationMs: 2000,
        valid: true,
      },
      behaviorMutation,
    };
  }

  if (action.tool_name === "mutate_chaos_settings") {
    if (
      !agent.allowedActions.includes("route.navigate") ||
      !agent.allowedActions.includes("ui.highlight") ||
      !agent.allowedActions.includes("runtime.chaos.mutate")
    ) {
      return {
        allowed: false,
        reason: `Policy block: ${action.target_agent_id} may not mutate runtime chaos settings.`,
        actionType: "runtimeMutate",
      };
    }

    const target =
      findUIElementBySemanticAlias(uiElements, "latency_controls") ??
      findUIElementBySemanticAlias(uiElements, "chaos_engine");
    const route = routes.routes.find(
      (entry) => entry.routeId === "system.telemetry"
    );

    if (!target || !route || !route.optionalBrowserPath) {
      return {
        allowed: false,
        reason: "Telemetry route or chaos UI target is unavailable.",
        actionType: "runtimeMutate",
      };
    }

    return {
      allowed: true,
      reason: "Incoming chaos mutation approved by Action Registry.",
      actionType: "runtimeMutate",
      targetRouteId: route.routeId,
      targetRoutePath: route.optionalBrowserPath,
      highlight: {
        elementId: target.elementId,
        durationMs: 2500,
        valid: true,
      },
      runtimeMutation: {
        chaosEnabled: action.args.enabled,
        minLatencyMs: 50,
        maxLatencyMs: action.args.max_latency_ms,
        dropRate: action.args.drop_rate,
      },
    };
  }

  if (action.tool_name === "ground_business_candidates") {
    if (!agent.allowedActions.includes("admin.onboarding.read")) {
      return {
        allowed: false,
        reason: `Policy block: ${action.target_agent_id} may not perform onboarding reads.`,
        actionType: "candidateSelection",
      };
    }

    const route = routes.routes.find(
      (entry) => entry.routeId === "admin.candidate_selection"
    );
    const target = findUIElementBySemanticAlias(uiElements, "candidate_list");

    if (!route || !route.optionalBrowserPath || !target) {
      return {
        allowed: false,
        reason: "Candidate selection route or UI target is unavailable.",
        actionType: "candidateSelection",
      };
    }

    return {
      allowed: true,
      reason: "Incoming candidate grounding action approved by Action Registry.",
      actionType: "candidateSelection",
      targetRouteId: route.routeId,
      targetRoutePath: route.optionalBrowserPath,
      candidateResults: searchMockDatabase(action.args),
      highlight: {
        elementId: target.elementId,
        durationMs: 2500,
        valid: true,
      },
    };
  }

  if (action.tool_name === "request_human_assistance") {
    if (
      !agent.allowedActions.includes("route.navigate") ||
      !agent.allowedActions.includes("ui.highlight")
    ) {
      return {
        allowed: false,
        reason: `Policy block: ${action.target_agent_id} may not request human assistance through UI guidance.`,
        actionType: "support",
      };
    }

    const target = findUIElementBySemanticAlias(uiElements, "human_agent");
    const route = routes.routes.find(
      (entry) => entry.routeId === "system.support"
    );

    if (!target || !route || !route.optionalBrowserPath) {
      return {
        allowed: false,
        reason: "Support route or UI target is unavailable.",
        actionType: "support",
      };
    }

    return {
      allowed: true,
      reason: "Incoming support macro action approved by Action Registry.",
      actionType: "support",
      targetRouteId: route.routeId,
      targetRoutePath: route.optionalBrowserPath,
      highlight: {
        elementId: target.elementId,
        durationMs: 2500,
        valid: true,
      },
    };
  }

  if (action.tool_name === "stage_business_onboarding") {
    if (!agent.allowedActions.includes("admin.onboarding.write")) {
      return {
        allowed: false,
        reason: `Policy block: ${action.target_agent_id} may not stage onboarding data.`,
        actionType: "onboardingDraft",
      };
    }

    const route = routes.routes.find(
      (entry) => entry.routeId === "admin.onboarding"
    );

    if (!route || !route.optionalBrowserPath) {
      return {
        allowed: false,
        reason: "Admin onboarding route is unavailable.",
        actionType: "onboardingDraft",
      };
    }

    const stagedOnboardingData = {
      business_name: action.args.business_name,
      city: action.args.city,
      state: action.args.state,
      zip: action.args.zip,
      contact_email: action.args.contact_email,
      category: action.args.category,
    };

    const firstMissingAlias =
      !stagedOnboardingData.business_name
        ? "business_name_input"
        : !stagedOnboardingData.city
          ? "city_input"
          : !stagedOnboardingData.state
            ? "state_input"
            : !stagedOnboardingData.zip
              ? "zip_input"
              : "submit_onboarding";

    const target = findUIElementBySemanticAlias(uiElements, firstMissingAlias);

    return {
      allowed: true,
      reason: "Incoming onboarding staging action approved by Action Registry.",
      actionType: "onboardingDraft",
      targetRouteId: route.routeId,
      targetRoutePath: route.optionalBrowserPath,
      stagedOnboardingData,
      highlight: target
        ? {
            elementId: target.elementId,
            durationMs: 2500,
            valid: true,
          }
        : undefined,
    };
  }

  if (action.tool_name === "draft_support_ticket") {
    if (
      !agent.allowedActions.includes("route.navigate") ||
      !agent.allowedActions.includes("ui.highlight")
    ) {
      return {
        allowed: false,
        reason: `Policy block: ${action.target_agent_id} may not draft support tickets through UI guidance.`,
        actionType: "supportDraft",
      };
    }

    const target = findUIElementBySemanticAlias(uiElements, "support_form");
    const route = routes.routes.find(
      (entry) => entry.routeId === "system.support"
    );

    if (!target || !route || !route.optionalBrowserPath) {
      return {
        allowed: false,
        reason: "Support form route or UI target is unavailable.",
        actionType: "supportDraft",
      };
    }

    return {
      allowed: true,
      reason: "Incoming support draft action approved by Action Registry.",
      actionType: "supportDraft",
      targetRouteId: route.routeId,
      targetRoutePath: route.optionalBrowserPath,
      stagedSupportText: action.args.ticket_body,
      highlight: {
        elementId: target.elementId,
        durationMs: 2500,
        valid: true,
      },
    };
  }

  return {
    allowed: false,
    reason: "Unsupported incoming tool.",
    actionType: "unsupported",
  };
}
