#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROGRAM_DIR="$ROOT_DIR/private_note_codehmx"
LEO_HOME="$PROGRAM_DIR/.aleo"

if [[ ! -d "$PROGRAM_DIR" ]]; then
  echo "Missing program directory: $PROGRAM_DIR" >&2
  exit 1
fi

if [[ -f "$PROGRAM_DIR/.env" ]]; then
  set -a
  source "$PROGRAM_DIR/.env"
  set +a
fi

NETWORK="${NETWORK:-testnet}"
ENDPOINT="${ENDPOINT:-https://api.explorer.provable.com/v1}"
PRIORITY_FEE="${PRIORITY_FEE:-1000000}"

mkdir -p "$LEO_HOME"
cd "$ROOT_DIR"

echo "==> Build private_note_codehmx.aleo"
leo build \
  --path "$PROGRAM_DIR" \
  --home "$LEO_HOME" \
  --network "$NETWORK" \
  --endpoint "$ENDPOINT" \
  --disable-update-check

echo "==> Deploy to $NETWORK"
LEO_ARGS=(
  deploy
  --path "$PROGRAM_DIR"
  --home "$LEO_HOME"
  --network "$NETWORK"
  --endpoint "$ENDPOINT"
  --priority-fees "$PRIORITY_FEE"
  --broadcast
  --json-output
  --disable-update-check
  -y
)

if [[ -n "${PRIVATE_KEY:-}" ]]; then
  LEO_ARGS+=(--private-key "$PRIVATE_KEY")
fi

leo "${LEO_ARGS[@]}"

echo
echo "Deployment output: build/json-outputs/deploy.json"
echo "Explorer: https://testnet.aleoscan.io/program?id=private_note_codehmx.aleo"
