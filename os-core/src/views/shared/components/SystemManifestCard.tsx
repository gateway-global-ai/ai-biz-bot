import React from "react";

export function SystemManifestCard({
  architectureVersion,
  deploymentTier,
  specStatus,
  runtimeTarget,
  safeModeDefault,
}: {
  architectureVersion: string;
  deploymentTier: string;
  specStatus: string;
  runtimeTarget: string;
  safeModeDefault: string;
}) {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
      <div className="mb-4 text-sm font-semibold text-white">
        System Manifest Readout
      </div>
      <div className="space-y-2 text-sm text-slate-300">
        <div>
          Architecture Version:{" "}
          <span className="font-mono text-white">
            AI OS Control Plane {architectureVersion}
          </span>
        </div>
        <div>
          Deployment Tier:{" "}
          <span className="font-mono text-white">{deploymentTier}</span>
        </div>
        <div>
          Spec Status: <span className="font-mono text-white">{specStatus}</span>
        </div>
        <div>
          Runtime Target:{" "}
          <span className="font-mono text-white">{runtimeTarget}</span>
        </div>
        <div>
          Strict Safe Mode Default:{" "}
          <span className="font-mono text-white">{safeModeDefault}</span>
        </div>
      </div>
    </div>
  );
}
