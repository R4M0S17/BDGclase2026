import { useState } from 'react'
import { FolderOpen, Plus, Pencil, Archive, MoreHorizontal } from 'lucide-react'
import { useProjects, useCreateProject, useUpdateProject, useArchiveProject } from '@/hooks/useProjects'
import { useUIStore } from '@/stores/uiStore'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Project } from '@/types'

// ─── Project form (create / edit) ─────────────────────────────────────────────

interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Project
  onSubmit: (data: { name: string; description?: string }) => void
  isPending: boolean
}

function ProjectForm({ open, onOpenChange, initial, onSubmit, isPending }: ProjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description: description.trim() || undefined })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-container-lowest shadow-[0px_12px_32px_rgba(12,14,16,0.04)] border border-outline-variant/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[0.875rem] font-semibold text-inverse-surface">
            {initial ? 'Edit Project' : 'New Project'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-name" className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant">
              Name
            </Label>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              className="bg-surface-container-low border-outline-variant/20 text-inverse-surface text-[0.875rem]"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-desc" className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant">
              Description
            </Label>
            <Textarea
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              rows={3}
              className="bg-surface-container-low border-outline-variant/20 text-inverse-surface text-[0.875rem] resize-none"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-transparent border border-outline-variant/20 text-primary rounded-md text-[0.875rem]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isPending}
              className="bg-gradient-to-br from-primary to-primary-dim text-on-primary rounded-md text-[0.875rem]"
            >
              {isPending ? 'Saving…' : initial ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Project card ──────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project
  isAdmin: boolean
  onEdit: (project: Project) => void
  onArchive: (id: string) => void
}

function ProjectCard({ project, isAdmin, onEdit, onArchive }: ProjectCardProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0px_12px_32px_rgba(12,14,16,0.04)] flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
            <FolderOpen className="w-4 h-4 text-on-primary-fixed" />
          </div>
          <h3 className="text-[0.875rem] font-semibold text-inverse-surface leading-snug">
            {project.name}
          </h3>
        </div>
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-md text-outline-variant hover:text-inverse-surface hover:bg-surface-container-high transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-surface-container-lowest border border-outline-variant/20 shadow-[0px_12px_32px_rgba(12,14,16,0.04)] text-[0.875rem]"
            >
              <DropdownMenuItem
                onClick={() => onEdit(project)}
                className="text-inverse-surface focus:bg-surface-container-high cursor-pointer gap-2"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onArchive(project.id)}
                className="text-on-error-container focus:bg-error-container/20 cursor-pointer gap-2"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {project.description && (
        <p className="text-[0.875rem] leading-[1.6] text-outline-variant line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="mt-auto pt-1 flex items-center gap-1.5">
        <span
          className={[
            'text-[0.6875rem] uppercase tracking-[0.05em] px-2 py-0.5 rounded-full',
            project.status === 'active'
              ? 'bg-tertiary-container text-on-tertiary-fixed'
              : 'bg-surface-container-high text-inverse-surface/60',
          ].join(' ')}
        >
          {project.status}
        </span>
        <span className="text-[0.6875rem] text-outline-variant ml-auto">
          {new Date(project.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects()
  const currentUser = useUIStore((s) => s.currentUser)
  const isAdmin = currentUser?.role === 'admin'

  const createProject = useCreateProject()
  const archiveProject = useArchiveProject()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Project | null>(null)
  const updateProject = useUpdateProject(editTarget?.id ?? '')

  function handleCreate(data: { name: string; description?: string }) {
    createProject.mutate(data, { onSuccess: () => setCreateOpen(false) })
  }

  function handleUpdate(data: { name?: string; description?: string }) {
    if (!editTarget) return
    updateProject.mutate(data, { onSuccess: () => setEditTarget(null) })
  }

  function handleArchive(id: string) {
    archiveProject.mutate(id)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-8 pb-6 flex items-end justify-between">
        <h1 className="text-[2.75rem] font-semibold text-inverse-surface tracking-[-0.02em] leading-none">
          Projects
        </h1>
        {isAdmin && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-gradient-to-br from-primary to-primary-dim text-on-primary rounded-md text-[0.875rem] gap-1.5 pb-1"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {!projects?.length ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-outline-variant">
            <FolderOpen className="w-10 h-10 opacity-40" />
            <p className="text-[0.875rem]">No projects yet.</p>
            {isAdmin && (
              <button
                onClick={() => setCreateOpen(true)}
                className="text-[0.875rem] text-primary underline-offset-2 hover:underline"
              >
                Create the first one
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isAdmin={isAdmin}
                onEdit={setEditTarget}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}
      </div>

      <ProjectForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isPending={createProject.isPending}
      />

      {editTarget && (
        <ProjectForm
          open={!!editTarget}
          onOpenChange={(open) => { if (!open) setEditTarget(null) }}
          initial={editTarget}
          onSubmit={handleUpdate}
          isPending={updateProject.isPending}
        />
      )}
    </div>
  )
}
