import React from "react";

interface ContextInfoCardProps {
  siteId: string;
  agentId: string;
  routeId: string;
  shellMode: string;
}

export function ContextInfoCard({
  siteId,
  agentId,
  routeId,
  shellMode,
}: ContextInfoCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-3 text-sm font-semibold text-white">Context</div>
      <div className="text-xs font-mono text-slate-300">
        siteConfigId: {siteId}
        <br />
        agentId: {agentId}
        <br />
        routeId: {routeId}
        <br />
        shellMode: {shellMode}
      </div>
    </div>
  );
}
