/**
 * Active experience — in-shell intent-bound UI state (Concierge / canvas).
 * Canonical: docs-governance/canonical/SHELL_CONTAINMENT_RULE_V1.md
 *
 * Not website navigation: the conversational shell opens temporary experiences;
 * canvas is subordinate to the shell. Prefer this over “pinned canvas” as a product term.
 */

import type { CanvasRenderPayload } from "./canvasViewContract.js";

export type ActiveExperienceStatus = "active" | "suspended" | "closed";

/**
 * Runtime metadata for the current in-shell experience.
 * Resume/suspend belongs at intent-session layer (future), not as SPA-style persistent nav.
 */
export interface ActiveExperience {
  intentType: string;
  experienceId: string;
  status: ActiveExperienceStatus;
  resumable: boolean;
  canvasViewId?: string;
  state?: Record<string, unknown>;
}

/** Bundles governance metadata with the canvas render payload the shell is showing. */
export interface ActiveExperienceState {
  meta: ActiveExperience;
  payload: CanvasRenderPayload;
}

function mapViewIdToIntentType(viewId: string): string {
  if (viewId === "canvas_backgrounds") return "canvas_background_selection";
  return viewId;
}

export function buildActiveExperienceFromCanvasPayload(payload: CanvasRenderPayload): ActiveExperience {
  const viewId = "viewId" in payload ? String(payload.viewId) : "unknown";
  return {
    intentType: mapViewIdToIntentType(viewId),
    experienceId: `${viewId}-${Date.now().toString(36)}`,
    status: "active",
    resumable: true,
    canvasViewId: viewId === "unknown" ? undefined : viewId,
    state: {},
  };
}
