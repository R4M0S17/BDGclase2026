import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { archiveProject, createProject, fetchProjects, updateProject } from '@/lib/api/projects'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchProjects(),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name?: string; description?: string }) => updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useArchiveProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
