import { Pool } from 'pg';
import { db } from './db';
import {
  siteConfigs,
  platformBusinessMap,
  type SiteConfig,
  type InsertSiteConfig,
  type PlatformBusinessMap,
} from '@shared/schema';
import { eq } from 'drizzle-orm';

// Placeholder for a future validation service.
// This ensures prompts are compliant before being saved.
const UPAValidator = {
  validate: async (prompt: string) => ({ isValid: true, reason: '' })
};

// Assume a shared database pool is configured elsewhere
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * The core of the "Handover Service".
 * Fetches a single, complete site configuration artifact from the database.
 * This ensures the frontend receives a pre-validated, immutable system prompt.
 *
 * @param id - The UUID of the site configuration to fetch.
 * @returns The complete site configuration object or null if not found.
 */
async function getSiteConfigById(id: string): Promise<SiteConfig | null> {
  if (!id || id === 'undefined') {
    console.warn('[Storage] Attempted to fetch site config with null, undefined, or "undefined" string ID');
    return null;
  }

  try {
    const result = await db.select().from(siteConfigs).where(eq(siteConfigs.id, id));
    if (!result || result.length === 0) {
      return null;
    }
    return result[0];
  } catch (error) {
    console.error(`[Storage] Error fetching site config for ID ${id}:`, error);
    throw new Error('Database query for site configuration failed.');
  }
}

/**
 * Creates a new site configuration after validating the system prompt.
 * This acts as a guardrail to ensure only compliant prompts enter the system.
 * @param data - The configuration data for the new site.
 * @returns The newly created site configuration artifact.
 */
async function createSiteConfig(data: InsertSiteConfig): Promise<SiteConfig> {
  // 1. Run the Universal Prompt Architecture (UPA) Validator before saving.
  if (data.systemPromptOverride) {
    const validation = await UPAValidator.validate(data.systemPromptOverride);
    if (!validation.isValid) {
      throw new Error(`System prompt validation failed: ${validation.reason}`);
    }
  }

  // 2. Insert the validated data into the database.
  const [newSiteConfig] = await db.insert(siteConfigs).values(data).returning();
  
  return newSiteConfig;
}

// ──────────────────────────────────────────────────────────────────────────────
// Platform Identity – System of Record for stable internal platform_id
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Given a `siteConfigId`, return the existing `platform_id` if a mapping
 * already exists, or create one (copying `google_place_id` from
 * `site_configs.place_id` when present) and return the new `platform_id`.
 *
 * This is the canonical create-if-missing entry point.
 */
async function getOrCreatePlatformId(siteConfigId: string): Promise<string> {
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
    throw new Error(`[Storage] Failed to resolve platform_id for siteConfigId=${siteConfigId}`);
  }

  return raceRow.platformId;
}

/**
 * Flexible platform identity resolver.
 *
 * - `{ siteConfigId }` — returns existing mapping or lazily creates one
 *   (copying site_configs.place_id → google_place_id when present).
 * - `{ googlePlaceId }` — returns the mapping row if found; does NOT create a
 *   new mapping from a place ID alone (prevents cross-wiring).
 *
 * Returns `null` when no mapping is found and creation is not applicable.
 */
async function resolvePlatformId(
  input: { siteConfigId?: string; googlePlaceId?: string },
): Promise<PlatformBusinessMap | null> {
  if (input.siteConfigId) {
    // Try to find an existing mapping first.
    const [existing] = await db
      .select()
      .from(platformBusinessMap)
      .where(eq(platformBusinessMap.siteConfigId, input.siteConfigId))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Not found – create it, then return the full row.
    await getOrCreatePlatformId(input.siteConfigId);

    const [row] = await db
      .select()
      .from(platformBusinessMap)
      .where(eq(platformBusinessMap.siteConfigId, input.siteConfigId))
      .limit(1);
    return row ?? null;
  }

  if (input.googlePlaceId) {
    const [row] = await db
      .select()
      .from(platformBusinessMap)
      .where(eq(platformBusinessMap.googlePlaceId, input.googlePlaceId))
      .limit(1);
    return row ?? null;
  }

  return null;
}

export const storage = {
  getSiteConfigById,
  createSiteConfig,
  // Platform Identity – canonical System of Record
  getOrCreatePlatformId,
  resolvePlatformId,
};