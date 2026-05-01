# Frontend Specs — Mini Jira v0.1

**Fecha:** 2026-04-26  
**Basado en:** specs.md, backlog.md, mermaid_design.md, historias-usuario.md, edge-cases-criticos.md  
**Estado:** Pendiente de confirmación antes de escribir código

---

## 1. Stack y Versiones

| Capa | Tecnología | Versión |
|---|---|---|
| Lenguaje | TypeScript | 5.x |
| Framework UI | React | 19.x |
| Build tool | Vite | 5.x |
| Estilos | Tailwind CSS | 3.4.x |
| Componentes UI | shadcn/ui | latest (CLI) |
| Estado servidor | TanStack Query (React Query) | 5.x |
| HTTP client | Axios | 1.x |
| Estado cliente/UI | Zustand | 4.x |
| Routing | React Router | 6.x |
| Drag & drop | dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`) | 6.x |
| Formularios | React Hook Form | 7.x |
| Validación | Zod | 3.x |
| Gráficas | Recharts | 2.x |
| Markdown render | react-markdown | 9.x |
| Node (dev) | Node.js | 20 LTS |

---

## 2. Dependencias

```jsonc
// package.json — dependencies
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "react-router-dom": "^6.0.0",
  "@tanstack/react-query": "^5.0.0",
  "axios": "^1.0.0",
  "zustand": "^4.0.0",
  "@dnd-kit/core": "^6.0.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.0.0",
  "react-hook-form": "^7.0.0",
  "zod": "^3.0.0",
  "@hookform/resolvers": "^3.0.0",
  "recharts": "^2.0.0",
  "react-markdown": "^9.0.0",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.0.0",
  "lucide-react": "^0.400.0"
}

// devDependencies
{
  "typescript": "^5.0.0",
  "vite": "^5.0.0",
  "@vitejs/plugin-react": "^4.0.0",
  "tailwindcss": "^3.4.0",
  "postcss": "^8.0.0",
  "autoprefixer": "^10.0.0",
  "@types/react": "^19.0.0",
  "@types/react-dom": "^19.0.0"
}
```

> **shadcn/ui** se instala componente a componente via `npx shadcn-ui@latest add <componente>`, no como paquete npm. Los componentes requeridos iniciales: `button`, `dialog`, `sheet`, `badge`, `select`, `input`, `textarea`, `dropdown-menu`, `tooltip`, `avatar`, `separator`, `label`.

> **APIs de React 19 aplicables en este proyecto:**
> - `useOptimistic` — usado en `useMoveTicket` para mover la tarjeta visualmente antes de que confirme el servidor (reemplaza el patrón `onMutate` de TanStack Query para el drag & drop).
> - `useTransition` — envuelve las mutaciones de estado del ticket para mantener la UI responsive durante la llamada al API.
> - `ref` como prop directo — ya no se necesita `forwardRef` en componentes de shadcn/ui personalizados.
> - `use(promise)` — disponible para suspense-based data fetching si se adopta en iteraciones futuras; no requerido en v1.

---

## 3. Modelo de Datos (TypeScript)

Estos tipos reflejan exactamente la forma de las respuestas de la API. Son la fuente de verdad para el frontend.

```typescript
// src/types/index.ts

export type Role = 'admin' | 'member'

export type Priority = 'Low' | 'Medium' | 'High'

export type TicketStatus = 'todo' | 'in_progress' | 'review' | 'done'

export interface User {
  id: string           // uuid
  name: string
  email: string
  role: Role
  avatarUrl?: string
}

export interface Ticket {
  id: string           // uuid
  title: string        // max 120 chars
  description?: string // markdown
  status: TicketStatus
  priority: Priority
  isBlocked: boolean   // flag lateral — badge rojo, no cambia columna
  assignees: User[]
  labels: string[]
  createdBy: User
  createdAt: string    // ISO 8601 UTC
  updatedAt: string    // ISO 8601 UTC
  archivedAt?: string  // ISO 8601 UTC; null si no archivado
  version: number      // optimistic locking
}

export interface Comment {
  id: string
  ticketId: string
  text: string         // texto plano, sin markdown
  author: User
  createdAt: string    // ISO 8601 UTC
  archivedAt?: string  // soft delete
}

export interface MetricsByMonth {
  month: string        // "YYYY-MM"
  closed: number
}

export interface MetricsByStatus {
  status: TicketStatus
  count: number
}

export interface MetricsByMember {
  user: User
  activeCount: number
}

export interface DashboardMetrics {
  closedByMonth: MetricsByMonth[]
  byStatus: MetricsByStatus[]
  byMember: MetricsByMember[]
}
```

---

## 4. Arquitectura de Componentes

### 4.1 Árbol de rutas

```
AppRouter
├── /login                     → LoginPage          (público)
├── /                          → redirect → /board  (protegida)
├── /board                     → BoardPage          (protegida)
│   └── ?ticket=:id            → BoardPage + TicketModal abierto
└── /dashboard                 → DashboardPage      (protegida, todos los roles)
```

`ProtectedRoute` envuelve `/board` y `/dashboard`. Redirige a `/login` si no hay sesión activa.

---

### 4.2 Layout

```
AppLayout
├── TopNav
│   ├── Logo / título "Mini Jira"
│   ├── Nav links: [Tablero | Dashboard]
│   └── UserMenu (avatar, nombre, "Cerrar sesión")
└── <Outlet />   ← BoardPage o DashboardPage
```

---

### 4.3 BoardPage

```
BoardPage
├── BoardFilters               ← barra de filtros combinables
│   ├── FilterByStatus         (multi-select)
│   ├── FilterByPriority       (multi-select)
│   ├── FilterByAssignee       (single-select, lista de usuarios)
│   ├── FilterByLabel          (texto libre / tag input)
│   └── FilterByDateRange      (date picker: desde / hasta)
├── NewTicketButton            → abre NewTicketDialog
├── KanbanBoard                ← DndContext raíz
│   ├── KanbanColumn: "Por hacer"    (droppable)
│   │   └── TicketCard[]       (draggable)
│   ├── KanbanColumn: "En progreso"  (droppable)
│   │   └── TicketCard[]
│   ├── KanbanColumn: "Review"       (droppable)
│   │   └── TicketCard[]
│   └── KanbanColumn: "Listo"        (droppable)
│       └── TicketCard[]
├── TicketModal                ← Dialog shadcn/ui; visible cuando ?ticket=:id
│   ├── TicketForm             ← React Hook Form + Zod
│   │   ├── TitleInput
│   │   ├── DescriptionEditor  (textarea + react-markdown preview toggle)
│   │   ├── PrioritySelect
│   │   ├── StatusSelect       (no drag, estado editable también en modal)
│   │   ├── BlockedToggle      (switch con badge rojo)
│   │   ├── AssigneeSelect     (multi-select de usuarios)
│   │   └── LabelInput         (tag input libre)
│   ├── ConflictAlert          ← visible solo cuando API devuelve 409
│   ├── TicketMeta             (creado por, fechas, id)
│   ├── CommentList
│   │   └── CommentItem[]      (texto + autor + fecha + botón archivar si propio/admin)
│   └── CommentInput           (textarea + botón "Comentar")
└── NewTicketDialog            ← Dialog shadcn/ui (separado del modal de edición)
    └── NewTicketForm          ← React Hook Form + Zod (title + priority obligatorios)
```

**TicketCard** muestra: título, PriorityBadge, asignados (avatars), BlockedBadge (si `isBlocked`), etiquetas (máx. 2 visibles + "+N").

---

### 4.4 DashboardPage

```
DashboardPage
├── MetricsFilters
│   ├── DateRangeSelector      (mes/año o rango libre; default: mes en curso)
│   ├── StatusMultiSelect
│   └── AssigneeSelect
├── MetricsGrid
│   ├── ClosedByMonthChart     ← Recharts BarChart
│   ├── ByStatusChart          ← Recharts PieChart
│   └── ByMemberChart          ← Recharts BarChart (horizontal)
└── ExportCSVButton            ← disabled + tooltip cuando sin datos
```

---

### 4.5 Componentes compartidos

| Componente | Descripción |
|---|---|
| `PriorityBadge` | Badge coloreado: Low (gris) · Medium (amarillo) · High (rojo) |
| `BlockedBadge` | Badge rojo fijo "Bloqueado" |
| `StatusLabel` | Etiqueta de estado en español: "Por hacer", "En progreso", "Review", "Listo" |
| `UserAvatar` | Avatar circular con fallback de iniciales |
| `ProtectedRoute` | HOC: redirige a `/login` si no autenticado |
| `RoleGuard` | Renderiza `children` solo si el rol activo cumple la condición |
| `ErrorBoundary` | Captura errores de render; muestra mensaje y botón "Reintentar" |
| `LoadingSpinner` | Spinner centrado para estados de carga |

---

## 5. Estructura de Carpetas

```
src/
├── assets/
│   └── logo.svg
│
├── components/
│   ├── ui/                   # componentes shadcn/ui (auto-generados por CLI)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   │
│   ├── board/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   ├── TicketCard.tsx
│   │   └── BoardFilters.tsx
│   │
│   ├── ticket/
│   │   ├── TicketModal.tsx
│   │   ├── TicketForm.tsx
│   │   ├── NewTicketDialog.tsx
│   │   ├── ConflictAlert.tsx
│   │   ├── CommentList.tsx
│   │   └── CommentInput.tsx
│   │
│   ├── dashboard/
│   │   ├── MetricsFilters.tsx
│   │   ├── ClosedByMonthChart.tsx
│   │   ├── ByStatusChart.tsx
│   │   ├── ByMemberChart.tsx
│   │   └── ExportCSVButton.tsx
│   │
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   └── TopNav.tsx
│   │
│   └── shared/
│       ├── PriorityBadge.tsx
│       ├── BlockedBadge.tsx
│       ├── StatusLabel.tsx
│       ├── UserAvatar.tsx
│       ├── ProtectedRoute.tsx
│       ├── RoleGuard.tsx
│       ├── ErrorBoundary.tsx
│       └── LoadingSpinner.tsx
│
├── hooks/
│   ├── useTickets.ts           # queries TanStack Query para el board
│   ├── useTicket.ts            # query para un ticket por id
│   ├── useCreateTicket.ts      # mutation: POST /tickets
│   ├── useUpdateTicket.ts      # mutation: PATCH /tickets/:id (con version)
│   ├── useMoveTicket.ts        # mutation: PATCH /tickets/:id/status (drag & drop)
│   ├── useArchiveTicket.ts     # mutation: DELETE /tickets/:id
│   ├── useComments.ts          # query + mutation para comentarios
│   ├── useMetrics.ts           # query dashboard
│   ├── useUsers.ts             # query lista de usuarios (para selects)
│   └── useCurrentUser.ts       # usuario autenticado desde Zustand
│
├── lib/
│   ├── api/
│   │   ├── axiosInstance.ts    # instancia Axios con baseURL + interceptores JWT
│   │   └── endpoints.ts        # constantes de rutas del API
│   ├── auth/
│   │   ├── authHelpers.ts      # leer/guardar/borrar tokens
│   │   └── oauthRedirect.ts    # redirigir a /api/auth/google
│   └── validators/
│       ├── ticketSchema.ts     # Zod schema para crear/editar ticket
│       └── commentSchema.ts    # Zod schema para nuevo comentario
│
├── pages/
│   ├── LoginPage.tsx
│   ├── BoardPage.tsx
│   └── DashboardPage.tsx
│
├── stores/
│   └── uiStore.ts              # Zustand: filtros activos, id de ticket abierto, filtros dashboard
│
├── types/
│   └── index.ts                # interfaces TypeScript (ver §3)
│
├── router.tsx                  # definición de rutas React Router
├── App.tsx                     # QueryClientProvider + RouterProvider
└── main.tsx                    # entry point, mount
```

---

## 6. Estado Global

### 6.1 Zustand — uiStore (estado UI puro)

```typescript
interface UIStore {
  // Board
  boardFilters: {
    status: TicketStatus[]
    priority: Priority[]
    assigneeId: string | null
    label: string | null
    dateFrom: string | null
    dateTo: string | null
  }
  activeTicketId: string | null      // null = modal cerrado
  setActiveTicketId: (id: string | null) => void
  setBoardFilters: (filters: Partial<UIStore['boardFilters']>) => void
  resetBoardFilters: () => void

  // Dashboard
  dashboardFilters: {
    from: string          // YYYY-MM-DD; default: primer día del mes
    to: string            // YYYY-MM-DD; default: hoy
    status: TicketStatus[]
    assigneeId: string | null
  }
  setDashboardFilters: (filters: Partial<UIStore['dashboardFilters']>) => void
}
```

### 6.2 TanStack Query — QueryClient

```typescript
// QueryClient global configurado en App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30 s — datos frescos sin refetch
      refetchInterval: 30_000,  // polling automático del tablero
      retry: 1,
    },
  },
})
```

**Query keys canónicas:**

| Key | Datos |
|---|---|
| `['tickets', boardFilters]` | Lista completa para el board (filtrada en cliente) |
| `['ticket', id]` | Detalle de un ticket específico |
| `['metrics', dashboardFilters]` | Datos del dashboard |
| `['users']` | Lista de usuarios para selects |
| `['currentUser']` | Usuario autenticado |

---

## 7. Autenticación en el Frontend

### Flujo OAuth 2.0

```
1. Usuario hace clic en "Ingresar con cuenta corporativa"
2. Frontend redirige a GET /api/auth/google   ← backend inicia el flujo
3. Google autentica y llama al callback del backend
4. Backend emite access token (JWT) + refresh token (JWT)
5. Backend redirige al frontend con los tokens:
   - Access token: en query param ?token=... (efímero, solo para la redirección)
   - Refresh token: en httpOnly cookie (Set-Cookie del backend)
6. Frontend extrae el access token del query param, lo guarda en memoria
   (Zustand currentUser store) y limpia la URL
```

### Almacenamiento de tokens

| Token | Almacenamiento | Justificación |
|---|---|---|
| Access token | Memoria (Zustand / variable de módulo) | No accesible desde JS externo; se pierde al cerrar tab (esperado) |
| Refresh token | httpOnly cookie (gestionada por el backend) | Inaccesible desde JS; protege contra XSS |

### Axios Interceptor — renovación automática

El interceptor de Axios (en `axiosInstance.ts`) maneja:

1. Si la respuesta es `401` y existe refresh token (cookie), llama `POST /api/auth/refresh`.
2. Para evitar el race de múltiples tabs (EC-A), usa una variable de módulo `isRefreshing` y una cola de requests pendientes. Si ya hay un refresh en curso, los demás requests esperan al nuevo token.
3. Si el refresh devuelve `401` (token expirado o rotado), borra el access token en memoria y redirige a `/login`.

---

## 8. Reglas de Negocio en el Frontend

### 8.1 Permisos — qué se muestra según rol y propiedad

| UI Element | Condición para mostrar |
|---|---|
| Botón "Editar" en modal | `currentUser.id === ticket.createdBy.id` OR `role === 'admin'` |
| Botón "Eliminar (archivar)" | `currentUser.id === ticket.createdBy.id` OR `role === 'admin'` |
| Botón "Archivar comentario" | `currentUser.id === comment.author.id` OR `role === 'admin'` |
| Ver tickets archivados | `role === 'admin'` únicamente |

> La API aplica la misma lógica server-side. El frontend oculta controles; el backend rechaza con `403` si se intenta de igual modo.

### 8.2 Drag & drop — flujo con dnd-kit

1. `onDragEnd`: si el ticket se suelta en una columna diferente → llama `PATCH /tickets/:id/status` con el nuevo estado y el `version` actual.
2. **Optimistic update**: la tarjeta se mueve visualmente de inmediato (TanStack Query `onMutate`).
3. Si la API devuelve `409` → revertir la tarjeta a su columna original y mostrar `ConflictAlert`.
4. Si la API devuelve otro error → revertir y mostrar toast de error genérico.

### 8.3 Optimistic Locking — ConflictAlert

Cuando `PATCH /tickets/:id` devuelve `409 Conflict`:

- Mostrar `ConflictAlert` dentro del `TicketModal`: _"Alguien modificó este ticket mientras lo editabas. Recarga para ver los cambios."_
- **No borrar los datos del formulario**; el usuario decide si descarta o copia sus cambios.
- Botón "Recargar ticket" en el alert hace `refetch` del query `['ticket', id]` y cierra el alert.

### 8.4 Flag "Bloqueado"

- `isBlocked` es un toggle independiente del estado del ticket.
- En `TicketCard`: si `isBlocked === true`, mostrar `BlockedBadge` superpuesto sobre la tarjeta (badge rojo "Bloqueado").
- El ticket permanece en su columna actual; `isBlocked` no afecta el flujo de columnas.
- Editar `isBlocked` usa el mismo endpoint `PATCH /tickets/:id` (incluye `version`).

### 8.5 Archivar ticket ("Eliminar")

- El botón en UI dice **"Eliminar"** (PRD §2.2).
- Llama `DELETE /tickets/:id` (soft delete en backend, marca `archived_at`).
- Al éxito, el ticket desaparece del tablero (invalidar query `['tickets']`).
- No hay modal de confirmación adicional — la acción es directa.

### 8.6 Exportación CSV

- El botón "Exportar CSV" está **disabled** si `metrics.total === 0`.
- Tooltip en estado disabled: _"No hay datos para el rango seleccionado"_.
- Al hacer clic, construir URL `GET /api/metrics/export` con los filtros activos del dashboard y disparar la descarga via `window.location.href` o un `<a>` programático.
- Nombre del archivo: `minijira-metrics-YYYY-MM.csv` (mes inicial del rango).
- Si el servidor devuelve `400` → toast "Rango de fechas inválido".
- Si el servidor devuelve `401` → redirigir a `/login`.

### 8.7 Polling automático del tablero

- TanStack Query refrescará la lista de tickets cada **30 segundos** en background.
- El refetch solo ocurre si el tab está activo (`refetchIntervalInBackground: false`).
- Durante el refetch en background, el tablero no muestra spinner; los cambios se aplican silenciosamente.

### 8.8 Sesión expirada durante la navegación

- El interceptor de Axios detecta `401` persistente (refresh fallido) y llama `navigateTo('/login')`.
- El formulario abierto (si existe) se pierde; no hay recuperación de estado post-login en v1.

### 8.9 Comentarios

- Texto plano; sin renderizado markdown.
- Al enviar, limpiar el campo de texto.
- `@handle` se escribe libremente; el frontend no necesita parsear menciones (el backend maneja la notificación).
- Un comentario no se edita; solo se archiva (soft delete). Al archivarlo, desaparece de la lista en el cliente (invalidar query de comentarios).

---

## 9. Validaciones de Formulario (Zod)

### ticketSchema

```typescript
z.object({
  title: z.string().min(1, 'El título es requerido').max(120, 'Máximo 120 caracteres'),
  description: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High']),
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
  isBlocked: z.boolean(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  labels: z.array(z.string()).optional(),
})
```

### commentSchema

```typescript
z.object({
  text: z.string().min(1, 'El comentario no puede estar vacío').max(2000),
})
```

---

## 10. Rutas de API consumidas por el Frontend

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/auth/google` | Inicia flujo OAuth (redirect) |
| `POST` | `/api/auth/refresh` | Renueva access token usando cookie |
| `DELETE` | `/api/auth/logout` | Invalida refresh token en Redis |
| `GET` | `/api/users/me` | Usuario autenticado actual |
| `GET` | `/api/users` | Lista de usuarios (para selects) |
| `GET` | `/api/tickets` | Lista tickets del board (con filtros query) |
| `POST` | `/api/tickets` | Crear ticket |
| `GET` | `/api/tickets/:id` | Detalle de ticket |
| `PATCH` | `/api/tickets/:id` | Editar ticket (incluye `version` en body) |
| `PATCH` | `/api/tickets/:id/status` | Cambiar estado (drag & drop; incluye `version`) |
| `DELETE` | `/api/tickets/:id` | Archivar ticket (soft delete) |
| `GET` | `/api/tickets/:id/comments` | Lista comentarios de un ticket |
| `POST` | `/api/tickets/:id/comments` | Añadir comentario |
| `DELETE` | `/api/comments/:id` | Archivar comentario |
| `GET` | `/api/metrics` | Datos del dashboard (con filtros query) |
| `GET` | `/api/metrics/export` | Descarga CSV (streaming) |

---

## 11. Decisiones de Diseño Visual

- **Paleta**: Tailwind CSS por defecto + tokens de shadcn/ui (neutros con acentos). Sin modo oscuro (PRD §3).
- **Idioma de la UI**: español (etiquetas de estado, botones, mensajes de error).
- **Breakpoints**: la app es **desktop-first**; herramienta interna de equipo. No se especifica layout responsive para v1.
- **Iconografía**: Lucide React (incluida por shadcn/ui).
- **Tipografía**: Inter (via Tailwind `font-sans`).
- **Prioridades — colores de badge**:
  - `Low` → gris (`bg-gray-100 text-gray-600`)
  - `Medium` → ámbar (`bg-amber-100 text-amber-700`)
  - `High` → rojo (`bg-red-100 text-red-700`)
- **Bloqueado — badge**: `bg-red-500 text-white` superpuesto en esquina superior derecha de `TicketCard`.

---

## 12. Pendientes antes de iniciar desarrollo

> Puntos que siguen abiertos en el PRD §7 y afectan el frontend:

| Ítem | Impacto en frontend |
|---|---|
| Confirmar proveedor OAuth (Google Workspace u otro) | Ruta `/api/auth/<proveedor>` y texto del botón de login |
| Confirmar 4 columnas + badge "Bloqueado" (aprobación de Laura) | Define definitivamente la estructura del KanbanBoard |
| Confirmar que tickets archivados cuentan en métricas históricas | Campo `archived` en CSV y lógica del gráfico ClosedByMonth |
