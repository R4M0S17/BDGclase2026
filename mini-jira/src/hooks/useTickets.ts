import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTicket, fetchTickets } from '@/lib/api/tickets'
import { apiClient } from '@/lib/api/axiosInstance'
import { API } from '@/lib/api/endpoints'
import type { BoardFilters, Ticket, TicketStatus } from '@/types'
import type { EditTicketFormValues, NewTicketFormValues } from '@/lib/validators/ticketSchema'

function toApiParams(filters: BoardFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (filters.priority.length) params.priority = filters.priority.map((p) => p.toLowerCase())
  if (filters.status.length) params.status = filters.status
  if (filters.assigneeId) params.assigneeId = filters.assigneeId
  if (filters.tagId) params.tagId = filters.tagId
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
    mutationFn: (data: EditTicketFormValues) => {
      const body: Record<string, unknown> = {
        title: data.title,
        description: data.description,
        priority: data.priority.toLowerCase(),
        isBlocked: data.isBlocked,
        version: data.version,
      }
      if (data.tagIds !== undefined) body.tagIds = data.tagIds
      return apiClient.patch(API.tickets.update(ticketId), body).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export async function moveTicketStatus(
  ticketId: string,
  newStatus: TicketStatus,
  version: number,
): Promise<Ticket> {
  const r = await apiClient.patch<Ticket>(API.tickets.updateStatus(ticketId), {
    status: newStatus,
    version,
  })
  return r.data
}
