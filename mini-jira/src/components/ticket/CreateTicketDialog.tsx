import { useState } from 'react'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUIStore } from '@/stores/uiStore'
import { useCreateTicket } from '@/hooks/useTickets'
import { useUsers } from '@/hooks/useUsers'
import { newTicketSchema, type NewTicketFormValues } from '@/lib/validators/ticketSchema'

export default function CreateTicketDialog() {
  const createTicketOpen = useUIStore((s) => s.createTicketOpen)
  const setCreateTicketOpen = useUIStore((s) => s.setCreateTicketOpen)
  const { data: users } = useUsers()
  const createTicket = useCreateTicket()

  const [labelsInput, setLabelsInput] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<NewTicketFormValues>({
    resolver: zodResolver(newTicketSchema),
    defaultValues: { priority: 'Medium', assigneeIds: [], labels: [] },
  })

  if (!createTicketOpen) return null

  function handleClose() {
    reset()
    setLabelsInput('')
    setCreateTicketOpen(false)
  }

  function onSubmit(values: NewTicketFormValues) {
    createTicket.mutate(values, {
      onSuccess: () => {
        reset()
        setLabelsInput('')
        setCreateTicketOpen(false)
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-inverse-surface/10 backdrop-blur-[2px]"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-[0px_12px_32px_rgba(12,14,16,0.12)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant">
            New Issue
          </span>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-outline-variant hover:bg-surface-container-high hover:text-inverse-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant block mb-1.5">
              Title *
            </label>
            <input
              {...register('title')}
              placeholder="Issue title"
              className="w-full px-3 py-2 text-[0.875rem] bg-surface-container-low rounded-md text-inverse-surface placeholder:text-outline-variant outline-none focus:ring-1 focus:ring-primary/30"
            />
            {errors.title && (
              <p className="text-[0.75rem] text-on-error-container mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant block mb-1.5">
              Description
            </label>
            <textarea
              {...register('description')}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-3 py-2 text-[0.875rem] bg-surface-container-low rounded-md text-inverse-surface placeholder:text-outline-variant outline-none focus:ring-1 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="flex gap-4">
            {/* Priority */}
            <div className="flex-1">
              <label className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant block mb-1.5">
                Priority
              </label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 text-[0.875rem] bg-surface-container-low rounded-md text-inverse-surface outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Labels */}
            <div className="flex-1">
              <label className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant block mb-1.5">
                Labels
              </label>
              <input
                type="text"
                value={labelsInput}
                onChange={(e) => {
                  setLabelsInput(e.target.value)
                  setValue(
                    'labels',
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }}
                placeholder="backend, urgent"
                className="w-full px-3 py-2 text-[0.875rem] bg-surface-container-low rounded-md text-inverse-surface placeholder:text-outline-variant outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Assignees */}
          {Array.isArray(users) && users.length > 0 && (
            <div>
              <label className="text-[0.6875rem] uppercase tracking-[0.05em] text-outline-variant block mb-2">
                Assignees
              </label>
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      value={u.id}
                      {...register('assigneeIds')}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-[0.875rem] text-inverse-surface">{u.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant/10">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-md border border-outline-variant/20 text-primary text-[0.875rem] bg-transparent hover:bg-primary-container/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTicket.isPending}
              className="px-4 py-2 rounded-md bg-gradient-to-br from-primary to-primary-dim text-on-primary text-[0.875rem] font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {createTicket.isPending ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
