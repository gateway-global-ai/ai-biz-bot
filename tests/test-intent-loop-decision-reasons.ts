/**
 * Intent loop — routing/workspace reason codes merged with actor + lifecycle codes.
 * Run: npx tsx tests/test-intent-loop-decision-reasons.ts
 */
import { buildIntentLoopDecisionReasonCodes } from "../server/services/intentLoopObservation.js";
import { resolveIntentLoopActorObservation } from "../server/services/intentLoopActorObservation.js";
import { resolveIntentLoopLifecycleObservation } from "../server/services/intentLoopLifecycleObservation.js";
import { resolveIntentLoopDomainObservation } from "../server/services/intentLoopDomainObservation.js";
import type { SiteRuntimeContext } from "../shared/siteRuntimeContext.js";

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

function main(): void {
  const site = miniSite({ workspaceState: "demo", claimStatus: "unclaimed" });
  const actorPublic = resolveIntentLoopActorObservation({
    resolvedSecurity: { securityLevel: "public", authState: "anonymous" },
    visitorIdPresent: false,
    visitorSessionProbe: { sessionRowFound: false, rawDbSecurityLevel: null },
    envelopeSecurityLevel: "public",
  });
  const life = resolveIntentLoopLifecycleObservation({
    siteRuntime: site,
    actorClass: actorPublic.actorClass,
    visitorSessionProbe: { sessionRowFound: false, rawDbSecurityLevel: null },
  });
  const domain = resolveIntentLoopDomainObservation({
    visitorSessionProbe: { sessionRowFound: false, rawDbSecurityLevel: null },
  });

  const tier1 = buildIntentLoopDecisionReasonCodes({
    resolveResult: {
      renderMode: "replace",
      reason: "t1",
      intentRouterTier: 1,
      selectedViewId: "service_menu",
    },
    visitorIdPresent: false,
    siteRuntime: site,
    actorReasonCodes: actorPublic.actorReasonCodes,
    lifecycleReasonCodes: life.lifecycleReasonCodes,
    domainReasonCodes: domain.domainReasonCodes,
  });
  assert(tier1.includes("keyword_match"), "tier 1 → keyword_match");
  assert(tier1.includes("actor_unknown"), "no visitor → actor_unknown");
  assert(tier1.includes("lifecycle_from_site_workspace"), "demo unclaimed → site L");
  assert(!tier1.includes("actor_inferred_customer"), "retired placeholder");
  assert(tier1.includes("domain_unknown"), "domain unknown");

  const actorAdmin = resolveIntentLoopActorObservation({
    resolvedSecurity: { securityLevel: "admin", authState: "authenticated" },
    visitorIdPresent: true,
    visitorSessionProbe: { sessionRowFound: true, rawDbSecurityLevel: "admin" },
    envelopeSecurityLevel: "admin",
  });
  const lifeMgmt = resolveIntentLoopLifecycleObservation({
    siteRuntime: miniSite({ workspaceState: "active", claimStatus: "claimed" }),
    actorClass: actorAdmin.actorClass,
    visitorSessionProbe: { sessionRowFound: true, rawDbSecurityLevel: "admin" },
  });
  const domainMgmt = resolveIntentLoopDomainObservation({
    visitorSessionProbe: { sessionRowFound: true, rawDbSecurityLevel: "admin" },
  });

  const tier3 = buildIntentLoopDecisionReasonCodes({
    resolveResult: { renderMode: "noop", reason: "t3", intentRouterTier: 3 },
    visitorIdPresent: true,
    siteRuntime: miniSite({ workspaceState: "active", claimStatus: "claimed" }),
    actorReasonCodes: actorAdmin.actorReasonCodes,
    lifecycleReasonCodes: lifeMgmt.lifecycleReasonCodes,
    domainReasonCodes: domainMgmt.domainReasonCodes,
  });
  assert(tier3.includes("fallback_tier_3"), "tier 3");
  assert(tier3.includes("security_gate"), "visitor → security_gate");
  assert(tier3.includes("workspace_claim_detected"), "active + claimed");
  assert(tier3.includes("actor_from_security_context"), "admin actor");
  assert(tier3.includes("lifecycle_unknown"), "management lifecycle deferred");

  const disamb = buildIntentLoopDecisionReasonCodes({
    resolveResult: {
      renderMode: "disambiguate",
      reason: "t2",
      intentRouterTier: 2,
    },
    visitorIdPresent: false,
    siteRuntime: site,
    actorReasonCodes: actorPublic.actorReasonCodes,
    lifecycleReasonCodes: life.lifecycleReasonCodes,
    domainReasonCodes: domain.domainReasonCodes,
  });
  assert(disamb.includes("tier2_inference"), "tier 2");
  assert(disamb.includes("disambiguation_branch"), "disambiguate mode");

  console.log("[test-intent-loop-decision-reasons] ok");
}

main();
