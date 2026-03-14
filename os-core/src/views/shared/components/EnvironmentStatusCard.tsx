import React from "react";

import type { SystemReadinessState } from "../../../os-core/observability/useSystemReadiness";
import { StatusBadge } from "./StatusBadge";

export function EnvironmentStatusCard({
  checks,
}: {
  checks: Array<SystemReadinessState["checks"][keyof SystemReadinessState["checks"]]>;
}) {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
      <div className="mb-4 text-sm font-semibold text-white">
        Environment Status
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {checks.map((check) => (
          <div
            key={check.label}
            className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs uppercase tracking-wider text-slate-500">
                {check.label}
              </div>
              <StatusBadge
                variant={
                  check.status === "ok"
                    ? "pass"
                    : check.status === "error"
                      ? "fail"
                      : "checking"
                }
              />
            </div>
            <div className="mt-2 text-sm font-medium text-slate-200">
              {check.status === "ok"
                ? "Ready"
                : check.status === "error"
                  ? "Blocked"
                  : "Checking"}
            </div>
            <div
              className={`mt-2 text-xs ${
                check.status === "error" ? "text-rose-300" : "text-slate-500"
              }`}
            >
              {check.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
