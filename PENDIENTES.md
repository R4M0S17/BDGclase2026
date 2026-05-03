# Pendientes — Mini-Jira MVP v0.1

Lista priorizada de issues a resolver para llevar el proyecto al 100%.
Marcar con `[x]` al completar cada ítem.

---

## Críticos — bloquean funcionalidad

- [x] **C1 · Migración faltante: enum `review`**
  El enum `ticket_status` en la migración inicial (`drizzle/0000_left_echo.sql`) no incluye `'review'`. El schema actual sí lo define, pero la DB creada con esa migración rechazará cualquier INSERT con `status='review'`.
  **Fix:** generar una nueva migración con `ALTER TYPE ticket_status ADD VALUE 'review';`

- [x] **C2 · Tickets sin FK hacia proyectos**
  `projects` está completamente implementado pero `tickets` no tiene columna `project_id`. Los tickets no se pueden asociar a ningún proyecto.
  **Fix:** migración que agregue `project_id` (nullable, FK → projects) a `tickets` + exponer `GET /projects/:id/tickets` en el backend + conectar en el frontend.

- [x] **C3 · Eliminar simulación de fallo del 30%**
  `src/hooks/useTickets.ts` → función `moveTicketStatus` tiene `if (Math.random() < 0.3) throw new Error(...)` hardcodeado. Si llega a producción, 1 de cada 3 drag & drops fallará de forma aleatoria.
  **Fix:** eliminar el bloque de fallo simulado y el `await delay(1500)` artificial; llamar directo al endpoint real.

---

## Altos — gaps de feature o inconsistencias de negocio

- [x] **A1 · Optimistic Locking incompleto (H3)**
  El control de versiones solo existe en `PATCH /tickets/:id/status`. `PATCH /tickets/:id` (título, descripción, prioridad) no verifica `version`, por lo que dos usuarios editando los mismos campos al mismo tiempo producen last-write-wins sin detección de conflicto.
  **Fix:** agregar verificación de `version` en `PATCH /tickets/:id` y devolver 409 si hay desajuste, igual que en el endpoint de status.

- [x] **A2 · Tags usa hard DELETE (viola regla de soft delete universal)**
  `src/routes/tags.ts` ejecuta un `DELETE` físico. Si un tag tiene tickets asociados, `ticket_tags` se borra en cascada y se pierden esas relaciones silenciosamente.
  **Fix:** agregar columna `deleted_at` a la tabla `tags` y cambiar el endpoint a soft delete. Filtrar `deleted_at IS NULL` en `GET /tags`.

- [x] **A3 · CLAUDE.md dice que auth middleware son stubs (documentación falsa)**
  El archivo dice "actualmente stubs sin implementación" para `authenticate` y `requireAdmin`, pero ambos están completamente implementados. Cualquier dev nuevo tomará decisiones erróneas leyendo eso.
  **Fix:** actualizar la sección "Estado de implementación" en `CLAUDE.md` para reflejar el estado real.

---

## Medios — calidad y robustez

- [x] **M1 · Priority mismatch backend/frontend sin cobertura completa**
  Backend usa `'high' | 'medium' | 'low'` (lowercase); frontend usa `'High' | 'Medium' | 'Low'` (title case). El mapper en `src/lib/api/tickets.ts` cubre `fetchTickets`, pero otros endpoints que devuelvan tickets (p.ej. métricas) llegarán sin normalizar.
  **Fix:** centralizar la normalización de priority en el mapper base `mapApiTicket()` y asegurarse de que todos los hooks lo usen.

- [x] **M2 · Sin paginación en `/tags` y `/users`**
  Ambos endpoints devuelven todos los registros sin `limit`/`offset`. Con volumen creciente, esto impacta latencia y memoria del cliente.
  **Fix:** agregar paginación opcional (default `limit=100`) consistente con el resto de endpoints.

- [x] **M3 · Sin rate limiting en endpoints de auth**
  `POST /auth/oauth/callback` es un endpoint público sin protección. Vulnerable a abuse o brute force.
  **Fix:** agregar `express-rate-limit` al menos en las rutas de `/auth`.

- [x] **M4 · `@dnd-kit` instalado pero no utilizado**
  `mini-jira/package.json` incluye `@dnd-kit/core` y `@dnd-kit/sortable` como dependencias activas, pero el drag & drop usa la API nativa HTML5. Son dependencias muertas que engrosan el bundle.
  **Fix:** `npm uninstall @dnd-kit/core @dnd-kit/sortable` desde `mini-jira/`.

---

## Menores — deuda técnica y cosmética

- [x] **Me1 · `User.avatarUrl` existe en el tipo frontend pero no en el backend**
  `src/types/index.ts` declara `avatarUrl?` en `User`, pero el schema de usuarios no tiene ese campo. Siempre será `undefined`.
  **Fix:** eliminar `avatarUrl` del tipo frontend o agregar el campo al backend y al schema.

- [x] **Me2 · Comentarios renombran `body` → `text` sin documentar**
  En `src/routes/comments.ts` el campo `body` se expone como `text` en la respuesta. Funciona porque el frontend espera `text`, pero es un rename implícito que puede confundir.
  **Fix:** opción A — renombrar `body` a `text` en el schema directamente; opción B — documentar el mapeo en el contrato de API.

- [x] **Me3 · CORS permisivo en desarrollo**
  En `NODE_ENV=development` el backend acepta cualquier origin. Asegurarse de que `CORS_ORIGIN` esté configurado antes de cualquier despliegue.
  **Fix:** agregar `CORS_ORIGIN` al `.env.example` con un valor de ejemplo y validarlo en `src/app.ts` al arrancar.

---

## Nuevos — auditoría 2026-05-03

### Críticos

- [x] **N-C1 · Editar ticket siempre falla con HTTP 400**
  `PATCH /tickets/:id` requiere `version` en el body pero `EditTicketFormValues` no lo incluía. Además `useUpdateTicket` enviaba `priority` en title case (`'High'`) cuando el backend espera lowercase (`'high'`).
  **Implementado (2026-05-03):**
  - `mini-jira/src/lib/validators/ticketSchema.ts` — `editTicketSchema` extendido con `version: z.number().int()`.
  - `mini-jira/src/hooks/useTickets.ts` — `useUpdateTicket` serializa el body explícitamente: `priority.toLowerCase()`, incluye `version`, excluye campos que el backend ignora.
  - `mini-jira/src/components/ticket/TicketDetailPanel.tsx` — `editForm.reset()` inicializa `version: ticket.version`.

### Altos

- [x] **N-A1 · Asignados nunca se cargan en el panel de detalle**
  `GET /tickets/:id` devuelve `assigneeIds: number[]` pero `ApiTicket` no declaraba ese campo y `mapApiTicket` siempre ponía `assignees: []`. Además `useUsers` no parseaba la respuesta paginada `{ data, meta }` del backend y siempre usaba los mock users, cuyos IDs (`'usr-001'`) nunca coincidirían con los IDs numéricos de la BD.
  **Implementado (2026-05-03):**
  - `mini-jira/src/hooks/useUsers.ts` — parsea `{ data: ApiUser[] }` y mapea `id: String(u.id)` para que coincida con los IDs numéricos devueltos por el backend.
  - `mini-jira/src/lib/api/tickets.ts` — `ApiTicket` incluye `assigneeIds?: number[]`; `mapApiTicket` lo propaga al tipo `Ticket`.
  - `mini-jira/src/types/index.ts` — `Ticket` añade `assigneeIds: number[]`.
  - `mini-jira/src/components/ticket/TicketDetailPanel.tsx` — sección "Asignados" en vista resuelve nombres cruzando `ticket.assigneeIds` con `users` ya cargados en el panel.

- [x] **N-A2 · Tags completamente desconectadas del backend**
  `mapApiTicket` devolvía `labels: []` siempre. El filtro "Label" enviaba texto libre que el backend descartaba silenciosamente (solo acepta `tagId` numérico). No existía `useTags`. `PATCH /tickets/:id` no aceptaba cambios de tags.
  **Implementado (2026-05-03):**
  - `mini-jira/src/hooks/useTags.ts` — nuevo hook `useTags()` que consulta `GET /api/tags` y devuelve `Tag[]`.
  - `mini-jira/src/lib/api/endpoints.ts` — añade `API.tags.list`.
  - `mini-jira/src/lib/api/tickets.ts` — `ApiTicket` incluye `tagIds?: number[]`; `mapApiTicket` lo propaga.
  - `mini-jira/src/types/index.ts` — nueva interfaz `Tag { id, name }`; `Ticket` añade `tagIds: number[]`; `BoardFilters.label` renombrado a `tagId: number | null`.
  - `mini-jira/src/stores/uiStore.ts` — filtros por defecto usan `tagId: null`.
  - `mini-jira/src/hooks/useTickets.ts` — `toApiParams` envía `tagId` (número); `useUpdateTicket` incluye `tagIds` en el body si están definidos.
  - `mini-jira/src/lib/validators/ticketSchema.ts` — `editTicketSchema` reemplaza `labels: string[]` por `tagIds: number[]`.
  - `mini-jira/src/components/board/BoardFiltersSheet.tsx` — reemplaza input de texto por `<select>` con tags reales del catálogo.
  - `mini-jira/src/components/ticket/TicketDetailPanel.tsx` — vista muestra nombres de tags reales; edición usa checkboxes del catálogo en lugar de texto libre.
  - `src/routes/tickets.ts` — `updateBodySchema` acepta `tagIds?: number[]`; handler sincroniza `ticket_tags` (delete all + re-insert validando contra tags no eliminados); respuesta incluye `tagIds` actualizados.

---

## Orden de implementación recomendado

```
C1 → C3 → C2 → A1 → A2 → A3 → M1 → M4 → M2 → M3 → Me1 → Me2 → Me3
N-C1 → N-A1 → N-A2 (+ N-A2b)
```

Empezar por C1 (migración) y C3 (quitar simulación) porque son los más rápidos y desbloquean pruebas reales del flujo completo.
Los nuevos: N-C1 primero porque rompe completamente la edición de tickets; N-A1 y N-A2 después porque son gaps de feature visibles pero no crashean la app.

---

## Incidencias resueltas

### 2026-05-03 — Edición de tickets rota, asignados y tags sin conectar (N-C1, N-A1, N-A2)

**Síntoma:** El formulario de edición de tickets nunca persistía cambios. El panel de detalle mostraba la sección "Asignados" siempre vacía. Las etiquetas no aparecían en ningún ticket. El filtro de "Label" en el board no filtraba nada.

**Causa raíz de N-C1:** `PATCH /tickets/:id` requiere `version` (optimistic locking), pero `editTicketSchema` no lo incluía, por lo que el body nunca pasaba la validación Zod del backend (400). Además `priority` se enviaba en title case (`'High'`) cuando el backend espera lowercase.

**Causa raíz de N-A1:** `useUsers` hacía `if (!Array.isArray(r.data)) return MOCK_USERS` — como el backend devuelve `{ data, meta }` (no un array directo), siempre usaba los mock users con IDs ficticios (`'usr-001'`). Los `assigneeIds` numéricos del backend nunca coincidían. Adicionalmente `mapApiTicket` no propagaba `assigneeIds` del response.

**Causa raíz de N-A2:** El sistema de tags existía completo en backend pero sin ningún punto de conexión con el frontend: no había `useTags`, `mapApiTicket` siempre devolvía `labels: []`, el filtro enviaba texto libre que Zod descartaba silenciosamente, y `PATCH /tickets/:id` no aceptaba `tagIds`.

**Archivos modificados:** 11 archivos en total — ver detalle en cada ítem de la sección "Nuevos".

---

### 2026-05-03 — Board mostraba "No se pudieron cargar los tickets"

**Síntoma:** El Sprint Board cargaba el mensaje de error en lugar del tablero Kanban.

**Causa raíz:** La base de datos tenía 3 de 7 migraciones aplicadas. El schema de Drizzle referenciaba `project_id` (tickets) y `deleted_at` (tags), pero esas columnas no existían en PostgreSQL, por lo que la query fallaba en el backend con "Failed query".

Estado de migraciones antes del fix:

| Migración | Descripción | Estado |
|---|---|---|
| 0000–0002 | Schema inicial, ajustes, projects | ✅ rastreadas en BD |
| 0003 `is_blocked` | Columna ya existía, aplicada manualmente | ✅ no rastreada |
| 0004 `review` status | Valor ya existía en el enum, aplicado manualmente | ✅ no rastreada |
| 0005 `project_id` en tickets | **Faltaba completamente** | ❌ |
| 0006 `deleted_at` en tags | **Faltaba completamente** | ❌ |

**Por qué `npm run db:migrate` no lo resolvió:** drizzle-kit falló silenciosamente en 0003 (la columna ya existía y el SQL no usa `IF NOT EXISTS`), dejó de procesar las siguientes y aun así reportó "migrations applied successfully".

**Solución:** Se aplicaron los SQL de 0005 y 0006 directamente vía psql:

```sql
ALTER TABLE "tickets" ADD COLUMN "project_id" integer;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_project_id_projects_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null;
CREATE INDEX "tickets_project_id_idx" ON "tickets" USING btree ("project_id");
ALTER TABLE "tags" ADD COLUMN "deleted_at" timestamp with time zone;
```

**Lección:** Nunca aplicar SQL de migración manualmente sin registrar el hash en `drizzle.__drizzle_migrations`. El estado inconsistente hace que drizzle-kit falle silenciosamente en las siguientes ejecuciones.
