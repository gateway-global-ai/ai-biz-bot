/**
 * Intent loop merge gate — Zod + fail-closed policy for IntentLoopResolution.
 * Run: npx tsx tests/test-intent-loop-resolution-schema.ts
 */
import {
  assertResolutionForSurfaceDerivation,
  INTENT_LOOP_FAIL_CLOSED_FALLBACK_VIEW_IDS,
  parseIntentLoopResolution,
} from "../shared/intentLoopResolutionSchema.js";
import { INTENT_LOOP_CONTRACT_VERSION } from "../shared/intentLoopContract.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const minimalResolution = {
  contractVersion: INTENT_LOOP_CONTRACT_VERSION,
  resolutionId: "res-test-1",
  stateVector: {},
  mergeStepsApplied: ["classification" as const],
};

function run(): void {
  const bad = parseIntentLoopResolution({ foo: 1 });
  assert(bad.success === false, "invalid input should fail parse");

  const ok = parseIntentLoopResolution({
    ...minimalResolution,
    allowedCanvasViewIds: ["welcome"],
  });
  assert(ok.success === true, "minimal valid resolution should parse");
  if (ok.success) assertResolutionForSurfaceDerivation(ok.data);

  const emptyWithAudit = parseIntentLoopResolution({
    ...minimalResolution,
    allowedCanvasViewIds: [],
    auditNotes: ["deny: entitlement — no canvas views for plan tier"],
  });
  assert(emptyWithAudit.success === true, "empty views with audit should parse");
  if (emptyWithAudit.success) assertResolutionForSurfaceDerivation(emptyWithAudit.data);

  let threw = false;
  try {
    assertResolutionForSurfaceDerivation({
      ...minimalResolution,
      allowedCanvasViewIds: [],
    });
  } catch {
    threw = true;
  }
  assert(threw, "empty allowedCanvasViewIds without auditNotes must throw");

  assert(
    INTENT_LOOP_FAIL_CLOSED_FALLBACK_VIEW_IDS.length === 3,
    "fallback id tuple length",
  );
  assert(
    INTENT_LOOP_FAIL_CLOSED_FALLBACK_VIEW_IDS.includes("disambiguation_menu"),
    "disambiguation_menu is a declared fallback",
  );

  console.log("test-intent-loop-resolution-schema: OK");
}

run();
