# Correction Prompt — Security Fixes mini-jira API

Eres un ingeniero de software senior especializado en seguridad Node.js/Express. Aplica **todas** las correcciones siguientes en el orden indicado. No modifiques ningún archivo que no se mencione. No añadas features ni refactoring fuera del scope de seguridad. No añadas comentarios salvo los marcados explícitamente.

---

## FASE 1 — Correcciones CRÍTICAS (aplicar primero, antes de cualquier otra)

### Fix C-2: `DELETE /tags/:id` — reemplazar `&&` por `and()` de Drizzle

**Archivo:** `src/routes/tags.ts`, línea 102

Reemplaza:
```ts
.where(eq(tags.id, id) && isNull(tags.deletedAt))
```
Por:
```ts
.where(and(eq(tags.id, id), isNull(tags.deletedAt)))
```

Asegúrate de que `and` ya esté importado desde `'drizzle-orm'` en la línea 3 (ya lo está: `import { count, eq, isNull } from 'drizzle-orm'` — añade `and` a ese import).

---

### Fix C-1: Auth bypass `X-Dev-Role` — añadir guardrail de entorno

**Archivo:** `src/middleware/auth.ts`, líneas 5-10

El bypass de desarrollo es aceptable en local, pero debe fallar explícitamente si el header aparece en producción para detectar mala configuración. Reemplaza el bloque actual:

```ts
if (process.env.NODE_ENV === 'development') {
  const devRole = req.headers['x-dev-role']
  if (devRole === 'admin' || devRole === 'user') {
    req.user = { userId: 1, role: devRole }
    return next()
  }
}
```

Por:

```ts
if (process.env.NODE_ENV !== 'development' && req.headers['x-dev-role']) {
  res.status(400).json({ error: 'X-Dev-Role header not allowed in this environment' })
  return
}
if (process.env.NODE_ENV === 'development') {
  const devRole = req.headers['x-dev-role']
  if (devRole === 'admin' || devRole === 'user') {
    req.user = { userId: 1, role: devRole }
    return next()
  }
}
```

---

## FASE 2 — Correcciones ALTAS

### Fix A-1: Añadir `helmet` para headers de seguridad HTTP

**Archivo:** `package.json`  
Añade la dependencia:
```bash
npm install helmet
```

**Archivo:** `src/app.ts`  
Añade al principio de los imports:
```ts
import helmet from 'helmet'
```
Añade como **primer** middleware, antes de `cors`:
```ts
app.use(helmet())
```

---

### Fix A-2: CORS — limitar origins permitidos en todos los entornos

**Archivo:** `src/app.ts`, líneas 17-24

Reemplaza el bloque `cors({...})` completo por:
```ts
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? ['http://localhost:5173']
      if (!origin || allowed.includes(origin)) return cb(null, true)
      cb(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)
```

En `.env.example` y `.env` de desarrollo, añade:
```
CORS_ORIGIN=http://localhost:5173
```

---

### Fix A-3: `GET /users` solo para admins

**Archivo:** `src/routes/users.ts`, línea 29

Añade `requireAdmin` al endpoint de listado:
```ts
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
```

Asegúrate de que `requireAdmin` esté en el import de la línea 6.

---

### Fix A-4: `GET /metrics` y `GET /metrics/export` solo para admins

**Archivo:** `src/routes/metrics.ts`

Añade `requireAdmin` a ambos handlers:
```ts
// línea 11
router.get('/', authenticate, requireAdmin, async (req, res, next) => {

// línea 76
router.get('/export', authenticate, requireAdmin, async (req, res, next) => {
```

Añade `requireAdmin` al import desde `'../middleware/auth.js'`.

---

### Fix A-5: `GET /audit` — validar acceso por rol/asignación

**Archivo:** `src/routes/audit.ts`

Añade `requireAdmin` para que solo admins accedan al audit log. Si se requiere que los assignees también puedan verlo, añade el check de assignee usando `ticketAssignees` (igual que `assertCanComment` en `comments.ts`). La solución mínima segura es:

```ts
import { authenticate, requireAdmin } from '../middleware/auth.js'

router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const ticketId = Number(req.params.ticketId)
    if (!Number.isInteger(ticketId) || ticketId < 1) {
      res.status(400).json({ error: 'Invalid ticketId' })
      return
    }
    // ... resto igual
```

---

### Fix A-6: Añadir rate limiting global + específico para endpoints costosos

**Archivo:** `src/app.ts`

Añade al principio de los imports:
```ts
import rateLimit from 'express-rate-limit'
```

Añade antes de montar los routers:
```ts
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})
app.use(globalLimiter)

const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Export rate limit exceeded' },
})
app.use('/api/metrics/export', exportLimiter)
```

---

### Fix A-7: Error handler — ocultar detalles de infraestructura en producción

**Archivo:** `src/middleware/errorHandler.ts`

Reemplaza el body del handler:
```ts
export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status ?? 500
  const isOperational = err.status !== undefined
  const message = isOperational
    ? (err.message ?? 'Error')
    : 'Internal Server Error'
  res.status(status).json({ error: message })
}
```

Los errores de infraestructura (sin `err.status`) devuelven solo "Internal Server Error". Los errores de dominio lanzados con `throw Object.assign(new Error('...'), { status: 4xx })` siguen siendo visibles porque son operacionales.

---

## FASE 3 — Correcciones MEDIAS

### Fix M-1 y M-2: Añadir `.max()` a campos de texto libre

**Archivo:** `src/routes/comments.ts`, línea 11
```ts
body: z.string().min(1).max(10_000),
```

**Archivo:** `src/routes/tickets.ts`, línea 29
```ts
description: z.string().max(10_000).optional(),
```

**Archivo:** `src/routes/projects.ts`, línea 19
```ts
description: z.string().max(2_000).optional(),
```

---

### Fix M-3: Validar `ticketId` de path en `comments.ts` y `audit.ts`

**Archivo:** `src/routes/comments.ts`

En los handlers `GET /`, `POST /`, `PATCH /:commentId`, `DELETE /:commentId`, reemplaza:
```ts
const ticketId = Number(req.params.ticketId)
```
Por:
```ts
const ticketId = Number(req.params.ticketId)
if (!Number.isInteger(ticketId) || ticketId < 1) {
  res.status(400).json({ error: 'Invalid ticketId' })
  return
}
```

**Archivo:** `src/routes/audit.ts`, línea 14 (ya cubierto en Fix A-5 arriba).

---

### Fix M-4: Validar rango de fechas en `GET /metrics`

**Archivo:** `src/routes/metrics.ts`, dentro del handler `GET /`, añade validación después de extraer `from` y `to`:

```ts
const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1)
const toDate   = to   ? new Date(to)   : new Date()

if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
  res.status(400).json({ error: 'Invalid date range' })
  return
}
if (fromDate > toDate) {
  res.status(400).json({ error: 'from must be before to' })
  return
}
```

---

### Fix M-5: Añadir límite de iteraciones a `uniqueSlug`

**Archivo:** `src/routes/projects.ts`, línea 43

Añade un tope de 20 intentos:
```ts
async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base
  for (let attempt = 0; attempt <= 20; attempt++) {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, attempt === 0 ? slug : `${base}-${attempt}`))
      .limit(1)

    if (!existing || existing.id === excludeId) return attempt === 0 ? slug : `${base}-${attempt}`
  }
  throw Object.assign(new Error('Could not generate unique slug'), { status: 409 })
}
```

---

### Fix M-6: CSV export — añadir límite de filas y streaming real

**Archivo:** `src/routes/metrics.ts`, handler `GET /export`

Añade un límite máximo de 50,000 filas y documenta el comportamiento:
```ts
const MAX_EXPORT_ROWS = 50_000

const rows = await db
  .select({ ... })
  .from(tickets)
  .where(and(isNull(tickets.archivedAt), sql`created_at >= ${fromDate}`, sql`created_at <= ${toDate}`))
  .orderBy(tickets.createdAt)
  .limit(MAX_EXPORT_ROWS)
```

Para streaming real en el futuro, migrar a un cursor de `node-postgres` con `query.stream()`, pero el `.limit()` es la corrección mínima requerida.

---

### Fix M-7: Validar entropía de `JWT_SECRET` en startup

**Archivo:** `src/index.ts`

Añade antes de `app.listen`:
```ts
const secret = process.env.JWT_SECRET ?? ''
if (secret.length < 32) {
  console.error('ERROR: JWT_SECRET must be at least 32 characters')
  process.exit(1)
}
```

---

## FASE 4 — Correcciones BAJAS

### Fix B-1: Eliminar dependencia no utilizada `bcryptjs`

```bash
npm uninstall bcryptjs
npm uninstall --save-dev @types/bcryptjs
```

Verifica que ningún archivo importe `bcryptjs` antes de ejecutar.

---

### Fix B-2: Unificar default `limit` en `/tags` y `/users` a 20

**Archivo:** `src/routes/tags.ts`, línea 18
```ts
const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
```

**Archivo:** `src/routes/users.ts`, línea 32
```ts
const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
```

---

### Fix B-3: Añadir logging estructurado básico

**Archivo:** `src/middleware/errorHandler.ts`

En el branch de errores no operacionales (status 500), añade log estructurado:
```ts
if (!isOperational) {
  console.error(JSON.stringify({
    level: 'error',
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  }))
}
```

---

## Verificación post-fix

Después de aplicar todas las fases, ejecuta:

```bash
npm run build          # debe compilar sin errores TypeScript
npm run test           # suite existente debe pasar
```

Comprueba manualmente:
1. `DELETE /tags/1` con un admin solo archiva el tag con `id=1`
2. `GET /users` con rol `user` devuelve 403
3. `GET /metrics` con rol `user` devuelve 403
4. Request con `X-Dev-Role: admin` en producción devuelve 400
5. Error de BD devuelve `{ "error": "Internal Server Error" }`, no el mensaje de PostgreSQL
