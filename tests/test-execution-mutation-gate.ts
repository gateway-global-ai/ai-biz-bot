/**
 * Execution mutation gate — envelope parse + executeContract smoke (no Doppler).
 */
import assert from "node:assert/strict";
import { parseExecutionMutationRequest } from "../shared/executionMutationGate.js";
import { executeContract } from "../server/services/executionMutationGate.js";

function testParseRejects() {
  const bad = parseExecutionMutationRequest({ foo: 1 });
  assert.equal(bad.success, false);
}

function testParseAccepts() {
  const good = parseExecutionMutationRequest({
    mutationKind: "gemini_tool_invocation",
    capability: "request_manual_input",
    payload: { prompt: "Test prompt for gate" },
    context: {
      routeOrSource: "test:execution_mutation_gate",
      transport: "internal",
    },
    caller: { actor: "system" },
  });
  assert.equal(good.success, true);
  if (good.success) {
    assert.equal(good.data.capability, "request_manual_input");
    assert.equal(good.data.payload.prompt, "Test prompt for gate");
  }
}

async function testExecuteContract() {
  const out = await executeContract({
    mutationKind: "gemini_tool_invocation",
    capability: "request_manual_input",
    payload: { prompt: "Gate smoke" },
    context: {
      routeOrSource: "test:execution_mutation_gate",
      transport: "internal",
    },
    caller: { actor: "system", correlationId: "corr-1" },
  });
  assert.equal(out.ok, true);
  if (out.ok) {
    assert.equal(out.capability, "request_manual_input");
    assert.equal(out.audit.routeOrSource, "test:execution_mutation_gate");
    assert.equal(out.audit.actor, "system");
    const r = out.result as { status?: string; prompt?: string };
    assert.equal(r.status, "awaiting_user_input");
    assert.ok(String(r.prompt || "").includes("Gate smoke"));
  }
}

async function main() {
  testParseRejects();
  testParseAccepts();
  await testExecuteContract();
  console.log("test-execution-mutation-gate: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
