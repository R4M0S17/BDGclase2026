import { useState } from 'react'
import { X, Archive, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUIStore } from '@/stores/uiStore'
import { useTicketDetail, useArchiveTicket } from '@/hooks/useTicketDetail'
import { useComments, useAddComment } from '@/hooks/useComments'
import { useUpdateTicket } from '@/hooks/useTickets'
import { useUsers } from '@/hooks/useUsers'
import { commentSchema, type CommentFormValues } from '@/lib/validators/commentSchema'
import { editTicketSchema, type EditTicketFormValues } from '@/lib/validators/ticketSchema'
import { getAvatarColor } from '@/lib/utils'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import StatusBadge from '@/components/board/StatusBadge'
import type { Priority, TicketStatus } from '@/types'

type BadgeVariant = 'done' | 'blocked' | 'in-progress' | 'high-priority' | 'medium' | 'low-priority'

const PRIORITY_BADGE: Record<Priority, { variant: BadgeVariant; label: string }> = {
  High: { variant: 'high-priority', label: 'High Priority' },
  Medium: { variant: 'medium', label: 'Medium' },
  Low: { variant: 'low-priority', label: 'Low Priority' },
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

export default function TicketDetailPanel() {
  const activeTicketId = useUIStore((s) => s.activeTicketId)
  const setActiveTicketId = useUIStore((s) => s.setActiveTicketId)
  const currentUser = useUIStore((s) => s.currentUser)
  const [editMode, setEditMode] = useState(false)
  const [labelsInput, setLabelsInput] = useState('')

  const { data: ticket, isLoading } = useTicketDetail(activeTicketId)
  const { data: comments } = useComments(activeTicketId ?? '')
  const { data: users } = useUsers()
  const archiveMutation = useArchiveTicket()
  const updateTicket = useUpdateTicket(activeTicketId ?? '')
  const addComment = useAddComment(activeTicketId ?? '')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
  })

  const editForm = useForm<EditTicketFormValues>({
    resolver: zodResolver(editTicketSchema),
  })

  if (!activeTicketId) return null

  const canArchive =
    currentUser?.role === 'admin' || currentUser?.id === ticket?.createdBy.id

  const canEdit =
    currentUser?.role === 'admin' || currentUser?.id === ticket?.createdBy.id

  function onSubmitComment(values: CommentFormValues) {
    addComment.mutate(values.text, { onSuccess: () => reset() })
  }

  function handleArchive() {
    if (!ticket) return
    archiveMutation.mutate(ticket.id, {
      onSuccess: () => setActiveTicketId(null),
    })
  }

  function handleOpenEdit() {
    if (!ticket) return
    setLabelsInput(ticket.labels.join(', '))
    editForm.reset({
      title: ticket.title,
      description: ticket.description ?? '',
      priority: ticket.priority,
      isBlocked: ticket.isBlocked,
      assigneeIds: ticket.assignees.map((u) => u.id),
      labels: ticket.labels,
    })
    setEditMode(true)
  }

  function handleCancelEdit() {
    editForm.reset()
    setEditMode(false)
  }

  function onSubmitEdit(values: EditTicketFormValues) {
    updateTicket.mutate(values, {
      onSuccess: () => setEditMode(false),
    })
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-inverse-surface/10 backdrop-blur-[2px]"
        onClick={() => { setEditMode(false); setActiveTicketId(null) }}
      />

      {/* Panel */}
      <aside className="w-[480px] h-full bg-surface-container-lowest flex flex-col shadow-[0px_12px_32px_rgba(12,14,16,0.12)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 shrink-0">
          {ticket && (
            <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant">
              {ticket.id.toUpperCase()}
            </span>
          )}
          <div className="flex items-center gap-1 ml-auto">
            {ticket && canEdit && !editMode && (
              <button
                onClick={handleOpenEdit}
                className="w-7 h-7 rounded-md flex items-center justify-center text-outline-variant hover:bg-surface-container-high hover:text-inverse-surface transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => { setEditMode(false); setActiveTicketId(null) }}
              className="w-7 h-7 rounded-md flex items-center justify-center text-outline-variant hover:bg-surface-container-high hover:text-inverse-surface transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading && <LoadingSpinner />}

        {ticket && !editMode && (
          <div className="flex-1 overflow-y-auto">
            {/* Title + badges */}
            <div className="px-6 pt-5 pb-4">
              <h2 className="text-[1.125rem] font-semibold text-inverse-surface leading-snug mb-3">
                {ticket.title}
              </h2>
              <div className="flex flex-wrap gap-2">
                {ticket.isBlocked && <StatusBadge variant="blocked" label="Blocked" />}
                <StatusBadge
                  variant={PRIORITY_BADGE[ticket.priority].variant}
                  label={PRIORITY_BADGE[ticket.priority].label}
                />
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high text-[0.6875rem] uppercase tracking-[0.05em] font-medium text-inverse-surface/70">
                  {STATUS_LABEL[ticket.status]}
                </span>
              </div>
            </div>

            {/* Meta */}
            <div className="px-6 py-4 flex flex-col gap-3 border-t border-b border-outline-variant/10">
              {ticket.assignees.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant w-20 shrink-0 pt-0.5">
                    Asignados
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {ticket.assignees.map((u) => (
                      <div key={u.id} className="flex items-center gap-1.5">
                        <div
                          className={[
                            'w-5 h-5 rounded-full flex items-center justify-center text-[0.5rem] font-semibold shrink-0',
                            getAvatarColor(u.id),
                          ].join(' ')}
                        >
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[0.75rem] text-inverse-surface">{u.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ticket.labels.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant w-20 shrink-0 pt-0.5">
                    Etiquetas
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.labels.map((label) => (
                      <span
                        key={label}
                        className="px-2 py-0.5 rounded bg-surface-container-high text-[0.6875rem] text-inverse-surface/70"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant w-20 shrink-0">
                  Creado
                </span>
                <span className="text-[0.75rem] text-inverse-surface/70">
                  {new Date(ticket.createdAt).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Description */}
            {ticket.description && (
              <div className="px-6 py-4 border-b border-outline-variant/10">
                <p className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant mb-2">
                  Descripción
                </p>
                <p className="text-[0.875rem] leading-[1.6] text-inverse-surface/80">
                  {ticket.description}
                </p>
              </div>
            )}

            {/* Archive */}
            {canArchive && (
              <div className="px-6 py-4 border-b border-outline-variant/10">
                <button
                  onClick={handleArchive}
                  disabled={archiveMutation.isPending}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[0.875rem] text-on-error-container bg-error-container/30 hover:bg-error-container/50 transition-colors disabled:opacity-50"
                >
                  <Archive className="w-3.5 h-3.5" />
                  {archiveMutation.isPending ? 'Archivando...' : 'Archivar ticket'}
                </button>
              </div>
            )}

            {/* Comments */}
            <div className="px-6 py-5">
              <p className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant mb-4">
                Comentarios{comments ? ` (${comments.length})` : ''}
              </p>

              <div className="flex flex-col gap-4 mb-5">
                {comments?.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div
                      className={[
                        'w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] font-semibold shrink-0 mt-0.5',
                        getAvatarColor(comment.author.id),
                      ].join(' ')}
                    >
                      {comment.author.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[0.75rem] font-semibold text-inverse-surface">
                          {comment.author.name}
                        </span>
                        <span className="text-[0.6875rem] text-outline-variant">
                          {new Date(comment.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <p className="text-[0.875rem] leading-[1.6] text-inverse-surface/80">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                ))}
                {comments?.length === 0 && (
                  <p className="text-[0.875rem] text-outline-variant">Sin comentarios aún.</p>
                )}
              </div>

              {/* Comment form */}
              <form onSubmit={handleSubmit(onSubmitComment)} className="flex flex-col gap-2">
                <textarea
                  {...register('text')}
                  placeholder="Escribe un comentario..."
                  rows={3}
                  className="w-full px-3 py-2 text-[0.875rem] bg-surface-container-low rounded-md text-inverse-surface placeholder:text-outline-variant outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
                {errors.text && (
                  <p className="text-[0.75rem] text-on-error-container">{errors.text.message}</p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addComment.isPending}
                    className="px-4 py-2 rounded-md bg-gradient-to-br from-primary to-primary-dim text-on-primary text-[0.875rem] font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {addComment.isPending ? 'Enviando...' : 'Comentar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit mode */}
        {ticket && editMode && (
          <form
            onSubmit={editForm.handleSubmit(onSubmitEdit)}
            className="flex-1 overflow-y-auto flex flex-col"
          >
            <div className="flex-1 px-6 py-5 flex flex-col gap-4">
              {/* Title */}
              <div>
                <label className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant block mb-1.5">
                  Título *
                </label>
                <input
                  {...editForm.register('title')}
                  className="w-full px-3 py-2 text-[0.875rem] bg-surface-container-low rounded-md text-inverse-surface placeholder:text-outline-variant outline-none focus:ring-1 focus:ring-primary/30"
                />
                {editForm.formState.errors.title && (
                  <p className="text-[0.75rem] text-on-error-container mt-1">
                    {editForm.formState.errors.title.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant block mb-1.5">
                  Descripción
                </label>
                <textarea
                  {...editForm.register('description')}
                  rows={3}
                  className="w-full px-3 py-2 text-[0.875rem] bg-surface-container-low rounded-md text-inverse-surface placeholder:text-outline-variant outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Priority + isBlocked */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant block mb-1.5">
                    Prioridad
                  </label>
                  <select
                    {...editForm.register('priority')}
                    className="w-full px-3 py-2 text-[0.875rem] bg-surface-container-low rounded-md text-inverse-surface outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="pb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      {...editForm.register('isBlocked')}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-[0.875rem] text-inverse-surface">Bloqueado</span>
                  </label>
                </div>
              </div>

              {/* Labels */}
              <div>
                <label className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant block mb-1.5">
                  Etiquetas
                </label>
                <input
                  type="text"
                  value={labelsInput}
                  onChange={(e) => {
                    setLabelsInput(e.target.value)
                    editForm.setValue(
                      'labels',
                      e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    )
                  }}
                  placeholder="backend, urgent"
                  className="w-full px-3 py-2 text-[0.875rem] bg-surface-container-low rounded-md text-inverse-surface placeholder:text-outline-variant outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              {/* Assignees */}
              {Array.isArray(users) && users.length > 0 && (
                <div>
                  <label className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant block mb-2">
                    Asignados
                  </label>
                  <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                    {users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          value={u.id}
                          {...editForm.register('assigneeIds')}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <span className="text-[0.875rem] text-inverse-surface">{u.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 pb-5 pt-3 border-t border-outline-variant/10 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-md border border-outline-variant/20 text-primary text-[0.875rem] bg-transparent hover:bg-primary-container/30 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateTicket.isPending}
                className="px-4 py-2 rounded-md bg-gradient-to-br from-primary to-primary-dim text-on-primary text-[0.875rem] font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {updateTicket.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  )
}
