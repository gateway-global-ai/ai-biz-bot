#!/usr/bin/env bash
# Run app or tests with Doppler. Optionally run permit-check first (--check).
# Usage: ./scripts/run-with-doppler.sh dev | test:bi | check-keys
#        ./scripts/run-with-doppler.sh dev --check   # run permit-check, then dev if pass

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

RUN_CHECK=false
ARGS=()
for arg in "$@"; do
  if [ "$arg" = "--check" ]; then
    RUN_CHECK=true
  else
    ARGS+=("$arg")
  fi
done

if [ "$RUN_CHECK" = true ] && [ ${#ARGS[@]} -gt 0 ]; then
  echo "🔍 Running permit diagnostics first..."
  if ! doppler run -- npx tsx scripts/check-google-key-permissions.ts; then
    echo "❌ Permit check failed. Fix keys before starting. (After GCP changes, wait up to 5 minutes for propagation.)"
    exit 1
  fi
  echo ""
fi

case "${ARGS[0]:-}" in
  check-keys)
    doppler run -- npx tsx scripts/check-google-key-permissions.ts
    ;;
  dev)
    doppler run -- npm run dev
    ;;
  test:bi)
    doppler run -- npm run test:bi
    ;;
  "")
    echo "Usage: $0 <dev|test:bi|check-keys> [--check]"
    echo "  dev       - doppler run -- npm run dev"
    echo "  test:bi   - doppler run -- npm run test:bi"
    echo "  check-keys - doppler run -- npx tsx scripts/check-google-key-permissions.ts"
    echo "  --check   - before dev/test:bi, run check-keys; exit 1 if it fails"
    exit 0
    ;;
  *)
    doppler run -- npm run "${ARGS[@]}"
    ;;
esac
