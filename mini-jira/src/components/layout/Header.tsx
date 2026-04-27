import { Search, Bell, HelpCircle, Settings } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

export default function Header() {
  const currentUser = useUIStore((s) => s.currentUser)

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <header className="h-14 bg-surface-container-lowest shadow-[0px_12px_32px_rgba(12,14,16,0.04)] flex items-center px-6 gap-4 shrink-0 z-10">
      {/* Brand name / workspace */}
      <span className="text-[0.875rem] font-semibold text-inverse-surface tracking-tight w-24 shrink-0">
        Lucid
      </span>

      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-outline-variant pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks, sprints..."
            className="w-full pl-9 pr-4 py-1.5 text-[0.875rem] bg-surface-container-low rounded-md outline-none text-inverse-surface placeholder:text-outline-variant focus:ring-1 focus:ring-outline-variant/30 transition-shadow"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Action icons */}
      <div className="flex items-center gap-1">
        <button className="w-8 h-8 flex items-center justify-center rounded-md text-inverse-surface/50 hover:bg-surface-container-high/60 hover:text-inverse-surface transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-md text-inverse-surface/50 hover:bg-surface-container-high/60 hover:text-inverse-surface transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-md text-inverse-surface/50 hover:bg-surface-container-high/60 hover:text-inverse-surface transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center shrink-0">
        <span className="text-[0.6875rem] font-semibold text-on-primary uppercase tracking-wide">
          {initials}
        </span>
      </div>
    </header>
  )
}
