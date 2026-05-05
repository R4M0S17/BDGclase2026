# Security Report — mini-jira API
**Auditoría OWASP Top 10 · Generado:** 2026-05-04  
**Scope:** `src/routes/`, `src/middleware/`, `src/app.ts`, `src/index.ts`, `src/db/schema.ts`, `drizzle.config.ts`, `package.json`

---

## CRÍTICO

---

### C-1 · Auth Bypass completo via header `X-Dev-Role`
**OWASP:** A07:2021 – Identification and Authentication Failures  
**Archivo:** [`src/middleware/auth.ts:5-10`](src/middleware/auth.ts#L5-L10)

**Evidencia:**
```ts
if (process.env.NODE_ENV === 'development') {
  const devRole = req.headers['x-dev-role']
  if (devRole === 'admin' || devRole === 'user') {
    req.user = { userId: 1, role: devRole }  // userId hardcodeado a 1
    return next()
  }
}
```

**Impacto real:**  
Cualquier request con `X-Dev-Role: admin` omite por completo la validación JWT e inyecta `{ userId: 1, role: 'admin' }`. El riesgo no se limita a desarrollo: si `NODE_ENV` se configura incorrectamente en un staging/producción expuesto (error habitual en CI/CD), cualquier atacante externo obtiene acceso de administrador sin credenciales. Adicionalmente, el `userId: 1` hardcodeado es siempre el primer usuario de la base de datos — compromiso de identidad, no solo de rol.

---

### C-2 · `DELETE /tags/:id` borra TODOS los tags activos por bug en el WHERE
**OWASP:** A04:2021 – Insecure Design / A03:2021 – Injection  
**Archivo:** [`src/routes/tags.ts:102`](src/routes/tags.ts#L102)

**Evidencia:**
```ts
.where(eq(tags.id, id) && isNull(tags.deletedAt))
//              ^^^ operador JS &&, NO la función and() de Drizzle
```

**Impacto real:**  
El operador `&&` de JavaScript evalúa los dos operandos: `eq(tags.id, id)` es un objeto SQL (truthy), por lo que `&&` devuelve el segundo operando: `isNull(tags.deletedAt)`. La query resultante es:
```sql
UPDATE tags SET deleted_at = NOW() WHERE deleted_at IS NULL
-- Falta: AND id = :id
```
Cualquier admin que llame a `DELETE /tags/:id` elimina con soft-delete **todos** los tags activos de la plataforma, no solo el solicitado. Destrucción masiva de datos con un único request autorizado.

---

## ALTO

---

### A-1 · Sin headers de seguridad HTTP (`helmet` ausente)
**OWASP:** A05:2021 – Security Misconfiguration  
**Archivo:** [`src/app.ts`](src/app.ts) (ausencia total)

**Evidencia:**  
El app Express no monta ningún middleware de seguridad de headers. No hay:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options`
- `Content-Security-Policy`
- `Strict-Transport-Security`
- `Referrer-Policy`

**Impacto real:**  
El frontend consumiendo esta API (mini-jira) es vulnerable a MIME sniffing, clickjacking, y ataques XSS reflejados en respuestas de error. HSTS ausente permite downgrade HTTPS→HTTP.

---

### A-2 · CORS irrestricto en desarrollo sin salvaguarda contra mala configuración de `NODE_ENV`
**OWASP:** A05:2021 – Security Misconfiguration  
**Archivo:** [`src/app.ts:19-20`](src/app.ts#L19-L20)

**Evidencia:**
```ts
origin: isDev
  ? (origin, cb) => cb(null, true)   // cualquier origen, incluidos null/file://
  : (process.env.CORS_ORIGIN ?? 'http://localhost:5173'),
credentials: true,
```

**Impacto real:**  
`credentials: true` con `origin: *` efectivo es la combinación más peligrosa en CORS: permite que cualquier sitio web lea respuestas autenticadas (cookies, tokens). Un staging con `NODE_ENV=development` expuesto convierte esto en CSRF completo desde cualquier origen.

---

### A-3 · `GET /users` accesible por cualquier usuario autenticado — exposición de PII
**OWASP:** A01:2021 – Broken Access Control  
**Archivo:** [`src/routes/users.ts:29-49`](src/routes/users.ts#L29-L49)

**Evidencia:**
```ts
router.get('/', authenticate, async (req, res, next) => {  // sin requireAdmin
  // devuelve: id, name, email, role de todos los usuarios
```

**Impacto real:**  
Un `user` regular puede paginar y descargar el directorio completo de la organización con nombre, email corporativo y rol de cada empleado. Violación de GDPR/privacidad. Los emails permiten phishing dirigido; los roles permiten identificar targets de privilegio.

---

### A-4 · `GET /metrics` y `GET /metrics/export` sin control de acceso por rol
**OWASP:** A01:2021 – Broken Access Control  
**Archivo:** [`src/routes/metrics.ts:11`](src/routes/metrics.ts#L11), [`src/routes/metrics.ts:76`](src/routes/metrics.ts#L76)

**Evidencia:**
```ts
router.get('/', authenticate, async ...)     // sin requireAdmin
router.get('/export', authenticate, async ...) // sin requireAdmin
```

**Impacto real:**  
Cualquier `user` ve el dashboard de métricas globales (volumen total de tickets, carga por miembro, tendencias de cierre) y puede exportar un CSV de todos los tickets del sistema. Información competitiva/operacional sensible accesible sin restricción de rol.

---

### A-5 · `GET /tickets/:ticketId/audit` sin restricción — cualquier usuario ve el historial de cualquier ticket
**OWASP:** A01:2021 – Broken Access Control  
**Archivo:** [`src/routes/audit.ts:12`](src/routes/audit.ts#L12)

**Evidencia:**
```ts
router.get('/', authenticate, async (req, res, next) => {
  const ticketId = Number(req.params.ticketId)
  // Devuelve todos los logs sin verificar si el usuario tiene acceso al ticket
```

**Impacto real:**  
Un `user` sin asignación en un ticket puede ver todo su historial de cambios (quién cambió qué, cuándo, valores anteriores y nuevos). Viola el modelo de permisos definido en el producto donde los users solo operan sobre tickets asignados.

---

### A-6 · Rate limiting solo en `/auth/oauth/callback` — endpoints costosos desprotegidos
**OWASP:** A04:2021 – Insecure Design  
**Archivo:** [`src/routes/auth.ts:11-17`](src/routes/auth.ts#L11-L17) (único punto con límite)

**Impacto real:**  
Los siguientes endpoints no tienen rate limiting y son vectores de abuso:
- `GET /api/metrics/export` — stream de toda la tabla `tickets` para un rango de fechas arbitrario
- `GET /api/users` — consulta paginada sin throttle
- `GET /api/tickets` — query con múltiples JOINs y COUNT paralelo
- `PATCH /api/tickets/:id/status` — escribe en `audit_logs` por cada llamada

Un atacante autenticado puede provocar DoS a nivel de base de datos sin ninguna limitación.

---

### A-7 · Error handler expone mensajes de excepción crudos en producción
**OWASP:** A05:2021 – Security Misconfiguration  
**Archivo:** [`src/middleware/errorHandler.ts:9`](src/middleware/errorHandler.ts#L9)

**Evidencia:**
```ts
res.status(status).json({ error: err.message ?? 'Internal Server Error' })
```

**Impacto real:**  
Los errores de PostgreSQL tienen mensajes como `duplicate key value violates unique constraint "users_email_key"` o `column "x" of relation "tickets" does not exist`. Estos mensajes revelan nombre de tablas, columnas, constraints y estructura del schema a cualquier cliente. No hay distinción entre errores del dominio (seguros para exponer) y errores de infraestructura (que deben ocultar detalles).

---

## MEDIO

---

### M-1 · `comment.body` sin límite de longitud — vector de DoS por storage exhaustion
**OWASP:** A03:2021 – Injection  
**Archivo:** [`src/routes/comments.ts:11`](src/routes/comments.ts#L11)

**Evidencia:**
```ts
const commentBodySchema = z.object({
  body: z.string().min(1),  // sin .max()
})
```

**Impacto real:**  
Un usuario autenticado puede enviar comentarios de varios MB. Con `body: text` en PostgreSQL sin límite, esto agota disco, incrementa WAL y degrada el rendimiento de la BD. Un atacante con una cuenta `user` puede saturar el storage con requests legítimos desde el punto de vista del protocolo.

---

### M-2 · `description` en tickets y proyectos sin límite de longitud
**OWASP:** A03:2021 – Injection  
**Archivo:** [`src/routes/tickets.ts:29`](src/routes/tickets.ts#L29), [`src/routes/projects.ts:19`](src/routes/projects.ts#L19)

**Evidencia:**
```ts
description: z.string().optional(),  // ambos schemas sin .max()
```

**Impacto real:**  
Mismo vector que M-1. El campo `description` es `text` en la BD (ilimitado). Payloads grandes también impactan la serialización JSON en el response y la memoria del proceso Node.

---

### M-3 · `ticketId` del path no validado en `comments.ts` y `audit.ts`
**OWASP:** A03:2021 – Injection  
**Archivo:** [`src/routes/comments.ts:29`](src/routes/comments.ts#L29), [`src/routes/audit.ts:14`](src/routes/audit.ts#L14)

**Evidencia:**
```ts
const ticketId = Number(req.params.ticketId)
// No hay: if (!Number.isInteger(ticketId) || ticketId < 1) ...
```

**Impacto real:**  
Si `ticketId` es `"abc"`, `Number("abc")` = `NaN`. Drizzle ejecuta `WHERE ticket_id = NaN` lo que PostgreSQL convierte en un error de tipo, propagando una excepción 500 que el error handler expone íntegramente (ver A-7). Ruta alternativa: `ticketId = 0` genera queries válidas pero incorrectas semánticamente.

---

### M-4 · Rango de fechas en `/metrics` sin validación — queries ilimitadas sobre toda la tabla
**OWASP:** A04:2021 – Insecure Design  
**Archivo:** [`src/routes/metrics.ts:13-17`](src/routes/metrics.ts#L13-L17)

**Evidencia:**
```ts
const { from, to } = req.query as { from?: string; to?: string }
const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1)
const toDate   = to   ? new Date(to)   : new Date()
// Sin validación: isNaN, rango máximo, orden from < to
```

**Impacto real:**  
`from=1970-01-01&to=2099-12-31` genera un `SELECT ... GROUP BY` sobre la totalidad de la tabla `tickets`. Sin índice en `updated_at` (no declarado en schema.ts), esto resulta en un full table scan. El endpoint `/` de métricas no valida en absoluto; solo `/export` valida `isNaN`.

---

### M-5 · `uniqueSlug` con bucle `while(true)` sin tope de iteraciones
**OWASP:** A04:2021 – Insecure Design  
**Archivo:** [`src/routes/projects.ts:43-57`](src/routes/projects.ts#L43-L57)

**Evidencia:**
```ts
while (true) {
  const [existing] = await db.select(...).where(eq(projects.slug, slug)).limit(1)
  if (!existing || existing.id === excludeId) break
  attempt++
  slug = `${base}-${attempt}`
}
```

**Impacto real:**  
Si la base de datos contiene slugs `proyecto`, `proyecto-1`, ..., `proyecto-N` consecutivos, el bucle emite N+1 queries antes de romper. Sin límite superior, un adversario que pre-cree proyectos con slugs secuenciales puede provocar que la creación de un proyecto legítimo tarde indefinidamente, agotando el pool de conexiones.

---

### M-6 · `GET /metrics/export` sin límite de filas — CSV de toda la tabla en memoria
**OWASP:** A04:2021 – Insecure Design  
**Archivo:** [`src/routes/metrics.ts:92-110`](src/routes/metrics.ts#L92-L110)

**Evidencia:**
```ts
const rows = await db.select({...}).from(tickets).where(...)  // sin .limit()
// luego itera for (const row of rows) { res.write(...) }
```

**Impacto real:**  
Drizzle carga todas las filas en memoria antes del primer `res.write`. Para un rango amplio, esto puede cargar cientos de miles de registros en el heap de Node. El comentario en CLAUDE.md dice "stream fila a fila (no acumular en memoria)" — este requisito no está implementado.

---

### M-7 · `JWT_SECRET` sin validación de entropía mínima
**OWASP:** A02:2021 – Cryptographic Failures  
**Archivo:** [`src/middleware/auth.ts:21`](src/middleware/auth.ts#L21), [`src/routes/auth.ts:79`](src/routes/auth.ts#L79)

**Evidencia:**
```ts
jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: '8h' })
jwt.verify(token, process.env.JWT_SECRET!)
```

**Impacto real:**  
No hay validación en startup de que `JWT_SECRET` tenga longitud/entropía mínima. Secrets débiles como `"secret"`, `"dev"`, o `"password"` permiten brute-force offline de tokens: el atacante captura un JWT válido y prueba secrets hasta encontrar el correcto, obteniendo capacidad de firmar tokens arbitrarios.

---

## BAJO

---

### B-1 · Dependencia `bcryptjs` instalada pero no utilizada
**OWASP:** A06:2021 – Vulnerable and Outdated Components  
**Archivo:** [`package.json:14`](package.json#L14)

**Evidencia:**
```json
"bcryptjs": "^2.4.3"
```
No hay ningún `import` de `bcryptjs` en el codebase.

**Impacto real:**  
Dependencias no utilizadas amplían la superficie de ataque (vulnerabilidades futuras en esa librería) y añaden ruido en auditorías de seguridad. El uso de `^` con version range puede introducir automáticamente versiones con CVEs.

---

### B-2 · `default limit=100` en `/tags` y `/users` — inconsistencia con el estándar del proyecto
**OWASP:** A04:2021 – Insecure Design  
**Archivo:** [`src/routes/tags.ts:18`](src/routes/tags.ts#L18), [`src/routes/users.ts:32`](src/routes/users.ts#L32)

**Evidencia:**
```ts
// tags.ts y users.ts
const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 100))
// El resto de endpoints usa: default 20, max 100
```

**Impacto real:**  
Un cliente sin parámetro explícito obtiene 100 registros en lugar de 20. Con `GET /users`, esto expone 100 emails y roles en el primer request sin paginación consciente.

---

### B-3 · Sin logging estructurado — excepciones con datos sensibles pueden quedar en logs en claro
**OWASP:** A09:2021 – Security Logging and Monitoring Failures  
**Archivo:** [`src/index.ts`](src/index.ts), [`src/middleware/errorHandler.ts`](src/middleware/errorHandler.ts)

**Impacto real:**  
No hay sistema de logging estructurado. Los errores se pasan a `next(err)` con el mensaje crudo. En producción con un logger estándar (PM2, stdout), los stack traces con datos de usuario pueden terminar en logs de texto plano sin redacción. No hay correlation IDs ni trazabilidad de requests para forensia post-incidente.

---

## Resumen Ejecutivo

| Severidad | Cantidad | Hallazgos principales |
|-----------|----------|-----------------------|
| CRÍTICO   | 2        | Auth bypass total, destrucción masiva de tags |
| ALTO      | 7        | Sin headers de seguridad, broken access control en 3 endpoints, CORS, rate limiting, info disclosure |
| MEDIO     | 7        | DoS por payloads sin límite, queries ilimitadas, bugs de validación |
| BAJO      | 3        | Dependencia fantasma, inconsistencias de UX/seguridad, logging |

**Prioridad inmediata:** C-2 (tags DELETE) y C-1 (auth bypass) deben corregirse antes de cualquier despliegue. A-3, A-4 y A-5 requieren corrección antes de que usuarios reales accedan al sistema.
