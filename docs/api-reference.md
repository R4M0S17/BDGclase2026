# API Reference — Mini Jira

> Fuente: `docs/Base-specs-backend/api-contract.md`  
> Base URL: `http://localhost:3000`  
> Las respuestas de error siempre tienen la forma `{ "error": "<mensaje>" }`.

---

## Tabla de endpoints

| Método | Ruta | Auth requerida | Body (campos) | Response (campos) | Status codes |
|--------|------|----------------|---------------|-------------------|--------------|
| GET | `/tickets` | Sí | — | `data: Ticket[]`, `meta: { page, limit, total, totalPages }` | 200, 400, 401, 500 |
| POST | `/tickets` | Sí | `title` (req, máx 255 chars), `description` (opt), `priority` (req: `high`\|`medium`\|`low`), `status` (opt, default `todo`) | `Ticket` | 201, 400, 401, 500 |
| GET ⚠️ pendiente | `/tickets/:id` | Sí | — | — | — |
| PATCH ⚠️ pendiente | `/tickets/:id` | Sí | — | — | — |
| DELETE ⚠️ pendiente | `/tickets/:id` | Sí | — | — | — |
| POST ⚠️ pendiente | `/tickets/:id/assignees` | Sí | — | — | — |
| DELETE ⚠️ pendiente | `/tickets/:id/assignees/:userId` | Sí | — | — | — |
| GET ⚠️ pendiente | `/tickets/:ticketId/comments` | Sí | — | — | — |
| POST ⚠️ pendiente | `/tickets/:ticketId/comments` | Sí | — | — | — |
| PATCH ⚠️ pendiente | `/tickets/:ticketId/comments/:id` | Sí | — | — | — |
| DELETE ⚠️ pendiente | `/tickets/:ticketId/comments/:id` | Sí | — | — | — |
| GET ⚠️ pendiente | `/tickets/:ticketId/audit` | Sí | — | — | — |
| GET ⚠️ pendiente | `/tags` | Sí | — | — | — |
| POST ⚠️ pendiente | `/tags` | Sí | — | — | — |
| GET ⚠️ pendiente | `/users` | Sí | — | — | — |
| POST ⚠️ pendiente | `/auth/login` | No | — | — | — |
| POST ⚠️ pendiente | `/auth/dev-token` | No | — | — | — |

### Query params — GET /tickets

| Param | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `status` | string | No | — | `todo` \| `in_progress` \| `done` |
| `priority` | string | No | — | `high` \| `medium` \| `low` |
| `tagId` | integer | No | — | Filtrar por ID de tag |
| `assigneeId` | integer | No | — | Filtrar por ID de usuario asignado |
| `page` | integer | No | `1` | Número de página (mín: 1) |
| `limit` | integer | No | `20` | Resultados por página (mín: 1, máx: 100) |
| `archived` | string | No | — | `"true"` para incluir tickets archivados |

Sin `archived=true`, el endpoint excluye tickets con `archived_at` no nulo. Todos los filtros son combinables (AND).

---

## Ejemplos curl (endpoints documentados)

### GET /tickets

```bash
curl -X GET 'http://localhost:3000/tickets?status=in_progress&priority=high&page=1&limit=10' \
  -H "Authorization: Bearer {token}"
```

### POST /tickets

```bash
curl -X POST http://localhost:3000/tickets \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Diseñar pantalla de dashboard", "description": "Incluir graficos de burndown y velocity", "priority": "medium"}'
```

---

## Autenticación

### 1. Login

> ⚠️ No documentado en api-contract.md

### 2. Uso del token

Todos los endpoints requieren autenticación. Incluye el token en cada request protegido:

```
Authorization: Bearer <accessToken>
```

### 3. Refresh

> ⚠️ No documentado en api-contract.md

### 4. Dev bypass

El header `X-Dev-Role` permite acceder a cualquier endpoint sin JWT en entorno de desarrollo:

```
X-Dev-Role: admin
X-Dev-Role: user
```
