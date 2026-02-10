#!/usr/bin/env bash
# Run this ON THE SERVER in the app directory after you push to GitHub.
# Usage: ./script/deploy-server.sh [pm2-app-name]
# Example (from repo root on server): ./script/deploy-server.sh aibizbot.gatewayglobal.ai

set -e
APP_NAME="${1:-aibizbot.gatewayglobal.ai}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Fetching and pulling main..."
git fetch origin
git checkout main
git pull origin main || { echo "!! Git pull failed, but continuing with build..."; }

echo "==> Installing deps and building..."
npm ci || { echo "!! npm ci failed, attempting npm install..."; npm install; }
npm run build

echo "==> Running database migrations..."
npm run db:push || { echo "!! DB push failed, manual check required."; }

if command -v pm2 &>/dev/null; then
  echo "==> Restarting PM2 app: $APP_NAME"
  pm2 restart "$APP_NAME" --update-env || pm2 start dist/index.cjs --name "$APP_NAME"
  pm2 save
  echo "==> Done. App restarted."
else
  echo "==> Build complete. Start the app manually (e.g. node dist/index.cjs or pm2 start ...)."
fi
