/**
 * Clean Slate Migration — Comprehensive FK-aware version
 *
 * KEEPS:
 *   - site_configs: 3762eac6-6db8-4c1f-9da7-bb9b727ecd5f (Boardwalk Suites Lafayette)
 *   - admin_users:  ab414898-4018-4060-b2c9-ce8d55536359 (Jason Trindade, superadmin)
 *
 * Run: doppler run -- npx tsx scripts/clean-slate.ts
 */
import { Pool } from 'pg';

const KEEP_SITE_ID  = '3762eac6-6db8-4c1f-9da7-bb9b727ecd5f';
const KEEP_ADMIN_ID = 'ab414898-4018-4060-b2c9-ce8d55536359';

async function tableExists(pool: Pool, name: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = $1 LIMIT 1`, [name]
  );
  return r.rows.length > 0;
}

async function del(pool: Pool, table: string, where: string, params: any[] = []) {
  if (!(await tableExists(pool, table))) {
    console.log(`  skip  ${table} (no table)`);
    return;
  }
  const r = await pool.query(`DELETE FROM ${table} WHERE ${where}`, params);
  console.log(`  ✓ ${table}: deleted ${r.rowCount ?? 0}`);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('=== CLEAN SLATE ===\n');

  // ── Deep leaf tables that reference site_configs ───────────────────────────
  const siteLeafs = [
    'agent_phone_assignments', 'analytics_logs', 'artifact_session_activations',
    'consent_records', 'conversation_events', 'guest_verification_sessions',
    'intake_change_requests', 'knowledge_certification_overrides',
    'onboarding_sessions', 'orchestration_violations', 'orders',
    'patient_vendor_relationships', 'platform_business_map',
    'platform_license_activations', 'qr_routes', 'reseller_commissions',
    'secure_vault_refs', 'share_events', 'site_pms_integrations',
    'slug_landings', 'sms_logs', 'sms_opt_outs', 'storefront_demo_claims',
    'vendors', 'verification_gate_passage_events',
    'verification_installation_api_keys', 'visitor_sessions',
    'voice_usage_logs', 'platform_products', 'chat_logs',
    'nova_idv_sessions_by_site',  // may not exist
  ];

  for (const t of siteLeafs) {
    await del(pool, t, `site_config_id != $1`, [KEEP_SITE_ID]);
  }

  // nova_idv_sessions uses business_id
  await del(pool, 'nova_idv_sessions', `business_id != $1`, [KEEP_SITE_ID]);

  // orchestration runs
  await del(pool, 'agent_orchestration_runs', `site_config_id != $1`, [KEEP_SITE_ID]);

  // platform_number_pool
  await del(pool, 'platform_number_pool', `assigned_to_site_config_id != $1`, [KEEP_SITE_ID]);

  // knowledge_artifacts (site_config_id FK)
  await del(pool, 'knowledge_artifacts', `site_config_id != $1 OR site_config_id IS NULL`, [KEEP_SITE_ID]);

  // agents
  await del(pool, 'agents', `site_config_id != $1`, [KEEP_SITE_ID]);

  // ── Menus chain: menu_items → menu_categories → menus ──────────────────────
  // menu_items FK → menu_categories → menus → site_configs
  await del(pool, 'menu_items', `menu_id IN (SELECT id FROM menus WHERE site_config_id != $1)`, [KEEP_SITE_ID]);
  await del(pool, 'menu_categories', `menu_id IN (SELECT id FROM menus WHERE site_config_id != $1)`, [KEEP_SITE_ID]);
  await del(pool, 'menus', `site_config_id != $1`, [KEEP_SITE_ID]);

  // ── Customer account dependents ────────────────────────────────────────────
  await del(pool, 'customer_sessions', `1=1`);
  await del(pool, 'platform_license_activations', `customer_account_id IS NOT NULL`);
  await del(pool, 'workspace_configurations', `1=1`);
  await del(pool, 'owner_business_data', `1=1`);

  // knowledge_artifacts owner_id FK
  // Already deleted non-boardwalk above; null out owner_id on remaining
  await pool.query(`UPDATE knowledge_artifacts SET owner_id = NULL WHERE site_config_id = $1`, [KEEP_SITE_ID]);
  console.log('  ✓ knowledge_artifacts: cleared owner_id on boardwalk artifacts');

  // Null out owner_id on ALL site_configs BEFORE deleting customer_accounts
  await pool.query(`UPDATE site_configs SET owner_id = NULL`);
  console.log('  ✓ all site_configs: owner_id cleared');

  // customer_accounts (self-referential parent_account_id — clear first)
  await pool.query(`UPDATE customer_accounts SET parent_account_id = NULL WHERE 1=1`);
  await del(pool, 'customer_accounts', `1=1`);

  // auth sessions
  await del(pool, 'auth_sessions', `1=1`);

  // ── Site configs — delete all except Boardwalk ──────────────────────────────
  await del(pool, 'site_configs', `id != $1`, [KEEP_SITE_ID]);

  // ── Final state ─────────────────────────────────────────────────────────────
  console.log('\n=== FINAL STATE ===');
  const sites = await pool.query('SELECT id, name, slug, owner_id FROM site_configs');
  console.log(`site_configs: ${sites.rows.length}`);
  sites.rows.forEach((r: any) => console.log(`  ${r.name} | slug: ${r.slug} | owner: ${r.owner_id || 'unclaimed'}`));

  const admins = await pool.query('SELECT id, phone, name, role FROM admin_users');
  console.log(`admin_users: ${admins.rows.length}`);
  admins.rows.forEach((r: any) => console.log(`  ${r.name} (${r.phone}) role: ${r.role}`));

  const customers = await pool.query('SELECT COUNT(*) n FROM customer_accounts');
  console.log(`customer_accounts: ${customers.rows[0].n}`);

  const agents = await pool.query(
    'SELECT name, role_type FROM agents WHERE site_config_id = $1', [KEEP_SITE_ID]
  );
  console.log(`boardwalk agents: ${agents.rows.length}`);
  agents.rows.forEach((r: any) => console.log(`  ${r.name} | ${r.role_type}`));

  await pool.end();
  console.log('\nClean slate complete.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
