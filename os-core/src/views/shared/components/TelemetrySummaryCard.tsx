import React from "react";

export function TelemetrySummaryCard({
  syncStatus,
  policyBlocks,
  syncErrors,
  lastEventLabel,
  liveToolVerdicts,
  lastLiveToolVerdictLabel,
}: {
  syncStatus: string;
  policyBlocks: number;
  syncErrors: number;
  lastEventLabel: string;
  liveToolVerdicts: number;
  lastLiveToolVerdictLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
      <div className="mb-4 text-sm font-semibold text-white">
        Telemetry Summary
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Sync Status
          </div>
          <div className="mt-2 text-sm font-medium text-slate-200">{syncStatus}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Policy Blocks
          </div>
          <div className="mt-2 text-sm font-medium text-slate-200">{policyBlocks}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Sync Errors
          </div>
          <div className="mt-2 text-sm font-medium text-slate-200">{syncErrors}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Live Tool Verdicts
          </div>
          <div className="mt-2 text-sm font-medium text-slate-200">{liveToolVerdicts}</div>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-400">
        Last event: {lastEventLabel}
      </div>
      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-400">
        Last live tool: {lastLiveToolVerdictLabel}
      </div>
    </div>
  );
}
