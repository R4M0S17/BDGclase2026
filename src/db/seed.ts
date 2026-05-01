import 'dotenv/config'
import { db } from './index.js'
import { comments, projects, tags, ticketAssignees, ticketTags, tickets, users } from './schema.js'

async function seed() {
  console.log('Seeding database...')

  const insertedUsers = await db.insert(users).values([
    { name: 'Ana García',   email: 'ana@example.com',    role: 'admin' },
    { name: 'Carlos Ruiz',  email: 'carlos@example.com', role: 'user'  },
    { name: 'María López',  email: 'maria@example.com',  role: 'user'  },
  ]).returning()

  const [ana, carlos, maria] = insertedUsers
  console.log('Users:', insertedUsers.map((u) => `${u.id}: ${u.name}`).join(', '))

  const [project] = await db.insert(projects).values({
    name:        'Mini Jira',
    slug:        'mini-jira',
    description: 'Proyecto demo del sistema kanban',
    createdBy:   ana.id,
  }).returning()
  console.log('Project:', project.id, project.name)

  const insertedTags = await db.insert(tags).values([
    { name: 'backend',  createdBy: ana.id },
    { name: 'frontend', createdBy: ana.id },
    { name: 'bug',      createdBy: ana.id },
    { name: 'feature',  createdBy: ana.id },
  ]).returning()
  const [tagBackend, tagFrontend, , tagFeature] = insertedTags

  const insertedTickets = await db.insert(tickets).values([
    { title: 'Setup del proyecto inicial',          status: 'done',        priority: 'high',   createdBy: ana.id,    isBlocked: false },
    { title: 'Diseño del sistema de autenticación', status: 'done',        priority: 'medium', createdBy: ana.id,    isBlocked: false },
    { title: 'Implementar API de tickets',          status: 'in_progress', priority: 'high',   createdBy: ana.id,    isBlocked: false },
    { title: 'Conectar frontend con backend',       status: 'in_progress', priority: 'high',   createdBy: carlos.id, isBlocked: false },
    { title: 'Dashboard de métricas',               status: 'review',      priority: 'medium', createdBy: ana.id,    isBlocked: false },
    { title: 'Tests de integración',                status: 'todo',        priority: 'medium', createdBy: maria.id,  isBlocked: false },
    { title: 'Optimistic locking en drag & drop',   status: 'todo',        priority: 'low',    createdBy: carlos.id, isBlocked: false },
    { title: 'Exportar tickets a CSV',              status: 'todo',        priority: 'low',    createdBy: ana.id,    isBlocked: true  },
  ]).returning()

  await db.insert(ticketAssignees).values([
    { ticketId: insertedTickets[2].id, userId: carlos.id },
    { ticketId: insertedTickets[3].id, userId: carlos.id },
    { ticketId: insertedTickets[4].id, userId: maria.id  },
    { ticketId: insertedTickets[5].id, userId: maria.id  },
  ])

  await db.insert(ticketTags).values([
    { ticketId: insertedTickets[2].id, tagId: tagBackend.id  },
    { ticketId: insertedTickets[3].id, tagId: tagFrontend.id },
    { ticketId: insertedTickets[4].id, tagId: tagFeature.id  },
    { ticketId: insertedTickets[6].id, tagId: tagFeature.id  },
  ])

  await db.insert(comments).values([
    { ticketId: insertedTickets[2].id, userId: carlos.id, body: 'Empezando con los endpoints de GET y POST.' },
    { ticketId: insertedTickets[3].id, userId: ana.id,    body: 'Hay que revisar el problema de CORS primero.' },
    { ticketId: insertedTickets[4].id, userId: maria.id,  body: 'El mockup está listo, puedo empezar los componentes.' },
  ])

  console.log('Tickets:', insertedTickets.length)
  console.log('Seed complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
