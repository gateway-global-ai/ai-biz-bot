/**
 * Sub-agent C — server authority on canvas.resolve: router output vs merged final view.
 * Run: npx tsx tests/test-canvas-control-resolve-authority.ts
 *
 * Proves: when Phase B allows only B, merge forces result.selectedViewId === B even if
 * the Tier-1 router returned A (client cannot widen `allowedCanvasViewIds`).
 */
import { mergeCanvasResolveWithIntentLoopResolution } from "../server/services/intentLoopResolver.js";
import type { CanvasResolveResult } from "../shared/canvasViewContract.js";
import {
  INTENT_LOOP_CONTRACT_VERSION,
  type IntentLoopResolution,
} from "../shared/intentLoopContract.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function run(): void {
  const routerA: CanvasResolveResult = {
    selectedViewId: "welcome",
    renderMode: "replace",
    reason: "Tier 1 matched",
    intentRouterTier: 1,
  };

  const resolutionOnlyB: IntentLoopResolution = {
    contractVersion: INTENT_LOOP_CONTRACT_VERSION,
    resolutionId: "proof-1",
    stateVector: {},
    mergeStepsApplied: ["classification", "domain", "role", "tenant", "turn"],
    allowedCanvasViewIds: ["service_menu"],
    auditNotes: ["synthetic:router_A_resolver_B_for_test"],
  };

  const merged = mergeCanvasResolveWithIntentLoopResolution(routerA, resolutionOnlyB);
  assert(merged.selectedViewId === "service_menu", "final view must be resolver-allowed B, not router A");
  assert(merged.selectedViewId !== routerA.selectedViewId, "must differ from router when policy forces B");

  const noopMerge = mergeCanvasResolveWithIntentLoopResolution(routerA, {
    ...resolutionOnlyB,
    allowedCanvasViewIds: [],
    auditNotes: ["deny:test"],
  });
  assert(
    noopMerge.renderMode === "noop" && noopMerge.selectedViewId === undefined,
    "empty allowed → noop; client must not substitute another view",
  );

  // Hallucinated / non-registered router id → Phase B fail-closed to single fallback surface
  const routerHallucinated: CanvasResolveResult = {
    selectedViewId: "not_a_registered_view",
    renderMode: "replace",
    reason: "Tier 2 untrusted",
    intentRouterTier: 2,
  };
  const resolutionFallbackDisambig: IntentLoopResolution = {
    contractVersion: INTENT_LOOP_CONTRACT_VERSION,
    resolutionId: "proof-fallback",
    stateVector: {},
    mergeStepsApplied: ["classification", "domain", "role", "tenant", "turn"],
    allowedCanvasViewIds: ["disambiguation_menu"],
    auditNotes: ["registry:blocked_non_registered_view:not_a_registered_view", "fallback:forced_disambiguation_menu"],
  };
  const mergedFallback = mergeCanvasResolveWithIntentLoopResolution(
    routerHallucinated,
    resolutionFallbackDisambig,
  );
  assert(
    mergedFallback.selectedViewId === "disambiguation_menu",
    "final view equals resolver fallback, not router hallucination",
  );

  console.log("test-canvas-control-resolve-authority: OK");
}

run();
