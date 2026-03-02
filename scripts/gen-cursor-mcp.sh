#!/usr/bin/env bash
# Generate or update .cursor/mcp.json with the SerpApi entry injected from Doppler.
# No secrets are committed; .cursor/mcp.json is in .gitignore.
#
# Prerequisites:
#   - Doppler CLI installed and authenticated (doppler login)
#   - Project configured: doppler setup --project aibizbot-clearvoice --config dev
#   - SERP_API_KEY set in Doppler (doppler secrets set SERP_API_KEY="your-key")
#   - jq installed (brew install jq / apt install jq)
#
# Usage:
#   ./scripts/gen-cursor-mcp.sh
#   npm run mcp:generate
#
# If .cursor/mcp.json already exists, this script merges the serpapi entry into
# the existing mcpServers block rather than overwriting the entire file.
# After running, restart Cursor (Cmd/Ctrl+Shift+P → 'Reload Window').

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT="$ROOT_DIR/.cursor/mcp.json"

echo "🔐 Fetching SERP_API_KEY from Doppler..."
SERP_API_KEY="$(doppler secrets get SERP_API_KEY --plain 2>/dev/null)" || {
  echo "❌ Could not read SERP_API_KEY from Doppler."
  echo "   Make sure you are logged in (doppler login) and the secret exists:"
  echo "   doppler secrets set SERP_API_KEY=\"your-key\""
  exit 1
}

if [ -z "$SERP_API_KEY" ]; then
  echo "❌ SERP_API_KEY is empty in Doppler. Set it with:"
  echo "   doppler secrets set SERP_API_KEY=\"your-key\""
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "❌ jq is required but not installed."
  echo "   macOS: brew install jq   |   Linux: sudo apt install jq"
  exit 1
fi

SERPAPI_ENTRY="{\"url\": \"https://mcp.serpapi.com/mcp?api_key=${SERP_API_KEY}\"}"

echo "✍️  Writing $OUTPUT ..."
if [ -f "$OUTPUT" ]; then
  # Merge serpapi entry into the existing mcpServers block, preserving other servers.
  jq --argjson entry "$SERPAPI_ENTRY" \
    '.mcpServers.serpapi = $entry' \
    "$OUTPUT" > "${OUTPUT}.tmp" && mv "${OUTPUT}.tmp" "$OUTPUT"
else
  # Create a new file with only the serpapi entry.
  jq -n --argjson entry "$SERPAPI_ENTRY" \
    '{"mcpServers": {"serpapi": $entry}}' > "$OUTPUT"
fi

echo "✅ .cursor/mcp.json updated with serpapi entry."
echo "   Restart Cursor (Cmd/Ctrl+Shift+P → 'Reload Window') to apply the new config."
