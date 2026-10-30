// Triage engine for legal intake forms. Computes the same first-pass analysis the
// practice-area skills (.claude/skills/*) perform in Step 1, so every submission
// arrives pre-triaged for attorney review. All outputs are drafts for review, not
// legal conclusions.

export type DebtCourtType = 'justice' | 'county' | 'district'

export interface DebtIntakeData {
  courtType: DebtCourtType
  county: string
  causeNumber?: string
  plaintiffName: string
  plaintiffFirm?: string
  amountClaimed?: number
  served: boolean
  serviceDate?: string // ISO date
  defaultJudgmentSigned?: boolean
  swornPetition?: boolean
  originalCreditor?: string
  recognizesDebt: 'yes' | 'no' | 'unsure' | 'identity-theft'
  lastPaymentDate?: string // ISO date, approximate
  priorBankruptcy?: boolean
  [key: string]: unknown
}

const DAY_MS = 24 * 60 * 60 * 1000

function parseISODate(iso: string): Date {
  // Anchor to noon UTC so date arithmetic is immune to timezone shifts
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`)
}

// "Today" for a Texas practice is the Central-time calendar date, regardless of
// the server's timezone — using toISOString() would roll a day ahead every
// evening after 7pm Central and falsely flag deadlines as passed.
export function texasTodayISO(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS)
}

function rollForwardFromWeekend(d: Date): Date {
  // Sunday = 0, Saturday = 6 (UTC — dates are noon-UTC anchored)
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d = addDays(d, 1)
  return d
}

function previousBusinessDays(d: Date, n: number): Date {
  let cur = d
  let remaining = n
  while (remaining > 0) {
    cur = addDays(cur, -1)
    if (cur.getUTCDay() !== 0 && cur.getUTCDay() !== 6) remaining--
  }
  return cur
}

export function computeAnswerDeadline(serviceDateISO: string, courtType: DebtCourtType): {
  deadline: string
  internalDeadline: string
  basis: string
  caveat: string
} {
  const service = parseISODate(serviceDateISO)
  let deadline: Date
  let basis: string

  if (courtType === 'justice') {
    // End of the 14th day after the day of service; weekend rolls forward.
    deadline = rollForwardFromWeekend(addDays(service, 14))
    basis = 'TRCP 502.5(d): end of the 14th day after service (weekend rolled forward)'
  } else {
    // 10:00 a.m. on the Monday next after the expiration of 20 days after service.
    const day20 = addDays(service, 20)
    deadline = addDays(day20, 1)
    while (deadline.getUTCDay() !== 1) deadline = addDays(deadline, 1)
    basis = 'TRCP 99(b): 10:00 a.m. Monday next after expiration of 20 days from service'
  }

  return {
    deadline: toISODate(deadline),
    internalDeadline: toISODate(previousBusinessDays(deadline, 3)),
    basis,
    caveat: 'Court holidays are not accounted for — verify against the court calendar.',
  }
}

// Shared plaintiff classification, used by triage and by the answer generator so
// the two can never disagree. Comparing full normalized names (not first words)
// avoids misreading "American Recovery Systems" as "American Express".
const KNOWN_DEBT_BUYERS =
  /midland|portfolio recovery|lvnv|jefferson capital|cavalry|crown asset|velocity|absolute resolutions|second round|cascade|unifund|pra group|pra receivables/i

function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|llp|lp|na|n\.a|corp|corporation|company|co|ltd|usa)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function classifyPlaintiff(plaintiffName: string, originalCreditor?: string): {
  label: string
  assignee: boolean
} {
  if (KNOWN_DEBT_BUYERS.test(plaintiffName)) {
    return { label: 'debt buyer (known portfolio purchaser)', assignee: true }
  }
  const original = normalizeEntityName(originalCreditor || '')
  if (!original) {
    return { label: 'unclassified — confirm against petition', assignee: false }
  }
  const plaintiff = normalizeEntityName(plaintiffName)
  if (plaintiff.includes(original) || original.includes(plaintiff)) {
    return { label: 'original creditor (apparent)', assignee: false }
  }
  return { label: 'likely assignee — plaintiff differs from original creditor', assignee: true }
}

export function triageDebtDefense(data: DebtIntakeData, now = new Date()): Record<string, unknown> {
  const flags: string[] = []
  const today = parseISODate(texasTodayISO(now))

  let deadlineInfo: ReturnType<typeof computeAnswerDeadline> | null = null
  let daysRemaining: number | null = null
  if (data.served && data.serviceDate) {
    deadlineInfo = computeAnswerDeadline(data.serviceDate, data.courtType)
    daysRemaining = Math.round((parseISODate(deadlineInfo.deadline).getTime() - today.getTime()) / DAY_MS)
    if (daysRemaining < 0) {
      flags.push(
        data.defaultJudgmentSigned
          ? 'DEADLINE PASSED and default judgment signed — motion for new trial / bill of review analysis; OUTSIDE flat-fee product'
          : 'DEADLINE PASSED — check whether default has been taken; answer immediately'
      )
    } else if (daysRemaining <= 5) {
      flags.push(`URGENT: only ${daysRemaining} day(s) to the answer deadline`)
    }
  } else {
    flags.push('Not yet served — deadline clock has not started; monitor and prepare')
  }

  // Limitations screen (4 years, Tex. Civ. Prac. & Rem. Code § 16.004).
  // What matters is limitations AT FILING — measure to the service date (a
  // conservative proxy for the filing date) when we have one, else to today.
  let limitations: string = 'unknown — last payment date not provided'
  if (data.lastPaymentDate) {
    const measureTo = data.serviceDate ? parseISODate(data.serviceDate) : today
    const measureLabel = data.serviceDate ? 'at service (filing is earlier — verify)' : 'as of today (filing date unknown)'
    const yearsSince = (measureTo.getTime() - parseISODate(data.lastPaymentDate).getTime()) / (365.25 * DAY_MS)
    if (yearsSince >= 4) {
      limitations = `LIKELY TIME-BARRED ${measureLabel} — verify accrual from account records (accrual runs from default, not last payment; beware re-aged credit-report dates)`
      flags.push('Limitations defense likely (CPRC § 16.004) — also screen Fin. Code § 392.307 / FDCPA counterclaims')
    } else if (yearsSince >= 3.5) {
      limitations = `BORDERLINE ${measureLabel} — within 6 months of the 4-year bar; pin down the default date`
    } else {
      limitations = `within limitations (~${yearsSince.toFixed(1)} years from last payment ${measureLabel})`
    }
  }

  // Plaintiff classification (drives verified denials + proof attacks)
  const { label: plaintiffClass, assignee } = classifyPlaintiff(data.plaintiffName, data.originalCreditor)

  if (data.priorBankruptcy) flags.push('Bankruptcy history reported — screen for discharge of this debt before anything else')
  if (data.recognizesDebt === 'identity-theft') flags.push('Identity theft claimed — police report + FCRA disputes; plead mistaken identity')
  if (data.swornPetition) flags.push('Sworn/verified petition — verified denial (TRCP 93(10)) REQUIRED in the answer')
  if (data.courtType === 'justice' && (data.amountClaimed ?? 0) > 20000) {
    flags.push('Amount pleaded exceeds $20,000 justice-court ceiling (Gov’t Code § 27.031) — jurisdictional challenge')
  }

  const recommendedParagraphs = [
    'General denial (TRCP 92 / 502.6)',
    ...(data.swornPetition ? ['Verified denial of account (TRCP 93(10), 185)'] : []),
    ...(assignee ? ['Verified denials — standing/capacity/assignment (TRCP 93(1), (2), (8))'] : []),
    ...(limitations.startsWith('LIKELY') || limitations.startsWith('BORDERLINE') ? ['Limitations (TRCP 94; CPRC § 16.004)'] : []),
    ...(data.recognizesDebt === 'identity-theft' ? ['Mistaken identity / identity theft'] : []),
    'Denial of attorney’s fees and conditions precedent',
  ]

  return {
    matter: 'debt-defense',
    answerDeadline: deadlineInfo,
    daysRemaining,
    limitations,
    plaintiffClass,
    recommendedParagraphs,
    flags,
    disclaimer: 'Automated first-pass triage for attorney review — not a legal determination.',
  }
}

// ---------------------------------------------------------------------------

export interface ExpunctionArrest {
  arrestDate: string
  county: string
  agency?: string
  offense: string
  level: 'classC' | 'classB' | 'classA' | 'felony'
  disposition:
    | 'never-charged'
    | 'dismissed'
    | 'acquitted'
    | 'diversion-completed'
    | 'deferred-completed'
    | 'probation-completed'
    | 'convicted'
    | 'pending'
  dispositionDate?: string
  sameTransactionFelony?: boolean
  [key: string]: unknown
}

export interface ExpunctionIntakeData {
  arrests: ExpunctionArrest[]
  priorExpunction?: boolean
  [key: string]: unknown
}

function waitingPeriodEnd(arrestDateISO: string, level: ExpunctionArrest['level'], felonyInTransaction: boolean): Date {
  const arrest = parseISODate(arrestDateISO)
  if (felonyInTransaction || level === 'felony') {
    const d = new Date(arrest)
    d.setUTCFullYear(d.getUTCFullYear() + 3)
    return d
  }
  if (level === 'classA' || level === 'classB') {
    const d = new Date(arrest)
    d.setUTCFullYear(d.getUTCFullYear() + 1)
    return d
  }
  return addDays(arrest, 180) // Class C
}

export function triageExpunction(data: ExpunctionIntakeData, now = new Date()): Record<string, unknown> {
  const today = parseISODate(texasTodayISO(now))

  const screens = data.arrests.map((arrest, i) => {
    const label = `Arrest #${i + 1} (${arrest.arrestDate}, ${arrest.offense})`
    const flags: string[] = []
    if (arrest.sameTransactionFelony) flags.push('Same-transaction felony reported — often fatal to expunction; attorney must review')
    if (data.priorExpunction) flags.push('Prior expunction reported — once-only limits apply to some routes')

    let route: string
    let recommendation: string

    switch (arrest.disposition) {
      case 'acquitted':
        route = 'Entitlement — acquittal (CCP ch. 55A, subch. B)'
        recommendation = 'Likely eligible now — verify with court records'
        break
      case 'never-charged': {
        const eligible = waitingPeriodEnd(arrest.arrestDate, arrest.level, !!arrest.sameTransactionFelony)
        route = 'Art. 55A.052 — no charging instrument presented'
        recommendation = eligible <= today
          ? 'Waiting period satisfied — likely eligible now (verify no charge was ever filed)'
          : `Waiting period runs until ${toISODate(eligible)} — calendar and re-screen`
        break
      }
      case 'dismissed':
        route = 'Art. 55A.053 (dismissal grounds) or limitations-expired route'
        recommendation = 'Potentially eligible — REASON for dismissal controls; pull court records before concluding'
        break
      case 'diversion-completed':
        route = 'Art. 55A.053(a)(2)(C) — pretrial intervention completed'
        recommendation = 'Likely eligible (once-only affidavit rules for VTC/MHC programs) — verify program type and dismissal'
        break
      case 'deferred-completed':
        route = 'NOT expunction — pivot to order of nondisclosure (Gov’t Code ch. 411, subch. E-1)'
        recommendation = 'Screen nondisclosure: offense exclusions + waiting periods; sealing, not destruction'
        break
      case 'probation-completed':
      case 'convicted':
        route = 'Ineligible for expunction (conviction / court-ordered community supervision)'
        recommendation = 'Screen nondisclosure for limited conviction categories; otherwise decline honestly'
        break
      case 'pending':
        route = 'Charge pending — no relief available yet'
        recommendation = 'Re-screen after disposition'
        break
    }

    return { label, route, recommendation, flags, confidence: 'client-reported — DO NOT FILE without DPS/county record verification' }
  })

  return {
    matter: 'expunction',
    screens,
    nextStep: 'Order DPS criminal history + county docket records, then attorney confirms each screen',
    disclaimer: 'Automated first-pass triage for attorney review — not a legal determination.',
  }
}

// ---------------------------------------------------------------------------

export interface DivorceIntakeData {
  residencyStateSixMonths: boolean
  residencyCountyNinetyDays: boolean
  filingCounty: string
  minorChildren: boolean
  wifePregnant: boolean
  realProperty: boolean
  retirementDivision: boolean
  fullAgreement: boolean
  familyViolence: boolean
  spouseWillSignWaiver: boolean
  activeDutyDeployed: boolean
  marriageDate?: string
  separationDate?: string
  nameChangeRequested?: boolean
  [key: string]: unknown
}

export interface EstateChild {
  name: string
  minor: boolean
  fromPriorRelationship?: boolean
}

export interface EstateIntakeData {
  maritalStatus: 'single' | 'married' | 'widowed' | 'divorced'
  spouseName?: string
  mirrorPackageForSpouse?: boolean
  children: EstateChild[]
  executorName: string
  executorAltName?: string
  guardianName?: string
  financialAgent: string
  financialAgentAlt?: string
  medicalAgent: string
  medicalAgentAlt?: string
  poaEffective: 'immediately' | 'incapacity'
  residuaryPlan: 'spouse-then-children' | 'children-equally' | 'other'
  residuaryOther?: string
  trustAge?: number
  estateOverExemptionRisk: boolean
  specialNeedsBeneficiary: boolean
  disinheritance: boolean
  capacityConcerns: boolean
  complexAssets: boolean
  outOfStateProperty: boolean
  priorWill: boolean
  homesteadCounty?: string
  [key: string]: unknown
}

export function triageEstate(data: EstateIntakeData): Record<string, unknown> {
  const failures: string[] = []
  const escalations: string[] = []
  const flags: string[] = []

  if (data.estateOverExemptionRisk) failures.push('Possible federal estate-tax exposure — tax-planned documents needed; outside the flat-fee package (verify current exemption)')
  if (data.specialNeedsBeneficiary) failures.push('Special-needs beneficiary — supplemental-needs trust planning required; route to hourly/referral')
  if (data.disinheritance) failures.push('Disinheritance / unexpected unequal treatment — contest-risk engagement; outside the flat-fee package')
  if (data.complexAssets) failures.push('Closely held business / significant minerals / foreign assets — outside the flat-fee package')
  if (data.outOfStateProperty) failures.push('Out-of-state real property — ancillary planning needed; outside the flat-fee package')
  if (data.capacityConcerns) escalations.push('Capacity or undue-influence concern — Mike must evaluate BEFORE any drafting; document or decline')

  const minors = data.children.filter((c) => c.minor)
  const blended = data.maritalStatus === 'married' && data.children.some((c) => c.fromPriorRelationship)
  if (minors.length > 0 && !data.guardianName) flags.push(`${minors.length} minor child(ren) but no guardian named — collect guardian + alternate before drafting`)
  if (minors.length > 0) flags.push('Minor children — include contingent trust and guardian designation')
  if (blended) flags.push('Blended family — confirm both spouses understand the residuary plan; consider naming children explicitly')
  if (data.priorWill) flags.push('Prior will exists — collect it; new will revokes all priors; consider physical destruction after execution')
  if (data.residuaryPlan === 'other') flags.push('Custom residuary plan — Mike drafts this article by hand')
  if (data.maritalStatus === 'married' && !data.mirrorPackageForSpouse) flags.push('Married but no mirror package for spouse — offer bundle pricing')

  const eligible = failures.length === 0 && escalations.length === 0

  return {
    matter: 'estate-package',
    packageEligible: eligible,
    gateFailures: failures,
    escalations,
    flags,
    documents: eligible
      ? ['Simple will (self-proved)', 'Statutory durable POA', 'Medical POA + disclosure', 'Directive to physicians', 'HIPAA release (optional)']
      : [],
    executionReminder: 'Will: 2 disinterested witnesses (14+, non-beneficiaries) + notary for self-proving affidavit. POA: notarized. MPOA/directive: witnesses or notary per current statute. Client alone — no beneficiaries in the room.',
    recommendation: eligible
      ? 'Package eligible — draft for attorney review; confirm beneficiary designations on retirement/insurance match the plan'
      : escalations.length > 0
        ? 'ESCALATE to attorney before any drafting'
        : 'Route out of flat-fee package with explanation; offer hourly or referral',
    disclaimer: 'Automated first-pass triage for attorney review — not a legal determination.',
  }
}

export interface MvaIntakeData {
  accidentDate: string // ISO date — drives the SOL clock
  accidentCounty?: string
  liabilityScenario: 'rear-ended' | 'other-driver-cited' | 'other-driver-dwi' | 'left-turn-red-light' | 'disputed' | 'client-cited' | 'hit-and-run' | 'other'
  clientCited: boolean
  clientPartialFault: boolean
  injurySeverity: 'soft-tissue' | 'fractures' | 'surgery' | 'catastrophic'
  fatality: boolean
  treatmentStatus: 'not-started' | 'treating' | 'complete'
  providers?: string
  otherDriverName?: string
  liabilityCarrier?: string
  claimNumber?: string
  clientAutoCarrier?: string
  umUimCoverage: 'yes' | 'no' | 'unknown'
  pipMedPay: 'yes' | 'no' | 'unknown'
  healthInsurance: 'none' | 'private' | 'medicare' | 'medicaid' | 'erisa' | 'unknown'
  commercialVehicle: boolean
  priorAttorney: boolean
  recordedStatementGiven: boolean
  clientIsMinor: boolean
  [key: string]: unknown
}

const CLEAR_LIABILITY = new Set(['rear-ended', 'other-driver-cited', 'other-driver-dwi', 'left-turn-red-light'])

export function mvaSolDate(accidentDateISO: string): string {
  // Two years from the accident (Tex. Civ. Prac. & Rem. Code § 16.003) — the
  // conservative anchor; death claims accrue at death and tolling can extend, but
  // the calendar never assumes the friendlier date.
  const d = parseISODate(accidentDateISO)
  d.setUTCFullYear(d.getUTCFullYear() + 2)
  return toISODate(d)
}

export function triageMva(data: MvaIntakeData, now = new Date()): Record<string, unknown> {
  const standardTrack: string[] = []
  const escalations: string[] = []
  const flags: string[] = []
  const today = parseISODate(texasTodayISO(now))

  const solDate = mvaSolDate(data.accidentDate)
  const solDays = Math.round((parseISODate(solDate).getTime() - today.getTime()) / DAY_MS)
  if (solDays < 0) {
    escalations.push('LIMITATIONS APPEARS EXPIRED (2 years, CPRC § 16.003) — attorney review IMMEDIATELY; decline carefully in writing if truly barred')
  } else if (solDays <= 120) {
    escalations.push(`LIMITATIONS in ${solDays} days (${solDate}) — inside the 120-day window; Mike must set the file-or-resolve plan before signing`)
  }

  if (!CLEAR_LIABILITY.has(data.liabilityScenario)) {
    if (data.liabilityScenario === 'hit-and-run') {
      if (data.umUimCoverage === 'yes') flags.push('Hit-and-run with confirmed UM — first-party claim can stay on the reduced track; verify physical-contact/corroboration requirements on the policy')
      else standardTrack.push('Hit-and-run without confirmed UM coverage — no clear recovery path for the automated track; standard evaluation (or candid decline if no coverage)')
    } else {
      standardTrack.push(`Liability scenario "${data.liabilityScenario}" is not clear-liability — standard-fee track`)
    }
  }
  if (data.clientCited) standardTrack.push('Client was cited — comparative-fault exposure (51% bar, CPRC § 33.001); standard-fee track')
  if (data.clientPartialFault) standardTrack.push('Client reports possible shared fault — standard-fee track')
  if (data.injurySeverity === 'surgery' || data.injurySeverity === 'catastrophic') {
    standardTrack.push('Surgical/catastrophic injury profile — deserves full-fee workup, not the automated discount track')
  }
  if (data.fatality) {
    standardTrack.push('Fatality — wrongful death/survival claims; standard track')
    escalations.push('Fatality reported — immediate attorney involvement (beneficiaries, accrual at death, § 16.003(b))')
  }
  if (data.commercialVehicle) standardTrack.push('Commercial vehicle involved — preservation and layered-coverage complexity; standard track')

  if (data.priorAttorney) escalations.push('Prior attorney on the case — resolve fee lien / termination letter before signing')
  if (data.clientIsMinor) escalations.push('Minor claimant — tolling analysis and court approval of settlement; Mike prices and plans this personally')
  if (data.recordedStatementGiven) flags.push('Recorded statement already given — obtain a copy from the carrier; assess damage')
  if (['medicare', 'medicaid', 'erisa'].includes(data.healthInsurance)) {
    flags.push(`${data.healthInsurance.toUpperCase()} coverage — reimbursement/lien resolution required before disbursement; calendar early`)
  }
  if (data.pipMedPay !== 'no') flags.push('PIP/MedPay possible — pull the dec page and submit first-party claims (never leave first-party benefits unclaimed)')
  if (data.treatmentStatus === 'not-started') flags.push('No treatment yet — advise prompt evaluation; gaps and delays are the adjuster\'s favorite exhibit')

  const reducedFeeEligible = standardTrack.length === 0 && escalations.length === 0

  return {
    matter: 'reduced-fee-mva',
    reducedFeeEligible,
    track: reducedFeeEligible ? 'reduced-fee' : escalations.length > 0 ? 'escalate' : 'standard-fee',
    standardTrackReasons: standardTrack,
    escalations,
    flags,
    limitations: { solDate, daysRemaining: solDays, basis: 'Two years from accident (Tex. Civ. Prac. & Rem. Code § 16.003); conservative anchor — tolling not assumed' },
    recommendation: reducedFeeEligible
      ? 'Reduced-fee track eligible — signed written contingency agreement (Rule 1.04(d)) + HIPAA authorizations, then LOR and preservation letters out'
      : escalations.length > 0
        ? 'ESCALATE to attorney before signing anything'
        : 'Route to the standard-fee track (same firm, traditional contingency) with a one-line explanation to the client — full workup',
    disclaimer: 'Automated first-pass triage for attorney review — not a legal determination.',
  }
}

export function triageDivorce(data: DivorceIntakeData): Record<string, unknown> {
  const failures: string[] = []
  const escalations: string[] = []

  if (!data.residencyStateSixMonths) failures.push('Texas 6-month domicile not met (Fam. Code § 6.301)')
  if (!data.residencyCountyNinetyDays) failures.push(`90-day residency in ${data.filingCounty || 'filing county'} not met (Fam. Code § 6.301)`)
  if (data.minorChildren) failures.push('Minor children of the marriage — Tier 2+ (SAPCR provisions required)')
  if (data.wifePregnant) failures.push('Pregnancy — cannot finalize as Tier 1; most courts wait for birth')
  if (data.realProperty) failures.push('Real property owned — Tier 2 (deed + deed of trust to secure assumption)')
  if (data.retirementDivision) failures.push('Retirement division requested — Tier 2 (QDRO)')
  if (!data.fullAgreement) failures.push('Not in full agreement — contested track, not this product')
  if (!data.spouseWillSignWaiver) failures.push('Spouse unlikely to sign waiver — formal service or publication track')
  if (data.familyViolence) escalations.push('Family violence screen HIT — attorney review before ANY next step (safety, § 6.702(c) waiting-period rights, voluntariness of agreement)')
  if (data.activeDutyDeployed) escalations.push('Active-duty deployment — SCRA review required')

  const tier1Eligible = failures.length === 0 && escalations.length === 0

  return {
    matter: 'uncontested-divorce',
    tier1Eligible,
    gateFailures: failures,
    escalations,
    timeline: tier1Eligible
      ? '60-day waiting period (Fam. Code § 6.702) starts at FILING; earliest prove-up is day 61. Waiver must be signed AFTER filing (§ 6.4035).'
      : 'Route out of Tier 1 — see failures/escalations',
    recommendation: tier1Eligible
      ? 'Tier 1 eligible pending conflict check on BOTH spouses — proceed to petition draft'
      : escalations.length > 0
        ? 'ESCALATE to attorney before quoting or proceeding'
        : 'Offer Tier 2 / hourly with a one-paragraph explanation of why',
    disclaimer: 'Automated first-pass triage for attorney review — not a legal determination.',
  }
}

// ---------------------------------------------------------------------------
// Product injury (recall / defective product) — standard contingency track.
// The screening questions are the ones that decide whether a product case is
// provable and collectible: is the product still in hand, who in the chain of
// distribution is actually reachable, and is the injury serious enough to carry
// expert costs. Everything here is a first pass for Mike's review.

export interface ProductIntakeData {
  incidentDate: string // ISO date — drives the SOL clock
  incidentCounty?: string
  productName: string
  brand?: string
  modelNumber?: string
  productCategory: 'battery-charger' | 'heater-appliance' | 'ebike-scooter' | 'furniture-tipover' | 'infant-child' | 'tool-equipment' | 'vehicle-part' | 'medical-device' | 'other'
  hazardType: 'fire-burn' | 'explosion' | 'electric-shock' | 'laceration' | 'fall' | 'choking-ingestion' | 'co-poisoning' | 'entrapment-strangulation' | 'other'
  recallStatus: 'recalled' | 'not-recalled' | 'unknown'
  recallNumber?: string
  campaign?: string // landing-page slug the submission came from (attribution)
  purchaseChannel: 'amazon-third-party' | 'amazon-direct' | 'big-box' | 'online-retailer' | 'manufacturer-direct' | 'secondhand-gift' | 'unknown'
  retailerName?: string
  sellerName?: string
  manufacturerName?: string
  purchaseDate?: string // ISO date — drives the repose screen
  hasReceipt: boolean
  productPreserved: 'yes' | 'partially' | 'discarded' | 'returned-to-seller' | 'unknown'
  photosVideo: boolean
  injurySeverity: 'minor' | 'moderate' | 'serious' | 'catastrophic'
  fatality: boolean
  injuredIsMinor: boolean
  treatmentStatus: 'not-started' | 'treating' | 'complete'
  providers?: string
  propertyDamage: 'none' | 'minor' | 'major' | 'total-loss'
  fireDepartmentReport: boolean
  insuranceClaimFiled: boolean
  insurerName?: string
  contactedManufacturer: boolean
  acceptedCompensation: boolean
  cpscReportFiled: boolean
  priorAttorney: boolean
  [key: string]: unknown
}

export function productSolDate(incidentDateISO: string): string {
  // Two years from the injury (Tex. Civ. Prac. & Rem. Code § 16.003). Death
  // claims accrue at death and the discovery rule can extend accrual, but the
  // calendar never assumes the friendlier date.
  const d = parseISODate(incidentDateISO)
  d.setUTCFullYear(d.getUTCFullYear() + 2)
  return toISODate(d)
}

export function triageProduct(data: ProductIntakeData, now = new Date()): Record<string, unknown> {
  const escalations: string[] = []
  const flags: string[] = []
  const weaknesses: string[] = []
  const today = parseISODate(texasTodayISO(now))

  // --- Limitations and repose -------------------------------------------------
  const solDate = productSolDate(data.incidentDate)
  const solDays = Math.round((parseISODate(solDate).getTime() - today.getTime()) / DAY_MS)
  if (solDays < 0) {
    escalations.push('LIMITATIONS APPEARS EXPIRED (2 years from injury, CPRC § 16.003) — attorney review IMMEDIATELY; discovery-rule and death-accrual questions are the only outs')
  } else if (solDays <= 120) {
    escalations.push(`LIMITATIONS in ${solDays} days (${solDate}) — inside the 120-day window; product cases need expert work before filing, so the plan must be set now`)
  }

  let repose = 'unknown — purchase date not provided (repose runs 15 years from the SALE, CPRC § 16.012)'
  if (data.purchaseDate) {
    const yearsSinceSale = (today.getTime() - parseISODate(data.purchaseDate).getTime()) / (365.25 * DAY_MS)
    if (yearsSinceSale >= 15) {
      repose = `LIKELY BARRED — ${yearsSinceSale.toFixed(1)} years since purchase; 15-year statute of repose (CPRC § 16.012) absent a longer express warranty or latent-disease exception`
      escalations.push('Statute of repose likely bars the claim — verify the first sale date by the DEFENDANT (repose runs from its sale, not the client\'s purchase)')
    } else if (yearsSinceSale >= 13) {
      repose = `BORDERLINE — ${yearsSinceSale.toFixed(1)} years since purchase; pin down the manufacturer's sale date`
    } else {
      repose = `within repose (~${yearsSinceSale.toFixed(1)} years since purchase)`
    }
  }

  // --- Evidence ---------------------------------------------------------------
  let evidence: string
  switch (data.productPreserved) {
    case 'yes':
      evidence = 'Product in client\'s possession — SECURE IT NOW: chain-of-custody log, photographs, no testing or disassembly, no return for refund'
      flags.push('Client still has the product — send the client evidence-preservation letter today; the recall remedy (destroy-and-photograph for a refund) would destroy the case')
      break
    case 'partially':
      evidence = 'Product partially preserved (remnants / damaged unit) — often enough for a fire-origin expert; secure what exists and the scene'
      flags.push('Partial product only — fire-origin and failure-analysis experts can still work with remnants; secure everything, including the outlet, cord, and surrounding debris')
      break
    case 'returned-to-seller':
      evidence = 'Product returned to the seller — send a preservation demand immediately; the seller\'s retention of it is now the evidence question'
      escalations.push('Product was returned to the seller — preservation letter out within 24 hours; if the seller destroyed it after notice of the injury, spoliation becomes the lever')
      break
    case 'discarded':
      evidence = 'Product discarded — proof of defect must come from the recall record, other incidents, photographs, and the scene'
      escalations.push('PRODUCT IS GONE — defect proof depends on photos, recall findings, and the failure pattern; many of these cases are not viable without the unit. Decide early and in writing.')
      break
    default:
      evidence = 'Product status unknown — first call: find out whether the unit still exists'
      flags.push('Product status unknown — first call must establish whether the unit exists and where it is')
  }
  if (!data.photosVideo) flags.push('No photos or video reported — ask the client, family, fire department, and neighbors; CPSC incident reports often include photos')
  if (!data.hasReceipt) flags.push('No receipt — pull the Amazon or retailer order history (it identifies the seller of record and the sale date, both essential)')
  if (data.hazardType === 'fire-burn' || data.hazardType === 'explosion') {
    if (data.fireDepartmentReport) flags.push('Fire department responded — request the incident report and any fire marshal origin-and-cause findings now')
    else flags.push('Fire or explosion with no fire-department report — origin and cause rests entirely on our expert; retain early')
  }

  // --- Recall status ----------------------------------------------------------
  if (data.recallStatus === 'recalled') {
    flags.push(`Recalled product${data.recallNumber ? ` (CPSC recall ${data.recallNumber})` : ''} — the recall notice is evidence of defect and of notice; pull the CPSC recall file and the incident counts disclosed in the notice`)
    if (data.purchaseDate) flags.push('Compare the purchase date to the date the seller first received incident reports — a sale made after the seller knew is the strongest fact pattern against a retailer')
  } else if (data.recallStatus === 'unknown') {
    flags.push('Recall status unknown — search CPSC recalls and SaferProducts.gov incident reports for the product and model before the first client call')
  }

  // --- Defendants and collectability ------------------------------------------
  let defendantRead: string
  switch (data.purchaseChannel) {
    case 'amazon-third-party':
      defendantRead = 'Third-party Amazon storefront sale. Under the Texas Supreme Court\'s Amazon decision, Amazon is not a Chapter 82 "seller" when it never held title, so the realistic defendants are the seller of record and the manufacturer or importer — frequently a foreign entity. Chapter 82\'s nonmanufacturing-seller exceptions (including the one for a manufacturer not amenable to Texas jurisdiction) are the path to any domestic defendant.'
      weaknesses.push('Amazon marketplace sale — Texas does not treat Amazon as the seller absent title; foreign seller may be uncollectible. Identify any U.S. importer of record before accepting.')
      break
    case 'amazon-direct':
      defendantRead = 'Sold by Amazon itself (Amazon held title) — Amazon is a nonmanufacturing seller under Chapter 82; liability requires one of the statutory exceptions (actual knowledge, altered product, express representation, or an unreachable manufacturer).'
      flags.push('Confirm from the order history that the seller of record was Amazon.com Services LLC, not a storefront with Amazon fulfillment')
      break
    case 'big-box':
      defendantRead = `Big-box retail sale (${data.retailerName || 'retailer not named'}) — collectible retailer, but a nonmanufacturing seller is protected by Chapter 82 unless an exception applies. The manufacturer or importer is the primary target; the retailer stays in on actual-knowledge or unreachable-manufacturer facts.`
      break
    case 'online-retailer':
      defendantRead = `Online retailer sale (${data.retailerName || 'retailer not named'}) — confirm whether the retailer held title or merely hosted a marketplace listing; the same seller analysis as Amazon applies.`
      break
    case 'manufacturer-direct':
      defendantRead = 'Bought directly from the manufacturer — cleanest chain of distribution; collectability turns on the manufacturer\'s domicile and insurance.'
      break
    case 'secondhand-gift':
      defendantRead = 'Secondhand or gift — the client is not the purchaser; strict liability still runs to users and bystanders, but the sale date and seller must be reconstructed from the original purchaser.'
      flags.push('Client did not buy the product — identify the original purchaser and their order record')
      break
    default:
      defendantRead = 'Purchase channel unknown — establish where and when the product was bought before anything else'
  }
  if (!data.manufacturerName && !data.sellerName) flags.push('No manufacturer or seller named — identify both from the recall notice, product label, packaging, and order history')

  // --- Injury, damages, and track --------------------------------------------
  if (data.fatality) escalations.push('Fatality — wrongful death and survival claims; immediate attorney involvement (beneficiaries, accrual at death, autopsy and scene evidence)')
  if (data.injuredIsMinor) escalations.push('Minor claimant — tolling analysis and court approval of any settlement; Mike plans this personally')
  if (data.priorAttorney) escalations.push('Prior attorney on the case — resolve fee lien and termination before signing')
  if (data.acceptedCompensation) escalations.push('Client accepted a refund, replacement, or other compensation — obtain every document signed; screen for a release before any work')
  if (data.contactedManufacturer) flags.push('Client has contacted the manufacturer or seller — get the full written exchange; stop further contact; assume the company has opened a claim file')
  if (data.insuranceClaimFiled) flags.push(`Homeowner's or renter's claim filed${data.insurerName ? ` with ${data.insurerName}` : ''} — the carrier owns the subrogated property claim; coordinate early so the carrier does not take custody of the product or settle around the injury claim`)
  if (data.propertyDamage === 'major' || data.propertyDamage === 'total-loss') {
    flags.push('Major property loss — document contents inventory and displacement costs; the property claim often funds the expert work')
    if (!data.insuranceClaimFiled) flags.push('Major property loss with no insurance claim reported — confirm coverage; an uninsured total loss changes the damages picture')
  }
  if (data.treatmentStatus === 'not-started' && data.injurySeverity !== 'minor') flags.push('No treatment yet for a reported non-minor injury — advise prompt evaluation; untreated injuries read as minor to an adjuster')
  if (!data.cpscReportFiled) flags.push('No CPSC incident report filed — consider filing one with the client (it is a public record of the incident and prompts a manufacturer response), after Mike approves the wording')

  const severe = data.injurySeverity === 'serious' || data.injurySeverity === 'catastrophic' || data.fatality
  const productGone = data.productPreserved === 'discarded'
  let track: 'pursue' | 'review' | 'decline-or-watch'
  if (severe && !productGone) track = 'pursue'
  else if (data.injurySeverity === 'minor' && (data.propertyDamage === 'none' || data.propertyDamage === 'minor')) track = 'decline-or-watch'
  else track = 'review'
  if (track === 'pursue' && data.purchaseChannel === 'amazon-third-party' && !data.manufacturerName) track = 'review'

  const recommendation =
    escalations.length > 0
      ? 'ESCALATE to attorney before signing anything'
      : track === 'pursue'
        ? 'Standard contingency track — written fee agreement (Rule 1.04(d)), client evidence letter, and preservation letters to every entity in the chain within 48 hours; retain the failure-analysis expert before the product is touched'
        : track === 'review'
          ? 'Attorney review — viable only if the product (or its remnants) exists and a collectible defendant can be identified; evaluate within one business day'
          : 'Minor injury and little property damage — a product case will not carry expert costs; decline in writing with the CPSC reporting information, or watch if treatment escalates'

  return {
    matter: 'product-injury',
    track,
    severity: data.injurySeverity,
    evidence,
    defendantRead,
    weaknesses,
    escalations,
    flags,
    limitations: { solDate, daysRemaining: solDays, basis: 'Two years from injury (Tex. Civ. Prac. & Rem. Code § 16.003); conservative anchor — tolling and discovery rule not assumed' },
    repose,
    recommendation,
    disclaimer: 'Automated first-pass triage for attorney review — not a legal determination.',
  }
}
