# Mini Jira — Contexto Técnico Completo

## Stack

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript + Vite |
| Routing | react-router-dom (createBrowserRouter) |
| Data fetching | @tanstack/react-query — `staleTime: 30s`, `refetchInterval: 30s`, `retry: 1` |
| Estado UI | Zustand — `useUIStore` (`boardFilters`, `currentUser`, `activeTicketId`, `accessToken`) |
| HTTP | `apiClient` (named export) en `src/lib/api/axiosInstance` — Bearer JWT + refresh automático con deduplicación |
| Estilos | Tailwind CSS — design system "Lucid Efficiency" (ver `CLAUDE.md`) |
| Componentes base | shadcn/ui |

---

## Auth (DEV bypass)

`src/lib/auth/oauthRedirect.ts` — `redirectToOAuth()` simula el flujo OAuth sin backend:
```ts
setAccessToken('mock-token-dev-' + Date.now())
useUIStore.getState().setCurrentUser({ id: 'usr-001', name: 'Ana García', role: 'admin' })
```
No hace navigate — la navegación a `/board` la dispara el `useEffect` en `LoginPage` cuando detecta `accessToken` en el store.

---

## Arquitectura del Board

```
KanbanBoard (src/components/board/KanbanBoard.tsx)
  ↓ isLoading || !data → <LoadingSpinner>
  ↓ data: Ticket[] → <KanbanBoardBody>
      ├── useOptimistic(tickets, reducer)
      ├── useTransition → handleMoveCard
      ├── useState → draggingTicketId
      └── KanbanColumn ×4
            └── TaskCard (TicketCard.tsx) ×n
                  ├── StatusBadge (topBadge: blocked | done | in-progress)
                  └── StatusBadge (bottomBadge: prioridad)
```

**Regla canEdit:** `currentUserRole === 'admin' || currentUserId === ticket.createdBy.id`

---

## Optimistic Updates — React 19

### Patrón implementado

`useOptimistic` + `useTransition` en `KanbanBoardBody` para mover tarjetas entre columnas:

```tsx
const [optimisticTickets, updateOptimistic] = useOptimistic(
  tickets,   // ← Ticket[] garantizado (ver sección Bug crítico)
  (state, action: { id: string; status: TicketStatus }) =>
    state.map((t) => (t.id === action.id ? { ...t, status: action.status } : t)),
)

function handleMoveCard(ticketId: string, toStatus: TicketStatus) {
  const ticket = tickets.find((t) => t.id === ticketId)
  if (!ticket || ticket.status === toStatus) return

  startTransition(async () => {
    updateOptimistic({ id: ticketId, status: toStatus })   // UI instantánea
    try {
      const updated = await moveTicketStatus(ticketId, toStatus, ticket.version)
      queryClient.setQueryData(['tickets', boardFilters], (prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      )
    } catch {
      queryClient.invalidateQueries({ queryKey: ['tickets', boardFilters] })
      // useOptimistic revierte automáticamente al fallar la transición
    }
  })
}
```

### Simulación de backend lento (src/hooks/useTickets.ts)

`moveTicketStatus` es una función async (no hook) que simula latencia:
```ts
export async function moveTicketStatus(ticketId, newStatus, version): Promise<Ticket> {
  await new Promise<void>((resolve) => setTimeout(resolve, 1500))
  if (Math.random() < 0.3) throw new Error('Simulated conflict: version mismatch')
  return apiClient.patch(API.tickets.updateStatus(ticketId), { status: newStatus, version }).then(r => r.data)
}
```
- 1500ms de delay intencional para visualizar el estado optimista
- 30% de fallo aleatorio para hacer observable el rollback automático de `useOptimistic`

### Rollback

Cuando `moveTicketStatus` lanza, la `startTransition` async falla. React 19 detecta el error en la transición y revierte `optimisticTickets` al valor de `tickets` (el passthrough original). La tarjeta vuelve a su columna sin código explícito de rollback.

---

## Bug Crítico Resuelto: useOptimistic + StrictMode + [] inicial

### Síntoma
```
TypeError: Cannot read properties of undefined (reading 'push')
    at groupByStatus (KanbanBoard.tsx)
```

### Causa raíz

React 19.2.x en StrictMode double-invoca funciones internas del hook durante el ciclo de montaje. `useOptimistic` llama internamente a `updateReducerImpl`, que puede procesar la `baseQueue` con un action cuyo `status` es `undefined` si el hook se inicializó con `[]` (vacío) y luego transicionó a `Ticket[]` cuando los datos llegaron del servidor.

Esto corrompía uno de los tickets en `optimisticTickets`, dejando `ticket.status = undefined`. `groupByStatus` intentaba `groups[undefined].push(t)` → crash.

El código original `groupByStatus(data ?? [])` no tenía este problema porque accedía directamente a los datos de la query sin pasar por `useOptimistic`.

### Solución aplicada

Separar `KanbanBoard` en dos componentes dentro del **mismo archivo**:

```tsx
// Componente interno — solo se monta cuando data es Ticket[] real
function KanbanBoardBody({ tickets, boardFilters }) {
  // useOptimistic SIEMPRE se inicializa con Ticket[] válido
  const [optimisticTickets, updateOptimistic] = useOptimistic(tickets, reducer)
  // ...
}

// Componente exportado — gestiona el estado de carga
export default function KanbanBoard() {
  const { data, isLoading } = useTickets(boardFilters)

  if (isLoading || !data) return <LoadingSpinner />

  return <KanbanBoardBody tickets={data} boardFilters={boardFilters} />
}
```

**Regla:** `useOptimistic` nunca debe inicializarse con un array vacío `[]` que luego va a ser reemplazado por datos reales. Hay que garantizar que el passthrough ya es el valor estable antes de montar el componente que lo usa.

### Por qué `isLoading || !data` y no solo `isLoading`

`isLoading` (TanStack Query) = `isPending && isFetching`. Si la query falla y entra en estado `error`, `isLoading = false` pero `data = undefined`. Sin el `|| !data`, el board intentaría renderizar con datos vacíos y `useOptimistic` volvería a tener el problema de inicialización.

---

## Drag & Drop — Implementación nativa HTML5

**Sin librerías externas.** Usa la API nativa del browser:

- `TicketCard.tsx` — `draggable={canEdit}` + `onDragStart` / `onDragEnd`
- `KanbanColumn.tsx` — `onDragOver` (con `e.preventDefault()`) + `onDrop` + estado local `isDragOver`
- `KanbanBoard.tsx` — `draggingTicketId: string | null` en `useState` del componente interno

Highlight visual del drop target: clase `bg-surface-container-high` cuando `isDragOver && draggingTicketId`.

---

## Endpoints relevantes

```ts
tickets.list:         GET  /api/tickets
tickets.updateStatus: PATCH /api/tickets/:id/status  → body: { status, version }
tickets.archive:      DELETE /api/tickets/:id
```

El campo `version` en `Ticket` es para Optimistic Locking (H3 del backlog): el backend rechaza el PATCH si `version` no coincide con la fila actual.

---

## Tipos clave

```ts
type TicketStatus = 'todo' | 'in_progress' | 'review' | 'done'
type Priority     = 'Low' | 'Medium' | 'High'   // title case — diferente al enum del DB (lowercase)
type Role         = 'admin' | 'member'
```

**Atención:** la BD define `priority` en lowercase (`'low'`, `'medium'`, `'high'`), pero el tipo TypeScript usa title case. Si el backend devuelve el enum directamente, hay que normalizar en el mapper.

---

## Archivos principales

| Archivo | Responsabilidad |
|---|---|
| `src/stores/uiStore.ts` | Estado global UI (Zustand) |
| `src/hooks/useTickets.ts` | Query GET tickets + función `moveTicketStatus` |
| `src/components/board/KanbanBoard.tsx` | Orquestador del board + `useOptimistic` |
| `src/components/board/KanbanColumn.tsx` | Columna Kanban + zona de drop |
| `src/components/board/TicketCard.tsx` | Tarjeta draggable |
| `src/components/board/StatusBadge.tsx` | Badges de estado y prioridad |
| `src/lib/api/axiosInstance.ts` | Axios con interceptor JWT + refresh |
| `src/lib/api/endpoints.ts` | URLs de la API |
| `src/lib/auth/oauthRedirect.ts` | Bypass OAuth para dev |
| `src/pages/BoardPage.tsx` | Header del sprint board + `<KanbanBoard>` |
