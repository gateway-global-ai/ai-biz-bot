/**
 * Boardwalk Suites Lafayette demo — **canonical platform identity is `site_configs.id` (UUID)** only.
 *
 * Google `place_id` is **not** platform identity. It must never be used as primary scope for routing,
 * auth, or durable joins. See `SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md`.
 *
 * **Migration shim:** resolving a row by stored Google `place_id` is allowed **only** inside
 * `resolveBoardwalkSiteConfigIdLegacyGooglePlaceIdMigrationShimOnly()` with explicit env + non-production guards.
 *
 * @see docs-governance/canonical/SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md
 */

import type { SiteConfigId } from "../../shared/siteIdentity.js";
import { asSiteConfigId } from "../../shared/siteIdentity.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Legacy Google Places id — **not** platform truth; only referenced by migration shim. */
export const BOARDWALK_GOOGLE_PLACE_ID_LEGACY = "ChIJB4qU6oXvJIgR_2p602OaK_U" as const;

/** Documented removal target for the Google place_id migration shim (extend only via governance revision). */
export const LEGACY_GOOGLE_PLACE_ID_SHIM_REMOVAL_TARGET = "2026-12-31" as const;

const MIGRATION_ENV = "GOVERNANCE_LEGACY_GOOGLE_PLACE_ID_LOOKUP";

export function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

/**
 * Preferred env vars for the Boardwalk demo `site_configs.id` (set after `npm run setup:boardwalk`
 * or from the admin UI / API).
 */
export function boardwalkSiteConfigIdFromEnv(): SiteConfigId | undefined {
  for (const key of ["BOARDWALK_SITE_CONFIG_ID", "E2E_SITE_CONFIG_ID"] as const) {
    const v = process.env[key]?.trim();
    if (v && isUuid(v)) return asSiteConfigId(v);
  }
  return undefined;
}

export type ResolveBoardwalkSiteConfigIdSource = "env" | "legacy_google_place_id_migration_shim";

export type ResolveBoardwalkSiteConfigIdResult = {
  siteConfigId: SiteConfigId;
  source: ResolveBoardwalkSiteConfigIdSource;
};

function migrationShimAllowedByEnv(): boolean {
  return process.env[MIGRATION_ENV]?.trim() === "1";
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * **Migration / local repair only.** Resolves Boardwalk demo UUID by querying `site_configs` where
 * `place_id` equals the legacy constant. **Never** use this as a normal identity pattern.
 *
 * - Blocked when `NODE_ENV === 'production'`.
 * - Requires `GOVERNANCE_LEGACY_GOOGLE_PLACE_ID_LOOKUP=1`.
 * - Emits a loud warning every time.
 */
export async function resolveBoardwalkSiteConfigIdLegacyGooglePlaceIdMigrationShimOnly(): Promise<ResolveBoardwalkSiteConfigIdResult | null> {
  if (isProductionRuntime()) {
    return null;
  }
  if (!migrationShimAllowedByEnv()) {
    return null;
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return null;
  }

  console.warn(
    `[GOVERNANCE][MIGRATION-ONLY] Boardwalk resolution via Google place_id lookup is NOT platform identity. ` +
      `Set BOARDWALK_SITE_CONFIG_ID. Removal target: ${LEGACY_GOOGLE_PLACE_ID_SHIM_REMOVAL_TARGET}. ` +
      `Env: ${MIGRATION_ENV}=1`,
  );

  const { db } = await import("../../server/db.js");
  const { siteConfigs } = await import("../../shared/schema.js");
  const { eq } = await import("drizzle-orm");

  const [row] = await db
    .select({ id: siteConfigs.id })
    .from(siteConfigs)
    .where(eq(siteConfigs.placeId, BOARDWALK_GOOGLE_PLACE_ID_LEGACY))
    .limit(1);

  if (!row) return null;
  return { siteConfigId: asSiteConfigId(row.id), source: "legacy_google_place_id_migration_shim" };
}

/**
 * Normal entry: **env UUID first**, then optional **migration shim** (explicitly gated; never in production).
 */
export async function resolveBoardwalkSiteConfigId(): Promise<ResolveBoardwalkSiteConfigIdResult | null> {
  const fromEnv = boardwalkSiteConfigIdFromEnv();
  if (fromEnv) {
    return { siteConfigId: fromEnv, source: "env" };
  }
  return resolveBoardwalkSiteConfigIdLegacyGooglePlaceIdMigrationShimOnly();
}
