/**
 * integration_connect_tokens — mint / validate / mark used (needs DB + INTEGRATION_CONNECT_TOKEN_SECRET).
 * Run: doppler run -- npx tsx tests/test-integration-connect-tokens.ts
 * Or: npm run test:integration-connect-tokens
 */

import { db } from "../server/db.ts";
import { siteConfigs } from "../shared/schema.ts";
import {
  hashIntegrationConnectToken,
  markIntegrationConnectTokenUsed,
  mintIntegrationConnectToken,
  validateIntegrationConnectToken,
} from "../server/services/integrationConnectTokens.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.log("SKIP: DATABASE_URL not set");
    return;
  }
  if (!process.env.INTEGRATION_CONNECT_TOKEN_SECRET?.trim()) {
    console.log("SKIP: INTEGRATION_CONNECT_TOKEN_SECRET not set (add to Doppler for connect-token flows)");
    return;
  }

  const [site] = await db.select({ id: siteConfigs.id }).from(siteConfigs).limit(1);
  if (!site) {
    console.log("SKIP: no site_configs row");
    return;
  }

  const plainWrong = "not-a-real-token";
  const bad = await validateIntegrationConnectToken(plainWrong);
  assert(bad.status === "invalid", "random token should be invalid");

  const minted = await mintIntegrationConnectToken({
    siteConfigId: site.id,
    vendorId: "cloudbeds",
    connectLane: "oauth",
    createdBy: "test:integration-connect-tokens",
  });

  assert(
    hashIntegrationConnectToken(minted.plainToken).length === 64,
    "hmac sha256 hex length",
  );

  let v = await validateIntegrationConnectToken(minted.plainToken);
  assert(v.status === "valid" && v.record.id === minted.id, "first validate valid");

  const mismatch = await validateIntegrationConnectToken(minted.plainToken, {
    expectSiteConfigId: "00000000-0000-0000-0000-000000000001",
  });
  assert(mismatch.status === "site_mismatch", "site mismatch");

  const vm = await validateIntegrationConnectToken(minted.plainToken, {
    expectVendorId: "other_vendor",
  });
  assert(vm.status === "vendor_mismatch", "vendor mismatch");

  await markIntegrationConnectTokenUsed(minted.id);

  v = await validateIntegrationConnectToken(minted.plainToken);
  assert(v.status === "already_used", "after mark used");

  console.log("test-integration-connect-tokens: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
