import { ChevronRight, SlidersHorizontal, Share2 } from 'lucide-react';
import KanbanBoard from '@/components/board/KanbanBoard';

const MEMBER_COLORS = [
  'bg-gradient-to-br from-primary to-primary-dim text-on-primary',
  'bg-tertiary-container text-on-tertiary-fixed',
  'bg-error-container text-on-error-container',
  'bg-surface-container-highest text-inverse-surface',
];

const MEMBER_INITIALS = ['AL', 'KR', 'TM', 'JD'];

export default function BoardPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="px-8 pt-8 pb-0 flex items-center gap-1.5">
        <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant">
          Projects
        </span>
        <ChevronRight className="w-3 h-3 text-outline-variant" />
        <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant">
          Alpha
        </span>
      </div>

      {/* BoardHeader */}
      <div className="px-8 pt-4 pb-6 flex items-end justify-between">
        <h1 className="text-[2.75rem] font-semibold text-inverse-surface tracking-[-0.02em] leading-none">
          Sprint Board
        </h1>

        <div className="flex items-center gap-3 pb-1">
          {/* AvatarStack */}
          <div className="flex items-center">
            {MEMBER_INITIALS.map((initials, i) => (
              <div
                key={initials}
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center',
                  'text-[0.6rem] font-semibold',
                  'ring-2 ring-surface-container-lowest',
                  MEMBER_COLORS[i],
                  i > 0 ? '-ml-2' : '',
                ].join(' ')}
              >
                {initials}
              </div>
            ))}
            <div className="w-7 h-7 rounded-full -ml-2 bg-surface-container-high ring-2 ring-surface-container-lowest flex items-center justify-center">
              <span className="text-[0.6rem] font-semibold text-inverse-surface/60">
                +4
              </span>
            </div>
          </div>

          {/* Filter */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-outline-variant/20 text-primary text-[0.875rem] bg-transparent hover:bg-primary-container/30 transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
          </button>

          {/* Share */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-outline-variant/20 text-primary text-[0.875rem] bg-transparent hover:bg-primary-container/30 transition-colors">
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto px-8 pb-8">
        <KanbanBoard />
      </div>
    </div>
  );
}
