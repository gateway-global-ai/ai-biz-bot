import React, { useEffect } from "react";

import { useOSEventLog } from "../../os-core/observability/EventLogProvider";
import {
  useSharedCanvasDispatch,
  useSharedCanvasState,
} from "../../shell/SharedCanvasProvider";

export default function SystemSupportView() {
  const dispatch = useSharedCanvasDispatch();
  const state = useSharedCanvasState();
  const { appendEvent } = useOSEventLog();

  useEffect(() => {
    dispatch({
      type: "SET_ROUTE",
      payload: {
        routeId: "system.support",
        viewId: "system-support-view",
        shellMode: "view",
        breadcrumb: ["Home", "System", "Support"],
      },
    });
  }, [dispatch]);

  const submitDraft = () => {
    appendEvent({
      category: "GOVERNANCE_ACTION",
      os_state_snapshot: {
        shell_mode: state.shellMode,
        active_route_id: state.currentRouteId,
        active_view_id: state.currentViewId,
        breadcrumbs: state.breadcrumb,
      },
      payload: {
        type: "HUMAN_SUBMIT_SUPPORT_TICKET",
        stagedSupportText: state.stagedSupportText,
      },
    });
    dispatch({ type: "CLEAR_STAGED_SUPPORT_TEXT" });
    dispatch({ type: "CLEAR_HIGHLIGHT" });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">System Support</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Governed human-assistance surface for installation help, enterprise
        support, and escalation workflows.
      </p>

      <div
        data-highlight-id="support.ticket_input.textarea"
        className={`mt-6 rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 transition ${
          state.activeHighlightId === "support.ticket_input.textarea"
            ? "ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
            : ""
        }`}
      >
        <div className="mb-3 text-sm font-semibold text-white">Support Request</div>
        <p className="mb-4 text-sm text-slate-400">
          Review the drafted support request below or edit it before sending it
          to a human operator.
        </p>
        <textarea
          id="support.ticket_input.textarea"
          value={state.stagedSupportText ?? ""}
          onChange={(e) =>
            dispatch({
              type: "SET_STAGED_SUPPORT_TEXT",
              payload: { text: e.target.value },
            })
          }
          className="min-h-40 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
          placeholder="AI-drafted support summary will appear here."
        />
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={submitDraft}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Submit Support Ticket
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "CLEAR_STAGED_SUPPORT_TEXT" })}
            className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
          >
            Clear Draft
          </button>
        </div>
      </div>

      <div
        data-highlight-id="support.contact_human.button"
        className={`mt-6 rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 transition ${
          state.activeHighlightId === "support.contact_human.button"
            ? "ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
            : ""
        }`}
      >
        <div className="mb-3 text-sm font-semibold text-white">Human Support</div>
        <p className="mb-4 text-sm text-slate-400">
          Use the direct human channel if you need immediate installation or
          enterprise assistance.
        </p>
        <button
          type="button"
          id="support.contact_human.button"
          className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Contact Human Support
        </button>
      </div>
    </div>
  );
}
