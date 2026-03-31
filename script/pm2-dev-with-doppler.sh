#!/usr/bin/env bash
# Start the dev stack (tsx + Vite) with Doppler **dev** secrets — required for
# INTEGRATION_CONNECT_TOKEN_SECRET, DATABASE_URL, Cloudbeds keys, etc.
# PM2 must NOT run plain `npm run dev` on the server or connect-token exchange returns invalid.
#
# Usage (from repo root):
#   chmod +x script/pm2-dev-with-doppler.sh
#   pm2 delete aibizbot-dev.gatewayglobal.ai 2>/dev/null || true
#   pm2 start script/pm2-dev-with-doppler.sh --name aibizbot-dev.gatewayglobal.ai --cwd "$(pwd)" --time
#   pm2 save
set -euo pipefail
cd "$(dirname "$0")/.."
exec doppler run --config dev -- npm run dev
