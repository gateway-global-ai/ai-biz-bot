/**
 * Run migration SQL file. Skips if already applied (tracked in schema_migrations).
 * Requires DATABASE_URL from Doppler.
 * Usage: tsx scripts/run-migration.ts <migration-file.sql>
 */

import { readFileSync } from 'fs';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: tsx scripts/run-migration.ts <migration-file.sql>');
  process.exit(1);
}

const filename = path.basename(migrationFile);

async function runMigration() {
  try {
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY
      )
    `));

    const safe = filename.replace(/'/g, "''");
    const existing = await db.execute(
      sql.raw(`SELECT 1 FROM schema_migrations WHERE filename = '${safe}'`)
    );
    if (existing.rows && existing.rows.length > 0) {
      console.log(`⏭️  Already applied: ${filename}`);
      process.exit(0);
      return;
    }

    console.log(`📄 Reading migration file: ${migrationFile}`);
    const sqlContent = readFileSync(migrationFile, 'utf-8');

    console.log('🚀 Executing migration...');
    await db.execute(sql.raw(sqlContent));

    await db.execute(
      sql.raw(`INSERT INTO schema_migrations (filename) VALUES ('${safe}')`)
    );

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    const msg = error?.message ?? '';
    if (msg.includes('already exists') || msg.includes('duplicate key')) {
      console.log(`⏭️  Already applied (DB state): ${filename}`);
      try {
        const safe = filename.replace(/'/g, "''");
        await db.execute(
          sql.raw(`INSERT INTO schema_migrations (filename) VALUES ('${safe}') ON CONFLICT (filename) DO NOTHING`)
        );
      } catch (_) {}
      process.exit(0);
    }
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
