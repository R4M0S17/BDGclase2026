# ADR-001 — Uso de PostgreSQL en lugar de MongoDB como base de datos principal

**Estado:** Aceptada  
**Fecha:** 2026-04-20  
**Autores:** Marcos (Tech Lead), Roberto (PM)  
**Revisores:** Laura (PO), Sofía (Dev Junior)  

---

## Contexto

Mini Jira v0.1 es un sistema interno de gestión de tareas para un equipo de 10 personas con un horizonte de entrega de 3 semanas. El modelo de datos incluye entidades fuertemente relacionadas entre sí:

- `users` ↔ `tickets` (creador, asignados múltiples)
- `tickets` ↔ `comments` (relación 1:N)
- `tickets` ↔ `labels` y `ticket_assignees` (relaciones M:N)
- `tickets.status` como enum cerrado con flujo de estados definido
- `tickets.version` como campo de control para Optimistic Locking

El sistema requiere además:

- **Integridad referencial** entre todas las entidades (FK con constraints)
- **Control de concurrencia** mediante Optimistic Locking (`UPDATE … WHERE version = N`)
- **Queries analíticas** para el dashboard de métricas (tickets por estado, por miembro, por mes)
- **Exportación CSV** con joins entre `tickets`, `users`, `ticket_assignees` y `ticket_labels`
- **ORM con migraciones versionadas** (Prisma) para evolucionar el schema de forma controlada

La pregunta que se abrió en el kick-off fue si usar una base de datos relacional (PostgreSQL) o documental (MongoDB), dado que MongoDB es familiar para parte del equipo.

---

## Opciones evaluadas

### Opción A — PostgreSQL 16 ✅ (elegida)

Motor relacional open-source, maduro y con soporte nativo en Prisma.

**A favor:**
- Integridad referencial garantizada por el motor (FK, constraints, transacciones ACID).
- `UPDATE … WHERE id = :id AND version = N` para Optimistic Locking es atómico por diseño; no requiere lógica adicional en la aplicación.
- Soporte nativo de enums (`CREATE TYPE status AS ENUM`) alineado con la lista cerrada de estados definida en el PRD.
- Joins eficientes para las queries de métricas y el endpoint de exportación CSV.
- Prisma genera migraciones SQL versionadas; si los estados cambian en v1.1, la migración actualiza registros existentes con un valor por defecto explícito (decisión documentada en `specs.md §5`).
- Ecosistema maduro en Railway/Render (PaaS elegido), con backups automáticos incluidos.

**En contra:**
- Schema rígido: añadir campos requiere una migración explícita.
- Escalado horizontal más complejo (no relevante para v1 con 10 usuarios).

---

### Opción B — MongoDB (Atlas o self-hosted)

Motor documental orientado a documentos JSON flexibles.

**A favor:**
- Schema flexible: añadir campos sin migración.
- Familiar para parte del equipo frontend.
- Buen rendimiento en lecturas de documentos completos sin joins.

**En contra:**
- Integridad referencial no es nativa; debe implementarse en la capa de aplicación, introduciendo superficie de bugs.
- Optimistic Locking requiere lógica manual (findOneAndUpdate con condición sobre `version`) con semántica menos clara que una transacción SQL.
- Las queries de métricas (tickets por mes, por miembro, por estado) requieren agregaciones `$lookup` y `$group` que generan pipelines complejos vs. SQL declarativo.
- Prisma tiene soporte para MongoDB pero en estado Preview; las migraciones no están disponibles — el control de schema recae completamente en el equipo.
- El modelo de datos de Mini Jira es intrínsecamente relacional (FK entre 6+ entidades); forzarlo en documentos introduce desnormalización que debe mantenerse manualmente.

---

### Opción C — SQLite (solo para desarrollo/prototipo)

Descartada para producción. Sin soporte de concurrencia real ni despliegue en PaaS compartido. Válida únicamente para entornos locales de desarrollo.

---

## Decisión

**Se elige PostgreSQL 16** como base de datos principal.

El modelo de datos de Mini Jira es relacional por naturaleza: múltiples entidades con FK, permisos que cruzan tablas, y queries analíticas con agregaciones. PostgreSQL ofrece las garantías de integridad y los primitivos de concurrencia (transacciones ACID, UPDATE atómico) que el diseño requiere sin trasladar esa responsabilidad a la capa de aplicación.

MongoDB aportaría flexibilidad de schema que este proyecto no necesita — los estados son una lista cerrada en v1 y los cambios futuros se gestionan mediante migración, no mediante schema-less.

---

## Consecuencias

### Positivas

- El Optimistic Locking (`AND version = N`) es atómico a nivel de motor; se elimina una clase entera de race conditions.
- Las queries del dashboard y el endpoint CSV son SQL declarativo, legible y optimizable con índices estándar.
- Prisma Migrate genera un historial de migraciones versionado en el repositorio; cualquier cambio de schema es revisable en PR.
- Railway y Render ofrecen PostgreSQL gestionado con backups diarios sin configuración adicional.

### Negativas / Trade-offs

- Cada cambio de schema (nuevo campo, nuevo estado) requiere una migración explícita y un despliegue coordinado.
- El equipo debe mantener disciplina con las migraciones en ramas de feature para evitar conflictos.

### Neutrales

- Si en v2 se necesita almacenar contenido semi-estructurado (adjuntos, metadatos de integración), PostgreSQL soporta columnas `jsonb` sin necesidad de migrar a otro motor.
- SQLite puede usarse en entornos locales de CI sin levantar un servidor, siempre que las queries no usen features específicos de PostgreSQL.

---

## Referencias

- `specs.md §4` — Gestión de concurrencia con Optimistic Locking
- `specs.md §5` — Stack tecnológico y decisión sobre Prisma
- `specs.md §2.6` — Dashboard de métricas (queries analíticas)
- `specs.md §2.7` — Exportación CSV con joins multi-tabla
- `backlog.md H3` — Historia: Edición segura ante cambios concurrentes
