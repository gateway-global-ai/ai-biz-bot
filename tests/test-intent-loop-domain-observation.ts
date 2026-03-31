/**
 * Intent loop Phase B3 — domain journey from allowlisted PMS snapshot only.
 * Run: npx tsx tests/test-intent-loop-domain-observation.ts
 */
import { resolveIntentLoopDomainObservation } from "../server/services/intentLoopDomainObservation.js";
import type { VisitorSessionSecurityProbe } from "../server/services/canvasDirectiveValidator.js";
import type { IntentLoopDomainSnapshotV1 } from "../server/services/intentLoopDomainSnapshot.js";
import { parseIntentLoopDomainSnapshotFromBuyerJourney } from "../server/services/intentLoopDomainSnapshot.js";
import { formatIntentLoopResolutionSummary } from "../shared/intentLoopContract.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function probe(partial: Partial<VisitorSessionSecurityProbe>): VisitorSessionSecurityProbe {
  return {
    sessionRowFound: false,
    rawDbSecurityLevel: null,
    ...partial,
  };
}

function snap(k: IntentLoopDomainSnapshotV1["domainJourneyKey"]): IntentLoopDomainSnapshotV1 {
  return {
    domainJourneyKey: k,
    evidence: "pms_guest_journey_v1",
    confidence: 0.9,
    recordedAt: "2026-03-27T00:00:00.000Z",
  };
}

function main(): void {
  assert(parseIntentLoopDomainSnapshotFromBuyerJourney(null) === null, "null buyer journey");
  assert(
    parseIntentLoopDomainSnapshotFromBuyerJourney({
      phase: "activation",
      intent_loop_domain_v1: { domainJourneyKey: "in_house", evidence: "pms_guest_journey_v1", confidence: 0.5 },
    })?.domainJourneyKey === "in_house",
    "parse nested snapshot beside buyer phase (L)",
  );
  assert(
    parseIntentLoopDomainSnapshotFromBuyerJourney({
      intent_loop_domain_v1: { domainJourneyKey: "in_house", evidence: "wrong_literal", confidence: 0.5 },
    }) === null,
    "reject wrong evidence literal",
  );

  const rUnknown = resolveIntentLoopDomainObservation({
    visitorSessionProbe: probe({
      sessionRowFound: true,
      rawDbSecurityLevel: "anonymous",
      buyerJourneyPhase: "activation",
    }),
  });
  assert(rUnknown.domainJourneyKey === "unknown", "buyer phase (L) without PMS snapshot → unknown");
  assert(rUnknown.domainSource === "unknown", "no snapshot → unknown source");
  assert(rUnknown.domainReasonCodes.includes("domain_unknown"), "domain_unknown code");

  const rClaimed = resolveIntentLoopDomainObservation({
    visitorSessionProbe: probe({
      sessionRowFound: true,
      buyerJourneyPhase: "trial",
    }),
  });
  assert(rClaimed.domainJourneyKey === "unknown", "session row without snapshot → unknown (not workspace/L)");

  const rInHouse = resolveIntentLoopDomainObservation({
    visitorSessionProbe: probe({
      sessionRowFound: true,
      buyerJourneyPhase: "activation",
      intentLoopDomainSnapshot: snap("in_house"),
    }),
  });
  assert(rInHouse.domainJourneyKey === "in_house", "trusted PMS snapshot wins over buyer phase");
  assert(rInHouse.domainSource === "pms_guest_journey_snapshot_v1", "snapshot source");
  assert(rInHouse.domainReasonCodes.includes("domain_from_pms_guest_journey_v1"), "domain_from code");
  assert(!rInHouse.domainReasonCodes.includes("domain_unknown"), "no domain_unknown when snapshot");

  const rUpcoming = resolveIntentLoopDomainObservation({
    visitorSessionProbe: probe({
      intentLoopDomainSnapshot: snap("upcoming_stay"),
    }),
  });
  assert(rUpcoming.domainJourneyKey === "upcoming_stay", "upcoming stay from evidence");

  const line = formatIntentLoopResolutionSummary({
    stateVectorHints: {
      domainJourneyKey: "in_house",
      lifecycleStage: "operations",
    },
    routingHints: { canvasRouterTier: 1, selectedViewId: "welcome", renderMode: "replace" },
  });
  assert(line.includes("dj=in_house"), "resolution summary carries dj=");
  const lineUnk = formatIntentLoopResolutionSummary({
    stateVectorHints: { domainJourneyKey: "unknown", lifecycleStage: "operations" },
    routingHints: {},
  });
  assert(lineUnk.includes("dj=unknown"), "explicit unknown in summary");

  console.log("[test-intent-loop-domain-observation] ok");
}

main();
