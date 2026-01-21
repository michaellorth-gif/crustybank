import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { workflows, reminders, tasks, events } from '../db/schema.js'
import { eq, and, gte } from 'drizzle-orm'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get all workflows for the current user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const userWorkflows = await db.select().from(workflows).where(eq(workflows.userId, userId))
    res.json(userWorkflows)
  } catch (error) {
    console.error('Error fetching workflows:', error)
    res.status(500).json({ message: 'Failed to fetch workflows' })
  }
})

// Create a new workflow
const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.enum(['schedule', 'manual', 'event']),
  schedule: z.string().optional(),
  actions: z.array(z.object({
    type: z.string(),
    config: z.record(z.unknown()),
  })).default([]),
  enabled: z.boolean().default(true),
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const data = createWorkflowSchema.parse(req.body)

    const [workflow] = await db.insert(workflows).values({
      userId,
      name: data.name,
      description: data.description,
      trigger: data.trigger,
      schedule: data.schedule,
      actions: data.actions,
      enabled: data.enabled,
    }).returning()

    res.status(201).json(workflow)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error creating workflow:', error)
    res.status(500).json({ message: 'Failed to create workflow' })
  }
})

// Update workflow
const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  trigger: z.enum(['schedule', 'manual', 'event']).optional(),
  schedule: z.string().optional(),
  actions: z.array(z.object({
    type: z.string(),
    config: z.record(z.unknown()),
  })).optional(),
  enabled: z.boolean().optional(),
})

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params
    const data = updateWorkflowSchema.parse(req.body)

    const workflow = await db.select().from(workflows).where(eq(workflows.id, id)).get()
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' })
    }

    if (workflow.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const [updated] = await db
      .update(workflows)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(workflows.id, id))
      .returning()

    res.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error updating workflow:', error)
    res.status(500).json({ message: 'Failed to update workflow' })
  }
})

// Execute workflow manually
router.post('/:id/run', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    const workflow = await db.select().from(workflows).where(eq(workflows.id, id)).get()
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' })
    }

    if (workflow.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' })
    }

    // Execute workflow actions
    const results = []
    for (const action of workflow.actions || []) {
      const result = await executeAction(userId, action)
      results.push(result)
    }

    // Update last run time
    await db
      .update(workflows)
      .set({ lastRun: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(workflows.id, id))

    res.json({ message: 'Workflow executed successfully', results })
  } catch (error) {
    console.error('Error executing workflow:', error)
    res.status(500).json({ message: 'Failed to execute workflow' })
  }
})

// Delete workflow
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    const workflow = await db.select().from(workflows).where(eq(workflows.id, id)).get()
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' })
    }

    if (workflow.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' })
    }

    await db.delete(workflows).where(eq(workflows.id, id))
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting workflow:', error)
    res.status(500).json({ message: 'Failed to delete workflow' })
  }
})

// Reminders

// Get all reminders
router.get('/reminders', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { upcoming } = req.query

    let userReminders
    if (upcoming === 'true') {
      const now = new Date().toISOString()
      userReminders = await db
        .select()
        .from(reminders)
        .where(and(
          eq(reminders.userId, userId),
          eq(reminders.completed, false),
          gte(reminders.reminderTime, now)
        ))
    } else {
      userReminders = await db.select().from(reminders).where(eq(reminders.userId, userId))
    }

    res.json(userReminders)
  } catch (error) {
    console.error('Error fetching reminders:', error)
    res.status(500).json({ message: 'Failed to fetch reminders' })
  }
})

// Create reminder
const createReminderSchema = z.object({
  title: z.string().min(1),
  message: z.string().optional(),
  reminderTime: z.string(),
  recurring: z.boolean().default(false),
  recurrencePattern: z.enum(['daily', 'weekly', 'monthly', 'custom']).optional(),
  relatedTaskId: z.string().optional(),
  relatedEventId: z.string().optional(),
})

router.post('/reminders', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const data = createReminderSchema.parse(req.body)

    const [reminder] = await db.insert(reminders).values({
      userId,
      title: data.title,
      message: data.message,
      reminderTime: data.reminderTime,
      recurring: data.recurring,
      recurrencePattern: data.recurrencePattern,
      relatedTaskId: data.relatedTaskId,
      relatedEventId: data.relatedEventId,
    }).returning()

    res.status(201).json(reminder)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error creating reminder:', error)
    res.status(500).json({ message: 'Failed to create reminder' })
  }
})

// Update reminder
const updateReminderSchema = z.object({
  title: z.string().min(1).optional(),
  message: z.string().optional(),
  reminderTime: z.string().optional(),
  recurring: z.boolean().optional(),
  recurrencePattern: z.enum(['daily', 'weekly', 'monthly', 'custom']).optional(),
  completed: z.boolean().optional(),
})

router.patch('/reminders/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params
    const data = updateReminderSchema.parse(req.body)

    const reminder = await db.select().from(reminders).where(eq(reminders.id, id)).get()
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' })
    }

    if (reminder.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const [updated] = await db
      .update(reminders)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(reminders.id, id))
      .returning()

    res.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error updating reminder:', error)
    res.status(500).json({ message: 'Failed to update reminder' })
  }
})

// Delete reminder
router.delete('/reminders/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    const reminder = await db.select().from(reminders).where(eq(reminders.id, id)).get()
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' })
    }

    if (reminder.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' })
    }

    await db.delete(reminders).where(eq(reminders.id, id))
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting reminder:', error)
    res.status(500).json({ message: 'Failed to delete reminder' })
  }
})

// Smart task prioritization endpoint
router.get('/smart-prioritization', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!

    // Get all incomplete tasks
    const userTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.completed, false)))

    // Calculate priority scores
    const now = new Date()
    const prioritizedTasks = userTasks.map((task) => {
      let score = 0

      // Base priority score
      if (task.priority === 'high') score += 30
      else if (task.priority === 'medium') score += 20
      else score += 10

      // Due date urgency
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate)
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntilDue < 0) score += 50 // Overdue
        else if (daysUntilDue === 0) score += 40 // Due today
        else if (daysUntilDue <= 3) score += 30 // Due within 3 days
        else if (daysUntilDue <= 7) score += 20 // Due within a week
      }

      return { ...task, priorityScore: score }
    })

    // Sort by score descending
    prioritizedTasks.sort((a, b) => b.priorityScore - a.priorityScore)

    res.json(prioritizedTasks)
  } catch (error) {
    console.error('Error calculating task priorities:', error)
    res.status(500).json({ message: 'Failed to calculate task priorities' })
  }
})

// Helper function to execute workflow actions
async function executeAction(userId: string, action: { type: string; config: Record<string, unknown> }) {
  switch (action.type) {
    case 'create_task':
      const taskConfig = action.config as { title: string; description?: string; priority?: string; dueDate?: string }
      const [newTask] = await db.insert(tasks).values({
        userId,
        title: taskConfig.title,
        description: taskConfig.description,
        priority: taskConfig.priority || 'medium',
        dueDate: taskConfig.dueDate,
      }).returning()
      return { type: 'create_task', success: true, taskId: newTask.id }

    case 'create_reminder':
      const reminderConfig = action.config as { title: string; message?: string; reminderTime: string }
      const [newReminder] = await db.insert(reminders).values({
        userId,
        title: reminderConfig.title,
        message: reminderConfig.message,
        reminderTime: reminderConfig.reminderTime,
      }).returning()
      return { type: 'create_reminder', success: true, reminderId: newReminder.id }

    case 'create_event':
      const eventConfig = action.config as { title: string; description?: string; startTime: string; endTime: string }
      const [newEvent] = await db.insert(events).values({
        userId,
        title: eventConfig.title,
        description: eventConfig.description,
        startTime: eventConfig.startTime,
        endTime: eventConfig.endTime,
      }).returning()
      return { type: 'create_event', success: true, eventId: newEvent.id }

    default:
      return { type: action.type, success: false, message: 'Unknown action type' }
  }
}

export default router
