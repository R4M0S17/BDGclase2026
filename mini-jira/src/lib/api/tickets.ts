import type { NewTicketFormValues } from '@/lib/validators/ticketSchema'
import type { Priority, Ticket, TicketStatus } from '@/types'
import { API } from './endpoints'
import { apiClient } from './axiosInstance'

// --- Types as defined in api-contract.md ---

export interface ApiTicket {
  id: number
  title: string
  description: string | null
  status: TicketStatus
  priority: 'high' | 'medium' | 'low'
  isBlocked: boolean
  version: number
  projectId: number | null
  createdBy: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  assigneeIds?: number[]
  tagIds?: number[]
}

interface PaginatedTicketsResponse {
  data: ApiTicket[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

// --- Mapper: API response → frontend Ticket ---

const PRIORITY_MAP: Record<ApiTicket['priority'], Priority> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function mapApiTicket(t: ApiTicket): Ticket {
  return {
    id: String(t.id),
    title: t.title,
    description: t.description ?? undefined,
    status: t.status,
    priority: PRIORITY_MAP[t.priority],
    isBlocked: t.isBlocked,
    projectId: t.projectId != null ? String(t.projectId) : null,
    assignees: [],
    assigneeIds: t.assigneeIds ?? [],
    labels: [],
    tagIds: t.tagIds ?? [],
    createdBy: { id: String(t.createdBy), name: '—', email: '', role: 'user' },
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    archivedAt: t.archivedAt ?? undefined,
    version: t.version,
  }
}

// --- P0 API functions ---

export async function fetchTickets(params: Record<string, unknown>): Promise<Ticket[]> {
  const r = await apiClient.get<PaginatedTicketsResponse>(API.tickets.list, { params })
  return r.data.data.map(mapApiTicket)
}

export async function createTicket(data: NewTicketFormValues): Promise<Ticket> {
  const r = await apiClient.post<ApiTicket>(API.tickets.create, {
    title: data.title,
    description: data.description,
    priority: data.priority.toLowerCase(),
  })
  return mapApiTicket(r.data)
}
