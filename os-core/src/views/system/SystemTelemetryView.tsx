import React, { useEffect } from "react";
import {
  connectActiveBridge,
  disconnectActiveBridge,
  startBridgePushToTalk,
  stopBridgePushToTalk,
  configureBridgeSettings,
  getBridgeSettings,
  getActiveBridgeEndpoint,
  type BridgeMode,
} from "../../os-core/execution-plane/gemini-live-engine/bridgeRuntime";
import { useLiveBridgeState } from "../../os-core/execution-plane/gemini-live-engine/useLiveBridgeState";
import { useOSEventLog } from "../../os-core/observability/EventLogProvider";
import {
  useSharedCanvasDispatch,
  useSharedCanvasState,
} from "../../shell/SharedCanvasProvider";
import { Slider } from "../agent-builder/components/Slider";
import { BridgeTelemetryCard } from "../shared/components/BridgeTelemetryCard";
import { GovernanceEventLog } from "./components/GovernanceEventLog";

export default function SystemTelemetryView() {
  const dispatch = useSharedCanvasDispatch();
  const state = useSharedCanvasState();
  const liveSnapshot = useLiveBridgeState();
  const { events } = useOSEventLog();
  const [currentMode, setCurrentMode] = React.useState<BridgeMode>(
    getBridgeSettings().mode
  );

  useEffect(() => {
    dispatch({
      type: "SET_ROUTE",
      payload: {
        routeId: "system.telemetry",
        viewId: "system-telemetry-view",
        shellMode: "view",
        breadcrumb: ["Home", "System", "Telemetry"],
      },
    });
  }, [dispatch]);

  const handleModeChange = (mode: BridgeMode) => {
    configureBridgeSettings({ mode });
    setCurrentMode(mode);
    // Sync chaos enabled state if switching to/from chaos
    if (mode === "chaos" && !state.runtimeControls.chaosEnabled) {
      dispatch({
        type: "SET_RUNTIME_CHAOS_SETTINGS",
        payload: { chaosEnabled: true },
      });
    } else if (mode !== "chaos" && state.runtimeControls.chaosEnabled) {
      dispatch({
        type: "SET_RUNTIME_CHAOS_SETTINGS",
        payload: { chaosEnabled: false },
      });
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-hidden">
      <div className="mb-6 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">System Telemetry</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time monitoring of voice bridge status, governance events, and
            runtime anomalies.
          </p>
        </div>
        <div 
          data-highlight-id="telemetry.mode.selector"
          className={`flex items-center gap-2 rounded-lg bg-slate-900/50 p-1 transition-all ${
            state.activeHighlightId === "telemetry.mode.selector"
              ? "ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
              : ""
          }`}
        >
          {(["mock", "chaos", "live", "local"] as BridgeMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-all ${
                currentMode === mode
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-12 min-h-0">
        {/* Left Column: Bridge Status & Controls */}
        <div className="flex flex-col gap-6 lg:col-span-5 overflow-y-auto pr-2">
          <BridgeTelemetryCard
            mode={currentMode}
            minLatencyMs={state.runtimeControls.minLatencyMs}
            maxLatencyMs={state.runtimeControls.maxLatencyMs}
            dropRate={state.runtimeControls.dropRate}
            liveSnapshot={liveSnapshot}
            liveEndpoint={getActiveBridgeEndpoint() ?? "unknown"}
            liveBridgeError={null}
            canBootLive={true}
            lifecycleEvents={events.filter((e) =>
              ["SYSTEM_LIFECYCLE", "ERROR"].includes(e.category)
            )}
            onConnect={() => connectActiveBridge()}
            onDisconnect={() => disconnectActiveBridge()}
            onStartPTT={() => startBridgePushToTalk()}
            onStopPTT={() => stopBridgePushToTalk()}
          />

          <div
            data-highlight-id="telemetry.chaos.controls"
            className={`rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl transition ${
              currentMode === "chaos"
                ? "ring-1 ring-amber-500/50"
                : "opacity-75 grayscale pointer-events-none"
            } ${
              state.activeHighlightId === "telemetry.chaos.controls"
                ? "ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
                : ""
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-white">
                Chaos Engine Parameters
              </div>
              <div
                className={`h-2 w-2 rounded-full ${
                  currentMode === "chaos"
                    ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    : "bg-slate-700"
                }`}
              />
            </div>

            <div className="grid gap-6">
              <Slider
                label="Min Latency"
                value={state.runtimeControls.minLatencyMs}
                onChange={(value) =>
                  dispatch({
                    type: "SET_RUNTIME_CHAOS_SETTINGS",
                    payload: { minLatencyMs: value },
                  })
                }
                color="#f59e0b"
                description="Minimum simulated latency (ms)"
                disabled={currentMode !== "chaos"}
              />
              <Slider
                label="Max Latency"
                value={state.runtimeControls.maxLatencyMs}
                onChange={(value) =>
                  dispatch({
                    type: "SET_RUNTIME_CHAOS_SETTINGS",
                    payload: { maxLatencyMs: value },
                  })
                }
                color="#f97316"
                description="Maximum simulated latency (ms)"
                disabled={currentMode !== "chaos"}
              />
              <Slider
                label="Drop Rate"
                value={state.runtimeControls.dropRate}
                onChange={(value) =>
                  dispatch({
                    type: "SET_RUNTIME_CHAOS_SETTINGS",
                    payload: { dropRate: value },
                  })
                }
                color="#ef4444"
                description="Request failure probability (%)"
                disabled={currentMode !== "chaos"}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Governance Log */}
        <div className="lg:col-span-7 h-full min-h-0">
          <GovernanceEventLog />
        </div>
      </div>
    </div>
  );
}
