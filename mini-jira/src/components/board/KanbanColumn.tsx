import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { Role, Ticket, TicketStatus } from '@/types'
import TaskCard from './TicketCard'
import EmptyColumnSlot from './EmptyColumnSlot'

interface KanbanColumnProps {
  status: TicketStatus
  label: string
  dotColor: string
  tickets: Ticket[]
  currentUserId: string
  currentUserRole: Role
  draggingTicketId: string | null
  onMoveCard: (ticketId: string, toStatus: TicketStatus) => void
  onDragStart: (ticketId: string) => void
  onDragEnd: () => void
}

export default function KanbanColumn({
  status,
  label,
  dotColor,
  tickets,
  currentUserId,
  currentUserRole,
  draggingTicketId,
  onMoveCard,
  onDragStart,
  onDragEnd,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div className="flex flex-col min-w-[260px] w-[260px]">
      <div className="flex items-center gap-2 mb-4 px-0.5">
        <span className={['w-2 h-2 rounded-full shrink-0', dotColor].join(' ')} />
        <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-inverse-surface/70 font-medium flex-1">
          {label}
        </span>
        <span className="text-[0.6875rem] text-outline-variant font-medium">{tickets.length}</span>
        <button className="w-5 h-5 flex items-center justify-center rounded text-outline-variant hover:text-inverse-surface transition-colors">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        className={[
          'flex flex-col gap-3 rounded-lg min-h-[80px] p-1 -m-1 transition-colors',
          isDragOver && draggingTicketId ? 'bg-surface-container-high' : '',
        ].join(' ')}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={() => {
          setIsDragOver(false)
          if (draggingTicketId) onMoveCard(draggingTicketId, status)
        }}
      >
        {tickets.length === 0 ? (
          <EmptyColumnSlot />
        ) : (
          tickets.map((ticket) => (
            <TaskCard
              key={ticket.id}
              ticket={ticket}
              canEdit={currentUserRole === 'admin' || currentUserId === ticket.createdBy.id}
              onDragStart={() => onDragStart(ticket.id)}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  )
}
