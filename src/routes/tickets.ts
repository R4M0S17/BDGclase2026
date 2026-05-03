import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { and, count, eq, inArray, isNotNull, isNull, type SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import { auditLogs, ticketAssignees, ticketTags, tickets, tags } from '../db/schema.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ticketStatusEnum = z.enum(['todo', 'in_progress', 'review', 'done'])
const ticketPriorityEnum = z.enum(['high', 'medium', 'low'])

// Express/qs parses status[]=todo as req.query.status = ['todo'] (strips brackets)
const listQuerySchema = z.object({
  status: z.union([ticketStatusEnum, z.array(ticketStatusEnum)]).optional().transform((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v])),
  priority: z.union([ticketPriorityEnum, z.array(ticketPriorityEnum)]).optional().transform((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v])),
  tagId: z.coerce.number().int().positive().optional(),
  assigneeId: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  archived: z.enum(['true', 'false']).optional(),
})

const createBodySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
  isBlocked: z.boolean().optional(),
  projectId: z.number().int().positive().optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
})

const updateBodySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  isBlocked: z.boolean().optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
  version: z.number().int().positive(),
}).refine(
  (d) => d.title !== undefined || d.description !== undefined || d.priority !== undefined || d.isBlocked !== undefined || d.tagIds !== undefined,
  { message: 'At least one field must be provided' },
)

const statusBodySchema = z.object({
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
  version: z.number().int().positive(),
})

const assigneeBodySchema = z.object({
  userId: z.number().int().positive(),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getTicketOrThrow(id: number) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 })
  return ticket
}

async function assertCanEdit(userId: number, ticketId: number, role: 'admin' | 'user') {
  if (role === 'admin') return
  const [row] = await db
    .select()
    .from(ticketAssignees)
    .where(and(eq(ticketAssignees.ticketId, ticketId), eq(ticketAssignees.userId, userId)))
    .limit(1)
  if (!row) throw Object.assign(new Error('Forbidden'), { status: 403 })
}

function parseId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 1) throw Object.assign(new Error('Invalid id'), { status: 400 })
  return id
}

// ─── GET /tickets ─────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid query params' })
      return
    }

    const { status: statusFilter, priority: priorityFilter, tagId, assigneeId, projectId, page, limit, archived } = parsed.data

    const conditions: (SQL | undefined)[] = [
      archived === 'true' ? isNotNull(tickets.archivedAt) : isNull(tickets.archivedAt),
    ]

    if (statusFilter?.length)   conditions.push(inArray(tickets.status, statusFilter))
    if (priorityFilter?.length) conditions.push(inArray(tickets.priority, priorityFilter))
    if (projectId)  conditions.push(eq(tickets.projectId, projectId))
    if (tagId)      conditions.push(inArray(tickets.id, db.select({ id: ticketTags.ticketId }).from(ticketTags).where(eq(ticketTags.tagId, tagId))))
    if (assigneeId) conditions.push(inArray(tickets.id, db.select({ id: ticketAssignees.ticketId }).from(ticketAssignees).where(eq(ticketAssignees.userId, assigneeId))))

    const where = and(...conditions)
    const offset = (page - 1) * limit

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(tickets).where(where).limit(limit).offset(offset),
      db.select({ total: count() }).from(tickets).where(where),
    ])

    res.json({
      data: rows,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /tickets ────────────────────────────────────────────────────────────

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      return
    }

    const { title, description, priority, status, isBlocked, projectId, tagIds } = parsed.data
    const createdBy = req.user!.userId

    const [ticket] = await db
      .insert(tickets)
      .values({ title, description, priority, status, isBlocked: isBlocked ?? false, projectId, createdBy })
      .returning()

    if (tagIds?.length) {
      await db.insert(ticketTags).values(tagIds.map((tagId) => ({ ticketId: ticket.id, tagId })))
    }

    res.status(201).json(ticket)
  } catch (err) {
    next(err)
  }
})

// ─── GET /tickets/:id ─────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id)
    const ticket = await getTicketOrThrow(id)

    const [assigneeRows, tagRows] = await Promise.all([
      db.select().from(ticketAssignees).where(eq(ticketAssignees.ticketId, id)),
      db.select().from(ticketTags).where(eq(ticketTags.ticketId, id)),
    ])

    res.json({
      ...ticket,
      assigneeIds: assigneeRows.map((r) => r.userId),
      tagIds: tagRows.map((r) => r.tagId),
    })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /tickets/:id/status  (optimistic locking via version) ──────────────

router.patch('/:id/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id)
    const parsed = statusBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      return
    }

    const { status, version } = parsed.data
    const { userId, role } = req.user!

    const ticket = await getTicketOrThrow(id)
    if (ticket.archivedAt) throw Object.assign(new Error('Ticket is archived'), { status: 422 })
    await assertCanEdit(userId, id, role)

    const [updated] = await db
      .update(tickets)
      .set({ status, version: version + 1, updatedAt: new Date() })
      .where(and(eq(tickets.id, id), eq(tickets.version, version)))
      .returning()

    if (!updated) {
      res.status(409).json({ error: 'Conflict: ticket was modified by another user' })
      return
    }

    await db.insert(auditLogs).values({
      ticketId: id,
      field: 'status',
      oldValue: ticket.status,
      newValue: status,
      actorId: userId,
    })

    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /tickets/:id ───────────────────────────────────────────────────────

router.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id)
    const parsed = updateBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      return
    }

    const { userId, role } = req.user!
    const ticket = await getTicketOrThrow(id)
    if (ticket.archivedAt) throw Object.assign(new Error('Ticket is archived'), { status: 422 })
    await assertCanEdit(userId, id, role)

    const { version, tagIds, ...fields } = parsed.data

    const set: Partial<typeof tickets.$inferInsert> & { updatedAt: Date; version: number } = {
      updatedAt: new Date(),
      version: version + 1,
    }
    if (fields.title !== undefined)       set.title = fields.title
    if (fields.description !== undefined) set.description = fields.description
    if (fields.priority !== undefined)    set.priority = fields.priority
    if (fields.isBlocked !== undefined)   set.isBlocked = fields.isBlocked

    const [updated] = await db
      .update(tickets)
      .set(set)
      .where(and(eq(tickets.id, id), eq(tickets.version, version)))
      .returning()

    if (!updated) {
      res.status(409).json({ error: 'Conflict: ticket was modified by another user' })
      return
    }

    if (fields.priority && fields.priority !== ticket.priority) {
      await db.insert(auditLogs).values({
        ticketId: id,
        field: 'priority',
        oldValue: ticket.priority,
        newValue: fields.priority,
        actorId: userId,
      })
    }

    if (tagIds !== undefined) {
      await db.delete(ticketTags).where(eq(ticketTags.ticketId, id))
      if (tagIds.length > 0) {
        const validTags = await db.select({ id: tags.id }).from(tags).where(and(inArray(tags.id, tagIds), isNull(tags.deletedAt)))
        if (validTags.length > 0) {
          await db.insert(ticketTags).values(validTags.map((t) => ({ ticketId: id, tagId: t.id })))
        }
      }
    }

    const [tagRows] = await Promise.all([
      db.select().from(ticketTags).where(eq(ticketTags.ticketId, id)),
    ])

    res.json({ ...updated, tagIds: tagRows.map((r) => r.tagId) })
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /tickets/:id  (soft delete — admin only) ─────────────────────────

router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id)
    await getTicketOrThrow(id)

    const [archived] = await db
      .update(tickets)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(tickets.id, id), isNull(tickets.archivedAt)))
      .returning()

    if (!archived) {
      res.status(422).json({ error: 'Ticket is already archived' })
      return
    }

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// ─── POST /tickets/:id/assignees  (admin only) ────────────────────────────────

router.post('/:id/assignees', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id)
    const parsed = assigneeBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      return
    }

    await getTicketOrThrow(id)
    await db
      .insert(ticketAssignees)
      .values({ ticketId: id, userId: parsed.data.userId })
      .onConflictDoNothing()

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /tickets/:id/assignees/:userId  (admin only) ──────────────────────

router.delete('/:id/assignees/:userId', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketId = parseId(req.params.id)
    const userId   = parseId(req.params.userId)

    await db
      .delete(ticketAssignees)
      .where(and(eq(ticketAssignees.ticketId, ticketId), eq(ticketAssignees.userId, userId)))

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
