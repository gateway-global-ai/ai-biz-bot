/**
 * validateCloudbedsGraphqlDiscoveryConfiguration — gap detection + optional HTTP probe (skip in CI).
 * Run: doppler run -- npx tsx tests/test-cloudbeds-graphql-discovery-validation.ts
 */

import { eq } from "drizzle-orm";
import { sitePmsIntegrations } from "../shared/schema.ts";
import { db } from "../server/db.ts";
import { validateCloudbedsGraphqlDiscoveryConfiguration } from "../server/services/validateCloudbedsGraphqlDiscoveryConfiguration.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.log("SKIP: DATABASE_URL not set");
    return;
  }

  const [row] = await db
    .select({ siteConfigId: sitePmsIntegrations.siteConfigId })
    .from(sitePmsIntegrations)
    .where(eq(sitePmsIntegrations.pmsType, "cloudbeds"))
    .limit(1);

  if (!row) {
    console.log("SKIP: no site_pms_integrations row");
    return;
  }

  const r = await validateCloudbedsGraphqlDiscoveryConfiguration(row.siteConfigId, {
    skipHttpValidation: true,
  });
  assert(r.ok === true && r.persisted === true, "expected persisted validation result");
  assert(typeof r.status === "string", "status");
  assert(Array.isArray(r.missing_fields), "missing_fields");
  assert(
    r.last_validation_status === "success" || r.last_validation_status === "failed" || r.last_validation_status === "skipped",
    "last_validation_status",
  );
  console.log("test-cloudbeds-graphql-discovery-validation: OK", {
    siteConfigId: row.siteConfigId,
    status: r.status,
    missing_fields: r.missing_fields,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
