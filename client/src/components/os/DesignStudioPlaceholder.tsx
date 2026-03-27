/**
 * Placeholder canvas for governed Design Studio viewIds — no layout experiments.
 * State is source-of-truth in site_configs.metadata.designStudio (handoff API).
 */

import { CANVAS } from "@/config/brand";

export function DesignStudioPlaceholder({
  title,
  viewId,
  siteConfigId,
}: {
  title: string;
  viewId: string;
  siteConfigId?: string | null;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center gap-3 border border-slate-200 rounded-sui"
      style={{ backgroundColor: CANVAS.bg }}
    >
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="text-sm text-slate-500 max-w-sm">
        Placeholder view — workflow state is persisted via the Design Studio handoff API.
      </p>
      <p className="text-xs font-mono text-slate-400 break-all">
        {viewId}
        {siteConfigId ? ` · site ${siteConfigId.slice(0, 8)}…` : ""}
      </p>
    </div>
  );
}
