#!/usr/bin/env bash
# Run this ON THE DEV SERVER in the dev app directory.
# Deploys main (or current branch). Runs: pull → stop app → migrate → install → build → start.
# Usage: ./script/deploy-dev.sh [pm2-app-name]
# Example: ./script/deploy-dev.sh aibizbot-dev.gatewayglobal.ai

set -e
APP_NAME="${1:-aibizbot-dev.gatewayglobal.ai}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/pm2-reload-app.sh
source "$REPO_ROOT/script/lib/pm2-reload-app.sh"
cd "$REPO_ROOT"

echo "==> Deploying DEV..."
git fetch origin
BRANCH=$(git branch --show-current)
echo "==> Pulling branch: $BRANCH"
git pull origin "$BRANCH" || { echo "⚠️  Pull failed (no remote ref?). Continuing with local code."; }

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
echo "==> Done. Dev app started."
