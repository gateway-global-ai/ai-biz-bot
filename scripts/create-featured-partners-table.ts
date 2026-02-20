/**
 * Create featured_partners table in the GRN database.
 * Uses same DB config as SmallBusinessInjector (DB_HOST, DB_PORT, DB_NAME, DB_USER, GRN_STATIC_KEY).
 *
 * Run: doppler run -- npx tsx scripts/create-featured-partners-table.ts
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = {
  host: process.env.DB_HOST || '88.198.6.114',
  port: parseInt(process.env.DB_PORT || '38164', 10),
  database: process.env.DB_NAME || 'static_master',
  user: process.env.DB_USER || 'reporting',
  password: process.env.GRN_STATIC_KEY || process.env.DB_PASSWORD || 'Ghab%j2jK231',
};

async function main() {
  console.log('📦 Connecting to GRN database...');
  console.log(`   Host: ${config.host}:${config.port} DB: ${config.database}`);

  const pool = new pg.Pool(config);

  try {
    const sqlPath = join(__dirname, '..', 'migrations', 'grn', '001_featured_partners.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('🚀 Creating featured_partners table...');
    await pool.query(sql);
    console.log('✅ featured_partners table created successfully.');
  } catch (error: any) {
    if (error.code === '42P07') {
      console.log('✅ featured_partners table already exists.');
    } else {
      console.error('❌ Error:', error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
