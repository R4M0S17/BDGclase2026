#!/usr/bin/env bash
# seed.sh — populates the database with dev data.
# Usage: ./seed.sh [--dry-run]
set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

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

run_sql() {
  local label="$1"
  local sql="$2"
  if $DRY_RUN; then
    printf '%b\n' "   ${YELLOW}[DRY-RUN]${RESET} $label"
    printf '%s\n' "$sql" | sed 's/^/      /'
    echo ""
  else
    printf '%b' "   ${CYAN}→  $label … ${RESET}"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "$sql"
    ok "done"
  fi
}

# ─── Load .env ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

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

# ─── SQL sections ─────────────────────────────────────────────────────────────

SQL_TRUNCATE=$(cat << 'EOF'
TRUNCATE audit_logs, comments, ticket_tags, ticket_assignees,
         tickets, tags, projects, users
RESTART IDENTITY CASCADE
EOF
)

SQL_USERS=$(cat << 'EOF'
INSERT INTO users (name, email, role, oauth_provider, oauth_id) VALUES
  ('Ana García',  'ana@example.com',  'admin', 'google', 'google-uid-001'),
  ('Luis Ramos',  'luis@example.com', 'user',  'google', 'google-uid-002'),
  ('Sara Méndez', 'sara@example.com', 'user',  NULL,     NULL)
EOF
)

SQL_PROJECTS=$(cat << 'EOF'
INSERT INTO projects (name, description, slug, status, created_by) VALUES
  ('Mini-Jira Dev',    'Tablero principal del equipo de producto',      'mini-jira-dev',    'active',   1),
  ('Legacy Migration', 'Migración del sistema legado a microservicios', 'legacy-migration', 'archived', 1)
EOF
)

SQL_TAGS=$(cat << 'EOF'
INSERT INTO tags (name, created_by) VALUES
  ('bug',     1),
  ('feature', 1),
  ('urgent',  1),
  ('backend', 1)
EOF
)

SQL_TICKETS=$(cat << 'EOF'
INSERT INTO tickets
  (title, description, status, priority, is_blocked, version, project_id, created_by)
VALUES
  ('Setup Drizzle migrations',         'Configurar drizzle-kit y migrations iniciales',         'done',        'high',   false, 2, 1, 1),
  ('Implementar auth OAuth Google',    'Callback OAuth + JWT + dev-bypass con X-Dev-Role',      'in_progress', 'high',   false, 1, 1, 1),
  ('Tablero Kanban drag-and-drop',     'API nativa HTML5, sin librerías externas',              'in_progress', 'medium', true,  1, 1, 2),
  ('Optimistic locking en tickets',    'Rechazar PATCH si version no coincide con la fila',     'review',      'high',   false, 1, 1, 2),
  ('CSV Export dashboard',             'Stream fila a fila, RFC 4180, sin acumular en memoria', 'todo',        'medium', false, 1, 1, 1),
  ('Migrar esquema legacy',            'Mapear tablas viejas al nuevo esquema Drizzle',          'todo',        'low',    false, 1, 2, 1),
  ('Fix: scroll roto en iOS Safari',   'overflow-hidden rompe el scroll en dispositivos móvil', 'todo',        'medium', false, 1, 1, 3),
  ('Métricas de tiempo de ciclo',      'Tiempo promedio todo→done por sprint',                  'todo',        'low',    false, 1, 1, 1)
EOF
)

SQL_ASSIGNEES=$(cat << 'EOF'
INSERT INTO ticket_assignees (ticket_id, user_id) VALUES
  (1, 1),
  (2, 1),
  (2, 2),
  (3, 2),
  (4, 2),
  (4, 3),
  (7, 3)
EOF
)

SQL_TICKET_TAGS=$(cat << 'EOF'
INSERT INTO ticket_tags (ticket_id, tag_id) VALUES
  (1, 4),
  (2, 2),
  (2, 4),
  (3, 2),
  (4, 4),
  (5, 2),
  (7, 1),
  (7, 3)
EOF
)

SQL_COMMENTS=$(cat << 'EOF'
INSERT INTO comments (ticket_id, user_id, body) VALUES
  (2, 2, 'Dev-bypass con X-Dev-Role funciona. Falta el callback real de Google.'),
  (3, 1, 'Bloqueado: la API nativa no dispara el evento drop en Firefox 124.'),
  (4, 3, 'PR listo para review. Tests unitarios incluidos.')
EOF
)

SQL_AUDIT=$(cat << 'EOF'
INSERT INTO audit_logs (ticket_id, field, old_value, new_value, actor_id) VALUES
  (1, 'status',   'todo',        'in_progress', 1),
  (1, 'status',   'in_progress', 'done',        1),
  (2, 'status',   'todo',        'in_progress', 1),
  (2, 'priority', 'medium',      'high',        1),
  (4, 'status',   'todo',        'in_progress', 2),
  (4, 'status',   'in_progress', 'review',      2)
EOF
)

# ─── Run ──────────────────────────────────────────────────────────────────────

step "Truncating all tables (RESTART IDENTITY CASCADE)"
run_sql "TRUNCATE" "$SQL_TRUNCATE"

step "Seeding users                 (3 rows)"
run_sql "INSERT users" "$SQL_USERS"

step "Seeding projects              (2 rows)"
run_sql "INSERT projects" "$SQL_PROJECTS"

step "Seeding tags                  (4 rows)"
run_sql "INSERT tags" "$SQL_TAGS"

step "Seeding tickets               (8 rows)"
run_sql "INSERT tickets" "$SQL_TICKETS"

step "Seeding ticket_assignees      (7 rows)"
run_sql "INSERT ticket_assignees" "$SQL_ASSIGNEES"

step "Seeding ticket_tags           (8 rows)"
run_sql "INSERT ticket_tags" "$SQL_TICKET_TAGS"

step "Seeding comments              (3 rows)"
run_sql "INSERT comments" "$SQL_COMMENTS"

step "Seeding audit_logs            (6 rows)"
run_sql "INSERT audit_logs" "$SQL_AUDIT"

echo ""
if $DRY_RUN; then
  warn "DRY-RUN complete — re-run without --dry-run to apply"
else
  printf '%b\n' "${GREEN}${BOLD}✔  Seed complete.${RESET}"
fi
