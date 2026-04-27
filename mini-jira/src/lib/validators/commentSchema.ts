import { z } from 'zod'

export const commentSchema = z.object({
  text: z
    .string()
    .min(1, 'El comentario no puede estar vacío')
    .max(2000, 'Máximo 2000 caracteres'),
})

export type CommentFormValues = z.infer<typeof commentSchema>
