#!/usr/bin/env bash
# =============================================================================
# Aleo PII Protocol — Testnet Deploy Script
# =============================================================================
# Deploys pii_protocol_v1.aleo to Aleo testnet with pre-flight checks.
#
# Usage:
#   ./scripts/deploy.sh [--dry-run] [--local-devnet]
#
# Flags:
#   --dry-run        Print what would happen without executing
#   --local-devnet   Deploy against local snarkOS devnet instead of testnet
#   --help, -h       Show this help message
#
# Prerequisites:
#   - leo CLI installed (https://developer.aleo.org/leo/installation)
#   - curl available (for network connectivity check)
#   - ALEO_PRIVATE_KEY environment variable set (for real deploy)
# =============================================================================

set -euo pipefail

# ─── Colour Helpers ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { printf "${CYAN}[info]${RESET}  %s\n" "$*"; }
ok()      { printf "${GREEN}[ok]${RESET}    %s\n" "$*"; }
warn()    { printf "${YELLOW}[warn]${RESET}  %s\n" "$*"; }
error()   { printf "${RED}[error]${RESET} %s\n" "$*" >&2; }
section() { printf "\n${BOLD}${CYAN}══ %s ══${RESET}\n" "$*"; }

die() {
  error "$*"
  exit 1
}

# ─── Script Root ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROGRAM_DIR="$PROJECT_ROOT/leo_program/aleo_pii_protocol_v1"
PROGRAM_ID="pii_protocol_v1.aleo"

# ─── CLI Flag Parsing ─────────────────────────────────────────────────────────
FLAG_DRY_RUN=false
FLAG_LOCAL_DEVNET=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)      FLAG_DRY_RUN=true ;;
    --local-devnet) FLAG_LOCAL_DEVNET=true ;;
    --help|-h)
      grep '^#' "$0" | grep -v '^#!/' | sed 's/^# \?//'
      exit 0
      ;;
    *) die "Unknown flag: $arg  (use --help for usage)" ;;
  esac
done

# ─── Banner ──────────────────────────────────────────────────────────────────
printf "\n${BOLD}${GREEN}Aleo PII Protocol — Deploy${RESET}\n"
printf "Program:   %s\n" "$PROGRAM_ID"
printf "Directory: %s\n" "$PROGRAM_DIR"
if $FLAG_DRY_RUN; then
  printf "Mode:      ${YELLOW}DRY RUN${RESET}\n"
elif $FLAG_LOCAL_DEVNET; then
  printf "Mode:      ${CYAN}local devnet${RESET}\n"
else
  printf "Mode:      ${CYAN}testnet${RESET}\n"
fi

# ─── Pre-flight Checks ──────────────────────────────────────────────────────
section "Pre-flight Checks"
pre_flight_ok=true

# Required CLI tools
for cmd in leo curl; do
  if command -v "$cmd" &>/dev/null; then
    ok "$cmd found"
  else
    error "$cmd not found. Install it first."
    pre_flight_ok=false
  fi
done

if ! $pre_flight_ok; then
  die "Pre-flight checks failed. Install missing tools."
fi

# Leo version
LEO_VERSION=$(leo --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
info "Leo version: $LEO_VERSION"

# Program directory exists
if [[ ! -d "$PROGRAM_DIR" ]]; then
  die "Program directory not found: $PROGRAM_DIR"
fi

if [[ ! -f "$PROGRAM_DIR/program.json" ]]; then
  die "program.json not found in $PROGRAM_DIR — is this a Leo project?"
fi
ok "Program directory verified"

# Network connectivity
NETWORK_NAME="testnet"
TESTNET_API="https://api.explorer.provable.com/v1/testnet/latest/block"

if $FLAG_LOCAL_DEVNET; then
  NETWORK_NAME="local devnet"
  TESTNET_API="http://localhost:3030/testnet/latest/block"
fi

info "Checking $NETWORK_NAME endpoint ($TESTNET_API)..."
if curl -sf "$TESTNET_API" >/dev/null 2>&1; then
  ok "$NETWORK_NAME API reachable"
else
  warn "Cannot reach $NETWORK_NAME API at $TESTNET_API"
  warn "Deployment may fail if the network is unreachable."
fi

# Private key check (only for real deploys)
if ! $FLAG_DRY_RUN; then
  if [[ -z "${ALEO_PRIVATE_KEY:-}" ]]; then
    warn "ALEO_PRIVATE_KEY not set. Leo will prompt for it interactively."
    warn "  export ALEO_PRIVATE_KEY=\"APrivateKey1zkp...\""
  else
    ok "ALEO_PRIVATE_KEY is set"
  fi
fi

# ─── Dry Run Exit ────────────────────────────────────────────────────────────
if $FLAG_DRY_RUN; then
  section "Dry Run Summary"
  info "Would build: cd $PROGRAM_DIR && leo build -q --network testnet --endpoint https://api.explorer.provable.com/v1"
  if $FLAG_LOCAL_DEVNET; then
    info "Would deploy: leo deploy -q --network localnet --yes --broadcast"
  else
    info "Would deploy: leo deploy -q --network testnet --endpoint https://api.explorer.provable.com/v1 --yes --broadcast"
  fi
  info "Check deployment status at: https://testnet.explorer.provable.com"
  ok "[DRY RUN] All pre-flight checks passed. Ready to deploy."
  exit 0
fi

# ─── Build ───────────────────────────────────────────────────────────────────
section "Build"
info "Building $PROGRAM_ID ..."
(cd "$PROGRAM_DIR" && leo build -q --network testnet --endpoint https://api.explorer.provable.com/v1)
ok "Build succeeded"

# ─── Private Key ──────────────────────────────────────────────────────────────
# Leo 4.x automatically loads .env from the directory tree.
# No manual source needed.

# ─── Deploy ──────────────────────────────────────────────────────────────────
section "Deploy to $NETWORK_NAME"

if $FLAG_LOCAL_DEVNET; then
  info "Deploying to local devnet..."
  (cd "$PROGRAM_DIR" && leo deploy -q --network localnet --yes --broadcast)
else
  info "Deploying to Aleo testnet..."
  (cd "$PROGRAM_DIR" && leo deploy -q --network testnet --endpoint https://api.explorer.provable.com/v1 --yes --broadcast)
fi

# ─── Done ────────────────────────────────────────────────────────────────────
section "Deploy Complete"
ok "$PROGRAM_ID deployed to $NETWORK_NAME"
info "Check deployment status at: https://testnet.explorer.provable.com"
info "Verify program at:         https://testnet.explorer.provable.com/program/$PROGRAM_ID"
