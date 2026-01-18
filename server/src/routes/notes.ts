import { Router } from 'express'
import { z } from 'zod'
import { db, schema } from '../db/index.js'
import { eq, and, desc } from 'drizzle-orm'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

const noteSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
})

router.get('/', async (req: AuthRequest, res) => {
  try {
    const notes = await db
      .select()
      .from(schema.notes)
      .where(eq(schema.notes.userId, req.userId!))
      .orderBy(desc(schema.notes.updatedAt))

    res.json(notes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to fetch notes' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = noteSchema.parse(req.body)
    const [note] = await db
      .insert(schema.notes)
      .values({
        userId: req.userId!,
        title: data.title,
        content: data.content,
      })
      .returning()

    res.status(201).json(note)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    console.error(error)
    res.status(500).json({ message: 'Failed to create note' })
  }
})

router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const data = noteSchema.partial().parse(req.body)
    const [note] = await db
      .update(schema.notes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.notes.id, req.params.id), eq(schema.notes.userId, req.userId!)))
      .returning()

    if (!note) {
      return res.status(404).json({ message: 'Note not found' })
    }

    res.json(note)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    console.error(error)
    res.status(500).json({ message: 'Failed to update note' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const [deleted] = await db
      .delete(schema.notes)
      .where(and(eq(schema.notes.id, req.params.id), eq(schema.notes.userId, req.userId!)))
      .returning()

    if (!deleted) {
      return res.status(404).json({ message: 'Note not found' })
    }

    res.json({ message: 'Note deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to delete note' })
  }
})

export default router
