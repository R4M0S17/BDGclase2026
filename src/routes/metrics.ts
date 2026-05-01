import { Router, type Request, type Response, type NextFunction } from 'express'
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { ticketAssignees, tickets, users } from '../db/schema.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// ─── GET /metrics ─────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string }

    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1)
    const toDate   = to   ? new Date(to)   : new Date()

    const [{ total }] = await db
      .select({ total: count() })
      .from(tickets)
      .where(isNull(tickets.archivedAt))

    const closedByMonth = await db
      .select({
        month:  sql<string>`to_char(updated_at, 'Mon')`,
        closed: count(),
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.status, 'done'),
          isNull(tickets.archivedAt),
          sql`updated_at >= ${fromDate}`,
          sql`updated_at <= ${toDate}`,
        ),
      )
      .groupBy(sql`to_char(updated_at, 'Mon')`, sql`date_trunc('month', updated_at)`)
      .orderBy(sql`date_trunc('month', updated_at)`)

    const byStatus = await db
      .select({ status: tickets.status, count: count() })
      .from(tickets)
      .where(isNull(tickets.archivedAt))
      .groupBy(tickets.status)

    const byMember = await db
      .select({
        id:          users.id,
        name:        users.name,
        email:       users.email,
        role:        users.role,
        activeCount: count(),
      })
      .from(ticketAssignees)
      .innerJoin(users,   eq(users.id,   ticketAssignees.userId))
      .innerJoin(tickets, and(eq(tickets.id, ticketAssignees.ticketId), isNull(tickets.archivedAt)))
      .groupBy(users.id, users.name, users.email, users.role)
      .orderBy(desc(count()))

    res.json({
      total: Number(total),
      closedByMonth: closedByMonth.map((r) => ({ month: r.month, closed: Number(r.closed) })),
      byStatus:      byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      byMember:      byMember.map((r) => ({
        user:        { id: String(r.id), name: r.name, email: r.email, role: r.role },
        activeCount: Number(r.activeCount),
      })),
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /metrics/export  (CSV stream, RFC 4180) ──────────────────────────────

router.get('/export', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string }

    if (!from || !to) {
      res.status(400).json({ error: 'from and to query params are required' })
      return
    }

    const fromDate = new Date(from)
    const toDate   = new Date(to)
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      res.status(400).json({ error: 'Invalid date range' })
      return
    }

    const rows = await db
      .select({
        id:        tickets.id,
        title:     tickets.title,
        status:    tickets.status,
        priority:  tickets.priority,
        isBlocked: tickets.isBlocked,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
      })
      .from(tickets)
      .where(
        and(
          isNull(tickets.archivedAt),
          sql`created_at >= ${fromDate}`,
          sql`created_at <= ${toDate}`,
        ),
      )
      .orderBy(tickets.createdAt)

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="tickets.csv"')

    res.write('id,title,status,priority,is_blocked,created_at,updated_at\r\n')
    for (const row of rows) {
      const line = [
        row.id,
        `"${row.title.replace(/"/g, '""')}"`,
        row.status,
        row.priority,
        row.isBlocked,
        row.createdAt.toISOString(),
        row.updatedAt.toISOString(),
      ].join(',')
      res.write(line + '\r\n')
    }
    res.end()
  } catch (err) {
    next(err)
  }
})

export default router
