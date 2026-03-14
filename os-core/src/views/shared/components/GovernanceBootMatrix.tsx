import React from "react";
import { StatusBadge } from "./StatusBadge";

export interface ReadinessMatrixItem {
  label: string;
  status: string;
  ok: boolean;
  detail?: string;
  state?: "pass" | "checking" | "fail";
}

interface GovernanceBootMatrixProps {
  items: ReadinessMatrixItem[];
  viewsRegistryStatus: string;
}

export function GovernanceBootMatrix({
  items,
  viewsRegistryStatus,
}: GovernanceBootMatrixProps) {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
      <div className="mb-4 text-sm font-semibold text-white">
        Governance Boot Matrix
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs uppercase tracking-wider text-slate-500">
                {item.label}
              </div>
              <StatusBadge
                variant={item.state ?? (item.ok ? "pass" : "fail")}
              />
            </div>
            <div className="mt-2 text-sm font-medium text-slate-200">
              {item.status}
            </div>
            {item.detail ? (
              <div
                className={`mt-2 text-xs ${
                  item.state === "fail" || !item.ok
                    ? "text-rose-300"
                    : "text-slate-500"
                }`}
              >
                {item.detail}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-3 text-[11px] text-slate-500">{viewsRegistryStatus}</div>
    </div>
  );
}
