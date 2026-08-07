import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { legalIntakes, tasks } from '../db/schema.js'
import { eq, desc, and } from 'drizzle-orm'
import { AuthRequest } from '../middleware/auth.js'
import {
  triageDebtDefense,
  triageExpunction,
  triageDivorce,
  DebtIntakeData,
  ExpunctionIntakeData,
  DivorceIntakeData,
} from '../lib/legalTriage.js'

const router = Router()

const debtDataSchema = z.object({
  courtType: z.enum(['justice', 'county', 'district']),
  county: z.string().min(1),
  causeNumber: z.string().optional(),
  plaintiffName: z.string().min(1),
  plaintiffFirm: z.string().optional(),
  amountClaimed: z.number().nonnegative().optional(),
  served: z.boolean(),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  defaultJudgmentSigned: z.boolean().optional(),
  swornPetition: z.boolean().optional(),
  originalCreditor: z.string().optional(),
  recognizesDebt: z.enum(['yes', 'no', 'unsure', 'identity-theft']),
  lastPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priorBankruptcy: z.boolean().optional(),
  notes: z.string().optional(),
}).passthrough()

const expunctionDataSchema = z.object({
  arrests: z.array(z.object({
    arrestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    county: z.string().min(1),
    agency: z.string().optional(),
    offense: z.string().min(1),
    level: z.enum(['classC', 'classB', 'classA', 'felony']),
    disposition: z.enum([
      'never-charged', 'dismissed', 'acquitted', 'diversion-completed',
      'deferred-completed', 'probation-completed', 'convicted', 'pending',
    ]),
    dispositionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sameTransactionFelony: z.boolean().optional(),
  }).passthrough()).min(1),
  priorExpunction: z.boolean().optional(),
  notes: z.string().optional(),
}).passthrough()

const divorceDataSchema = z.object({
  residencyStateSixMonths: z.boolean(),
  residencyCountyNinetyDays: z.boolean(),
  filingCounty: z.string().min(1),
  minorChildren: z.boolean(),
  wifePregnant: z.boolean(),
  realProperty: z.boolean(),
  retirementDivision: z.boolean(),
  fullAgreement: z.boolean(),
  familyViolence: z.boolean(),
  spouseWillSignWaiver: z.boolean(),
  activeDutyDeployed: z.boolean(),
  marriageDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  separationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nameChangeRequested: z.boolean().optional(),
  notes: z.string().optional(),
}).passthrough()

const createIntakeSchema = z.discriminatedUnion('matterType', [
  z.object({
    matterType: z.literal('debt-defense'),
    clientName: z.string().min(1),
    clientEmail: z.string().email().optional().or(z.literal('')),
    clientPhone: z.string().optional(),
    data: debtDataSchema,
  }),
  z.object({
    matterType: z.literal('expunction'),
    clientName: z.string().min(1),
    clientEmail: z.string().email().optional().or(z.literal('')),
    clientPhone: z.string().optional(),
    data: expunctionDataSchema,
  }),
  z.object({
    matterType: z.literal('uncontested-divorce'),
    clientName: z.string().min(1),
    clientEmail: z.string().email().optional().or(z.literal('')),
    clientPhone: z.string().optional(),
    data: divorceDataSchema,
  }),
])

function runTriage(matterType: string, data: Record<string, unknown>): Record<string, unknown> {
  switch (matterType) {
    case 'debt-defense':
      return triageDebtDefense(data as unknown as DebtIntakeData)
    case 'expunction':
      return triageExpunction(data as unknown as ExpunctionIntakeData)
    case 'uncontested-divorce':
      return triageDivorce(data as unknown as DivorceIntakeData)
    default:
      return {}
  }
}

// List intakes (newest first), optional ?matterType= and ?status= filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { matterType, status } = req.query
    const conditions = [eq(legalIntakes.userId, userId)]
    if (typeof matterType === 'string' && matterType) conditions.push(eq(legalIntakes.matterType, matterType))
    if (typeof status === 'string' && status) conditions.push(eq(legalIntakes.status, status))

    const rows = await db
      .select()
      .from(legalIntakes)
      .where(and(...conditions))
      .orderBy(desc(legalIntakes.createdAt))
    res.json(rows)
  } catch (error) {
    console.error('Error fetching intakes:', error)
    res.status(500).json({ message: 'Failed to fetch intakes' })
  }
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const intake = await db.select().from(legalIntakes).where(eq(legalIntakes.id, req.params.id)).get()
    if (!intake) return res.status(404).json({ message: 'Intake not found' })
    if (intake.userId !== userId) return res.status(403).json({ message: 'Access denied' })
    res.json(intake)
  } catch (error) {
    console.error('Error fetching intake:', error)
    res.status(500).json({ message: 'Failed to fetch intake' })
  }
})

// Create an intake: validates, runs triage, and (for served debt cases) creates a
// high-priority task carrying the internal answer deadline.
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const body = createIntakeSchema.parse(req.body)
    const triage = runTriage(body.matterType, body.data)

    let relatedTaskId: string | undefined
    if (body.matterType === 'debt-defense') {
      const deadline = (triage as { answerDeadline?: { deadline: string; internalDeadline: string; basis: string; caveat: string } }).answerDeadline
      if (deadline) {
        const [task] = await db.insert(tasks).values({
          userId,
          title: `ANSWER DUE ${deadline.deadline} — ${body.clientName} (${body.data.plaintiffName})`,
          description: `Debt-defense answer deadline. Internal deadline ${deadline.internalDeadline} (3 business days early). ${deadline.basis}. ${deadline.caveat}`,
          priority: 'high',
          dueDate: deadline.internalDeadline,
        }).returning()
        relatedTaskId = task.id
      }
    }

    const [intake] = await db.insert(legalIntakes).values({
      userId,
      matterType: body.matterType,
      clientName: body.clientName,
      clientEmail: body.clientEmail || null,
      clientPhone: body.clientPhone || null,
      data: body.data as Record<string, unknown>,
      triage,
      relatedTaskId,
    }).returning()

    res.status(201).json(intake)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error creating intake:', error)
    res.status(500).json({ message: 'Failed to create intake' })
  }
})

// Update status / review notes / data (data changes re-run triage)
const updateIntakeSchema = z.object({
  status: z.enum(['new', 'in-review', 'accepted', 'declined']).optional(),
  reviewNotes: z.string().optional(),
  data: z.record(z.unknown()).optional(),
})

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const updates = updateIntakeSchema.parse(req.body)

    const intake = await db.select().from(legalIntakes).where(eq(legalIntakes.id, req.params.id)).get()
    if (!intake) return res.status(404).json({ message: 'Intake not found' })
    if (intake.userId !== userId) return res.status(403).json({ message: 'Access denied' })

    let triage = intake.triage
    let data = intake.data
    if (updates.data) {
      // Re-validate the merged payload against the matter type's schema, then re-triage
      const merged = { ...intake.data, ...updates.data }
      const schema = intake.matterType === 'debt-defense' ? debtDataSchema
        : intake.matterType === 'expunction' ? expunctionDataSchema
        : divorceDataSchema
      data = schema.parse(merged) as Record<string, unknown>
      triage = runTriage(intake.matterType, data)
    }

    const [updated] = await db
      .update(legalIntakes)
      .set({
        status: updates.status ?? intake.status,
        reviewNotes: updates.reviewNotes ?? intake.reviewNotes,
        data,
        triage,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(legalIntakes.id, req.params.id))
      .returning()

    res.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error updating intake:', error)
    res.status(500).json({ message: 'Failed to update intake' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const intake = await db.select().from(legalIntakes).where(eq(legalIntakes.id, req.params.id)).get()
    if (!intake) return res.status(404).json({ message: 'Intake not found' })
    if (intake.userId !== userId) return res.status(403).json({ message: 'Access denied' })

    await db.delete(legalIntakes).where(eq(legalIntakes.id, req.params.id))
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting intake:', error)
    res.status(500).json({ message: 'Failed to delete intake' })
  }
})

export default router
