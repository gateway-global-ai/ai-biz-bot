#!/usr/bin/env bash
# Run this ON THE STAGING SERVER in the staging app directory.
# Deploys the 'stage' branch. Runs: pull → stop app → migrate → install → build → start.
# Usage: ./script/deploy-staging.sh [pm2-app-name]
# Doppler: run `doppler setup` in this directory with config stg (PORT 3003). .env has DOPPLER_TOKEN_STG.

set -e
APP_NAME="${1:-aibizbot-stage.gatewayglobal.ai}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/pm2-reload-app.sh
source "$REPO_ROOT/script/lib/pm2-reload-app.sh"
cd "$REPO_ROOT"

echo "==> Deploying STAGING (branch: stage)..."
echo "==> Fetching and pulling stage..."
git fetch origin
git checkout stage
git pull origin stage

if command -v pm2 &>/dev/null; then
  echo "==> Stopping PM2 app (free port)..."
  pm2 stop "$APP_NAME" 2>/dev/null || true
fi

echo "==> Running migrations..."
npm run db:migrate || { echo "⚠️  Migrations failed (check Doppler/DATABASE_URL). Continuing."; }

echo "==> Installing deps and building..."
npm ci
npm run build

pm2_reload_app "$APP_NAME" "$REPO_ROOT"
echo "==> Done. Staging app started."
