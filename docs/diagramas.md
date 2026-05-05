# Diagramas Técnicos — Mini Jira

> Fuentes: `docs/Base-specs-backend/specs.md`, `docs/Base-specs-backend/api-contract.md`, `src/routes/auth.ts`, `src/routes/tickets.ts`, `src/routes/audit.ts`

---

## Diagrama 1: Flujo de autenticación JWT

```mermaid
sequenceDiagram
    participant Cliente
    participant Auth as "API /auth"
    participant OAuth as "Proveedor OAuth"
    participant BD

    Note over Cliente,BD: Flujo nominal - OAuth 2.0
    Cliente->>Auth: POST /auth/oauth/callback
    Note right of Cliente: code, provider (google o microsoft), redirectUri
    Auth->>OAuth: POST tokenUrl con grant_type=authorization_code
    OAuth-->>Auth: access_token del proveedor
    Auth->>OAuth: GET userInfoUrl con access_token
    OAuth-->>Auth: oauthId, email, name del usuario
    Auth->>BD: SELECT users WHERE oauth_provider=provider AND oauth_id=oauthId
    BD-->>Auth: usuario existente o null
    alt Primer login - usuario no encontrado
        Auth->>BD: INSERT users ON CONFLICT UPDATE por email
        BD-->>Auth: usuario creado
    end
    Auth-->>Cliente: token JWT firmado con userId y role expira en 8h

    Note over Cliente,BD: Requests autenticados
    Cliente->>Auth: Cualquier endpoint protegido con Authorization Bearer accessToken

    Note over Cliente,BD: Refresh solo NODE_ENV=development
    Cliente->>Auth: POST /auth/refresh
    Auth-->>Cliente: accessToken dev-mock-token

    alt Development bypass cuando NODE_ENV=development
        Note over Cliente,Auth: X-Dev-Role omite validacion JWT e inyecta userId=1 y role indicado
        Cliente->>Auth: Endpoint protegido con X-Dev-Role: admin
        Auth-->>Cliente: Respuesta normal sin JWT requerido
    end
```

> ⚠️ No documentado en las fuentes: el flujo de refresh con `refreshToken` vía httpOnly cookie en producción no está implementado en `src/routes/auth.ts`. El endpoint `POST /auth/refresh` solo existe en `NODE_ENV=development` y devuelve un token mock. No existe un flujo de refresh real para producción en los archivos leídos.

---

## Diagrama 2: Mover ticket entre columnas (Optimistic Locking)

```mermaid
sequenceDiagram
    participant Frontend
    participant API as "API /tickets"
    participant BD
    participant AuditLog as "audit_logs"

    Frontend->>API: PATCH /tickets/:id/status con status y version
    API->>API: authenticate - verifica JWT o X-Dev-Role header
    alt Sin autenticacion valida
        API-->>Frontend: 401 Unauthorized
    end
    API->>API: Zod validate - status enum y version integer requeridos
    alt Validacion falla
        API-->>Frontend: 400 Bad Request
    end
    API->>BD: SELECT tickets WHERE id=:id LIMIT 1
    BD-->>API: ticket o null
    alt Ticket no encontrado
        API-->>Frontend: 404 Not Found
    end
    alt Ticket tiene archivedAt no nulo
        API-->>Frontend: 422 Unprocessable Entity
    end
    alt role es user no admin
        API->>BD: SELECT ticket_assignees WHERE ticket_id=:id AND user_id=:userId
        BD-->>API: fila de asignacion o null
        alt No es assignee del ticket
            API-->>Frontend: 403 Forbidden
        end
    end
    API->>BD: UPDATE tickets SET status=:s version=v+1 WHERE id=:id AND version=:v
    BD-->>API: ticket actualizado o array vacio
    alt version no coincide - Optimistic Lock falla
        API-->>Frontend: 409 Conflict - ticket modified by another user
    end
    API->>AuditLog: INSERT audit_logs ticketId field=status oldValue newValue actorId
    AuditLog-->>API: ok
    API-->>Frontend: 200 OK con ticket actualizado y version incrementada
```

---

## Diagrama 3: Ciclo de vida de un ticket

```mermaid
flowchart LR
    CREAR(["POST /tickets"]) --> TODO["TODO"]

    TODO -->|"PATCH /status"| OL{"version OK?"}
    IN_PROGRESS["IN_PROGRESS"] -->|"PATCH /status"| OL
    REVIEW["REVIEW"] -->|"PATCH /status"| OL
    DONE(("DONE")) -->|"PATCH /status"| OL

    OL -->|"Si"| AUDIT["audit_logs INSERT"]
    OL -->|"No - 409"| CONFLICT(["409 Conflict"])

    AUDIT -->|"to in_progress"| IN_PROGRESS
    AUDIT -->|"to review"| REVIEW
    AUDIT -->|"to done"| DONE
    AUDIT -->|"to todo"| TODO

    TODO -->|"admin DELETE /:id"| ARCHIVED(("ARCHIVED"))
    IN_PROGRESS -->|"admin DELETE /:id"| ARCHIVED
    REVIEW -->|"admin DELETE /:id"| ARCHIVED
    DONE -->|"admin DELETE /:id"| ARCHIVED
```

> **Nota:** El flag `is_blocked` se gestiona via `PATCH /tickets/:id` con el campo `isBlocked: boolean`. No cambia la columna del ticket ni crea una transición de estado separada. Solo activa un badge visual en la UI sin alterar el campo `status`.
