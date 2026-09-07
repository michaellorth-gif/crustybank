import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import taskRoutes from './routes/tasks.js'
import goalRoutes from './routes/goals.js'
import noteRoutes from './routes/notes.js'
import eventRoutes from './routes/events.js'
import chatRoutes from './routes/chat.js'
import dashboardRoutes from './routes/dashboard.js'
import teamRoutes from './routes/teams.js'
import documentRoutes from './routes/documents.js'
import workflowRoutes from './routes/workflows.js'
import intakeRoutes from './routes/intakes.js'
import firmSettingsRoutes from './routes/firmSettings.js'
import publicIntakeRoutes from './routes/publicIntake.js'
import emailRoutes from './routes/emails.js'
import adminRoutes from './routes/admin.js'
import { authMiddleware } from './middleware/auth.js'

const app = express()
const PORT = process.env.PORT || 5000

// Behind a hosting provider's proxy (Railway, Render, ...), set TRUST_PROXY=1
// so req.ip reflects the real client address from X-Forwarded-For. Leave unset
// when running directly on a machine — then the header is client-controlled.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1)
}

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Public routes
app.use('/api/auth', authRoutes)
app.use('/api/public', publicIntakeRoutes)

// Protected routes
app.use('/api/tasks', authMiddleware, taskRoutes)
app.use('/api/goals', authMiddleware, goalRoutes)
app.use('/api/notes', authMiddleware, noteRoutes)
app.use('/api/events', authMiddleware, eventRoutes)
app.use('/api/chat', authMiddleware, chatRoutes)
app.use('/api/dashboard', authMiddleware, dashboardRoutes)
app.use('/api/teams', authMiddleware, teamRoutes)
app.use('/api/documents', authMiddleware, documentRoutes)
app.use('/api/workflows', authMiddleware, workflowRoutes)
app.use('/api/intakes', authMiddleware, intakeRoutes)
app.use('/api/firm-settings', authMiddleware, firmSettingsRoutes)
app.use('/api/emails', authMiddleware, emailRoutes)
app.use('/api/admin', authMiddleware, adminRoutes)

// Health check with non-secret config visibility, so a browser can confirm
// which environment settings actually reached the running process (values and
// secrets are never exposed — only booleans about their presence/correctness).
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    registrationDisabled: process.env.DISABLE_REGISTRATION === 'true',
    trustProxyConfigured: process.env.TRUST_PROXY !== undefined,
    jwtSecretConfigured: Boolean(process.env.JWT_SECRET),
    databasePathOnVolume: process.env.DATABASE_PATH === '/data/app.db',
  })
})

// In production, serve the built client from this same server so a single
// deployed process (or a single port on the LAN) serves the whole app.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.resolve(__dirname, '../../client/dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  // SPA fallback: any non-API GET serves index.html so client-side routes
  // (/intakes, /intake, /login, ...) load directly.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something went wrong!' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
