# Estado API — Mini Jira Backend

**Última actualización:** 2026-05-01

---

## Hitos completados

### H1 — Scaffolding base
- `src/index.ts` + `src/app.ts` — Express + middlewares
- `src/db/index.ts` — pool Drizzle conectado vía `DATABASE_URL`
- `src/middleware/errorHandler.ts` — captura `err.status`, responde `{ error }`
- `src/types/express.d.ts` — `req.user: { userId, role }`

### H2 — Schema de base de datos (Drizzle ORM)
- Fuente de verdad: `src/db/schema.ts`
- Tablas: `users`, `projects`, `tickets`, `tags`, `ticket_assignees`, `ticket_tags`, `comments`, `audit_logs`
- Enums: `ticket_status` (`todo | in_progress | review | done`), `ticket_priority`, `user_role`
- `tickets.version` — columna para optimistic locking
- `tickets.is_blocked` — añadido 2026-05-01 (migración manual + `drizzle/0003_add_is_blocked.sql`)
- `users.oauth_provider` + `users.oauth_id` — soporte OAuth (sin `password_hash`)
- Seed: `src/db/seed.ts` — 3 usuarios, 1 proyecto, 8 tickets, 4 tags, comentarios de ejemplo

### H3 — Auth middleware
- `src/middleware/auth.ts`
  - `authenticate` — valida JWT (`Authorization: Bearer <token>`); dev bypass vía `X-Dev-Role: admin|user`
  - `requireAdmin` — guard 403 si `role !== 'admin'`

### H4 — Auth routes (`/auth`)
- `POST /auth/oauth/callback` — intercambia código OAuth (Google o Microsoft), upsert de usuario, devuelve JWT 8h
- `POST /auth/refresh` — dev-only: devuelve mock access token para que el interceptor Axios no limpie sesión
- `POST /auth/dev-token` — genera JWT sin proveedor (solo `NODE_ENV=development`)
- Proveedores soportados: Google (`GOOGLE_CLIENT_ID/SECRET`) y Microsoft Entra ID (`MICROSOFT_CLIENT_ID/SECRET/TENANT_ID`)

### H5 — Tickets (`/tickets`)
- `GET    /tickets` — lista paginada con filtros: `status`, `priority`, `tagId`, `assigneeId`, `archived`; default `limit=20`, max `100`
- `POST   /tickets` — crea ticket; acepta `tagIds[]` opcionales
- `GET    /tickets/:id` — detalle con `assigneeIds[]` y `tagIds[]`
- `PATCH  /tickets/:id/status` — cambia estado con **optimistic locking** (`version`); 409 en conflicto; inserta `audit_log`
- `PATCH  /tickets/:id` — edita `title`, `description`, `priority`; inserta `audit_log` si cambia `priority`
- `DELETE /tickets/:id` — soft delete (`archived_at`); solo admin; 422 si ya archivado
- `POST   /tickets/:id/assignees` — agrega asignado; solo admin
- `DELETE /tickets/:id/assignees/:userId` — quita asignado; solo admin

### H6 — Comentarios (`/tickets/:ticketId/comments`)
- `GET    /` — lista comentarios activos del ticket
- `POST   /` — crea comentario; requiere ser asignado o admin
- `PATCH  /:commentId` — edita cuerpo; solo el autor
- `DELETE /:commentId` — soft delete (`deleted_at`); autor o admin

### H7 — Audit log (`/tickets/:ticketId/audit`)
- `GET /` — historial inmutable del ticket, ordenado `created_at DESC`

### H8 — Tags (`/tags`)
- `GET  /` — catálogo completo (cualquier usuario autenticado)
- `POST /` — crea tag; solo admin

### H9 — Usuarios (`/users`)
- `GET /me` — usuario autenticado actual (basado en `req.user.userId`)
- `GET /` — lista usuarios (`id`, `name`, `email`, `role`); sin `password_hash`
- `GET /:id` — usuario por ID
- `PATCH /:id/role` — cambia rol; solo admin

### H10 — Métricas (`/metrics`)
- `GET /metrics` — totales, tickets cerrados por mes, distribución por estado y por miembro activo
- `GET /metrics/export` — descarga CSV streaming (RFC 4180); requiere `from` y `to`

---

## Pendiente

| # | Feature | Notas |
|---|---|---|
| P2 | Búsqueda por texto en título | `GET /tickets?q=...` — falta `ilike` en el filtro de lista |
| P3 | Notificaciones por email | Asignación de ticket + mención `@usuario` en comentario |
| P6 | Labels vs Tags (frontend) | UI para seleccionar tags formales en lugar de strings libres (B7 sin resolver) |
| P7 | `POST /auth/refresh` producción | Implementación real con httpOnly cookie y refresh token en BD |

---

## Bugs y mismatches detectados (auditoría 2026-05-01)

| # | Severidad | Descripción | Estado |
|---|-----------|-------------|--------|
| B1 | 🔴 Crítico | Base de datos vacía — no existe el usuario ID 1 requerido por el auth bypass; crear ticket falla FK | ✅ Resuelto — `src/db/seed.ts` inserta 3 users, 1 proyecto, 8 tickets, tags y comentarios |
| B2 | 🔴 Crítico | Endpoints `/api/metrics` y `/api/metrics/export` no están registrados en `app.ts` → 404 | ✅ Resuelto — creado `src/routes/metrics.ts`, registrado en `app.ts` |
| B3 | 🔴 Crítico | No existe `POST /api/auth/refresh` — el interceptor de Axios redirige a `/login` en cada 401 | ✅ Resuelto — añadido endpoint dev en `src/routes/auth.ts` |
| B4 | 🟠 Alto | Mismatch de `Role`: frontend usa `'member'`, backend usa `'user'` — permisos fallan silenciosamente | ✅ Resuelto — `Role` actualizado a `'admin' \| 'user'` en todo el frontend |
| B5 | 🟠 Alto | Campo comentarios: frontend envía `{ text }`, backend espera `{ body }` → validación Zod falla | ✅ Resuelto — `useComments.ts` ahora envía `{ body: text }` |
| B6 | 🟠 Alto | `GET /comments`: backend devuelve solo `userId`, frontend espera objeto `User` completo → crash al renderizar | ✅ Resuelto — `comments.ts` JOIN con `users`, respuesta incluye `author` y mapea `body → text` |
| B7 | 🟡 Medio | Labels vs Tags: frontend trata etiquetas como strings libres, backend tiene tabla `tags` formal con IDs | ⬜ Pendiente — `labels: []` en mapper (no crashea, tags vacíos hasta diseñar la UI) |
| B8 | 🟡 Medio | Campo `isBlocked` no existe en el schema de BD — la UI muestra badge "Bloqueado" pero no persiste | ✅ Resuelto — columna `is_blocked` añadida a BD y schema; route y mapper actualizados |
| B9 | 🟡 Medio | Endpoint `GET /api/users/me` no implementado — frontend lo referencia | ✅ Resuelto — añadido en `src/routes/users.ts` |
| B10 | 🔴 Crítico | CORS solo permitía `localhost:5173` — con múltiples instancias Vite activas (5174-5176), todas las peticiones fallaban silenciosamente | ✅ Resuelto — `app.ts` ahora acepta cualquier origen en `NODE_ENV=development` |

---

## Variables de entorno requeridas

Ver `.env.example`. Mínimo para arrancar:

```
DATABASE_URL    — conexión PostgreSQL
JWT_SECRET      — secreto para firmar tokens
NODE_ENV        — development | production
```

Para OAuth en producción añadir las vars del proveedor elegido (`GOOGLE_*` o `MICROSOFT_*`).
