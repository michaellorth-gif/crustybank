// Public (unauthenticated) intake endpoint for the client-facing portal.
// Submissions are assigned to the firm owner (first admin user, else first user),
// triaged like internal intakes, and marked source='public'.

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { asc, eq } from 'drizzle-orm'
import { createIntakeRecord, createIntakeSchema } from './intakes.js'

const router = Router()

// Light in-memory rate limit: max submissions per IP per hour, plus a global
// hourly ceiling as a backstop against key-spoofing or distributed abuse.
const RATE_LIMIT = 10
const GLOBAL_HOURLY_LIMIT = 100
const WINDOW_MS = 60 * 60 * 1000
const submissions = new Map<string, number[]>()
let globalTimestamps: number[] = []

function pruneStale(now: number): void {
  globalTimestamps = globalTimestamps.filter((t) => now - t < WINDOW_MS)
  for (const [key, times] of submissions) {
    const recent = times.filter((t) => now - t < WINDOW_MS)
    if (recent.length === 0) submissions.delete(key)
    else submissions.set(key, recent)
  }
}

function rateLimited(ip: string): boolean {
  const now = Date.now()
  pruneStale(now)
  if (globalTimestamps.length >= GLOBAL_HOURLY_LIMIT) return true
  const recent = submissions.get(ip) || []
  if (recent.length >= RATE_LIMIT) return true
  recent.push(now)
  submissions.set(ip, recent)
  globalTimestamps.push(now)
  return false
}

async function findOwnerUserId(): Promise<string | null> {
  const admin = await db.select().from(users).where(eq(users.role, 'admin')).orderBy(asc(users.createdAt)).get()
  if (admin) return admin.id
  const first = await db.select().from(users).orderBy(asc(users.createdAt)).get()
  return first?.id || null
}

const publicSchema = z.intersection(
  createIntakeSchema,
  z.object({
    website: z.string().max(0).optional(), // honeypot — bots fill it, humans never see it
  })
)

router.post('/intake', async (req: Request, res: Response) => {
  try {
    // Key on the socket address, NOT X-Forwarded-For — no trust proxy is
    // configured, so the header is client-controlled and trivially spoofed.
    // (If this app is ever deployed behind a reverse proxy, set Express
    // 'trust proxy' and switch to req.ip.)
    const ip = req.socket.remoteAddress || 'unknown'
    if (rateLimited(ip)) {
      return res.status(429).json({ message: 'Too many submissions — please try again later or call the office.' })
    }

    const body = publicSchema.parse(req.body)
    const ownerId = await findOwnerUserId()
    if (!ownerId) return res.status(503).json({ message: 'Intake is not available right now.' })

    const intake = await createIntakeRecord(ownerId, body, 'public')

    // Public response deliberately excludes the triage analysis — that is attorney
    // work product; the client just gets a confirmation.
    res.status(201).json({
      id: intake.id,
      received: true,
      message: 'Your information has been received. This submission does not create an attorney-client relationship; the firm will review it and contact you.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Some required information is missing or invalid.', errors: error.errors })
    }
    console.error('Error creating public intake:', error)
    res.status(500).json({ message: 'Something went wrong — please call the office.' })
  }
})

export default router
