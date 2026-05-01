import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axiosInstance'
import { API } from '@/lib/api/endpoints'
import type { Comment } from '@/types'

export function useComments(ticketId: string) {
  return useQuery<Comment[]>({
    queryKey: ['comments', ticketId],
    queryFn: () =>
      apiClient.get<Comment[]>(API.tickets.comments(ticketId)).then((r) => r.data),
    enabled: !!ticketId,
  })
}

export function useAddComment(ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) =>
      apiClient.post<Comment>(API.tickets.comments(ticketId), { body: text }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', ticketId] })
    },
  })
}
