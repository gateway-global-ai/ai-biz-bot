import assert from "node:assert/strict";

import {
  derivePolicyForScopes,
  evaluateOutcomePolicy,
} from "../server/services/domainPolicyEvaluator.js";

function main(): void {
  const policy = derivePolicyForScopes(["canvas_scope", "verification_scope"]);
  assert.equal(policy.approvalTier, "tier2");
  assert(policy.requiredReviewGates.includes("platform_review"));
  assert(policy.authorizedDomains.includes("canvas_control"));

  const evaluation = evaluateOutcomePolicy({
    scopeKeys: ["voice_scope"],
    filesTouched: [{ path: "server/geminiVoice.ts", changeType: "modified" }],
    existingDomainsTouched: [],
    checksRun: [{ cmd: "npm run test:voice-concierge-aptitude", status: "passed" }],
    reviewReady: true,
  });

  assert.equal(evaluation.approvalTier, "tier3");
  assert(evaluation.domainsTouched.includes("voice_runtime"));
  assert(evaluation.requiredGates.includes("tier3_review"));
  assert(evaluation.requiredReviewers.includes("voice"));
}

main();
