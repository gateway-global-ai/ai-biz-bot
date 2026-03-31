/**
 * getCloudbedsGraphqlDiscoveryOnboardingStatus + deriveCloudbedsGraphqlDiscoveryOnboardingSummary
 * Run: npx tsx tests/test-cloudbeds-graphql-discovery-onboarding-status.ts
 * DB smoke: doppler run -- npx tsx tests/test-cloudbeds-graphql-discovery-onboarding-status.ts
 */

import { eq } from "drizzle-orm";
import type { CloudbedsGraphqlDiscoveryV1Config } from "../shared/cloudbedsGraphqlDiscoveryOnboarding.ts";
import { sitePmsIntegrations } from "../shared/schema.ts";
import { db } from "../server/db.ts";
import {
  deriveCloudbedsGraphqlDiscoveryOnboardingSummary,
  getCloudbedsGraphqlDiscoveryOnboardingStatus,
} from "../server/services/getCloudbedsGraphqlDiscoveryOnboardingStatus.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function testDerive() {
  const d0 = deriveCloudbedsGraphqlDiscoveryOnboardingSummary(null);
  assert(d0.isReadyForIngest === false, "null config not ready");
  assert(d0.missingFields.length === 0, "null missingFields []");
  assert(d0.hasHttpUrl === false, "null hasHttpUrl");
  assert(d0.hasOnboardingState === false, "null hasOnboardingState");
  assert(d0.canBeginSecureAuthHandoff === false, "null handoff");

  const ready: CloudbedsGraphqlDiscoveryV1Config = {
    http_url: "https://gql.example.com/graphql",
    onboarding: {
      status: "ready_for_discovery_ingest",
      missing_fields: [],
    },
  };
  const dr = deriveCloudbedsGraphqlDiscoveryOnboardingSummary(ready);
  assert(dr.isReadyForIngest === true, "ready ingest");
  assert(dr.hasHttpUrl === true, "has url");
  assert(dr.hasOnboardingState === true, "has onboarding");
  assert(dr.missingFields.length === 0, "ready missing []");

  const missingUrl: CloudbedsGraphqlDiscoveryV1Config = {
    onboarding: {
      status: "missing_http_url",
      missing_fields: ["http_url"],
    },
  };
  const dm = deriveCloudbedsGraphqlDiscoveryOnboardingSummary(missingUrl);
  assert(dm.isReadyForIngest === false, "missing url not ready");
  assert(dm.hasHttpUrl === false, "no url");
  assert(dm.missingFields.join(",") === "http_url", "echo missing_fields");

  const missingAuth: CloudbedsGraphqlDiscoveryV1Config = {
    onboarding: { status: "missing_auth", missing_fields: ["credential"] },
  };
  const da = deriveCloudbedsGraphqlDiscoveryOnboardingSummary(missingAuth);
  assert(da.canBeginSecureAuthHandoff === true, "missing_auth handoff");

  const handoff: CloudbedsGraphqlDiscoveryV1Config = {
    onboarding: { status: "pending_secure_auth_handoff" },
  };
  assert(
    deriveCloudbedsGraphqlDiscoveryOnboardingSummary(handoff).canBeginSecureAuthHandoff === true,
    "pending_secure handoff",
  );

  const unverified: CloudbedsGraphqlDiscoveryV1Config = {
    onboarding: { status: "auth_received_unverified" },
  };
  assert(
    deriveCloudbedsGraphqlDiscoveryOnboardingSummary(unverified).canBeginSecureAuthHandoff === false,
    "auth_received_unverified no handoff",
  );

  const badFields = {
    onboarding: {
      status: "missing_auth" as const,
      missing_fields: ["x", 1, "y"],
    },
  } as unknown as CloudbedsGraphqlDiscoveryV1Config;
  const bad = deriveCloudbedsGraphqlDiscoveryOnboardingSummary(badFields);
  assert(bad.missingFields.join(",") === "x,y", "normalize missing_fields to strings only");

  console.log("test deriveCloudbedsGraphqlDiscoveryOnboardingSummary: OK");
}

async function testGetEmpty() {
  const r = await getCloudbedsGraphqlDiscoveryOnboardingStatus("");
  assert(r.integrationPresent === false, "empty id no integration");
  assert(r.lanePresent === false, "empty lane");
  assert(r.onboarding === null, "empty onboarding state");
}

async function testGetDbSmoke() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.log("SKIP: get smoke (DATABASE_URL)");
    return;
  }
  const [row] = await db
    .select({ siteConfigId: sitePmsIntegrations.siteConfigId })
    .from(sitePmsIntegrations)
    .where(eq(sitePmsIntegrations.pmsType, "cloudbeds"))
    .limit(1);
  if (!row) {
    console.log("SKIP: get smoke (no cloudbeds row)");
    return;
  }
  const r = await getCloudbedsGraphqlDiscoveryOnboardingStatus(row.siteConfigId);
  assert(r.integrationPresent === true, "smoke integration");
  assert(typeof r.lanePresent === "boolean", "smoke lanePresent");
  assert(Array.isArray(r.derived.missingFields), "smoke missingFields array");
  console.log("test getCloudbedsGraphqlDiscoveryOnboardingStatus (DB): OK", {
    siteConfigId: r.siteConfigId,
    lanePresent: r.lanePresent,
    onboarding: r.onboarding,
  });
}

async function main() {
  testDerive();
  await testGetEmpty();
  await testGetDbSmoke();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
