import { Router } from 'express'
import { z } from 'zod'
import { db, schema } from '../db/index.js'
import { eq, and, desc } from 'drizzle-orm'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

const milestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
})

const goalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.string().nullable().optional(),
  milestones: z.array(milestoneSchema).optional(),
})

router.get('/', async (req: AuthRequest, res) => {
  try {
    const goals = await db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.userId, req.userId!))
      .orderBy(desc(schema.goals.createdAt))

    res.json(goals)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to fetch goals' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = goalSchema.parse(req.body)
    const milestones = data.milestones || []
    const completedCount = milestones.filter((m) => m.completed).length
    const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0

    const [goal] = await db
      .insert(schema.goals)
      .values({
        userId: req.userId!,
        title: data.title,
        description: data.description,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        milestones,
        progress,
      })
      .returning()

    res.status(201).json(goal)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    console.error(error)
    res.status(500).json({ message: 'Failed to create goal' })
  }
})

router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const data = goalSchema.partial().parse(req.body)

    let progress: number | undefined
    if (data.milestones) {
      const completedCount = data.milestones.filter((m) => m.completed).length
      progress = data.milestones.length > 0 ? Math.round((completedCount / data.milestones.length) * 100) : 0
    }

    const [goal] = await db
      .update(schema.goals)
      .set({
        ...data,
        targetDate: data.targetDate !== undefined ? (data.targetDate ? new Date(data.targetDate) : null) : undefined,
        progress,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.goals.id, req.params.id), eq(schema.goals.userId, req.userId!)))
      .returning()

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' })
    }

    res.json(goal)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    console.error(error)
    res.status(500).json({ message: 'Failed to update goal' })
  }
})

router.patch('/:goalId/milestones/:milestoneId/toggle', async (req: AuthRequest, res) => {
  try {
    const [goal] = await db
      .select()
      .from(schema.goals)
      .where(and(eq(schema.goals.id, req.params.goalId), eq(schema.goals.userId, req.userId!)))
      .limit(1)

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' })
    }

    const milestones = (goal.milestones || []).map((m) =>
      m.id === req.params.milestoneId ? { ...m, completed: !m.completed } : m
    )

    const completedCount = milestones.filter((m) => m.completed).length
    const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0

    const [updated] = await db
      .update(schema.goals)
      .set({ milestones, progress, updatedAt: new Date() })
      .where(eq(schema.goals.id, req.params.goalId))
      .returning()

    res.json(updated)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to toggle milestone' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const [deleted] = await db
      .delete(schema.goals)
      .where(and(eq(schema.goals.id, req.params.id), eq(schema.goals.userId, req.userId!)))
      .returning()

    if (!deleted) {
      return res.status(404).json({ message: 'Goal not found' })
    }

    res.json({ message: 'Goal deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to delete goal' })
  }
})

export default router
