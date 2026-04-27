# PRD — Mini Jira (v0.1)

**Fecha:** 2026-04-20
**Autor:** PM Senior (basado en kick-off 24 de octubre)
**Participantes originales:** Laura (PO), Marcos (Tech Lead), Sofía (Dev Junior), Roberto (PM)
**Horizonte:** 3 semanas · equipo interno de 10 personas

---

## 1. Problema y Objetivo

El equipo carece de una herramienta de gestión de tareas propia. Jira resulta visualmente denso para el flujo de trabajo interno. Se necesita un sistema ligero, adoptable sin capacitación, que ofrezca visibilidad del trabajo al equipo y a dirección.

**Métrica de éxito:** 100 % del equipo registra y actualiza sus tickets en la herramienta durante las primeras 2 semanas post-lanzamiento, sin necesidad de soporte manual.

---

## 2. In-Scope (v1)

### 2.1 Autenticación y Roles

| Rol | Descripción |
|---|---|
| `admin` | Gestiona usuarios, archiva cualquier ticket, accede a métricas |
| `member` | Crea, edita y comenta en tickets; sólo archiva los propios |

- Login con cuentas corporativas vía **OAuth 2.0** (Google Workspace / proveedor existente).
- No hay registro público; los admins aprovisionan cuentas.

**Matriz de permisos por acción:**

| Acción | `member` (propio) | `member` (ajeno) | `admin` |
|---|---|---|---|
| Crear ticket | ✅ | — | ✅ |
| Ver ticket | ✅ | ✅ | ✅ |
| Editar ticket | ✅ | ❌ | ✅ |
| Cambiar estado | ✅ | ❌ | ✅ |
| Archivar ticket | ✅ | ❌ | ✅ |
| Ver tickets archivados | ❌ | ❌ | ✅ |
| Borrar comentario propio | ✅ | — | ✅ |
| Borrar comentario ajeno | ❌ | ❌ | ✅ |

### 2.2 Tickets

**Campos obligatorios:**

| Campo | Tipo | Notas |
|---|---|---|
| `title` | string (≤ 120 chars) | requerido |
| `description` | text (markdown) | opcional |
| `status` | enum | ver §2.3 |
| `priority` | enum: Low / Medium / High | requerido |
| `assignee` | FK → users | opcional, múltiple |
| `labels` | string[] | opcional, libre |
| `created_by` | FK → users | automático |
| `created_at` | timestamp | automático |
| `updated_at` | timestamp | automático |

> **"Eliminar" = Archivar.** El botón en UI dirá "Eliminar"; la acción subyacente marca `archived_at`. Los tickets archivados no aparecen en el tablero pero sí en el cómputo histórico de métricas.

### 2.3 Estados y Flujo

```
Por hacer → En progreso → Review → Listo
                ↕
            Bloqueado
```

- Cuatro columnas en tablero Kanban: **Por hacer · En progreso · Review · Listo**.
- `Bloqueado` es un flag lateral (badge rojo) que coexiste con cualquier estado; no ocupa columna propia para preservar la limpieza visual solicitada por Laura.
- Los estados son una **lista cerrada en v1** (no configurables por el usuario). Cambios futuros se gestionan mediante migración de datos.

### 2.4 Comentarios

- Texto plano en v1 (sin markdown en comentarios).
- Un comentario no se edita; sólo se archiva (soft delete).
- Notificación por email al usuario mencionado con `@handle` o al asignado cuando se añade un comentario.

### 2.5 Notificaciones por Email

Eventos que disparan notificación:

1. Se te asigna un ticket.
2. Alguien comenta en un ticket donde eres creador o asignado.
3. Te mencionan con `@handle` en un comentario.

- Si el comentario que originó la notificación es archivado antes del envío, la notificación **se cancela**.
- Proveedor: **Resend** (o SMTP corporativo como fallback). Plantilla HTML mínima.

### 2.6 Dashboard de Métricas

Acceso: todos los roles.

| Métrica | Descripción |
|---|---|
| Tickets cerrados por mes | Contador histórico, excluye archivados sin pasar por "Listo" |
| Tickets por estado | Snapshot actual |
| Tickets por miembro | Carga de trabajo activa |

- Calculadas en tiempo real sobre los datos vivos (v1). Sin tabla de hechos separada.

### 2.7 Exportación de Métricas a CSV

**Acceso:** todos los roles.

#### Alcance del export

El CSV refleja el mismo conjunto de datos visible en el dashboard, aplicando los mismos filtros activos en pantalla en el momento de la descarga.

**Campos exportados (columnas en orden):**

| Columna | Fuente | Notas |
|---|---|---|
| `ticket_id` | `tickets.id` | Identificador único |
| `title` | `tickets.title` | |
| `status` | `tickets.status` | Valor del enum en inglés |
| `priority` | `tickets.priority` | Low / Medium / High |
| `assignees` | `ticket_assignees` | Nombres separados por `;` si hay múltiples |
| `labels` | `ticket_labels` | Etiquetas separadas por `;` |
| `created_by` | `users.name` | Nombre completo del creador |
| `created_at` | `tickets.created_at` | ISO 8601, UTC |
| `closed_at` | `tickets.updated_at` cuando status → Listo | ISO 8601, UTC; vacío si no cerrado |
| `archived` | `tickets.archived_at IS NOT NULL` | `true` / `false` |

#### Filtros aplicables antes de exportar

- **Rango de fechas** (`created_at`): selector de mes/año o rango libre (por defecto: mes en curso).
- **Estado**: uno o varios (por defecto: todos).
- **Miembro asignado**: uno o todos.

Los mismos filtros del dashboard alimentan el endpoint; no hay pantalla separada de configuración de export.

#### Comportamiento de UI

1. Botón **"Exportar CSV"** en la esquina superior derecha del dashboard.
2. Al hacer clic, se dispara la descarga directamente desde el navegador sin modal de confirmación.
3. Nombre de archivo generado: `minijira-metrics-YYYY-MM.csv` (usando el mes inicial del rango seleccionado).
4. Si el resultado filtrado está vacío, el botón se deshabilita con tooltip _"No hay datos para el rango seleccionado"_.

#### Diseño del endpoint

```
GET /api/metrics/export
```

| Parámetro query | Tipo | Requerido | Default |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | No | Primer día del mes en curso |
| `to` | `YYYY-MM-DD` | No | Hoy |
| `status` | `string[]` | No | Todos |
| `assignee_id` | `uuid` | No | Todos |

**Respuesta exitosa:**
```
HTTP 200
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="minijira-metrics-YYYY-MM.csv"
```

- El servidor hace stream del CSV (no lo acumula en memoria) usando `res.write()` fila a fila, para soportar exports grandes sin presión en heap.
- Los campos que contengan comas o saltos de línea se envuelven en comillas dobles (RFC 4180).
- Primera fila siempre es la cabecera.

**Errores:**

| Código | Situación |
|---|---|
| `400` | Rango de fechas inválido (`from` > `to`) |
| `401` | Token ausente o expirado |
| `500` | Error de base de datos (con mensaje genérico al cliente) |

#### Consideraciones de seguridad

- El endpoint respeta la misma lógica de visibilidad que el dashboard: un `member` no recibe en el CSV tickets que no puede ver en pantalla.
- No se exponen campos internos (`version`, `archived_at` raw, IDs de FK) en el output.

### 2.7 Filtros en Tablero

Filtros combinables:

- Estado · Prioridad · Asignado · Etiqueta · Fecha de creación (rango)

---

## 3. Out-of-Scope (v1)

| Funcionalidad | Motivo de exclusión |
|---|---|
| Modo oscuro | No crítico para adopción; añade costo de QA en todos los componentes |
| Adjuntos / archivos en tickets | Requiere almacenamiento externo (S3 / Drive); fuera del plazo |
| Log de auditoría (quién cambió qué estado) | Deseable pero no urgente; se añade en v1.1 |
| Estados configurables por el usuario | Complejidad de migración; la lista cerrada cubre el flujo actual |
| Sub-tareas / tickets enlazados | Scope creep; no mencionado en kick-off |
| Notificaciones in-app (push / websocket) | Email es suficiente para v1 |
| API pública / webhooks | Uso interno únicamente |
| Registro propio de usuarios | OAuth cubre el caso de uso; reduce superficie de seguridad |

---

## 4. Gestión de Concurrencia

> Esta sección documenta decisiones explícitas sobre los escenarios que el equipo dejó abiertos en el kick-off.

**Estrategia: Optimistic Locking**

1. Cada ticket tiene un campo `version` (integer, incrementa en cada `UPDATE`).
2. Al guardar, el cliente envía el `version` que tenía al abrir el formulario.
3. Si el `version` en base de datos no coincide, el servidor devuelve `409 Conflict`.
4. El frontend muestra un aviso: _"Alguien modificó este ticket mientras lo editabas. Recarga para ver los cambios."_ — los cambios locales no se pierden (se muestran en el formulario para que el usuario decida).

**Cambios de estado concurrentes:** aplica el mismo mecanismo de `version`. El último en intentar el cambio recibe el `409`.

**Comentarios:** no están sujetos a locking (son append-only); dos comentarios simultáneos se persisten en orden de llegada al servidor.

---

## 5. Stack Tecnológico

### Frontend
| Capa | Tecnología | Justificación |
|---|---|---|
| Framework | **React 18** | Confirmado por Marcos en reunión |
| UI Components | **shadcn/ui** (Tailwind CSS) | Estética limpia tipo Apple sin sistema de diseño propio |
| Estado global | **Zustand** | Ligero; suficiente para v1 |
| Routing | **React Router v6** | Estándar para SPAs en React |

### Backend
| Capa | Tecnología | Justificación |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Confirmado por Marcos en reunión |
| Framework | **Express 5** | Mínimo, sin magia; equipo lo conoce |
| ORM | **Prisma** | Schema-first; facilita migraciones cuando los estados cambien |
| Autenticación | **OAuth 2.0** + **JWT** (access + refresh tokens) | Sin gestión de contraseñas propias |

### Base de Datos
| Capa | Tecnología | Justificación |
|---|---|---|
| Principal | **PostgreSQL 16** | Relacional; integridad referencial para estados, roles y FK entre entidades |
| Caché / sesiones | **Redis** | Rate limiting en emails; invalidación de JWT en logout |

### Infraestructura y Servicios
| Servicio | Tecnología |
|---|---|
| Email | **Resend** (o SMTP corporativo) |
| Despliegue | **Railway** o **Render** (PaaS, cero ops en v1) |
| Variables de entorno | `.env` + secrets del PaaS |
| CI | **GitHub Actions** (lint + test en PR) |

### Decisión sobre ORM (respuesta a la pregunta de Sofía)
Se usará **Prisma** con migraciones versionadas. Si los estados cambian después de iniciar el desarrollo, se genera una nueva migración que actualiza los registros existentes con un valor por defecto explícito. No se usan consultas directas salvo para queries de dashboard donde el ORM genere SQL ineficiente.

---

## 6. Riesgos y Dependencias

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Plazo de 3 semanas inviable con scope actual | Alta | Alto | Negociar con dirección: entregar tablero + tickets en semana 3; emails y dashboard en semana 5 |
| Scope creep continuo (modo oscuro, adjuntos) | Alta | Medio | Este PRD como documento de control; cambios requieren aprobación escrita de Roberto |
| Ambigüedad de permisos genera regresiones | Media | Alto | Matriz de permisos (§2.1) es contrato; cualquier desviación es un bug, no una feature |
| Conflictos de concurrencia no manejados en producción | Media | Medio | Optimistic locking implementado desde el día 1, no como parche posterior |

---

## 7. Acuerdos Pendientes (requieren confirmación de Laura y Roberto)

- [ ] Confirmar proveedor OAuth corporativo (Google Workspace u otro).
- [ ] Validar que 4 columnas + badge "Bloqueado" satisface la restricción visual de Laura.
- [ ] Aprobar la división de entrega en dos fases (tablero semana 3 / emails + métricas semana 5).
- [ ] Confirmar que los tickets archivados sí cuentan en métricas históricas (o se excluyen totalmente).
- [ ] Definir dirección de correo remitente para notificaciones (`noreply@...`).
