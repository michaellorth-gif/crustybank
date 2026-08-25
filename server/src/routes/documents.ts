import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { documents, documentTemplates, teamMembers, teams } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { AuthRequest } from '../middleware/auth.js'
import { markdownToDocx, docxFilename } from '../lib/mdToDocx.js'

const router = Router()

// Export a document's markdown content as a Word (.docx) file
router.get('/:id/docx', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const doc = await db.select().from(documents).where(eq(documents.id, req.params.id)).get()
    if (!doc) return res.status(404).json({ message: 'Document not found' })
    if (doc.userId !== userId) return res.status(403).json({ message: 'Access denied' })
    if (!doc.content) return res.status(400).json({ message: 'Document has no content to export' })

    const buffer = await markdownToDocx(doc.content, doc.title)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${docxFilename(doc.title)}"`)
    res.send(buffer)
  } catch (error) {
    console.error('Error exporting document to DOCX:', error)
    res.status(500).json({ message: 'Failed to export document' })
  }
})

// Get all documents for the current user (personal + team)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { category, search, teamId } = req.query

    // Get user's personal documents
    let query = db.select().from(documents)

    // Build conditions
    const conditions = [eq(documents.userId, userId)]

    if (category && category !== 'all') {
      conditions.push(eq(documents.category, category as string))
    }

    if (teamId) {
      conditions.push(eq(documents.teamId, teamId as string))
    }

    let docs = await query.where(and(...conditions))

    // Filter by search if provided
    if (search) {
      const searchLower = (search as string).toLowerCase()
      docs = docs.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchLower) ||
          doc.content?.toLowerCase().includes(searchLower) ||
          (doc.tags && doc.tags.some((tag) => tag.toLowerCase().includes(searchLower)))
      )
    }

    res.json(docs)
  } catch (error) {
    console.error('Error fetching documents:', error)
    res.status(500).json({ message: 'Failed to fetch documents' })
  }
})

// Create a new document
const createDocumentSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  category: z.string().default('general'),
  tags: z.array(z.string()).default([]),
  teamId: z.string().optional(),
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const data = createDocumentSchema.parse(req.body)

    // If teamId provided, verify user has access
    if (data.teamId) {
      const team = await db.select().from(teams).where(eq(teams.id, data.teamId)).get()
      if (!team) {
        return res.status(404).json({ message: 'Team not found' })
      }

      const isMember = await db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, data.teamId), eq(teamMembers.userId, userId)))
        .get()

      if (team.ownerId !== userId && !isMember) {
        return res.status(403).json({ message: 'Access denied to team' })
      }
    }

    const [doc] = await db.insert(documents).values({
      userId,
      title: data.title,
      content: data.content,
      category: data.category,
      tags: data.tags,
      teamId: data.teamId,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
    }).returning()

    res.status(201).json(doc)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error creating document:', error)
    res.status(500).json({ message: 'Failed to create document' })
  }
})

// Get document by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    const doc = await db.select().from(documents).where(eq(documents.id, id)).get()
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' })
    }

    // Check access
    if (doc.userId !== userId) {
      if (doc.teamId) {
        const team = await db.select().from(teams).where(eq(teams.id, doc.teamId)).get()
        const isMember = await db
          .select()
          .from(teamMembers)
          .where(and(eq(teamMembers.teamId, doc.teamId), eq(teamMembers.userId, userId)))
          .get()

        if (!team || (team.ownerId !== userId && !isMember)) {
          return res.status(403).json({ message: 'Access denied' })
        }
      } else {
        return res.status(403).json({ message: 'Access denied' })
      }
    }

    res.json(doc)
  } catch (error) {
    console.error('Error fetching document:', error)
    res.status(500).json({ message: 'Failed to fetch document' })
  }
})

// Update document
const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params
    const data = updateDocumentSchema.parse(req.body)

    const doc = await db.select().from(documents).where(eq(documents.id, id)).get()
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' })
    }

    // Check access (owner only for edits)
    if (doc.userId !== userId) {
      return res.status(403).json({ message: 'Only document owner can edit' })
    }

    const [updated] = await db
      .update(documents)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(documents.id, id))
      .returning()

    res.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error updating document:', error)
    res.status(500).json({ message: 'Failed to update document' })
  }
})

// Delete document
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    const doc = await db.select().from(documents).where(eq(documents.id, id)).get()
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' })
    }

    if (doc.userId !== userId) {
      return res.status(403).json({ message: 'Only document owner can delete' })
    }

    await db.delete(documents).where(eq(documents.id, id))
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting document:', error)
    res.status(500).json({ message: 'Failed to delete document' })
  }
})

// Document Templates

// Get all templates
router.get('/templates/list', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { category } = req.query

    let templates
    if (category && category !== 'all') {
      templates = await db
        .select()
        .from(documentTemplates)
        .where(and(eq(documentTemplates.userId, userId), eq(documentTemplates.category, category as string)))
    } else {
      templates = await db.select().from(documentTemplates).where(eq(documentTemplates.userId, userId))
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
  content: z.string().min(1),
  category: z.string().default('general'),
})

router.post('/templates', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const data = createTemplateSchema.parse(req.body)

    const [template] = await db.insert(documentTemplates).values({
      userId,
      name: data.name,
      content: data.content,
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

// Delete template
router.delete('/templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    const template = await db.select().from(documentTemplates).where(eq(documentTemplates.id, id)).get()
    if (!template) {
      return res.status(404).json({ message: 'Template not found' })
    }

    if (template.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' })
    }

    await db.delete(documentTemplates).where(eq(documentTemplates.id, id))
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting template:', error)
    res.status(500).json({ message: 'Failed to delete template' })
  }
})

export default router
