/**
 * Negative paths for hospitality onboarding admission (isolated cases, same cleanup discipline).
 *
 * Run: doppler run -- npx tsx tests/onboarding-e2e-hospitality-negative.ts
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../server/db.js";
import { provisionAgentsForBusiness } from "../server/services/agentProvisioning.js";
import { verifyHospitalityProjectionDeep } from "../server/services/hospitalityProjectionVerify.js";
import { agents, siteConfigs, knowledgeArtifacts, qrRoutes } from "../shared/schema.js";

const TEST_PLACE_ID_PREFIX = "ChIJ_ONBOARDING_E2E_HOSP_NEG_";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function deleteTestSite(siteConfigId: string): Promise<void> {
  await db.delete(qrRoutes).where(eq(qrRoutes.siteConfigId, siteConfigId));
  await db.delete(knowledgeArtifacts).where(eq(knowledgeArtifacts.siteConfigId, siteConfigId));
  await db.delete(agents).where(eq(agents.siteConfigId, siteConfigId));
  await db.delete(siteConfigs).where(eq(siteConfigs.id, siteConfigId));
}

async function caseWrongIndustryVerifyFails(): Promise<void> {
  const placeId = `${TEST_PLACE_ID_PREFIX}LAW_${Date.now()}`;
  const slug = `e2e-neg-law-${Date.now()}`;
  const [site] = await db
    .insert(siteConfigs)
    .values({ name: "E2E Neg Law Firm", placeId, slug, workspaceState: "demo" })
    .returning();
  assert(!!site?.id, "site insert");
  const siteConfigId = site.id;
  try {
    const placeTypes = ["lawyer"] as string[];
    const provision = await provisionAgentsForBusiness(siteConfigId, placeTypes, site.name ?? "Law");
    assert(provision.industryGroup === "professional_services", "lawyer maps to professional_services");
    const verify = await verifyHospitalityProjectionDeep(siteConfigId);
    assert(!verify.ok, "hospitality deep verify must fail for non-hospitality swarm");
    console.log("[negative] wrong_industry: verify failed as expected:", verify.ok ? "" : verify.errors.slice(0, 2).join("; "));
  } finally {
    await deleteTestSite(siteConfigId);
  }
}

async function caseSkipProvisionVerifyFails(): Promise<void> {
  const placeId = `${TEST_PLACE_ID_PREFIX}NOPROV_${Date.now()}`;
  const slug = `e2e-neg-noprov-${Date.now()}`;
  const [site] = await db
    .insert(siteConfigs)
    .values({ name: "E2E Neg No Provision", placeId, slug, workspaceState: "demo" })
    .returning();
  assert(!!site?.id, "site insert");
  const siteConfigId = site.id;
  try {
    const agentCount = await db.select({ id: agents.id }).from(agents).where(eq(agents.siteConfigId, siteConfigId));
    assert(agentCount.length === 0, "precondition: no agents");
    const verify = await verifyHospitalityProjectionDeep(siteConfigId);
    assert(!verify.ok, "verify must fail when hospitality swarm was never provisioned");
    console.log("[negative] skip_provision: verify failed as expected");
  } finally {
    await deleteTestSite(siteConfigId);
  }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL required.");
    process.exit(1);
  }
  await caseWrongIndustryVerifyFails();
  await caseSkipProvisionVerifyFails();
  console.log("\n[onboarding-e2e-hospitality-negative] PASSED");
}

main().catch((e) => {
  console.error("[onboarding-e2e-hospitality-negative] FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
