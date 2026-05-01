import { useUIStore } from '@/stores/uiStore'
import { useUsers } from '@/hooks/useUsers'
import type { TicketStatus } from '@/types'

const STATUSES: { value: TicketStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
]

export default function MetricsFilters() {
  const filters = useUIStore((s) => s.dashboardFilters)
  const setFilters = useUIStore((s) => s.setDashboardFilters)
  const { data: users } = useUsers()

  function toggleStatus(status: TicketStatus) {
    const next = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status]
    setFilters({ status: next })
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant">
          Desde
        </span>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters({ from: e.target.value })}
          className="px-3 py-1.5 text-[0.875rem] bg-surface-container-lowest border border-outline-variant/20 rounded-md text-inverse-surface outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant">
          Hasta
        </span>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters({ to: e.target.value })}
          className="px-3 py-1.5 text-[0.875rem] bg-surface-container-lowest border border-outline-variant/20 rounded-md text-inverse-surface outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      <div className="flex items-center gap-1.5">
        {STATUSES.map((s) => {
          const active = filters.status.includes(s.value)
          return (
            <button
              key={s.value}
              onClick={() => toggleStatus(s.value)}
              className={[
                'px-3 py-1.5 rounded-md text-[0.75rem] font-medium transition-colors border',
                active
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-transparent text-inverse-surface/60 border-outline-variant/20 hover:bg-surface-container-high',
              ].join(' ')}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {Array.isArray(users) && (
        <select
          value={filters.assigneeId ?? ''}
          onChange={(e) => setFilters({ assigneeId: e.target.value || null })}
          className="px-3 py-1.5 text-[0.875rem] bg-surface-container-lowest border border-outline-variant/20 rounded-md text-inverse-surface outline-none focus:ring-1 focus:ring-primary/30"
        >
          <option value="">Todos los miembros</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
