import React from "react";

import type { ActionsDef } from "../../../os-core/control-plane/registry-loader/types";

export function ActionContractsCard({
  actions,
}: {
  actions: ActionsDef[];
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-3 text-sm font-semibold text-white">Action Contracts</div>
      <div className="text-xs font-mono text-slate-300">
        {actions.map((action, index) => (
          <React.Fragment key={action.actionId}>
            {index > 0 && (
              <>
                <br />
                <br />
              </>
            )}
            {action.actionId}
            <br />
            mutation: {action.mutationLevel ?? action.mutationClass}
            <br />
            requiredKeys: {action.requiredContextKeys.join(", ")}
            <br />
            requiredPolicy: {action.requiredPolicy}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
