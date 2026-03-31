/**
 * Read-only: Boardwalk Cloudbeds auth posture + one live GET to Cloudbeds (getHotelDetails).
 *
 * Loads optional dotenv from `env.local` in repo root **before** DB import (do not commit secrets).
 *
 * Usage:
 *   npx tsx scripts/diagnose-boardwalk-cloudbeds-auth.ts
 *
 * Prints only non-secret booleans, property id, HTTP status, and high-level error strings.
 */
import * as path from "path";
import * as fs from "fs";
import { config as dotenvConfig } from "dotenv";
import type { SitePmsIntegration } from "../shared/schema";
import { boardwalkSiteConfigIdFromEnv, resolveBoardwalkSiteConfigId } from "./lib/boardwalkSiteIdentity";

const ROOT = path.resolve(import.meta.dirname, "..");
const envPath = path.join(ROOT, "env.local");
if (fs.existsSync(envPath)) {
  dotenvConfig({ path: envPath });
  console.log(`[diagnose] Loaded dotenv from env.local`);
} else {
  console.log(`[diagnose] env.local not found — using process env only`);
}

const { eq } = await import("drizzle-orm");
const { db } = await import("../server/db.js");
const { sitePmsIntegrations } = await import("../shared/schema.js");
const cloudbedsApi = await import("../server/services/cloudbedsApi.js");

const {
  cloudbedsGetJson,
  effectivePropertyId,
  loadCloudbedsPmsRow,
  resolvePmsAuthHeaders,
  accessTokenUrl,
} = cloudbedsApi;

async function run(): Promise<void> {
  const hasDb = Boolean(process.env.DATABASE_URL?.trim());
  console.log(`[diagnose] DATABASE_URL: ${hasDb ? "set" : "MISSING"}`);
  console.log(`[diagnose] CLOUDBEDS_CLIENT_ID: ${process.env.CLOUDBEDS_CLIENT_ID ? "set" : "MISSING"}`);
  console.log(`[diagnose] CLOUDBEDS_CLIENT_SECRET: ${process.env.CLOUDBEDS_CLIENT_SECRET ? "set" : "MISSING"}`);
  console.log(`[diagnose] CLOUDBEDS_CLIENT_CALLBACK_URL: ${process.env.CLOUDBEDS_CLIENT_CALLBACK_URL ? "set" : "MISSING"}`);
  console.log(
    `[diagnose] CLOUDBEDS_CLIENT_API_KEY / CLOUDBEDS_API_KEY (global fallback): ${process.env.CLOUDBEDS_CLIENT_API_KEY || process.env.CLOUDBEDS_API_KEY ? "set" : "MISSING"}`,
  );
  console.log(`[diagnose] CLOUDBEDS_CLIENT_PROPERTY_ID: ${process.env.CLOUDBEDS_CLIENT_PROPERTY_ID ?? "(unset)"}`);
  console.log(`[diagnose] Cloudbeds token endpoint: ${accessTokenUrl()}`);

  const fromEnv = boardwalkSiteConfigIdFromEnv();
  if (fromEnv) {
    console.log(`[diagnose] site_configs.id from BOARDWALK_SITE_CONFIG_ID / E2E_SITE_CONFIG_ID: ${fromEnv}`);
  }

  if (!hasDb) {
    console.error("[diagnose] Need DATABASE_URL to resolve PMS row or legacy Boardwalk lookup.");
    process.exit(1);
  }

  let siteConfigId = fromEnv;
  let pms: SitePmsIntegration | undefined;

  if (!siteConfigId) {
    const resolved = await resolveBoardwalkSiteConfigId();
    if (resolved) {
      siteConfigId = resolved.siteConfigId;
      console.log(
        `[diagnose] site_configs.id resolved (source=${resolved.source}): ${siteConfigId}` +
          (resolved.source === "legacy_google_place_id_migration_shim"
            ? " — migration shim only; set BOARDWALK_SITE_CONFIG_ID (see SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md)"
            : ""),
      );
    }
  }

  if (siteConfigId) {
    pms = await loadCloudbedsPmsRow(siteConfigId);
  }

  if (!pms) {
    console.log(
      `[diagnose] No PMS row for resolved site_configs.id — trying first cloudbeds row in DB, then env-only synthetic.`,
    );
    const [anyRow] = await db.select().from(sitePmsIntegrations).where(eq(sitePmsIntegrations.pmsType, "cloudbeds")).limit(1);
    if (anyRow) {
      pms = anyRow;
      siteConfigId = anyRow.siteConfigId;
      console.log(`[diagnose] Using first cloudbeds site_pms_integrations row; site_config_id=${siteConfigId}`);
    }
  }

  if (!pms) {
    console.log(`[diagnose] site_pms_integrations: no cloudbeds row — trying synthetic row + global CLOUDBEDS_* API key`);
  } else {
    const oauth =
      Boolean(pms.accessToken && pms.refreshToken && pms.tokenExpiresAt) ||
      Boolean(pms.accessToken && !pms.apiKey);
    console.log(`[diagnose] site_pms_integrations row: id=${pms.id}`);
    console.log(`[diagnose]   propertyId (row): ${pms.propertyId ?? "(null)"}`);
    console.log(`[diagnose]   apiKey on row: ${pms.apiKey ? "set" : "unset"}`);
    console.log(`[diagnose]   accessToken: ${pms.accessToken ? "set" : "unset"}`);
    console.log(`[diagnose]   refreshToken: ${pms.refreshToken ? "set" : "unset"}`);
    console.log(`[diagnose]   tokenExpiresAt: ${pms.tokenExpiresAt ? String(pms.tokenExpiresAt) : "(null)"}`);
    console.log(`[diagnose]   inferred auth path: ${oauth ? "OAuth Bearer (+ refresh)" : "x-api-key (row or global)"}`);
  }

  let row: SitePmsIntegration;
  if (pms) {
    row = pms;
  } else {
    const propEnv = process.env.CLOUDBEDS_CLIENT_PROPERTY_ID?.trim() || process.env.CLOUDBEDS_PROPERTY_ID?.trim();
    if (!propEnv) {
      console.error("[diagnose] No PMS row and no CLOUDBEDS_CLIENT_PROPERTY_ID — cannot probe Cloudbeds.");
      process.exit(1);
    }
    row = {
      id: "00000000-0000-0000-0000-000000000001",
      siteConfigId: "synthetic-env-only",
      pmsType: "cloudbeds",
      propertyId: propEnv,
      apiKey: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      bookingEngineUrl: null,
      config: {},
      isActive: true,
      authLane: null,
      scopesGranted: [],
      apiVersionLane: null,
      installPosture: "connected",
      connectionHealth: {},
      lastSuccessAt: null,
      lastErrorAt: null,
      lastRefreshAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SitePmsIntegration;
    console.log(`[diagnose] Synthetic PMS row (env global key / property ${propEnv})`);
  }

  const prop = effectivePropertyId(row);
  if (!prop) {
    console.error("[diagnose] No effective property ID (row + env).");
    process.exit(1);
  }
  console.log(`[diagnose] effective propertyID for GET: ${prop}`);

  try {
    const { headers } = await resolvePmsAuthHeaders(row);
    const mode = headers.Authorization?.startsWith("Bearer ")
      ? "Bearer"
      : headers["x-api-key"]
        ? "x-api-key"
        : "unknown";
    console.log(`[diagnose] resolvePmsAuthHeaders mode: ${mode}`);

    const r = await cloudbedsGetJson(row, "getHotelDetails", { propertyID: prop });
    console.log(`[diagnose] getHotelDetails HTTP status: ${r.status}, ok: ${r.ok}`);
    if (!r.ok) {
      const j = r.json as Record<string, unknown> | null;
      const msg = j && typeof j === "object" ? JSON.stringify(j).slice(0, 400) : String(r.json).slice(0, 400);
      console.log(`[diagnose] response body (truncated): ${msg}`);
    } else {
      const j = r.json as Record<string, unknown> | null;
      const name =
        j && typeof j === "object" && j.data && typeof j.data === "object"
          ? (j.data as Record<string, unknown>).propertyName
          : undefined;
      console.log(`[diagnose] propertyName (if present): ${name ?? "(n/a)"}`);
    }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error(`[diagnose] ERROR: ${err.slice(0, 500)}`);
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
