/**
 * HTTP integration: execution contract on POST /api/intelligence/provision and
 * POST /api/intelligence/orchestration-runs (hospitality gate from body or site placeData.types).
 *
 * Run: npm run test:intelligence-provision-contract-http (with DATABASE_URL, e.g. doppler run -- npm run …)
 * Requires: DATABASE_URL, industry templates (same as guardrails / onboarding E2E).
 */
import "dotenv/config";
import express from "express";
import http from "http";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../server/db.js";
import intelligenceRoutes from "../server/routes/intelligenceRoutes.js";
import {
  agents,
  siteConfigs,
  adminUsers,
  authSessions,
  orchestrationViolations,
  agentOrchestrationRuns,
  qrRoutes,
  knowledgeArtifacts,
} from "../shared/schema.js";
import {
  HOSPITALITY_PHASE1_CONTRACT_ID,
  EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
} from "../shared/onboardingPhase1ContractDefinition.js";

const PLACE_PREFIX = "ChIJ_INT_HTTP_CONTRACT_";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function deleteTestSite(siteConfigId: string): Promise<void> {
  await db.delete(orchestrationViolations).where(eq(orchestrationViolations.siteConfigId, siteConfigId));
  await db.delete(agentOrchestrationRuns).where(eq(agentOrchestrationRuns.siteConfigId, siteConfigId));
  await db.delete(qrRoutes).where(eq(qrRoutes.siteConfigId, siteConfigId));
  await db.delete(knowledgeArtifacts).where(eq(knowledgeArtifacts.siteConfigId, siteConfigId));
  await db.delete(agents).where(eq(agents.siteConfigId, siteConfigId));
  await db.delete(siteConfigs).where(eq(siteConfigs.id, siteConfigId));
}

async function startServer(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json());
  app.use("/api/intelligence", intelligenceRoutes);
  const server = http.createServer(app);
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res()))),
      });
    });
    server.on("error", reject);
  });
}

async function postJson(
  baseUrl: string,
  path: string,
  token: string,
  body: Record<string, unknown>,
  method = "POST",
): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  let json: Record<string, unknown> | null = null;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

function postProvision(
  baseUrl: string,
  token: string,
  body: Record<string, unknown>,
): Promise<{ status: number; json: Record<string, unknown> | null }> {
  return postJson(baseUrl, "/api/intelligence/provision", token, body);
}

function postOrchestrationRuns(
  baseUrl: string,
  token: string,
  body: Record<string, unknown>,
): Promise<{ status: number; json: Record<string, unknown> | null }> {
  return postJson(baseUrl, "/api/intelligence/orchestration-runs", token, body);
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL required.");
    process.exit(1);
  }

  const prevEnforce = process.env.HOSPITALITY_PROVISION_CONTRACT_ENFORCE;
  process.env.HOSPITALITY_PROVISION_CONTRACT_ENFORCE = "1";

  const testPhone = `+1000000${Date.now().toString().slice(-9)}`;
  const testToken = `int_http_contract_${randomUUID().replace(/-/g, "")}`;
  const adminIds: string[] = [];
  const siteIds: string[] = [];

  const { baseUrl, close } = await startServer();

  try {
    const [admin] = await db
      .insert(adminUsers)
      .values({
        phone: testPhone,
        name: "HTTP contract test admin",
        role: "superadmin",
        isActive: true,
      })
      .returning();
    assert(!!admin?.id, "admin insert");
    adminIds.push(admin.id);

    const farFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(authSessions).values({
      adminUserId: admin.id,
      token: testToken,
      expiresAt: farFuture,
    });

    async function freshSite(suffix: string): Promise<string> {
      const placeId = `${PLACE_PREFIX}${suffix}_${Date.now()}`;
      const slug = `int-http-${suffix}-${Date.now()}`;
      const [site] = await db
        .insert(siteConfigs)
        .values({ name: `HTTP Test ${suffix}`, placeId, slug, workspaceState: "demo" })
        .returning();
      assert(!!site?.id, "site insert");
      siteIds.push(site.id);
      return site.id;
    }

    async function freshSiteWithPlaceData(
      suffix: string,
      placeData: Record<string, unknown>,
    ): Promise<string> {
      const placeId = `${PLACE_PREFIX}${suffix}_${Date.now()}`;
      const slug = `int-http-${suffix}-${Date.now()}`;
      const [site] = await db
        .insert(siteConfigs)
        .values({
          name: `HTTP Test ${suffix}`,
          placeId,
          slug,
          workspaceState: "demo",
          placeData,
        })
        .returning();
      assert(!!site?.id, "site insert with placeData");
      siteIds.push(site.id);
      return site.id;
    }

    // 1) Hospitality without contract → 422
    const siteA = await freshSite("a");
    const r1 = await postProvision(baseUrl, testToken, {
      siteConfigId: siteA,
      placeTypes: ["lodging"],
      businessName: "Hotel A",
    });
    assert(r1.status === 422, `expected 422 without contract, got ${r1.status}`);
    assert(r1.json?.code === "ADMISSION_CONTRACT_REFUSED", "expected ADMISSION_CONTRACT_REFUSED");

    // 2) Wrong hash → 422
    const siteB = await freshSite("b");
    const r2 = await postProvision(baseUrl, testToken, {
      siteConfigId: siteB,
      placeTypes: ["hotel"],
      businessName: "Hotel B",
      admissionContractId: HOSPITALITY_PHASE1_CONTRACT_ID,
      admissionContractHash: "0".repeat(64),
    });
    assert(r2.status === 422, `expected 422 wrong hash, got ${r2.status}`);
    assert(r2.json?.code === "ADMISSION_CONTRACT_REFUSED", "wrong hash code");

    // 3) Valid id + hash (+ optional version) → 200
    const siteC = await freshSite("c");
    const r3 = await postProvision(baseUrl, testToken, {
      siteConfigId: siteC,
      placeTypes: ["lodging"],
      businessName: "Hotel C OK",
      admissionContractId: HOSPITALITY_PHASE1_CONTRACT_ID,
      admissionContractHash: EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
      admissionContractVersion: "1",
    });
    assert(r3.status === 200, `expected 200 valid contract, got ${r3.status} ${JSON.stringify(r3.json)}`);
    assert(r3.json?.success === true, "success true");
    assert(r3.json?.industryGroup === "hospitality_travel", "hospitality industry");

    // 4) Non-hospitality → no gate (no admission fields)
    const siteD = await freshSite("d");
    const r4 = await postProvision(baseUrl, testToken, {
      siteConfigId: siteD,
      placeTypes: ["lawyer"],
      businessName: "Law D",
    });
    assert(r4.status === 200, `expected 200 lawyer path, got ${r4.status}`);
    assert(r4.json?.success === true, "lawyer success");
    assert(r4.json?.industryGroup === "professional_services", "professional_services");

    // 5) orchestration-runs: hospitality from site placeData, no contract → 422
    const siteOrch1 = await freshSiteWithPlaceData("orch1", { types: ["lodging"] });
    const o1 = await postOrchestrationRuns(baseUrl, testToken, { siteConfigId: siteOrch1 });
    assert(o1.status === 422, `orch-runs expected 422, got ${o1.status}`);
    assert(o1.json?.code === "ADMISSION_CONTRACT_REFUSED", "orch ADMISSION_CONTRACT_REFUSED");

    // 6) orchestration-runs: valid contract → 201
    const siteOrch2 = await freshSiteWithPlaceData("orch2", { types: ["hotel"] });
    const o2 = await postOrchestrationRuns(baseUrl, testToken, {
      siteConfigId: siteOrch2,
      admissionContractId: HOSPITALITY_PHASE1_CONTRACT_ID,
      admissionContractHash: EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
      admissionContractVersion: "1",
    });
    assert(o2.status === 201, `orch-runs expected 201, got ${o2.status} ${JSON.stringify(o2.json)}`);
    assert(typeof o2.json?.runId === "string", "runId string");

    // 7) orchestration-runs: non-hospitality placeData → no gate
    const siteOrch3 = await freshSiteWithPlaceData("orch3", { types: ["lawyer"] });
    const o3 = await postOrchestrationRuns(baseUrl, testToken, { siteConfigId: siteOrch3 });
    assert(o3.status === 201, `orch-runs lawyer site expected 201, got ${o3.status}`);

    console.log("[test-intelligence-provision-contract-http] PASSED");
  } finally {
    for (const id of siteIds) {
      await deleteTestSite(id);
    }
    await db.delete(authSessions).where(eq(authSessions.token, testToken));
    for (const aid of adminIds) {
      await db.delete(adminUsers).where(eq(adminUsers.id, aid));
    }
    await close();
    if (prevEnforce === undefined) delete process.env.HOSPITALITY_PROVISION_CONTRACT_ENFORCE;
    else process.env.HOSPITALITY_PROVISION_CONTRACT_ENFORCE = prevEnforce;
  }
}

main().catch((e) => {
  console.error("[test-intelligence-provision-contract-http] FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
