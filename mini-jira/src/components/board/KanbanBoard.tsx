import { useOptimistic, useTransition, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, X } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import type { BoardFilters, Role, Ticket, TicketStatus } from '@/types'
import { useTickets, moveTicketStatus } from '@/hooks/useTickets'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import KanbanColumn from './KanbanColumn'

const STATUS_LABEL: Record<TicketStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

type ConflictInfo = { ticketTitle: string; attemptedStatus: TicketStatus }

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
  const [conflict, setConflict] = useState<ConflictInfo | null>(null)

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
        setConflict({ ticketTitle: ticket.title, attemptedStatus: toStatus })
      }
    })
  }

  const byStatus = groupByStatus(optimisticTickets)
  const userId = currentUser?.id ?? ''
  const userRole = (currentUser?.role ?? 'user') as Role

  return (
    <div className="flex flex-col gap-4">
      {conflict && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-error-container/20 border border-error-container/40">
          <AlertTriangle className="w-4 h-4 text-on-error-container shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[0.875rem] font-medium text-on-error-container">
              Version conflict
            </p>
            <p className="text-[0.875rem] text-on-error-container/80 mt-0.5">
              "{conflict.ticketTitle}" couldn't be moved to{' '}
              <span className="font-medium">{STATUS_LABEL[conflict.attemptedStatus]}</span> — another
              user modified this ticket first. Your change was reverted.
            </p>
          </div>
          <button
            onClick={() => setConflict(null)}
            className="w-6 h-6 rounded flex items-center justify-center text-on-error-container/60 hover:text-on-error-container hover:bg-error-container/30 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
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
    </div>
  )
}

export default function KanbanBoard() {
  const boardFilters = useUIStore((s) => s.boardFilters)
  const { data, isLoading, isError } = useTickets(boardFilters)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[0.875rem] text-outline-variant">
          No se pudieron cargar los tickets. Verifica que el servidor esté activo.
        </p>
      </div>
    )
  }

  return <KanbanBoardBody tickets={data} boardFilters={boardFilters} />
}
