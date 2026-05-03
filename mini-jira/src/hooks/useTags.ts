import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axiosInstance'
import { API } from '@/lib/api/endpoints'
import type { Tag } from '@/types'

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () =>
      apiClient
        .get<{ data: Array<{ id: number; name: string }> }>(API.tags.list)
        .then((r) => r.data.data ?? []),
    staleTime: 60_000,
  })
}
