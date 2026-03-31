/**
 * IntentLoopResolver (Phase B) — deterministic governance resolution.
 * Run: npx tsx tests/test-intent-loop-resolver.ts
 */
import {
  mergeCanvasResolveWithIntentLoopResolution,
  resolveIntentLoopState,
} from "../server/services/intentLoopResolver.js";
import type { CanvasResolveResult } from "../shared/canvasViewContract.js";
import {
  INTENT_LOOP_CONTRACT_VERSION,
  type IntentLoopPhaseAObservation,
  type IntentLoopResolution,
} from "../shared/intentLoopContract.js";
import type { SiteRuntimeContext } from "../shared/siteRuntimeContext.js";
import { assertResolutionForSurfaceDerivation } from "../shared/intentLoopResolutionSchema.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const SITE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function baseSiteRuntime(allowedCanvasViews: string[]): SiteRuntimeContext {
  return {
    identity: {
      siteConfigId: SITE_ID,
      ownerId: null,
      slug: "demo",
      workspaceState: "claimed",
      claimStatus: "claimed",
    },
    business: {
      name: "Test",
      businessType: "hospitality",
      serviceMenu: [],
      faqs: [],
      taskOrder: [],
      staticRoutes: {},
    },
    ai: {
      modelProvider: "gemini",
      knowledgeLibrary: [],
    },
    entitlements: {
      plan: "pro",
      voicePlanActive: true,
      enabledSkills: ["x"],
      allowedCanvasViews,
      allowedCanvasActions: ["nav_home"],
      allowedRuntimeActions: [],
    },
  };
}

function basePhaseA(): IntentLoopPhaseAObservation {
  return {
    event: "intent_loop.phase_a",
    contractVersion: INTENT_LOOP_CONTRACT_VERSION,
    syscallId: "11111111-1111-1111-1111-111111111111",
    turnId: "turn-fixed-1",
    siteConfigId: SITE_ID,
    sessionRef: "abcdef…",
    signalSources: ["site_runtime", "canvas_intent_router"],
    stateVectorHints: {
      actorClass: "customer",
      lifecycleStage: "operations",
      domainJourneyKey: "unknown",
      entitlementPlan: "pro",
    },
  };
}

function run(): void {
  const sr = baseSiteRuntime([
    "welcome",
    "service_menu",
    "disambiguation_menu",
    "support_home",
    "faq_list",
  ]);
  const phaseA = basePhaseA();

  const r1: CanvasResolveResult = {
    selectedViewId: "service_menu",
    renderMode: "replace",
    intentRouterTier: 1,
    reason: "tier1",
  };
  const out1 = resolveIntentLoopState({
    siteConfigId: SITE_ID,
    siteRuntime: sr,
    resolveResult: r1,
    phaseAObservation: phaseA,
  });
  assert(out1.allowedCanvasViewIds?.[0] === "service_menu", "entitled tier1 view");
  assert(out1.resolutionId === out1.resolutionId, "resolution id stable ref");
  const out1b = resolveIntentLoopState({
    siteConfigId: SITE_ID,
    siteRuntime: sr,
    resolveResult: r1,
    phaseAObservation: phaseA,
  });
  assert(out1.resolutionId === out1b.resolutionId, "deterministic resolutionId");

  const rFake: CanvasResolveResult = {
    selectedViewId: "not_a_real_view_id",
    renderMode: "replace",
    intentRouterTier: 2,
    reason: "bad llama",
  };
  const outFake = resolveIntentLoopState({
    siteConfigId: SITE_ID,
    siteRuntime: sr,
    resolveResult: rFake,
    phaseAObservation: phaseA,
  });
  assert(outFake.allowedCanvasViewIds?.[0] === "disambiguation_menu", "hallucination → disambiguation_menu");
  assert(
    outFake.auditNotes?.some((n) => n.startsWith("registry:blocked_non_registered_view:")),
    "registry audit line",
  );

  const srNoFallback = baseSiteRuntime(["faq_list"]);
  const outNo = resolveIntentLoopState({
    siteConfigId: SITE_ID,
    siteRuntime: srNoFallback,
    resolveResult: {
      selectedViewId: "welcome",
      renderMode: "replace",
      intentRouterTier: 1,
      reason: "x",
    },
    phaseAObservation: phaseA,
  });
  assert(
    (outNo.allowedCanvasViewIds?.length ?? 0) === 0,
    "no entitled fallback",
  );
  assert(outNo.auditNotes?.some((l) => l.startsWith("deny:")), "deny audit when empty views");
  assertResolutionForSurfaceDerivation(outNo);

  // Hallucinated / non-registered view + none of INTENT_LOOP_FAIL_CLOSED_FALLBACK_VIEW_IDS entitled
  const srFallbackExhausted = baseSiteRuntime(["faq_list"]);
  const outHallucNoFallback = resolveIntentLoopState({
    siteConfigId: SITE_ID,
    siteRuntime: srFallbackExhausted,
    resolveResult: {
      selectedViewId: "totally_fake_view",
      renderMode: "replace",
      intentRouterTier: 2,
      reason: "bad",
    },
    phaseAObservation: phaseA,
  });
  assert(
    (outHallucNoFallback.allowedCanvasViewIds?.length ?? 0) === 0,
    "hallucination with no entitled fail-closed surface → empty views",
  );
  assert(
    outHallucNoFallback.auditNotes?.some((l) => l.startsWith("registry:blocked_non_registered_view:")),
    "registry audit when hallucinated",
  );
  assert(
    outHallucNoFallback.auditNotes?.some((l) => l.startsWith("deny:entitlement_no_fallback_surface")),
    "deny when fallback tuple exhausted for tenant",
  );
  assertResolutionForSurfaceDerivation(outHallucNoFallback);

  const noop = resolveIntentLoopState({
    siteConfigId: SITE_ID,
    siteRuntime: sr,
    resolveResult: {
      renderMode: "noop",
      intentRouterTier: 3,
      reason: "tier3",
    },
    phaseAObservation: phaseA,
  });
  assert(noop.allowedCanvasViewIds?.length === 0, "noop empty views");
  assert(noop.auditNotes?.some((l) => l.startsWith("noop:")), "noop audit");
  assertResolutionForSurfaceDerivation(noop);

  const srBg = baseSiteRuntime([
    "welcome",
    "service_menu",
    "canvas_backgrounds",
    "disambiguation_menu",
    "support_home",
    "faq_list",
  ]);
  const noopPrior = resolveIntentLoopState({
    siteConfigId: SITE_ID,
    siteRuntime: srBg,
    resolveResult: {
      renderMode: "noop",
      intentRouterTier: 3,
      reason: "tier3",
    },
    phaseAObservation: phaseA,
    priorActiveViewId: "canvas_backgrounds",
  });
  assert(noopPrior.allowedCanvasViewIds?.length === 1, "noop + prior entitled → pinned allowlist");
  assert(noopPrior.allowedCanvasViewIds?.[0] === "canvas_backgrounds", "pinned view id");
  assert(
    noopPrior.auditNotes?.some((l) => String(l).startsWith("continuity:prior_view_preserved")),
    "continuity audit line",
  );
  const mergedPrior = mergeCanvasResolveWithIntentLoopResolution(
    { renderMode: "noop", intentRouterTier: 3, reason: "tier3" },
    noopPrior,
  );
  assert(mergedPrior.selectedViewId === "canvas_backgrounds", "merge restores selectedViewId");
  assert(
    (mergedPrior.speechContext?.speakingInstructions ?? "").toLowerCase().includes("background"),
    "merge replaces tier-3 de-grounding speech when prior view preserved",
  );

  let threw = false;
  try {
    resolveIntentLoopState({
      siteConfigId: "wrong-id",
      siteRuntime: sr,
      resolveResult: r1,
      phaseAObservation: phaseA,
    });
  } catch {
    threw = true;
  }
  assert(threw, "identity mismatch throws");

  const resMerge: IntentLoopResolution = {
    contractVersion: INTENT_LOOP_CONTRACT_VERSION,
    resolutionId: "x",
    stateVector: {},
    mergeStepsApplied: ["tenant"],
    allowedCanvasViewIds: ["disambiguation_menu"],
  };
  const m1 = mergeCanvasResolveWithIntentLoopResolution(
    { selectedViewId: "fake", renderMode: "replace", reason: "r" },
    resMerge,
  );
  assert(m1.selectedViewId === "disambiguation_menu", "merge forces single allowed view");

  const mEmpty = mergeCanvasResolveWithIntentLoopResolution(
    { selectedViewId: "welcome", renderMode: "replace", reason: "r" },
    {
      ...resMerge,
      allowedCanvasViewIds: [],
      auditNotes: ["noop:x"],
    },
  );
  assert(mEmpty.renderMode === "noop" && mEmpty.selectedViewId === undefined, "merge empty → noop");

  console.log("test-intent-loop-resolver: OK");
}

run();
