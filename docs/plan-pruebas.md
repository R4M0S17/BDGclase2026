# Plan de Pruebas — Mini Jira MVP (v0.1)

**Fecha:** 2026-04-20  
**Rol:** QA Lead Senior  
**Basado en:** `backlog.md` — 3 Historias de Usuario + 2 Edge Cases  
**Cobertura objetivo:** 100 % de criterios de aceptación Gherkin validados antes del release

---

## 1. Alcance y objetivos

**En scope:**
- Todos los escenarios Gherkin definidos en `backlog.md` (H1, H2, H3, EC-1, EC-2)
- Flujos de permisos por rol (`admin` / `member`)
- Integraciones con OAuth, Resend y PostgreSQL

**Fuera de scope:**
- Funcionalidades marcadas como Out-of-Scope en el PRD (modo oscuro, adjuntos, sub-tareas)
- Pruebas de carga (diferidas a v1.1)

**Objetivo de calidad:** ningún escenario Gherkin sin test automatizado antes de merge a `main`.

---

## 2. Niveles de prueba y herramientas

| Nivel | Qué cubre | Herramienta |
|---|---|---|
| Unitario | Lógica de negocio aislada (validaciones, permisos, version bump) | **Vitest** |
| Integración | Endpoints Express + Prisma contra PostgreSQL real | **Supertest** + DB de test |
| E2E | Flujos completos desde el navegador | **Playwright** |
| Contrato | Formato del CSV (RFC 4180), headers HTTP | **Supertest** |

> No se usan mocks de base de datos. Las pruebas de integración corren contra una instancia PostgreSQL dedicada al entorno de test, levantada en CI vía Docker Compose.

---

## 3. Casos de prueba por historia

---

### H1 — Autenticación corporativa vía OAuth 2.0

**Riesgo:** Alto — bloqueante para todo lo demás  
**Tipo predominante:** E2E + Integración

| ID | Escenario Gherkin | Tipo | Criterio de paso |
|---|---|---|---|
| H1-01 | Acceso exitoso con cuenta activa | E2E | Redirige al tablero; JWT presente en cookie; rol correcto en payload |
| H1-02 | Cuenta no aprovisionada | E2E | Muestra mensaje de acceso denegado; no emite JWT |
| H1-03 | Sesión expirada | Integración | `401` al llamar cualquier endpoint protegido con token vencido; redirect a login en frontend |

**Notas de implementación:**
- H1-01 requiere un proveedor OAuth stubbeado en test (ej. `mock-oauth2-server`) para no depender de Google Workspace en CI.
- H1-03 se verifica manipulando el `exp` del JWT en el entorno de test, no durmiendo el proceso.

---

### H2 — Ciclo de vida de un ticket en el tablero Kanban

**Riesgo:** Alto — core del producto  
**Tipo predominante:** E2E + Integración + Unitario

| ID | Escenario Gherkin | Tipo | Criterio de paso |
|---|---|---|---|
| H2-01 | Creación de ticket válido | Integración | `POST /api/tickets` → `201`; ticket en columna "Por hacer"; visible en `GET /api/tickets` |
| H2-02 | Avance de estado | Integración | `PATCH /api/tickets/:id` → `200`; `status` actualizado; `updated_at` cambia |
| H2-03 | Flag Bloqueado | Integración | `PATCH` con `blocked: true` → ticket conserva columna original; badge presente en respuesta |
| H2-04 | Archivar ticket propio | Integración | `DELETE /api/tickets/:id` → `200`; `archived_at` no es null; ticket ausente en `GET` del tablero |
| H2-05 | Ticket archivado visible en métricas | Unitario | Query de métricas incluye tickets con `archived_at IS NOT NULL` |
| H2-06 | Member edita ticket ajeno | Integración | `PATCH` con token de `member` sobre ticket ajeno → `403` |
| H2-07 | Título excede 120 caracteres | Unitario + Integración | Validación rechaza con `400`; mensaje describe el límite |
| H2-08 | Título vacío o nulo | Unitario + Integración | `POST` sin `title` → `400`; no se persiste nada |

**Notas de implementación:**
- H2-06 debe probarse con dos usuarios distintos; no simular el rol en el token.
- H2-07 y H2-08 son los casos nulos/límite más probables de producir bugs silenciosos si solo se valida en frontend.

---

### H3 — Control de concurrencia con Optimistic Locking

**Riesgo:** Alto — definido en PRD como "desde el día 1"  
**Tipo predominante:** Integración (concurrencia real, no simulada)

| ID | Escenario Gherkin | Tipo | Criterio de paso |
|---|---|---|---|
| H3-01 | Primer usuario guarda sin conflicto | Integración | `PATCH` con `version` correcto → `200`; `version` en DB incrementa en 1 |
| H3-02 | Segundo usuario guarda con versión desactualizada | Integración | `PATCH` con `version` stale → `409 Conflict`; body contiene mensaje de conflicto; DB no cambia |
| H3-03 | Cambio de estado concurrente | Integración | Dos requests simultáneos con mismo `version`; exactamente uno retorna `200`, el otro `409` |
| H3-04 | Cambios locales preservados tras 409 | E2E | Tras recibir `409`, el formulario sigue mostrando los cambios no guardados del usuario |

**Notas de implementación:**
- H3-03 se implementa con dos requests disparados en paralelo (`Promise.all`) dentro del mismo test; no se puede garantizar orden, por lo que se verifica que la suma de `200` + `409` sea exactamente 1 + 1.
- H3-04 es el único caso que requiere E2E porque valida estado de UI, no de API.

---

### EC-1 — Cancelación de notificación por comentario archivado

**Riesgo:** Medio — fallo silencioso que llega al usuario final como email roto  
**Tipo predominante:** Integración (worker de emails)

| ID | Escenario Gherkin | Tipo | Criterio de paso |
|---|---|---|---|
| EC1-01 | Notificación enviada con comentario activo | Integración | Worker llama al proveedor de email exactamente 1 vez; payload contiene el comentario |
| EC1-02 | Notificación cancelada — comentario archivado antes del despacho | Integración | Worker NO llama al proveedor; no se genera error ni log de fallo |
| EC1-03 | Mención `@handle` en comentario archivado | Integración | Usuario mencionado no recibe llamada al proveedor |

**Notas de implementación:**
- El proveedor Resend se sustituye por un spy/stub en tests. Se verifica el número de llamadas, no la entrega real.
- EC1-02 requiere controlar el timing: archivar el comentario **después** de encolar la notificación pero **antes** de que el worker la procese. Se logra pausando el worker en test con una flag de entorno.
- Estos tests son los más frágiles por el timing; deben correr en un worker dedicado, no en el mismo proceso del servidor.

---

### EC-2 — Exportación de métricas CSV con datos inválidos o vacíos

**Riesgo:** Medio — tres comportamientos distintos bajo la misma superficie; fácil de implementar parcialmente  
**Tipo predominante:** Integración + Contrato

| ID | Escenario Gherkin | Tipo | Criterio de paso |
|---|---|---|---|
| EC2-01 | Filtros sin resultados — botón deshabilitado | E2E | Botón con `disabled`; tooltip visible; cero requests a `/api/metrics/export` |
| EC2-02 | Rango inválido `from > to` | Integración | `GET /api/metrics/export?from=2026-04-20&to=2026-04-01` → `400`; body describe el error |
| EC2-03 | Token ausente o expirado | Integración | `GET /api/metrics/export` sin JWT válido → `401` |
| EC2-04 | Respuesta en streaming (volumen grande) | Contrato | Headers contienen `Content-Type: text/csv`; `Content-Disposition` correcto; primera línea es cabecera; campos con comas envueltos en comillas dobles (RFC 4180) |
| EC2-05 | Nombre de archivo generado | Contrato | `Content-Disposition` contiene `minijira-metrics-YYYY-MM.csv` usando el mes inicial del rango |

**Notas de implementación:**
- EC2-04 no verifica ausencia de buffering en memoria (no es observable desde fuera); verifica que la respuesta inicie antes de que todos los registros estén procesados usando un stream interceptor en Supertest.
- EC2-05 se prueba con tres rangos distintos (mes actual, mes pasado, rango entre dos meses) para validar que siempre toma el mes inicial.

---

## 4. Matriz de riesgo y prioridad de ejecución

| Prioridad | IDs | Criterio |
|---|---|---|
| P0 — Bloqueante | H1-01, H1-02, H2-01, H2-06, H3-02, H3-03 | Sin estos, el producto no es seguro ni funcional |
| P1 — Alta | H2-02, H2-03, H2-04, H3-01, H3-04, EC1-02 | Flujo core; fallo visible en demo |
| P2 — Media | H1-03, H2-05, H2-07, H2-08, EC1-01, EC1-03, EC2-02, EC2-03 | Casos límite; fallo detectable en uso real |
| P3 — Baja | EC2-01, EC2-04, EC2-05 | UX y contrato; fallo tolerable en semana 1 post-lanzamiento |

---

## 5. Criterios de entrada y salida

**Criterios de entrada (antes de iniciar ejecución):**
- [ ] Entorno de test con PostgreSQL y Redis levantados
- [ ] Proveedor OAuth stubbeado disponible en CI
- [ ] Spy de Resend configurado en entorno de test
- [ ] Migraciones de Prisma aplicadas en DB de test

**Criterios de salida (condición para release):**
- [ ] 100 % de casos P0 y P1 en verde
- [ ] 0 fallos de seguridad en permisos (H2-06, cualquier variante de `403`)
- [ ] Cobertura de líneas ≥ 80 % en módulos de tickets, auth y export
- [ ] Ningún test depende de orden de ejecución (tests aislados e idempotentes)

---

## 6. Deuda técnica de pruebas identificada

| Ítem | Impacto | Momento sugerido |
|---|---|---|
| Tests de carga en export CSV | Presión en heap con miles de tickets | v1.1 |
| Pruebas de rate limiting en emails (Redis) | Sin cobertura en v1 | v1.1 |
| Log de auditoría (quién cambió qué estado) | Out-of-scope en PRD, pero genera casos de regresión cuando se añada | Al implementar en v1.1 |
