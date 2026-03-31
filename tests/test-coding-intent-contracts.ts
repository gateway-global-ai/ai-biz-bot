import assert from "node:assert/strict";

import {
  CreateCodingIntentRequestSchema,
  OutcomePacketFragmentSchema,
  UpgradedLocalAgentTaskBodySchema,
} from "../shared/intentExecutionPlane/contracts";

function main(): void {
  const createIntent = CreateCodingIntentRequestSchema.parse({
    siteConfigId: "site-123",
    title: "Connect Workspace MCP core plane",
    intentKey: "workspace_core_integration",
    intentInput: {
      scopes: ["workspace_scope", "routing_scope"],
    },
  });

  assert.equal(createIntent.intentKey, "workspace_core_integration");
  assert.deepEqual(createIntent.intentInput.scopes, ["workspace_scope", "routing_scope"]);

  const task = UpgradedLocalAgentTaskBodySchema.parse({
    siteConfigId: "site-123",
    agentId: "agent-123",
    intentExecutionId: "11111111-1111-4111-8111-111111111111",
    scopeExecutionId: "22222222-2222-4222-8222-222222222222",
    actionRequest: {
      skillKey: "workspace_integration",
      actionKey: "call_workspace_mcp",
      input: {
        provider: "google_workspace_mcp",
        transport: "streamable-http",
      },
    },
    executionPacket: {
      id: "33333333-3333-4333-8333-333333333333",
      intentExecutionId: "11111111-1111-4111-8111-111111111111",
      scopeExecutionId: "22222222-2222-4222-8222-222222222222",
      repoRef: "gateway-global-ai-platform",
      baseBranch: "main",
      featureBranch: "feat/workspace-core",
      worktreePath: "/tmp/worktrees/workspace-core",
      policyContext: {
        approvalTier: "tier1",
        authorizedDomains: ["workspace_integration"],
        evidenceRequirements: ["diff_summary"],
        requiredReviewGates: ["peer_review"],
      },
      requiredChecks: [{ cmd: "npm run check", timeoutSec: 1200 }],
    },
    responseSchemaId: "OutcomePacket.v1",
  });

  assert.equal(task.actionRequest?.actionKey, "call_workspace_mcp");

  const outcome = OutcomePacketFragmentSchema.parse({
    filesTouched: [{ path: "server/services/workspaceMcpClient.ts", changeType: "added" }],
    domainsTouched: ["workspace_integration"],
    checksRun: [{ cmd: "npm run check", status: "passed" }],
    risks: ["oauth_flow_change"],
    reviewReady: true,
    requiredGates: ["peer_review"],
  });

  assert.equal(outcome.reviewReady, true);
}

main();
