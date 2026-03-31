/**
 * Phase D — SurfaceDerivationService (no second policy engine).
 * Run: npx tsx tests/test-surface-derivation.ts
 */
import { deriveSurfacesFromResolution } from "../server/services/surfaceDerivationService.js";
import { INTENT_LOOP_CONTRACT_VERSION } from "../shared/intentLoopContract.js";
import type { IntentLoopResolution } from "../shared/intentLoopContract.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function baseResolution(
  partial: Partial<IntentLoopResolution> & Pick<IntentLoopResolution, "allowedCanvasViewIds">,
): IntentLoopResolution {
  return {
    contractVersion: INTENT_LOOP_CONTRACT_VERSION,
    resolutionId: "res-derivation-test",
    stateVector: { lifecycle: "operations", domainJourneyKey: "in_house" },
    mergeStepsApplied: ["classification", "domain", "role", "tenant", "turn"],
    ...partial,
  };
}

function run(): void {
  const r1 = deriveSurfacesFromResolution({
    resolution: baseResolution({ allowedCanvasViewIds: ["welcome"] }),
    finalSelectedViewId: "welcome",
  });
  assert(r1.primaryViewId === "welcome", "single allowed + final");
  assert(r1.commandCenter === undefined, "non-command_center has no slot plan");

  const rCc = deriveSurfacesFromResolution({
    resolution: baseResolution({
      allowedCanvasViewIds: ["command_center"],
      allowedActionIds: ["approve_booking"],
      swarmSchematicRef: { id: "hospitality_demo", version: "1.0.0" },
    }),
    finalSelectedViewId: "command_center",
  });
  assert(rCc.primaryViewId === "command_center", "command center primary");
  assert(rCc.commandCenter != null, "slot derivation present");
  assert(rCc.commandCenter.statusItems.length >= 1, "status lane");
  assert(rCc.commandCenter.workItems.length >= 1, "main work");
  assert(
    rCc.commandCenter.approvals.some((a) => a.actionId === "approve_booking"),
    "approvals from resolution allowedActionIds",
  );

  const rEmpty = deriveSurfacesFromResolution({
    resolution: baseResolution({ allowedCanvasViewIds: [], auditNotes: ["deny:test"] }),
  });
  assert(rEmpty.primaryViewId === null, "empty allowed → null primary");

  const rMulti = deriveSurfacesFromResolution({
    resolution: baseResolution({ allowedCanvasViewIds: ["faq_list", "service_menu"] }),
    finalSelectedViewId: "service_menu",
  });
  assert(rMulti.primaryViewId === "service_menu", "final wins when in allowed list");

  console.log("test-surface-derivation: OK");
}

run();
