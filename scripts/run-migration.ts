/**
 * Run migration SQL file
 * Usage: tsx scripts/run-migration.ts migrations/0002_business_data_tour_guide.sql
 */

import { readFileSync } from 'fs';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: tsx scripts/run-migration.ts <migration-file.sql>');
  process.exit(1);
}

async function runMigration() {
  try {
    console.log(`📄 Reading migration file: ${migrationFile}`);
    const sqlContent = readFileSync(migrationFile, 'utf-8');
    
    console.log('🚀 Executing migration...');
    await db.execute(sql.raw(sqlContent));
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
