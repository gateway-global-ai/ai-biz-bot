/**
 * IntentLoopResolver (Phase B) — governance-only merge gate.
 *
 * Consumes Tier-0/Tier-1 outputs (site runtime + canvas intent router result) and Phase A
 * observation signals. Does **not** execute PMS/vendor domain workflows, tool orchestration,
 * prompt compilation, or presentation — only constraints + audit. `IntentLoopResolution` has
 * no presentation metadata (no CSS, style objects, or ad-hoc tokens).
 *
 * Every resolution is Zod-validated via `parseIntentLoopResolution` before return.
 */

import { createHash } from "node:crypto";

import type { CanvasResolveResult } from "../../shared/canvasViewContract.js";
import {
  INTENT_LOOP_CONTRACT_VERSION,
  type IntentLoopMergeStep,
  type IntentLoopPhaseAObservation,
  type IntentLoopResolution,
  type IntentLoopStateVector,
} from "../../shared/intentLoopContract.js";
import type { SiteRuntimeContext } from "../../shared/siteRuntimeContext.js";
import type { CanvasViewId } from "../../shared/canvasViewContract.js";
import {
  INTENT_LOOP_FAIL_CLOSED_FALLBACK_VIEW_IDS,
  isRegisteredCanvasViewId,
  parseIntentLoopResolution,
} from "../../shared/intentLoopResolutionSchema.js";
import { mergeGroundingForPreservedView } from "./experienceContinuity.js";

export interface ResolveIntentLoopInput {
  /** Identity anchor — must match resolved site runtime (caller must not spoof). */
  siteConfigId: string;
  siteRuntime: SiteRuntimeContext;
  /** Output of `routeCanvasIntent` after Tier-1 / Tier-2 / Tier-3. */
  resolveResult: CanvasResolveResult;
  /** Phase A observation for the same syscall (state vector hints). */
  phaseAObservation: IntentLoopPhaseAObservation;
  /**
   * Client-reported active canvas view (`envelope.context.currentViewId`) before this turn.
   * When the router returns noop with no `selectedViewId`, entitlement-preserving continuity
   * may pin `allowedCanvasViewIds` to this view instead of collapsing to an empty allowlist.
   */
  priorActiveViewId?: string | null;
}

function assertSiteConfigIdentity(input: ResolveIntentLoopInput): void {
  const id = input.siteConfigId?.trim();
  if (!id) {
    throw new Error("identity:missing_site_config_id");
  }
  if (id !== input.phaseAObservation.siteConfigId.trim()) {
    throw new Error("identity:siteConfigId_mismatch_observation");
  }
  if (id !== input.siteRuntime.identity.siteConfigId.trim()) {
    throw new Error("identity:siteConfigId_mismatch_site_runtime");
  }
}

function deterministicResolutionId(input: {
  siteConfigId: string;
  turnId: string;
  mergeFingerprint: string;
}): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, 32);
}

function entitledRegisteredViewSet(siteRuntime: SiteRuntimeContext): Set<string> {
  const out = new Set<string>();
  for (const v of siteRuntime.entitlements.allowedCanvasViews) {
    if (isRegisteredCanvasViewId(v)) out.add(v);
  }
  return out;
}

/**
 * **Policy order (canonical):** walk `INTENT_LOOP_FAIL_CLOSED_FALLBACK_VIEW_IDS` in array order
 * (`disambiguation_menu` → `support_home` → `welcome`) and return the first id the tenant is
 * entitled to. Do not reorder or shortcut without updating governance + tests — Phase C and
 * operators rely on stable fail-closed behavior (`VOICE_FIRST_INTERFACE_PIPELINE_V1`, Sub-agent A).
 */
function pickFailClosedFallback(entitled: Set<string>): CanvasViewId | null {
  for (const id of INTENT_LOOP_FAIL_CLOSED_FALLBACK_VIEW_IDS) {
    if (entitled.has(id)) return id;
  }
  return null;
}

function buildStateVector(
  observation: IntentLoopPhaseAObservation,
  siteRuntime: SiteRuntimeContext,
): IntentLoopStateVector {
  const h = observation.stateVectorHints;
  const sv: IntentLoopStateVector = {
    sessionRef: observation.sessionRef,
    entitlementKeys: [
      `plan:${siteRuntime.entitlements.plan}`,
      `views:${siteRuntime.entitlements.allowedCanvasViews.length}`,
    ],
  };
  if (h?.actorClass && h.actorClass !== "unknown") {
    sv.actorClass = h.actorClass;
  }
  if (h?.lifecycleStage && h.lifecycleStage !== "unknown") {
    sv.lifecycle = h.lifecycleStage;
  } else if (h?.managementControlStage && h.managementControlStage !== "unknown") {
    sv.lifecycle = h.managementControlStage;
  }
  if (h?.domainJourneyKey && h.domainJourneyKey !== "unknown") {
    sv.domainJourneyKey = h.domainJourneyKey;
  }
  return sv;
}

function mergeStepsAppliedDefault(): IntentLoopMergeStep[] {
  return ["classification", "domain", "role", "tenant", "turn"];
}

/**
 * Pure governance resolution: registry ∩ entitlements, fail-closed fallbacks, Zod validation.
 * No UI styling or execution-plane side effects.
 */
export function resolveIntentLoopState(input: ResolveIntentLoopInput): IntentLoopResolution {
  assertSiteConfigIdentity(input);

  const { siteRuntime, resolveResult, phaseAObservation, priorActiveViewId } = input;
  const stateVector = buildStateVector(phaseAObservation, siteRuntime);
  const mergeStepsApplied = mergeStepsAppliedDefault();
  const entitled = entitledRegisteredViewSet(siteRuntime);

  const auditNotes: string[] = [];
  let allowedCanvasViewIds: CanvasViewId[] | undefined;
  const proposed = resolveResult.selectedViewId;

  const fingerprint = JSON.stringify({
    tier: resolveResult.intentRouterTier,
    renderMode: resolveResult.renderMode,
    proposed,
    priorActiveViewId: priorActiveViewId ?? null,
    entitled: [...entitled].sort(),
  });
  const resolutionId = deterministicResolutionId({
    siteConfigId: input.siteConfigId,
    turnId: phaseAObservation.turnId,
    mergeFingerprint: fingerprint,
  });

  const push = (line: string) => {
    auditNotes.push(line);
  };

  // Fail-closed branches below use `pickFailClosedFallback` (same canonical policy order).

  // Tier router asked for disambiguation UX
  if (resolveResult.renderMode === "disambiguate") {
    const fb = pickFailClosedFallback(entitled);
    if (fb) {
      allowedCanvasViewIds = [fb];
      push(`clarify:router_disambiguation_mode`);
    } else {
      allowedCanvasViewIds = [];
      push(`deny:entitlement_no_disambiguation_or_fallback_view`);
    }
  } else if (proposed == null || proposed === "") {
    // Noop / no canvas change — unless we preserve an active entitled experience (avoid de-grounding)
    const prior = typeof priorActiveViewId === "string" ? priorActiveViewId.trim() : "";
    if (
      prior &&
      isRegisteredCanvasViewId(prior) &&
      entitled.has(prior as CanvasViewId)
    ) {
      allowedCanvasViewIds = [prior as CanvasViewId];
      push(`continuity:prior_view_preserved:${prior}`);
      push(`noop:tier_router_no_selected_view`);
      push(`noop:reason_${resolveResult.intentRouterTier ?? 0}`);
    } else {
      allowedCanvasViewIds = [];
      push(`noop:tier_router_no_selected_view`);
      push(`noop:reason_${resolveResult.intentRouterTier ?? 0}`);
    }
  } else if (!isRegisteredCanvasViewId(proposed)) {
    const fb = pickFailClosedFallback(entitled);
    if (fb) {
      allowedCanvasViewIds = [fb];
      push(`registry:blocked_non_registered_view:${proposed}`);
      push(`fallback:forced_${fb}`);
    } else {
      allowedCanvasViewIds = [];
      push(`registry:blocked_non_registered_view:${proposed}`);
      push(`deny:entitlement_no_fallback_surface`);
    }
  } else if (!entitled.has(proposed)) {
    const fb = pickFailClosedFallback(entitled);
    if (fb) {
      allowedCanvasViewIds = [fb];
      push(`deny:entitlement_view_not_in_plan:${proposed}`);
      push(`fallback:forced_${fb}`);
    } else {
      allowedCanvasViewIds = [];
      push(`deny:entitlement_view_not_in_plan:${proposed}`);
      push(`tenant:no_eligible_fallback_registered_view`);
    }
  } else {
    allowedCanvasViewIds = [proposed];
  }

  const raw: IntentLoopResolution = {
    contractVersion: INTENT_LOOP_CONTRACT_VERSION,
    resolutionId,
    stateVector,
    mergeStepsApplied,
    allowedCanvasViewIds,
    // Server-published allowlist for narration / syscall validation — not a grant for the client
    // to bypass `canvasDirectiveValidator` or invent powers. Phase C must keep execution gated.
    allowedActionIds: (() => {
      const merged = [
        ...(siteRuntime.entitlements.allowedCanvasActions ?? []),
        ...(siteRuntime.entitlements.allowedRuntimeActions ?? []),
      ];
      const uniq = [...new Set(merged)];
      return uniq.length > 0 ? uniq : undefined;
    })(),
    auditNotes: auditNotes.length > 0 ? auditNotes : undefined,
  };

  const validated = parseIntentLoopResolution(raw);
  if (!validated.success) {
    throw new Error(
      `intentLoopResolver: parseIntentLoopResolution failed: ${validated.error.issues.map((i) => i.path.join(".") + ":" + i.message).join("; ")}`,
    );
  }

  return validated.data;
}

/**
 * Apply Phase B resolution to the Tier-1/Tier-3 router result so HTTP clients and
 * `canvas.render` hydration follow **server** `allowedCanvasViewIds`, not a stale or
 * hallucinated `selectedViewId` from the router alone.
 */
export function mergeCanvasResolveWithIntentLoopResolution(
  resolveResult: CanvasResolveResult,
  resolution: IntentLoopResolution,
): CanvasResolveResult {
  const allowed = resolution.allowedCanvasViewIds;
  if (!allowed || allowed.length === 0) {
    return {
      ...resolveResult,
      selectedViewId: undefined,
      renderMode: "noop",
      // Router may have attached view-specific speech; do not narrate a canvas that will not render.
      speechContext: {
        screenSummary: "Canvas unchanged.",
        speakingInstructions:
          "Respond conversationally. Do not describe a canvas view or picker unless the user already sees it on screen.",
      },
    };
  }
  if (allowed.length === 1) {
    const forced = allowed[0];
    const router = resolveResult.selectedViewId;
    if (router && router !== forced) {
      return {
        ...resolveResult,
        selectedViewId: forced,
        renderMode: "replace",
        speechContext: {
          screenSummary: `Showing ${forced.replace(/_/g, " ")}.`,
          speakingInstructions: "Describe what is shown on screen and guide the user through the options.",
        },
      };
    }
    const base: CanvasResolveResult = {
      ...resolveResult,
      selectedViewId: forced,
    };
    // Router noop + empty selectedViewId but intent loop pinned prior view — replace de-grounding speech
    if (!router && resolveResult.renderMode === "noop") {
      return {
        ...base,
        speechContext: mergeGroundingForPreservedView(forced),
      };
    }
    return base;
  }
  const r = resolveResult.selectedViewId;
  const pick = r && allowed.includes(r) ? r : allowed[0];
  if (r && pick !== r) {
    return {
      ...resolveResult,
      selectedViewId: pick,
      speechContext: {
        screenSummary: `Showing ${pick.replace(/_/g, " ")}.`,
        speakingInstructions: "Describe what is shown on screen and guide the user through the options.",
      },
    };
  }
  return {
    ...resolveResult,
    selectedViewId: pick,
  };
}
