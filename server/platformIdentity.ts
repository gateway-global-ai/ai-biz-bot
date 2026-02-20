/**
 * platformIdentity.ts
 *
 * Utility helpers for resolving / creating the stable internal `platform_id`
 * for a business.  This is the foundational layer that future work can use
 * to decouple internal references from mutable external identifiers such as
 * Google `place_id`.
 *
 * Usage
 * -----
 *   import { resolvePlatformId, findByGooglePlaceId } from './platformIdentity';
 *
 *   // Get (or lazily create) the platform_id for a site config:
 *   const platformId = await resolvePlatformId('site-config-uuid');
 *
 *   // Look up a mapping row by Google place_id:
 *   const row = await findByGooglePlaceId('ChIJ...');
 */

import { eq } from "drizzle-orm";
import { db } from "./db";
import { platformBusinessMap, siteConfigs, type PlatformBusinessMap } from "@shared/schema";

/**
 * Given a `siteConfigId`, return the existing `platform_id` if a mapping
 * already exists, or create one (copying `google_place_id` from
 * `site_configs.place_id` when present) and return the new `platform_id`.
 */
export async function resolvePlatformId(siteConfigId: string): Promise<string> {
  // 1. Try to find an existing mapping.
  const [existing] = await db
    .select({ platformId: platformBusinessMap.platformId })
    .from(platformBusinessMap)
    .where(eq(platformBusinessMap.siteConfigId, siteConfigId))
    .limit(1);

  if (existing) {
    return existing.platformId;
  }

  // 2. Fetch the associated site config so we can copy place_id if present.
  const [siteConfig] = await db
    .select({ placeId: siteConfigs.placeId })
    .from(siteConfigs)
    .where(eq(siteConfigs.id, siteConfigId))
    .limit(1);

  // 3. Insert a new mapping row.  ON CONFLICT DO NOTHING guards against a
  //    race condition; if another request inserted between steps 1 and 3 we
  //    re-fetch and return the winner's platformId.
  const inserted = await db
    .insert(platformBusinessMap)
    .values({
      siteConfigId,
      googlePlaceId: siteConfig?.placeId ?? null,
    })
    .onConflictDoNothing()
    .returning({ platformId: platformBusinessMap.platformId });

  if (inserted.length > 0) {
    return inserted[0].platformId;
  }

  // Race condition: another request already inserted – fetch the existing row.
  const [raceRow] = await db
    .select({ platformId: platformBusinessMap.platformId })
    .from(platformBusinessMap)
    .where(eq(platformBusinessMap.siteConfigId, siteConfigId))
    .limit(1);

  if (!raceRow) {
    throw new Error(`[platformIdentity] Failed to resolve platform_id for siteConfigId=${siteConfigId}`);
  }

  return raceRow.platformId;
}

/**
 * Find the mapping row for a given `siteConfigId`, or null if none exists.
 */
export async function findBySiteConfigId(siteConfigId: string): Promise<PlatformBusinessMap | null> {
  const [row] = await db
    .select()
    .from(platformBusinessMap)
    .where(eq(platformBusinessMap.siteConfigId, siteConfigId))
    .limit(1);

  return row ?? null;
}

/**
 * Find the mapping row by `google_place_id`, or null if none exists.
 */
export async function findByGooglePlaceId(googlePlaceId: string): Promise<PlatformBusinessMap | null> {
  const [row] = await db
    .select()
    .from(platformBusinessMap)
    .where(eq(platformBusinessMap.googlePlaceId, googlePlaceId))
    .limit(1);

  return row ?? null;
}
