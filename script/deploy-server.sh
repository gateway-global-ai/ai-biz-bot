#!/usr/bin/env bash
# Run this ON THE SERVER in the app directory after you push to GitHub.
# Runs: pull → stop app (free port) → migrate → install → build → start app.
# Usage: ./script/deploy-server.sh [pm2-app-name]
# Example (from repo root on server): ./script/deploy-server.sh aibizbot.gatewayglobal.ai

set -e
APP_NAME="${1:-aibizbot.gatewayglobal.ai}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Fetching and pulling main..."
git fetch origin
git checkout main
git pull origin main

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
  echo "==> Done. App started."
else
  echo "==> Build complete. Start the app manually (e.g. node dist/index.mjs or pm2 start ...)."
fi
