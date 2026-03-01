#!/usr/bin/env bash
# Run all root-level migrations in migrations/*.sql in numeric order.
# Requires: DATABASE_URL in environment (use doppler run -- or npm run db:migrate).
# Usage: doppler run -- ./scripts/run-all-migrations.sh   or   npm run db:migrate
set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL not set. Run: doppler run -- ./scripts/run-all-migrations.sh"
  exit 1
fi
echo "==> Running all migrations (migrations/*.sql)..."
for f in $(ls migrations/*.sql 2>/dev/null | sort -V); do
  echo "==> $f"
  npx tsx scripts/run-migration.ts "$f" || exit 1
done
echo "==> All migrations completed."
