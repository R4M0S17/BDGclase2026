#!/bin/bash
# seed.sh — Inserts exactly 2 projects, 3 users, 5 tickets.
# Uses Supabase CLI (supabase db execute) if available; psql otherwise.
# Usage: ./scripts/seed.sh [--dry-run]
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

[[ -n "${DATABASE_URL:-}" ]] || fatal "DATABASE_URL not set. Copy .env.example → .env"

DB_DISPLAY=$(printf '%s' "$DATABASE_URL" | sed 's|:[^:@]*@|:****@|')
info "Target:  $DB_DISPLAY"
$DRY_RUN && warn "DRY-RUN mode — no changes will be applied"
echo ""

# ─── Detect executor ─────────────────────────────────────────────────────────
USE_SUPABASE=false
if command -v supabase &>/dev/null && [[ -f "$ROOT_DIR/supabase/config.toml" ]]; then
  USE_SUPABASE=true
  info "Executor: supabase db execute"
else
  command -v psql &>/dev/null || fatal "psql not found and Supabase CLI not available. Install one."
  info "Executor: psql"
fi

# ─── SQL ─────────────────────────────────────────────────────────────────────
SQL_TRUNCATE=$(cat << 'EOF'
TRUNCATE audit_logs, comments, ticket_tags, ticket_assignees,
         tickets, tags, projects, users
RESTART IDENTITY CASCADE;
EOF
)

SQL_USERS=$(cat << 'EOF'
INSERT INTO users (name, email, role, oauth_provider, oauth_id) VALUES
  ('Ana García',  'ana@example.com',  'admin', 'google', 'google-uid-001'),
  ('Luis Ramos',  'luis@example.com', 'user',  'google', 'google-uid-002'),
  ('Sara Méndez', 'sara@example.com', 'user',  NULL,     NULL);
EOF
)

SQL_PROJECTS=$(cat << 'EOF'
INSERT INTO projects (name, description, slug, status, created_by) VALUES
  ('Mini-Jira Dev',    'Tablero principal del equipo de producto',      'mini-jira-dev',    'active',   1),
  ('Legacy Migration', 'Migración del sistema legado a microservicios', 'legacy-migration', 'archived', 1);
EOF
)

SQL_TICKETS=$(cat << 'EOF'
INSERT INTO tickets
  (title, description, status, priority, is_blocked, version, project_id, created_by)
VALUES
  ('Setup Drizzle migrations',      'Configurar drizzle-kit y migrations iniciales',     'done',        'high',   false, 2, 1, 1),
  ('Implementar auth OAuth Google', 'Callback OAuth + JWT + dev-bypass',                 'in_progress', 'high',   false, 1, 1, 1),
  ('Tablero Kanban drag-and-drop',  'API nativa HTML5, sin librerías externas',          'in_progress', 'medium', true,  1, 1, 2),
  ('Optimistic locking en tickets', 'Rechazar PATCH si version no coincide',             'review',      'high',   false, 1, 1, 2),
  ('CSV Export del dashboard',      'Stream fila a fila, RFC 4180, sin buffer completo', 'todo',        'medium', false, 1, 1, 1);
EOF
)

# ─── Execute ─────────────────────────────────────────────────────────────────
run_sql() {
  local label="$1"
  local sql="$2"

  if $DRY_RUN; then
    printf '%b\n' "   ${YELLOW}[DRY-RUN]${RESET} $label"
    printf '%s\n' "$sql" | sed 's/^/      /'
    echo ""
    return
  fi

  printf '%b' "   ${CYAN}→  $label … ${RESET}"

  if $USE_SUPABASE; then
    local tmp_file
    tmp_file=$(mktemp /tmp/seed_XXXXXX.sql)
    printf '%s\n' "$sql" > "$tmp_file"
    supabase db execute --file "$tmp_file" 2>/dev/null
    rm -f "$tmp_file"
  else
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "$sql"
  fi

  ok "done"
}

step "Truncating all tables (RESTART IDENTITY CASCADE)"
run_sql "TRUNCATE" "$SQL_TRUNCATE"

step "Seeding users               (3 rows)"
run_sql "INSERT users" "$SQL_USERS"

step "Seeding projects            (2 rows)"
run_sql "INSERT projects" "$SQL_PROJECTS"

step "Seeding tickets             (5 rows — todo/in_progress×2/review/done)"
run_sql "INSERT tickets" "$SQL_TICKETS"

echo ""
if $DRY_RUN; then
  warn "DRY-RUN complete — re-run without --dry-run to apply"
else
  printf '%b\n' "${GREEN}${BOLD}✔  Seed complete: 3 users · 2 projects · 5 tickets${RESET}"
fi
