import React from "react";
import { Link } from "wouter";

import { loadLogicalRoutes } from "../os-core/control-plane/registry-loader/loadLogicalRoutes";
import { resolveMenu } from "../os-core/control-plane/menu-resolver/resolveMenu";
import { useSharedCanvasState } from "./SharedCanvasProvider";

/**
 * Policy-bound conversational navigation placeholder.
 * This is intentionally lightweight until the Menu Resolver
 * and agent policy adapters are wired in.
 */
export function ConversationalNavController() {
  const state = useSharedCanvasState();
  const routes = loadLogicalRoutes();
  const resolution = resolveMenu(
    state.currentRouteId,
    routes.routes,
    state.contextKeys
  );
  const suggestedActions =
    state.lastActionResult?.nextSuggestedActions ?? resolution.suggestedActions;

  return (
    <aside className="hidden w-[360px] shrink-0 border-l border-slate-800 bg-slate-950/80 xl:block">
      <div className="p-4">
        <div className="mb-2 text-sm font-semibold text-white">
          Conversational Navigation
        </div>
        <div className="mb-4 text-xs leading-relaxed text-slate-400">
          This controller will host the ClearVoice OS native agent, suggested
          actions, and policy-bound drill-down menus. It may not invent routes
          or actions outside the registries.
        </div>

        {resolution.options.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Menu Options
            </div>
            {resolution.options.map((option) => (
              <Link
                key={option.routeId}
                href={option.browserPath}
                className="block rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 hover:border-slate-600"
              >
                {option.label}
              </Link>
            ))}
          </div>
        )}

        {suggestedActions.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Suggested Next Actions
            </div>
            {suggestedActions.map((action) => (
              <div
                key={action}
                className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-sm text-slate-200"
              >
                {action}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
