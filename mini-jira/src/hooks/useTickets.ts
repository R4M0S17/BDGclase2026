import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axiosInstance'
import { API } from '@/lib/api/endpoints'
import type { BoardFilters, Ticket, TicketStatus } from '@/types'

function toApiParams(filters: BoardFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (filters.priority.length) params['priority[]'] = filters.priority
  if (filters.status.length) params['status[]'] = filters.status
  if (filters.assigneeId) params.assigneeId = filters.assigneeId
  if (filters.label) params.label = filters.label
  if (filters.dateFrom) params.dateFrom = filters.dateFrom
  if (filters.dateTo) params.dateTo = filters.dateTo
  return params
}

export function useTickets(filters: BoardFilters) {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: () =>
      apiClient
        .get<Ticket[]>(API.tickets.list, { params: toApiParams(filters) })
        .then((r) => r.data),
  })
}

export async function moveTicketStatus(
  ticketId: string,
  newStatus: TicketStatus,
  version: number,
): Promise<Ticket> {
  await new Promise<void>((resolve) => setTimeout(resolve, 1500))
  // 30% failure rate to make rollback observable in demo
  if (Math.random() < 0.3) throw new Error('Simulated conflict: version mismatch')
  const r = await apiClient.patch<Ticket>(API.tickets.updateStatus(ticketId), {
    status: newStatus,
    version,
  })
  return r.data
}
