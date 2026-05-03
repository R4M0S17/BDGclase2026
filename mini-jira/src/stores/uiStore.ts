import { create } from 'zustand'
import type { BoardFilters, DashboardFilters, TicketStatus } from '@/types'

function getDefaultDashboardFilters(): DashboardFilters {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10)
  const to = now.toISOString().slice(0, 10)
  return { from, to, status: [], assigneeId: null }
}

const DEFAULT_BOARD_FILTERS: BoardFilters = {
  status: [],
  priority: [],
  assigneeId: null,
  tagId: null,
  dateFrom: null,
  dateTo: null,
}

interface UIStore {
  boardFilters: BoardFilters
  setBoardFilters: (filters: Partial<BoardFilters>) => void
  resetBoardFilters: () => void

  activeTicketId: string | null
  setActiveTicketId: (id: string | null) => void

  createTicketOpen: boolean
  setCreateTicketOpen: (open: boolean) => void

  dashboardFilters: DashboardFilters
  setDashboardFilters: (filters: Partial<DashboardFilters>) => void

  currentUser: { id: string; name: string; role: string } | null
  setCurrentUser: (user: UIStore['currentUser']) => void

  accessToken: string | null
  setAccessToken: (token: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  boardFilters: DEFAULT_BOARD_FILTERS,
  setBoardFilters: (filters) =>
    set((s) => ({ boardFilters: { ...s.boardFilters, ...filters } })),
  resetBoardFilters: () => set({ boardFilters: DEFAULT_BOARD_FILTERS }),

  activeTicketId: null,
  setActiveTicketId: (id) => set({ activeTicketId: id }),

  createTicketOpen: false,
  setCreateTicketOpen: (open) => set({ createTicketOpen: open }),

  dashboardFilters: getDefaultDashboardFilters(),
  setDashboardFilters: (filters) =>
    set((s) => ({ dashboardFilters: { ...s.dashboardFilters, ...filters } })),

  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
}))

export function clearDashboardStatusFilter() {
  useUIStore.getState().setDashboardFilters({ status: [] as TicketStatus[] })
}
