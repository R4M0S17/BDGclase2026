import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axiosInstance'
import { API } from '@/lib/api/endpoints'
import type { DashboardFilters, DashboardMetrics } from '@/types'

const MOCK_METRICS: DashboardMetrics = {
  total: 24,
  closedByMonth: [
    { month: 'Ene', closed: 3 },
    { month: 'Feb', closed: 5 },
    { month: 'Mar', closed: 4 },
    { month: 'Abr', closed: 7 },
    { month: 'May', closed: 5 },
  ],
  byStatus: [
    { status: 'todo', count: 6 },
    { status: 'in_progress', count: 8 },
    { status: 'review', count: 4 },
    { status: 'done', count: 6 },
  ],
  byMember: [
    { user: { id: 'usr-001', name: 'Ana García', email: 'ana@example.com', role: 'admin' }, activeCount: 5 },
    { user: { id: 'usr-002', name: 'Carlos Ruiz', email: 'carlos@example.com', role: 'user' }, activeCount: 4 },
    { user: { id: 'usr-003', name: 'María López', email: 'maria@example.com', role: 'user' }, activeCount: 3 },
  ],
}

export function useMetrics(filters: DashboardFilters) {
  return useQuery<DashboardMetrics>({
    queryKey: ['metrics', filters],
    queryFn: () =>
      apiClient
        .get<DashboardMetrics>(API.metrics.dashboard, { params: filters })
        .then((r) => {
          if (!r.data || !Array.isArray(r.data.closedByMonth)) return MOCK_METRICS
          return r.data
        }),
    initialData: MOCK_METRICS,
  })
}
