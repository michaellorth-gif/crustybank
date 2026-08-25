import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { firmSettings } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

const settingsSchema = z.object({
  attorneyName: z.string().optional(),
  barNumber: z.string().optional(),
  firmName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
})

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const row = await db.select().from(firmSettings).where(eq(firmSettings.userId, req.userId!)).get()
    res.json(row?.data || {})
  } catch (error) {
    console.error('Error fetching firm settings:', error)
    res.status(500).json({ message: 'Failed to fetch firm settings' })
  }
})

router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const data = settingsSchema.parse(req.body)
    const existing = await db.select().from(firmSettings).where(eq(firmSettings.userId, userId)).get()
    if (existing) {
      await db.update(firmSettings)
        .set({ data: data as Record<string, string>, updatedAt: new Date().toISOString() })
        .where(eq(firmSettings.userId, userId))
    } else {
      await db.insert(firmSettings).values({ userId, data: data as Record<string, string> })
    }
    res.json(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error saving firm settings:', error)
    res.status(500).json({ message: 'Failed to save firm settings' })
  }
})

export default router
