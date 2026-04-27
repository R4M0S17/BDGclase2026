# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

All commands run from `mini-jira/`:

```bash
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm run preview   # Preview production build
```

No test runner is configured yet. Path alias `@` → `src/` (configured in `vite.config.ts` and `tsconfig.app.json`).

---

## Stack

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript + Vite |
| Routing | react-router-dom v7 (`createBrowserRouter`) |
| Data fetching | @tanstack/react-query — `staleTime: 30s`, `refetchInterval: 30s`, `retry: 1` |
| Estado UI | Zustand — `useUIStore` en `src/stores/uiStore.ts` |
| HTTP | `apiClient` (named export) en `src/lib/api/axiosInstance.ts` |
| Estilos | Tailwind CSS — design system "Lucid Efficiency" |
| Componentes base | shadcn/ui |
| Fuente | Inter Variable (única fuente permitida) |

---

## Arquitectura

### Rutas

```
/login          → AuthLayout > LoginPage
/ (redirect)    → /board
/board          → ProtectedRoute > AppLayout > BoardPage > KanbanBoard
/dashboard      → ProtectedRoute > AppLayout > DashboardPage
```

`ProtectedRoute` lee `accessToken` de `useUIStore`. Si es `null`, redirige a `/login`.

### Auth — Dev Bypass

`src/lib/auth/oauthRedirect.ts` → `redirectToOAuth()` simula OAuth sin backend:
```ts
setAccessToken('mock-token-dev-' + Date.now())
useUIStore.getState().setCurrentUser({ id: 'usr-001', name: 'Ana García', role: 'admin' })
```
No navega directamente: `LoginPage` tiene un `useEffect` que detecta `accessToken` en el store y navega a `/board`.

`authHelpers.ts` — lee/escribe `accessToken` directamente desde `useUIStore.getState()` (fuera de React), no usa el hook.

### HTTP Client — axiosInstance

Interceptor de request: adjunta `Bearer <token>` desde el store.
Interceptor de response: en 401, intenta refresh via `POST /api/auth/refresh` (httpOnly cookie). Si el refresh falla → `clearAccessToken()` + redirect a `/login`. Implementa deduplicación: múltiples requests en vuelo comparten un único refresh con `refreshQueue`.

### Zustand — useUIStore

```ts
boardFilters: BoardFilters       // filtros activos del tablero
setBoardFilters / resetBoardFilters
dashboardFilters: DashboardFilters  // filtros del dashboard (default: mes actual)
setDashboardFilters
activeTicketId: string | null    // ticket abierto en el panel lateral
currentUser: { id, name, role } | null
accessToken: string | null
```

### Board — Árbol de componentes

```
KanbanBoard (src/components/board/KanbanBoard.tsx)
  ↓ isLoading || !data → <LoadingSpinner>   ← barrera de carga (ver bug crítico)
  ↓ data: Ticket[]
  KanbanBoardBody (función interna del mismo archivo)
    ├── useOptimistic(tickets, reducer)
    ├── useTransition → handleMoveCard
    ├── useState → draggingTicketId
    └── KanbanColumn ×4  (src/components/board/KanbanColumn.tsx)
          └── TaskCard (export default de TicketCard.tsx) ×n
                ├── StatusBadge  topBadge: blocked | done | in-progress
                └── StatusBadge  bottomBadge: prioridad
```

**`canEdit`:** `currentUserRole === 'admin' || currentUserId === ticket.createdBy.id`

### Bug crítico resuelto: useOptimistic + StrictMode

`KanbanBoard` se divide en dos componentes dentro del **mismo archivo** a propósito.

**Causa:** React 19.2.x en StrictMode double-invoca `useOptimistic` durante el montaje. Si el hook se inicializa con `[]` y luego recibe `Ticket[]`, puede producir `ticket.status = undefined`, rompiendo `groupByStatus` con `TypeError: Cannot read properties of undefined (reading 'push')`.

**Solución:** `KanbanBoardBody` solo se monta cuando `data` es `Ticket[]` real (la barrera `isLoading || !data` en `KanbanBoard`). Así `useOptimistic` siempre se inicializa con datos válidos.

**Regla:** nunca inicializar `useOptimistic` con `[]` que luego será reemplazado por datos reales.

**Por qué `|| !data` además de `isLoading`:** si la query falla, `isLoading = false` pero `data = undefined`. Sin el guard `!data`, el board intentaría renderizar en estado de error.

### Optimistic Updates — React 19

`handleMoveCard` en `KanbanBoardBody`:
1. `updateOptimistic({ id, status })` — UI cambia instantáneamente
2. `await moveTicketStatus(ticketId, toStatus, ticket.version)` — 1500ms delay simulado, 30% fallo aleatorio
3. Éxito → `queryClient.setQueryData` con el ticket actualizado del servidor
4. Error → `queryClient.invalidateQueries` + React 19 revierte `optimisticTickets` automáticamente al fallar la transición

`moveTicketStatus` es una función async (no hook) en `src/hooks/useTickets.ts`.

### Drag & Drop — API nativa HTML5

Sin librerías. Responsabilidades:
- `TicketCard.tsx` — `draggable={canEdit}` + `onDragStart` / `onDragEnd`
- `KanbanColumn.tsx` — `onDragOver` (con `e.preventDefault()`) + `onDrop` + estado local `isDragOver`
- `KanbanBoardBody` — `draggingTicketId: string | null` en `useState`, pasa a todas las columnas

Highlight de drop target: `bg-surface-container-high` cuando `isDragOver && draggingTicketId`.

### Endpoints

```ts
GET    /api/tickets              → lista con filtros
PATCH  /api/tickets/:id/status   → body: { status, version }  ← Optimistic Locking
DELETE /api/tickets/:id          → archivar
```

Todos los URLs están centralizados en `src/lib/api/endpoints.ts` como `API.*`.

### Tipos clave

```ts
type TicketStatus = 'todo' | 'in_progress' | 'review' | 'done'
type Priority     = 'Low' | 'Medium' | 'High'   // title case
type Role         = 'admin' | 'member'
```

**Atención:** la BD define `priority` en lowercase (`low`, `medium`, `high`). Si el backend devuelve el enum directamente, normalizar en el mapper antes de usar el tipo TypeScript.

`Ticket.version: number` — para Optimistic Locking (H3). El backend rechaza el PATCH si `version` no coincide con la fila actual.

---

## Sistema de Diseño — "Lucid Efficiency"

Fuente de verdad: `stitch_mini_jira_kanban_dashboard/DESIGN.md`

### Paleta de Colores — REGLA ABSOLUTA

**Nunca uses valores hex, rgb o hsl arbitrarios. Solo tokens Tailwind de esta tabla.**

| Token Tailwind              | Hex       | Uso                                     |
| --------------------------- | --------- | --------------------------------------- |
| `surface`                   | `#f9f9fb` | Canvas base                             |
| `surface-container-low`     | `#f2f4f6` | Sidebar, paneles secundarios            |
| `surface-container-lowest`  | `#ffffff` | Tarjetas activas, editor principal      |
| `surface-container-high`    | `#e4e9ee` | Items de lista sobre `surface`          |
| `surface-container-highest` | `#dde3e9` | Glow interior del Command Palette       |
| `primary`                   | `#005bbf` | CTAs, links                             |
| `primary-dim`               | `#0050a8` | Extremo del gradiente en botón primario |
| `primary-container`         | `#d7e2ff` | Badge "In Progress" fondo               |
| `on-primary`                | (white)   | Texto sobre botón primario              |
| `on-primary-fixed`          | `#003d84` | Texto sobre badge "In Progress"         |
| `tertiary-container`        | `#69f6b8` | Badge "Done" fondo                      |
| `on-tertiary-fixed`         | `#00452d` | Texto sobre badge "Done"                |
| `error-container`           | `#fe8983` | Badge "Blocked" fondo                   |
| `on-error-container`        | `#752121` | Texto sobre badge "Blocked"             |
| `outline-variant`           | `#acb3b8` | Ghost border (max 20% opacity)          |
| `inverse-surface`           | `#0c0e10` | Negro — único sustituto de `#000000`    |

### Tipografía

| Elemento           | Clase              | Reglas adicionales                            |
| ------------------ | ------------------ | --------------------------------------------- |
| Display / Headline | `text-[2.75rem]`   | `tracking-[-0.02em]`                          |
| Labels / Metadata  | `text-[0.6875rem]` | `uppercase tracking-[0.05em]` (ej: ISSUE-124) |
| Body               | `text-[0.875rem]`  | `leading-[1.6]`                               |

### Elevación y Separación

- **Air Shadow** (única sombra permitida): `shadow-[0px_12px_32px_rgba(12,14,16,0.04)]`
- **No-Line Rule:** prohibido `border` de 1px para separar secciones. Separar con cambios de `surface` o `gap-6`.
- **Glassmorphism** (Command Palette): `bg-surface-container-lowest/80 backdrop-blur-[24px] rounded-[0.75rem]`

### Componentes — Referencia

**Botón Primario:** `bg-gradient-to-br from-primary to-primary-dim text-on-primary rounded-md`

**Botón Secundario:** `bg-transparent border border-outline-variant/20 text-primary rounded-md`

**Status Badges:**
- Done → `bg-tertiary-container text-on-tertiary-fixed`
- Blocked → `bg-error-container text-on-error-container`
- In Progress → `bg-primary-container text-on-primary-fixed`

**Priority Badges:** High/Medium → `bg-surface-container-high text-inverse-surface` | Low → `bg-surface-container-high text-inverse-surface/60`

`getAvatarColor(userId: string)` en `src/lib/utils.ts` — devuelve string completa `bg-* text-*`. Los call sites **no** añaden `text-*` por su cuenta.

---

## Reglas de Código

- **Sin comentarios** salvo WHY no obvio (restricción oculta, workaround específico).
- **Sin abstracciones prematuras.** Tres líneas similares no justifican un helper.
- **Sin features extra** fuera del backlog (`backlog.md`).
- **Preferir editar archivos existentes** antes de crear nuevos.
- **Sin `#000000`.** Siempre `inverse-surface` (`#0c0e10`).
- **Sin drop shadows estándar.** Solo Air Shadow.
- Solo validar en boundaries (input usuario, APIs externas). No manejar escenarios imposibles dentro del sistema.

---

## Scope del Producto — MVP v0.1

| #   | Feature                    | Notas clave                                                                                                                                          |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Auth OAuth 2.0 corporativo | Roles por asignación de admin; redirect a login si token expira sin perder datos                                                                     |
| H2  | Tablero Kanban             | Flujo: todo → in_progress → review → done; badge "Bloqueado" sin cambiar columna; archivar solo tickets propios; members no editan tickets ajenos   |
| H3  | Optimistic Locking         | Rechazar save sobre versión desactualizada; mostrar cambios locales del usuario conflictuado para que decida                                         |

**Edge Cases críticos:**
- **EC-1:** Si un comentario se archiva antes del despacho del email → cancelar notificación silenciosamente (sin error en logs).
- **EC-2:** CSV Export: filtro vacío → botón deshabilitado + tooltip; rango inválido → HTTP 400; sesión expirada → HTTP 401 + redirect; volumen alto → stream fila a fila (no acumular en memoria), formato RFC 4180.
