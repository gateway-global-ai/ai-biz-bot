/**
 * Site identity resolver invariants (no DB required).
 * Run: npm run test:site-identity
 */
import assert from "node:assert/strict";
import {
  boardwalkSiteConfigIdFromEnv,
  resolveBoardwalkSiteConfigIdLegacyGooglePlaceIdMigrationShimOnly,
} from "../scripts/lib/boardwalkSiteIdentity.js";

function testEnvUuidPreferred() {
  process.env.BOARDWALK_SITE_CONFIG_ID = "ce51f023-d5fc-4de5-a776-583a0397e05e";
  delete process.env.E2E_SITE_CONFIG_ID;
  const id = boardwalkSiteConfigIdFromEnv();
  assert.equal(id, "ce51f023-d5fc-4de5-a776-583a0397e05e");
  delete process.env.BOARDWALK_SITE_CONFIG_ID;
}

async function testMigrationShimBlockedInProduction() {
  const prevNode = process.env.NODE_ENV;
  const prevLegacy = process.env.GOVERNANCE_LEGACY_GOOGLE_PLACE_ID_LOOKUP;
  process.env.NODE_ENV = "production";
  process.env.GOVERNANCE_LEGACY_GOOGLE_PLACE_ID_LOOKUP = "1";
  const r = await resolveBoardwalkSiteConfigIdLegacyGooglePlaceIdMigrationShimOnly();
  assert.equal(r, null);
  process.env.NODE_ENV = prevNode;
  if (prevLegacy === undefined) delete process.env.GOVERNANCE_LEGACY_GOOGLE_PLACE_ID_LOOKUP;
  else process.env.GOVERNANCE_LEGACY_GOOGLE_PLACE_ID_LOOKUP = prevLegacy;
}

async function testMigrationShimRequiresExplicitEnv() {
  const prevNode = process.env.NODE_ENV;
  const prevLegacy = process.env.GOVERNANCE_LEGACY_GOOGLE_PLACE_ID_LOOKUP;
  process.env.NODE_ENV = "development";
  delete process.env.GOVERNANCE_LEGACY_GOOGLE_PLACE_ID_LOOKUP;
  const r = await resolveBoardwalkSiteConfigIdLegacyGooglePlaceIdMigrationShimOnly();
  assert.equal(r, null);
  process.env.NODE_ENV = prevNode;
  if (prevLegacy === undefined) delete process.env.GOVERNANCE_LEGACY_GOOGLE_PLACE_ID_LOOKUP;
  else process.env.GOVERNANCE_LEGACY_GOOGLE_PLACE_ID_LOOKUP = prevLegacy;
}

async function main(): Promise<void> {
  testEnvUuidPreferred();
  await testMigrationShimBlockedInProduction();
  await testMigrationShimRequiresExplicitEnv();
  console.log("test:site-identity OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
