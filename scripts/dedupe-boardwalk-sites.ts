/**
 * Dedupe Boardwalk Suites Lafayette site_configs so only one row exists per place.
 * Keeps the site that has Cloudbeds integration (or the most complete one) and deletes the rest.
 *
 * Run: npx tsx scripts/dedupe-boardwalk-sites.ts [--apply]
 * Without --apply: dry run only (reports what would be kept/deleted).
 */

import { db } from '../server/db.js';
import { siteConfigs, sitePmsIntegrations, agents } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

const BOARDWALK_PLACE_ID = 'ChIJB4qU6oXvJIgR_2p602OaK_U';
const APPLY = process.argv.includes('--apply');

async function main() {
  console.log('🔍 Finding Boardwalk Suites Lafayette site configs...\n');

  const byPlaceId = await db
    .select()
    .from(siteConfigs)
    .where(eq(siteConfigs.placeId, BOARDWALK_PLACE_ID));

  const byName = await db
    .select()
    .from(siteConfigs)
    .where(sql`${siteConfigs.name} ILIKE ${'%Boardwalk Suites Lafayette%'}`);

  const byId = new Map<string | undefined, typeof siteConfigs.$inferSelect>();
  for (const row of [...byPlaceId, ...byName]) {
    if (row?.id) byId.set(row.id, row);
  }
  const all = Array.from(byId.values());

  if (all.length <= 1) {
    console.log(all.length === 0 ? 'No Boardwalk site configs found.' : `Only one Boardwalk site config (id=${all[0].id}). Nothing to dedupe.`);
    process.exit(0);
    return;
  }

  console.log(`Found ${all.length} site config(s):\n`);
  const pmsBySite: Record<string, { id: string; propertyId: string | null }[]> = {};
  const agentsBySite: Record<string, number> = {};

  for (const site of all) {
    const pmsList = await db
      .select()
      .from(sitePmsIntegrations)
      .where(eq(sitePmsIntegrations.siteConfigId, site.id));
    const agentCount = await db
      .select()
      .from(agents)
      .where(eq(agents.siteConfigId, site.id))
      .then((r) => r.length);

    pmsBySite[site.id] = pmsList.map((p) => ({ id: p.id, propertyId: p.propertyId }));
    agentsBySite[site.id] = agentCount;

    const cloudbeds = pmsList.filter((p) => p.pmsType === 'cloudbeds' && p.isActive);
    console.log(`  id: ${site.id}`);
    console.log(`    name: ${site.name}`);
    console.log(`    placeId: ${site.placeId}`);
    console.log(`    createdAt: ${site.createdAt}`);
    console.log(`    Cloudbeds: ${cloudbeds.length > 0 ? `yes (property ${cloudbeds[0].propertyId})` : 'no'}`);
    console.log(`    agents: ${agentCount}`);
    console.log('');
  }

  const withCloudbeds = all.filter((s) => (pmsBySite[s.id] ?? []).some((p) => p.propertyId != null));
  const keeper =
    withCloudbeds[0] ??
    all.filter((s) => s.assignedAgentId != null)[0] ??
    all.sort((a, b) => new Date((b.createdAt ?? 0) as any).getTime() - new Date((a.createdAt ?? 0) as any).getTime())[0];
  const toDelete = all.filter((s) => s.id !== keeper.id);

  console.log(`Keeper: ${keeper.id} (${keeper.name})`);
  console.log(`To delete: ${toDelete.map((s) => s.id).join(', ')}\n`);

  if (!APPLY) {
    console.log('Dry run. Run with --apply to delete duplicates.');
    process.exit(0);
    return;
  }

  for (const site of toDelete) {
    await db.delete(siteConfigs).where(eq(siteConfigs.id, site.id));
    console.log(`Deleted site_config id=${site.id}`);
  }
  console.log('\n✅ Dedupe complete. One Boardwalk site remains.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
