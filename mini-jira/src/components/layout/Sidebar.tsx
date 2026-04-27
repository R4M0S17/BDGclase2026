import { NavLink, useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  List,
  LayoutGrid,
  BarChart2,
  AlertCircle,
  Settings,
  HelpCircle,
  Plus,
} from 'lucide-react'
import { apiClient } from '@/lib/api/axiosInstance'
import { clearAccessToken } from '@/lib/auth/authHelpers'
import { API } from '@/lib/api/endpoints'

const NAV_ITEMS = [
  { to: '/roadmap', label: 'Roadmap', Icon: TrendingUp },
  { to: '/backlog', label: 'Backlog', Icon: List },
  { to: '/board', label: 'Board', Icon: LayoutGrid },
  { to: '/reports', label: 'Reports', Icon: BarChart2 },
  { to: '/issues', label: 'Issues', Icon: AlertCircle },
]

export default function Sidebar() {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await apiClient.delete(API.auth.logout)
    } finally {
      clearAccessToken()
      navigate('/login')
    }
  }

  return (
    <aside className="w-60 h-full bg-surface-container-low flex flex-col shrink-0">
      {/* BrandMark */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center shrink-0">
            <LayoutGrid className="w-4 h-4 text-on-primary" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[0.875rem] font-semibold text-inverse-surface tracking-tight">
              Mini JIRA
            </span>
            <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant mt-0.5">
              Product Team
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2 rounded-md text-[0.875rem] transition-colors',
                isActive
                  ? 'bg-surface-container-lowest text-primary font-medium'
                  : 'text-inverse-surface/60 hover:bg-surface-container-high/60 hover:text-inverse-surface',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={['w-4 h-4 shrink-0', isActive ? 'text-primary' : ''].join(' ')}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 flex flex-col gap-0.5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-[0.875rem] text-inverse-surface/60 hover:bg-surface-container-high/60 hover:text-inverse-surface transition-colors w-full text-left"
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </button>
        <button className="flex items-center gap-3 px-3 py-2 rounded-md text-[0.875rem] text-inverse-surface/60 hover:bg-surface-container-high/60 hover:text-inverse-surface transition-colors w-full text-left">
          <HelpCircle className="w-4 h-4 shrink-0" />
          Support
        </button>

        <button className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gradient-to-br from-primary to-primary-dim text-on-primary text-[0.875rem] font-medium shadow-[0px_12px_32px_rgba(12,14,16,0.04)] hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Create Issue
        </button>
      </div>
    </aside>
  )
}
