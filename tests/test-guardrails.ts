/**
 * Guardrail tests: create-or-return safety and provision idempotency.
 * Uses DB + storage directly (no HTTP server). Run with: npm run test:guardrails
 * Requires DATABASE_URL (or doppler run -- tsx tests/test-guardrails.ts).
 */

import { db } from "../server/db.js";
import { storage } from "../server/storage.js";
import { provisionAgentsForBusiness } from "../server/services/agentProvisioning.js";
import { agents, siteConfigs, customerAccounts } from "../shared/schema.js";
import { eq, inArray } from "drizzle-orm";

const TEST_PLACE_ID = "ChIJ_GUARDRAIL_TEST_PLACE_ID";
const TEST_OWNER_ID = "cust_test_owner_guardrail";

async function cleanupTestData() {
  const rows = await db.select({ id: siteConfigs.id }).from(siteConfigs).where(eq(siteConfigs.placeId, TEST_PLACE_ID));
  const ids = rows.map((r) => r.id);
  if (ids.length > 0) {
    // Only delete by siteConfigId when the column exists (worktree has it; main may not yet).
    if (agents.siteConfigId != null) {
      await db.delete(agents).where(inArray(agents.siteConfigId, ids));
    }
    await db.delete(siteConfigs).where(eq(siteConfigs.placeId, TEST_PLACE_ID));
  }
  await db.delete(customerAccounts).where(eq(customerAccounts.id, TEST_OWNER_ID));
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function runTestA() {
  await cleanupTestData();

  // A1: Unclaimed demo -> create-or-return returns existing (200 semantics)
  const [seed] = await db
    .insert(siteConfigs)
    .values({
      name: "Demo Workspace",
      placeId: TEST_PLACE_ID,
      workspaceState: "demo",
      ownerId: null,
    })
    .returning();
  assert(!!seed?.id, "seed insert failed");

  const existing = await storage.getUnclaimedSiteConfigByPlaceId(TEST_PLACE_ID);
  assert(existing?.id === seed.id, "Test A1: should return existing unclaimed demo");
  assert(existing?.placeId === TEST_PLACE_ID, "Test A1: placeId should match");

  // A2: Claimed workspace exists -> create-or-return must NOT return it; would create new (201 semantics)
  await db.insert(customerAccounts).values({
    id: TEST_OWNER_ID,
    phone: "+1555guardrail001",
    name: "Test Owner",
  }).onConflictDoNothing({ target: customerAccounts.id });
  const [claimed] = await db
    .insert(siteConfigs)
    .values({
      name: "Claimed Workspace",
      placeId: TEST_PLACE_ID,
      workspaceState: "claimed",
      ownerId: TEST_OWNER_ID,
    })
    .returning();
  assert(!!claimed?.id, "claimed insert failed");

  const unclaimedLookup = await storage.getUnclaimedSiteConfigByPlaceId(TEST_PLACE_ID);
  // We now have both demo and claimed. getUnclaimedSiteConfigByPlaceId returns only unclaimed demo/provisioned,
  // and orders by createdAt desc, so it could return the demo we inserted first (seed) or another unclaimed.
  // Actually: we have seed (demo, ownerId null) and claimed (claimed, ownerId set). So unclaimed lookup can
  // still return seed (demo). So to test "claimed is never returned", we need only claimed rows for this placeId.
  await db.delete(siteConfigs).where(eq(siteConfigs.placeId, TEST_PLACE_ID));
  const [claimedOnly] = await db
    .insert(siteConfigs)
    .values({
      name: "Claimed Only",
      placeId: TEST_PLACE_ID,
      workspaceState: "claimed",
      ownerId: TEST_OWNER_ID,
    })
    .returning();

  const shouldBeUndefined = await storage.getUnclaimedSiteConfigByPlaceId(TEST_PLACE_ID);
  assert(shouldBeUndefined === undefined, "Test A2: should not return claimed workspace");

  // Simulate POST create-or-return: would create new config
  const created = await storage.createSiteConfig({
    name: "New Demo Workspace",
    placeId: TEST_PLACE_ID,
  } as any);
  assert(created.id !== claimedOnly.id, "Test A2: new config must have different id");
  const rows = await db.select().from(siteConfigs).where(eq(siteConfigs.placeId, TEST_PLACE_ID));
  assert(rows.length === 2, "Test A2: two rows for same placeId (claimed + new)");
}

async function runTestB() {
  await cleanupTestData();

  const [site] = await db
    .insert(siteConfigs)
    .values({
      name: "Test Biz",
      placeId: TEST_PLACE_ID,
      workspaceState: "demo",
    })
    .returning();
  assert(!!site?.id, "site insert failed");

  const body = { siteConfigId: site.id, placeTypes: ["establishment"], businessName: "Test Biz" };

  const res1 = await provisionAgentsForBusiness(body.siteConfigId, body.placeTypes, body.businessName);
  assert(res1.agentsCreated >= 6, "first provision should create at least 6 agents");

  const agentsAfter1 = await db.select().from(agents).where(eq(agents.siteConfigId, site.id));
  assert(agentsAfter1.length >= 6, "agent count after first provision");

  const res2 = await provisionAgentsForBusiness(body.siteConfigId, body.placeTypes, body.businessName);
  assert(res2.agentsCreated === 0, "second provision should create 0 agents (idempotent)");

  const agentsAfter2 = await db.select().from(agents).where(eq(agents.siteConfigId, site.id));
  assert(agentsAfter2.length === agentsAfter1.length, "agent count unchanged on second provision");

  const [updatedSite] = await db.select().from(siteConfigs).where(eq(siteConfigs.id, site.id));
  assert(!!updatedSite?.assignedAgentId, "Concierge (assignedAgentId) should be set");
  assert(updatedSite?.workspaceState === "provisioned", "workspaceState should flip to provisioned");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set. Run: doppler run -- tsx tests/test-guardrails.ts");
    process.exit(1);
  }
  let passed = 0;
  let failed = 0;
  try {
    console.log("Test A: Create-or-return safety");
    if (typeof storage.getUnclaimedSiteConfigByPlaceId !== "function") {
      console.log("  SKIP (getUnclaimedSiteConfigByPlaceId not available — merge workspace lifecycle)");
    } else {
      await runTestA();
      console.log("  A1 + A2 passed");
      passed += 2;
    }
  } catch (e) {
    console.error("  FAIL:", e instanceof Error ? e.message : e);
    failed += 2;
  }
  try {
    console.log("Test B: Provision idempotency");
    if (agents.siteConfigId == null || (siteConfigs as any).workspaceState == null) {
      console.log("  SKIP (agents.siteConfigId / siteConfigs.workspaceState not in schema — merge workspace lifecycle)");
    } else {
      await runTestB();
      console.log("  passed");
      passed += 1;
    }
  } catch (e) {
    console.error("  FAIL:", e instanceof Error ? e.message : e);
    failed += 1;
  }
  await cleanupTestData();
  console.log("\nGuardrails:", passed, "passed,", failed, "failed");
  process.exit(failed > 0 ? 1 : 0);
}

main();
