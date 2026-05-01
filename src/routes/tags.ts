import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { tags } from '../db/schema.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

const createBodySchema = z.object({
  name: z.string().min(1).max(50),
})

// ─── GET /tags ────────────────────────────────────────────────────────────────

router.get('/', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db.select().from(tags)
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// ─── POST /tags  (admin only) ─────────────────────────────────────────────────

router.post('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      return
    }

    const [tag] = await db
      .insert(tags)
      .values({ name: parsed.data.name, createdBy: req.user!.userId })
      .returning()

    res.status(201).json(tag)
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /tags/:id  (admin only) ───────────────────────────────────────────

router.patch('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: 'Invalid id' })
      return
    }

    const parsed = createBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      return
    }

    const [updated] = await db
      .update(tags)
      .set({ name: parsed.data.name })
      .where(eq(tags.id, id))
      .returning()

    if (!updated) throw Object.assign(new Error('Tag not found'), { status: 404 })

    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /tags/:id  (admin only) ──────────────────────────────────────────

router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: 'Invalid id' })
      return
    }

    const [deleted] = await db
      .delete(tags)
      .where(eq(tags.id, id))
      .returning()

    if (!deleted) throw Object.assign(new Error('Tag not found'), { status: 404 })

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
