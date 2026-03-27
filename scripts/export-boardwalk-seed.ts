/**
 * Export Boardwalk Suites Lafayette as a canonical reference seed.
 * Output: scripts/reference/boardwalk-suites-lafayette.seed.json
 *
 * Run: doppler run -- npx tsx scripts/export-boardwalk-seed.ts
 */
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const BOARDWALK_SITE_ID = '3762eac6-6db8-4c1f-9da7-bb9b727ecd5f';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('Exporting Boardwalk Suites Lafayette reference seed...');

  // 1. Site config
  const siteRes = await pool.query(
    'SELECT * FROM site_configs WHERE id = $1',
    [BOARDWALK_SITE_ID]
  );
  const site = siteRes.rows[0];
  if (!site) {
    console.error('Boardwalk site not found — aborting');
    process.exit(1);
  }
  console.log(`  ✓ site_config: ${site.name}`);

  // 2. Agents
  const agentCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'agents' ORDER BY ordinal_position`
  );
  const agentColNames = agentCols.rows.map((r: any) => r.column_name);
  const hasRoleType = agentColNames.includes('role_type');
  const hasSiteConfigId = agentColNames.includes('site_config_id');

  let agents: any[] = [];
  if (hasSiteConfigId) {
    const agentsRes = await pool.query(
      'SELECT * FROM agents WHERE site_config_id = $1',
      [BOARDWALK_SITE_ID]
    );
    agents = agentsRes.rows;
  }
  console.log(`  ✓ agents: ${agents.length}`);

  // 3. Knowledge artifacts
  const kaCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'knowledge_artifacts' ORDER BY ordinal_position`
  );
  const kaColNames = kaCols.rows.map((r: any) => r.column_name);
  const hasSiteId = kaColNames.includes('site_id');
  const hasAgentAccessKey = kaColNames.includes('agent_access_key');

  let artifacts: any[] = [];
  if (hasSiteId) {
    const kaRes = await pool.query(
      'SELECT * FROM knowledge_artifacts WHERE site_id = $1',
      [BOARDWALK_SITE_ID]
    );
    artifacts = kaRes.rows;
  } else if (hasAgentAccessKey) {
    // Fall back to title-based lookup for boardwalk artifacts
    const kaRes = await pool.query(
      `SELECT * FROM knowledge_artifacts WHERE title ILIKE '%boardwalk%' OR title ILIKE '%cloudbeds%'`
    );
    artifacts = kaRes.rows;
  }
  console.log(`  ✓ knowledge_artifacts: ${artifacts.length}`);

  // 4. PMS integrations
  const pmsCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'site_pms_integrations' ORDER BY ordinal_position`
  );
  let pmsIntegration: any = null;
  if (pmsCols.rows.length > 0) {
    const pmsRes = await pool.query(
      'SELECT * FROM site_pms_integrations WHERE site_config_id = $1 LIMIT 1',
      [BOARDWALK_SITE_ID]
    );
    pmsIntegration = pmsRes.rows[0] || null;
    // Scrub any API keys before saving
    if (pmsIntegration?.api_key) pmsIntegration.api_key = '[REDACTED]';
    if (pmsIntegration?.access_token) pmsIntegration.access_token = '[REDACTED]';
    if (pmsIntegration?.refresh_token) pmsIntegration.refresh_token = '[REDACTED]';
  }
  console.log(`  ✓ pms_integration: ${pmsIntegration ? 'found' : 'none'}`);

  // 5. Workspace configurations
  let workspaceConfig: any = null;
  try {
    const wsRes = await pool.query(
      'SELECT * FROM workspace_configurations WHERE site_config_id = $1 LIMIT 1',
      [BOARDWALK_SITE_ID]
    );
    workspaceConfig = wsRes.rows[0] || null;
    if (workspaceConfig?.access_token) workspaceConfig.access_token = '[REDACTED]';
    if (workspaceConfig?.refresh_token) workspaceConfig.refresh_token = '[REDACTED]';
  } catch {
    // table may not exist
  }

  // Build seed object
  const seed = {
    _meta: {
      exported_at: new Date().toISOString(),
      site_id: BOARDWALK_SITE_ID,
      purpose: 'Canonical reference for programmatic hospitality site generation',
      schema_version: '1.0',
    },
    site_config: site,
    agents,
    knowledge_artifacts: artifacts,
    pms_integration: pmsIntegration,
    workspace_config: workspaceConfig,
  };

  const outPath = path.join(process.cwd(), 'scripts/reference/boardwalk-suites-lafayette.seed.json');
  fs.writeFileSync(outPath, JSON.stringify(seed, null, 2));

  console.log(`\n  Seed written to: ${outPath}`);
  console.log(`  Site config keys: ${Object.keys(site).length}`);
  console.log(`  Agents: ${agents.length}`);
  console.log(`  Knowledge artifacts: ${artifacts.length}`);

  await pool.end();
  console.log('\nDone.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
