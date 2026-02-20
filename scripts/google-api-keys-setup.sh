#!/usr/bin/env bash
# =============================================================================
# Google API Keys Setup – Three-Key Strategy (Corrective / Idempotent)
# =============================================================================
# Creates and restricts three keys for ai-biz-bot: Server Maps, Client UI, Gemini.
# Run once per environment. Eliminates manual config errors that cause silent 403s
# or billing leaks. Key 1 and Key 3 must stay in the same GCP project so Gemini
# Maps Grounding cross-service verification succeeds.
#
# REQUIREMENTS: gcloud CLI (authenticated), jq
#
# STEP 1 – Authenticate and set project (run before this script):
#   gcloud auth login
#   gcloud config set project ai-biz-bot
#
# STEP 2 – Run this script (capture output for Doppler):
#   ./scripts/google-api-keys-setup.sh
#
# STEP 3 – Post-execution:
#   • Copy each "doppler secrets set ..." line and run it to sync keys.
#   • Key 2 (Client): In Console, add HTTP referrer restriction *.gatewayglobal.ai/*
#   • Wait 5 minutes for restrictions to propagate.
#
# STEP 4 – Verify:
#   ./scripts/run-with-doppler.sh check-keys
# =============================================================================

set -e
PROJECT_ID="${GOOGLE_CLOUD_PROJECT_ID:-ai-biz-bot}"
ENVIRONMENT_TAG="development" # E.g., development, staging, production
SERVER_IP="${SERVER_IP:-}"  # Optional: set to server IP for Key 1 IP restriction

# Prerequisite check
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: 'gcloud' command not found. Please install the Google Cloud CLI."
    echo "See: https://cloud.google.com/sdk/docs/install"
    exit 1
fi
if ! command -v jq &> /dev/null; then
    echo "❌ Error: 'jq' command not found. Please install jq (e.g., 'sudo apt-get install jq')."
    exit 1
fi

echo "=== Google API Keys Setup (Three-Key Strategy) ==="
echo "Project: $PROJECT_ID"
echo ""

gcloud config set project "$PROJECT_ID"

# API Keys update requires project number, not project ID
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
echo "Project number: $PROJECT_NUMBER"

echo "Verifying project billing status..."
BILLING_ENABLED=$(gcloud billing projects describe "$PROJECT_ID" --format="value(billingEnabled)")
if [ "$BILLING_ENABLED" != "True" ]; then
  echo "❌ Error: Billing is not enabled for project '$PROJECT_ID'."
  echo "Please enable billing in the Google Cloud Console before proceeding:"
  echo "https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
  exit 1
fi
echo "✅ Billing is enabled."

echo "Enabling required APIs..."
gcloud services enable \
  generativelanguage.googleapis.com \
  mapstools.googleapis.com \
  places.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com

echo ""
echo "--- Applying Environment Tag ---"
ORG_ID=$(gcloud projects get-ancestors "$PROJECT_ID" --format="value(id)" | tail -1)
if [ -n "$ORG_ID" ]; then
  echo "Found Organization ID: $ORG_ID"
  echo "Applying tag: environment = $ENVIRONMENT_TAG"
  # Create key and value, ignoring errors if they already exist
  gcloud resource-manager tags keys create environment --parent="organizations/$ORG_ID" >/dev/null 2>&1 || true
  gcloud resource-manager tags values create "$ENVIRONMENT_TAG" --parent="organizations/$ORG_ID/tagKeys/environment" >/dev/null 2>&1 || true
  
  # Bind the tag to the project, ignoring errors if it's already bound
  gcloud resource-manager tags bindings create \
    --tag-value="organizations/$ORG_ID/tagKeys/environment/$ENVIRONMENT_TAG" \
    --parent="//cloudresourcemanager.googleapis.com/projects/$PROJECT_ID" \
    --location=global >/dev/null 2>&1 || echo "Tag binding may already exist."
else
  echo "⚠️  Could not determine Organization ID. Skipping environment tagging."
fi

# Helper: print key string and Doppler command when available
_print_key_and_doppler() {
  local doppler_var="$1"
  local key_name="$2"
  local key_id
  key_id=$(echo "$key_name" | awk -F'/' '{print $NF}')
  local key_string=""
  # Attempt to get the key string, redirecting stderr to /dev/null.
  # The command will not exit the script due to `set -e` if it fails.
  key_string=$(gcloud alpha services api-keys get-key-string "$key_id" --format="value(keyString)" 2>/dev/null)

  # Check if the key_string was successfully retrieved.
  # The gcloud command might not be available or could fail.
  if [ -n "$key_string" ]; then
    echo "  → doppler secrets set $doppler_var=$key_string"
  else
    echo "  → Retrieve key from: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
    echo "  → Then: doppler secrets set $doppler_var=<key_value>"
  fi
}

# Resolve key name for update (create returns one format, list/update use project number + uid)
_resolve_key_name() {
    local display_name="$1"
    # Retry loop to handle the eventual consistency of the list command
    for i in {1..5}; do
        local key_name
        key_name=$(gcloud alpha services api-keys list --format="json" 2>/dev/null | jq -r --arg dn "$display_name" '.[] | select(.displayName == $dn) | .name' | head -1)
        if [ -n "$key_name" ]; then
            echo "$key_name"
            return
        fi
        sleep 2
    done
}

# Key 1: Server (Maps/Grounding) – IP restricted
echo ""
echo "--- Key 1: Server (Maps/Grounding) ---"
SERVER_KEY_JSON=$(gcloud alpha services api-keys create --display-name="Server-Maps-Grounding-Key" --format="json" 2>/dev/null || true)
if [ -n "$SERVER_KEY_JSON" ]; then
  OPERATION_OR_KEY=$(echo "$SERVER_KEY_JSON" | jq -r '.name // empty')
  if [[ "$OPERATION_OR_KEY" == *"/operations/"* ]]; then
    echo "Waiting for Key 1 creation operation to complete..."
    gcloud alpha services operations wait "$OPERATION_OR_KEY" --timeout=60
    KEY_NAME=$(gcloud alpha services operations describe "$OPERATION_OR_KEY" --format="json" | jq -r '.response.name // empty')
  elif [[ "$OPERATION_OR_KEY" == *"/keys/"* ]]; then
    KEY_NAME="$OPERATION_OR_KEY"
  else
    KEY_NAME=""
  fi
  if [ -z "$KEY_NAME" ]; then
    KEY_NAME=$(_resolve_key_name "Server-Maps-Grounding-Key")
  fi
  if [ -n "$KEY_NAME" ]; then
    gcloud alpha services api-keys update "$KEY_NAME" \
      --api-target=service=mapstools.googleapis.com \
      --api-target=service=places.googleapis.com
    echo "Key 1 created (mapstools + places). Restrict to server IP in Console if desired."
  else
    echo "Key 1 created but could not apply restrictions. Add mapstools + places in Console."
  fi
  _print_key_and_doppler "GOOGLE_MAPS_API_KEY" "$KEY_NAME"
else
  echo "Key 1: Create manually in Console; restrict to mapstools.googleapis.com + places.googleapis.com, IP if possible."
  echo "  → doppler secrets set GOOGLE_MAPS_API_KEY=<key_value>"
fi

# Key 2: Client – HTTP referrer restricted (no API restrictions via CLI for referrers; add in Console)
echo ""
echo "--- Key 2: Client (Maps JS / Places UI Kit) ---"
CLIENT_KEY_JSON=$(gcloud alpha services api-keys create --display-name="Client-Maps-JS-Key" --format="json" 2>/dev/null || true)
if [ -n "$CLIENT_KEY_JSON" ]; then
  OPERATION_OR_KEY=$(echo "$CLIENT_KEY_JSON" | jq -r '.name // empty')
  if [[ "$OPERATION_OR_KEY" == *"/operations/"* ]]; then
    echo "Waiting for Key 2 creation operation to complete..."
    gcloud alpha services operations wait "$OPERATION_OR_KEY" --timeout=60
    KEY_NAME=$(gcloud alpha services operations describe "$OPERATION_OR_KEY" --format="json" | jq -r '.response.name // empty')
  elif [[ "$OPERATION_OR_KEY" == *"/keys/"* ]]; then
    KEY_NAME="$OPERATION_OR_KEY"
  else
    KEY_NAME=""
  fi
  if [ -z "$KEY_NAME" ]; then
    KEY_NAME=$(_resolve_key_name "Client-Maps-JS-Key")
  fi
  echo "Key 2 created. In Console, add HTTP referrer: *.gatewayglobal.ai/*"
  _print_key_and_doppler "GOOGLE_MAPS_JS_API" "$KEY_NAME"
  echo "  (Also set VITE_GOOGLE_MAPS_KEY for build if needed.)"
else
  # May already exist; try to get key name for Doppler from list
  KEY_FOR_DOPPLER=$(_resolve_key_name "Client-Maps-JS-Key")
  if [ -n "$KEY_FOR_DOPPLER" ]; then
    _print_key_and_doppler "GOOGLE_MAPS_JS_API" "$KEY_FOR_DOPPLER"
  else
    echo "Key 2: Create manually in Console; restrict to HTTP referrers (e.g. *.gatewayglobal.ai/*)."
    echo "  → doppler secrets set GOOGLE_MAPS_JS_API=<key_value>"
  fi
fi

# Key 3: Server (Gemini) – API service restricted
echo ""
echo "--- Key 3: Server (Gemini / Generative Language API) ---"
GEMINI_KEY_JSON=$(gcloud alpha services api-keys create --display-name="Server-Gemini-Key" --format="json" 2>/dev/null || true)
if [ -n "$GEMINI_KEY_JSON" ]; then
  OPERATION_OR_KEY=$(echo "$GEMINI_KEY_JSON" | jq -r '.name // empty')
  if [[ "$OPERATION_OR_KEY" == *"/operations/"* ]]; then
    echo "Waiting for Key 3 creation operation to complete..."
    gcloud alpha services operations wait "$OPERATION_OR_KEY" --timeout=60
    KEY_NAME=$(gcloud alpha services operations describe "$OPERATION_OR_KEY" --format="json" | jq -r '.response.name // empty')
  elif [[ "$OPERATION_OR_KEY" == *"/keys/"* ]]; then
    KEY_NAME="$OPERATION_OR_KEY"
  else
    KEY_NAME=""
  fi
  if [ -z "$KEY_NAME" ]; then
    KEY_NAME=$(_resolve_key_name "Server-Gemini-Key")
  fi
  if [ -n "$KEY_NAME" ]; then
    gcloud alpha services api-keys update "$KEY_NAME" \
      --api-target=service=generativelanguage.googleapis.com
    echo "Key 3 created (generativelanguage only)."
  else
    echo "Key 3 created but could not apply restrictions. Add generativelanguage in Console."
  fi
  _print_key_and_doppler "GEMINI_API_KEY" "$KEY_NAME"
else
  echo "Key 3: Create manually in Console; restrict to generativelanguage.googleapis.com."
  echo "  → doppler secrets set GEMINI_API_KEY=<key_value>"
fi

echo ""
echo "=== Next steps ==="
echo "1. Run the doppler secrets set ... commands above (or copy keys from Console)."
echo "2. For Key 2, add HTTP referrer *.gatewayglobal.ai/* in Google Cloud Console."
echo "3. Wait ~5 minutes for restrictions to propagate."
echo "4. Verify: ./scripts/run-with-doppler.sh check-keys"
echo ""
