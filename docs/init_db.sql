-- =============================================================
-- Mini Jira v0.1 — init_db.sql
-- PostgreSQL 16
-- =============================================================

-- -------------------------------------------------------------
-- Extensiones
-- -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()


-- =============================================================
-- TIPOS ENUMERADOS
-- Lista cerrada en v1 (specs.md §2.3). Cambios futuros
-- requieren una migración explícita con valor por defecto.
-- =============================================================

CREATE TYPE user_role AS ENUM (
    'admin',
    'member'
);

CREATE TYPE ticket_status AS ENUM (
    'todo',
    'in_progress',
    'review',
    'done'
);

CREATE TYPE ticket_priority AS ENUM (
    'low',
    'medium',
    'high'
);


-- =============================================================
-- FUNCIÓN AUXILIAR — actualiza updated_at automáticamente
-- =============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================
-- TABLA: users
-- =============================================================

CREATE TABLE users (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255)    NOT NULL,
    email       VARCHAR(255)    NOT NULL,
    role        user_role       NOT NULL DEFAULT 'member',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================
-- TABLA: tickets
-- =============================================================
-- "Eliminar" = archivar (specs.md §2.2):
--   archived_at NULL  → ticket activo
--   archived_at NOT NULL → ticket archivado (soft delete)
--
-- version (int) → Optimistic Locking (specs.md §4):
--   el cliente envía el version que tenía; si no coincide → 409
-- =============================================================

CREATE TABLE tickets (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(120)    NOT NULL,
    description TEXT,
    status      ticket_status   NOT NULL DEFAULT 'todo',
    priority    ticket_priority NOT NULL,
    is_blocked  BOOLEAN         NOT NULL DEFAULT FALSE,
    version     INTEGER         NOT NULL DEFAULT 1,
    created_by  UUID            NOT NULL,
    archived_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tickets_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON DELETE RESTRICT,

    CONSTRAINT ck_tickets_title_not_blank
        CHECK (TRIM(title) <> ''),

    CONSTRAINT ck_tickets_version_positive
        CHECK (version >= 1)
);

CREATE TRIGGER trg_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices de soporte para queries frecuentes
CREATE INDEX idx_tickets_created_by  ON tickets (created_by);
CREATE INDEX idx_tickets_status      ON tickets (status)      WHERE archived_at IS NULL;
CREATE INDEX idx_tickets_priority    ON tickets (priority)    WHERE archived_at IS NULL;
CREATE INDEX idx_tickets_created_at  ON tickets (created_at);
CREATE INDEX idx_tickets_archived_at ON tickets (archived_at) WHERE archived_at IS NOT NULL;


-- =============================================================
-- TABLA: ticket_assignees  (M:N tickets ↔ users)
-- =============================================================

CREATE TABLE ticket_assignees (
    ticket_id   UUID    NOT NULL,
    user_id     UUID    NOT NULL,

    CONSTRAINT pk_ticket_assignees
        PRIMARY KEY (ticket_id, user_id),

    CONSTRAINT fk_ta_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ta_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE INDEX idx_ta_user_id ON ticket_assignees (user_id);


-- =============================================================
-- TABLA: ticket_labels  (1 ticket → N etiquetas libres)
-- =============================================================

CREATE TABLE ticket_labels (
    ticket_id   UUID            NOT NULL,
    label       VARCHAR(100)    NOT NULL,

    CONSTRAINT pk_ticket_labels
        PRIMARY KEY (ticket_id, label),

    CONSTRAINT fk_tl_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets (id)
        ON DELETE CASCADE,

    CONSTRAINT ck_ticket_labels_label_not_blank
        CHECK (TRIM(label) <> '')
);


-- =============================================================
-- TABLA: comments
-- =============================================================
-- Sin edición: un comentario solo se archiva (soft delete).
-- archived_at NULL → activo; NOT NULL → archivado (specs.md §2.4)
-- La notificación de email se cancela si archived_at IS NOT NULL
-- antes del despacho (specs.md §2.5 / backlog EC-1).
-- =============================================================

CREATE TABLE comments (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID        NOT NULL,
    author_id   UUID        NOT NULL,
    body        TEXT        NOT NULL,
    archived_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_comments_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comments_author
        FOREIGN KEY (author_id)
        REFERENCES users (id)
        ON DELETE RESTRICT,

    CONSTRAINT ck_comments_body_not_blank
        CHECK (TRIM(body) <> '')
);

CREATE INDEX idx_comments_ticket_id  ON comments (ticket_id);
CREATE INDEX idx_comments_author_id  ON comments (author_id);
CREATE INDEX idx_comments_archived_at ON comments (archived_at) WHERE archived_at IS NOT NULL;


-- =============================================================
-- MOCK DATA
-- =============================================================


-- -------------------------------------------------------------
-- users
-- -------------------------------------------------------------
INSERT INTO users (id, name, email, role, created_at, updated_at) VALUES
    (
        'a1000000-0000-0000-0000-000000000001',
        'Laura García',
        'laura.garcia@empresa.com',
        'admin',
        '2026-04-01 09:00:00+00',
        '2026-04-01 09:00:00+00'
    ),
    (
        'a1000000-0000-0000-0000-000000000002',
        'Marcos Rodríguez',
        'marcos.rodriguez@empresa.com',
        'member',
        '2026-04-01 09:05:00+00',
        '2026-04-01 09:05:00+00'
    ),
    (
        'a1000000-0000-0000-0000-000000000003',
        'Sofía Martínez',
        'sofia.martinez@empresa.com',
        'member',
        '2026-04-01 09:10:00+00',
        '2026-04-01 09:10:00+00'
    );


-- -------------------------------------------------------------
-- tickets
-- UUIDs fijos para que ticket_assignees y comments los referencien
-- version > 1 en tickets editados simula actividad real
-- -------------------------------------------------------------
INSERT INTO tickets (id, title, description, status, priority, is_blocked, version, created_by, archived_at, created_at, updated_at) VALUES
    (
        'b2000000-0000-0000-0000-000000000001',
        'Configurar autenticación OAuth 2.0',
        'Integrar Google Workspace como proveedor OAuth. Registrar la app, configurar redirect URIs y validar el flujo Authorization Code con JWT de acceso y refresco.',
        'todo',
        'high',
        FALSE,
        1,
        'a1000000-0000-0000-0000-000000000001',  -- Laura (admin)
        NULL,
        '2026-04-10 10:00:00+00',
        '2026-04-10 10:00:00+00'
    ),
    (
        'b2000000-0000-0000-0000-000000000002',
        'Implementar tablero Kanban con drag-and-drop',
        'Crear las 4 columnas (Por hacer, En progreso, Review, Listo) con tarjetas arrastrables. El badge Bloqueado debe coexistir con cualquier columna sin ocupar una propia.',
        'in_progress',
        'high',
        FALSE,
        3,
        'a1000000-0000-0000-0000-000000000002',  -- Marcos
        NULL,
        '2026-04-11 08:30:00+00',
        '2026-04-14 16:00:00+00'
    ),
    (
        'b2000000-0000-0000-0000-000000000003',
        'Crear endpoint PATCH /api/tickets/:id',
        'Incluir validación de version para Optimistic Locking. Devolver 409 si la versión del cliente no coincide con la de la BD. Los cambios locales del cliente no deben perderse.',
        'in_progress',
        'high',
        TRUE,                                    -- is_blocked: esperando definición de permisos
        2,
        'a1000000-0000-0000-0000-000000000002',  -- Marcos
        NULL,
        '2026-04-12 09:00:00+00',
        '2026-04-15 11:30:00+00'
    ),
    (
        'b2000000-0000-0000-0000-000000000004',
        'Diseñar dashboard de métricas',
        'Mostrar: tickets cerrados por mes, tickets por estado (snapshot), tickets por miembro. Calculados en tiempo real sin tabla de hechos separada.',
        'review',
        'medium',
        FALSE,
        4,
        'a1000000-0000-0000-0000-000000000003',  -- Sofía
        NULL,
        '2026-04-13 10:15:00+00',
        '2026-04-17 09:45:00+00'
    ),
    (
        'b2000000-0000-0000-0000-000000000005',
        'Exportación de métricas a CSV',
        'Endpoint GET /api/metrics/export con streaming fila a fila (res.write). Soportar filtros: rango de fechas, estado y asignado. Cumplir RFC 4180 para campos con comas.',
        'done',
        'medium',
        FALSE,
        5,
        'a1000000-0000-0000-0000-000000000001',  -- Laura (admin)
        NULL,
        '2026-04-14 11:00:00+00',
        '2026-04-18 17:00:00+00'
    );


-- -------------------------------------------------------------
-- ticket_assignees
-- -------------------------------------------------------------
INSERT INTO ticket_assignees (ticket_id, user_id) VALUES
    ('b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'),  -- OAuth → Marcos
    ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002'),  -- Kanban → Marcos
    ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003'),  -- Kanban → Sofía (co-asignada)
    ('b2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002'),  -- PATCH endpoint → Marcos
    ('b2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003'),  -- Dashboard → Sofía
    ('b2000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003');  -- CSV → Sofía


-- -------------------------------------------------------------
-- ticket_labels
-- -------------------------------------------------------------
INSERT INTO ticket_labels (ticket_id, label) VALUES
    ('b2000000-0000-0000-0000-000000000001', 'auth'),
    ('b2000000-0000-0000-0000-000000000001', 'backend'),
    ('b2000000-0000-0000-0000-000000000002', 'frontend'),
    ('b2000000-0000-0000-0000-000000000002', 'ui'),
    ('b2000000-0000-0000-0000-000000000003', 'backend'),
    ('b2000000-0000-0000-0000-000000000003', 'api'),
    ('b2000000-0000-0000-0000-000000000003', 'concurrencia'),
    ('b2000000-0000-0000-0000-000000000004', 'frontend'),
    ('b2000000-0000-0000-0000-000000000004', 'métricas'),
    ('b2000000-0000-0000-0000-000000000005', 'backend'),
    ('b2000000-0000-0000-0000-000000000005', 'métricas');


-- -------------------------------------------------------------
-- comments
-- Ejercita: comentario activo, comentario archivado (EC-1),
-- y mención con @handle
-- -------------------------------------------------------------
INSERT INTO comments (id, ticket_id, author_id, body, archived_at, created_at) VALUES
    (
        'c3000000-0000-0000-0000-000000000001',
        'b2000000-0000-0000-0000-000000000002',  -- Kanban
        'a1000000-0000-0000-0000-000000000001',  -- Laura
        'Revisé el prototipo. Las 4 columnas se ven bien. Asegúrate de que el badge Bloqueado sea visible en modo de alto contraste.',
        NULL,                                    -- comentario activo
        '2026-04-15 10:00:00+00'
    ),
    (
        'c3000000-0000-0000-0000-000000000002',
        'b2000000-0000-0000-0000-000000000003',  -- PATCH endpoint
        'a1000000-0000-0000-0000-000000000002',  -- Marcos
        'Bloqueado hasta que @laura.garcia confirme la matriz de permisos para tickets ajenos.',
        NULL,                                    -- comentario activo con @handle
        '2026-04-15 11:00:00+00'
    ),
    (
        'c3000000-0000-0000-0000-000000000003',
        'b2000000-0000-0000-0000-000000000004',  -- Dashboard
        'a1000000-0000-0000-0000-000000000003',  -- Sofía
        'Borrador inicial — ignorar este comentario.',
        '2026-04-16 09:00:00+00',                -- archivado antes del envío (EC-1)
        '2026-04-16 08:55:00+00'
    ),
    (
        'c3000000-0000-0000-0000-000000000004',
        'b2000000-0000-0000-0000-000000000005',  -- CSV
        'a1000000-0000-0000-0000-000000000001',  -- Laura
        'Export validado contra RFC 4180. Campos con comas y saltos de línea correctamente entre comillas. Ticket listo para cerrar.',
        NULL,                                    -- comentario activo
        '2026-04-18 16:45:00+00'
    );
