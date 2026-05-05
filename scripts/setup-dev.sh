#!/bin/bash
# setup-dev.sh — First-time dev environment setup.
# Installs deps (pnpm preferred, npm fallback), creates .env, runs Drizzle
# migrations, and verifies the DB connection.
# Usage: ./scripts/setup-dev.sh [--dry-run]
set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# ─── Parse flags ─────────────────────────────────────────────────────────────
DRY_RUN=false
for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    *) printf '%b\n' "${RED}✗  Unknown flag: $arg${RESET}" >&2; exit 1 ;;
  esac
done

# ─── Helpers ─────────────────────────────────────────────────────────────────
step()  { printf '%b\n' "${CYAN}${BOLD}▶  $1${RESET}"; }
ok()    { printf '%b\n' "   ${GREEN}✓  $1${RESET}"; }
info()  { printf '%b\n' "   ${BLUE}ℹ  $1${RESET}"; }
warn()  { printf '%b\n' "   ${YELLOW}⚠  $1${RESET}"; }
fatal() { printf '%b\n' "${RED}✗  $1${RESET}" >&2; exit 1; }

run_cmd() {
  local label="$1"
  shift
  if $DRY_RUN; then
    printf '%b\n' "   ${YELLOW}[DRY-RUN]${RESET} $label"
    printf '%b\n' "      ${BLUE}cmd:${RESET} $*"
    echo ""
  else
    printf '%b\n' "   ${CYAN}→  $label${RESET}"
    "$@"
    ok "$label"
  fi
}

# ─── Resolve paths ───────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/mini-jira"
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"

$DRY_RUN && warn "DRY-RUN mode — no changes will be applied"
echo ""

# ─── Pick package manager ────────────────────────────────────────────────────
step "Detecting package manager"
if command -v pnpm &>/dev/null; then
  PKG="pnpm"
  ok "pnpm $(pnpm --version)"
elif command -v npm &>/dev/null; then
  PKG="npm"
  warn "pnpm not found — falling back to npm $(npm --version)"
else
  fatal "No package manager found. Install pnpm: npm install -g pnpm"
fi

# ─── Install backend deps ────────────────────────────────────────────────────
step "Installing backend dependencies ($PKG install)"
run_cmd "$PKG install — backend" $PKG install --prefix "$ROOT_DIR"

# ─── Install frontend deps ───────────────────────────────────────────────────
if [[ -f "$FRONTEND_DIR/package.json" ]]; then
  step "Installing frontend dependencies (mini-jira)"
  run_cmd "$PKG install — mini-jira" $PKG install --prefix "$FRONTEND_DIR"
else
  warn "mini-jira/package.json not found — skipping frontend install"
fi

# ─── Create .env if missing ──────────────────────────────────────────────────
step "Checking .env"
if [[ -f "$ENV_FILE" ]]; then
  ok ".env already exists — skipping copy"
else
  [[ -f "$ENV_EXAMPLE" ]] || fatal ".env.example not found at $ENV_EXAMPLE"
  if $DRY_RUN; then
    warn "[DRY-RUN] Would copy .env.example → .env"
  else
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    ok "Copied .env.example → .env"
    warn "Edit $ENV_FILE and fill in DATABASE_URL, JWT_SECRET, OAuth credentials"
  fi
fi

# ─── Load .env ────────────────────────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

[[ -n "${DATABASE_URL:-}" ]] || fatal "DATABASE_URL not set in .env — edit it before continuing"
DB_DISPLAY=$(printf '%s' "$DATABASE_URL" | sed 's|:[^:@]*@|:****@|')
info "Database: $DB_DISPLAY"

# ─── Run Drizzle migrations ───────────────────────────────────────────────────
step "Running Drizzle migrations (db:migrate)"
run_cmd "drizzle-kit migrate" bash -c "cd \"$ROOT_DIR\" && $PKG run db:migrate"

# ─── Verify DB responds ───────────────────────────────────────────────────────
step "Verifying database connection"
if $DRY_RUN; then
  warn "[DRY-RUN] Would run: psql \$DATABASE_URL -c 'SELECT 1'"
else
  if command -v psql &>/dev/null; then
    RESULT=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -At -c "SELECT 'ok'" 2>&1)
    [[ "$RESULT" == "ok" ]] || fatal "DB ping returned unexpected output: $RESULT"
    ok "DB connection OK"
  else
    warn "psql not found — skipping DB ping (migrations ran via drizzle-kit)"
  fi
fi

echo ""
if $DRY_RUN; then
  warn "DRY-RUN complete — re-run without --dry-run to apply"
else
  printf '%b\n' "${GREEN}${BOLD}✔  Dev environment ready.${RESET}"
  printf '%b\n' "   ${BLUE}Backend:${RESET}  cd $(basename "$ROOT_DIR") && npm run dev"
  printf '%b\n' "   ${BLUE}Frontend:${RESET} cd mini-jira && npm run dev"
fi
