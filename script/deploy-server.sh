#!/usr/bin/env bash
# Run this ON THE SERVER in the app directory after you push to GitHub.
# Runs: pull → stop app (free port) → migrate → install → build → start app.
# Usage: ./script/deploy-server.sh [pm2-app-name]
# Example (from repo root on server): ./script/deploy-server.sh aibizbot.gatewayglobal.ai

set -e
APP_NAME="${1:-aibizbot.gatewayglobal.ai}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/pm2-reload-app.sh
source "$REPO_ROOT/script/lib/pm2-reload-app.sh"
cd "$REPO_ROOT"

echo "==> Fetching and pulling main..."
git fetch origin
git checkout main
git pull origin main

# user_uploads/ is gitignored. For public media (e.g. user_uploads/hero_video.mp4 → GET /user_uploads/hero_video.mp4),
# copy files onto the server separately if they are not already present.

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
echo "==> Done. App started."
