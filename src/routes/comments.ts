import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { comments, ticketAssignees, users } from '../db/schema.js'
import { authenticate } from '../middleware/auth.js'

// Mounted at /tickets/:ticketId/comments — mergeParams gives access to ticketId
const router = Router({ mergeParams: true })

const commentBodySchema = z.object({
  body: z.string().min(1),
})

async function assertCanComment(userId: number, ticketId: number, role: 'admin' | 'user') {
  if (role === 'admin') return
  const [row] = await db
    .select()
    .from(ticketAssignees)
    .where(and(eq(ticketAssignees.ticketId, ticketId), eq(ticketAssignees.userId, userId)))
    .limit(1)
  if (!row) throw Object.assign(new Error('Forbidden'), { status: 403 })
}

// ─── GET /tickets/:ticketId/comments ─────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketId = Number(req.params.ticketId)
    const rows = await db
      .select({
        id:           comments.id,
        ticketId:     comments.ticketId,
        text:         comments.body,
        createdAt:    comments.createdAt,
        authorId:     users.id,
        authorName:   users.name,
        authorEmail:  users.email,
        authorRole:   users.role,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(and(eq(comments.ticketId, ticketId), isNull(comments.deletedAt)))

    res.json(rows.map((r) => ({
      id:       String(r.id),
      ticketId: String(r.ticketId),
      text:     r.text,
      author:   { id: String(r.authorId), name: r.authorName, email: r.authorEmail, role: r.authorRole },
      createdAt: r.createdAt,
    })))
  } catch (err) {
    next(err)
  }
})

// ─── POST /tickets/:ticketId/comments ────────────────────────────────────────

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketId = Number(req.params.ticketId)
    const parsed = commentBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      return
    }

    const { userId, role } = req.user!
    await assertCanComment(userId, ticketId, role)

    const [comment] = await db
      .insert(comments)
      .values({ ticketId, userId, body: parsed.data.body })
      .returning()

    const [author] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    res.status(201).json({
      id:       String(comment.id),
      ticketId: String(comment.ticketId),
      text:     comment.body,
      author:   { id: String(author.id), name: author.name, email: author.email, role: author.role },
      createdAt: comment.createdAt,
    })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /tickets/:ticketId/comments/:commentId ────────────────────────────

router.patch('/:commentId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = Number(req.params.commentId)
    const parsed = commentBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      return
    }

    const { userId } = req.user!
    const [existing] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, commentId), isNull(comments.deletedAt)))
      .limit(1)

    if (!existing) throw Object.assign(new Error('Comment not found'), { status: 404 })
    if (existing.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })

    const [updated] = await db
      .update(comments)
      .set({ body: parsed.data.body })
      .where(eq(comments.id, commentId))
      .returning()

    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /tickets/:ticketId/comments/:commentId  (soft delete) ────────────

router.delete('/:commentId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = Number(req.params.commentId)
    const { userId, role } = req.user!

    const [existing] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, commentId), isNull(comments.deletedAt)))
      .limit(1)

    if (!existing) throw Object.assign(new Error('Comment not found'), { status: 404 })
    if (role !== 'admin' && existing.userId !== userId) {
      throw Object.assign(new Error('Forbidden'), { status: 403 })
    }

    await db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, commentId))

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
