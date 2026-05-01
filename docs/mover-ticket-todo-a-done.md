# Diagrama de Secuencia — Mover Ticket de To-Do a Done

```mermaid
sequenceDiagram
    actor Usuario as Member
    participant SPA as SPA<br/>(React 18)
    participant API as API Server<br/>(Express 5)
    participant Redis as Redis<br/>(Blacklist JWT)
    participant DB as PostgreSQL<br/>(Prisma)

    Usuario->>SPA: Arrastra ticket a columna "Listo"

    SPA->>API: PATCH /api/tickets/:id<br/>{ status: "done", version: N }<br/>Authorization: Bearer <JWT>

    API->>Redis: ¿JWT está en blacklist?
    Redis-->>API: No invalidado

    API->>DB: SELECT id, status, created_by, version<br/>WHERE id = :id
    DB-->>API: { created_by, version: N, status: "review" }

    alt Member intenta mover ticket ajeno
        API-->>SPA: 403 Forbidden
        SPA-->>Usuario: "No tienes permiso para modificar este ticket"
    else version del cliente !== version en BD
        API-->>SPA: 409 Conflict
        SPA-->>Usuario: "Alguien modificó este ticket mientras lo editabas.<br/>Recarga para ver los cambios."
        Note over SPA,Usuario: Los cambios locales permanecen<br/>visibles en el formulario
    else Permiso OK y version coincide
        API->>DB: UPDATE tickets<br/>SET status = 'done',<br/>    version = N+1,<br/>    updated_at = NOW()<br/>WHERE id = :id AND version = N
        DB-->>API: 1 row updated

        API-->>SPA: 200 OK<br/>{ id, status: "done", version: N+1, updated_at }

        SPA->>SPA: Mueve tarjeta a columna "Listo"<br/>Actualiza version en estado local
        SPA-->>Usuario: Ticket visible en "Listo"
    end
```

---

## Decisiones de diseño

| Paso | Origen en specs |
|---|---|
| Verificación de blacklist en Redis | `specs.md §5` — Redis invalida JWT en logout |
| `SELECT` antes del `UPDATE` | Necesario para validar `created_by` (permisos) y `version` (Optimistic Locking) |
| `AND version = N` en el `UPDATE` | Garantía atómica: evita race condition entre el SELECT y el UPDATE |
| 409 con cambios locales visibles | `specs.md §4` — _"los cambios locales no se pierden"_ |
| 403 para ticket ajeno | `specs.md §2.1` — matriz de permisos: `member` no puede editar ticket ajeno |
