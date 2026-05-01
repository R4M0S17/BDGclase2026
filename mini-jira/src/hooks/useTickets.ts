import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTicket, fetchTickets } from '@/lib/api/tickets'
import { apiClient } from '@/lib/api/axiosInstance'
import { API } from '@/lib/api/endpoints'
import type { BoardFilters, Ticket, TicketStatus } from '@/types'
import type { EditTicketFormValues, NewTicketFormValues } from '@/lib/validators/ticketSchema'

function toApiParams(filters: BoardFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (filters.priority.length) params['priority[]'] = filters.priority.map((p) => p.toLowerCase())
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
    queryFn: () => fetchTickets(toApiParams(filters)),
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: NewTicketFormValues) => createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useUpdateTicket(ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: EditTicketFormValues) =>
      apiClient.patch<Ticket>(API.tickets.update(ticketId), data).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Ticket>(['ticket', ticketId], updated)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
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
