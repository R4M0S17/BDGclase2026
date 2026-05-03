import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { and, count, eq, isNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { projects, tickets } from '../db/schema.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

// ─── Schemas ──────────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  status: z.enum(['active', 'archived']).optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
})

const createBodySchema = z.object({
  name:        z.string().min(1).max(255),
  description: z.string().optional(),
})

const updateBodySchema = z.object({
  name:        z.string().min(1).max(255).optional(),
  description: z.string().optional(),
}).refine(
  (d) => d.name !== undefined || d.description !== undefined,
  { message: 'At least one field must be provided' },
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base
  let attempt = 0
  while (true) {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1)

    if (!existing || existing.id === excludeId) break
    attempt++
    slug = `${base}-${attempt}`
  }
  return slug
}

async function getProjectOrThrow(id: number) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 })
  return project
}

function parseId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 1) throw Object.assign(new Error('Invalid id'), { status: 400 })
  return id
}

// ─── GET /projects ────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid query params' })
      return
    }

    const { status, page, limit } = parsed.data
    const offset = (page - 1) * limit

    const where = status
      ? eq(projects.status, status)
      : isNull(projects.archivedAt)

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(projects).where(where).limit(limit).offset(offset),
      db.select({ total: count() }).from(projects).where(where),
    ])

    res.json({
      data: rows,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /projects  (admin only) ─────────────────────────────────────────────

router.post('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      return
    }

    const { name, description } = parsed.data
    const slug = await uniqueSlug(toSlug(name))
    const createdBy = req.user!.userId

    const [project] = await db
      .insert(projects)
      .values({ name, description, slug, createdBy })
      .returning()

    res.status(201).json(project)
  } catch (err) {
    next(err)
  }
})

// ─── GET /projects/:id ────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id)
    const project = await getProjectOrThrow(id)
    res.json(project)
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /projects/:id  (admin only) ───────────────────────────────────────

router.patch('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id)
    const parsed = updateBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      return
    }

    await getProjectOrThrow(id)

    const set: Partial<typeof projects.$inferInsert> & { updatedAt: Date } = { updatedAt: new Date() }
    if (parsed.data.name !== undefined) {
      set.name = parsed.data.name
      set.slug = await uniqueSlug(toSlug(parsed.data.name), id)
    }
    if (parsed.data.description !== undefined) set.description = parsed.data.description

    const [updated] = await db.update(projects).set(set).where(eq(projects.id, id)).returning()
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// ─── GET /projects/:id/tickets ────────────────────────────────────────────────

router.get('/:id/tickets', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id)
    await getProjectOrThrow(id)

    const page  = Math.max(1, Number(req.query.page)  || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const offset = (page - 1) * limit

    const where = and(eq(tickets.projectId, id), isNull(tickets.archivedAt))

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

// ─── DELETE /projects/:id  (soft delete — admin only) ────────────────────────

router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id)
    await getProjectOrThrow(id)

    const [archived] = await db
      .update(projects)
      .set({ archivedAt: new Date(), updatedAt: new Date(), status: 'archived' })
      .where(and(eq(projects.id, id), isNull(projects.archivedAt)))
      .returning()

    if (!archived) {
      res.status(422).json({ error: 'Project is already archived' })
      return
    }

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
