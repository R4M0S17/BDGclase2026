export type Role = 'admin' | 'member'

export type Priority = 'Low' | 'Medium' | 'High'

export type TicketStatus = 'todo' | 'in_progress' | 'review' | 'done'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatarUrl?: string
}

export interface Ticket {
  id: string
  title: string
  description?: string
  status: TicketStatus
  priority: Priority
  isBlocked: boolean
  assignees: User[]
  labels: string[]
  createdBy: User
  createdAt: string
  updatedAt: string
  archivedAt?: string
  version: number
}

export interface Comment {
  id: string
  ticketId: string
  text: string
  author: User
  createdAt: string
  archivedAt?: string
}

export interface MetricsByMonth {
  month: string
  closed: number
}

export interface MetricsByStatus {
  status: TicketStatus
  count: number
}

export interface MetricsByMember {
  user: User
  activeCount: number
}

export interface DashboardMetrics {
  closedByMonth: MetricsByMonth[]
  byStatus: MetricsByStatus[]
  byMember: MetricsByMember[]
  total: number
}

export interface BoardFilters {
  status: TicketStatus[]
  priority: Priority[]
  assigneeId: string | null
  label: string | null
  dateFrom: string | null
  dateTo: string | null
}

export interface DashboardFilters {
  from: string
  to: string
  status: TicketStatus[]
  assigneeId: string | null
}

export interface ApiError {
  message: string
  statusCode: number
}
