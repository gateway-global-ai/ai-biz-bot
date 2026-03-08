#!/usr/bin/env npx tsx
/**
 * Storefront health diagnostic: run against a live server (BASE_URL) or locally (DB only).
 *
 * Remote (diagnose deployed app):
 *   BASE_URL=https://aibizbot-dev.gatewayglobal.ai doppler run -- npx tsx scripts/check-storefront-health.ts
 *   curl the storefront health endpoint and /api/storefronts; report what's broken and what to do.
 *
 * Local (diagnose DB only, no server):
 *   doppler run -- npx tsx scripts/check-storefront-health.ts
 *   Connects to DB and checks storefront_categories; suggests seed if empty.
 */

/** Set BASE_URL explicitly for remote check (e.g. https://aibizbot-dev.gatewayglobal.ai). Leave unset for local DB-only check. */
const BASE_URL = process.env.BASE_URL || '';

async function runRemote(): Promise<void> {
  const healthUrl = `${BASE_URL}/api/health/storefronts`;
  const apiUrl = `${BASE_URL}/api/storefronts`;

  console.log('Storefront health check (remote)\n');
  console.log(`  BASE_URL: ${BASE_URL}`);
  console.log(`  Health:  GET ${healthUrl}`);
  console.log(`  API:     GET ${apiUrl}\n`);

  let healthStatus = 0;
  let healthJson: Record<string, unknown> = {};
  try {
    const hRes = await fetch(healthUrl);
    healthStatus = hRes.status;
    if (hRes.ok) {
      healthJson = (await hRes.json()) as Record<string, unknown>;
    } else {
      const text = await hRes.text();
      if (hRes.status === 404) {
        console.log('❌ GET /api/health/storefronts → 404');
        console.log('');
        console.log('   DIAGNOSIS: Storefront health route is not registered.');
        console.log('   ACTION:    Redeploy the Node server so the latest code is running.');
        console.log('             Ensure server/routes/healthRoutes.ts (with /api/health/storefronts)');
        console.log('             and server/routes.ts (with app.use("/api/storefronts", storefrontRoutes))');
        console.log('             are part of the deployed build, then restart the process (e.g. pm2 restart).');
        process.exit(1);
      }
      console.log(`❌ GET /api/health/storefronts → ${hRes.status}\n${text}`);
      process.exit(1);
    }
  } catch (e: unknown) {
    console.log('❌ Failed to fetch health endpoint:', (e as Error)?.message);
    console.log('   Check BASE_URL and that the server is reachable.');
    process.exit(1);
  }

  const apiRes = await fetch(apiUrl);
  const apiStatus = apiRes.status;
  let apiBody: unknown = null;
  try {
    apiBody = await apiRes.json();
  } catch {
    apiBody = await apiRes.text();
  }

  if (apiStatus === 404) {
    console.log('❌ GET /api/storefronts → 404');
    console.log('');
    console.log('   DIAGNOSIS: Storefront API routes are not registered.');
    console.log('   ACTION:    Redeploy the Node server. Ensure server/routes.ts includes:');
    console.log('             app.use("/api/storefronts", storefrontRoutes);');
    console.log('             Then restart the app (e.g. pm2 restart).');
    process.exit(1);
  }

  const status = healthJson.status as string;
  const checks = (healthJson.checks as { name: string; status: string; message: string; action?: string }[]) ?? [];
  const actions = (healthJson.actions as string[]) ?? [];

  console.log('Results:\n');
  for (const c of checks) {
    const icon = c.status === 'ok' ? '✓' : c.status === 'warn' ? '⚠' : '❌';
    console.log(`  ${icon} ${c.name}: ${c.message}`);
    if (c.action) console.log(`     → ${c.action}`);
  }

  const categories = Array.isArray(apiBody) ? apiBody : (apiBody as { length?: number })?.length ?? 0;
  const listCount = Array.isArray(apiBody) ? apiBody.length : 0;
  console.log(`\n  GET /api/storefronts → ${apiStatus} (${listCount} categor${listCount === 1 ? 'y' : 'ies'} returned)`);

  if (actions.length > 0) {
    console.log('\nRecommended actions:');
    actions.forEach((a) => console.log(`  • ${a}`));
  }

  if (status === 'error' || (status === 'warn' && listCount === 0)) {
    process.exit(1);
  }
  console.log('\n✓ Storefront health check passed.');
}

async function runLocal(): Promise<void> {
  console.log('Storefront health check (local DB)\n');

  const { db } = await import('../server/db.js');
  const { storefrontCategories } = await import('@shared/schema');

  try {
    const rows = await db.select().from(storefrontCategories);
    const count = rows.length;
    console.log(`  storefront_categories: ${count} row(s)`);
    if (count === 0) {
      console.log('');
      console.log('  ⚠ No categories. To populate:');
      console.log('     npm run db:seed-storefronts');
      console.log('');
      process.exit(1);
    }
    rows.forEach((r) => console.log(`    - ${r.slug}: ${r.displayName} (${r.location})`));
    console.log('\n✓ Local storefront DB check passed.');
  } catch (e: unknown) {
    console.log('  ❌ Error:', (e as Error)?.message);
    console.log('');
    console.log('  If the table is missing, run: npm run db:migrate');
    process.exit(1);
  }
}

async function main() {
  if (BASE_URL) {
    await runRemote();
  } else {
    await runLocal();
  }
}

main();
