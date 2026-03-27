/**
 * Voice Concierge aptitude — chat-side PPP shadow + ARCH envelope heuristics (no DB, no Live WS).
 * Run: npm run test:voice-concierge-aptitude
 */
import { analyzePppShadow } from "../server/services/pppShadowValidator";
import { parseCommunicationGovernance } from "../shared/conversationGrounding";
import { hasHandoffCue, validateArchEnvelope } from "../server/services/archEnvelopeValidator";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const govVoiceConcierge = parseCommunicationGovernance({
  disclosurePolicyId: "contextual",
  principalOfRecord: "customer",
  pppEngagement: { enabled: true, mode: "sales_emphasis" },
});

// --- PPP shadow (sales_emphasis threshold 75) ---
const richPlatform =
  "Your goal is clearer routing for every location. Here is the plan: first we map ingress, then we pilot one region. Would you like to start this week or next Monday?";

const p1 = analyzePppShadow(richPlatform, {
  operationalMode: "CONCIERGE",
  pppEngagement: govVoiceConcierge.pppEngagement,
});
assert(p1.compositeScore >= 75, "expected high composite for Voice Concierge rich reply");
assert(!p1.isViolation, "rich reply should not violate sales_emphasis threshold");

const thin = "We help businesses.";
const p2 = analyzePppShadow(thin, {
  operationalMode: "CONCIERGE",
  pppEngagement: govVoiceConcierge.pppEngagement,
});
assert(p2.isViolation, "thin reply should violate sales_emphasis threshold");

// --- ARCH: Nova profile uses handoff 90 — require next-step cue ---
const archHigh = { acknowledge: 70, reflect: 55, context: 85, handoff: 90 };
const goodClose =
  "Gateway Global AI routes customer contact through one governed ingress. I can outline pricing or QR setup — which would you like to explore first?";
const v1 = validateArchEnvelope(goodClose, {
  operationalMode: "CONCIERGE",
  archProfile: archHigh,
});
assert(v1.ok, `expected handoff ok: ${v1.violations.join(", ")}`);
assert(hasHandoffCue(goodClose), "goodClose should have handoff cue");

const badClose = "Gateway Global AI is infrastructure for voice and SMS.";
const v2 = validateArchEnvelope(badClose, {
  operationalMode: "CONCIERGE",
  archProfile: archHigh,
});
assert(!v2.ok && v2.violations.includes("missing_handoff_or_next_step"), "expected missing handoff with high handoff slider");

console.log("voice-concierge-aptitude-scenarios: ok");
