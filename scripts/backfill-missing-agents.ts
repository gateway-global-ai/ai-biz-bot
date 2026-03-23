/**
 * Backfill Agent Provisioning
 *
 * Finds all site_configs with 0 agents and runs provisionAgentsForBusiness()
 * on each one. Skips platform/test sites by ID.
 *
 * Run: doppler run -- npx tsx scripts/backfill-missing-agents.ts
 */

import { db } from '../server/db.js';
import { storage } from '../server/storage.js';
import { siteConfigs, agents } from '../shared/schema.js';
import { sql, eq } from 'drizzle-orm';
import { provisionAgentsForBusiness } from '../server/services/agentProvisioning.js';

// Skip platform-level pseudo-sites
const SKIP_IDS = new Set(['platform', 'platform_landing']);

async function run() {
  console.log('[Backfill] Finding sites with 0 agents...');

  const rows = await db.execute(sql`
    SELECT sc.id, sc.slug, sc.name, sc.place_data
    FROM site_configs sc
    LEFT JOIN agents a ON a.site_config_id = sc.id
    GROUP BY sc.id, sc.slug, sc.name, sc.place_data
    HAVING COUNT(a.id) = 0
    ORDER BY sc.name
  `);

  const sites = rows.rows as Array<{ id: string; slug: string | null; name: string; place_data: any }>;
  console.log(`[Backfill] Found ${sites.length} sites needing provisioning`);

  let provisioned = 0;
  let skipped = 0;
  let failed = 0;

  for (const site of sites) {
    if (SKIP_IDS.has(site.id)) {
      console.log(`[Backfill] SKIP (platform site): ${site.name}`);
      skipped++;
      continue;
    }

    const placeTypes: string[] = (site.place_data as { types?: string[] } | null)?.types ?? ['establishment'];

    try {
      console.log(`[Backfill] Provisioning: "${site.name}" (${site.id}) — types: ${placeTypes.slice(0, 3).join(', ')}`);
      const result = await provisionAgentsForBusiness(site.id, placeTypes, site.name);
      console.log(`  ✓ Created ${result.agentsCreated} agents (${result.industryGroup}): ${result.archetypesProvisioned.join(', ')}`);
      provisioned++;
    } catch (err: any) {
      console.error(`  ✗ FAILED for "${site.name}": ${err.message}`);
      failed++;
    }
  }

  console.log(`\n[Backfill] Done.`);
  console.log(`  Provisioned: ${provisioned}`);
  console.log(`  Skipped:     ${skipped}`);
  console.log(`  Failed:      ${failed}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('[Backfill] Fatal:', err);
  process.exit(1);
});
