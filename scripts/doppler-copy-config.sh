#!/usr/bin/env bash
# Copy Doppler secrets from one config to others (e.g. dev → stg, dev → prd).
# Uses Doppler CLI: export from source config, upload to target configs.
# Token vars (DOPPLER_TOKEN, DOPPLER_TOKEN_DEV/STG/PRD) are excluded so dev token is never copied.
# If you use the Doppler web UI to copy config instead, exclude those keys there too — or never store them in Doppler (keep them only in each server's .env). See docs/SOVEREIGN_ENV_MANIFEST.md.
# See: https://docs.doppler.com/docs/how-do-i-duplicate-migrate-secrets-between-configs
#
# Usage:
#   ./scripts/doppler-copy-config.sh              # copy all dev → stg and dev → prd
#   FROM_CONFIG=stg ./scripts/doppler-copy-config.sh   # copy stg → prd only (set TO_CONFIGS)
#   PROJECT=my-app ./scripts/doppler-copy-config.sh    # use specific project
#
# Copy only specific keys (e.g. Stripe / pricing) so stg/prd get missing vars without overwriting others:
#   COPY_KEYS="STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY STRIPE_WEBHOOK_SECRET STRIPE_A2P_WEBHOOK_SECRET STRIPE_PRICE_AI_PRO STRIPE_PRICE_AI_BASIC" ./scripts/doppler-copy-config.sh
#
# Requires: doppler CLI, jq. Uses current Doppler token (doppler login or DOPPLER_TOKEN).

set -e
cd "$(dirname "$0")/.."

PROJECT="${PROJECT:-$(doppler configure get project 2>/dev/null || true)}"
FROM_CONFIG="${FROM_CONFIG:-dev}"
TO_CONFIGS="${TO_CONFIGS:-stg prd}"
# Optional: space-separated list of keys to copy; if unset, copy all.
COPY_KEYS="${COPY_KEYS:-}"

if [[ -z "$PROJECT" ]]; then
  echo "Doppler project not set. Run 'doppler setup' or set PROJECT=your-app-name"
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "jq is required. Install with: apt-get install jq / brew install jq"
  exit 1
fi

echo "Project: $PROJECT"
echo "Source config: $FROM_CONFIG"
echo "Target configs: $TO_CONFIGS"
if [[ -n "$COPY_KEYS" ]]; then
  echo "Copying only: $COPY_KEYS"
fi
echo ""

# Build payload: from FROM_CONFIG, optionally filter to COPY_KEYS, exclude token vars
if [[ -n "$COPY_KEYS" ]]; then
  # Filter to keys in COPY_KEYS (space-separated); token vars are not in COPY_KEYS so safe
  JQ_FILTER='del(.DOPPLER_PROJECT, .DOPPLER_ENVIRONMENT, .DOPPLER_CONFIG) | to_entries | map(select(.key as $k | (($COPY_KEYS | split(" ")) | index($k)) != null)) | map({(.key): (.value | .raw)}) | add'
  EXPORT_JQ=$(doppler secrets --project "$PROJECT" --config "$FROM_CONFIG" --json --raw | jq --arg COPY_KEYS "$COPY_KEYS" "$JQ_FILTER")
else
  JQ_FILTER='del(.DOPPLER_PROJECT, .DOPPLER_ENVIRONMENT, .DOPPLER_CONFIG, .DOPPLER_TOKEN, .DOPPLER_TOKEN_DEV, .DOPPLER_TOKEN_STG, .DOPPLER_TOKEN_PRD) | to_entries | map({(.key): (.value | .raw)}) | add'
  EXPORT_JQ=$(doppler secrets --project "$PROJECT" --config "$FROM_CONFIG" --json --raw | jq "$JQ_FILTER")
fi

for TO_CONFIG in $TO_CONFIGS; do
  if [[ "$TO_CONFIG" == "$FROM_CONFIG" ]]; then
    echo "Skipping $TO_CONFIG (same as source)"
    continue
  fi
  echo "Copying $FROM_CONFIG → $TO_CONFIG ..."
  if [[ -n "$COPY_KEYS" ]]; then
    echo "$EXPORT_JQ" | doppler secrets upload --project "$PROJECT" --config "$TO_CONFIG" --raw /dev/stdin
  else
    echo "$EXPORT_JQ" | doppler secrets upload --project "$PROJECT" --config "$TO_CONFIG" --raw /dev/stdin
  fi
  echo "  Done: $TO_CONFIG"
done

echo ""
echo "Secrets copied. Verify with: doppler secrets --config <config>"
