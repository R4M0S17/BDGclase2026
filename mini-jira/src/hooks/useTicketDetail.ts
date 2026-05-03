import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axiosInstance'
import { API } from '@/lib/api/endpoints'
import { mapApiTicket, type ApiTicket } from '@/lib/api/tickets'
import type { Ticket } from '@/types'

export function useTicketDetail(ticketId: string | null) {
  return useQuery<Ticket>({
    queryKey: ['ticket', ticketId],
    queryFn: () =>
      apiClient.get<ApiTicket>(API.tickets.detail(ticketId!)).then((r) => mapApiTicket(r.data)),
    enabled: !!ticketId,
  })
}

export function useArchiveTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ticketId: string) => apiClient.delete(API.tickets.archive(ticketId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
