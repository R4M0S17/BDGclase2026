import { useOptimistic, useTransition, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '@/stores/uiStore'
import type { BoardFilters, Role, Ticket, TicketStatus } from '@/types'
import { useTickets, moveTicketStatus } from '@/hooks/useTickets'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import KanbanColumn from './KanbanColumn'

const COLUMN_CONFIG: { status: TicketStatus; label: string; dotColor: string }[] = [
  { status: 'todo',        label: 'To-Do',      dotColor: 'bg-outline-variant' },
  { status: 'in_progress', label: 'In Progress', dotColor: 'bg-primary' },
  { status: 'review',      label: 'Review',      dotColor: 'bg-outline-variant/50' },
  { status: 'done',        label: 'Done',        dotColor: 'bg-tertiary-container' },
]

function groupByStatus(tickets: Ticket[]): Record<TicketStatus, Ticket[]> {
  const groups = { todo: [], in_progress: [], review: [], done: [] } as Record<TicketStatus, Ticket[]>
  for (const t of tickets) groups[t.status]?.push(t)
  return groups
}

// Rendered only when data is confirmed — useOptimistic initializes with a real Ticket[]
function KanbanBoardBody({
  tickets,
  boardFilters,
}: {
  tickets: Ticket[]
  boardFilters: BoardFilters
}) {
  const currentUser = useUIStore((s) => s.currentUser)
  const queryClient = useQueryClient()
  const [, startTransition] = useTransition()
  const [draggingTicketId, setDraggingTicketId] = useState<string | null>(null)

  const [optimisticTickets, updateOptimistic] = useOptimistic(
    tickets,
    (state: Ticket[], action: { id: string; status: TicketStatus }) =>
      state.map((t) => (t.id === action.id ? { ...t, status: action.status } : t)),
  )

  function handleMoveCard(ticketId: string, toStatus: TicketStatus) {
    const ticket = tickets.find((t) => t.id === ticketId)
    if (!ticket || ticket.status === toStatus) return

    startTransition(async () => {
      updateOptimistic({ id: ticketId, status: toStatus })
      try {
        const updated = await moveTicketStatus(ticketId, toStatus, ticket.version)
        queryClient.setQueryData<Ticket[]>(['tickets', boardFilters], (prev) =>
          (prev ?? []).map((t) => (t.id === updated.id ? updated : t)),
        )
      } catch {
        queryClient.invalidateQueries({ queryKey: ['tickets', boardFilters] })
      }
    })
  }

  const byStatus = groupByStatus(optimisticTickets)
  const userId = currentUser?.id ?? ''
  const userRole = (currentUser?.role ?? 'member') as Role

  return (
    <div className="flex gap-6">
      {COLUMN_CONFIG.map((col) => (
        <KanbanColumn
          key={col.status}
          status={col.status}
          label={col.label}
          dotColor={col.dotColor}
          tickets={byStatus[col.status]}
          currentUserId={userId}
          currentUserRole={userRole}
          draggingTicketId={draggingTicketId}
          onMoveCard={handleMoveCard}
          onDragStart={setDraggingTicketId}
          onDragEnd={() => setDraggingTicketId(null)}
        />
      ))}
    </div>
  )
}

export default function KanbanBoard() {
  const boardFilters = useUIStore((s) => s.boardFilters)
  const { data, isLoading } = useTickets(boardFilters)

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return <KanbanBoardBody tickets={data} boardFilters={boardFilters} />
}
