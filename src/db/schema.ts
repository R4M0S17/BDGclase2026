import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum       = pgEnum('user_role',        ['admin', 'user'])
export const ticketStatusEnum   = pgEnum('ticket_status',    ['todo', 'in_progress', 'review', 'done'])
export const ticketPriorityEnum = pgEnum('ticket_priority',  ['high', 'medium', 'low'])
export const projectStatusEnum  = pgEnum('project_status',   ['active', 'archived'])

// ─── Tables ──────────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  id:          serial('id').primaryKey(),
  name:        varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  slug:        varchar('slug', { length: 100 }).notNull().unique(),
  status:      projectStatusEnum('status').notNull().default('active'),
  createdBy:   integer('created_by').notNull().references(() => users.id),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt:  timestamp('archived_at', { withTimezone: true }),
}, (t) => ({
  slugIdx:   uniqueIndex('projects_slug_idx').on(t.slug),
  statusIdx: index('projects_status_idx').on(t.status),
}))

export const users = pgTable('users', {
  id:            serial('id').primaryKey(),
  name:          varchar('name', { length: 100 }).notNull(),
  email:         varchar('email', { length: 255 }).notNull().unique(),
  role:          userRoleEnum('role').notNull().default('user'),
  oauthProvider: varchar('oauth_provider', { length: 50 }),
  oauthId:       varchar('oauth_id', { length: 255 }),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  oauthProviderIdIdx: uniqueIndex('users_oauth_provider_oauth_id_key').on(t.oauthProvider, t.oauthId),
}))

export const tickets = pgTable('tickets', {
  id:          serial('id').primaryKey(),
  title:       varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status:      ticketStatusEnum('status').notNull().default('todo'),
  priority:    ticketPriorityEnum('priority').notNull(),
  isBlocked:   boolean('is_blocked').notNull().default(false),
  version:     integer('version').notNull().default(1),
  createdBy:   integer('created_by').notNull().references(() => users.id),
  archivedAt:  timestamp('archived_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx:    index('tickets_status_idx').on(t.status),
  priorityIdx:  index('tickets_priority_idx').on(t.priority),
  createdByIdx: index('tickets_created_by_idx').on(t.createdBy),
  archivedIdx:  index('tickets_archived_at_idx').on(t.archivedAt),
}))

export const tags = pgTable('tags', {
  id:        serial('id').primaryKey(),
  name:      varchar('name', { length: 50 }).notNull().unique(),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const ticketAssignees = pgTable('ticket_assignees', {
  ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  userId:   integer('user_id').notNull().references(() => users.id,   { onDelete: 'cascade' }),
}, (t) => ({
  pk:        primaryKey({ columns: [t.ticketId, t.userId] }),
  userIdIdx: index('ticket_assignees_user_id_idx').on(t.userId),
}))

export const ticketTags = pgTable('ticket_tags', {
  ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  tagId:    integer('tag_id').notNull().references(() => tags.id,    { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.ticketId, t.tagId] }),
}))

export const comments = pgTable('comments', {
  id:        serial('id').primaryKey(),
  ticketId:  integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  userId:    integer('user_id').notNull().references(() => users.id),
  body:      text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  ticketIdIdx: index('comments_ticket_id_idx').on(t.ticketId),
}))

// Immutable — no UPDATE or DELETE ever issued against this table
export const auditLogs = pgTable('audit_logs', {
  id:        serial('id').primaryKey(),
  ticketId:  integer('ticket_id').notNull().references(() => tickets.id),
  field:     varchar('field', { length: 50 }).notNull(),
  oldValue:  text('old_value'),
  newValue:  text('new_value'),
  actorId:   integer('actor_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ticketIdIdx:       index('audit_logs_ticket_id_idx').on(t.ticketId),
  ticketIdFieldIdx:  index('audit_logs_ticket_id_field_idx').on(t.ticketId, t.field),
  actorIdIdx:        index('audit_logs_actor_id_idx').on(t.actorId),
  createdAtIdx:      index('audit_logs_created_at_idx').on(t.createdAt),
}))

// ─── Inferred types ──────────────────────────────────────────────────────────

export type User        = typeof users.$inferSelect
export type NewUser     = typeof users.$inferInsert
export type Ticket      = typeof tickets.$inferSelect
export type NewTicket   = typeof tickets.$inferInsert
export type Tag         = typeof tags.$inferSelect
export type NewTag      = typeof tags.$inferInsert
export type Comment     = typeof comments.$inferSelect
export type NewComment  = typeof comments.$inferInsert
export type AuditLog    = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
export type Project     = typeof projects.$inferSelect
export type NewProject  = typeof projects.$inferInsert
