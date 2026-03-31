/**
 * onboarding-e2e:new-business-hospitality — Phase 1 (no scraper, no legacy state)
 *
 * Fresh site only: zero agents, no swarm_role_contract, no Cloudbeds PMS row before provision.
 * Simulates post–business-discovery inputs (structured placeTypes + name) without Maps/Serp HTTP.
 * Seeds one minimal knowledge artifact from normalized facts (Phase 1 KB stub).
 * Single provisionAgentsForBusiness pass → verifyHospitalityProjectionDeep must pass without re-run.
 *
 * NOT the design center for onboarding; Boardwalk and other fixtures are regression-only.
 *
 * Run: doppler run -- npx tsx tests/onboarding-e2e-new-business-hospitality.ts
 * Requires: DATABASE_URL, ≥6 active hospitality_travel industry_agent_templates (seed-industry-templates).
 */
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "../server/db.js";
import { provisionAgentsForBusiness } from "../server/services/agentProvisioning.js";
import { verifyHospitalityProjectionDeep } from "../server/services/hospitalityProjectionVerify.js";
import {
  agents,
  siteConfigs,
  sitePmsIntegrations,
  knowledgeArtifacts,
  qrRoutes,
} from "../shared/schema.js";
import {
  buildHospitalityPhase1ArtifactMetadata,
  computeContractHash,
  EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
  HOSPITALITY_PHASE1_CONTRACT_DEFINITION_V1,
  HOSPITALITY_PHASE1_CONTRACT_ID,
  ONBOARDING_PHASE1_SCHEMA_VERSION,
} from "../shared/onboardingPhase1AdmissionContract.js";

const TEST_PLACE_ID_PREFIX = "ChIJ_ONBOARDING_E2E_HOSP_FRESH_";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function deleteTestSite(siteConfigId: string): Promise<void> {
  await db.delete(qrRoutes).where(eq(qrRoutes.siteConfigId, siteConfigId));
  await db.delete(knowledgeArtifacts).where(eq(knowledgeArtifacts.siteConfigId, siteConfigId));
  await db.delete(agents).where(eq(agents.siteConfigId, siteConfigId));
  await db.delete(siteConfigs).where(eq(siteConfigs.id, siteConfigId));
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL required. Run: doppler run -- npx tsx tests/onboarding-e2e-new-business-hospitality.ts");
    process.exit(1);
  }

  const placeId = `${TEST_PLACE_ID_PREFIX}${Date.now()}`;
  const businessName = "E2E Fresh Stay Lafayette";
  const slug = `e2e-fresh-stay-${Date.now()}`;

  let siteConfigId: string | null = null;

  try {
    // ── 1) Site shell (no agents, no PMS) ─────────────────────────────────
    const [site] = await db
      .insert(siteConfigs)
      .values({
        name: businessName,
        placeId,
        slug,
        workspaceState: "demo",
      })
      .returning();
    assert(!!site?.id, "site insert failed");
    siteConfigId = site.id;

    const agentCount = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.siteConfigId, siteConfigId));
    assert(agentCount.length === 0, "precondition: no agents before provision");

    const pmsRows = await db
      .select({ id: sitePmsIntegrations.id })
      .from(sitePmsIntegrations)
      .where(
        and(eq(sitePmsIntegrations.siteConfigId, siteConfigId), eq(sitePmsIntegrations.pmsType, "cloudbeds")),
      );
    assert(pmsRows.length === 0, "precondition: no Cloudbeds PMS row unless test adds it");

    console.log("[onboarding-e2e:new-business-hospitality] Phase 1 — simulated discovery (no HTTP)");
    const placeTypes = ["lodging", "hotel"] as string[];
    const normalizedFacts = {
      businessName,
      placeTypes,
      addressLine: "1600 Test Blvd, Lafayette, LA",
      primaryCategory: "lodging",
    };
    console.log("  normalizedFacts:", JSON.stringify(normalizedFacts));

    // ── 2) KB foundation (minimal artifact; scraper deferred to Phase 2) ──
    const accessKey = `onboarding-e2e-hosp-${siteConfigId}-business-facts-v1`;
    await db.insert(knowledgeArtifacts).values({
      siteConfigId,
      agentAccessKey: accessKey,
      title: `${businessName} — onboarding E2E business facts`,
      content: `# ${businessName}\n\nStructured seed from onboarding-e2e (Phase 1).\n\n${normalizedFacts.addressLine}\n`,
      scope: "business",
      visibility: "private",
      trustWeight: 5,
      artifactMetadata: buildHospitalityPhase1ArtifactMetadata({
        placeTypes,
        e2e_marker: "onboarding-e2e-new-business-hospitality",
      }),
    });
    console.log("[onboarding-e2e:new-business-hospitality] Seeded knowledge_artifacts:", accessKey);

    const [artifactRow] = await db
      .select()
      .from(knowledgeArtifacts)
      .where(eq(knowledgeArtifacts.agentAccessKey, accessKey))
      .limit(1);
    assert(!!artifactRow, "artifact row must exist after insert");
    assert(artifactRow.siteConfigId === siteConfigId, "artifact.siteConfigId");
    assert(artifactRow.title.includes(businessName), "artifact.title");
    assert(
      (artifactRow.content ?? "").includes(businessName) &&
        (artifactRow.content ?? "").includes(normalizedFacts.addressLine),
      "artifact.content",
    );
    assert(artifactRow.scope === "business", "artifact.scope");
    assert(artifactRow.visibility === "private", "artifact.visibility");
    assert(artifactRow.trustWeight === 5, "artifact.trustWeight");
    const meta = artifactRow.artifactMetadata as Record<string, unknown>;
    assert(meta.source === "onboarding_phase1", "metadata.source");
    assert(meta.onboarding_phase1_schema_version === ONBOARDING_PHASE1_SCHEMA_VERSION, "metadata.schema_version");
    assert(meta.contract_id === HOSPITALITY_PHASE1_CONTRACT_ID, "metadata.contract_id");
    assert(typeof meta.contract_hash === "string" && meta.contract_hash.length === 64, "metadata.contract_hash shape");
    assert(meta.contract_hash === EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH, "metadata.contract_hash value");
    assert(
      meta.contract_hash === computeContractHash(HOSPITALITY_PHASE1_CONTRACT_DEFINITION_V1),
      "metadata.contract_hash recomputed",
    );

    // ── 3) Classification + swarm: single provision pass ───────────────────
    console.log("[onboarding-e2e:new-business-hospitality] provisionAgentsForBusiness (single pass)…");
    const provision = await provisionAgentsForBusiness(siteConfigId, placeTypes, businessName);

    assert(provision.industryGroup === "hospitality_travel", "industryGroup must be hospitality_travel");
    assert(provision.agentsCreated === 6, `expected 6 agents created on fresh site, got ${provision.agentsCreated}`);
    assert(provision.agentsSkipped === 0, `expected 0 skipped on fresh site, got ${provision.agentsSkipped}`);
    assert(provision.archetypesProvisioned.length >= 6, "archetypes list should include full swarm");

    // ── 4) Verify (no second provision / legacy repair) ────────────────────
    const verify = await verifyHospitalityProjectionDeep(siteConfigId);
    assert(verify.ok, verify.ok ? "verify ok" : verify.errors.join("\n"));
    console.log(verify.summary);

    console.log("\n[onboarding-e2e:new-business-hospitality] PASSED — fresh site, first-run verify OK");
  } finally {
    if (siteConfigId) {
      await deleteTestSite(siteConfigId);
      console.log("[onboarding-e2e:new-business-hospitality] Cleaned up site", siteConfigId);
    }
  }
}

main().catch((e) => {
  console.error("[onboarding-e2e:new-business-hospitality] FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
