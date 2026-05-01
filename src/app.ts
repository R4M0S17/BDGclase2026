import cors from 'cors'
import express from 'express'
import { errorHandler } from './middleware/errorHandler.js'
import authRouter from './routes/auth.js'
import metricsRouter from './routes/metrics.js'
import projectsRouter from './routes/projects.js'
import ticketsRouter from './routes/tickets.js'
import tagsRouter from './routes/tags.js'
import usersRouter from './routes/users.js'
import commentsRouter from './routes/comments.js'
import auditRouter from './routes/audit.js'

const app = express()

const isDev = process.env.NODE_ENV === 'development'

app.use(
  cors({
    origin: isDev
      ? (origin, cb) => cb(null, true)
      : (process.env.CORS_ORIGIN ?? 'http://localhost:5173'),
    credentials: true,
  }),
)
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/metrics', metricsRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/tickets', ticketsRouter)
app.use('/api/tickets/:ticketId/comments', commentsRouter)
app.use('/api/tickets/:ticketId/audit', auditRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/users', usersRouter)

app.use(errorHandler)

export default app
