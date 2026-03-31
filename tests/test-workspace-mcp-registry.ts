import assert from "node:assert/strict";

import {
  getWorkspaceMcpAction,
  loadWorkspaceMcpActionRegistry,
} from "../server/services/workspaceMcpActionRegistry.js";

function main(): void {
  const registry = loadWorkspaceMcpActionRegistry();
  assert(registry.size > 0, "workspace MCP action registry should not be empty");

  const searchDrive = getWorkspaceMcpAction("workspace.search_drive_files");
  assert(searchDrive, "search drive action should exist");
  assert.equal(searchDrive?.external_tool_name, "search_drive_files");
  assert.equal(searchDrive?.scope_key, "workspace_scope");

  const sendMail = getWorkspaceMcpAction("workspace.send_gmail_message");
  assert(sendMail?.requires_approval, "send gmail should require approval");
}

main();
