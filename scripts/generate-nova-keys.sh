#!/usr/bin/env bash
# Generate Nova RSA key pair for dev. Add the output to Doppler as NOVA_RSA_PUBLIC_KEY and NOVA_RSA_PRIVATE_KEY.
# Usage: ./scripts/generate-nova-keys.sh
# Do NOT commit the private key.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"
OUT="$ROOT_DIR/.nova-keys-generated"
mkdir -p "$OUT"

PRIV="$OUT/nova_private.pem"
PUB="$OUT/nova_public.pem"

openssl genrsa -out "$PRIV" 2048
openssl rsa -in "$PRIV" -pubout -out "$PUB"

echo ""
echo "Generated: $PRIV and $PUB"
echo ""
echo "Add to Doppler (Doppler dashboard -> your project -> config -> secrets):"
echo ""
echo "NOVA_RSA_PUBLIC_KEY = (paste contents of $PUB)"
echo "NOVA_RSA_PRIVATE_KEY = (paste contents of $PRIV)"
echo ""
echo "Contents of nova_public.pem (copy into Doppler NOVA_RSA_PUBLIC_KEY):"
echo "---"
cat "$PUB"
echo "---"
echo ""
echo "Contents of nova_private.pem (copy into Doppler NOVA_RSA_PRIVATE_KEY) — keep secret:"
echo "---"
cat "$PRIV"
echo "---"
echo ""
echo ".nova-keys-generated/ is in .gitignore; do not commit the private key."
