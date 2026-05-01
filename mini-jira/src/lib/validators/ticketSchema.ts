import { z } from 'zod'

export const ticketSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(120, 'Máximo 120 caracteres'),
  description: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High']),
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
  isBlocked: z.boolean(),
  assigneeIds: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
})

export type TicketFormValues = z.infer<typeof ticketSchema>

export const newTicketSchema = ticketSchema.pick({
  title: true,
  priority: true,
  description: true,
  assigneeIds: true,
  labels: true,
})

export type NewTicketFormValues = z.infer<typeof newTicketSchema>

export const editTicketSchema = ticketSchema.pick({
  title: true,
  description: true,
  priority: true,
  isBlocked: true,
  assigneeIds: true,
  labels: true,
})

export type EditTicketFormValues = z.infer<typeof editTicketSchema>
