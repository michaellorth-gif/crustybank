import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users, tasks, teams, documents, emails, goals, notes, events } from '../db/schema.js'
import { eq, count, desc } from 'drizzle-orm'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

// Admin middleware - checks if user is admin
const adminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!
    const user = await db.select().from(users).where(eq(users.id, userId)).get()

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }

    next()
  } catch (error) {
    console.error('Admin middleware error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// Get admin dashboard stats
router.get('/stats', adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    // Total users
    const [userCount] = await db.select({ count: count() }).from(users)

    // Active users (logged in within last 7 days) - simplified, just count all for now
    const activeUserCount = userCount.count

    // Total tasks
    const [taskCount] = await db.select({ count: count() }).from(tasks)

    // Total teams
    const [teamCount] = await db.select({ count: count() }).from(teams)

    // Total documents
    const [documentCount] = await db.select({ count: count() }).from(documents)

    // Total emails
    const [emailCount] = await db.select({ count: count() }).from(emails)

    // Recent activity (simplified - just return recent users)
    const recentUsers = await db
      .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10)

    const recentActivity = recentUsers.map((user) => ({
      id: user.id,
      userId: user.id,
      userName: user.name,
      action: 'registered',
      itemType: 'user',
      itemTitle: user.email,
      timestamp: user.createdAt,
    }))

    res.json({
      totalUsers: userCount.count,
      activeUsers: activeUserCount,
      totalTasks: taskCount.count,
      totalTeams: teamCount.count,
      totalDocuments: documentCount.count,
      totalEmails: emailCount.count,
      recentActivity,
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    res.status(500).json({ message: 'Failed to fetch admin stats' })
  }
})

// Get all users (admin only)
router.get('/users', adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))

    // Get stats for each user
    const usersWithStats = await Promise.all(
      allUsers.map(async (user) => {
        const [taskCount] = await db.select({ count: count() }).from(tasks).where(eq(tasks.userId, user.id))
        const [goalCount] = await db.select({ count: count() }).from(goals).where(eq(goals.userId, user.id))
        const [noteCount] = await db.select({ count: count() }).from(notes).where(eq(notes.userId, user.id))
        const [eventCount] = await db.select({ count: count() }).from(events).where(eq(events.userId, user.id))

        return {
          ...user,
          stats: {
            tasks: taskCount.count,
            goals: goalCount.count,
            notes: noteCount.count,
            events: eventCount.count,
          },
        }
      })
    )

    res.json(usersWithStats)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ message: 'Failed to fetch users' })
  }
})

// Update user role (admin only)
const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'user']),
})

router.patch('/users/:userId/role', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const currentUserId = req.userId!
    const data = updateUserRoleSchema.parse(req.body)

    // Prevent removing own admin status
    if (userId === currentUserId && data.role !== 'admin') {
      return res.status(400).json({ message: 'Cannot remove your own admin status' })
    }

    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const [updated] = await db
      .update(users)
      .set({ role: data.role, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })

    res.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error updating user role:', error)
    res.status(500).json({ message: 'Failed to update user role' })
  }
})

// Delete user (admin only)
router.delete('/users/:userId', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const currentUserId = req.userId!

    // Prevent deleting own account
    if (userId === currentUserId) {
      return res.status(400).json({ message: 'Cannot delete your own account' })
    }

    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    await db.delete(users).where(eq(users.id, userId))
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ message: 'Failed to delete user' })
  }
})

// Get system overview (admin only)
router.get('/overview', adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    // Get counts of all entity types
    const [userCount] = await db.select({ count: count() }).from(users)
    const [taskCount] = await db.select({ count: count() }).from(tasks)
    const [goalCount] = await db.select({ count: count() }).from(goals)
    const [noteCount] = await db.select({ count: count() }).from(notes)
    const [eventCount] = await db.select({ count: count() }).from(events)
    const [teamCount] = await db.select({ count: count() }).from(teams)
    const [documentCount] = await db.select({ count: count() }).from(documents)
    const [emailCount] = await db.select({ count: count() }).from(emails)

    res.json({
      users: userCount.count,
      tasks: taskCount.count,
      goals: goalCount.count,
      notes: noteCount.count,
      events: eventCount.count,
      teams: teamCount.count,
      documents: documentCount.count,
      emails: emailCount.count,
    })
  } catch (error) {
    console.error('Error fetching system overview:', error)
    res.status(500).json({ message: 'Failed to fetch system overview' })
  }
})

export default router
