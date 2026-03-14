import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import { loadActions } from "../../os-core/control-plane/registry-loader/loadActions";
import { loadAgentPolicies } from "../../os-core/control-plane/registry-loader/loadAgentPolicies";
import {
  type RegistryChecksums,
  loadRegistryChecksums,
} from "../../os-core/control-plane/registry-loader/loadRegistryChecksums";
import { loadLogicalRoutes } from "../../os-core/control-plane/registry-loader/loadLogicalRoutes";
import { loadSystemManifestMeta } from "../../os-core/control-plane/registry-loader/loadSystemManifestMeta";
import {
  configureBridgeSettings,
  connectActiveBridge,
  disconnectActiveBridge,
  getActiveBridgeEndpoint,
  getBridgeSettings,
  getLiveBridgeConfig,
  startBridgePushToTalk,
  stopBridgePushToTalk,
} from "../../os-core/execution-plane/gemini-live-engine/bridgeRuntime";
import { useOSEventLog } from "../../os-core/observability/EventLogProvider";
import { appendSystemEvent } from "../../os-core/observability/system-events";
import { useSystemReadiness } from "../../os-core/observability/useSystemReadiness";
import { useLiveBridgeState } from "../../os-core/execution-plane/gemini-live-engine/useLiveBridgeState";
import {
  useSharedCanvasDispatch,
  useSharedCanvasState,
} from "../../shell/SharedCanvasProvider";
import { BridgeTelemetryCard } from "./components/BridgeTelemetryCard";
import { EnvironmentStatusCard } from "./components/EnvironmentStatusCard";
import {
  GovernanceBootMatrix,
  type ReadinessMatrixItem,
} from "./components/GovernanceBootMatrix";
import { SystemManifestCard } from "./components/SystemManifestCard";
import { TelemetrySummaryCard } from "./components/TelemetrySummaryCard";

export default function OSHomeView() {
  const dispatch = useSharedCanvasDispatch();
  const state = useSharedCanvasState();
  const { events, appendEvent } = useOSEventLog();
  const [, setLocation] = useLocation();
  const [bridgeSettings, setBridgeSettings] = useState(getBridgeSettings());
  const liveBridgeState = useLiveBridgeState();
  const [registryChecksums, setRegistryChecksums] =
    useState<RegistryChecksums | null>(null);
  const readiness = useSystemReadiness();
  const [liveBridgeError, setLiveBridgeError] = useState<string | null>(null);
  const previousBridgeStateRef = React.useRef(liveBridgeState);

  const routesRegistry = useMemo(() => loadLogicalRoutes(), []);
  const agentPoliciesRegistry = useMemo(() => loadAgentPolicies(), []);
  const actionsRegistry = useMemo(() => loadActions(), []);
  const manifestMeta = useMemo(() => loadSystemManifestMeta(), []);

  const logicalRoutesValid = routesRegistry.routes.length > 0;
  const agentPoliciesValid = agentPoliciesRegistry.agents.length > 0;
  const actionsValid = actionsRegistry.actions.length > 0;

  const policyBlocks = events.filter((event) => event.category === "POLICY_BLOCK").length;
  const syncErrors = events.filter((event) => event.category === "ERROR").length;
  const lastEvent = events.length ? events[events.length - 1] : null;
  const liveToolEvents = events.filter((event) => {
    const type = (event.payload as { type?: string }).type;
    return (
      type === "LIVE_TOOL_ACCEPTED" ||
      type === "LIVE_TOOL_DROPPED" ||
      type === "LIVE_TOOL_ERROR"
    );
  });
  const lastLiveToolEvent = liveToolEvents.length
    ? liveToolEvents[liveToolEvents.length - 1]
    : null;
  const recentBridgeLifecycleEvents = events
    .filter(
      (event) =>
        event.category === "SYSTEM_LIFECYCLE" &&
        ["BRIDGE_CONNECTING", "BRIDGE_CONNECTED", "BRIDGE_DISCONNECTED", "ENGINE_SHUTDOWN"].includes(
          ((event.payload as { type?: string }).type ?? "")
        )
    )
    .slice(-3)
    .reverse();
  const deploymentTier =
    bridgeSettings.mode === "live"
      ? "Enterprise"
      : bridgeSettings.mode === "local"
        ? "Local Sandbox"
      : bridgeSettings.mode === "chaos"
        ? "Sandbox"
        : "Sandbox";
  const safeModeDefault = agentPoliciesRegistry.agents.every(
    (agent) => agent.safeModeProfile === "strict"
  )
    ? "Enforced"
    : "Mixed";

  useEffect(() => {
    dispatch({
      type: "SET_ROUTE",
      payload: {
        routeId: "os.home",
        viewId: "os-home-view",
        shellMode: "ptt_first",
        breadcrumb: ["Home"],
      },
    });
  }, [dispatch]);

  useEffect(() => {
    setBridgeSettings(getBridgeSettings());
  }, [state.lastSyncPayload, state.syncStatus]);

  useEffect(() => {
    const previousState = previousBridgeStateRef.current;
    if (previousState.state === liveBridgeState.state) {
      return;
    }

    const lifecycleType =
      liveBridgeState.state === "CONNECTING"
        ? "BRIDGE_CONNECTING"
        : liveBridgeState.state === "CONNECTED"
          ? "BRIDGE_CONNECTED"
          : "BRIDGE_DISCONNECTED";

    const detail = `Live bridge transitioned from ${previousState.state} to ${liveBridgeState.state}.`;

    appendSystemEvent(lifecycleType, detail, {
      previousState,
      nextState: liveBridgeState,
    });

    appendEvent({
      category: "SYSTEM_LIFECYCLE",
      os_state_snapshot: {
        shell_mode: state.shellMode,
        active_route_id: state.currentRouteId,
        active_view_id: state.currentViewId,
        breadcrumbs: state.breadcrumb,
      },
      payload: {
        type: lifecycleType,
        previousState,
        nextState: liveBridgeState,
        detail,
      },
    });

    if (liveBridgeState.state === "DISCONNECTED") {
      appendSystemEvent("ENGINE_SHUTDOWN", "Live bridge disconnected or shut down.");
    }

    previousBridgeStateRef.current = liveBridgeState;
  }, [
    appendEvent,
    liveBridgeState,
    state.breadcrumb,
    state.currentRouteId,
    state.currentViewId,
    state.shellMode,
  ]);

  useEffect(() => {
    let cancelled = false;

    void loadRegistryChecksums().then((checksums) => {
      if (!cancelled) {
        setRegistryChecksums(checksums);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const bootWorkspace = () => {
    if (!readiness.allCriticalChecksPassed) return;
    dispatch({ type: "CLEAR_RESULT" });
    setLocation("/workspace/demo-site");
  };

  const activeBridgeEndpoint = getActiveBridgeEndpoint();
  const hasLiveEndpoint = Boolean(activeBridgeEndpoint);
  const canBootLive = readiness.allCriticalChecksPassed && hasLiveEndpoint;
  const endpointGovernanceNote = activeBridgeEndpoint
    ? /\/ws\/gemini-live$/.test(activeBridgeEndpoint)
      ? "Current live endpoint is the existing /ws/gemini-live proxy. That protected proxy may override client-declared tool schemas and model setup while preserving server-side voice safety."
      : /\/ws\/os-live$/.test(activeBridgeEndpoint)
        ? "Live bridge is targeting the dedicated /ws/os-live proxy, which preserves OS-generated tool declarations while merging server-side instruction."
        : /\/ws\/local-voice$/.test(activeBridgeEndpoint)
        ? "Mission Control is targeting the dedicated /ws/local-voice chained local pipeline sandbox."
        : null
    : null;

  const handleConnectLive = async () => {
    if (!canBootLive) return;
    setLiveBridgeError(null);
    setBridgeSettings(getBridgeSettings());

    try {
      await connectActiveBridge();
    } catch (error) {
      setLiveBridgeError(
        error instanceof Error ? error.message : "Failed to connect bridge."
      );
    }
  };

  const handleDisconnectLive = async () => {
    setLiveBridgeError(null);
    try {
      await disconnectActiveBridge();
    } catch (error) {
      setLiveBridgeError(
        error instanceof Error ? error.message : "Failed to disconnect bridge."
      );
    }
  };

  const handleStartPTT = async () => {
    setLiveBridgeError(null);
    try {
      await startBridgePushToTalk();
    } catch (error) {
      setLiveBridgeError(
        error instanceof Error ? error.message : "Failed to start microphone stream."
      );
    }
  };

  const handleStopPTT = async () => {
    setLiveBridgeError(null);
    try {
      await stopBridgePushToTalk();
    } catch (error) {
      setLiveBridgeError(
        error instanceof Error ? error.message : "Failed to stop microphone stream."
      );
    }
  };

  const readinessItems: ReadinessMatrixItem[] = [
    {
      label: "Logical Routes",
      status: logicalRoutesValid
        ? `Validated (v${routesRegistry.version})${
            registryChecksums
              ? ` [${registryChecksums.logicalRoutes.shortHash}]`
              : ""
          }`
        : "Missing",
      ok: logicalRoutesValid,
      state: logicalRoutesValid ? "pass" : "fail",
    },
    {
      label: "Agent Policies",
      status: agentPoliciesValid
        ? `Validated (v${agentPoliciesRegistry.version})${
            registryChecksums
              ? ` [${registryChecksums.agentPolicies.shortHash}]`
              : ""
          }`
        : "Missing",
      ok: agentPoliciesValid,
      state: agentPoliciesValid ? "pass" : "fail",
    },
    {
      label: "Action Registry",
      status: actionsValid
        ? `Active Bouncer (v${actionsRegistry.version})${
            registryChecksums ? ` [${registryChecksums.actions.shortHash}]` : ""
          }`
        : "Inactive",
      ok: actionsValid,
      state: actionsValid ? "pass" : "fail",
    },
    {
      label: "Flight Recorder",
      status: `${events.length} / 200 Events Logged`,
      ok: true,
      state: "pass",
      detail: "Immutable rolling window active in session storage.",
    },
    {
      label: "Registry Integrity",
      status:
        readiness.checks.registryIntegrity.status === "ok"
          ? "Validated & Populated"
          : "Blocked",
      ok: readiness.checks.registryIntegrity.status === "ok",
      state:
        readiness.checks.registryIntegrity.status === "ok"
          ? "pass"
          : readiness.checks.registryIntegrity.status === "checking"
            ? "checking"
            : "fail",
      detail: readiness.checks.registryIntegrity.detail,
    },
    {
      label: "UI Elements",
      status:
        readiness.checks.uiElements.status === "ok"
          ? `Validated (v${registryChecksums?.uiElements.version ?? "?"})${
              registryChecksums ? ` [${registryChecksums.uiElements.shortHash}]` : ""
            }`
          : "Blocked",
      ok: readiness.checks.uiElements.status === "ok",
      state:
        readiness.checks.uiElements.status === "ok"
          ? "pass"
          : readiness.checks.uiElements.status === "checking"
            ? "checking"
            : "fail",
      detail: readiness.checks.uiElements.detail,
    },
  ];

  const environmentChecks = [
    readiness.checks.storage,
    readiness.checks.microphone,
    readiness.checks.audioContext,
    readiness.checks.gemini,
  ];

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-2">
        <div className="text-2xl font-bold text-white">ClearVoice OS Mission Control</div>
        <div className="text-sm text-slate-400">
          Day 0 governed readiness surface. The OS proves policies, routing, bridge mode,
          and flight-recorder health before entering daily operations.
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <GovernanceBootMatrix
            items={readinessItems}
            viewsRegistryStatus={
              registryChecksums
                ? `Views registry loaded (v${registryChecksums.views.version}) [${registryChecksums.views.shortHash}]`
                : "Computing registry fingerprints..."
            }
          />

          <TelemetrySummaryCard
            syncStatus={state.syncStatus}
            policyBlocks={policyBlocks}
            syncErrors={syncErrors}
            liveToolVerdicts={liveToolEvents.length}
            lastEventLabel={
              lastEvent
                ? `${lastEvent.category} @ ${lastEvent.timestamp}`
                : "No events yet"
            }
            lastLiveToolVerdictLabel={
              lastLiveToolEvent
                ? `${(lastLiveToolEvent.payload as { type?: string; functionName?: string }).type ?? "LIVE_TOOL"} · ${
                    (lastLiveToolEvent.payload as { functionName?: string }).functionName ??
                    "unknown"
                  }`
                : "No live tool verdicts yet"
            }
          />

          <EnvironmentStatusCard checks={environmentChecks} />
        </div>

        <div className="space-y-6">
          <SystemManifestCard
            architectureVersion={manifestMeta.architectureVersion}
            deploymentTier={deploymentTier}
            specStatus={manifestMeta.specStatus}
            runtimeTarget={manifestMeta.runtimeTarget}
            safeModeDefault={safeModeDefault}
          />

          <BridgeTelemetryCard
            mode={bridgeSettings.mode}
            minLatencyMs={bridgeSettings.minLatencyMs}
            maxLatencyMs={bridgeSettings.maxLatencyMs}
            dropRate={bridgeSettings.dropRate}
            liveSnapshot={liveBridgeState}
            liveEndpoint={activeBridgeEndpoint ?? getLiveBridgeConfig().webSocketUrl}
            liveBridgeError={liveBridgeError}
            canBootLive={canBootLive}
            endpointGovernanceNote={endpointGovernanceNote}
            lifecycleEvents={recentBridgeLifecycleEvents}
            onConnect={() => void handleConnectLive()}
            onDisconnect={() => void handleDisconnectLive()}
            onStartPTT={() => void handleStartPTT()}
            onStopPTT={() => void handleStopPTT()}
          />

          <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
            <div className="mb-4 text-sm font-semibold text-white">Governed Entry</div>
            <div className="mb-4 text-sm text-slate-400">
              Once the pre-flight checks are green, enter the governed workspace
              and begin daily operations.
            </div>
            {readiness.phase === "BLOCKED" ? (
              <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">
                System boot blocked. Please resolve the failing pre-flight checks above.
              </div>
            ) : null}
            <div className="mb-4 text-xs text-slate-500">
              Boot phase: {readiness.phase}
            </div>
            <button
              type="button"
              onClick={bootWorkspace}
              disabled={!readiness.allCriticalChecksPassed}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Initialize Gateway Global OS
            </button>
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
            <div className="mb-4 text-sm font-semibold text-white">QR Entry</div>
            <div className="flex h-44 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 text-center text-sm text-slate-300">
              QR Entry Placeholder
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
