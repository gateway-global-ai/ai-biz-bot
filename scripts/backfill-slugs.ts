import { db } from '../server/db';
import { siteConfigs } from '../shared/schema';
import { isNull, sql } from 'drizzle-orm';

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
    .replace(/-$/, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'biz'}-${suffix}`;
}

async function main() {
  const rows = await db
    .select({ id: siteConfigs.id, name: siteConfigs.name })
    .from(siteConfigs)
    .where(isNull(siteConfigs.slug));

  console.log(`Backfilling slugs for ${rows.length} businesses...`);

  for (const row of rows) {
    const slug = generateSlug(row.name);
    await db.update(siteConfigs)
      .set({ slug })
      .where(sql`id = ${row.id} AND slug IS NULL`);
    console.log(`  ✓ ${row.name} → ${slug}`);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
