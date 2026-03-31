import assert from "node:assert/strict";

import { executeWorkspaceGovernedAction } from "../server/services/workspaceMcpAdapter.js";

async function main(): Promise<void> {
  process.env.WORKSPACE_MCP_ADAPTER_MODE = "external_mcp";
  delete process.env.WORKSPACE_MCP_URL;

  const missingUrl = await executeWorkspaceGovernedAction({
    siteConfigId: "site-123",
    actionId: "workspace.verify_connectivity",
    input: {},
  });
  assert.equal(missingUrl.ok, false);
  assert.equal(missingUrl.error, "workspace_mcp_url_missing");

  const requiresApproval = await executeWorkspaceGovernedAction({
    siteConfigId: "site-123",
    actionId: "workspace.send_gmail_message",
    input: {
      to: "owner@example.com",
      subject: "Subject",
      body: "Hello",
    },
  });
  assert.equal(requiresApproval.ok, false);
  assert.equal(requiresApproval.requiresApproval, true);
}

void main();
