import assert from "node:assert/strict";

import { WorkspaceAuthHealthSchema } from "../shared/workspaceAuthLifecycle.js";
import { computeTokenState } from "../server/services/workspaceAuthLifecycleService.js";

function main(): void {
  const expired = new Date(Date.now() - 60_000);
  const expiringSoon = new Date(Date.now() + 5 * 60_000);
  const valid = new Date(Date.now() + 60 * 60_000);

  assert.equal(computeTokenState(expired), "expired");
  assert.equal(computeTokenState(expiringSoon), "expiring_soon");
  assert.equal(computeTokenState(valid), "valid");

  const parsed = WorkspaceAuthHealthSchema.parse({
    mode: "external_mcp",
    authState: "degraded",
    configured: true,
    hasStoredCredentials: true,
    usingBearerOverride: false,
    tokenExpiresAt: valid.toISOString(),
    tokenExpiresInSec: 3600,
    degradedReason: "external_workspace_transport_error",
    fallbackAvailable: true,
    recoverable: true,
    externalUrl: "https://workspace.example.com/mcp",
  });

  assert.equal(parsed.authState, "degraded");
  assert.equal(parsed.fallbackAvailable, true);
}

main();
