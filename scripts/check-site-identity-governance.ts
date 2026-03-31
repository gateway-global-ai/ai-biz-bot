/**
 * Governance gate: block `eq(siteConfigs.placeId` outside allowlisted migration/storage/test paths.
 *
 * Google `place_id` must not be used as a join or resolution primitive for platform scope — see
 * SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md.
 *
 * Run: npm run validate:site-identity
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");

/** Paths (repo-relative, forward slashes) where querying by `site_configs.place_id` is still allowed. */
const ALLOWLIST_EQ_SITE_CONFIGS_PLACE_ID = new Set([
  "scripts/setup-boardwalk-suites.ts",
  "scripts/dedupe-boardwalk-sites.ts",
  "scripts/lib/boardwalkSiteIdentity.ts",
  "scripts/provision-boardwalk-agents.ts",
  "server/storage.ts",
  "tests/test-guardrails.ts",
  "tests/test-frontdesk-projection.ts",
  "tests/test-intake-governance-smoke.ts",
  "scripts/check-site-identity-governance.ts",
]);

const FORBIDDEN_SUBSTRING = "eq(siteConfigs.placeId";

function walkTs(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (
      name === "node_modules" ||
      name === "dist" ||
      name === "_legacy_archive" ||
      name === ".git" ||
      name === "legacy-ui-reference"
    ) {
      continue;
    }
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkTs(p, out);
    else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

function main(): void {
  const files = walkTs(ROOT).filter((f) => {
    const rel = relative(ROOT, f).replace(/\\/g, "/");
    return rel.startsWith("scripts/") || rel.startsWith("server/") || rel.startsWith("client/src/");
  });

  const violations: string[] = [];
  for (const abs of files) {
    const rel = relative(ROOT, abs).replace(/\\/g, "/");
    if (ALLOWLIST_EQ_SITE_CONFIGS_PLACE_ID.has(rel)) continue;
    const text = readFileSync(abs, "utf8");
    if (text.includes(FORBIDDEN_SUBSTRING)) {
      violations.push(
        `${rel}: forbidden pattern "${FORBIDDEN_SUBSTRING}" — platform scope must use site_configs.id (see SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md)`,
      );
    }
  }

  if (violations.length > 0) {
    console.error("validate:site-identity FAILED\n");
    for (const v of violations) console.error(`  • ${v}`);
    console.error("\nAllowlist updates require governance review.");
    process.exit(1);
  }
  console.log("validate:site-identity OK (eq(siteConfigs.placeId) only in allowlisted paths)");
}

main();
