/**
 * P0 endpoint tests — GET /api/tickets · POST /api/tickets · PATCH /api/tickets/:id/status
 *
 * Strategy: supertest hits the real Express app; Drizzle's `db` is replaced
 * by a fluent mock. NODE_ENV=development activates the X-Dev-Role bypass so
 * no JWT is needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// ─── Hoist mock fns so they exist before vi.mock() factory runs ───────────────

const { mockSelect, mockInsert, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
}))

// Replace the entire db module — the real one would open a pg Pool.
vi.mock('../db/index.js', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate },
}))

// Import app AFTER vi.mock so the router picks up the mock.
const { default: app } = await import('../app.js')

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a fluent chain object whose every method returns itself.
 * Being thenable (`then`) means `await chain` resolves to `result`.
 * This covers all Drizzle patterns:
 *   .select().from().where().limit().offset()   → awaited at offset
 *   .select().from().where()                    → awaited at where
 *   .insert().values().returning()              → awaited at returning
 *   .update().set().where().returning()         → awaited at returning
 */
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  for (const m of ['from', 'where', 'limit', 'offset', 'set', 'values', 'returning', 'onConflictDoNothing']) {
    chain[m] = () => chain
  }
  chain.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected)
  chain.catch = (onRejected: (e: unknown) => unknown) => Promise.resolve(result).catch(onRejected)
  chain.finally = (onFinally: () => void) => Promise.resolve(result).finally(onFinally)
  return chain
}

// ─── Shared fixture ───────────────────────────────────────────────────────────

const BASE_TICKET = {
  id: 1,
  title: 'Implement login OAuth',
  description: null,
  status: 'todo',
  priority: 'high',
  isBlocked: false,
  version: 1,
  projectId: null,
  createdBy: 1,
  archivedAt: null,
  createdAt: new Date('2026-04-27T10:00:00.000Z'),
  updatedAt: new Date('2026-04-27T10:00:00.000Z'),
}

// ─── Reset mocks between tests ────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks()
})

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/tickets
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/tickets', () => {

  it('Happy Path — returns paginated active tickets with correct meta', async () => {
    // Given: DB has one active (non-archived) ticket; total count = 1
    mockSelect
      .mockReturnValueOnce(makeChain([BASE_TICKET]))       // data rows query
      .mockReturnValueOnce(makeChain([{ total: 1 }]))      // count query

    // When: authenticated user fetches the default ticket list
    const res = await request(app)
      .get('/api/tickets')
      .set('X-Dev-Role', 'user')

    // Then: 200 with one ticket in data, archivedAt is null, meta is correct
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].id).toBe(1)
    expect(res.body.data[0].archivedAt).toBeNull()
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 })
  })

  it('Validation Error — rejects unknown status value with 400', async () => {
    // Given: validation happens before any DB access — no mock needed

    // When: user passes an invalid status enum value
    const res = await request(app)
      .get('/api/tickets?status=invalid')
      .set('X-Dev-Role', 'user')

    // Then: 400 with an error message; db.select is never reached
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('Edge Case — archived=true surfaces archived tickets (H2: tickets kept for historical metrics)', async () => {
    // Given: there is an archived ticket the board normally hides
    const archivedTicket = { ...BASE_TICKET, archivedAt: new Date('2026-04-28T09:00:00.000Z') }
    mockSelect
      .mockReturnValueOnce(makeChain([archivedTicket]))
      .mockReturnValueOnce(makeChain([{ total: 1 }]))

    // When: caller explicitly opts in to archived view
    const res = await request(app)
      .get('/api/tickets?archived=true')
      .set('X-Dev-Role', 'user')

    // Then: 200 and the returned ticket has a non-null archivedAt
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].archivedAt).not.toBeNull()
  })

})

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/tickets
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/tickets', () => {

  it('Happy Path — creates ticket, returns 201, createdBy comes from JWT/dev token', async () => {
    // Given: DB inserts the ticket and returns it with a generated id
    const created = { ...BASE_TICKET, id: 42, title: 'Design dashboard screen', priority: 'medium', status: 'todo' }
    mockInsert.mockReturnValueOnce(makeChain([created]))

    // When: admin posts a valid body (title + priority; status defaults to 'todo')
    const res = await request(app)
      .post('/api/tickets')
      .set('X-Dev-Role', 'admin')
      .send({ title: 'Design dashboard screen', description: 'Include burndown chart', priority: 'medium' })

    // Then: 201 with the persisted ticket; createdBy is 1 (from dev-bypass userId)
    expect(res.status).toBe(201)
    expect(res.body.id).toBe(42)
    expect(res.body.title).toBe('Design dashboard screen')
    expect(res.body.status).toBe('todo')
    expect(res.body.createdBy).toBe(1)
  })

  it('Validation Error — rejects body missing required priority field with 400', async () => {
    // Given: Zod validation runs before any DB write — no mock needed

    // When: caller omits the mandatory priority field
    const res = await request(app)
      .post('/api/tickets')
      .set('X-Dev-Role', 'admin')
      .send({ title: 'Ticket without priority' })

    // Then: 400 with error; db.insert is never called
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('Edge Case — rejects title exceeding 255 characters (api-contract § POST /tickets)', async () => {
    // Given: a title one character over the documented limit
    const longTitle = 'A'.repeat(256)

    // When: caller sends the oversized title
    const res = await request(app)
      .post('/api/tickets')
      .set('X-Dev-Role', 'admin')
      .send({ title: longTitle, priority: 'low' })

    // Then: 400; DB is never touched
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(mockInsert).not.toHaveBeenCalled()
  })

})

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /api/tickets/:id/status
// ═════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/tickets/:id/status', () => {

  it('Happy Path — updates status, increments version, writes audit log (H2: flujo normal)', async () => {
    // Given: ticket exists at version 1; admin is permitted to edit
    const updatedTicket = { ...BASE_TICKET, status: 'in_progress', version: 2 }
    mockSelect.mockReturnValueOnce(makeChain([BASE_TICKET]))    // getTicketOrThrow
    mockUpdate.mockReturnValueOnce(makeChain([updatedTicket]))  // optimistic UPDATE WHERE version=1
    mockInsert.mockReturnValueOnce(makeChain([]))               // INSERT INTO audit_logs

    // When: admin moves ticket to 'in_progress' providing the current version
    const res = await request(app)
      .patch('/api/tickets/1/status')
      .set('X-Dev-Role', 'admin')
      .send({ status: 'in_progress', version: 1 })

    // Then: 200 with updated ticket; version is now 2
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('in_progress')
    expect(res.body.version).toBe(2)
  })

  it('Validation Error — rejects body missing version field with 400 (OL requires version)', async () => {
    // Given: Zod schema requires `version`; validation runs before any DB call

    // When: caller sends status but omits the version required for optimistic locking
    const res = await request(app)
      .patch('/api/tickets/1/status')
      .set('X-Dev-Role', 'admin')
      .send({ status: 'done' })

    // Then: 400; no DB calls at all
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(mockSelect).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('Edge Case (H3 — Optimistic Locking) — returns 409 when version is stale', async () => {
    // Given: ticket is now at version 2 (a concurrent user already saved)
    //        the second user still holds version 1 from when they opened it
    const ticketAtV2 = { ...BASE_TICKET, version: 2 }
    mockSelect.mockReturnValueOnce(makeChain([ticketAtV2]))  // getTicketOrThrow → ticket found
    mockUpdate.mockReturnValueOnce(makeChain([]))            // WHERE version=1 matches nothing → []

    // When: second user sends their stale version=1
    const res = await request(app)
      .patch('/api/tickets/1/status')
      .set('X-Dev-Role', 'admin')
      .send({ status: 'done', version: 1 })

    // Then: 409 Conflict — user is informed the ticket was modified concurrently
    //       (H3: "el sistema rechaza la operación e informa al segundo usuario")
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/conflict/i)
    // No audit log should be written on a conflict
    expect(mockInsert).not.toHaveBeenCalled()
  })

})
