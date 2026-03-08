/**
 * Seed storefront_categories with test categories (e.g. Nail Salons, Las Vegas).
 * Idempotent: upserts by slug.
 * Usage: doppler run -- npx tsx scripts/seed-storefront-categories.ts
 */

import { db } from '../server/db.js';
import { storefrontCategories } from '@shared/schema';
import { sql } from 'drizzle-orm';

const SEED_CATEGORIES = [
  {
    slug: 'nail-salons',
    displayName: 'Nail Salons',
    location: 'Las Vegas, NV',
    searchQuery: 'nail salons',
    industryGroup: 'health_wellness',
    lat: 36.1699,
    lng: -115.1398,
    heroImageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1920&q=80', // Nail salon / spa — replace with your reference image path (e.g. /storefront-hero-nail-salons.jpg) if desired
  },
];

async function seed() {
  console.log('Seeding storefront_categories...');
  for (const row of SEED_CATEGORIES) {
    await db
      .insert(storefrontCategories)
      .values({
        slug: row.slug,
        displayName: row.displayName,
        location: row.location,
        searchQuery: row.searchQuery,
        industryGroup: row.industryGroup,
        heroImageUrl: (row as { heroImageUrl?: string }).heroImageUrl ?? null,
        lat: row.lat,
        lng: row.lng,
      })
      .onConflictDoUpdate({
        target: storefrontCategories.slug,
        set: {
          displayName: row.displayName,
          location: row.location,
          searchQuery: row.searchQuery,
          industryGroup: row.industryGroup,
          heroImageUrl: (row as { heroImageUrl?: string }).heroImageUrl ?? null,
          lat: row.lat,
          lng: row.lng,
          updatedAt: new Date(),
        },
      });
    console.log(`  ✓ ${row.slug} (${row.displayName}, ${row.location})`);
  }
  const count = await db.select().from(storefrontCategories);
  console.log(`Done. Total categories: ${count.length}`);
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
