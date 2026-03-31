#!/usr/bin/env bash
# Push public HTTPS origins to Doppler per config (dev / stg / prd).
# Sets APP_URL, WEBHOOK_BASE_URL, CLIENT_URL, SERVER_URL, API_URL — all origin-only (no path).
#
# Optional overrides in .env (same line format as PORT_DEV in sync-doppler-ports):
#   APP_URL_DEV   APP_URL_STG   APP_URL_PRD
#
# Defaults when unset:
#   dev → https://aibizbot-dev.gatewayglobal.ai
#   stg → https://aibizbot-stage.gatewayglobal.ai
#   prd → https://aibizbot.gatewayglobal.ai
#
# Usage:
#   ./scripts/sync-doppler-public-urls.sh
#   npm run doppler:sync-public-urls
#
set -e
cd "$(dirname "$0")/.."
ENV_FILE="${ENV_FILE:-.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE (need DOPPLER_TOKEN or DOPPLER_TOKEN_DEV)"
  exit 1
fi

while IFS= read -r line; do
  if [[ "$line" =~ ^(APP_URL_DEV|APP_URL_STG|APP_URL_PRD|DOPPLER_TOKEN|DOPPLER_TOKEN_DEV|DOPPLER_TOKEN_STG|DOPPLER_TOKEN_PRD)= ]]; then
    export "$line"
  fi
done < <(grep -E '^(APP_URL_DEV|APP_URL_STG|APP_URL_PRD|DOPPLER_TOKEN|DOPPLER_TOKEN_DEV|DOPPLER_TOKEN_STG|DOPPLER_TOKEN_PRD)=' "$ENV_FILE" | sed -e 's/^export //' -e 's/^["'\'']//' -e 's/["'\'']$//')

if [[ -z "$DOPPLER_TOKEN" ]]; then
  if [[ -n "$DOPPLER_TOKEN_DEV" ]]; then
    export DOPPLER_TOKEN="$DOPPLER_TOKEN_DEV"
  else
    echo "Set DOPPLER_TOKEN or DOPPLER_TOKEN_DEV in $ENV_FILE"
    exit 1
  fi
fi

strip_slash() {
  local s="$1"
  echo "${s%/}"
}

DEV_URL="$(strip_slash "${APP_URL_DEV:-https://aibizbot-dev.gatewayglobal.ai}")"
STG_URL="$(strip_slash "${APP_URL_STG:-https://aibizbot-stage.gatewayglobal.ai}")"
PRD_URL="$(strip_slash "${APP_URL_PRD:-https://aibizbot.gatewayglobal.ai}")"

set_urls_for_config() {
  local cfg="$1"
  local base="$2"
  echo "→ config=$cfg base=$base"
  doppler secrets set "APP_URL=${base}" --config "$cfg"
  doppler secrets set "WEBHOOK_BASE_URL=${base}" --config "$cfg"
  doppler secrets set "CLIENT_URL=${base}" --config "$cfg"
  doppler secrets set "SERVER_URL=${base}" --config "$cfg"
  doppler secrets set "API_URL=${base}/api" --config "$cfg"
}

echo "Syncing public URLs to Doppler..."
set_urls_for_config dev "$DEV_URL"
set_urls_for_config stg "$STG_URL"
set_urls_for_config prd "$PRD_URL"

echo "Done."
echo "  dev APP_URL=$DEV_URL"
echo "  stg APP_URL=$STG_URL"
echo "  prd APP_URL=$PRD_URL"
echo "Restart PM2 (or doppler run processes) so apps load the new values."
