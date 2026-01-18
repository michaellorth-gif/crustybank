import { Router } from 'express'
import { z } from 'zod'
import { db, schema } from '../db/index.js'
import { eq, and, desc } from 'drizzle-orm'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().nullable().optional(),
  completed: z.boolean().optional(),
})

router.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.userId, req.userId!))
      .orderBy(desc(schema.tasks.createdAt))
      .limit(limit)

    res.json(tasks)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to fetch tasks' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = taskSchema.parse(req.body)
    const [task] = await db
      .insert(schema.tasks)
      .values({
        userId: req.userId!,
        title: data.title,
        description: data.description,
        priority: data.priority || 'medium',
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      })
      .returning()

    res.status(201).json(task)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    console.error(error)
    res.status(500).json({ message: 'Failed to create task' })
  }
})

router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const data = taskSchema.partial().parse(req.body)
    const [task] = await db
      .update(schema.tasks)
      .set({
        ...data,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate).toISOString() : null) : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(schema.tasks.id, req.params.id), eq(schema.tasks.userId, req.userId!)))
      .returning()

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    res.json(task)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    console.error(error)
    res.status(500).json({ message: 'Failed to update task' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const [deleted] = await db
      .delete(schema.tasks)
      .where(and(eq(schema.tasks.id, req.params.id), eq(schema.tasks.userId, req.userId!)))
      .returning()

    if (!deleted) {
      return res.status(404).json({ message: 'Task not found' })
    }

    res.json({ message: 'Task deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to delete task' })
  }
})

export default router
