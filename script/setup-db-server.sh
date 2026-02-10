#!/usr/bin/env bash
# Idempotent one-time setup: create PostgreSQL user and database to match DATABASE_URL in .env.
# Run from repo root after: npm install, and with PostgreSQL already installed.
# Usage: ./script/setup-db-server.sh

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -f ".env" ]; then
  echo "No .env file found in $REPO_ROOT. Create one from .env.example and set DATABASE_URL."
  exit 1
fi

# Load .env so DATABASE_URL is available for node (and optional psql checks)
set -a
# shellcheck disable=SC1090
source <(grep -v '^#' .env | grep -v '^$' | sed 's/^/export /') 2>/dev/null || true
set +a
export DATABASE_URL="${DATABASE_URL:-}"

# Parse DATABASE_URL; write user, db, escaped password to temp file (one value per line)
TMPF=$(mktemp)
trap 'rm -f "$TMPF"' EXIT
node -e "
require('dotenv').config();
const u = require('url').parse(process.env.DATABASE_URL || '');
if (!u.auth) {
  console.error('DATABASE_URL in .env is missing or invalid');
  process.exit(1);
}
const auth = u.auth.split(':');
const user = auth[0] || '';
const pass = auth.slice(1).join(':');
const decoded = pass ? decodeURIComponent(pass) : '';
const db = (u.pathname || '').replace(/^\//, '') || 'gateway_ai';
const escaped = decoded.replace(/'/g, \"''\");
require('fs').writeFileSync(process.argv[1], user + '\n' + db + '\n' + escaped, 'utf8');
" "$TMPF" || { echo "Failed to parse DATABASE_URL"; exit 1; }

# Read three values (user, db, password); last read may hit EOF without newline so use || true to avoid set -e exit
{ IFS= read -r DB_USER; IFS= read -r DB_NAME; IFS= read -r DB_PASS || true; } < "$TMPF"

if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
  echo "Could not parse DATABASE_URL from .env. Ensure it looks like postgresql://USER:PASSWORD@localhost:5432/DBNAME"
  exit 1
fi

echo "Creating PostgreSQL user '$DB_USER' and database '$DB_NAME' (idempotent)..."
# Create user if not exists (Postgres: DO block with exception)
sudo -u postgres psql -v ON_ERROR_STOP=0 -c "DO \$\$ BEGIN CREATE USER $DB_USER WITH PASSWORD '$DB_PASS'; EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;" 2>/dev/null || true
# Create database if not exists (ignore "already exists" error)
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || echo "Database $DB_NAME may already exist."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
echo "Done. Run 'npm run db:push' in the app directory to apply schema."
