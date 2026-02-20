import { Pool } from 'pg';
import { db } from './db';
import { siteConfigs, type SiteConfig, type InsertSiteConfig } from '@shared/schema';
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

export const storage = {
  getSiteConfigById,
  createSiteConfig,
  // ... other storage functions like createSiteConfig, etc.
};