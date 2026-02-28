#!/usr/bin/env bash
# Sync PORT_DEV, PORT_STG, PORT_PRD from .env to Doppler configs (dev, stg, prd).
# Run from repo root. Requires a Doppler token in .env (see canonical names below).
set -e
cd "$(dirname "$0")/.."
ENV_FILE="${ENV_FILE:-.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi
# Load only port and token vars (no export of other secrets).
# Canonical token names: DOPPLER_TOKEN_DEV, DOPPLER_TOKEN_STG, DOPPLER_TOKEN_PRD (Doppler CLI reads DOPPLER_TOKEN).
while IFS= read -r line; do
  if [[ "$line" =~ ^(PORT_DEV|PORT_STG|PORT_PRD|DOPPLER_TOKEN|DOPPLER_TOKEN_DEV|DOPPLER_TOKEN_STG|DOPPLER_TOKEN_PRD)= ]]; then
    export "$line"
  fi
done < <(grep -E '^(PORT_DEV|PORT_STG|PORT_PRD|DOPPLER_TOKEN|DOPPLER_TOKEN_DEV|DOPPLER_TOKEN_STG|DOPPLER_TOKEN_PRD)=' "$ENV_FILE" | sed -e 's/^export //' -e 's/^["'\'']//' -e 's/["'\'']$//')
# Doppler CLI reads DOPPLER_TOKEN; use dev token for sync if not already set
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
echo "Done. dev=$PORT_DEV stg=$PORT_STG prd=$PORT_PRD"
