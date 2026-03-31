#!/usr/bin/env bash
# Merge Gateway local shadcn-io stdio MCP into .cursor/mcp.json (preserves other servers).
# Requires jq. Does not print secrets. Reload Cursor after running.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/.cursor/mcp.json"
mkdir -p "$ROOT/.cursor"
if ! command -v jq &>/dev/null; then
  echo "jq is required (apt install jq / brew install jq)."
  exit 1
fi
if [ ! -f "$OUT" ]; then
  echo '{"mcpServers":{}}' > "$OUT"
fi
tmp="$(mktemp)"
jq '.mcpServers["shadcn-io"] = {"command":"npx","args":["tsx","scripts/shadcn-io-catalog-mcp.ts"]}' "$OUT" > "$tmp"
mv "$tmp" "$OUT"
echo "Updated $OUT — set shadcn-io to Gateway local stdio MCP. Reload Cursor (Developer: Reload Window)."
