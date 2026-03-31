/**
 * Phase D — surface derivation output (server-authoritative plan, not a second policy engine).
 * Canonical: docs-governance/canonical/GOVERNED_GENERATIVE_UI_SPEC.md § Intent-to-surface derivation,
 * docs-governance/canonical/COMMAND_CENTER_SURFACE_SPEC_V1.md (command_center slots).
 */

import type { CanvasViewId } from "./canvasViewContract.js";

export const SURFACE_DERIVATION_CONTRACT_VERSION = "surface_derivation.v1" as const;

/** Slot fill plan for `command_center` — palette-shaped data; hydration merges with site runtime. */
export interface CommandCenterSlotDerivationV1 {
  headline: string;
  contextSummary?: string;
  statusItems: Array<{
    id: string;
    label: string;
    value: string;
    tone?: "neutral" | "success" | "warning" | "danger";
  }>;
  workItems: Array<{ id: string; title: string; subtitle?: string }>;
  /** Labels are placeholders; execution still gated by syscall + ACTION_REGISTRY. */
  approvals: Array<{ id: string; label: string; actionId: string }>;
}

/**
 * Result of mapping `IntentLoopResolution` → registered surface plan.
 * Does **not** re-check entitlements; consumes resolution as sole authority.
 */
export interface SurfaceDerivationResult {
  contractVersion: typeof SURFACE_DERIVATION_CONTRACT_VERSION;
  /** Primary surface to hydrate — null when resolution allows no view. */
  primaryViewId: CanvasViewId | null;
  /** Populated only when primaryViewId === `command_center`. */
  commandCenter?: CommandCenterSlotDerivationV1;
  /** Derivation-only audit lines (e.g. mismatch guard), not policy denials. */
  derivationAuditNotes?: string[];
}
