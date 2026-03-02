#!/usr/bin/env bash
# Run this ON THE DEV SERVER in the dev app directory.
# Deploys main (or current branch). Runs: pull → stop app → migrate → install → build → start.
# Usage: ./script/deploy-dev.sh [pm2-app-name]
# Example: ./script/deploy-dev.sh aibizbot-dev.gatewayglobal.ai

set -e
APP_NAME="${1:-aibizbot-dev.gatewayglobal.ai}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
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

if command -v pm2 &>/dev/null; then
  echo "==> Restarting PM2 app: $APP_NAME"
  pm2 restart "$APP_NAME" --update-env
  pm2 save
  echo "==> Done. Dev app started."
else
  echo "==> Build complete. Start the app manually (e.g. doppler run -- npm run dev or pm2 start ...)."
fi
