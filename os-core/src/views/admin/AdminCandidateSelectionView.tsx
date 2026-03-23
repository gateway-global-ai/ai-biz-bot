import React, { useEffect } from "react";
import { useLocation } from "wouter";

import { useOSEventLog } from "../../os-core/observability/EventLogProvider";
import {
  useSharedCanvasDispatch,
  useSharedCanvasState,
} from "../../shell/SharedCanvasProvider";

export default function AdminCandidateSelectionView() {
  const dispatch = useSharedCanvasDispatch();
  const state = useSharedCanvasState();
  const { appendEvent } = useOSEventLog();
  const [, setLocation] = useLocation();

  useEffect(() => {
    dispatch({
      type: "SET_ROUTE",
      payload: {
        routeId: "admin.candidate_selection",
        viewId: "admin-candidate-selection-view",
        shellMode: "view",
        breadcrumb: ["Home", "Admin", "Candidate Selection"],
      },
    });
  }, [dispatch]);

  const candidates = state.candidateResults ?? [];

  const selectCandidate = (candidate: (typeof candidates)[number]) => {
    dispatch({
      type: "SET_STAGED_ONBOARDING_DATA",
      payload: {
        business_name: candidate.business_name,
        city: candidate.city,
        state: candidate.state,
        zip: candidate.zip,
        contact_email: candidate.contact_email,
        category: candidate.category,
      },
    });
    dispatch({ type: "CLEAR_CANDIDATE_RESULTS" });
    dispatch({ type: "CLEAR_HIGHLIGHT" });
    appendEvent({
      category: "GOVERNANCE_ACTION",
      os_state_snapshot: {
        shell_mode: state.shellMode,
        active_route_id: state.currentRouteId,
        active_view_id: state.currentViewId,
        breadcrumbs: state.breadcrumb,
      },
      payload: {
        type: "HUMAN_SELECT_BUSINESS_CANDIDATE",
        candidate,
      },
    });
    setLocation("/admin/onboarding");
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">Candidate Selection</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Review the grounded business candidates and select the canonical record
        to stage into onboarding.
      </p>

      <div
        data-highlight-id="onboarding.candidate_list"
        className={`mt-6 rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 transition ${
          state.activeHighlightId === "onboarding.candidate_list"
            ? "ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
            : ""
        }`}
      >
        <div className="space-y-4">
          {candidates.map((candidate, index) => (
            <div
              key={candidate.id}
              data-highlight-id="onboarding.candidate_item"
              className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
            >
              <div className="text-sm font-semibold text-white">
                {candidate.business_name}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {candidate.city}, {candidate.state} {candidate.zip ?? ""}
              </div>
              <div className="mt-1 text-xs font-mono text-slate-500">
                {candidate.contact_email ?? "no-email"} · {candidate.category ?? "uncategorized"}
              </div>
              <button
                type="button"
                id={`onboarding.candidate_item.${index}`}
                onClick={() => selectCandidate(candidate)}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Select this Business
              </button>
            </div>
          ))}
          {candidates.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
              No grounded business candidates available yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
