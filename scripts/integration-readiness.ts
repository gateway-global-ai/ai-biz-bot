/**
 * One-shot operator checklist: platform secrets vs tenant integration rows.
 *
 * Run: npm run integration:readiness
 * Does not print secret values — only whether vars are set and PMS row status.
 */

import "dotenv/config";
import { execSync } from "child_process";
import { and, eq } from "drizzle-orm";
import { db } from "../server/db.js";
import { siteConfigs, sitePmsIntegrations } from "../shared/schema.js";
import { boardwalkSiteConfigIdFromEnv, resolveBoardwalkSiteConfigId } from "./lib/boardwalkSiteIdentity.js";

function maskLen(name: string): string {
  const n = process.env[name]?.length ?? 0;
  return n > 0 ? `set (len=${n})` : "missing";
}

function tryDopplerScope(): void {
  try {
    const out = execSync("doppler configure get project config 2>/dev/null", {
      encoding: "utf8",
      maxBuffer: 64 * 1024,
    });
    const lines = out
      .split("\n")
      .filter((l) => l.includes("project") || l.includes("config"))
      .slice(0, 6)
      .join("\n");
    console.log(lines || out.trim().slice(0, 400));
  } catch {
    console.log("  (Doppler CLI not linked here — run: doppler configure from repo root)");
  }
}

async function boardwalkPmsSummary(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.log("  site_pms_integrations: cannot check (DATABASE_URL missing)");
    return;
  }
  try {
    let site: (typeof siteConfigs.$inferSelect) | undefined;

    const envId = boardwalkSiteConfigIdFromEnv();
    if (envId) {
      const [byId] = await db.select().from(siteConfigs).where(eq(siteConfigs.id, envId)).limit(1);
      site = byId;
    }
    if (!site) {
      const resolved = await resolveBoardwalkSiteConfigId();
      if (resolved) {
        const [byId] = await db.select().from(siteConfigs).where(eq(siteConfigs.id, resolved.siteConfigId)).limit(1);
        site = byId;
      }
    }
    if (!site) {
      console.log(
        "  Boardwalk site: no site_configs row — run setup:boardwalk, set BOARDWALK_SITE_CONFIG_ID, or (dev only) GOVERNANCE_LEGACY_GOOGLE_PLACE_ID_LOOKUP=1 for migration shim",
      );
      return;
    }
    const [pms] = await db
      .select()
      .from(sitePmsIntegrations)
      .where(
        and(eq(sitePmsIntegrations.siteConfigId, site.id), eq(sitePmsIntegrations.pmsType, "cloudbeds")),
      )
      .limit(1);
    if (!pms) {
      console.log(`  Boardwalk Cloudbeds row: none (site ${site.id})`);
      return;
    }
    const cred = Boolean(pms.apiKey || pms.accessToken);
    console.log(
      `  Boardwalk Cloudbeds row: present (active=${pms.isActive}, cred=${cred}, propertyId=${pms.propertyId ?? "—"})`,
    );
  } catch (e: unknown) {
    console.log(`  DB check failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function main(): Promise<void> {
  console.log("Integration readiness\n");
  console.log("1) Platform env (doppler run or shell)");
  console.log(`   DATABASE_URL      ${maskLen("DATABASE_URL")}`);
  console.log(`   GEMINI_API_KEY    ${maskLen("GEMINI_API_KEY")}`);
  console.log(
    `   CLOUDBEDS_API_KEY ${process.env.CLOUDBEDS_API_KEY ? maskLen("CLOUDBEDS_API_KEY") : "not set (OK for prod — use DB per tenant)"}`,
  );

  console.log("\n2) Doppler scope (this repo)");
  tryDopplerScope();

  console.log("\n3) Tenant model (production voice / tools)");
  console.log("   Live inventory uses site_pms_integrations per site — not global CLOUDBEDS_*.");
  await boardwalkPmsSummary();

  console.log("\n4) Next steps");
  console.log("   • New hotel: upsert site_pms_integrations (api_key + property_id) for that site_config_id.");
  console.log("   • Smoke: npm run test:cloudbeds  (DB path is required; global env is optional)");
  console.log("   • Avoid empty CLOUDBEDS_API_KEY in Doppler — empty secrets override your shell when using doppler run.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
