import { MessageSquare, Link2 } from 'lucide-react'
import { getAvatarColor } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import type { Priority, Ticket } from '@/types'
import StatusBadge from './StatusBadge'

type BadgeVariant = 'done' | 'blocked' | 'in-progress' | 'high-priority' | 'medium' | 'low-priority'

const PRIORITY_VARIANT: Record<Priority, BadgeVariant> = {
  High: 'high-priority',
  Medium: 'medium',
  Low: 'low-priority',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  High: 'High Priority',
  Medium: 'Medium',
  Low: 'Low Priority',
}

function resolveTopBadge(ticket: Ticket): { variant: BadgeVariant; label: string } | null {
  if (ticket.isBlocked) return { variant: 'blocked', label: 'Blocked' }
  if (ticket.status === 'done') return { variant: 'done', label: 'Done' }
  if (ticket.status === 'in_progress') return { variant: 'in-progress', label: 'In Progress' }
  return null
}

interface TaskCardProps {
  ticket: Ticket
  canEdit: boolean
  onDragStart: () => void
  onDragEnd: () => void
}

export default function TaskCard({ ticket, canEdit, onDragStart, onDragEnd }: TaskCardProps) {
  const topBadge = resolveTopBadge(ticket)
  const bottomBadge = { variant: PRIORITY_VARIANT[ticket.priority], label: PRIORITY_LABEL[ticket.priority] }
  const primaryAssignee = ticket.assignees[0]
  const setActiveTicketId = useUIStore((s) => s.setActiveTicketId)

  return (
    <div
      draggable={canEdit}
      onDragStart={canEdit ? onDragStart : undefined}
      onDragEnd={canEdit ? onDragEnd : undefined}
      onClick={() => setActiveTicketId(ticket.id)}
      className={[
        'bg-surface-container-lowest rounded-lg px-4 pt-4 pb-3',
        'shadow-[0px_12px_32px_rgba(12,14,16,0.04)]',
        ticket.isBlocked ? 'border-l-4 border-error-container' : '',
        canEdit ? 'cursor-grab active:cursor-grabbing active:opacity-50' : 'cursor-pointer',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        {topBadge ? (
          <StatusBadge variant={topBadge.variant} label={topBadge.label} />
        ) : (
          <div />
        )}
        <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant shrink-0">
          {ticket.id.toUpperCase()}
        </span>
      </div>

      <p
        className={[
          'text-[0.875rem] leading-[1.6] text-inverse-surface font-medium',
          ticket.status === 'done' ? 'line-through opacity-50' : '',
        ].join(' ')}
      >
        {ticket.title}
      </p>

      <div className="flex items-center justify-between mt-3">
        <StatusBadge variant={bottomBadge.variant} label={bottomBadge.label} />

        {primaryAssignee && (
          <div className="flex items-center gap-1.5">
            <div
              className={[
                'w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] font-semibold',
                getAvatarColor(primaryAssignee.id),
              ].join(' ')}
            >
              {primaryAssignee.name.slice(0, 2).toUpperCase()}
            </div>
          </div>
        )}

        {!primaryAssignee && (
          <div className="flex items-center gap-3 text-outline-variant">
            <span className="flex items-center gap-1 text-[0.75rem]">
              <MessageSquare className="w-3.5 h-3.5" />
              0
            </span>
            <span className="flex items-center gap-1 text-[0.75rem]">
              <Link2 className="w-3.5 h-3.5" />
              0
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
