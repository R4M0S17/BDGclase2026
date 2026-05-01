# Backend Specs — Ticket Manager

## Overview

REST API en Node.js para gestión de tickets organizados por prioridad. Todos los tickets viven en un **pool global** (sin proyectos). Construido con Express + Drizzle ORM sobre PostgreSQL.

---

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express |
| ORM | Drizzle ORM |
| Base de datos | PostgreSQL |
| Auth | JWT (con bypass para desarrollo) |

---

## Authentication

- Dos roles globales: `admin` y `user`.
- **Dev bypass:** enviar header `X-Dev-Role: admin` o `X-Dev-Role: user` omite validación JWT e inyecta el rol indicado. Solo activo cuando `NODE_ENV=development`.
- En producción: `Authorization: Bearer <token>` en cada request.
- Payload del JWT: `{ userId, role }`.

---

## Roles y Permisos

| Acción | user | admin |
|---|---|---|
| Ver tickets | ✅ | ✅ |
| Crear ticket | ✅ | ✅ |
| Editar ticket | Solo si está asignado | ✅ |
| Archivar ticket | ❌ | ✅ |
| Asignar / reasignar usuarios | ❌ | ✅ |
| Crear tags | ✅ | ✅ |
| Comentar en ticket | ✅ si está asignado | ✅ |
| Editar comentario propio | ✅ | ✅ |
| Eliminar comentario propio | ✅ | ✅ |
| Eliminar cualquier comentario | ❌ | ✅ |
| Ver historial de auditoría | ✅ | ✅ |

---

## Entidades

### Ticket

| Campo | Tipo | Notas |
|---|---|---|
| id | integer | PK, autoincrement |
| title | varchar(255) | Requerido, máx. 255 caracteres |
| description | text | Opcional |
| status | enum | `todo` \| `in_progress` \| `done` |
| priority | enum | `high` \| `medium` \| `low` |
| created_by | integer | FK → users |
| archived_at | timestamp | `null` = activo; soft delete |
| created_at | timestamp | UTC, auto |
| updated_at | timestamp | UTC, auto |

### User

| Campo | Tipo | Notas |
|---|---|---|
| id | integer | PK, autoincrement |
| name | varchar(100) | Requerido |
| email | varchar(255) | Único |
| role | enum | `admin` \| `user` |
| created_at | timestamp | UTC, auto |

### Tag

| Campo | Tipo | Notas |
|---|---|---|
| id | integer | PK, autoincrement |
| name | varchar(50) | Único |
| created_by | integer | FK → users |
| created_at | timestamp | UTC, auto |

### Comment

| Campo | Tipo | Notas |
|---|---|---|
| id | integer | PK, autoincrement |
| ticket_id | integer | FK → tickets |
| user_id | integer | FK → users |
| body | text | Requerido |
| created_at | timestamp | UTC, auto |
| deleted_at | timestamp | `null` = activo; soft delete |

### AuditLog

| Campo | Tipo | Notas |
|---|---|---|
| id | integer | PK, autoincrement |
| ticket_id | integer | FK → tickets |
| field | varchar(50) | Campo modificado (ej. `status`, `priority`) |
| old_value | text | Valor anterior |
| new_value | text | Valor nuevo |
| actor_id | integer | FK → users |
| created_at | timestamp | UTC, auto — **inmutable** |

### TicketAssignee (N:M)

| Campo | Tipo | Notas |
|---|---|---|
| ticket_id | integer | FK → tickets |
| user_id | integer | FK → users |

### TicketTag (N:M)

| Campo | Tipo | Notas |
|---|---|---|
| ticket_id | integer | FK → tickets |
| tag_id | integer | FK → tags |

---

## API Endpoints

### Tickets

| Method | Path | Descripción | Rol mínimo | Estado |
|---|---|---|---|---|
| GET | `/tickets` | Listar tickets con filtros y paginación | any | ❌ |
| POST | `/tickets` | Crear ticket | any | ❌ |
| GET | `/tickets/:id` | Ver detalle de un ticket | any | ❌ |
| PATCH | `/tickets/:id` | Editar campos del ticket | assignee o admin | ❌ |
| DELETE | `/tickets/:id` | Archivar ticket (soft delete) | admin | ❌ |

**Query params disponibles en `GET /tickets`:**

| Param | Tipo | Descripción |
|---|---|---|
| `status` | string | `todo` \| `in_progress` \| `done` |
| `priority` | string | `high` \| `medium` \| `low` |
| `tagId` | integer | Filtrar por id de tag |
| `assigneeId` | integer | Filtrar por usuario asignado |
| `page` | integer | Número de página (default: 1) |
| `limit` | integer | Resultados por página (default: 20, máx: 100) |

Todos los filtros son combinables (AND). Los tickets archivados (`archived_at IS NOT NULL`) no aparecen a menos que se agregue `?archived=true`.

---

### Asignados

| Method | Path | Descripción | Rol mínimo | Estado |
|---|---|---|---|---|
| POST | `/tickets/:id/assignees` | Asignar usuario(s) al ticket | admin | ❌ |
| DELETE | `/tickets/:id/assignees/:userId` | Quitar asignado | admin | ❌ |

---

### Tags

| Method | Path | Descripción | Rol mínimo | Estado |
|---|---|---|---|---|
| GET | `/tags` | Listar todos los tags | any | ❌ |
| POST | `/tags` | Crear tag | any | ❌ |

---

### Comments

| Method | Path | Descripción | Rol mínimo | Estado |
|---|---|---|---|---|
| GET | `/tickets/:id/comments` | Listar comentarios del ticket | any | ❌ |
| POST | `/tickets/:id/comments` | Agregar comentario | assignee o admin | ❌ |
| PATCH | `/tickets/:id/comments/:commentId` | Editar comentario | autor | ❌ |
| DELETE | `/tickets/:id/comments/:commentId` | Eliminar comentario (soft delete) | autor o admin | ❌ |

---

### Users

| Method | Path | Descripción | Rol mínimo |
|---|---|---|---|
| GET | `/users` | Listar usuarios disponibles para asignar | any |

---

### Audit

| Method | Path | Descripción | Rol mínimo |
|---|---|---|---|
| GET | `/tickets/:id/audit` | Historial de cambios del ticket | any |

---

### Auth

| Method | Path | Descripción |
|---|---|---|
| POST | `/auth/login` | Login con `{ email, password }` → JWT |
| POST | `/auth/dev-token` | **Solo dev:** `{ userId, role }` → JWT sin validación de contraseña |

---

## Business Rules

1. **Soft delete universal:** `archived_at` se setea al timestamp actual. Nunca se ejecuta `DELETE` en `tickets` ni `comments`.
2. **Auditoría inmutable:** todo cambio en `status` o `priority` inserta un registro en `audit_logs`. Esta tabla no recibe `UPDATE` ni `DELETE`.
3. **Permisos de edición:** un `user` solo puede editar un ticket si está en su lista de `ticket_assignees`. El `admin` puede editar cualquier ticket.
4. **Asignación:** solo el `admin` puede añadir o quitar usuarios de `ticket_assignees`.
5. **Tags globales:** cualquier usuario autenticado puede crear tags; los nombres deben ser únicos.
6. **Comentarios:** solo asignados al ticket o el `admin` pueden comentar. Cada usuario solo puede editar o eliminar sus propios comentarios; el `admin` puede eliminar cualquiera.
7. **Validación de título:** máximo 255 caracteres, validado en backend (devuelve 400 si se excede).
8. **Paginación obligatoria:** `GET /tickets` siempre pagina; sin `limit` explícito usa 20 registros por página.
9. **Dev bypass:** el header `X-Dev-Role` solo funciona cuando `NODE_ENV=development`; en producción se ignora y el middleware exige JWT válido.

---

## HTTP Error Codes

| Code | Significado |
|---|---|
| 400 | Validación fallida (campo requerido, límite de caracteres, valor inválido) |
| 401 | Token ausente, inválido o expirado |
| 403 | Acción no permitida para el rol del usuario |
| 404 | Recurso no encontrado |
| 409 | Conflicto (ej. nombre de tag duplicado) |
