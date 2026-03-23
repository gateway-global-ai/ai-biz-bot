import React from "react";
import { useOSEventLog } from "../../../os-core/observability/EventLogProvider";
import { StatusBadge } from "../../shared/components/StatusBadge";

export function GovernanceEventLog() {
  const { events, clearEvents } = useOSEventLog();

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-indigo-500/20 bg-slate-900/40 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-indigo-500/10 bg-slate-900/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <h2 className="text-sm font-semibold text-white">Flight Recorder</h2>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
            {events.length} / 200
          </span>
        </div>
        <button
          onClick={clearEvents}
          className="text-[10px] font-medium uppercase tracking-wider text-slate-500 hover:text-white transition-colors"
        >
          Clear Log
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-center">
              <div className="text-sm font-medium text-slate-500">No events logged</div>
              <div className="mt-1 text-xs text-slate-600">
                Waiting for system activity...
              </div>
            </div>
          ) : (
            [...events].reverse().map((event) => (
              <div
                key={event.id}
                className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40 p-3 transition-all hover:border-indigo-500/30 hover:bg-slate-900/60"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <StatusBadge
                      variant={
                        event.category === "ERROR"
                          ? "fail"
                          : event.category === "POLICY_BLOCK"
                            ? "info"
                            : event.category === "GOVERNANCE_ACTION"
                              ? "pass"
                              : "checking"
                      }
                      label={event.category}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-slate-600 opacity-0 transition-opacity group-hover:opacity-100">
                    {event.id.slice(0, 8)}
                  </span>
                </div>

                <div className="font-mono text-xs text-slate-300">
                  {renderEventPayload(event.payload)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function renderEventPayload(payload: unknown): React.ReactNode {
  if (!payload || typeof payload !== "object") {
    return String(payload);
  }

  const p = payload as Record<string, any>;

  // Handle LIVE_TOOL events specifically as they are common in system lifecycle
  if (p.type === "LIVE_TOOL_ACCEPTED" || p.type === "LIVE_TOOL_DROPPED" || p.type === "LIVE_TOOL_ERROR") {
    return (
      <div className="flex flex-col gap-1">
        <div className={p.type === "LIVE_TOOL_ACCEPTED" ? "text-emerald-300" : "text-amber-300"}>
          tool_call: <span className="text-white">{p.functionName}</span>
        </div>
        {p.detail && (
          <div className="text-[10px] text-slate-500">{JSON.stringify(p.detail)}</div>
        )}
      </div>
    );
  }

  if (p.functionName) {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-indigo-300">
          tool_call: <span className="text-white">{p.functionName}</span>
        </div>
        {p.detail && (
          <div className="text-[10px] text-slate-500">{JSON.stringify(p.detail)}</div>
        )}
      </div>
    );
  }

  if (p.action && p.decision) {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-emerald-300">
          action: <span className="text-white">{p.action.actionType}</span>
        </div>
        <div className="text-[10px] text-slate-500">
          Target: {p.decision.targetRoutePath || "current_view"}
        </div>
      </div>
    );
  }

  if (p.reason) {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-amber-300">
          blocked: <span className="text-white">{p.action?.actionType}</span>
        </div>
        <div className="text-[10px] text-amber-500/80">{p.reason}</div>
      </div>
    );
  }

  if (p.source && p.message) {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-rose-300">
          error: <span className="text-white">{p.source}</span>
        </div>
        <div className="text-[10px] text-rose-400/80">{p.message}</div>
      </div>
    );
  }

  // Handle System Lifecycle events
  if (p.type && (p.previousState || p.nextState)) {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-sky-300">
          lifecycle: <span className="text-white">{p.type}</span>
        </div>
        <div className="text-[10px] text-slate-500">{p.detail}</div>
      </div>
    );
  }

  return (
    <pre className="whitespace-pre-wrap break-all text-[10px] text-slate-500">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}
