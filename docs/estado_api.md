# Estado de implementación — Backend API

Última actualización: 2026-04-30

---

## Infraestructura base

| Módulo | Archivo | Estado |
|---|---|---|
| Entry point | `src/index.ts` | ✅ Listo |
| App Express + routers montados | `src/app.ts` | ✅ Listo |
| Conexión DB (Drizzle + pg Pool) | `src/db/index.ts` | ✅ Listo |
| Schema canónico (todas las tablas) | `src/db/schema.ts` | ✅ Listo |
| Error handler middleware | `src/middleware/errorHandler.ts` | ✅ Listo |
| Tipado `req.user` | `src/types/express.d.ts` | ✅ Listo |

---

## Middleware de auth

| Función | Descripción | Estado |
|---|---|---|
| `authenticate` | JWT + dev bypass (`X-Dev-Role`) | ✅ Listo |
| `requireAdmin` | Verifica `req.user.role === 'admin'` | ✅ Listo |

---

## Endpoints

### Auth `/auth`

| Método | Ruta | Estado | Notas |
|---|---|---|---|
| POST | `/auth/oauth/callback` | ✅ Listo | Google + Microsoft; upsert en primer login |
| POST | `/auth/dev-token` | ✅ Listo | Solo `NODE_ENV=development` |

### Tickets `/tickets`

| Método | Ruta | Estado | Notas |
|---|---|---|---|
| GET | `/tickets` | ✅ Listo | Filtros status/priority/tagId/assigneeId; paginación; archived toggle |
| POST | `/tickets` | ✅ Listo | Crea con tagIds opcionales |
| GET | `/tickets/:id` | ✅ Listo | Incluye assigneeIds y tagIds |
| PATCH | `/tickets/:id` | ✅ Listo | Actualiza title/description/priority; audit log en cambio de priority |
| PATCH | `/tickets/:id/status` | ✅ Listo | Optimistic Locking (version); 409 en conflicto; audit log automático |
| DELETE | `/tickets/:id` | ✅ Listo | Soft delete (`archived_at`); solo admin |
| POST | `/tickets/:id/assignees` | ✅ Listo | Solo admin; upsert silencioso |
| DELETE | `/tickets/:id/assignees/:userId` | ✅ Listo | Solo admin |

### Comments `/tickets/:ticketId/comments`

| Método | Ruta | Estado | Notas |
|---|---|---|---|
| GET | `/tickets/:ticketId/comments` | ✅ Listo | Solo comentarios no eliminados |
| POST | `/tickets/:ticketId/comments` | ✅ Listo | Solo assignees + admins pueden comentar |
| PATCH | `/tickets/:ticketId/comments/:commentId` | ✅ Listo | Solo el autor puede editar |
| DELETE | `/tickets/:ticketId/comments/:commentId` | ✅ Listo | Soft delete; autor o admin |

### Tags `/tags`

| Método | Ruta | Estado | Notas |
|---|---|---|---|
| GET | `/tags` | ✅ Listo | Lista todas las tags |
| POST | `/tags` | ✅ Listo | Solo admin |
| PATCH | `/tags/:id` | ✅ Listo | Solo admin |
| DELETE | `/tags/:id` | ✅ Listo | Solo admin; hard delete (cascade a ticket_tags) |

### Users `/users`

| Método | Ruta | Estado | Notas |
|---|---|---|---|
| GET | `/users` | ✅ Listo | Lista id/name/email/role (sin campos OAuth) |
| GET | `/users/:id` | ✅ Listo | Devuelve id/name/email/role (sin campos OAuth) |
| PATCH | `/users/:id/role` | ✅ Listo | Solo admin; body `{ role }` |

### Audit `/tickets/:ticketId/audit`

| Método | Ruta | Estado | Notas |
|---|---|---|---|
| GET | `/tickets/:ticketId/audit` | ✅ Listo | Solo lectura; ordenado por `createdAt DESC` |

---

## Progreso general

| Categoría | Hecho | Total |
|---|---|---|
| Infraestructura base | 6 | 6 |
| Middleware auth | 2 | 2 |
| Endpoints MVP | 16 | 16 |
| Endpoints post-MVP | 4 | 4 |
| **Total** | **28** | **28** |

---

## Post-MVP — implementados

Todos los endpoints post-MVP han sido implementados. No quedan pendientes.
