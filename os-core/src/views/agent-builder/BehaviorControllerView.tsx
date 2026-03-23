import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";

import { executeAction } from "../../os-core/control-plane/action-registry/executeAction";
import { loadActions } from "../../os-core/control-plane/registry-loader/loadActions";
import { evaluatePolicyGate } from "../../os-core/control-plane/policy-registry/evaluatePolicyGate";
import {
  useSharedCanvasDispatch,
  useSharedCanvasState,
} from "../../shell/SharedCanvasProvider";
import { ActionContractsCard } from "./components/ActionContractsCard";
import { ActionResultCard } from "./components/ActionResultCard";
import { ConfirmationPanel } from "./components/ConfirmationPanel";
import { ContextInfoCard } from "./components/ContextInfoCard";
import { Slider } from "./components/Slider";

type PendingChange =
  | { kind: "dominance"; value: number }
  | { kind: "safeModeProfile"; value: string }
  | { kind: "groundingImportance"; value: number }
  | null;

export default function BehaviorControllerView() {
  const params = useParams<{ siteId: string; agentId: string }>();
  const dispatch = useSharedCanvasDispatch();
  const canvas = useSharedCanvasState();
  const actions = loadActions();
  const dominanceActionDef = useMemo(
    () => actions.actions.find((action) => action.actionId === "agent.proposeDominanceChange"),
    [actions]
  );
  const safeModeActionDef = useMemo(
    () => actions.actions.find((action) => action.actionId === "agent.applySafeModeProfile"),
    [actions]
  );
  const groundingActionDef = useMemo(
    () =>
      actions.actions.find(
        (action) => action.actionId === "agent.applyGroundingImportance"
      ),
    [actions]
  );
  const hasRequiredContext = Boolean(params.siteId && params.agentId);
  const policyAllowed = evaluatePolicyGate("agent_behavior_control");

  const currentDominance = canvas.behaviorValues.dominance;
  const [draftDominance, setDraftDominance] = useState(50);
  const currentSafeModeProfile = canvas.behaviorValues.safeModeProfile;
  const [draftSafeModeProfile, setDraftSafeModeProfile] = useState("strict");
  const currentGroundingImportance = canvas.behaviorValues.groundingImportance;
  const [draftGroundingImportance, setDraftGroundingImportance] = useState(70);
  const [pendingChange, setPendingChange] = useState<PendingChange>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setDraftDominance(currentDominance);
  }, [currentDominance]);

  useEffect(() => {
    setDraftSafeModeProfile(currentSafeModeProfile);
  }, [currentSafeModeProfile]);

  useEffect(() => {
    setDraftGroundingImportance(currentGroundingImportance);
  }, [currentGroundingImportance]);

  useEffect(() => {
    dispatch({
      type: "SET_ROUTE",
      payload: {
        routeId: "agent.behavior",
        viewId: "behavior-controller-view",
        shellMode:
          canvas.lastActionResult !== null
            ? "result"
            : pendingChange === null
              ? "view"
              : "confirmation",
        breadcrumb: ["Home", "Workspace", params.siteId, "Agent", params.agentId, "Behavior"],
      },
    });
    dispatch({
      type: "SET_CONTEXT_KEY",
      payload: { key: "siteConfigId", value: params.siteId },
    });
    dispatch({
      type: "SET_CONTEXT_KEY",
      payload: { key: "agentId", value: params.agentId },
    });
  }, [canvas.lastActionResult, dispatch, params.agentId, params.siteId, pendingChange]);

  const reviewDominanceChange = () => {
    dispatch({ type: "CLEAR_RESULT" });
    setActionError(null);
    setPendingChange({ kind: "dominance", value: draftDominance });
  };

  const reviewSafeModeChange = () => {
    dispatch({ type: "CLEAR_RESULT" });
    setActionError(null);
    setPendingChange({ kind: "safeModeProfile", value: draftSafeModeProfile });
  };

  const reviewGroundingImportanceChange = () => {
    dispatch({ type: "CLEAR_RESULT" });
    setActionError(null);
    setPendingChange({ kind: "groundingImportance", value: draftGroundingImportance });
  };

  const confirmChange = async () => {
    if (pendingChange === null) return;
    setActionError(null);

    try {
      const result = await executeAction({
        actionId:
          pendingChange.kind === "dominance"
            ? "agent.proposeDominanceChange"
            : pendingChange.kind === "safeModeProfile"
              ? "agent.applySafeModeProfile"
              : "agent.applyGroundingImportance",
        contextKeys: {
          siteConfigId: params.siteId,
          agentId: params.agentId,
        },
        payload:
          pendingChange.kind === "dominance"
            ? { value: pendingChange.value, previousValue: currentDominance }
            : pendingChange.kind === "safeModeProfile"
              ? { profile: pendingChange.value, previousValue: currentSafeModeProfile }
              : { value: pendingChange.value, previousValue: currentGroundingImportance },
      });

      if (pendingChange.kind === "dominance") {
        dispatch({
          type: "SET_BEHAVIOR_VALUE",
          payload: { key: "dominance", value: pendingChange.value },
        });
      } else if (pendingChange.kind === "safeModeProfile") {
        dispatch({
          type: "SET_BEHAVIOR_VALUE",
          payload: { key: "safeModeProfile", value: pendingChange.value },
        });
      } else {
        dispatch({
          type: "SET_BEHAVIOR_VALUE",
          payload: { key: "groundingImportance", value: pendingChange.value },
        });
      }

      setPendingChange(null);
      dispatch({ type: "SET_RESULT", payload: result });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to execute governed action."
      );
    }
  };

  const cancelChange = () => {
    setPendingChange(null);
    setDraftDominance(currentDominance);
    setDraftSafeModeProfile(currentSafeModeProfile);
    setDraftGroundingImportance(currentGroundingImportance);
    dispatch({ type: "CLEAR_RESULT" });
  };

  if (
    !hasRequiredContext ||
    !policyAllowed ||
    !dominanceActionDef ||
    !safeModeActionDef ||
    !groundingActionDef
  ) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white">Behavior Controller</h1>
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-sm text-slate-200">
          This controller cannot open because required context or policy access is
          missing. The OS is refusing the action instead of improvising.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">Behavior Controller</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        First governed OS proof: bounded behavior control for one agent with
        explicit context keys, shell mode transitions, and confirmed mutation.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ContextInfoCard
          siteId={params.siteId}
          agentId={params.agentId}
          routeId={canvas.currentRouteId}
          shellMode={canvas.shellMode}
        />
        <ActionContractsCard
          actions={[dominanceActionDef, safeModeActionDef, groundingActionDef]}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6">
        <div
          data-highlight-id="behavior.dominance.slider"
          className={`rounded-xl p-2 transition ${
            canvas.activeHighlightId === "behavior.dominance.slider"
              ? "ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
              : ""
          }`}
        >
        <div className="mb-3 text-sm font-semibold text-white">
          Dominance Control
        </div>
        <ActionResultCard result={canvas.lastActionResult} />
        {actionError && (
          <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-slate-200">
            {actionError}
          </div>
        )}
        <div className="mb-3 text-xs text-slate-400">
          Current saved value:{" "}
          <span className="font-mono text-slate-200">{currentDominance}</span>
        </div>
        <Slider
          label="Dominance"
          value={draftDominance}
          onChange={setDraftDominance}
          color="#6366f1"
          description="Higher values push stronger grounding on decisive, assertive behavior."
        />

        {pendingChange === null ? (
          <button
            type="button"
            onClick={reviewDominanceChange}
            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Review Change
          </button>
        ) : pendingChange.kind === "dominance" ? (
          <ConfirmationPanel
            message={
              <>
              Apply dominance change from{" "}
              <span className="font-mono">{currentDominance}</span> to{" "}
              <span className="font-mono">{pendingChange.value}</span>?
              </>
            }
            onConfirm={confirmChange}
            onCancel={cancelChange}
          />
        ) : (
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
            A different governed change is currently awaiting confirmation.
          </div>
        )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6">
        <div
          data-highlight-id="behavior.safeMode.profile"
          className={`rounded-xl p-2 transition ${
            canvas.activeHighlightId === "behavior.safeMode.profile"
              ? "ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
              : ""
          }`}
        >
        <div className="mb-3 text-sm font-semibold text-white">
          Safe Mode Profile
        </div>
        <div className="mb-2 text-xs text-slate-400">
          Current saved profile:{" "}
          <span className="font-mono text-slate-200">{currentSafeModeProfile}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {["strict", "balanced", "escalation_first"].map((profile) => (
            <button
              key={profile}
              type="button"
              onClick={() => setDraftSafeModeProfile(profile)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                draftSafeModeProfile === profile
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {profile}
            </button>
          ))}
        </div>
        <div className="mt-2 text-sm text-slate-200">
          Draft profile: <span className="font-mono">{draftSafeModeProfile}</span>
        </div>

        {pendingChange === null ? (
          <button
            type="button"
            onClick={reviewSafeModeChange}
            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Review Safe Mode Change
          </button>
        ) : pendingChange.kind === "safeModeProfile" ? (
          <ConfirmationPanel
            message={
              <>
              Apply Safe Mode profile change from{" "}
              <span className="font-mono">{currentSafeModeProfile}</span> to{" "}
              <span className="font-mono">{pendingChange.value}</span>?
              </>
            }
            onConfirm={confirmChange}
            onCancel={cancelChange}
          />
        ) : (
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
            A different governed change is currently awaiting confirmation.
          </div>
        )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6">
        <div
          data-highlight-id="behavior.grounding.slider"
          className={`rounded-xl p-2 transition ${
            canvas.activeHighlightId === "behavior.grounding.slider"
              ? "ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
              : ""
          }`}
        >
        <div className="mb-3 text-sm font-semibold text-white">
          Grounding Importance
        </div>
        <div className="mb-2 text-xs text-slate-400">
          Current saved value:{" "}
          <span className="font-mono text-slate-200">{currentGroundingImportance}</span>
        </div>
        <Slider
          label="Grounding Importance"
          value={draftGroundingImportance}
          onChange={setDraftGroundingImportance}
          color="#10b981"
          description="Higher values force stronger grounding before retrieval or disclosure."
        />

        {pendingChange === null ? (
          <button
            type="button"
            onClick={reviewGroundingImportanceChange}
            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Review Grounding Change
          </button>
        ) : pendingChange.kind === "groundingImportance" ? (
          <ConfirmationPanel
            message={
              <>
              Apply grounding importance change from{" "}
              <span className="font-mono">{currentGroundingImportance}</span> to{" "}
              <span className="font-mono">{pendingChange.value}</span>?
              </>
            }
            onConfirm={confirmChange}
            onCancel={cancelChange}
          />
        ) : (
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
            A different governed change is currently awaiting confirmation.
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
