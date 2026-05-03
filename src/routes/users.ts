import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { count, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

// ─── GET /users/me ────────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1)

    if (!user) throw Object.assign(new Error('User not found'), { status: 404 })
    res.json(user)
  } catch (err) {
    next(err)
  }
})

// ─── GET /users ───────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 100))
    const offset = (page - 1) * limit

    const cols = { id: users.id, name: users.name, email: users.email, role: users.role }

    const [rows, [{ total }]] = await Promise.all([
      db.select(cols).from(users).limit(limit).offset(offset),
      db.select({ total: count() }).from(users),
    ])

    res.json({
      data: rows,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /users/:id ───────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: 'Invalid id' })
      return
    }

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (!user) throw Object.assign(new Error('User not found'), { status: 404 })

    res.json(user)
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /users/:id/role  (admin only) ─────────────────────────────────────

const roleBodySchema = z.object({
  role: z.enum(['admin', 'user']),
})

router.patch('/:id/role', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: 'Invalid id' })
      return
    }

    const parsed = roleBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      return
    }

    const [updated] = await db
      .update(users)
      .set({ role: parsed.data.role })
      .where(eq(users.id, id))
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role })

    if (!updated) throw Object.assign(new Error('User not found'), { status: 404 })

    res.json(updated)
  } catch (err) {
    next(err)
  }
})

export default router
