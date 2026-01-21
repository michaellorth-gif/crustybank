import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { emails, emailTemplates } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import OpenAI from 'openai'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

// Get all emails for the current user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { status } = req.query

    let userEmails
    if (status && status !== 'all') {
      userEmails = await db
        .select()
        .from(emails)
        .where(and(eq(emails.userId, userId), eq(emails.status, status as string)))
    } else {
      userEmails = await db.select().from(emails).where(eq(emails.userId, userId))
    }

    res.json(userEmails)
  } catch (error) {
    console.error('Error fetching emails:', error)
    res.status(500).json({ message: 'Failed to fetch emails' })
  }
})

// Create a new email draft
const createEmailSchema = z.object({
  subject: z.string().min(1),
  recipient: z.string().email(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  body: z.string().min(1),
  status: z.enum(['draft', 'scheduled', 'sent']).default('draft'),
  scheduledAt: z.string().optional(),
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const data = createEmailSchema.parse(req.body)

    const [email] = await db.insert(emails).values({
      userId,
      subject: data.subject,
      recipient: data.recipient,
      cc: data.cc,
      bcc: data.bcc,
      body: data.body,
      status: data.status,
      scheduledAt: data.scheduledAt,
    }).returning()

    res.status(201).json(email)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error creating email:', error)
    res.status(500).json({ message: 'Failed to create email' })
  }
})

// Get email by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    const email = await db.select().from(emails).where(eq(emails.id, id)).get()
    if (!email) {
      return res.status(404).json({ message: 'Email not found' })
    }

    if (email.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' })
    }

    res.json(email)
  } catch (error) {
    console.error('Error fetching email:', error)
    res.status(500).json({ message: 'Failed to fetch email' })
  }
})

// Update email
const updateEmailSchema = z.object({
  subject: z.string().min(1).optional(),
  recipient: z.string().email().optional(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  body: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'sent']).optional(),
  scheduledAt: z.string().optional(),
})

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params
    const data = updateEmailSchema.parse(req.body)

    const email = await db.select().from(emails).where(eq(emails.id, id)).get()
    if (!email) {
      return res.status(404).json({ message: 'Email not found' })
    }

    if (email.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' })
    }

    // If marking as sent, set sentAt
    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() }
    if (data.status === 'sent') {
      updateData.sentAt = new Date().toISOString()
    }

    const [updated] = await db
      .update(emails)
      .set(updateData)
      .where(eq(emails.id, id))
      .returning()

    res.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error updating email:', error)
    res.status(500).json({ message: 'Failed to update email' })
  }
})

// Delete email
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    const email = await db.select().from(emails).where(eq(emails.id, id)).get()
    if (!email) {
      return res.status(404).json({ message: 'Email not found' })
    }

    if (email.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' })
    }

    await db.delete(emails).where(eq(emails.id, id))
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting email:', error)
    res.status(500).json({ message: 'Failed to delete email' })
  }
})

// AI-powered email drafting
const generateEmailSchema = z.object({
  prompt: z.string().min(1),
  tone: z.enum(['formal', 'casual', 'friendly', 'professional']).default('professional'),
  recipient: z.string().optional(),
})

router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const data = generateEmailSchema.parse(req.body)

    if (!openai) {
      // Return a demo response if no API key
      return res.json({
        subject: 'Re: Your Request',
        body: `Dear ${data.recipient || 'Recipient'},\n\nThank you for reaching out. ${data.prompt}\n\nPlease let me know if you have any questions.\n\nBest regards`,
      })
    }

    const systemPrompt = `You are an expert email writer. Write professional emails based on user instructions.
Respond with a JSON object containing "subject" and "body" fields.
The tone should be ${data.tone}.
${data.recipient ? `The recipient is: ${data.recipient}` : ''}
Do not include any markdown formatting or code blocks in your response, just the raw JSON.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: data.prompt },
      ],
      temperature: 0.7,
    })

    const response = completion.choices[0].message.content
    try {
      const parsed = JSON.parse(response || '{}')
      res.json(parsed)
    } catch {
      res.json({
        subject: 'Generated Email',
        body: response,
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error generating email:', error)
    res.status(500).json({ message: 'Failed to generate email' })
  }
})

// Email Templates

// Get all templates
router.get('/templates/list', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { category } = req.query

    let templates
    if (category && category !== 'all') {
      templates = await db
        .select()
        .from(emailTemplates)
        .where(and(eq(emailTemplates.userId, userId), eq(emailTemplates.category, category as string)))
    } else {
      templates = await db.select().from(emailTemplates).where(eq(emailTemplates.userId, userId))
    }

    res.json(templates)
  } catch (error) {
    console.error('Error fetching templates:', error)
    res.status(500).json({ message: 'Failed to fetch templates' })
  }
})

// Create template
const createTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  category: z.string().default('general'),
})

router.post('/templates', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const data = createTemplateSchema.parse(req.body)

    const [template] = await db.insert(emailTemplates).values({
      userId,
      name: data.name,
      subject: data.subject,
      body: data.body,
      category: data.category,
    }).returning()

    res.status(201).json(template)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error creating template:', error)
    res.status(500).json({ message: 'Failed to create template' })
  }
})

// Update template
const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().optional(),
  category: z.string().optional(),
})

router.patch('/templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params
    const data = updateTemplateSchema.parse(req.body)

    const template = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).get()
    if (!template) {
      return res.status(404).json({ message: 'Template not found' })
    }

    if (template.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const [updated] = await db
      .update(emailTemplates)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(emailTemplates.id, id))
      .returning()

    res.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error updating template:', error)
    res.status(500).json({ message: 'Failed to update template' })
  }
})

// Delete template
router.delete('/templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    const template = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).get()
    if (!template) {
      return res.status(404).json({ message: 'Template not found' })
    }

    if (template.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' })
    }

    await db.delete(emailTemplates).where(eq(emailTemplates.id, id))
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting template:', error)
    res.status(500).json({ message: 'Failed to delete template' })
  }
})

export default router
