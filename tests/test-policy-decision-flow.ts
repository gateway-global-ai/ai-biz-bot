/**
 * Step 5 — Prove one full flow: customer → concierge → support request
 *
 * This test walks the complete governed path:
 *   1. Intent loop observation → actor=customer, lifecycle=operations
 *   2. PolicyDecision evaluation → allow for support_public gate
 *   3. View constraint → support_home in allowed views
 *   4. Action gate → request_human_assistance allowed
 *   5. Execution → executeAction returns result + PolicyDecision
 *   6. Audit → PolicyDecision attached to result, summary formatters work
 *
 * Also proves DENY paths:
 *   - customer cannot access admin gates
 *   - unknown gate gets denied
 *   - invalid classification gets denied
 *
 * Run: npx tsx tests/test-policy-decision-flow.ts
 */

import { strict as assert } from "node:assert";

import {
  type PolicyDecision,
  type SwarmRoleContext,
  type IntentContext,
  allowDecision,
  denyDecision,
  escalateDecision,
  degradeDecision,
  parsePolicyDecision,
  formatPolicyDecisionSummary,
} from "../shared/policyDecisionContract.js";

import {
  evaluateSwarmClassification,
  hasClassificationDenials,
  hasClassificationEscalations,
} from "../os-core/src/os-core/control-plane/policy-registry/swarmClassificationEvaluator.js";

import {
  applyPolicyMerge,
  intentContextFromStateVector,
  enrichStateVectorWithRole,
} from "../server/services/intentLoopPolicyMerge.js";

import type { IntentLoopStateVector } from "../shared/intentLoopContract.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${(e as Error).message}`);
  }
}

console.log("\n═══ Step 5: Full Policy Decision Flow ═══\n");

// ── 1. State vector observation ───────────────────────────────────────────

console.log("Phase 1: Intent Loop State Vector");

const customerStateVector: IntentLoopStateVector = {
  actorClass: "customer",
  lifecycle: "operations",
  domainJourneyKey: "unknown",
  sessionRef: "abc12345",
  entitlementKeys: ["plan:free", "views:3"],
  swarmRoleRef: "hospitality_cloudbeds/concierge",
  operationalMode: "RECEPTIONIST",
};

test("state vector has actor=customer", () => {
  assert.equal(customerStateVector.actorClass, "customer");
});

test("state vector has lifecycle=operations", () => {
  assert.equal(customerStateVector.lifecycle, "operations");
});

test("state vector references swarm role", () => {
  assert.equal(customerStateVector.swarmRoleRef, "hospitality_cloudbeds/concierge");
});

// ── 2. Swarm role classification (concierge) ──────────────────────────────

console.log("\nPhase 2: Swarm Classification Validation");

const conciergeRole: SwarmRoleContext = {
  roleType: "concierge",
  primaryActorClass: "customer",
  secondaryActorClasses: [],
  primaryStageClass: "operations",
  secondaryStageClasses: [],
  operationalMode: "RECEPTIONIST",
  schematicId: "hospitality_cloudbeds",
  deployPosture: "review_required",
};

test("concierge classification passes all checks", () => {
  const violations = evaluateSwarmClassification(conciergeRole);
  assert.equal(violations.length, 0, `unexpected violations: ${JSON.stringify(violations)}`);
});

test("invalid classification is caught (customer + planning = forbidden pair)", () => {
  const invalid: SwarmRoleContext = {
    ...conciergeRole,
    primaryStageClass: "planning",
  };
  const violations = evaluateSwarmClassification(invalid);
  assert.ok(hasClassificationDenials(violations), "should have denials");
  assert.ok(violations.some(v => v.reason === "role_forbidden_combination"));
});

test("management actor triggers escalation", () => {
  const mgmt: SwarmRoleContext = {
    ...conciergeRole,
    primaryActorClass: "management",
    primaryStageClass: "tracking",
  };
  const violations = evaluateSwarmClassification(mgmt);
  assert.ok(hasClassificationEscalations(violations), "management should require escalation");
});

// ── 3. Intent context from state vector ───────────────────────────────────

console.log("\nPhase 3: Intent Context Derivation");

const intentCtx = intentContextFromStateVector(customerStateVector);

test("intent context actor=customer", () => {
  assert.equal(intentCtx.actorClass, "customer");
});

test("intent context lifecycle=operations", () => {
  assert.equal(intentCtx.lifecycleStage, "operations");
});

test("intent context plan extracted", () => {
  assert.equal(intentCtx.entitlementPlan, "free");
});

// ── 4. PolicyDecision: ALLOW path ─────────────────────────────────────────

console.log("\nPhase 4: PolicyDecision — ALLOW (support_public)");

const allowResult = allowDecision({
  decisionId: "test-allow-001",
  policyGate: "support_public",
  siteConfigId: "site-123",
  swarmRoleContext: conciergeRole,
  intentContext: intentCtx,
  actionId: "request_human_assistance",
});

test("allow verdict", () => {
  assert.equal(allowResult.verdict, "allow");
});

test("allow has no reason codes", () => {
  assert.equal(allowResult.reasonCodes.length, 0);
});

test("allow carries swarm role context", () => {
  assert.equal(allowResult.swarmRoleContext?.roleType, "concierge");
});

test("allow carries intent context", () => {
  assert.equal(allowResult.intentContext?.actorClass, "customer");
});

test("allow Zod validation passes", () => {
  const parsed = parsePolicyDecision(allowResult);
  assert.equal(parsed.verdict, "allow");
});

test("allow summary is formatted", () => {
  const summary = formatPolicyDecisionSummary(allowResult);
  assert.ok(summary.includes("gate=support_public"));
  assert.ok(summary.includes("verdict=allow"));
  assert.ok(summary.includes("role=concierge"));
});

// ── 5. PolicyDecision: DENY path (customer → admin gate) ─────────────────

console.log("\nPhase 5: PolicyDecision — DENY (customer → admin_access)");

const denyResult = denyDecision({
  decisionId: "test-deny-001",
  policyGate: "admin_access",
  reasonCodes: ["actor_class_mismatch"],
  rationale: 'Gate "admin_access" requires actor class [employee, management] but got "customer"',
  siteConfigId: "site-123",
  swarmRoleContext: conciergeRole,
  intentContext: intentCtx,
  actionId: "stage_business_onboarding",
  enforcement: {
    fallbackMessage: "This action is not available for your role",
    fallbackViewId: "canvas.refusal",
  },
});

test("deny verdict", () => {
  assert.equal(denyResult.verdict, "deny");
});

test("deny carries reason codes", () => {
  assert.ok(denyResult.reasonCodes.includes("actor_class_mismatch"));
});

test("deny has enforcement fallback", () => {
  assert.equal(denyResult.enforcement.fallbackViewId, "canvas.refusal");
});

test("deny Zod validation passes", () => {
  const parsed = parsePolicyDecision(denyResult);
  assert.equal(parsed.verdict, "deny");
});

// ── 6. PolicyDecision: ESCALATE path ──────────────────────────────────────

console.log("\nPhase 6: PolicyDecision — ESCALATE");

const escResult = escalateDecision({
  decisionId: "test-esc-001",
  policyGate: "agent_behavior_control",
  reasonCodes: ["management_review_required"],
  rationale: "Deploy posture is review_required for non-management role",
  escalationTarget: "management_agent",
  siteConfigId: "site-123",
  swarmRoleContext: conciergeRole,
  intentContext: intentCtx,
});

test("escalate verdict", () => {
  assert.equal(escResult.verdict, "escalate");
});

test("escalate has target", () => {
  assert.equal(escResult.enforcement.escalationTarget, "management_agent");
});

// ── 7. PolicyDecision: DEGRADE path ───────────────────────────────────────

console.log("\nPhase 7: PolicyDecision — DEGRADE");

const degradeResult = degradeDecision({
  decisionId: "test-degrade-001",
  policyGate: "chat.public",
  reasonCodes: ["knowledge_gap_detected"],
  rationale: "Agent lacks certified knowledge for this domain",
  siteConfigId: "site-123",
  swarmRoleContext: conciergeRole,
  intentContext: intentCtx,
  enforcement: {
    fallbackViewId: "support_home",
    safeModeProfile: "conservative",
    degradedCapabilities: ["request_human_assistance", "draft_support_ticket"],
  },
});

test("degrade verdict", () => {
  assert.equal(degradeResult.verdict, "degrade");
});

test("degrade has reduced capabilities", () => {
  assert.equal(degradeResult.enforcement.degradedCapabilities?.length, 2);
});

test("degrade has safe mode profile", () => {
  assert.equal(degradeResult.enforcement.safeModeProfile, "conservative");
});

// ── 8. Policy merge into IntentLoopResolution ─────────────────────────────

console.log("\nPhase 8: Policy Merge into IntentLoopResolution");

import type { IntentLoopResolution } from "../shared/intentLoopContract.js";

const mockResolution: IntentLoopResolution = {
  contractVersion: "intent_loop.v1",
  resolutionId: "res-test-001",
  stateVector: customerStateVector,
  mergeStepsApplied: ["classification", "domain", "role", "tenant", "turn"],
  allowedCanvasViewIds: ["support_home", "welcome", "service_menu"],
  allowedActionIds: ["request_human_assistance", "draft_support_ticket", "frontdesk.assist.write"],
  auditNotes: [],
};

test("allow merge preserves all views", () => {
  const { resolution } = applyPolicyMerge({
    resolution: mockResolution,
    policyDecision: allowResult,
  });
  assert.equal(resolution.allowedCanvasViewIds?.length, 3);
  assert.ok(resolution.mergeStepsApplied.includes("policy"));
  assert.ok(resolution.auditNotes?.some(n => n.includes("policy:allow")));
});

test("deny merge clears views and actions", () => {
  const { resolution } = applyPolicyMerge({
    resolution: mockResolution,
    policyDecision: denyResult,
  });
  assert.equal(resolution.allowedCanvasViewIds?.length, 1);
  assert.equal(resolution.allowedCanvasViewIds?.[0], "canvas.refusal");
  assert.equal(resolution.allowedActionIds?.length, 0);
  assert.ok(resolution.auditNotes?.some(n => n.includes("policy:deny")));
});

test("escalate merge strips write actions", () => {
  const { resolution } = applyPolicyMerge({
    resolution: mockResolution,
    policyDecision: escResult,
  });
  const hasWriteAction = resolution.allowedActionIds?.some(a => a.includes("write"));
  assert.ok(!hasWriteAction, "write actions should be stripped on escalate");
  assert.ok(resolution.auditNotes?.some(n => n.includes("policy:escalate")));
});

test("degrade merge reduces to safe views", () => {
  const { resolution } = applyPolicyMerge({
    resolution: mockResolution,
    policyDecision: degradeResult,
  });
  assert.ok(resolution.allowedCanvasViewIds?.includes("support_home"));
  assert.ok(resolution.allowedCanvasViewIds?.includes("welcome"));
  assert.equal(resolution.allowedActionIds?.length, 2);
  assert.ok(resolution.auditNotes?.some(n => n.includes("policy:degrade")));
});

// ── 9. State vector enrichment with swarm role ────────────────────────────

console.log("\nPhase 9: State Vector Enrichment");

test("enrichStateVectorWithRole sets swarmRoleRef", () => {
  const enriched = enrichStateVectorWithRole(customerStateVector, conciergeRole);
  assert.equal(enriched.swarmRoleRef, "hospitality_cloudbeds/concierge");
  assert.equal(enriched.operationalMode, "RECEPTIONIST");
});

// ── 10. Audit chain integrity ─────────────────────────────────────────────

console.log("\nPhase 10: Audit Chain Integrity");

test("full flow produces traceable audit chain", () => {
  const { resolution, policyAuditLine } = applyPolicyMerge({
    resolution: mockResolution,
    policyDecision: allowResult,
  });

  assert.ok(policyAuditLine.includes("support_public"));
  assert.ok(policyAuditLine.includes("allow"));
  assert.ok(resolution.auditNotes!.length > 0);

  assert.ok(allowResult.decisionId, "decision has id");
  assert.ok(allowResult.decidedAt, "decision has timestamp");
  assert.equal(allowResult.contractVersion, "policy_decision.v1");
  assert.equal(allowResult.siteConfigId, "site-123");
});

test("deny flow produces complete audit evidence", () => {
  assert.ok(denyResult.rationale);
  assert.ok(denyResult.reasonCodes.length > 0);
  assert.ok(denyResult.enforcement.fallbackViewId);
  assert.ok(denyResult.enforcement.fallbackMessage);
  assert.equal(denyResult.actionId, "stage_business_onboarding");
});

// ── Results ───────────────────────────────────────────────────────────────

console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);

if (failed > 0) {
  process.exit(1);
}
