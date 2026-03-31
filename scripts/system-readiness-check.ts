#!/usr/bin/env npx tsx
/**
 * SYSTEM_READINESS_CHECK — single entry for operational self-description.
 *
 *   npm run system:check              human-readable full report
 *   npm run system:check -- --json   stdout: single JSON object (agents / CI / tools)
 *   npm run system:check -- --governance-focus   same as governance:test-readiness layout
 *
 * @see docs-governance/canonical/SYSTEM_READINESS_CHECK_V1.md
 */
import "dotenv/config";
import { buildSystemReadinessReport } from "./lib/systemReadinessCore.js";
import { printFullTextReport, printGovernancePreflightOnly } from "./lib/systemReadinessPrint.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const governanceOnly = argv.includes("--governance-focus");

  const report = await buildSystemReadinessReport();

  if (json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }

  if (governanceOnly) {
    printGovernancePreflightOnly(report);
    return;
  }

  printFullTextReport(report);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
