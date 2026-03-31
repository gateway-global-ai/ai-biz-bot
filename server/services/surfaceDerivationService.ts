/**
 * SurfaceDerivationService (Phase D) — maps authoritative `IntentLoopResolution` to a registered
 * surface plan. Does **not** reinterpret entitlements, re-run Tier-1 routing, or invent `CanvasViewId`s.
 *
 * Consumes output of Sub-agent B/C only; hydration (`canvas.render` payloads) remains separate.
 */

import type { CanvasViewId } from "../../shared/canvasViewContract.js";
import type { IntentLoopResolution } from "../../shared/intentLoopContract.js";
import {
  isRegisteredCanvasViewId,
} from "../../shared/intentLoopResolutionSchema.js";
import type {
  CommandCenterSlotDerivationV1,
  SurfaceDerivationResult,
} from "../../shared/surfaceDerivationContract.js";
import { SURFACE_DERIVATION_CONTRACT_VERSION } from "../../shared/surfaceDerivationContract.js";

function buildCommandCenterSlots(resolution: IntentLoopResolution): CommandCenterSlotDerivationV1 {
  const sv = resolution.stateVector ?? {};
  const statusItems: CommandCenterSlotDerivationV1["statusItems"] = [];
  const workItems: CommandCenterSlotDerivationV1["workItems"] = [];

  if (sv.lifecycle != null) {
    statusItems.push({
      id: "lifecycle",
      label: "Relationship phase",
      value: String(sv.lifecycle),
      tone: "neutral",
    });
  }
  if (sv.domainJourneyKey != null && sv.domainJourneyKey !== "unknown") {
    statusItems.push({
      id: "domain_journey",
      label: "Domain journey",
      value: String(sv.domainJourneyKey),
      tone: "neutral",
    });
  }
  if (statusItems.length === 0) {
    statusItems.push({
      id: "status_default",
      label: "Status",
      value: "Operational overview",
      tone: "neutral",
    });
  }

  if (sv.swarmRoleRef != null) {
    workItems.push({
      id: "swarm_role",
      title: "Active role context",
      subtitle: String(sv.swarmRoleRef),
    });
  }
  if (sv.operationalMode != null) {
    workItems.push({
      id: "operational_mode",
      title: "Operational mode",
      subtitle: String(sv.operationalMode),
    });
  }
  if (workItems.length === 0) {
    workItems.push({
      id: "work_default",
      title: "Work queue",
      subtitle: "Governed tasks appear here when available.",
    });
  }

  const actions = resolution.allowedActionIds ?? [];
  const approvals: CommandCenterSlotDerivationV1["approvals"] = actions.slice(0, 8).map((actionId, i) => ({
    id: `approval_${i}`,
    label: actionId.replace(/_/g, " "),
    actionId,
  }));

  const headline = "Command center";
  const contextParts: string[] = [];
  if (resolution.swarmSchematicRef?.id) {
    contextParts.push(`Schematic: ${resolution.swarmSchematicRef.id}`);
  }
  if (resolution.resolutionId) {
    contextParts.push(`Resolution: ${resolution.resolutionId.slice(0, 8)}…`);
  }

  return {
    headline,
    contextSummary: contextParts.length > 0 ? contextParts.join(" · ") : undefined,
    statusItems,
    workItems,
    approvals,
  };
}

export interface DeriveSurfacesFromResolutionInput {
  resolution: IntentLoopResolution;
  /**
   * Sub-agent C merge output — authoritative pick when multiple `allowedCanvasViewIds` exist.
   * When omitted, first allowed id is used (same order as resolver list).
   */
  finalSelectedViewId?: string;
}

/**
 * Derive registered surface plan from resolution. No entitlement or router logic.
 */
export function deriveSurfacesFromResolution(
  input: DeriveSurfacesFromResolutionInput,
): SurfaceDerivationResult {
  const { resolution } = input;
  const allowed = resolution.allowedCanvasViewIds;
  const notes: string[] = [];

  let primary: CanvasViewId | null = null;

  const final = input.finalSelectedViewId;
  if (final != null && final !== "" && isRegisteredCanvasViewId(final)) {
    if (allowed?.includes(final)) {
      primary = final;
    } else {
      notes.push("derive:finalSelectedViewId_not_in_allowed_using_fallback_order");
    }
  }

  if (primary == null && allowed != null && allowed.length > 0) {
    const first = allowed[0];
    if (isRegisteredCanvasViewId(first)) {
      primary = first;
    } else {
      notes.push("derive:first_allowed_not_registered");
    }
  }

  if (primary != null && !isRegisteredCanvasViewId(primary)) {
    return {
      contractVersion: SURFACE_DERIVATION_CONTRACT_VERSION,
      primaryViewId: null,
      derivationAuditNotes: [...notes, "derive:invalid_primary"],
    };
  }

  if (primary == null) {
    return {
      contractVersion: SURFACE_DERIVATION_CONTRACT_VERSION,
      primaryViewId: null,
      derivationAuditNotes: notes.length > 0 ? notes : ["derive:no_primary_surface"],
    };
  }

  let commandCenter: CommandCenterSlotDerivationV1 | undefined;
  if (primary === "command_center") {
    commandCenter = buildCommandCenterSlots(resolution);
  }

  return {
    contractVersion: SURFACE_DERIVATION_CONTRACT_VERSION,
    primaryViewId: primary,
    commandCenter,
    derivationAuditNotes: notes.length > 0 ? notes : undefined,
  };
}
