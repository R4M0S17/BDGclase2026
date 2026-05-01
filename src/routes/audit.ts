import { Router, type Request, type Response, type NextFunction } from 'express'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { auditLogs } from '../db/schema.js'
import { authenticate } from '../middleware/auth.js'

// Mounted at /tickets/:ticketId/audit — mergeParams gives access to ticketId
const router = Router({ mergeParams: true })

// ─── GET /tickets/:ticketId/audit ────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketId = Number(req.params.ticketId)
    const rows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.ticketId, ticketId))
      .orderBy(desc(auditLogs.createdAt))

    res.json(rows)
  } catch (err) {
    next(err)
  }
})

export default router
