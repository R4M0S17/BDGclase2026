import type { Project, ProjectStatus } from '@/types'
import { API } from './endpoints'
import { apiClient } from './axiosInstance'

// ─── API shape (as returned by the backend) ───────────────────────────────────

interface ApiProject {
  id: number
  name: string
  description: string | null
  slug: string
  status: ProjectStatus
  createdBy: number
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

interface PaginatedProjectsResponse {
  data: ApiProject[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapApiProject(p: ApiProject): Project {
  return {
    id:          String(p.id),
    name:        p.name,
    description: p.description ?? undefined,
    slug:        p.slug,
    status:      p.status,
    createdBy:   String(p.createdBy),
    createdAt:   p.createdAt,
    updatedAt:   p.updatedAt,
    archivedAt:  p.archivedAt ?? undefined,
  }
}

// ─── P0 API functions ─────────────────────────────────────────────────────────

export async function fetchProjects(params?: { status?: ProjectStatus; page?: number; limit?: number }): Promise<Project[]> {
  const r = await apiClient.get<PaginatedProjectsResponse>(API.projects.list, { params })
  return r.data.data.map(mapApiProject)
}

export async function createProject(data: { name: string; description?: string }): Promise<Project> {
  const r = await apiClient.post<ApiProject>(API.projects.create, data)
  return mapApiProject(r.data)
}

export async function updateProject(id: string, data: { name?: string; description?: string }): Promise<Project> {
  const r = await apiClient.patch<ApiProject>(API.projects.update(id), data)
  return mapApiProject(r.data)
}

export async function archiveProject(id: string): Promise<void> {
  await apiClient.delete(API.projects.archive(id))
}
