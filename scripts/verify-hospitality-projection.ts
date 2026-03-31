#!/usr/bin/env npx tsx
/**
 * CLI wrapper for verifyHospitalityProjectionDeep (see server/services/hospitalityProjectionVerify.ts).
 *
 * Usage:
 *   doppler run -- npx tsx scripts/verify-hospitality-projection.ts <siteConfigId>
 */
import "dotenv/config";
import { verifyHospitalityProjectionDeep } from "../server/services/hospitalityProjectionVerify.js";

async function main(): Promise<void> {
  const siteConfigId = process.argv[2]?.trim();
  if (!siteConfigId) {
    console.error("Usage: verify-hospitality-projection.ts <siteConfigId>");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required (use doppler run -- …).");
    process.exit(1);
  }

  const result = await verifyHospitalityProjectionDeep(siteConfigId);
  if (!result.ok) {
    console.error("[verify-hospitality-projection] FAILED\n" + result.errors.map((e) => `  - ${e}`).join("\n"));
    process.exit(1);
  }
  console.log(result.summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
