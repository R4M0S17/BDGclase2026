# Estado de implementación — Mini JIRA Frontend

> Fecha: 2026-04-30

---

## Implementado

### Auth
- [x] `LoginPage` — UI completa con SSO button
- [x] `oauthRedirect.ts` — dev bypass: inyecta token + usuario mock
- [x] `authHelpers.ts` — lee/escribe `accessToken` desde Zustand fuera de React
- [x] `axiosInstance.ts` — interceptors de request (Bearer token) y response (refresh 401, deduplicación con `refreshQueue`)

### Layout y routing
- [x] `router.tsx` — rutas `/login`, `/board`, `/dashboard` con `ProtectedRoute`; stubs para `/roadmap`, `/backlog`, `/issues` (muestran "Coming soon")
- [x] `pages/ComingSoonPage.tsx` — componente reutilizable de placeholder; recibe `name` prop y muestra headline + subtítulo
- [x] `AuthLayout` — centra el form en pantalla con panel decorativo
- [x] `AppLayout` — sidebar + header + `<Outlet />`
- [x] `Sidebar` — navegación correcta: Board, Dashboard, Roadmap, Backlog, Issues; botones Support (mailto) y Log out (LogOut icon) separados
- [x] `Header` — search bar, iconos, avatar del usuario actual
- [x] `ProtectedRoute` — redirige a `/login` si no hay token
- [x] `RoleGuard` — oculta children si el rol no está en `allowedRoles`

### Board (H2)
- [x] `KanbanBoard` — barrera `isLoading || !data` que evita el bug de `useOptimistic`+StrictMode
- [x] `KanbanBoardBody` — `useOptimistic` + `useTransition` + `handleMoveCard`
- [x] `KanbanColumn` — drag over / drop con highlight `bg-surface-container-high`
- [x] `TicketCard` — draggable si `canEdit`, top badge (blocked/done/in-progress), bottom badge (prioridad), click abre panel lateral
- [x] `StatusBadge` — variantes: done, blocked, in-progress, high-priority, medium, low-priority
- [x] `EmptyColumnSlot` — placeholder visual cuando la columna está vacía
- [x] Share button — copia la URL actual al portapapeles, muestra "Copied!" 2 s

### Optimistic Locking (H3)
- [x] `moveTicketStatus` — `PATCH /api/tickets/:id/status` con `{ status, version }`, delay 1500ms, 30% fallo simulado
- [x] Rollback automático: React 19 revierte `optimisticTickets` al fallar la transición
- [x] Banner de conflicto dismissible con título del ticket y columna destino fallida

### Estado global
- [x] `uiStore.ts` — `boardFilters`, `dashboardFilters`, `activeTicketId`, `currentUser`, `accessToken`, `createTicketOpen`

### Infraestructura
- [x] `types/index.ts` — `Ticket`, `User`, `Comment`, `BoardFilters`, `DashboardFilters`, `DashboardMetrics`, etc.
- [x] `lib/api/endpoints.ts` — todos los endpoints centralizados en `API.*`
- [x] `hooks/useTickets.ts` — `useTickets(filters)` + `useCreateTicket()` + `useUpdateTicket(ticketId)` con React Query
- [x] `hooks/useMetrics.ts` — `useMetrics(filters)` con React Query
- [x] `hooks/useComments.ts` — `useComments(ticketId)` + `useAddComment(ticketId)`
- [x] `hooks/useTicketDetail.ts` — `useTicketDetail(id)` + `useArchiveTicket()`
- [x] `hooks/useUsers.ts` — `useUsers()` para selects de asignados
- [x] `lib/validators/ticketSchema.ts` — `newTicketSchema`, `editTicketSchema` (title, desc, priority, isBlocked, assigneeIds, labels)
- [x] `lib/validators/commentSchema.ts` — schema Zod para comentarios
- [x] `lib/utils.ts` — `getAvatarColor(userId)`
- [x] Componentes shared: `LoadingSpinner`, `UserAvatar`, `PriorityBadge`, `BlockedBadge`, `StatusLabel`
- [x] Componentes shadcn/ui: `button`, `badge`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `separator`, `sheet`, `textarea`, `tooltip`, `avatar`

### Dashboard
- [x] `useMetrics(filters)` — `GET /api/metrics` con `dashboardFilters` del store
- [x] `MetricsFilters` — toggles de status, date range (desde/hasta), select de assignee
- [x] `ClosedByMonthChart` — BarChart vertical (recharts)
- [x] `ByStatusChart` — BarChart horizontal con Cell coloreado por status
- [x] `ByMemberList` — lista con avatar, nombre, count y barra de progreso relativa
- [x] `ExportCSVButton` — deshabilitado si rango inválido/vacío, tooltip explicativo (EC-2)
- [x] 4 summary cards: Total, Cerrados, En progreso, Por revisar

### Panel lateral de ticket ✅ completo
- [x] `TicketDetailPanel` — panel fijo a la derecha, backdrop con blur, cierra al clic exterior
- [x] Abre al hacer clic en cualquier `TicketCard` (`setActiveTicketId`)
- [x] Vista read-only: título, prioridad, status, isBlocked, asignados, etiquetas, fecha, descripción
- [x] Botón **Editar** (lápiz) — visible si `admin` o ticket propio
- [x] **Modo edición**: formulario con título, descripción, prioridad, checkbox "Bloqueado", etiquetas (csv→array), asignados (checkboxes de `useUsers`); botones Cancelar / Guardar cambios
- [x] `useUpdateTicket(ticketId)` — `PATCH /api/tickets/:id` + invalida `['tickets']` + actualiza cache `['ticket', id]`
- [x] Botón archivar — visible solo si `admin` o ticket es propio; invalida `['tickets']` y cierra el panel
- [x] Lista de comentarios con avatar + fecha
- [x] Formulario de comentario con `react-hook-form` + validación `commentSchema` + `useAddComment`

### Create Ticket ✅ completo
- [x] `CreateTicketDialog` — modal centrado montado en `AppLayout`, visible globalmente
- [x] Botón "Create Issue" en `Sidebar` llama `setCreateTicketOpen(true)` del store
- [x] Formulario: título, descripción, prioridad, etiquetas (csv → array), asignados (checkboxes de `useUsers`)
- [x] Validación con `newTicketSchema` (zodResolver) + `useCreateTicket` — `POST /api/tickets` + `invalidateQueries(['tickets'])`

### Panel de filtros del Board ✅ completo
- [x] El botón "Filter" en `BoardPage` abre `BoardFiltersSheet` (panel lateral derecho)
- [x] Controles: `priority` (checkboxes), `status` (checkboxes), `assigneeId` (select de `useUsers`), `label` (input), `dateFrom`/`dateTo` (date inputs)
- [x] Conectado con `setBoardFilters` / `resetBoardFilters` del store; el board reacciona en tiempo real

---

## Bugs corregidos en 2026-04-30

| Bug | Descripción | Fix |
|-----|-------------|-----|
| Settings→logout | El botón "Settings" en Sidebar llamaba `handleLogout` | Renombrado a "Log out" con `LogOut` icon; Support es `<a mailto:>` |
| Ruta `/reports` | Nav item apuntaba a ruta inexistente | Cambiado a `/dashboard` |
| Rutas `/roadmap`, `/backlog`, `/issues` | Sin definición en router → render vacío | Añadidas rutas con `ComingSoonPage` (archivo propio para cumplir regla ESLint `react-refresh`) |
| Sin edición de ticket | TicketDetailPanel era read-only | Añadido modo edición con `editTicketSchema` + `useUpdateTicket` |
| Sin toggle `isBlocked` | No había forma de marcar/desmarcar bloqueado | Campo en formulario de edición |

---

## Pendiente / Stubs sin implementar

- [ ] **Notificaciones** — Bell en Header no abre panel (placeholder visual)
- [ ] **Settings (header)** — icono no abre configuración
- [ ] **HelpCircle (header)** — icono no abre panel de ayuda
- [ ] **MoreHorizontal en KanbanColumn** — menú contextual de columna (sin acción)
- [ ] **Roadmap / Backlog / Issues** — páginas reales (actualmente "Coming soon")
