#!/bin/bash
# cleanup.sh — Truncates all test tables in correct FK order and removes
# any files under tmp/.  Safe to run repeatedly (idempotent).
# Usage: ./scripts/cleanup.sh [--dry-run]
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

# ─── Load .env ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  info "Loaded → $ENV_FILE"
fi

[[ -n "${DATABASE_URL:-}" ]] || fatal "DATABASE_URL not set. Copy .env.example → .env and fill it in."

DB_DISPLAY=$(printf '%s' "$DATABASE_URL" | sed 's|:[^:@]*@|:****@|')
info "Target:  $DB_DISPLAY"
$DRY_RUN && warn "DRY-RUN mode — no changes will be applied"
echo ""

# ─── FK-correct truncation order ─────────────────────────────────────────────
# audit_logs   → references tickets, users
# comments     → references tickets, users
# ticket_tags  → references tickets, tags
# ticket_assignees → references tickets, users
# tickets      → references projects, users
# tags         → references users
# projects     → references users
# users        (root)
SQL_TRUNCATE=$(cat << 'EOF'
TRUNCATE audit_logs, comments, ticket_tags, ticket_assignees,
         tickets, tags, projects, users
RESTART IDENTITY CASCADE;
EOF
)

# ─── Truncate tables ─────────────────────────────────────────────────────────
step "Truncating all tables in FK order"

if $DRY_RUN; then
  printf '%b\n' "   ${YELLOW}[DRY-RUN]${RESET} Would execute:"
  printf '%s\n' "$SQL_TRUNCATE" | sed 's/^/      /'
  echo ""
else
  printf '%b' "   ${CYAN}→  TRUNCATE … ${RESET}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "$SQL_TRUNCATE"
  ok "all tables truncated"
fi

# ─── Clean tmp/ ───────────────────────────────────────────────────────────────
step "Cleaning tmp/ directory"
TMP_DIR="$ROOT_DIR/tmp"

if [[ ! -d "$TMP_DIR" ]]; then
  ok "tmp/ does not exist — nothing to clean"
else
  TMP_FILES=$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')

  if [[ "$TMP_FILES" -eq 0 ]]; then
    ok "tmp/ is already empty"
  elif $DRY_RUN; then
    warn "[DRY-RUN] Would delete $TMP_FILES item(s) from $TMP_DIR"
    find "$TMP_DIR" -mindepth 1 -maxdepth 1 | sed 's/^/      /'
    echo ""
  else
    find "$TMP_DIR" -mindepth 1 -maxdepth 1 -delete
    ok "Deleted $TMP_FILES item(s) from tmp/"
  fi
fi

echo ""
if $DRY_RUN; then
  warn "DRY-RUN complete — re-run without --dry-run to apply"
else
  printf '%b\n' "${GREEN}${BOLD}✔  Cleanup complete.${RESET}"
fi
