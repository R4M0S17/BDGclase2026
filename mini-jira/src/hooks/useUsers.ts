import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axiosInstance'
import { API } from '@/lib/api/endpoints'
import type { User } from '@/types'

const MOCK_USERS: User[] = [
  { id: 'usr-001', name: 'Ana García', email: 'ana@example.com', role: 'admin' },
  { id: 'usr-002', name: 'Carlos Ruiz', email: 'carlos@example.com', role: 'user' },
  { id: 'usr-003', name: 'María López', email: 'maria@example.com', role: 'user' },
]

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () =>
      apiClient.get<User[]>(API.users.list).then((r) => {
        if (!Array.isArray(r.data)) return MOCK_USERS
        return r.data
      }),
    staleTime: 60_000,
    initialData: MOCK_USERS,
  })
}
