# API Contract — Ticket Manager

Base URL: `http://localhost:3000`

Auth header (dev): `X-Dev-Role: admin | user`
Auth header (prod): `Authorization: Bearer <token>`

Todos los endpoints requieren autenticación. Las respuestas de error siempre tienen la forma `{ "error": "<mensaje>" }`.

---

## Tickets

### GET /tickets

Lista tickets activos con filtros opcionales y paginación.

**Query params**

| Param        | Tipo    | Requerido | Default | Descripción                              |
|--------------|---------|-----------|---------|------------------------------------------|
| `status`     | string  | No        | —       | `todo` \| `in_progress` \| `done`        |
| `priority`   | string  | No        | —       | `high` \| `medium` \| `low`              |
| `tagId`      | integer | No        | —       | ID de tag                                |
| `assigneeId` | integer | No        | —       | ID de usuario asignado                   |
| `page`       | integer | No        | `1`     | Número de página (mín: 1)               |
| `limit`      | integer | No        | `20`    | Resultados por página (mín: 1, máx: 100) |
| `archived`   | string  | No        | —       | `"true"` para ver tickets archivados     |

Sin `archived=true` el endpoint excluye tickets con `archived_at` no nulo. Todos los filtros son combinables (AND).

**Ejemplo de request**

```
GET /tickets?status=in_progress&priority=high&page=1&limit=10
X-Dev-Role: user
```

**Respuesta 200**

```json
{
  "data": [
    {
      "id": 1,
      "title": "Implementar login OAuth",
      "description": "Integrar con el proveedor corporativo",
      "status": "in_progress",
      "priority": "high",
      "createdBy": 3,
      "archivedAt": null,
      "createdAt": "2026-04-27T10:00:00.000Z",
      "updatedAt": "2026-04-27T12:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

**Errores**

| Status | Cuándo                                                         |
|--------|----------------------------------------------------------------|
| 400    | Valor inválido en query param (ej. `status=invalid`)          |
| 401    | Token ausente o inválido                                       |
| 500    | Error interno — no se expone detalle                          |

---

### POST /tickets

Crea un ticket nuevo. El campo `createdBy` se asigna automáticamente desde el token del usuario autenticado.

**Body** `Content-Type: application/json`

| Campo         | Tipo   | Requerido | Descripción                               |
|---------------|--------|-----------|-------------------------------------------|
| `title`       | string | Sí        | Máx. 255 caracteres                       |
| `description` | string | No        | Texto libre sin límite                    |
| `priority`    | string | Sí        | `high` \| `medium` \| `low`              |
| `status`      | string | No        | `todo` \| `in_progress` \| `done` (default: `todo`) |

**Ejemplo de request**

```
POST /tickets
X-Dev-Role: admin
Content-Type: application/json

{
  "title": "Diseñar pantalla de dashboard",
  "description": "Incluir gráficos de burndown y velocity",
  "priority": "medium"
}
```

**Respuesta 201**

```json
{
  "id": 42,
  "title": "Diseñar pantalla de dashboard",
  "description": "Incluir gráficos de burndown y velocity",
  "status": "todo",
  "priority": "medium",
  "createdBy": 7,
  "archivedAt": null,
  "createdAt": "2026-04-27T14:00:00.000Z",
  "updatedAt": "2026-04-27T14:00:00.000Z"
}
```

**Errores**

| Status | Cuándo                                                              |
|--------|---------------------------------------------------------------------|
| 400    | `title` vacío o supera 255 chars; `priority` ausente o valor inválido |
| 401    | Token ausente o inválido                                            |
| 500    | Error interno — no se expone detalle                               |

---

## Tipos

```ts
type TicketStatus = 'todo' | 'in_progress' | 'done'
type TicketPriority = 'high' | 'medium' | 'low'

interface Ticket {
  id: number
  title: string
  description: string | null
  status: TicketStatus
  priority: TicketPriority
  createdBy: number
  archivedAt: string | null  // ISO 8601
  createdAt: string          // ISO 8601
  updatedAt: string          // ISO 8601
}

interface PaginatedTickets {
  data: Ticket[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

---

## Endpoints pendientes

Los siguientes endpoints están definidos en specs pero aún no implementados.

| Método | Ruta                                    | Descripción                         |
|--------|-----------------------------------------|-------------------------------------|
| GET    | `/tickets/:id`                          | Detalle de un ticket                |
| PATCH  | `/tickets/:id`                          | Editar campos                       |
| DELETE | `/tickets/:id`                          | Archivar (soft delete, solo admin)  |
| POST   | `/tickets/:id/assignees`                | Asignar usuario(s)                  |
| DELETE | `/tickets/:id/assignees/:userId`        | Quitar asignado                     |
| GET    | `/tickets/:ticketId/comments`           | Listar comentarios                  |
| POST   | `/tickets/:ticketId/comments`           | Agregar comentario                  |
| PATCH  | `/tickets/:ticketId/comments/:id`       | Editar comentario                   |
| DELETE | `/tickets/:ticketId/comments/:id`       | Eliminar comentario (soft delete)   |
| GET    | `/tickets/:ticketId/audit`              | Historial de cambios                |
| GET    | `/tags`                                 | Listar tags                         |
| POST   | `/tags`                                 | Crear tag                           |
| GET    | `/users`                                | Listar usuarios                     |
| POST   | `/auth/login`                           | Login → JWT                         |
| POST   | `/auth/dev-token`                       | Token de dev sin contraseña         |
