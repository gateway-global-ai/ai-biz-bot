import React from "react";
import { useSharedCanvasState } from "./SharedCanvasProvider";

export function ContextBar({
  onToggleInspector,
}: {
  onToggleInspector: () => void;
}) {
  const state = useSharedCanvasState();
  const syncLabel =
    state.syncStatus === "syncing"
      ? "[Syncing...]"
      : state.syncStatus === "synced"
        ? "[Synced]"
        : state.syncStatus === "error"
          ? "[Sync Error]"
          : "";

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300"
        >
          Menu
        </button>
        <button
          type="button"
          onClick={onToggleInspector}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300"
        >
          Inspector
        </button>
        <div>
          <div className="text-sm font-semibold text-white">ClearVoice OS</div>
          <div className="text-[11px] text-slate-400">
            {state.breadcrumb.join(" / ")} / {state.shellMode}
          </div>
        </div>
      </div>
      <div className="text-right text-xs text-slate-400">
        <div>{state.currentRouteId}</div>
        {syncLabel ? <div className="text-[11px] text-slate-500">{syncLabel}</div> : null}
      </div>
    </header>
  );
}
