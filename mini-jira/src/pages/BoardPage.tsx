import { useState } from 'react'
import { ChevronRight, SlidersHorizontal, Share2, Check } from 'lucide-react'
import KanbanBoard from '@/components/board/KanbanBoard'
import BoardFiltersSheet from '@/components/board/BoardFiltersSheet'
import TicketDetailPanel from '@/components/ticket/TicketDetailPanel'
import { useUsers } from '@/hooks/useUsers'
import { useProjects } from '@/hooks/useProjects'
import { getAvatarColor } from '@/lib/utils'

export default function BoardPage() {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { data: users } = useUsers()
  const { data: projects } = useProjects()
  const activeProject = projects?.find((p) => p.status === 'active') ?? projects?.[0]

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const visibleUsers = Array.isArray(users) ? users.slice(0, 4) : []
  const extraCount = Array.isArray(users) ? Math.max(0, users.length - 4) : 0

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="px-8 pt-8 pb-0 flex items-center gap-1.5">
        <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant">
          Projects
        </span>
        {activeProject && (
          <>
            <ChevronRight className="w-3 h-3 text-outline-variant" />
            <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant">
              {activeProject.name}
            </span>
          </>
        )}
      </div>

      {/* BoardHeader */}
      <div className="px-8 pt-4 pb-6 flex items-end justify-between">
        <h1 className="text-[2.75rem] font-semibold text-inverse-surface tracking-[-0.02em] leading-none">
          Sprint Board
        </h1>

        <div className="flex items-center gap-3 pb-1">
          {/* AvatarStack */}
          <div className="flex items-center">
            {visibleUsers.map((user, i) => (
              <div
                key={user.id}
                title={user.name}
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center',
                  'text-[0.6rem] font-semibold',
                  'ring-2 ring-surface-container-lowest',
                  getAvatarColor(user.id),
                  i > 0 ? '-ml-2' : '',
                ].join(' ')}
              >
                {user.name.slice(0, 2).toUpperCase()}
              </div>
            ))}
            {extraCount > 0 && (
              <div className="w-7 h-7 rounded-full -ml-2 bg-surface-container-high ring-2 ring-surface-container-lowest flex items-center justify-center">
                <span className="text-[0.6rem] font-semibold text-inverse-surface/60">
                  +{extraCount}
                </span>
              </div>
            )}
          </div>

          {/* Filter */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-outline-variant/20 text-primary text-[0.875rem] bg-transparent hover:bg-primary-container/30 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-outline-variant/20 text-primary text-[0.875rem] bg-transparent hover:bg-primary-container/30 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto px-8 pb-8">
        <KanbanBoard />
      </div>

      <TicketDetailPanel />
      <BoardFiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </div>
  )
}
