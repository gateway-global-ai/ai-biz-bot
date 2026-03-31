/**
 * beginCloudbedsIntegrationAuthHandoff — unit errors + optional DB mint (requires secrets + APP_URL).
 * Run: npx tsx tests/test-cloudbeds-integration-auth-handoff.ts
 * Full: doppler run -- npx tsx tests/test-cloudbeds-integration-auth-handoff.ts
 */

import { eq } from "drizzle-orm";
import { beginCloudbedsIntegrationAuthHandoff } from "../server/services/beginCloudbedsIntegrationAuthHandoff";
import { db } from "../server/db.ts";
import { sitePmsIntegrations } from "../shared/schema.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function testInvalidInput() {
  const r = await beginCloudbedsIntegrationAuthHandoff({ siteConfigId: "  " });
  assert(r.ok === false && r.code === "INVALID_INPUT", "empty siteConfigId");
}

async function testNoRow() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.log("SKIP: testNoRow (DATABASE_URL)");
    return;
  }
  const r = await beginCloudbedsIntegrationAuthHandoff({
    siteConfigId: "00000000-0000-0000-0000-000000000001",
    eligibilityMode: "cloudbeds_row_only",
  });
  assert(r.ok === false && r.code === "NO_CLOUDBEDS_ROW", "missing row");
}

async function testMintWhenConfigured() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.log("SKIP: mint (DATABASE_URL)");
    return;
  }
  if (!process.env.INTEGRATION_CONNECT_TOKEN_SECRET?.trim()) {
    console.log("SKIP: mint (INTEGRATION_CONNECT_TOKEN_SECRET)");
    return;
  }
  const appUrl = process.env.APP_URL?.trim() || "http://127.0.0.1:5000";
  const prev = process.env.APP_URL;
  process.env.APP_URL = appUrl;

  const [row] = await db
    .select({ siteConfigId: sitePmsIntegrations.siteConfigId })
    .from(sitePmsIntegrations)
    .where(eq(sitePmsIntegrations.pmsType, "cloudbeds"))
    .limit(1);

  if (!row) {
    console.log("SKIP: mint (no cloudbeds site_pms_integrations row)");
    process.env.APP_URL = prev;
    return;
  }

  const r = await beginCloudbedsIntegrationAuthHandoff({
    siteConfigId: row.siteConfigId,
    connectLane: "oauth",
    createdBy: "test:cloudbeds-integration-auth-handoff",
    eligibilityMode: "cloudbeds_row_only",
    allowWhenAlreadyReady: true,
  });

  process.env.APP_URL = prev;

  if (!r.ok) {
    if (r.code === "APP_URL_NOT_CONFIGURED") {
      console.log("SKIP: mint (APP_URL not set in env for test)");
      return;
    }
    throw new Error(`mint failed: ${r.code} ${r.message}`);
  }

  assert(r.connectUrl.includes("/connect/cloudbeds?token="), "connectUrl shape");
  assert(r.exchangePostUrl.includes("/api/integration/connect/exchange"), "exchangePostUrl");
  assert(r.plainToken.length > 20, "plainToken present for trusted caller");
  assert(r.logicalRouteId === "operator.integration.connect", "logical route");
  console.log("test beginCloudbedsIntegrationAuthHandoff (DB): OK");
}

async function main() {
  await testInvalidInput();
  await testNoRow();
  await testMintWhenConfigured();
  console.log("test-cloudbeds-integration-auth-handoff: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
