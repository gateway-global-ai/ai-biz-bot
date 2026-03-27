/**
 * Smoke checks for PPP shadow heuristics (no DB). Run: npx tsx tests/test-ppp-shadow-validator.ts
 */
import { analyzePppShadow, skippedPppShadowScore } from "../server/services/pppShadowValidator";
import { parseCommunicationGovernance } from "../shared/conversationGrounding";

const govDefault = parseCommunicationGovernance({});

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const rich =
  "To hit your goal of more bookings, we can start with online scheduling this week. When would you like that live — by Friday, or next Monday?";

const s1 = analyzePppShadow(rich, {
  operationalMode: "CONCIERGE",
  pppEngagement: govDefault.pppEngagement,
});
assert(s1.compositeScore >= 75, "expected high composite on rich example");
assert(!s1.skipped, "not skipped");

const s2 = analyzePppShadow("ok", {
  operationalMode: "CONCIERGE",
  pppEngagement: govDefault.pppEngagement,
});
assert(s2.isViolation, "short reply should violate threshold");

const s3 = analyzePppShadow("anything", {
  operationalMode: "EMERGENCY",
  pppEngagement: govDefault.pppEngagement,
});
assert(s3.skipped === true && s3.skippedReason === "urgent_minimal", "emergency skips");

const s4 = skippedPppShadowScore("platform_landing");
assert(s4.skippedReason === "platform_landing", "platform skip");

console.log("ppp-shadow-validator smoke: ok");
