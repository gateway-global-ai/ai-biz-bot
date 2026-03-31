/**
 * Back-compat alias: same data as `npm run system:check` but governance-focused text layout.
 *
 * Prefer for CI/docs that referenced this script name:
 *   npm run governance:test-readiness
 *
 * Full report + JSON:
 *   npm run system:check
 *   npm run system:check -- --json
 *
 * @see docs-governance/canonical/GOVERNANCE_TEST_READINESS_V1.md
 * @see docs-governance/canonical/SYSTEM_READINESS_CHECK_V1.md
 */
import "dotenv/config";
import { buildSystemReadinessReport } from "./lib/systemReadinessCore.js";
import { printGovernancePreflightOnly } from "./lib/systemReadinessPrint.js";

async function main(): Promise<void> {
  const report = await buildSystemReadinessReport();
  printGovernancePreflightOnly(report);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
