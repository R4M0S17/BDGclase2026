# Edge Cases Críticos — Mini Jira MVP

**Fecha:** 2026-04-20  
**Rol:** QA Lead Senior  
**Método:** Análisis de superficie de ataque del stack (OAuth → Express → Prisma → PostgreSQL → Redis → Resend)

---

## Matriz de Priorización de Riesgo

| ID | Edge Case | Probabilidad | Impacto | Detectabilidad | Score (P×I/D) | Prioridad |
|---|---|---|---|---|---|---|
| EC-A | Race condition en refresh token con múltiples tabs | Alta | Alto | Baja | 🔴 9 | P0 |
| EC-B | Corrupción silenciosa en optimistic locking por ventana SELECT→UPDATE | Media | Alto | Baja | 🔴 8 | P0 |
| EC-C | Worker de emails cae con notificaciones en cola | Media | Medio | Baja | 🟠 6 | P1 |
| EC-D | Streaming CSV interrumpido a mitad de descarga | Baja | Medio | Alta | 🟡 3 | P2 |
| EC-E | Falla de red durante redirect OAuth (sesión huérfana) | Media | Alto | Media | 🟠 6 | P1 |

> **Score** = (Probabilidad × Impacto) / Detectabilidad  
> Escala: Baja=1, Media=2, Alta=3

---

## EC-A — Race condition en refresh token con múltiples tabs abiertas

**Por qué rompe el MVP:** El sistema usa access + refresh tokens (PRD §5). Si un usuario tiene 3 tabs abiertas y el access token expira simultáneamente, las 3 tabs disparan `POST /auth/refresh` al mismo tiempo. El primer request invalida el refresh token en Redis; los otros dos reciben `401` con un refresh token ya rotado — el usuario queda deslogueado sin haber hecho nada.

**Detectabilidad baja:** en desarrollo, nadie prueba con múltiples tabs. Aparece en producción cuando el equipo lleva semanas usando la herramienta.

```gherkin
Feature: Refresh token bajo múltiples tabs concurrentes

  Background:
    Given que un usuario tiene 3 tabs abiertas con el mismo refresh token
    And el access token expira al mismo tiempo en todas las tabs

  Scenario: Solo el primer refresh tiene éxito — las demás tabs quedan inválidas
    When las 3 tabs intentan renovar el access token simultáneamente
    Then exactamente una tab recibe un nuevo access token y refresh token válidos
    And las otras 2 tabs reciben 401 con el refresh token ya rotado
    And el usuario es redirigido a login en esas tabs sin haber cerrado sesión manualmente

  Scenario: Mitigación — solo el primer refresh es procesado, los duplicados esperan
    When las 3 tabs intentan renovar el access token simultáneamente
    Then el sistema detecta los requests duplicados por userId en Redis
    And retorna el mismo nuevo access token a todas las tabs en vuelo
    And el refresh token se rota una sola vez
```

---

## EC-B — Corrupción silenciosa en optimistic locking por ventana SELECT→UPDATE

**Por qué rompe el MVP:** El optimistic locking del PRD (§4) asume que `SELECT version` y `UPDATE WHERE version = ?` son atómicos. En PostgreSQL con el nivel de aislamiento por defecto (`READ COMMITTED`), dos transacciones pueden leer el mismo `version` antes de que cualquiera haga el `UPDATE`. Ambas pasan la validación de versión y una sobreescribe a la otra sin disparar el `409`. Es corrupción silenciosa de datos — peor que un conflicto visible.

**Detectabilidad baja:** los tests de concurrencia habituales tienen latencia suficiente para que el race no ocurra. Solo aparece bajo carga real o con una DB con alta contención.

```gherkin
Feature: Integridad del optimistic locking bajo contención extrema

  Background:
    Given que un ticket tiene version = 5
    And dos usuarios leen el ticket con version = 5 en el mismo instante

  Scenario: Ambos usuarios pasan la validación de versión antes de que alguno actualice
    When ambos envían PATCH con version = 5 dentro de la misma ventana de microsegundos
    Then solo una de las dos escrituras se persiste en la base de datos
    And la otra recibe 409 Conflict
    And version en DB es exactamente 6, no 7

  Scenario: El UPDATE usa comparación atómica para evitar la ventana SELECT→UPDATE
    When el sistema ejecuta la actualización
    Then la query usa UPDATE ... WHERE version = ? AND id = ? en una sola operación atómica
    And no existe una SELECT separada previa para comparar el version
```

---

## EC-C — Worker de emails cae con notificaciones pendientes en cola

**Por qué rompe el MVP:** El PRD define que las notificaciones de email se cancelan si el comentario es archivado antes del envío (§2.5), lo que implica una cola con procesamiento diferido. Si el worker cae (crash, reinicio del PaaS en Railway/Render) con mensajes encolados, esos mensajes se pierden silenciosamente — nadie fue notificado de su asignación. No hay error visible; el sistema funciona con normalidad salvo que las notificaciones simplemente no llegan.

**Detectabilidad baja:** el fallo no genera ningún error en logs del servidor principal.

```gherkin
Feature: Resiliencia del worker de notificaciones ante caída

  Background:
    Given que existen 10 notificaciones pendientes en la cola de Redis
    And el worker de emails está procesando la posición 3

  Scenario: Worker cae a mitad del procesamiento — mensajes no procesados se pierden
    When el proceso del worker es terminado abruptamente
    Then los mensajes 4 al 10 no son enviados
    And no se genera ningún error visible en el servidor principal
    And los usuarios asignados nunca reciben notificación

  Scenario: Worker con reintentos — mensaje fallido no bloquea la cola
    Given que el envío del mensaje 3 falla por error transitorio de Resend
    When el worker reintenta el envío
    Then el mensaje es reintentado máximo N veces con backoff exponencial
    And si supera el límite de reintentos, se mueve a una dead-letter queue
    And los mensajes 4 al 10 se procesan con independencia del fallo del 3

  Scenario: Worker reiniciado — mensajes en cola no son procesados dos veces
    When el worker se reinicia después de una caída
    Then cada notificación pendiente es enviada exactamente una vez
    And no se generan emails duplicados para el mismo evento
```

---

## EC-D — Streaming CSV interrumpido a mitad de descarga

**Por qué rompe el MVP:** El PRD especifica que el servidor hace stream del CSV fila a fila sin acumular en memoria (§2.7). Si la conexión a PostgreSQL se pierde a mitad del stream, el servidor cierra el socket abruptamente — el cliente recibe un archivo `.csv` truncado sin ningún mensaje de error, sin código HTTP de fallo (el `200` ya fue enviado con los primeros bytes), y sin indicación visual de que el archivo está incompleto.

**Detectabilidad alta:** el usuario nota el archivo roto al abrirlo. Por eso es P2 pese al impacto.

```gherkin
Feature: Manejo de errores en streaming CSV

  Background:
    Given que existe un export en curso con miles de filas
    And el servidor ya envió los headers HTTP 200 y las primeras 500 filas

  Scenario: Conexión a DB se pierde a mitad del stream
    When la conexión a PostgreSQL se interrumpe durante el streaming
    Then el servidor cierra el stream de respuesta de forma controlada
    And el archivo descargado en el cliente contiene una fila final con indicador de error
    And se registra el evento en los logs del servidor con el identificador de la request

  Scenario: Cliente cancela la descarga antes de completarse
    When el usuario cancela la descarga en el navegador
    Then el servidor libera el cursor de base de datos y cierra la query abierta
    And no quedan conexiones a DB abiertas sin cerrar tras la cancelación
```

---

## EC-E — Falla de red durante redirect OAuth (sesión huérfana)

**Por qué rompe el MVP:** El flujo OAuth 2.0 tiene dos pasos: (1) redirect a Google, (2) callback con el código de autorización. Si la red falla entre el paso 1 y el paso 2 — o si el usuario cierra el tab en ese intervalo — el `state` CSRF generado queda persistido en Redis sin expirar. Acumulados en el tiempo, generan ruido en Redis y, si el atacante roba un `state` válido huérfano, puede intentar un CSRF en la sesión.

**Detectabilidad media:** el síntoma visible es el error `invalid_state` cuando el usuario reintenta, que parece un bug de UX pero esconde un riesgo de seguridad.

```gherkin
Feature: Resiliencia del flujo OAuth ante interrupciones de red

  Background:
    Given que un usuario inició el flujo OAuth y se generó un state en Redis

  Scenario: Usuario cierra el tab antes del callback — state queda huérfano
    When el usuario cierra el navegador después del redirect a Google pero antes del callback
    Then el state en Redis expira automáticamente pasado el TTL definido
    And no queda ningún state huérfano acumulado indefinidamente en Redis

  Scenario: Usuario reintenta login con un state expirado
    When el usuario retoma el flujo OAuth con un state que ya expiró
    Then el servidor rechaza el callback con un error claro
    And redirige al usuario a la pantalla de login para iniciar un nuevo flujo

  Scenario: Callback recibido con state no reconocido
    When el servidor recibe un callback OAuth con un state que no existe en Redis
    Then la request es rechazada con 400
    And no se emite ningún JWT
    And el evento queda registrado en logs como intento de CSRF potencial
```
