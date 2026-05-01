# PRD — Mini Jira (Herramienta Interna de Gestión de Tickets)

**Versión:** 1.0  
**Fecha:** 21 de Abril 2026  
**Product Owner:** Laura  
**Tech Lead:** Marcos  
**PM:** Roberto  
**Audiencia objetivo:** Equipo interno (~10 personas)

---

## 1. Objetivo del Producto

Construir una herramienta web interna de gestión de tickets ligera, intuitiva y visualmente moderna que permita al equipo crear, asignar y dar seguimiento a tareas dentro de proyectos, sin la complejidad de herramientas como Jira.

### Criterios de éxito

- Cualquier miembro del equipo puede crear y seguir un ticket sin necesidad de capacitación.
- Los administradores de proyecto tienen control total sobre los tickets de su proyecto.
- El sistema nunca pierde datos por ediciones concurrentes.
- El dashboard refleja métricas reales de cierre de tickets por mes.

---

## 2. In-Scope (MVP — 3 semanas)

### 2.1 Autenticación y Roles

- Login con usuario y contraseña (sesión con JWT).
- Dos roles por proyecto:
  - **Usuario:** puede crear tickets, editar y comentar únicamente en los tickets que tiene asignados, y cambiar el estado de sus tickets asignados.
  - **Admin de proyecto:** puede crear, editar, archivar y gestionar todos los tickets del proyecto, asignar tickets a cualquier usuario, y administrar el catálogo de etiquetas.
- Un mismo usuario puede ser Admin en un proyecto y Usuario en otro.
- No existe superadmin global en esta versión.

### 2.2 Proyectos

- Crear, editar y archivar proyectos (soft delete — nunca eliminación física).
- Cada proyecto tiene un nombre, descripción opcional y al menos un Admin asignado.
- Los proyectos archivados son visibles con filtro explícito "Archivados".

### 2.3 Tickets

**Campos del ticket:**

| Campo | Obligatorio | Tipo / Valores |
|---|---|---|
| Título | Sí | Texto libre, máx. 255 caracteres |
| Descripción | No | Texto plano |
| Estado | Sí | Por hacer / En progreso / Listo |
| Prioridad | Sí | Alta / Media / Baja |
| Asignados | No | Uno o más usuarios del proyecto |
| Etiquetas | No | Selección múltiple del catálogo del sistema |
| Proyecto | Sí | FK al proyecto padre |
| Creado por | Auto | Usuario autenticado al momento de crear |
| Fecha de creación | Auto | Timestamp UTC |
| Última modificación | Auto | Timestamp UTC + actor |

**Reglas de negocio:**

- Las transiciones de estado son libres (cualquier estado puede ir a cualquier otro).
- El botón en UI se llama "Eliminar" pero la acción es un **soft delete** (archivado). Los tickets archivados nunca se eliminan físicamente de la base de datos.
- Solo el Admin del proyecto puede archivar tickets.
- Solo el Admin del proyecto puede asignar, reasignar o quitar asignados de un ticket.
- Un ticket puede tener múltiples asignados. Las notificaciones por email se envían a todos los asignados cuando aplique.
- Cualquier usuario autenticado puede crear un ticket dentro de un proyecto.

**Auditoría (requerida para métricas):**

- Cada cambio de estado genera un registro de auditoría: `{ticket_id, campo, valor_anterior, valor_nuevo, usuario, timestamp}`.
- El log de auditoría es inmutable (no se edita ni se elimina).

### 2.4 Comentarios

- Los comentarios se pueden agregar a cualquier ticket por cualquiera de los usuarios asignados o el Admin del proyecto.
- Un usuario solo puede editar o eliminar sus propios comentarios.
- El Admin puede eliminar cualquier comentario dentro de su proyecto.
- Los comentarios **no requieren bloqueo** del ticket — se pueden agregar aunque el ticket esté en edición por otro usuario.

### 2.5 Concurrencia — Pessimistic Locking

- Al abrir un ticket en modo edición, el sistema lo bloquea y muestra un banner: **"En edición por [Nombre] — hace X minutos"**.
- Un segundo usuario que intente editar el mismo ticket ve el bloqueo y no puede editar hasta que se libere.
- El bloqueo se libera cuando:
  1. El editor guarda los cambios.
  2. El editor cancela o cierra el modal/vista de edición.
  3. **Timeout automático de 15 minutos** de inactividad.
- El bloqueo aplica al ticket completo (no por campo individual).
- El cambio de estado requiere el bloqueo del ticket.
- Los comentarios no activan ni respetan el bloqueo.

### 2.6 Filtros y Búsqueda

- Filtrar tickets por: estado, prioridad, etiqueta, asignado, fecha de creación.
- Los filtros son combinables (AND).
- Búsqueda por texto en título.

### 2.7 Dashboard de Métricas

- Vista de resumen por proyecto con:
  - Tickets cerrados por mes (gráfica de barras).
  - Distribución de tickets por estado actual (gráfica de dona o barras).
  - Distribución por prioridad.
- Los datos se calculan a partir del log de auditoría.
- Accesible para todos los usuarios autenticados.

### 2.8 Notificaciones por Email

- Envío de email al usuario en los siguientes eventos:
  - Le asignan un ticket.
  - Le mencionan en un comentario (`@usuario`).
- Plantillas de email simples en texto plano + HTML básico.
- Servicio de envío: **[a definir por Marcos — recomendado: Resend o Nodemailer con SMTP corporativo]**.

### 2.9 Diseño y UX

- Estética moderna, minimalista, paleta blanca con sombras suaves (referencia: diseño Apple/Vercel).
- Librería de componentes UI: **[a definir por Marcos — recomendado: shadcn/ui o Radix UI]**.
- Responsive (desktop prioritario, mobile funcional).
- Modo oscuro: **fuera de scope MVP**, evaluable en v1.1.

---

## 3. Out-of-Scope (no entra en MVP)

| Funcionalidad | Motivo |
|---|---|
| Modo oscuro | Scope creep de último minuto, no crítico para operación |
| Notificaciones en tiempo real (WebSockets) | Complejidad de infraestructura no justificada en MVP |
| Adjuntos / archivos en tickets | No mencionado como requerimiento |
| Sub-tareas o tickets anidados | No mencionado, añade complejidad al modelo |
| Integraciones externas (Slack, GitHub, etc.) | Fuera de alcance para herramienta interna |
| Superadmin global | No hay caso de uso definido para equipo de 10 personas |
| Interfaz de asignación masiva (bulk assign) | No requerido en MVP; la asignación es ticket por ticket |
| Flujo de estados configurable (por proyecto) | Las tres columnas fijas son suficientes para MVP |
| Eliminación física de datos | Se usa soft delete en toda la aplicación |
| API pública / webhooks | No hay consumidores externos identificados |
| Exportación de datos (CSV, PDF) | No mencionado como requerimiento |

---

## 4. Stack Tecnológico

### Frontend
- **Framework:** React 18+ con TypeScript
- **Bundler:** Vite
- **UI Components:** shadcn/ui (basado en Radix UI + Tailwind CSS)
- **State management:** Zustand o React Query para estado del servidor
- **Routing:** React Router v6

### Backend
- **Runtime:** Node.js con TypeScript
- **Framework:** Express o Fastify
- **ORM:** Prisma (facilita cambios de esquema si los estados evolucionan post-MVP)
- **Autenticación:** JWT con refresh tokens; bcrypt para hashing de contraseñas

### Base de Datos
- **Motor:** PostgreSQL (relacional — necesario para integridad de estados, FK y auditoría)
- **Hosting local/dev:** Docker Compose

### Email
- **Servicio:** Resend (o Nodemailer con SMTP corporativo como fallback)

### Infraestructura
- **Contenerización:** Docker + Docker Compose para desarrollo local
- **Despliegue MVP:** A definir (recomendado: Railway o Render para velocidad de entrega en 3 semanas)

### Herramientas de desarrollo
- **Linter / Formatter:** ESLint + Prettier
- **Testing:** Vitest (unit) + Playwright o Cypress (e2e básico)

---

## 5. Modelo de Datos (Esquema de Alto Nivel)

```
User          { id, name, email, password_hash, created_at }
Project       { id, name, description, archived_at, created_by }
ProjectMember { id, user_id, project_id, role: ADMIN|USER }
Tag           { id, name, color }                              -- catálogo global
Ticket        { id, title, description, status, priority,
                project_id, created_by,
                archived_at, created_at, updated_at }
TicketAssignee { ticket_id, user_id }                          -- relación N:M
TicketTag     { ticket_id, tag_id }
Comment       { id, ticket_id, user_id, body, created_at, deleted_at }
AuditLog      { id, ticket_id, field, old_value, new_value, actor_id, timestamp }
TicketLock    { ticket_id, locked_by, locked_at, expires_at }
```

---

## 6. Riesgos y Dependencias

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El plazo de 3 semanas es insuficiente si se incluyen emails + dashboard | Alta | Alto | Priorizar core de tickets en semana 1; emails y dashboard en semana 2-3 |
| Cambio de estados post-inicio de desarrollo rompe migraciones | Media | Alto | Usar Prisma Migrate desde el día 1; no hard-codear estados |
| Timeout de lock de 15 min demasiado corto para descripciones largas | Baja | Medio | Configurar timeout como variable de entorno para ajuste sin redeploy |
| Falta de definición de SMTP corporativo bloquea feature de email | Media | Medio | Arrancar con Resend en sandbox; no bloquear el resto del desarrollo |

---

## 7. Hitos Sugeridos

| Semana | Entregable |
|---|---|
| Semana 1 | Auth (login/roles), CRUD de proyectos, CRUD de tickets con estados y prioridades, modelo de BD completo con migraciones |
| Semana 2 | Filtros, pessimistic locking, comentarios, log de auditoría, asignación de tickets |
| Semana 3 | Dashboard de métricas, notificaciones por email, QA, despliegue en staging |

---

## 8. Decisiones Pendientes (requieren respuesta antes del lunes)

- [ ] **SMTP:** ¿Se usa servidor de correo corporativo o servicio externo (Resend)?
- [ ] **Despliegue:** ¿Dónde se hospeda? ¿Hay servidor interno o se usa cloud?
- [ ] **Catálogo de etiquetas inicial:** ¿Quién define las etiquetas de arranque y cuáles son?
- [ ] **Librería UI:** ¿Validar con Laura que shadcn/ui cumple la estética "Apple" esperada?
