#!/usr/bin/env bash
# Sync PORT_DEV, PORT_STG, PORT_PRD from .env to Doppler configs (dev, stg, prd).
# Run from repo root. Uses DOPPLER_SERVICE_TOKEN from .env for write access.
set -e
cd "$(dirname "$0")/.."
ENV_FILE="${ENV_FILE:-.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi
# Load only port and token vars (no export of other secrets)
while IFS= read -r line; do
  if [[ "$line" =~ ^(PORT_DEV|PORT_STG|PORT_PRD|DOPPLER_SERVICE_TOKEN)= ]]; then
    export "$line"
  fi
done < <(grep -E '^(PORT_DEV|PORT_STG|PORT_PRD|DOPPLER_SERVICE_TOKEN)=' "$ENV_FILE" | sed -e 's/^export //' -e 's/^["'\'']//' -e 's/["'\'']$//')
if [[ -z "$DOPPLER_SERVICE_TOKEN" ]]; then
  echo "DOPPLER_SERVICE_TOKEN not set in $ENV_FILE"
  exit 1
fi
export DOPPLER_TOKEN="$DOPPLER_SERVICE_TOKEN"
echo "Syncing PORT to Doppler configs..."
doppler secrets set "PORT=${PORT_DEV:-3004}" --config dev
doppler secrets set "PORT=${PORT_STG:-3003}" --config stg
doppler secrets set "PORT=${PORT_PRD:-3002}" --config prd
echo "Done. dev=$PORT_DEV stg=$PORT_STG prd=$PORT_PRD"
