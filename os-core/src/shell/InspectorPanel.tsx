import React from "react";

import { useOSEventLog } from "../os-core/observability/EventLogProvider";
import { Slider } from "../views/agent-builder/components/Slider";
import { StatusBadge } from "../views/shared/components/StatusBadge";
import {
  configureBridgeSettings,
  getBridgeSettings,
  injectLiveBridgeRawPayload,
  simulateIncomingToolCall,
} from "../os-core/execution-plane/gemini-live-engine/bridgeRuntime";

interface InspectorPanelProps {
  open: boolean;
  onClose: () => void;
}

export function InspectorPanel({ open, onClose }: InspectorPanelProps) {
  const { events, clearEvents } = useOSEventLog();
  const [bridgeSettings, setBridgeSettings] = React.useState(getBridgeSettings());
  const [injectionResult, setInjectionResult] = React.useState<{
    status: "ACCEPTED" | "DROPPED" | "ERROR";
    detail?: string;
  } | null>(null);
  const [rawPayload, setRawPayload] = React.useState(
    JSON.stringify(
      {
        serverContent: {
          modelTurn: {
            parts: [
              {
                functionCall: {
                  name: "switch_view",
                  args: { route_id: "workspace" },
                },
              },
            ],
          },
        },
      },
      null,
      2
    )
  );

  const simulateBlockedSwitchView = async () => {
    await simulateIncomingToolCall({
      timestamp: new Date().toISOString(),
      target_agent_id: "ClearVoiceOSNativeAgent",
      tool_name: "switch_view",
      args: {
        target_logical_route: "support.entry",
      },
    });
  };

  const simulateAllowedSwitchView = async () => {
    await simulateIncomingToolCall({
      timestamp: new Date().toISOString(),
      target_agent_id: "ClearVoiceOSAdminPilotAgent",
      tool_name: "switch_view",
      args: {
        target_logical_route: "support.entry",
      },
    });
  };

  const simulateValidHighlight = async () => {
    await simulateIncomingToolCall({
      timestamp: new Date().toISOString(),
      target_agent_id: "ClearVoiceOSAdminPilotAgent",
      tool_name: "highlight_ui_element",
      args: {
        element_id: "behavior.dominance.slider",
        duration_ms: 2000,
      },
    });
  };

  const simulateInvalidHighlight = async () => {
    await simulateIncomingToolCall({
      timestamp: new Date().toISOString(),
      target_agent_id: "ClearVoiceOSAdminPilotAgent",
      tool_name: "highlight_ui_element",
      args: {
        element_id: "behavior.imaginary.slider",
        duration_ms: 2000,
      },
    });
  };

  const simulateFocusDominance = async () => {
    await simulateIncomingToolCall({
      timestamp: new Date().toISOString(),
      target_agent_id: "ClearVoiceOSAdminPilotAgent",
      tool_name: "focus_behavior_control",
      args: {
        target_setting: "dominance",
      },
    });
  };

  const simulateFocusSafeMode = async () => {
    await simulateIncomingToolCall({
      timestamp: new Date().toISOString(),
      target_agent_id: "ClearVoiceOSAdminPilotAgent",
      tool_name: "focus_behavior_control",
      args: {
        target_setting: "safe_mode",
      },
    });
  };

  const simulateRequestHumanAssistance = async () => {
    await simulateIncomingToolCall({
      timestamp: new Date().toISOString(),
      target_agent_id: "ClearVoiceOSAdminPilotAgent",
      tool_name: "request_human_assistance",
      args: {},
    });
  };

  const injectPayload = async () => {
    const result = await injectLiveBridgeRawPayload(rawPayload);
    setInjectionResult(result);
    window.setTimeout(() => setInjectionResult(null), 3000);
  };

  const injectGeminiSwitchViewPayload = async () => {
    const payload = JSON.stringify(
      {
        serverContent: {
          modelTurn: {
            parts: [
              {
                functionCall: {
                  name: "switch_view",
                  args: { route_id: "workspace" },
                },
              },
            ],
          },
        },
      },
      null,
      2
    );
    setRawPayload(payload);
    const result = await injectLiveBridgeRawPayload(payload);
    setInjectionResult(result);
    window.setTimeout(() => setInjectionResult(null), 3000);
  };

  const injectGeminiFocusBehaviorPayload = async () => {
    const payload = JSON.stringify(
      {
        serverContent: {
          modelTurn: {
            parts: [
              {
                functionCall: {
                  name: "focus_behavior_control",
                  args: { target_setting: "safe_mode" },
                },
              },
            ],
          },
        },
      },
      null,
      2
    );
    setRawPayload(payload);
    const result = await injectLiveBridgeRawPayload(payload);
    setInjectionResult(result);
    window.setTimeout(() => setInjectionResult(null), 3000);
  };

  const injectGeminiRequestHumanPayload = async () => {
    const payload = JSON.stringify(
      {
        serverContent: {
          modelTurn: {
            parts: [
              {
                functionCall: {
                  name: "request_human_assistance",
                  args: {},
                },
              },
            ],
          },
        },
      },
      null,
      2
    );
    setRawPayload(payload);
    const result = await injectLiveBridgeRawPayload(payload);
    setInjectionResult(result);
    window.setTimeout(() => setInjectionResult(null), 3000);
  };

  const injectGeminiDraftSupportPayload = async () => {
    const payload = JSON.stringify(
      {
        serverContent: {
          modelTurn: {
            parts: [
              {
                functionCall: {
                  name: "draft_support_ticket",
                  args: {
                    ticket_body:
                      "The system latency is too high when switching views.",
                  },
                },
              },
            ],
          },
        },
      },
      null,
      2
    );
    setRawPayload(payload);
    const result = await injectLiveBridgeRawPayload(payload);
    setInjectionResult(result);
    window.setTimeout(() => setInjectionResult(null), 3000);
  };

  const injectHallucinatedToolPayload = async () => {
    const payload = JSON.stringify(
      {
        serverContent: {
          modelTurn: {
            parts: [
              {
                functionCall: {
                  name: "delete_all_user_data",
                  args: { confirm: true },
                },
              },
            ],
          },
        },
      },
      null,
      2
    );
    setRawPayload(payload);
    const result = await injectLiveBridgeRawPayload(payload);
    setInjectionResult(result);
    window.setTimeout(() => setInjectionResult(null), 3000);
  };

  const injectGeminiOnboardingPayload = async () => {
    const payload = JSON.stringify(
      {
        serverContent: {
          modelTurn: {
            parts: [
              {
                functionCall: {
                  name: "stage_business_onboarding",
                  args: {
                    business_name: "Boardwalk Suites Lafayette",
                    city: "Lafayette",
                    state: "LA",
                    contact_email: "ops@boardwalk.example",
                    category: "hospitality",
                  },
                },
              },
            ],
          },
        },
      },
      null,
      2
    );
    setRawPayload(payload);
    const result = await injectLiveBridgeRawPayload(payload);
    setInjectionResult(result);
    window.setTimeout(() => setInjectionResult(null), 3000);
  };

  const injectGeminiCandidateGroundingPayload = async () => {
    const payload = JSON.stringify(
      {
        serverContent: {
          modelTurn: {
            parts: [
              {
                functionCall: {
                  name: "ground_business_candidates",
                  args: {
                    search_name: "Boardwalk Suites",
                    city: "Lafayette",
                    state: "LA",
                  },
                },
              },
            ],
          },
        },
      },
      null,
      2
    );
    setRawPayload(payload);
    const result = await injectLiveBridgeRawPayload(payload);
    setInjectionResult(result);
    window.setTimeout(() => setInjectionResult(null), 3000);
  };

  const simulateDraftSupportTicket = async () => {
    await simulateIncomingToolCall({
      timestamp: new Date().toISOString(),
      target_agent_id: "ClearVoiceOSAdminPilotAgent",
      tool_name: "draft_support_ticket",
      args: {
        ticket_body:
          "The system feels slow during startup and the operator wants assistance reviewing the bridge and readiness configuration.",
      },
    });
  };

  const simulateMutateAgentBehavior = async () => {
    await simulateIncomingToolCall({
      timestamp: new Date().toISOString(),
      target_agent_id: "ClearVoiceOSAdminPilotAgent",
      tool_name: "mutate_agent_behavior",
      args: {
        setting: "grounding",
        value: 95,
      },
    });
  };

  const simulateMutateChaosSettings = async () => {
    await simulateIncomingToolCall({
      timestamp: new Date().toISOString(),
      target_agent_id: "ClearVoiceOSAdminPilotAgent",
      tool_name: "mutate_chaos_settings",
      args: {
        enabled: true,
        drop_rate: 35,
        max_latency_ms: 1800,
      },
    });
  };

  const simulateStageBusinessOnboarding = async () => {
    await simulateIncomingToolCall({
      timestamp: new Date().toISOString(),
      target_agent_id: "ClearVoiceOSAdminPilotAgent",
      tool_name: "stage_business_onboarding",
      args: {
        business_name: "Boardwalk Suites Lafayette",
        city: "Lafayette",
        state: "LA",
        contact_email: "ops@boardwalk.example",
        category: "hospitality",
      },
    });
  };

  const simulateGroundBusinessCandidates = async () => {
    await simulateIncomingToolCall({
      timestamp: new Date().toISOString(),
      target_agent_id: "ClearVoiceOSAdminPilotAgent",
      tool_name: "ground_business_candidates",
      args: {
        search_name: "Boardwalk Suites",
        city: "Lafayette",
        state: "LA",
      },
    });
  };

  const handleChaosToggle = () => {
    const next = configureBridgeSettings({
      mode: bridgeSettings.mode === "chaos" ? "mock" : "chaos",
    });
    setBridgeSettings(next);
  };

  const handleLatencyChange = (value: number) => {
    const next = configureBridgeSettings({
      maxLatencyMs: value,
    });
    setBridgeSettings(next);
  };

  const handleDropRateChange = (value: number) => {
    const next = configureBridgeSettings({
      dropRate: value,
    });
    setBridgeSettings(next);
  };

  if (!open) return null;

  return (
    <aside className="absolute bottom-4 left-4 right-4 top-20 z-50 flex flex-col rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-white">OS Flight Recorder</div>
          <div className="text-[11px] text-slate-400">
            Live in-memory/session event stream for governance, sync, and routing.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearEvents}
            className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-3 text-sm font-semibold text-white">Chaos Bridge Controls</div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleChaosToggle}
              className={`rounded-md px-3 py-2 text-xs font-medium ${
                bridgeSettings.mode === "chaos"
                  ? "border border-amber-500/20 bg-amber-500/10 text-amber-200"
                  : "border border-slate-700 text-slate-300"
              }`}
            >
              {bridgeSettings.mode === "chaos" ? "Chaos Bridge Enabled" : "Enable Chaos Bridge"}
            </button>
            <span className="text-[11px] text-slate-500">
              Active bridge: {bridgeSettings.mode}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Slider
              label="Network Latency"
              value={bridgeSettings.maxLatencyMs}
              onChange={handleLatencyChange}
              color="#f59e0b"
              description="Maximum simulated bridge latency in milliseconds."
            />
            <Slider
              label="Drop Rate"
              value={bridgeSettings.dropRate}
              onChange={handleDropRateChange}
              color="#ef4444"
              description="Percentage chance of simulated failure or dropped request."
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void simulateBlockedSwitchView()}
            className="rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-200"
          >
            Simulate Blocked switch_view
          </button>
          <button
            type="button"
            onClick={() => void simulateAllowedSwitchView()}
            className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200"
          >
            Simulate Allowed switch_view
          </button>
          <button
            type="button"
            onClick={() => void simulateValidHighlight()}
            className="rounded-md border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-xs text-indigo-200"
          >
            Simulate Valid highlight_ui_element
          </button>
          <button
            type="button"
            onClick={() => void simulateInvalidHighlight()}
            className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200"
          >
            Simulate Invalid highlight_ui_element
          </button>
          <button
            type="button"
            onClick={() => void simulateFocusDominance()}
            className="rounded-md border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200"
          >
            Simulate focus_behavior_control (dominance)
          </button>
          <button
            type="button"
            onClick={() => void simulateFocusSafeMode()}
            className="rounded-md border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-200"
          >
            Simulate focus_behavior_control (safe_mode)
          </button>
          <button
            type="button"
            onClick={() => void simulateRequestHumanAssistance()}
            className="rounded-md border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-xs text-violet-200"
          >
            Simulate request_human_assistance
          </button>
          <button
            type="button"
            onClick={() => void simulateDraftSupportTicket()}
            className="rounded-md border border-fuchsia-500/20 bg-fuchsia-500/5 px-3 py-2 text-xs text-fuchsia-200"
          >
            Simulate draft_support_ticket
          </button>
          <button
            type="button"
            onClick={() => void simulateMutateAgentBehavior()}
            className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200"
          >
            Simulate mutate_agent_behavior
          </button>
          <button
            type="button"
            onClick={() => void simulateMutateChaosSettings()}
            className="rounded-md border border-orange-500/20 bg-orange-500/5 px-3 py-2 text-xs text-orange-200"
          >
            Simulate mutate_chaos_settings
          </button>
          <button
            type="button"
            onClick={() => void simulateStageBusinessOnboarding()}
            className="rounded-md border border-lime-500/20 bg-lime-500/5 px-3 py-2 text-xs text-lime-200"
          >
            Simulate stage_business_onboarding
          </button>
          <button
            type="button"
            onClick={() => void simulateGroundBusinessCandidates()}
            className="rounded-md border border-teal-500/20 bg-teal-500/5 px-3 py-2 text-xs text-teal-200"
          >
            Simulate ground_business_candidates
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-3 text-sm font-semibold text-white">
            Live Bridge Raw Injection
          </div>
          <textarea
            value={rawPayload}
            onChange={(e) => setRawPayload(e.target.value)}
            className="min-h-40 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-xs text-slate-100 outline-none focus:border-indigo-500"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void injectPayload()}
              className="rounded-md border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-xs text-indigo-200"
            >
              Inject Payload
            </button>
            <button
              type="button"
              onClick={() => void injectGeminiSwitchViewPayload()}
              className="rounded-md border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200"
            >
              Inject Gemini switch_view Payload
            </button>
            <button
              type="button"
              onClick={() => void injectGeminiFocusBehaviorPayload()}
              className="rounded-md border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-200"
            >
              Inject focus_behavior_control Payload
            </button>
            <button
              type="button"
              onClick={() => void injectGeminiRequestHumanPayload()}
              className="rounded-md border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-xs text-violet-200"
            >
              Inject request_human_assistance Payload
            </button>
            <button
              type="button"
              onClick={() => void injectGeminiDraftSupportPayload()}
              className="rounded-md border border-fuchsia-500/20 bg-fuchsia-500/5 px-3 py-2 text-xs text-fuchsia-200"
            >
              Inject draft_support_ticket Payload
            </button>
            <button
              type="button"
              onClick={() => void injectHallucinatedToolPayload()}
              className="rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-200"
            >
              Inject Hallucinated Tool
            </button>
            <button
              type="button"
              onClick={() => void injectGeminiOnboardingPayload()}
              className="rounded-md border border-lime-500/20 bg-lime-500/5 px-3 py-2 text-xs text-lime-200"
            >
              Inject stage_business_onboarding Payload
            </button>
            <button
              type="button"
              onClick={() => void injectGeminiCandidateGroundingPayload()}
              className="rounded-md border border-teal-500/20 bg-teal-500/5 px-3 py-2 text-xs text-teal-200"
            >
              Inject ground_business_candidates Payload
            </button>
          </div>
          {injectionResult ? (
            <div className="mt-3 flex items-center gap-3">
              <StatusBadge
                variant={
                  injectionResult.status === "ACCEPTED"
                    ? "pass"
                    : injectionResult.status === "DROPPED"
                      ? "info"
                      : "fail"
                }
                label={
                  injectionResult.status === "ACCEPTED"
                    ? "PASS: Routed to Control Plane"
                    : injectionResult.status === "DROPPED"
                      ? "DROPPED: Invalid Provider Tool"
                      : "ERROR: Injection Failed"
                }
              />
              <span className="text-[11px] text-slate-400">
                {injectionResult.detail}
              </span>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-slate-400">
              No events recorded yet.
            </div>
          ) : (
            events
              .slice()
              .reverse()
              .map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-slate-300"
                >
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="text-slate-100">{event.category}</span>
                    <span className="text-slate-500">{event.timestamp}</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-all text-[11px] leading-relaxed text-slate-400">
                    {JSON.stringify(event, null, 2)}
                  </pre>
                </div>
              ))
          )}
        </div>
      </div>
    </aside>
  );
}
