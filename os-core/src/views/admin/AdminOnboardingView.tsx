import React, { useEffect } from "react";

import { useOSEventLog } from "../../os-core/observability/EventLogProvider";
import {
  useSharedCanvasDispatch,
  useSharedCanvasState,
} from "../../shell/SharedCanvasProvider";

export default function AdminOnboardingView() {
  const dispatch = useSharedCanvasDispatch();
  const state = useSharedCanvasState();
  const { appendEvent } = useOSEventLog();

  useEffect(() => {
    dispatch({
      type: "SET_ROUTE",
      payload: {
        routeId: "admin.onboarding",
        viewId: "admin-onboarding-view",
        shellMode: "view",
        breadcrumb: ["Home", "Admin", "Onboarding"],
      },
    });
  }, [dispatch]);

  const updateField = (
    key:
      | "business_name"
      | "city"
      | "state"
      | "zip"
      | "contact_email"
      | "category",
    value: string
  ) => {
    dispatch({
      type: "SET_STAGED_ONBOARDING_DATA",
      payload: { [key]: value },
    });
  };

  const approveCreate = () => {
    appendEvent({
      category: "GOVERNANCE_ACTION",
      os_state_snapshot: {
        shell_mode: state.shellMode,
        active_route_id: state.currentRouteId,
        active_view_id: state.currentViewId,
        breadcrumbs: state.breadcrumb,
      },
      payload: {
        type: "HUMAN_APPROVE_CREATE_BUSINESS",
        stagedOnboardingData: state.stagedOnboardingData,
      },
    });
    dispatch({ type: "CLEAR_STAGED_ONBOARDING_DATA" });
    dispatch({ type: "CLEAR_HIGHLIGHT" });
  };

  const form = state.stagedOnboardingData ?? {};
  const requiredFieldsComplete =
    Boolean(form.business_name) &&
    Boolean(form.city) &&
    Boolean(form.state) &&
    Boolean(form.zip);
  const firstMissingField =
    !form.business_name
      ? "Business Name"
      : !form.city
        ? "City"
        : !form.state
          ? "State"
          : !form.zip
            ? "ZIP"
            : null;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">Admin Onboarding</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Governed onboarding surface. The AI may stage the profile, but a human
        must review and approve creation.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          ["business_name", "Business Name", "onboarding.business_name.input"],
          ["city", "City", "onboarding.city.input"],
          ["state", "State", "onboarding.state.input"],
          ["zip", "ZIP", "onboarding.zip.input"],
          ["contact_email", "Contact Email", "onboarding.contact_email.input"],
          ["category", "Category", "onboarding.category.input"],
        ].map(([key, label, highlightId]) => (
          <div
            key={key}
            data-highlight-id={highlightId}
            className={`rounded-2xl border border-slate-800 bg-slate-900/40 p-4 transition ${
              state.activeHighlightId === highlightId
                ? "ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
                : ""
            }`}
          >
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {label}
            </label>
            <input
              id={highlightId}
              value={String(form[key as keyof typeof form] ?? "")}
              onChange={(e) =>
                updateField(
                  key as
                    | "business_name"
                    | "city"
                    | "state"
                    | "zip"
                    | "contact_email"
                    | "category",
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
            />
          </div>
        ))}
      </div>

      <div
        data-highlight-id="onboarding.submit.button"
        className={`mt-6 rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 transition ${
          state.activeHighlightId === "onboarding.submit.button"
            ? "ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
            : ""
        }`}
      >
        <div className="mb-3 text-sm font-semibold text-white">Human Approval</div>
        <p className="mb-4 text-sm text-slate-400">
          Review the AI-staged onboarding data, correct any fields, then approve
          creation manually.
        </p>
        {!requiredFieldsComplete ? (
          <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
            Draft incomplete. Missing required field: {firstMissingField}.
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-100">
            Draft complete. Human review and approval required.
          </div>
        )}
        <button
          type="button"
          id="onboarding.submit.button"
          onClick={approveCreate}
          disabled={!requiredFieldsComplete}
          className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Approve &amp; Create
        </button>
      </div>
    </div>
  );
}
