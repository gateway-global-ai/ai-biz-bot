/**
 * Intent loop Phase B2 — lifecycle observation from site + allowlisted buyer_journey.phase.
 * Run: npx tsx tests/test-intent-loop-lifecycle-observation.ts
 */
import { resolveIntentLoopLifecycleObservation } from "../server/services/intentLoopLifecycleObservation.js";
import type { SiteRuntimeContext } from "../shared/siteRuntimeContext.js";
import type { VisitorSessionSecurityProbe } from "../server/services/canvasDirectiveValidator.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function miniSite(identity: Partial<SiteRuntimeContext["identity"]>): SiteRuntimeContext {
  return {
    identity: {
      siteConfigId: "test-site",
      ownerId: null,
      slug: null,
      workspaceState: "demo",
      claimStatus: "unclaimed",
      ...identity,
    },
  } as SiteRuntimeContext;
}

function probe(partial: Partial<VisitorSessionSecurityProbe>): VisitorSessionSecurityProbe {
  return {
    sessionRowFound: false,
    rawDbSecurityLevel: null,
    ...partial,
  };
}

function main(): void {
  const r1 = resolveIntentLoopLifecycleObservation({
    siteRuntime: miniSite({ workspaceState: "demo", claimStatus: "unclaimed" }),
    actorClass: "unknown",
    visitorSessionProbe: probe({}),
  });
  assert(r1.lifecycleStage === "onboarding", "unclaimed → onboarding");
  assert(r1.lifecycleSource === "site_runtime", "site source");
  assert(r1.lifecycleReasonCodes.includes("lifecycle_from_site_workspace"), "code site");

  const r2 = resolveIntentLoopLifecycleObservation({
    siteRuntime: miniSite({ workspaceState: "active", claimStatus: "claimed" }),
    actorClass: "customer",
    visitorSessionProbe: probe({
      sessionRowFound: true,
      rawDbSecurityLevel: "anonymous",
      buyerJourneyPhase: "activation",
    }),
  });
  assert(r2.lifecycleStage === "operations", "buyer activation → operations");
  assert(r2.lifecycleSource === "session", "buyer journey wins for customer");
  assert(r2.lifecycleReasonCodes.includes("lifecycle_from_buyer_journey"), "code buyer");

  const r3 = resolveIntentLoopLifecycleObservation({
    siteRuntime: miniSite({ workspaceState: "active", claimStatus: "claimed" }),
    actorClass: "employee",
    visitorSessionProbe: probe({
      sessionRowFound: true,
      buyerJourneyPhase: "awareness",
    }),
  });
  assert(r3.lifecycleStage === "operations", "employee ignores buyer journey");
  assert(r3.lifecycleSource === "site_runtime", "employee site only");

  const r4 = resolveIntentLoopLifecycleObservation({
    siteRuntime: miniSite({ workspaceState: "active", claimStatus: "claimed" }),
    actorClass: "management",
    visitorSessionProbe: probe({ sessionRowFound: true }),
  });
  assert(r4.lifecycleStage === "unknown", "management L deferred");
  assert(r4.managementControlStage === "unknown", "mgmt control unknown");
  assert(r4.lifecycleReasonCodes.includes("lifecycle_unknown"), "mgmt unknown code");

  const r5 = resolveIntentLoopLifecycleObservation({
    siteRuntime: miniSite({ workspaceState: "archived", claimStatus: "claimed" }),
    actorClass: "customer",
    visitorSessionProbe: probe({}),
  });
  assert(r5.lifecycleStage === "retention", "archived tenant");

  console.log("[test-intent-loop-lifecycle-observation] ok");
}

main();
