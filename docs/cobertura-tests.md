# Cobertura de Tests — Mini Jira

> Generado a partir de `docs/backlog.md` y `src/__tests__/tickets.test.ts`

---

## Tabla de cobertura por historia

| ID | Historia | Estado | Tests relacionados |
|----|----------|--------|--------------------|
| H1 | Acceso al sistema con cuenta corporativa | ❌ | — |
| H2 | Gestión de tickets en el tablero Kanban | ⚠️ | `it("Happy Path — creates ticket, returns 201, createdBy comes from JWT/dev token")`, `it("Happy Path — updates status, increments version, writes audit log (H2: flujo normal)")` |
| H3 | Edición segura ante cambios concurrentes | ⚠️ | `it("Happy Path — updates status, increments version, writes audit log")`, `it("Edge Case (H3 — Optimistic Locking) — returns 409 when version is stale")` |
| EC-1 | Notificación de email sobre comentario archivado antes del envío | ❌ | — |
| EC-2 | Exportación de métricas CSV con datos inválidos o vacíos | ❌ | — |

---

## Escenarios Gherkin sin cobertura

### H1 — Acceso al sistema con cuenta corporativa

- ❌ Scenario: Acceso exitoso con cuenta activa
  - Given: el proveedor OAuth corporativo está configurado y la cuenta está aprovisionada
  - When: inicio sesión con cuenta corporativa válida
  - Then: tengo acceso al tablero con el rol asignado y la sesión permanece activa

- ❌ Scenario: Intento de acceso con cuenta no aprovisionada
  - Given: cuenta corporativa válida pero no aprovisionada por un admin
  - When: intento iniciar sesión
  - Then: se muestra mensaje de acceso denegado y no se permite entrar

- ❌ Scenario: Sesión expirada
  - When: el token de acceso expira
  - Then: soy redirigido a la pantalla de login y mis datos no se pierden

### H2 — Gestión de tickets en el tablero Kanban

- ❌ Scenario: Marcar un ticket como bloqueado
  - Given: existe un ticket en cualquier columna activa
  - When: activo el flag Bloqueado
  - Then: el ticket muestra un badge rojo sin cambiar de columna

- ❌ Scenario: Archivar un ticket propio
  - Given: soy el creador de un ticket
  - When: elijo eliminarlo
  - Then: el ticket desaparece del tablero y el sistema lo conserva para métricas históricas

- ❌ Scenario: Intentar editar un ticket ajeno como member
  - Given: soy un member y existe un ticket creado por otra persona al que no estoy asignado
  - When: intento modificar ese ticket
  - Then: el sistema rechaza la acción con 403 y el ticket permanece sin cambios

### H3 — Edición segura ante cambios concurrentes

- ⚠️ Scenario: Cambio de estado concurrente (cubierto parcialmente: falta simulación simultánea)
  - Given: dos usuarios intentan cambiar el estado del mismo ticket al mismo tiempo
  - When: ambos envían el cambio simultáneamente
  - Then: solo uno se aplica y el otro recibe notificación de conflicto
  - *Cubierto por:* `it("Edge Case (H3 — Optimistic Locking) — returns 409 when version is stale")` — verifica el 409 pero simula el conflicto de forma secuencial, no con dos requests verdaderamente simultáneos.

### EC-1 — Notificación de email sobre comentario archivado

- ❌ Scenario: Notificación enviada cuando el comentario sigue activo
  - Given: ticket con asignado y cola de emails con retardo mínimo
  - When: alguien agrega un comentario y no ha sido archivado antes del despacho
  - Then: el asignado recibe el email con el contenido del comentario

- ❌ Scenario: Notificación cancelada porque el comentario fue archivado antes del envío
  - Given: comentario agregado y archivado antes de que se despache el email
  - When: el sistema procesa la cola de notificaciones
  - Then: no se envía ningún email y no se registra ningún error

- ❌ Scenario: Mención con @handle en comentario archivado antes del envío
  - Given: comentario con @handle archivado antes del despacho
  - When: el sistema procesa la cola
  - Then: el usuario mencionado no recibe ningún email

### EC-2 — Exportación de métricas CSV con datos inválidos o vacíos

- ❌ Scenario: Exportar con filtros que no producen resultados
  - Given: los filtros activos no corresponden a ningún ticket
  - Then: el botón Exportar CSV está deshabilitado con tooltip de sin datos

- ❌ Scenario: Exportar con rango de fechas donde desde es posterior a hasta
  - When: el usuario intenta exportar con rango inválido
  - Then: el servidor responde con HTTP 400 y no se descarga ningún archivo

- ❌ Scenario: Exportar con sesión expirada
  - When: el usuario hace clic en Exportar CSV con token expirado
  - Then: el servidor responde con HTTP 401 y el usuario es redirigido a login

- ❌ Scenario: Exportar un volumen grande de tickets sin error de memoria
  - When: el rango contiene miles de tickets
  - Then: el archivo se descarga progresivamente, el servidor hace streaming fila a fila y el resultado cumple RFC 4180

---

## Deuda técnica de testing (Top 3)

### 1. Autenticación corporativa — H1 completamente sin tests

- **Historia afectada:** H1
- **Escenario sin cubrir:** Los tres escenarios de H1 (login OAuth, cuenta no aprovisionada, sesión expirada)
- **Impacto de negocio:** Un sistema sin tests de autenticación puede sufrir regresiones que permitan acceso sin credenciales válidas, omitan la redirección al expirar el token, o no rechacen cuentas no aprovisionadas. En producción esto es una vulnerabilidad de seguridad crítica que podría exponer datos de todos los proyectos.
- **Esfuerzo estimado:** Medio (requiere mockear el proveedor OAuth externo o usar el endpoint dev-token como sustituto)

### 2. Autorización de roles — member editando ticket ajeno sin test

- **Historia afectada:** H2 (Scenario: Intentar editar un ticket ajeno como member)
- **Escenario sin cubrir:** `PATCH /tickets/:id/status` con rol `user` y sin ser assignee del ticket debe devolver 403
- **Impacto de negocio:** Sin este test, una regresión en `assertCanEdit` pasaría desapercibida. Cualquier miembro podría editar o mover tickets de compañeros en producción, violando la separación de permisos y corrompiendo el estado del tablero sin dejar trazas visibles.
- **Esfuerzo estimado:** Bajo (añadir un `it` con `X-Dev-Role: user` y mock de DB que devuelva vacío en `ticket_assignees`)

### 3. Exportación CSV — EC-2 completamente sin tests

- **Historia afectada:** EC-2
- **Escenario sin cubrir:** Los cuatro escenarios del edge case de exportación (resultado vacío, rango inválido, sesión expirada, streaming sin acumular en memoria)
- **Impacto de negocio:** El endpoint de exportación CSV es la principal superficie de extracción masiva de datos. Sin tests, los tres tipos de fallo distintos (validación de rango, 400, 401) pueden colapsarse en un único handler que silencia errores de autorización o genera archivos incompletos. Además, un bug de streaming que acumule en memoria puede provocar un OOM en producción ante volúmenes altos.
- **Esfuerzo estimado:** Alto (requiere implementar el endpoint de exportación con streaming y cubrir cuatro escenarios distintos con mocks apropiados)
