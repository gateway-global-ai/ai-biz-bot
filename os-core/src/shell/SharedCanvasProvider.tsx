import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useLocation } from "wouter";
import type { ActionResult } from "../os-core/control-plane/registry-loader/types";
import { buildGeminiContextSyncPayload } from "../os-core/control-plane/sync/buildGeminiContextSyncPayload";
import type { GeminiContextSyncPayload } from "../os-core/execution-plane/contracts/SyncPayload";
import {
  buildOsState,
  buildRouteNavigationSyncPayload,
} from "../os-core/control-plane/sync/buildGeminiContextSyncPayload";
import { useOSEventLog } from "../os-core/observability/EventLogProvider";
import {
  configureBridgeSettings,
  getActiveGeminiBridge,
  registerIncomingActionListener,
  registerProviderEventListener,
} from "../os-core/execution-plane/gemini-live-engine/bridgeRuntime";
import { handleIncomingAction } from "../os-core/control-plane/action-registry/handleIncomingAction";

type ShellMode =
  | "menu"
  | "view"
  | "confirmation"
  | "refusal"
  | "ptt_first"
  | "result";

export interface BusinessCandidate {
  id: string;
  business_name: string;
  city: string;
  state: string;
  zip?: string;
  contact_email?: string;
  category?: string;
}

interface CanvasState {
  currentRouteId: string;
  currentViewId: string;
  shellMode: ShellMode;
  breadcrumb: string[];
  contextKeys: Record<string, string>;
  activeHighlightId: string | null;
  stagedSupportText: string | null;
  candidateResults: BusinessCandidate[] | null;
  stagedOnboardingData: Partial<{
    business_name: string;
    city: string;
    state: string;
    zip: string;
    contact_email: string;
    category: string;
  }> | null;
  behaviorValues: {
    dominance: number;
    groundingImportance: number;
    safeModeProfile: string;
  };
  runtimeControls: {
    chaosEnabled: boolean;
    minLatencyMs: number;
    maxLatencyMs: number;
    dropRate: number;
  };
  lastActionResult: ActionResult | null;
  syncStatus: "idle" | "syncing" | "synced" | "error";
  lastSyncPayload: GeminiContextSyncPayload | null;
}

export type CanvasSnapshot = Pick<
  CanvasState,
  | "currentRouteId"
  | "currentViewId"
  | "shellMode"
  | "breadcrumb"
  | "contextKeys"
  | "activeHighlightId"
  | "stagedSupportText"
  | "candidateResults"
  | "stagedOnboardingData"
  | "behaviorValues"
  | "runtimeControls"
>;

type CanvasAction =
  | {
      type: "SET_ROUTE";
      payload: {
        routeId: string;
        viewId: string;
        shellMode: ShellMode;
        breadcrumb?: string[];
      };
    }
  | {
      type: "SET_CONTEXT_KEY";
      payload: { key: string; value: string };
    }
  | {
      type: "SET_RESULT";
      payload: ActionResult;
    }
  | {
      type: "CLEAR_RESULT";
    }
  | {
      type: "SET_HIGHLIGHT";
      payload: { elementId: string };
    }
  | {
      type: "CLEAR_HIGHLIGHT";
    }
  | {
      type: "SET_STAGED_SUPPORT_TEXT";
      payload: { text: string };
    }
  | {
      type: "CLEAR_STAGED_SUPPORT_TEXT";
    }
  | {
      type: "SET_CANDIDATE_RESULTS";
      payload: { results: BusinessCandidate[] };
    }
  | {
      type: "CLEAR_CANDIDATE_RESULTS";
    }
  | {
      type: "SET_STAGED_ONBOARDING_DATA";
      payload: Partial<NonNullable<CanvasState["stagedOnboardingData"]>>;
    }
  | {
      type: "CLEAR_STAGED_ONBOARDING_DATA";
    }
  | {
      type: "SET_BEHAVIOR_VALUE";
      payload:
        | { key: "dominance"; value: number }
        | { key: "groundingImportance"; value: number }
        | { key: "safeModeProfile"; value: string };
    }
  | {
      type: "SET_RUNTIME_CHAOS_SETTINGS";
      payload: Partial<CanvasState["runtimeControls"]>;
    };

const initialCanvasState: CanvasState = {
  currentRouteId: "os.home",
  currentViewId: "os-home-view",
  shellMode: "ptt_first",
  breadcrumb: ["Home"],
  contextKeys: {},
  activeHighlightId: null,
  stagedSupportText: null,
  candidateResults: null,
  stagedOnboardingData: null,
  behaviorValues: {
    dominance: 50,
    groundingImportance: 70,
    safeModeProfile: "strict",
  },
  runtimeControls: {
    chaosEnabled: false,
    minLatencyMs: 50,
    maxLatencyMs: 4000,
    dropRate: 15,
  },
  lastActionResult: null,
  syncStatus: "idle",
  lastSyncPayload: null,
};

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case "SET_ROUTE":
      return {
        ...state,
        currentRouteId: action.payload.routeId,
        currentViewId: action.payload.viewId,
        shellMode: action.payload.shellMode,
        breadcrumb: action.payload.breadcrumb ?? state.breadcrumb,
        activeHighlightId: null,
      };
    case "SET_CONTEXT_KEY":
      return {
        ...state,
        contextKeys: {
          ...state.contextKeys,
          [action.payload.key]: action.payload.value,
        },
      };
    case "SET_RESULT":
      return {
        ...state,
        shellMode: "result",
        lastActionResult: action.payload,
      };
    case "CLEAR_RESULT":
      return {
        ...state,
        lastActionResult: null,
      };
    case "SET_HIGHLIGHT":
      return {
        ...state,
        activeHighlightId: action.payload.elementId,
      };
    case "CLEAR_HIGHLIGHT":
      return {
        ...state,
        activeHighlightId: null,
      };
    case "SET_STAGED_SUPPORT_TEXT":
      return {
        ...state,
        stagedSupportText: action.payload.text,
      };
    case "CLEAR_STAGED_SUPPORT_TEXT":
      return {
        ...state,
        stagedSupportText: null,
      };
    case "SET_CANDIDATE_RESULTS":
      return {
        ...state,
        candidateResults: action.payload.results,
      };
    case "CLEAR_CANDIDATE_RESULTS":
      return {
        ...state,
        candidateResults: null,
      };
    case "SET_STAGED_ONBOARDING_DATA":
      return {
        ...state,
        stagedOnboardingData: {
          ...(state.stagedOnboardingData ?? {}),
          ...action.payload,
        },
      };
    case "CLEAR_STAGED_ONBOARDING_DATA":
      return {
        ...state,
        stagedOnboardingData: null,
      };
    case "SET_BEHAVIOR_VALUE":
      return {
        ...state,
        behaviorValues: {
          ...state.behaviorValues,
          [action.payload.key]: action.payload.value,
        },
      };
    case "SET_RUNTIME_CHAOS_SETTINGS":
      return {
        ...state,
        runtimeControls: {
          ...state.runtimeControls,
          ...action.payload,
        },
      };
    default:
      return state;
  }
}

const CanvasStateContext = createContext<CanvasState | null>(null);
const CanvasDispatchContext = createContext<React.Dispatch<CanvasAction> | null>(null);

async function sendContextSyncWithTimeout(
  payload: GeminiContextSyncPayload,
  timeoutMs = 5000
) {
  return Promise.race([
    getActiveGeminiBridge().sendContextSync(payload),
    new Promise<boolean>((_, reject) =>
      window.setTimeout(
        () => reject(new Error(`Bridge timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

export function SharedCanvasProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(canvasReducer, initialCanvasState);
  const [, setLocation] = useLocation();
  const [syncStatus, setSyncStatus] = useState<CanvasState["syncStatus"]>("idle");
  const [lastSyncPayload, setLastSyncPayload] =
    useState<GeminiContextSyncPayload | null>(null);
  const { appendEvent } = useOSEventLog();
  const stateRef = useRef(state);
  const highlightTimeoutRef = useRef<number | null>(null);
  const previousOsStateRef = useRef(
    buildOsState({
      currentRouteId: initialCanvasState.currentRouteId,
      currentViewId: initialCanvasState.currentViewId,
      shellMode: initialCanvasState.shellMode,
      breadcrumb: initialCanvasState.breadcrumb,
      contextKeys: initialCanvasState.contextKeys,
      activeHighlightId: initialCanvasState.activeHighlightId,
      stagedSupportText: initialCanvasState.stagedSupportText,
      candidateResults: initialCanvasState.candidateResults,
      stagedOnboardingData: initialCanvasState.stagedOnboardingData,
      behaviorValues: initialCanvasState.behaviorValues,
      runtimeControls: initialCanvasState.runtimeControls,
    })
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    registerProviderEventListener((result) => {
      if (!result.functionName) {
        return;
      }

      appendEvent({
        category:
          result.status === "ERROR"
            ? "ERROR"
            : result.status === "DROPPED"
              ? "POLICY_BLOCK"
              : "SYSTEM_LIFECYCLE",
        os_state_snapshot: buildOsState(stateRef.current),
        payload: {
          type:
            result.status === "ACCEPTED"
              ? "LIVE_TOOL_ACCEPTED"
              : result.status === "DROPPED"
                ? "LIVE_TOOL_DROPPED"
                : "LIVE_TOOL_ERROR",
          functionName: result.functionName,
          detail: result.detail,
        },
      });
    });
  }, [appendEvent]);

  useEffect(() => {
    registerIncomingActionListener(async (action) => {
      const decision = handleIncomingAction(action, {
        siteConfigId: stateRef.current.contextKeys.siteConfigId,
        agentId: stateRef.current.contextKeys.agentId,
      });
      const osState = buildOsState(stateRef.current);

      if (!decision.allowed) {
        appendEvent({
          category: "POLICY_BLOCK",
          os_state_snapshot: osState,
          payload: {
            action,
            reason: decision.reason,
          },
        });
        return false;
      }

      appendEvent({
        category: "GOVERNANCE_ACTION",
        os_state_snapshot: osState,
        payload: {
          action,
          decision,
        },
      });

      if (
        [
          "route",
          "focus",
          "runtimeMutate",
          "support",
          "supportDraft",
          "candidateSelection",
          "onboardingDraft",
        ].includes(decision.actionType) &&
        decision.targetRoutePath
      ) {
        setLocation(decision.targetRoutePath);
      }

      if (
        [
          "highlight",
          "focus",
          "runtimeMutate",
          "support",
          "supportDraft",
          "candidateSelection",
          "onboardingDraft",
        ].includes(decision.actionType) &&
        decision.highlight?.valid
      ) {
        if (highlightTimeoutRef.current !== null) {
          window.clearTimeout(highlightTimeoutRef.current);
        }

        dispatch({
          type: "SET_HIGHLIGHT",
          payload: { elementId: decision.highlight.elementId },
        });

        highlightTimeoutRef.current = window.setTimeout(() => {
          dispatch({ type: "CLEAR_HIGHLIGHT" });
          highlightTimeoutRef.current = null;
        }, decision.highlight.durationMs);
      }

      if (decision.actionType === "supportDraft" && decision.stagedSupportText) {
        dispatch({
          type: "SET_STAGED_SUPPORT_TEXT",
          payload: { text: decision.stagedSupportText },
        });
      }

      if (decision.actionType === "candidateSelection" && decision.candidateResults) {
        dispatch({
          type: "SET_CANDIDATE_RESULTS",
          payload: { results: decision.candidateResults },
        });
      }

      if (decision.actionType === "onboardingDraft" && decision.stagedOnboardingData) {
        dispatch({
          type: "SET_STAGED_ONBOARDING_DATA",
          payload: decision.stagedOnboardingData,
        });
      }

      if (decision.actionType === "mutate" && decision.behaviorMutation) {
        dispatch({
          type: "SET_BEHAVIOR_VALUE",
          payload: decision.behaviorMutation as
            | { key: "dominance"; value: number }
            | { key: "groundingImportance"; value: number }
            | { key: "safeModeProfile"; value: string },
        });
      }

      if (decision.actionType === "runtimeMutate" && decision.runtimeMutation) {
        dispatch({
          type: "SET_RUNTIME_CHAOS_SETTINGS",
          payload: decision.runtimeMutation,
        });

        configureBridgeSettings({
          mode: decision.runtimeMutation.chaosEnabled ? "chaos" : "mock",
          minLatencyMs: decision.runtimeMutation.minLatencyMs,
          maxLatencyMs: decision.runtimeMutation.maxLatencyMs,
          dropRate: decision.runtimeMutation.dropRate,
        });
      }

      return true;
    });
  }, [appendEvent, setLocation]);

  useEffect(() => {
    if (!state.lastActionResult) {
      setSyncStatus("idle");
      setLastSyncPayload(null);
      return;
    }

    appendEvent({
      category: "GOVERNANCE_ACTION",
      os_state_snapshot: buildOsState(state),
      payload: state.lastActionResult,
    });

    setSyncStatus("syncing");

    const timeout = window.setTimeout(() => {
      try {
        const payload = buildGeminiContextSyncPayload(
          state.lastActionResult as ActionResult,
          buildOsState(state)
        );
        setLastSyncPayload(payload);

        void sendContextSyncWithTimeout(payload)
          .then(() => {
            appendEvent({
              category: "SYNC_PAYLOAD",
              os_state_snapshot: payload.os_state,
              payload,
            });
            setSyncStatus("synced");
          })
          .catch((error) => {
            appendEvent({
              category: "ERROR",
              os_state_snapshot: payload.os_state,
              payload: {
                source: "context_sync",
                message:
                  error instanceof Error
                    ? error.message
                    : "Unknown context sync error",
                failedPayload: payload,
              },
            });
            setSyncStatus("error");
          });
      } catch (error) {
        console.error("[SharedCanvas] Failed to build Gemini sync payload", error);
        appendEvent({
          category: "ERROR",
          os_state_snapshot: buildOsState(state),
          payload: {
            source: "context_sync_build",
            message:
              error instanceof Error
                ? error.message
                : "Unknown sync payload build error",
          },
        });
        setSyncStatus("error");
      }
    }, 750);

    return () => window.clearTimeout(timeout);
  }, [appendEvent, state, state.lastActionResult]);

  useEffect(() => {
    const currentOsState = buildOsState(state);
    const previousOsState = previousOsStateRef.current;

    const routeChanged =
      currentOsState.active_route_id !== previousOsState.active_route_id ||
      currentOsState.active_view_id !== previousOsState.active_view_id ||
      currentOsState.breadcrumbs.join(" / ") !== previousOsState.breadcrumbs.join(" / ");

    if (!routeChanged) {
      return;
    }

    setSyncStatus("syncing");

    const timeout = window.setTimeout(() => {
      try {
        const payload = buildRouteNavigationSyncPayload(
          previousOsState,
          currentOsState,
          state.contextKeys.agentId ?? "system"
        );
        previousOsStateRef.current = currentOsState;
        setLastSyncPayload(payload);

        void sendContextSyncWithTimeout(payload)
          .then(() => {
            appendEvent({
              category: "ROUTE_CHANGE",
              os_state_snapshot: payload.os_state,
              payload,
            });
            setSyncStatus("synced");
          })
          .catch((error) => {
            appendEvent({
              category: "ERROR",
              os_state_snapshot: payload.os_state,
              payload: {
                source: "route_sync",
                message:
                  error instanceof Error
                    ? error.message
                    : "Unknown route sync error",
                failedPayload: payload,
              },
            });
            setSyncStatus("error");
          });
      } catch (error) {
        console.error("[SharedCanvas] Failed to build route sync payload", error);
        appendEvent({
          category: "ERROR",
          os_state_snapshot: currentOsState,
          payload: {
            source: "route_sync",
            message: error instanceof Error ? error.message : "Unknown route sync error",
          },
        });
        setSyncStatus("error");
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [
    state.breadcrumb,
    state.contextKeys.agentId,
    state.currentRouteId,
    state.currentViewId,
    state.shellMode,
    appendEvent,
  ]);

  const stableState = useMemo(
    () => ({
      ...state,
      syncStatus,
      lastSyncPayload,
    }),
    [lastSyncPayload, state, syncStatus]
  );

  return (
    <CanvasStateContext.Provider value={stableState}>
      <CanvasDispatchContext.Provider value={dispatch}>
        {children}
      </CanvasDispatchContext.Provider>
    </CanvasStateContext.Provider>
  );
}

export function useSharedCanvasState() {
  const value = useContext(CanvasStateContext);
  if (!value) throw new Error("useSharedCanvasState must be used within SharedCanvasProvider");
  return value;
}

export function useSharedCanvasDispatch() {
  const value = useContext(CanvasDispatchContext);
  if (!value) throw new Error("useSharedCanvasDispatch must be used within SharedCanvasProvider");
  return value;
}
