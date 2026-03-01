#!/usr/bin/env bash
# Run the Nova Sovereign Handshake Test (Flight 001) with clear errors when Doppler or server is missing.
# Usage: from repo root: ./scripts/run-nova-handshake.sh
#   Or: npm run test:nova-handshake (requires Doppler token via doppler login or DOPPLER_TOKEN / DOPPLER_TOKEN_DEV)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# Require dependencies installed (avoids ERR_MODULE_NOT_FOUND for drizzle-orm etc.)
if [ ! -d "node_modules/drizzle-orm" ]; then
  echo "Nova Handshake: project dependencies not installed."
  echo "  Run from this directory: npm install"
  echo "  Then run: ./scripts/run-nova-handshake.sh"
  exit 1
fi

# Require Doppler: token in env or doppler login
if [ -z "${DOPPLER_TOKEN:-}" ] && [ -z "${DOPPLER_TOKEN_DEV:-}" ]; then
  if ! (doppler run -- printenv DOPPLER_CONFIG) &>/dev/null; then
    echo "Nova Handshake: Doppler token required."
    echo "  Run one of:"
    echo "    doppler login   # in this project directory"
    echo "    export DOPPLER_TOKEN_DEV=\$(doppler configs tokens create dev --plain)"
    echo "    or set DOPPLER_TOKEN / DOPPLER_TOKEN_DEV in .env"
    echo ""
    echo "  Then ensure the server is running (e.g. doppler run -- npm run dev) and run:"
    echo "    npm run test:nova-handshake"
    exit 1
  fi
fi

BASE_URL="${BASE_URL:-http://localhost:3004}"
if command -v curl &>/dev/null; then
  CODE="$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$BASE_URL" 2>/dev/null || true)"
  if [ -n "$CODE" ] && [ "$CODE" != "200" ] && [ "$CODE" != "301" ] && [ "$CODE" != "302" ]; then
    echo "Nova Handshake: Server at $BASE_URL returned HTTP $CODE (or unreachable). Start the server with: doppler run -- npm run dev"
    echo "  (Override with BASE_URL=... if your app runs on a different port.)"
    exit 1
  fi
fi

exec doppler run -- npx tsx scripts/nova-sovereign-handshake-test-flight-001.ts
