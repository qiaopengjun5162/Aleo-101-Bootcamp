#!/usr/bin/env bash
set -euo pipefail

# Task 4 deploy/execute template.
# Do NOT commit private keys. Set PRIVATE_KEY in your local shell before running:
#   export PRIVATE_KEY='APrivateKey...'

PROGRAM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../task3/private_allocation_demo" && pwd)"
OWNER_ADDRESS="${OWNER_ADDRESS:-aleo1jhppczfdz0lpgfg5ga6vmj68t57th9cl3ydxnkgw2h5wt58rks8smkzlpv}"
ENDPOINT="https://api.explorer.provable.com/v1"
NETWORK="testnet"

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "ERROR: PRIVATE_KEY is not set. Set it locally; do not paste it into chat or commit it." >&2
  exit 1
fi

cd "$PROGRAM_DIR"

leo build

leo deploy \
  --network "$NETWORK" \
  --endpoint "$ENDPOINT" \
  --private-key "$PRIVATE_KEY" \
  --broadcast

leo execute create_allocation \
  "$OWNER_ADDRESS" \
  4u8 \
  3u8 \
  3u8 \
  --network "$NETWORK" \
  --endpoint "$ENDPOINT" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
