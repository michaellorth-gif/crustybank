import { Router } from 'express'
import { db, schema } from '../db/index.js'
import { eq, and, gte, lte, count } from 'drizzle-orm'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)
    const last7Days = new Date(now)
    last7Days.setDate(now.getDate() - 7)

    // Tasks due today
    const [tasksDueTodayResult] = await db
      .select({ count: count() })
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.userId, req.userId!),
          eq(schema.tasks.completed, false),
          gte(schema.tasks.dueDate, startOfDay),
          lte(schema.tasks.dueDate, endOfDay)
        )
      )

    // Active goals (not 100% complete)
    const [activeGoalsResult] = await db
      .select({ count: count() })
      .from(schema.goals)
      .where(
        and(
          eq(schema.goals.userId, req.userId!),
          lte(schema.goals.progress, 99)
        )
      )

    // Events this week
    const [eventsThisWeekResult] = await db
      .select({ count: count() })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.userId, req.userId!),
          gte(schema.events.startTime, startOfWeek),
          lte(schema.events.startTime, endOfWeek)
        )
      )

    // Notes updated in last 7 days
    const [recentNotesResult] = await db
      .select({ count: count() })
      .from(schema.notes)
      .where(
        and(
          eq(schema.notes.userId, req.userId!),
          gte(schema.notes.updatedAt, last7Days)
        )
      )

    res.json({
      tasksDueToday: tasksDueTodayResult?.count || 0,
      activeGoals: activeGoalsResult?.count || 0,
      eventsThisWeek: eventsThisWeekResult?.count || 0,
      recentNotes: recentNotesResult?.count || 0,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to fetch dashboard stats' })
  }
})

export default router
