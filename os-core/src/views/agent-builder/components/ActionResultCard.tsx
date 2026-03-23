import React from "react";

import type { ActionResult } from "../../../os-core/control-plane/registry-loader/types";

export function ActionResultCard({ result }: { result: ActionResult | null }) {
  if (!result) return null;

  return (
    <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div className="text-sm font-semibold text-white">Result</div>
      <div className="mt-1 text-sm text-slate-300">{result.message}</div>
      <div className="mt-2 text-xs font-mono text-slate-400">
        changedFields: {result.changedFields.join(", ")}
      </div>
    </div>
  );
}
