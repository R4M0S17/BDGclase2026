import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axiosInstance'
import { API } from '@/lib/api/endpoints'
import type { Role, User } from '@/types'

interface ApiUser {
  id: number
  name: string
  email: string
  role: Role
}

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () =>
      apiClient
        .get<{ data: ApiUser[] }>(API.users.list, { params: { limit: 100 } })
        .then((r) =>
          (r.data.data ?? []).map((u) => ({
            id: String(u.id),
            name: u.name,
            email: u.email,
            role: u.role,
          }))
        ),
    staleTime: 60_000,
  })
}
