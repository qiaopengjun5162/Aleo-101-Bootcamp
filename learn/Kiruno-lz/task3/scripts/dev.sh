#!/usr/bin/env bash
# =============================================================================
# Aleo PII Protocol — One-Click Dev Environment
# =============================================================================
# Usage:
#   ./scripts/dev.sh [FLAGS]
#
# Flags:
#   --check-only      Run toolchain check only, do not start any service
#   --clean           Wipe build caches (dist/, target/, node_modules/.vite)
#                     and kill processes on managed ports before starting
#   --no-deploy       Skip Leo program compile/deploy (frontend-only dev)
#   --testnet         Deploy to Aleo testnet (default)
#   --local-devnet    Start a local snarkOS devnet and deploy against it
#   --help            Show this help message
#
# For standalone testnet deployment (without starting the full dev environment),
# use: ./scripts/deploy.sh [--dry-run] [--local-devnet]
#
# Managed ports:
#   5173  Vite frontend dev server
#   3030  snarkOS local devnet RPC
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
skip()    { printf "${YELLOW}[skip]${RESET}  %s\n" "$*"; }
error()   { printf "${RED}[error]${RESET} %s\n" "$*" >&2; }
section() { printf "\n${BOLD}${CYAN}══ %s ══${RESET}\n" "$*"; }

die() {
  error "$*"
  exit 1
}

# ─── Script Root ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ─── CLI Flag Parsing ─────────────────────────────────────────────────────────
FLAG_CHECK_ONLY=false
FLAG_CLEAN=false
FLAG_NO_DEPLOY=false
FLAG_TESTNET=true     # default
FLAG_LOCAL_DEVNET=false

for arg in "$@"; do
  case "$arg" in
    --check-only)   FLAG_CHECK_ONLY=true ;;
    --clean)        FLAG_CLEAN=true ;;
    --no-deploy)    FLAG_NO_DEPLOY=true ;;
    --testnet)      FLAG_TESTNET=true; FLAG_LOCAL_DEVNET=false ;;
    --local-devnet) FLAG_LOCAL_DEVNET=true; FLAG_TESTNET=false ;;
    --help|-h)
      grep '^#' "$0" | grep -v '^#!/' | sed 's/^# \?//'
      exit 0
      ;;
    *) die "Unknown flag: $arg  (use --help for usage)" ;;
  esac
done

# ─── Background PID Tracking ─────────────────────────────────────────────────
BG_PIDS=()

cleanup() {
  if [[ ${#BG_PIDS[@]} -gt 0 ]]; then
    section "Shutting Down Background Services"
    for pid in "${BG_PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        info "Stopping PID $pid …"
        kill "$pid" 2>/dev/null || true
      fi
    done
  fi
  ok "Goodbye."
}
trap cleanup EXIT INT TERM

# ─── Utility: Check if a directory has relevant files ─────────────────────────
# Returns 0 (true) if the directory contains at least one relevant source file.
dir_has_leo_sources() {
  # Looks for any .leo file or program.json (Leo project marker)
  find "$1" -maxdepth 3 \( -name "*.leo" -o -name "program.json" \) \
    -not -path "*/build/*" | grep -q .
}

dir_has_frontend_sources() {
  # Looks for package.json in the frontend root
  [[ -f "$1/package.json" ]]
}

# ─── Utility: Port Occupancy ─────────────────────────────────────────────────
port_in_use() {
  lsof -iTCP:"$1" -sTCP:LISTEN -t >/dev/null 2>&1
}

# Kill whatever holds a port; only called in --clean mode
release_port() {
  local port="$1"
  local pids
  pids="$(lsof -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    info "Releasing port $port (PIDs: $pids) …"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 1
  fi
}

check_port_or_exit() {
  local port="$1"
  local service="$2"
  if port_in_use "$port"; then
    if $FLAG_CLEAN; then
      warn "Port $port ($service) is occupied — releasing (--clean mode) …"
      release_port "$port"
      if port_in_use "$port"; then
        die "Could not release port $port. Please stop $service manually."
      fi
    else
      die "Port $port is already in use ($service). Stop the process or re-run with --clean."
    fi
  fi
}

# ─── Utility: Health Probe ────────────────────────────────────────────────────
wait_for_http() {
  local url="$1"
  local label="$2"
  local max_attempts="${3:-30}"
  local attempt=0
  info "Waiting for $label to become ready at $url …"
  until curl -sf "$url" >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [[ $attempt -ge $max_attempts ]]; then
      die "$label did not respond at $url after ${max_attempts}s"
    fi
    sleep 1
  done
  ok "$label is ready at $url"
}

# ─── Phase 0: Environment Self-Check ─────────────────────────────────────────
check_toolchain() {
  section "Toolchain Self-Check"

  local all_ok=true

  # ── Leo CLI (required) ───────────────────────────────────────────────────
  if command -v leo >/dev/null 2>&1; then
    LEO_VERSION="$(leo --version 2>&1 | head -1)"
    ok "leo        → $LEO_VERSION"
  else
    warn "leo        → NOT FOUND (required for Leo program compilation)"
    info "  Install: curl -L https://install.aleo.org | sh"
    info "  Docs:    https://developer.aleo.org/leo/installation"
    all_ok=false
  fi

  # ── snarkOS (optional — only needed for --local-devnet) ──────────────────
  if command -v snarkos >/dev/null 2>&1; then
    SNARKOS_VERSION="$(snarkos --version 2>&1 | head -1)"
    ok "snarkos    → $SNARKOS_VERSION"
  else
    if $FLAG_LOCAL_DEVNET; then
      warn "snarkos    → NOT FOUND (required for --local-devnet)"
      info "  Install: https://developer.aleo.org/testnet/getting_started/installation"
      all_ok=false
    else
      skip "snarkos    → not found (optional; only needed for --local-devnet)"
    fi
  fi

  # ── Bun (preferred for frontend) ─────────────────────────────────────────
  if command -v bun >/dev/null 2>&1; then
    BUN_VERSION="$(bun --version 2>&1 | head -1)"
    ok "bun        → $BUN_VERSION"
    FRONTEND_RUNNER="bun"
  else
    warn "bun        → NOT FOUND (preferred for Vite frontend)"
    info "  Install: curl -fsSL https://bun.sh/install | bash"
    FRONTEND_RUNNER=""
  fi

  # ── Node.js ≥ 18 (fallback) ──────────────────────────────────────────────
  if command -v node >/dev/null 2>&1; then
    NODE_VERSION="$(node --version 2>&1)"
    MAJOR="${NODE_VERSION#v}"
    MAJOR="${MAJOR%%.*}"
    if [[ "$MAJOR" -ge 18 ]]; then
      ok "node       → $NODE_VERSION"
      [[ -z "$FRONTEND_RUNNER" ]] && FRONTEND_RUNNER="npm"
    else
      warn "node       → $NODE_VERSION (need ≥ 18)"
      info "  Install: https://nodejs.org/en/download"
      all_ok=false
    fi
  else
    if [[ -z "$FRONTEND_RUNNER" ]]; then
      warn "node       → NOT FOUND (required when bun is absent)"
      info "  Install: https://nodejs.org/en/download"
      all_ok=false
    else
      skip "node       → not found (bun is present, node is optional)"
    fi
  fi

  # ── npm / pnpm (fallback package manager) ────────────────────────────────
  if command -v npm >/dev/null 2>&1; then
    NPM_VERSION="$(npm --version 2>&1)"
    ok "npm        → $NPM_VERSION"
  elif command -v pnpm >/dev/null 2>&1; then
    PNPM_VERSION="$(pnpm --version 2>&1)"
    ok "pnpm       → $PNPM_VERSION"
  else
    if [[ "$FRONTEND_RUNNER" == "npm" ]]; then
      warn "npm/pnpm   → NOT FOUND (needed when bun is absent)"
      info "  Install npm: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm"
      all_ok=false
    else
      skip "npm/pnpm   → not found (bun is present)"
    fi
  fi

  # ── curl (used for health checks) ────────────────────────────────────────
  if command -v curl >/dev/null 2>&1; then
    ok "curl       → $(curl --version 2>&1 | head -1)"
  else
    warn "curl       → NOT FOUND (required for health checks)"
    info "  macOS: brew install curl  |  Linux: apt install curl"
    all_ok=false
  fi

  if $all_ok; then
    ok "All required tools present."
  else
    warn "Some tools are missing. See install hints above."
    if $FLAG_CHECK_ONLY; then
      exit 1
    fi
    die "Fix missing tools before starting the dev environment."
  fi
}

# ─── Phase 1: Clean Caches ────────────────────────────────────────────────────
do_clean() {
  section "Cleaning Build Caches"
  local cleaned=false

  if [[ -d "$PROJECT_ROOT/frontend/dist" ]]; then
    info "Removing frontend/dist/ …"
    rm -rf "$PROJECT_ROOT/frontend/dist"
    cleaned=true
  fi

  if [[ -d "$PROJECT_ROOT/frontend/node_modules/.vite" ]]; then
    info "Removing frontend/node_modules/.vite/ …"
    rm -rf "$PROJECT_ROOT/frontend/node_modules/.vite"
    cleaned=true
  fi

  if [[ -d "$PROJECT_ROOT/leo_program/build" ]]; then
    info "Removing leo_program/build/ …"
    rm -rf "$PROJECT_ROOT/leo_program/build"
    cleaned=true
  fi

  if [[ -d "$PROJECT_ROOT/sdk/dist" ]]; then
    info "Removing sdk/dist/ …"
    rm -rf "$PROJECT_ROOT/sdk/dist"
    cleaned=true
  fi

  if $cleaned; then
    ok "Caches cleared."
  else
    skip "Nothing to clean."
  fi
}

# ─── Phase 2: Leo Program Build & Deploy ─────────────────────────────────────
build_and_deploy_leo() {
  section "Leo Program: Build & Deploy"

  local leo_dir="$PROJECT_ROOT/leo_program/aleo_pii_protocol_v1"

  if ! dir_has_leo_sources "$leo_dir"; then
    skip "leo_program is empty — no .leo sources found in aleo_pii_protocol_v1"
    return
  fi

  if ! command -v leo >/dev/null 2>&1; then
    die "leo CLI not found. Cannot compile Leo program."
  fi

  info "Compiling Leo program …"
  (cd "$leo_dir" && leo build -q --network testnet --endpoint https://api.explorer.provable.com/v1)
  ok "Leo program compiled."

  if $FLAG_LOCAL_DEVNET; then
    info "Deploying to local devnet …"
    (cd "$leo_dir" && leo deploy -q --network localnet --yes --broadcast)
  else
    info "Deploying to Aleo testnet …"
    (cd "$leo_dir" && leo deploy -q --network testnet --endpoint https://api.explorer.provable.com/v1 --yes --broadcast)
  fi

  ok "Leo program deployed."
}

# ─── Phase 3: Local snarkOS Devnet ───────────────────────────────────────────
start_local_devnet() {
  section "Local snarkOS Devnet"

  check_port_or_exit 3030 "snarkOS devnet RPC"

  if ! command -v snarkos >/dev/null 2>&1; then
    die "snarkos not found. Install from https://developer.aleo.org/testnet/getting_started/installation"
  fi

  die "Local devnet mode is not yet supported. Use --testnet (default) instead."
}

# ─── Phase 4: Frontend Dev Server ─────────────────────────────────────────────
start_frontend() {
  section "Frontend Dev Server"

  local fe_dir="$PROJECT_ROOT/frontend"

  if ! dir_has_frontend_sources "$fe_dir"; then
    skip "frontend is empty — no package.json found"
    skip "  Expected file: frontend/package.json"
    return
  fi

  if port_in_use 5173; then
    warn "Port 5173 is already in use — attempting to stop existing process …"
    release_port 5173
    if port_in_use 5173; then
      warn "Could not release port 5173. Assuming existing Vite server is running."
      wait_for_http "http://localhost:5173" "Vite dev server" 5
      return
    fi
  fi

  local runner="${FRONTEND_RUNNER:-bun}"
  if [[ -z "$runner" ]]; then
    die "No JavaScript runtime found. Install bun (https://bun.sh) or Node.js ≥ 18."
  fi

  # Install dependencies if needed
  if [[ ! -d "$fe_dir/node_modules" ]]; then
    info "Installing frontend dependencies with $runner …"
    if [[ "$runner" == "bun" ]]; then
      (cd "$fe_dir" && bun install)
    else
      (cd "$fe_dir" && npm install)
    fi
  fi

  info "Starting Vite dev server on port 5173 …"
  if [[ "$runner" == "bun" ]]; then
    (cd "$fe_dir" && bun run dev) &
  else
    (cd "$fe_dir" && npm run dev) &
  fi
  BG_PIDS+=($!)

  wait_for_http "http://localhost:5173" "Vite dev server" 30
}

# ─── Summary Table ────────────────────────────────────────────────────────────
print_summary() {
  section "Services Ready"
  printf "\n"
  printf "  %-28s %s\n" "Service" "URL"
  printf "  %-28s %s\n" "──────────────────────────" "──────────────────────────"

  if port_in_use 5173; then
    printf "  ${GREEN}%-28s${RESET} %s\n" "Frontend (Vite)" "http://localhost:5173"
  else
    printf "  ${YELLOW}%-28s${RESET} %s\n" "Frontend (Vite)" "(not started)"
  fi

  if $FLAG_LOCAL_DEVNET && port_in_use 3030; then
    printf "  ${GREEN}%-28s${RESET} %s\n" "snarkOS devnet RPC" "http://localhost:3030"
  elif $FLAG_LOCAL_DEVNET; then
    printf "  ${YELLOW}%-28s${RESET} %s\n" "snarkOS devnet RPC" "(not started)"
  else
    printf "  ${CYAN}%-28s${RESET} %s\n" "Aleo testnet RPC" "https://api.explorer.provable.com/v1"
  fi

  printf "\n"
  info "Press Ctrl+C to stop all background services."
}

# ─── Main Entrypoint ─────────────────────────────────────────────────────────
main() {
  printf "\n${BOLD}${GREEN}Aleo PII Protocol — Dev Environment${RESET}\n"
  printf "Project root: %s\n" "$PROJECT_ROOT"

  # Always run toolchain check first
  check_toolchain

  # --check-only stops here
  if $FLAG_CHECK_ONLY; then
    ok "Check-only mode — done."
    exit 0
  fi

  # Optional cache wipe
  if $FLAG_CLEAN; then
    do_clean
  fi

  # Start local devnet (if requested)
  if $FLAG_LOCAL_DEVNET; then
    start_local_devnet
  fi

  # Build & deploy Leo program (unless skipped)
  if ! $FLAG_NO_DEPLOY; then
    build_and_deploy_leo
  else
    skip "Leo program deploy skipped (--no-deploy)"
  fi

  # Start frontend dev server
  start_frontend

  # Print summary
  print_summary

  # Keep the script alive so Ctrl+C triggers cleanup
  wait
}

main "$@"
