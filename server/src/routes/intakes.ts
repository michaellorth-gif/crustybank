import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { legalIntakes, tasks, documents, firmSettings } from '../db/schema.js'
import { eq, desc, and, like, inArray } from 'drizzle-orm'
import { AuthRequest } from '../middleware/auth.js'
import {
  triageDebtDefense,
  triageExpunction,
  triageDivorce,
  triageEstate,
  triageMva,
  DebtIntakeData,
  ExpunctionIntakeData,
  DivorceIntakeData,
  EstateIntakeData,
  MvaIntakeData,
} from '../lib/legalTriage.js'
import { texasTodayISO } from '../lib/legalTriage.js'
import { generateDocument, DOC_TYPES, Firm } from '../lib/docgen.js'
import { STAGES, MILESTONES, findMilestone } from '../lib/matterPipeline.js'
import { scanConflicts, searchParties } from '../lib/conflicts.js'

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
  respondentName: z.string().optional(),
  respondentAddress: z.string().optional(),
  formerName: z.string().optional(),
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

const estateDataSchema = z.object({
  maritalStatus: z.enum(['single', 'married', 'widowed', 'divorced']),
  spouseName: z.string().optional(),
  mirrorPackageForSpouse: z.boolean().optional(),
  children: z.array(z.object({
    name: z.string().min(1),
    minor: z.boolean(),
    fromPriorRelationship: z.boolean().optional(),
  })).default([]),
  executorName: z.string().min(1),
  executorAltName: z.string().optional(),
  guardianName: z.string().optional(),
  financialAgent: z.string().min(1),
  financialAgentAlt: z.string().optional(),
  medicalAgent: z.string().min(1),
  medicalAgentAlt: z.string().optional(),
  poaEffective: z.enum(['immediately', 'incapacity']),
  residuaryPlan: z.enum(['spouse-then-children', 'children-equally', 'other']),
  residuaryOther: z.string().optional(),
  trustAge: z.number().int().min(18).max(40).optional(),
  estateOverExemptionRisk: z.boolean(),
  specialNeedsBeneficiary: z.boolean(),
  disinheritance: z.boolean(),
  capacityConcerns: z.boolean(),
  complexAssets: z.boolean(),
  outOfStateProperty: z.boolean(),
  priorWill: z.boolean(),
  homesteadCounty: z.string().optional(),
  notes: z.string().optional(),
}).passthrough()

const mvaDataSchema = z.object({
  accidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accidentCounty: z.string().optional(),
  liabilityScenario: z.enum(['rear-ended', 'other-driver-cited', 'other-driver-dwi', 'left-turn-red-light', 'disputed', 'client-cited', 'hit-and-run', 'other']),
  clientCited: z.boolean(),
  clientPartialFault: z.boolean(),
  injurySeverity: z.enum(['soft-tissue', 'fractures', 'surgery', 'catastrophic']),
  fatality: z.boolean(),
  treatmentStatus: z.enum(['not-started', 'treating', 'complete']),
  providers: z.string().optional(),
  otherDriverName: z.string().optional(),
  liabilityCarrier: z.string().optional(),
  claimNumber: z.string().optional(),
  clientAutoCarrier: z.string().optional(),
  umUimCoverage: z.enum(['yes', 'no', 'unknown']),
  pipMedPay: z.enum(['yes', 'no', 'unknown']),
  healthInsurance: z.enum(['none', 'private', 'medicare', 'medicaid', 'erisa', 'unknown']),
  commercialVehicle: z.boolean(),
  priorAttorney: z.boolean(),
  recordedStatementGiven: z.boolean(),
  clientIsMinor: z.boolean(),
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
  z.object({
    matterType: z.literal('estate-package'),
    clientName: z.string().min(1),
    clientEmail: z.string().email().optional().or(z.literal('')),
    clientPhone: z.string().optional(),
    data: estateDataSchema,
  }),
  z.object({
    matterType: z.literal('reduced-fee-mva'),
    clientName: z.string().min(1),
    clientEmail: z.string().email().optional().or(z.literal('')),
    clientPhone: z.string().optional(),
    data: mvaDataSchema,
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
    case 'estate-package':
      return triageEstate(data as unknown as EstateIntakeData)
    case 'reduced-fee-mva':
      return triageMva(data as unknown as MvaIntakeData)
    default:
      return {}
  }
}

// The one deadline task tracked per intake (answer deadline / SOL decision point).
// Shared by creation and by PATCH re-triage so the calendared task always matches
// the current triage.
function deadlineTaskValues(
  matterType: string,
  clientName: string,
  data: Record<string, unknown>,
  triage: Record<string, unknown>
): { title: string; description: string; priority: string; dueDate: string } | null {
  if (matterType === 'debt-defense') {
    const deadline = (triage as { answerDeadline?: { deadline: string; internalDeadline: string; basis: string; caveat: string } }).answerDeadline
    if (!deadline) return null
    return {
      title: `ANSWER DUE ${deadline.deadline} — ${clientName} (${data.plaintiffName})`,
      description: `Debt-defense answer deadline. Internal deadline ${deadline.internalDeadline} (3 business days early). ${deadline.basis}. ${deadline.caveat}`,
      priority: 'high',
      dueDate: deadline.internalDeadline,
    }
  }
  if (matterType === 'reduced-fee-mva') {
    const limitations = (triage as { limitations?: { solDate: string; basis: string } }).limitations
    if (!limitations) return null
    const decisionPoint = new Date(new Date(`${limitations.solDate}T12:00:00Z`).getTime() - 90 * 86400000)
      .toISOString().slice(0, 10)
    return {
      title: `MVA LIMITATIONS ${limitations.solDate} — file-or-resolve decision — ${clientName}`,
      description: `Statute of limitations ${limitations.solDate}. ${limitations.basis}. This task is the 90-day decision point: resolve, file suit (reduced fee converts per engagement letter), or document the plan with the attorney.`,
      priority: 'high',
      dueDate: decisionPoint,
    }
  }
  return null
}

// Shared creation path used by the authenticated route and the public portal.
export async function createIntakeRecord(
  userId: string,
  body: z.infer<typeof createIntakeSchema>,
  source: 'internal' | 'public'
) {
  const triage = runTriage(body.matterType, body.data)
  triage.conflictHits = await scanConflicts(userId, body.matterType, body.clientName, body.data)

  let relatedTaskId: string | undefined
  const taskValues = deadlineTaskValues(body.matterType, body.clientName, body.data, triage)
  if (taskValues) {
    const [task] = await db.insert(tasks).values({ userId, ...taskValues }).returning()
    relatedTaskId = task.id
  }

  const [intake] = await db.insert(legalIntakes).values({
    userId,
    matterType: body.matterType,
    clientName: body.clientName,
    clientEmail: body.clientEmail || null,
    clientPhone: body.clientPhone || null,
    source,
    data: body.data as Record<string, unknown>,
    triage,
    relatedTaskId,
  }).returning()

  return intake
}

export { createIntakeSchema }

// Manual conflicts search across all intake parties (must precede /:id routes)
router.get('/conflicts-search', async (req: AuthRequest, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    if (q.length < 3) return res.status(400).json({ message: 'Query must be at least 3 characters' })
    const results = await searchParties(req.userId!, q)
    res.json({
      query: q,
      results,
      disclaimer: 'First-pass name scan across intakes only — not a substitute for the firm conflicts procedure.',
    })
  } catch (error) {
    console.error('Error searching conflicts:', error)
    res.status(500).json({ message: 'Failed to search conflicts' })
  }
})

// Upcoming legal deadlines across open matters (for the dashboard)
router.get('/deadlines', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const rows = await db.select().from(legalIntakes).where(eq(legalIntakes.userId, userId))
    const today = texasTodayISO()
    const todayMs = new Date(`${today}T00:00:00Z`).getTime()
    const deadlines: Array<{ intakeId: string; clientName: string; matterType: string; label: string; date: string; daysLeft: number }> = []

    for (const intake of rows) {
      if (intake.status === 'declined' || intake.stage === 'closed') continue

      if (intake.matterType === 'debt-defense' && intake.stage === 'intake') {
        const deadline = (intake.triage as { answerDeadline?: { deadline: string } } | null)?.answerDeadline?.deadline
        if (deadline) {
          deadlines.push({
            intakeId: intake.id,
            clientName: intake.clientName,
            matterType: intake.matterType,
            label: 'Answer due',
            date: deadline,
            daysLeft: Math.round((new Date(`${deadline}T00:00:00Z`).getTime() - todayMs) / 86400000),
          })
        }
      }

      if (intake.matterType === 'reduced-fee-mva' && !['settled', 'closed'].includes(intake.stage)) {
        const sol = (intake.triage as { limitations?: { solDate: string } } | null)?.limitations?.solDate
        if (sol) {
          deadlines.push({
            intakeId: intake.id,
            clientName: intake.clientName,
            matterType: intake.matterType,
            label: 'MVA limitations (file suit by)',
            date: sol,
            daysLeft: Math.round((new Date(`${sol}T00:00:00Z`).getTime() - todayMs) / 86400000),
          })
        }
      }

      if (intake.matterType === 'uncontested-divorce' && intake.keyDates?.petitionFiled && intake.stage !== 'proved-up') {
        const filed = intake.keyDates.petitionFiled.date
        const day61 = new Date(new Date(`${filed}T00:00:00Z`).getTime() + 61 * 86400000).toISOString().slice(0, 10)
        deadlines.push({
          intakeId: intake.id,
          clientName: intake.clientName,
          matterType: intake.matterType,
          label: '60-day waiting period ends',
          date: day61,
          daysLeft: Math.round((new Date(`${day61}T00:00:00Z`).getTime() - todayMs) / 86400000),
        })
      }
    }

    deadlines.sort((a, b) => a.daysLeft - b.daysLeft)
    res.json(deadlines)
  } catch (error) {
    console.error('Error computing deadlines:', error)
    res.status(500).json({ message: 'Failed to compute deadlines' })
  }
})

// Pipeline metadata for the client UI (must precede /:id routes)
router.get('/meta', (_req: AuthRequest, res: Response) => {
  res.json({
    docTypes: DOC_TYPES,
    stages: STAGES,
    milestones: Object.fromEntries(
      Object.entries(MILESTONES).map(([mt, defs]) => [mt, defs.map((d) => ({ id: d.id, label: d.label }))])
    ),
  })
})

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
    const intake = await createIntakeRecord(userId, body, 'internal')
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
  stage: z.string().optional(),
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
    let relatedTaskId = intake.relatedTaskId
    if (updates.data) {
      // Re-validate the merged payload against the matter type's schema, then re-triage
      const merged = { ...intake.data, ...updates.data }
      const schema = intake.matterType === 'debt-defense' ? debtDataSchema
        : intake.matterType === 'expunction' ? expunctionDataSchema
        : intake.matterType === 'estate-package' ? estateDataSchema
        : intake.matterType === 'reduced-fee-mva' ? mvaDataSchema
        : divorceDataSchema
      data = schema.parse(merged) as Record<string, unknown>
      triage = runTriage(intake.matterType, data)
      triage.conflictHits = await scanConflicts(userId, intake.matterType, intake.clientName, data, intake.id)

      // Keep the deadline task in sync with the recomputed triage — a corrected
      // service or accident date must move the calendared deadline with it.
      const taskValues = deadlineTaskValues(intake.matterType, intake.clientName, data, triage as Record<string, unknown>)
      if (taskValues) {
        const existing = relatedTaskId
          ? await db.select().from(tasks).where(eq(tasks.id, relatedTaskId)).get()
          : undefined
        if (existing) {
          await db.update(tasks)
            .set({ ...taskValues, updatedAt: new Date().toISOString() })
            .where(eq(tasks.id, existing.id))
        } else {
          const [task] = await db.insert(tasks).values({ userId, ...taskValues }).returning()
          relatedTaskId = task.id
        }
      }
    }

    if (updates.stage && !(STAGES[intake.matterType] || []).includes(updates.stage)) {
      return res.status(400).json({ message: `Invalid stage for ${intake.matterType}` })
    }

    const [updated] = await db
      .update(legalIntakes)
      .set({
        status: updates.status ?? intake.status,
        stage: updates.stage ?? intake.stage,
        reviewNotes: updates.reviewNotes ?? intake.reviewNotes,
        data,
        triage,
        relatedTaskId,
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

// Generate a draft document from an intake into the Documents system
const generateSchema = z.object({ docType: z.string().min(1) })

router.post('/:id/generate', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { docType } = generateSchema.parse(req.body)

    const intake = await db.select().from(legalIntakes).where(eq(legalIntakes.id, req.params.id)).get()
    if (!intake) return res.status(404).json({ message: 'Intake not found' })
    if (intake.userId !== userId) return res.status(403).json({ message: 'Access denied' })

    const validTypes = (DOC_TYPES[intake.matterType] || []).map((d) => d.id)
    if (!validTypes.includes(docType)) {
      return res.status(400).json({ message: `Invalid docType for ${intake.matterType}. Valid: ${validTypes.join(', ')}` })
    }

    const settings = await db.select().from(firmSettings).where(eq(firmSettings.userId, userId)).get()
    // Brand defaults fill anything Firm Settings leaves blank
    const firm: Firm = {
      firmName: 'ClearFee Legal PLLC',
      attorneyName: 'Michael L Orth',
      ...((settings?.data as Firm) || {}),
    }

    const doc = generateDocument(intake.matterType, docType, intake.data, intake.clientName, firm)
    const [saved] = await db.insert(documents).values({
      userId,
      title: doc.title,
      content: doc.content,
      category: doc.category,
      tags: [intake.matterType, `intake:${intake.id}`, docType],
    }).returning()

    res.status(201).json(saved)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error generating document:', error)
    res.status(500).json({ message: 'Failed to generate document' })
  }
})

// List documents generated from this intake
router.get('/:id/documents', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const intake = await db.select().from(legalIntakes).where(eq(legalIntakes.id, req.params.id)).get()
    if (!intake) return res.status(404).json({ message: 'Intake not found' })
    if (intake.userId !== userId) return res.status(403).json({ message: 'Access denied' })

    const docs = await db
      .select()
      .from(documents)
      .where(and(eq(documents.userId, userId), like(documents.tags, `%intake:${intake.id}%`)))
      .orderBy(desc(documents.createdAt))
    res.json(docs)
  } catch (error) {
    console.error('Error listing intake documents:', error)
    res.status(500).json({ message: 'Failed to list documents' })
  }
})

// Record a milestone: stores the date, creates the downstream deadline tasks,
// and advances the pipeline stage.
const milestoneSchema = z.object({
  milestone: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

router.post('/:id/milestone', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { milestone, date } = milestoneSchema.parse(req.body)

    const intake = await db.select().from(legalIntakes).where(eq(legalIntakes.id, req.params.id)).get()
    if (!intake) return res.status(404).json({ message: 'Intake not found' })
    if (intake.userId !== userId) return res.status(403).json({ message: 'Access denied' })

    const def = findMilestone(intake.matterType, milestone)
    if (!def) return res.status(400).json({ message: `Unknown milestone "${milestone}" for ${intake.matterType}` })

    const keyDates = { ...(intake.keyDates || {}) }
    const warning = def.warn ? def.warn(date, intake.data, keyDates) : null

    // A warned milestone (e.g. waiver signed before filing) is NOT recorded —
    // the defect must be cured and the milestone re-submitted with a valid date.
    if (warning) {
      return res.json({ intake, createdTasks: [], warning })
    }

    // Re-recording a milestone replaces its previously created tasks so their
    // due dates track the new date (e.g. a continued trial setting).
    const oldTaskIds = keyDates[milestone]?.taskIds || []
    if (oldTaskIds.length > 0) {
      await db.delete(tasks).where(and(inArray(tasks.id, oldTaskIds), eq(tasks.userId, userId)))
    }

    const taskIds: string[] = []
    const createdTasks = []
    for (const t of def.tasks(date, intake.data)) {
      const [task] = await db.insert(tasks).values({
        userId,
        title: `${t.title} — ${intake.clientName}`,
        description: t.description,
        priority: t.priority,
        dueDate: t.dueDate,
      }).returning()
      taskIds.push(task.id)
      createdTasks.push(task)
    }

    keyDates[milestone] = { date, taskIds }
    const [updated] = await db
      .update(legalIntakes)
      .set({
        keyDates,
        stage: def.advanceStageTo ?? intake.stage,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(legalIntakes.id, req.params.id))
      .returning()

    res.json({ intake: updated, createdTasks, warning: null })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors })
    }
    console.error('Error recording milestone:', error)
    res.status(500).json({ message: 'Failed to record milestone' })
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
