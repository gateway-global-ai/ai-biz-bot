#!/usr/bin/env bash
# Run this ON THE STAGING SERVER in the staging app directory.
# Deploys the 'stage' branch. Runs: pull → stop app → migrate → install → build → start.
# Usage: ./script/deploy-staging.sh [pm2-app-name]

set -e
APP_NAME="${1:-aibizbot-stage.gatewayglobal.ai}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
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

if command -v pm2 &>/dev/null; then
  echo "==> Starting PM2 app: $APP_NAME"
  pm2 start "$APP_NAME" --update-env || pm2 restart "$APP_NAME" --update-env
  pm2 save
  echo "==> Done. Staging app started."
else
  echo "==> Build complete. Start the app manually (e.g. node dist/index.mjs or pm2 start ...)."
fi
