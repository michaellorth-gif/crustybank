// First-pass conflict-of-interest scanning across legal intakes.
// This is a screening aid, NOT a substitute for the firm's conflicts procedure —
// it matches normalized names across every intake's parties and reports hits
// with the relationship in each matter, for attorney evaluation.

import { db } from '../db/index.js'
import { legalIntakes } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export interface Party {
  name: string
  role: string // 'client' | 'adverse party' | 'related party'
}

export interface ConflictHit {
  matchedName: string
  matchedRole: string // role of the matched name in THIS (new) matter
  otherIntakeId: string
  otherClientName: string
  otherMatterType: string
  otherRole: string // role of the matched name in the OTHER matter
  note: string
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|llp|lp|na|n\.a|corp|corporation|company|co|ltd|jr|sr|ii|iii)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
}

// Fuzzy match: exact normalized equality, or containment when both sides are
// long enough that containment is meaningful ("smith" ⊄ every "smithson").
function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.length >= 8 && nb.length >= 8) return na.includes(nb) || nb.includes(na)
  return false
}

// Extract every party we track from an intake, with its role in that matter.
export function extractParties(matterType: string, clientName: string, data: Record<string, unknown>): Party[] {
  const parties: Party[] = [{ name: clientName, role: 'client' }]
  const str = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '')

  if (matterType === 'debt-defense') {
    if (str('plaintiffName')) parties.push({ name: str('plaintiffName'), role: 'adverse party' })
    if (str('originalCreditor')) parties.push({ name: str('originalCreditor'), role: 'related party' })
  } else if (matterType === 'uncontested-divorce') {
    if (str('respondentName')) parties.push({ name: str('respondentName'), role: 'adverse party' })
  } else if (matterType === 'estate-package') {
    if (str('spouseName')) parties.push({ name: str('spouseName'), role: 'related party' })
  } else if (matterType === 'reduced-fee-mva') {
    if (str('otherDriverName')) parties.push({ name: str('otherDriverName'), role: 'adverse party' })
    if (str('liabilityCarrier')) parties.push({ name: str('liabilityCarrier'), role: 'related party' })
  }
  return parties.filter((p) => p.name.trim().length > 1)
}

export async function scanConflicts(
  userId: string,
  matterType: string,
  clientName: string,
  data: Record<string, unknown>,
  excludeIntakeId?: string
): Promise<ConflictHit[]> {
  const newParties = extractParties(matterType, clientName, data)
  const existing = await db.select().from(legalIntakes).where(eq(legalIntakes.userId, userId))

  const hits: ConflictHit[] = []
  for (const intake of existing) {
    if (excludeIntakeId && intake.id === excludeIntakeId) continue
    const otherParties = extractParties(intake.matterType, intake.clientName, intake.data)
    for (const np of newParties) {
      for (const op of otherParties) {
        if (!namesMatch(np.name, op.name)) continue
        // Same client appearing as client in both matters is not a conflict —
        // it's a repeat client. Everything else gets reported.
        if (np.role === 'client' && op.role === 'client' && normalizeName(np.name) === normalizeName(op.name)) {
          hits.push({
            matchedName: np.name,
            matchedRole: np.role,
            otherIntakeId: intake.id,
            otherClientName: intake.clientName,
            otherMatterType: intake.matterType,
            otherRole: op.role,
            note: 'Repeat client — prior matter on file (informational)',
          })
          continue
        }
        const adverse = np.role === 'adverse party' || op.role === 'adverse party'
        hits.push({
          matchedName: np.name,
          matchedRole: np.role,
          otherIntakeId: intake.id,
          otherClientName: intake.clientName,
          otherMatterType: intake.matterType,
          otherRole: op.role,
          note: adverse
            ? `POTENTIAL CONFLICT: "${np.name}" is ${np.role} in this matter and ${op.role} in ${intake.clientName}'s ${intake.matterType} matter — attorney must evaluate before engagement`
            : `Name overlap: "${np.name}" appears as ${np.role} here and ${op.role} in ${intake.clientName}'s ${intake.matterType} matter`,
        })
      }
    }
  }
  return hits
}

// On-demand name search across all intakes' parties (the manual conflicts check).
export async function searchParties(userId: string, query: string): Promise<Array<Party & {
  intakeId: string
  clientName: string
  matterType: string
  status: string
  createdAt: string
}>> {
  const rows = await db.select().from(legalIntakes).where(eq(legalIntakes.userId, userId))
  const results = []
  for (const intake of rows) {
    for (const p of extractParties(intake.matterType, intake.clientName, intake.data)) {
      if (namesMatch(p.name, query) || normalizeName(p.name).includes(normalizeName(query))) {
        results.push({
          ...p,
          intakeId: intake.id,
          clientName: intake.clientName,
          matterType: intake.matterType,
          status: intake.status,
          createdAt: intake.createdAt,
        })
      }
    }
  }
  return results
}
