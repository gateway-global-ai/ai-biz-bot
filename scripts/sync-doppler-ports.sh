#!/usr/bin/env bash
# Sync PORT_DEV, PORT_STG, PORT_PRD from .env to Doppler configs (dev, stg, prd).
# Each Doppler config has PORT; labeled vars (PORT_DEV, PORT_STG, PORT_PRD) prevent overwrite when pushing env.
# Run from repo root. Requires a Doppler token in .env.
set -e
cd "$(dirname "$0")/.."
ENV_FILE="${ENV_FILE:-.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi
while IFS= read -r line; do
  if [[ "$line" =~ ^(PORT_DEV|PORT_STG|PORT_PRD|DOPPLER_TOKEN|DOPPLER_TOKEN_DEV|DOPPLER_TOKEN_STG|DOPPLER_TOKEN_PRD)= ]]; then
    export "$line"
  fi
done < <(grep -E '^(PORT_DEV|PORT_STG|PORT_PRD|DOPPLER_TOKEN|DOPPLER_TOKEN_DEV|DOPPLER_TOKEN_STG|DOPPLER_TOKEN_PRD)=' "$ENV_FILE" | sed -e 's/^export //' -e 's/^["'\'']//' -e 's/["'\'']$//')
if [[ -z "$DOPPLER_TOKEN" ]]; then
  if [[ -n "$DOPPLER_TOKEN_DEV" ]]; then
    export DOPPLER_TOKEN="$DOPPLER_TOKEN_DEV"
  else
    echo "Set DOPPLER_TOKEN or DOPPLER_TOKEN_DEV in $ENV_FILE"
    exit 1
  fi
fi
echo "Syncing PORT to Doppler configs..."
doppler secrets set "PORT=${PORT_DEV:-3004}" --config dev
doppler secrets set "PORT=${PORT_STG:-3003}" --config stg
doppler secrets set "PORT=${PORT_PRD:-3002}" --config prd
echo "Done. dev=${PORT_DEV:-3004} stg=${PORT_STG:-3003} prd=${PORT_PRD:-3002}"
