# Backlog — Mini Jira MVP (v0.1)

**Fecha:** 2026-04-20  
**Rol:** Product Owner  
**Formato:** BDD Gherkin declarativo  
**Estado:** Validado

---

## Índice

| # | Ítem | Tipo | Estado |
|---|---|---|---|
| 1 | Acceso al sistema con cuenta corporativa | Historia de Usuario | Validada |
| 2 | Gestión de tickets en el tablero Kanban | Historia de Usuario | Validada |
| 3 | Edición segura ante cambios concurrentes | Historia de Usuario | Validada |
| EC-1 | Notificación sobre comentario archivado antes del envío | Edge Case | Validado |
| EC-2 | Exportación CSV con datos inválidos o vacíos | Edge Case | Validado |

---

## Historia 1 — Acceso al sistema con cuenta corporativa

**Como** miembro del equipo  
**Quiero** ingresar a Mini Jira con mi cuenta corporativa  
**Para** acceder al tablero sin gestionar una contraseña adicional

```gherkin
Feature: Autenticación corporativa vía OAuth 2.0

  Background:
    Given que el proveedor OAuth corporativo está configurado
    And que mi cuenta ha sido aprovisionada por un admin

  Scenario: Acceso exitoso con cuenta activa
    When inicio sesión con mi cuenta corporativa válida
    Then tengo acceso al tablero con el rol que me asignaron
    And mi sesión permanece activa hasta que yo cierre sesión o el token expire

  Scenario: Intento de acceso con cuenta no aprovisionada
    When intento iniciar sesión con una cuenta corporativa válida pero no aprovisionada
    Then se me muestra un mensaje indicando que no tengo acceso
    And no se me permite entrar al sistema

  Scenario: Sesión expirada
    When mi token de acceso expira
    Then soy redirigido a la pantalla de login
    And mis datos no se pierden al volver a autenticarme
```

---

## Historia 2 — Gestión de tickets en el tablero Kanban

**Como** miembro del equipo  
**Quiero** crear y mover tickets en el tablero  
**Para** que el equipo tenga visibilidad del estado real del trabajo

```gherkin
Feature: Ciclo de vida de un ticket en el tablero

  Background:
    Given que estoy autenticado en el sistema
    And que estoy viendo el tablero Kanban

  Scenario: Creación de un ticket válido
    When creo un ticket con título y prioridad
    Then el ticket aparece en la columna "Por hacer"
    And es visible para todos los miembros del equipo

  Scenario: Avance normal de un ticket por el flujo
    Given que existe un ticket en la columna "Por hacer"
    When cambio su estado a "En progreso"
    Then el ticket se mueve a la columna "En progreso"
    And el campo updated_at refleja el momento del cambio

  Scenario: Marcar un ticket como bloqueado
    Given que existe un ticket en cualquier columna activa
    When activo el flag "Bloqueado"
    Then el ticket muestra un badge rojo sin cambiar de columna
    And el ticket sigue siendo visible en su estado actual

  Scenario: Archivar un ticket propio
    Given que soy el creador de un ticket
    When elijo eliminarlo
    Then el ticket desaparece del tablero
    And el sistema lo conserva para el cómputo histórico de métricas

  Scenario: Intentar editar un ticket ajeno como member
    Given que soy un member
    And existe un ticket creado por otra persona
    When intento modificar ese ticket
    Then el sistema rechaza la acción
    And el ticket permanece sin cambios
```

---

## Historia 3 — Edición segura ante cambios concurrentes

**Como** miembro del equipo  
**Quiero** que el sistema detecte cuando alguien editó un ticket antes que yo  
**Para** no sobreescribir cambios sin saberlo

```gherkin
Feature: Control de concurrencia con Optimistic Locking

  Background:
    Given que dos usuarios tienen el mismo ticket abierto al mismo tiempo

  Scenario: El primer usuario guarda sin conflicto
    When el primer usuario guarda sus cambios
    Then el ticket se actualiza correctamente
    And la versión del ticket se incrementa

  Scenario: El segundo usuario intenta guardar sobre una versión desactualizada
    Given que el primer usuario ya guardó cambios en el ticket
    When el segundo usuario intenta guardar sus propios cambios
    Then el sistema rechaza la operación
    And se informa al segundo usuario que el ticket fue modificado mientras lo editaba
    And los cambios locales del segundo usuario permanecen visibles en su formulario para que decida qué hacer

  Scenario: Cambio de estado concurrente
    Given que dos usuarios intentan cambiar el estado del mismo ticket al mismo tiempo
    When ambos envían el cambio simultáneamente
    Then solo uno de los cambios se aplica
    And el otro usuario recibe la notificación de conflicto
```

---

## Edge Case 1 — Notificación de email sobre un comentario archivado antes del envío

**Origen en PRD (§2.5):** _"Si el comentario que originó la notificación es archivado antes del envío, la notificación se cancela."_

**Por qué es crítico:** Sin esta regla, un usuario recibe un email con un enlace a contenido que ya no existe, generando confusión y erosionando la confianza en la herramienta. Es fácil de omitir porque ocurre en una ventana de tiempo pequeña entre el comentario y el despacho del email.

```gherkin
Feature: Cancelación de notificación por comentario archivado

  Background:
    Given que existe un ticket con un asignado
    And el sistema tiene una cola de envío de emails con un retardo mínimo

  Scenario: Notificación enviada cuando el comentario sigue activo
    Given que alguien agrega un comentario en el ticket
    And el comentario no ha sido archivado antes del despacho
    When el sistema procesa la cola de notificaciones
    Then el asignado recibe un email con el contenido del comentario

  Scenario: Notificación cancelada porque el comentario fue archivado antes del envío
    Given que alguien agrega un comentario en el ticket
    And el autor archiva ese comentario antes de que se despache el email
    When el sistema procesa la cola de notificaciones
    Then no se envía ningún email al asignado
    And no se registra ningún error — la cancelación es silenciosa

  Scenario: Mención con @handle en un comentario archivado antes del envío
    Given que alguien agrega un comentario que menciona a un usuario con @handle
    And ese comentario es archivado antes del despacho
    When el sistema procesa la cola de notificaciones
    Then el usuario mencionado no recibe ningún email
```

---

## Edge Case 2 — Exportación de métricas CSV con datos inválidos o vacíos

**Origen en PRD (§2.7):** rango inválido devuelve `400`; resultado vacío deshabilita el botón con tooltip; el servidor hace stream fila a fila sin acumular en memoria.

**Por qué es crítico:** Hay tres fallos posibles distintos que comparten la misma superficie (el botón "Exportar CSV") pero requieren manejo diferente: un error de validación en el cliente, un error HTTP del servidor, y un estado vacío legítimo. Tratarlos como uno solo produce bugs silenciosos o UX rota.

```gherkin
Feature: Exportación de métricas a CSV — casos límite

  Background:
    Given que estoy autenticado y veo el dashboard de métricas

  Scenario: Exportar con filtros que no producen resultados
    Given que los filtros activos no corresponden a ningún ticket
    Then el botón "Exportar CSV" está deshabilitado
    And se muestra el tooltip "No hay datos para el rango seleccionado"
    And no se realiza ninguna petición al servidor

  Scenario: Exportar con rango de fechas donde "desde" es posterior a "hasta"
    Given que el filtro de fecha tiene "desde" posterior a "hasta"
    When el usuario intenta exportar
    Then el servidor responde con HTTP 400
    And se muestra un mensaje de error indicando que el rango de fechas es inválido
    And no se descarga ningún archivo

  Scenario: Exportar con sesión expirada
    Given que el token de sesión ha expirado
    When el usuario hace clic en "Exportar CSV"
    Then el servidor responde con HTTP 401
    And el usuario es redirigido a la pantalla de login
    And no se descarga ningún archivo

  Scenario: Exportar un volumen grande de tickets sin error de memoria
    Given que el rango de fechas seleccionado contiene miles de tickets
    When el usuario hace clic en "Exportar CSV"
    Then el archivo comienza a descargarse progresivamente
    And el servidor no acumula todos los registros en memoria antes de responder
    And el archivo resultante cumple el formato RFC 4180
```
