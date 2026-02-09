#!/usr/bin/env bash
# Run this ON THE STAGING SERVER in the staging app directory.
# Deploys the 'stage' branch (not main). Use for release-candidate testing.
# Usage: ./script/deploy-staging.sh [pm2-app-name]
# Example (from repo root on staging server): ./script/deploy-staging.sh aibizbot-stage.gatewayglobal.ai

set -e
APP_NAME="${1:-aibizbot-stage.gatewayglobal.ai}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Deploying STAGING (branch: stage)..."
echo "==> Fetching and pulling stage..."
git fetch origin
git checkout stage
git pull origin stage

echo "==> Installing deps and building..."
npm ci
npm run build

if command -v pm2 &>/dev/null; then
  echo "==> Restarting PM2 app: $APP_NAME"
  pm2 restart "$APP_NAME" --update-env
  pm2 save
  echo "==> Done. Staging app restarted."
else
  echo "==> Build complete. Start the app manually (e.g. node dist/index.cjs or pm2 start ...)."
fi
