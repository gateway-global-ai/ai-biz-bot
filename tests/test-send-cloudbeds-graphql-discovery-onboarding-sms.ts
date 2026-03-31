/**
 * sendCloudbedsGraphqlDiscoveryOnboardingSms — state gating + dryRun (optional DB + secrets).
 * Run: npx tsx tests/test-send-cloudbeds-graphql-discovery-onboarding-sms.ts
 */
import { eq } from "drizzle-orm";
import {
  shouldSendConnectUrlForOnboardingState,
  sendCloudbedsGraphqlDiscoveryOnboardingSms,
} from "../server/services/sendCloudbedsGraphqlDiscoveryOnboardingSms";
import { db } from "../server/db";
import { sitePmsIntegrations } from "../shared/schema";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function testShouldSendUrl() {
  assert(shouldSendConnectUrlForOnboardingState("missing_auth") === true, "missing_auth");
  assert(shouldSendConnectUrlForOnboardingState("ready_for_discovery_ingest") === false, "ready");
  assert(shouldSendConnectUrlForOnboardingState("blocked") === false, "blocked");
  assert(shouldSendConnectUrlForOnboardingState(null) === true, "null status");
  console.log("shouldSendConnectUrlForOnboardingState: OK");
}

async function testDryRunDb() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.log("SKIP: dryRun (DATABASE_URL)");
    return;
  }
  if (!process.env.APP_URL?.trim() && !process.env.CLIENT_URL?.trim()) {
    console.log("SKIP: dryRun (APP_URL / CLIENT_URL for handoff)");
    return;
  }
  if (!process.env.INTEGRATION_CONNECT_TOKEN_SECRET?.trim()) {
    console.log("SKIP: dryRun (INTEGRATION_CONNECT_TOKEN_SECRET)");
    return;
  }

  const [row] = await db
    .select({ siteConfigId: sitePmsIntegrations.siteConfigId })
    .from(sitePmsIntegrations)
    .where(eq(sitePmsIntegrations.pmsType, "cloudbeds"))
    .limit(1);

  if (!row) {
    console.log("SKIP: dryRun (no cloudbeds row)");
    return;
  }

  const r = await sendCloudbedsGraphqlDiscoveryOnboardingSms({
    siteConfigId: row.siteConfigId,
    toE164: "+15555551234",
    dryRun: true,
    eligibilityMode: "cloudbeds_row_only",
  });

  if (!r.ok && r.code === "SKIPPED_ALREADY_READY") {
    console.log("dryRun: skipped already ready (OK)");
    return;
  }

  assert(r.ok === true && r.dryRun === true && r.smsSent === false, "dryRun shape");
  console.log("sendCloudbedsGraphqlDiscoveryOnboardingSms dryRun: OK");
}

async function main() {
  testShouldSendUrl();
  await testDryRunDb();
  console.log("test-send-cloudbeds-graphql-discovery-onboarding-sms: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
