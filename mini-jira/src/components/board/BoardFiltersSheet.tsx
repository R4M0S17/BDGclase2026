import { X, RotateCcw } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useUsers } from '@/hooks/useUsers'
import { useTags } from '@/hooks/useTags'
import type { Priority, TicketStatus } from '@/types'

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low']
const STATUSES: TicketStatus[] = ['todo', 'in_progress', 'review', 'done']
const STATUS_LABEL: Record<TicketStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function BoardFiltersSheet({ open, onClose }: Props) {
  const boardFilters = useUIStore((s) => s.boardFilters)
  const setBoardFilters = useUIStore((s) => s.setBoardFilters)
  const resetBoardFilters = useUIStore((s) => s.resetBoardFilters)
  const { data: users } = useUsers()
  const { data: tags } = useTags()

  if (!open) return null

  function togglePriority(p: Priority) {
    const has = boardFilters.priority.includes(p)
    setBoardFilters({
      priority: has
        ? boardFilters.priority.filter((x) => x !== p)
        : [...boardFilters.priority, p],
    })
  }

  function toggleStatus(s: TicketStatus) {
    const has = boardFilters.status.includes(s)
    setBoardFilters({
      status: has
        ? boardFilters.status.filter((x) => x !== s)
        : [...boardFilters.status, s],
    })
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div
        className="flex-1 bg-inverse-surface/10 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="w-[320px] h-full bg-surface-container-lowest flex flex-col shadow-[0px_12px_32px_rgba(12,14,16,0.12)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 shrink-0">
          <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant">
            Filters
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-outline-variant hover:bg-surface-container-high hover:text-inverse-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {/* Priority */}
          <div>
            <p className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant mb-3">
              Priority
            </p>
            <div className="flex flex-col gap-2">
              {PRIORITIES.map((p) => (
                <label key={p} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={boardFilters.priority.includes(p)}
                    onChange={() => togglePriority(p)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-[0.875rem] text-inverse-surface">{p}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant mb-3">
              Status
            </p>
            <div className="flex flex-col gap-2">
              {STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={boardFilters.status.includes(s)}
                    onChange={() => toggleStatus(s)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-[0.875rem] text-inverse-surface">{STATUS_LABEL[s]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <p className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant mb-3">
              Assignee
            </p>
            <select
              value={boardFilters.assigneeId ?? ''}
              onChange={(e) =>
                setBoardFilters({ assigneeId: e.target.value || null })
              }
              className="w-full px-3 py-2 text-[0.875rem] bg-surface-container-low rounded-md text-inverse-surface outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="">All members</option>
              {Array.isArray(users) && users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tag */}
          {tags && tags.length > 0 && (
            <div>
              <p className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant mb-3">
                Tag
              </p>
              <select
                value={boardFilters.tagId ?? ''}
                onChange={(e) =>
                  setBoardFilters({ tagId: e.target.value ? Number(e.target.value) : null })
                }
                className="w-full px-3 py-2 text-[0.875rem] bg-surface-container-low rounded-md text-inverse-surface outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="">All tags</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date range */}
          <div>
            <p className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant mb-3">
              Date Range
            </p>
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-[0.75rem] text-inverse-surface/60 block mb-1">From</label>
                <input
                  type="date"
                  value={boardFilters.dateFrom ?? ''}
                  onChange={(e) => setBoardFilters({ dateFrom: e.target.value || null })}
                  className="w-full px-3 py-2 text-[0.875rem] bg-surface-container-low rounded-md text-inverse-surface outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-[0.75rem] text-inverse-surface/60 block mb-1">To</label>
                <input
                  type="date"
                  value={boardFilters.dateTo ?? ''}
                  onChange={(e) => setBoardFilters({ dateTo: e.target.value || null })}
                  className="w-full px-3 py-2 text-[0.875rem] bg-surface-container-low rounded-md text-inverse-surface outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-outline-variant/10 shrink-0">
          <button
            onClick={() => { resetBoardFilters(); onClose() }}
            className="flex items-center gap-1.5 text-[0.875rem] text-primary hover:text-primary/80 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset filters
          </button>
        </div>
      </aside>
    </div>
  )
}
