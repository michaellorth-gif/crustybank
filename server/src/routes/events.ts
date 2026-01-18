import { Router } from 'express'
import { z } from 'zod'
import { db, schema } from '../db/index.js'
import { eq, and, desc, gte, lte } from 'drizzle-orm'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  allDay: z.boolean().optional(),
  color: z.string().optional(),
})

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { start, end } = req.query

    let query = db
      .select()
      .from(schema.events)
      .where(eq(schema.events.userId, req.userId!))

    if (start && end) {
      query = db
        .select()
        .from(schema.events)
        .where(
          and(
            eq(schema.events.userId, req.userId!),
            gte(schema.events.startTime, new Date(start as string).toISOString()),
            lte(schema.events.endTime, new Date(end as string).toISOString())
          )
        )
    }

    const events = await query.orderBy(desc(schema.events.startTime))
    res.json(events)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to fetch events' })
  }
})

router.get('/upcoming', async (req: AuthRequest, res) => {
  try {
    const events = await db
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.userId, req.userId!),
          gte(schema.events.startTime, new Date().toISOString())
        )
      )
      .orderBy(schema.events.startTime)
      .limit(5)

    res.json(events)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to fetch upcoming events' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = eventSchema.parse(req.body)
    const [event] = await db
      .insert(schema.events)
      .values({
        userId: req.userId!,
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        allDay: data.allDay || false,
        color: data.color || '#3b82f6',
      })
      .returning()

    res.status(201).json(event)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    console.error(error)
    res.status(500).json({ message: 'Failed to create event' })
  }
})

router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const data = eventSchema.partial().parse(req.body)
    const [event] = await db
      .update(schema.events)
      .set({
        ...data,
        startTime: data.startTime ? new Date(data.startTime).toISOString() : undefined,
        endTime: data.endTime ? new Date(data.endTime).toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(schema.events.id, req.params.id), eq(schema.events.userId, req.userId!)))
      .returning()

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    res.json(event)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    console.error(error)
    res.status(500).json({ message: 'Failed to update event' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const [deleted] = await db
      .delete(schema.events)
      .where(and(eq(schema.events.id, req.params.id), eq(schema.events.userId, req.userId!)))
      .returning()

    if (!deleted) {
      return res.status(404).json({ message: 'Event not found' })
    }

    res.json({ message: 'Event deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to delete event' })
  }
})

export default router
