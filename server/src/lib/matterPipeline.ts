// Matter pipeline: stages per practice line, and milestone events that generate
// downstream deadline tasks automatically (the "workflow" half of the intake system).

export interface MilestoneTask {
  title: string
  description: string
  dueDate: string // ISO date
  priority: 'low' | 'medium' | 'high'
}

export interface MilestoneDef {
  id: string
  label: string
  advanceStageTo?: string
  // Given the milestone date + intake data, the deadline tasks to create
  tasks: (dateISO: string, data: Record<string, unknown>) => MilestoneTask[]
  // Optional validation returning a warning string (not a hard block)
  warn?: (dateISO: string, data: Record<string, unknown>, keyDates: Record<string, { date: string }>) => string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function plusDays(dateISO: string, n: number): string {
  return iso(new Date(new Date(`${dateISO}T12:00:00Z`).getTime() + n * DAY_MS))
}

export const STAGES: Record<string, string[]> = {
  'debt-defense': ['intake', 'answer-filed', 'discovery', 'settlement', 'trial-prep', 'closed'],
  'expunction': ['intake', 'records-verification', 'petition-filed', 'order-signed', 'closed'],
  'uncontested-divorce': ['intake', 'petition-filed', 'waiver-signed', 'decree-circulating', 'proved-up', 'closed'],
  'estate-package': ['intake', 'drafting', 'signing-scheduled', 'executed', 'closed'],
}

export const MILESTONES: Record<string, MilestoneDef[]> = {
  'debt-defense': [
    {
      id: 'answerFiled',
      label: 'Answer filed',
      advanceStageTo: 'answer-filed',
      tasks: (date, data) => {
        const isJP = data.courtType === 'justice'
        return isJP
          ? [{
              title: 'File discovery motion (TRCP 500.9)',
              description: 'JP court: file motion + proposed discovery requests; ask for 30-day response order.',
              dueDate: plusDays(date, 7),
              priority: 'medium',
            }]
          : [{
              title: "Plaintiff's initial disclosures due (TRCP 194)",
              description: 'Due 30 days after first answer. If blown, move to compel — nonperformance is settlement leverage.',
              dueDate: plusDays(date, 30),
              priority: 'medium',
            }, {
              title: 'Serve discovery set on plaintiff',
              description: 'County/district: serve RFPs, interrogatories, RFAs as of right.',
              dueDate: plusDays(date, 14),
              priority: 'medium',
            }]
      },
    },
    {
      id: 'trialDate',
      label: 'Trial date set',
      advanceStageTo: 'trial-prep',
      tasks: (date) => [{
        title: 'Check plaintiff 902(10) business-records affidavits',
        description: 'Affidavits must be served 14 days before trial — verify service date and prepare objections (hearsay, foundation, chain of title).',
        dueDate: plusDays(date, -21),
        priority: 'high',
      }, {
        title: 'Trial prep — evidence objection checklist',
        description: 'Chain of title, business-records foundation, amount itemization, contract, attorney-fee proof. See debt-defense skill references/procedure.md.',
        dueDate: plusDays(date, -14),
        priority: 'high',
      }],
    },
    {
      id: 'settlementReached',
      label: 'Settlement reached',
      advanceStageTo: 'settlement',
      tasks: (date) => [{
        title: 'Confirm settlement documented in writing',
        description: 'Signed by plaintiff counsel: amount, deadline, dismissal WITH prejudice, credit-reporting treatment, release limited to account, paid-in-full confirmation.',
        dueDate: plusDays(date, 7),
        priority: 'high',
      }, {
        title: 'Confirm dismissal with prejudice on file',
        description: 'Verify the nonsuit/dismissal order is signed and with prejudice; send client closing letter (flag possible 1099-C).',
        dueDate: plusDays(date, 45),
        priority: 'medium',
      }],
    },
  ],
  'expunction': [
    {
      id: 'recordsVerified',
      label: 'Records verified (DPS/county)',
      advanceStageTo: 'records-verification',
      tasks: (date) => [{
        title: 'Attorney confirms eligibility route per arrest',
        description: 'Record-verified dispositions in file — confirm ch. 55A route and article for each arrest before drafting.',
        dueDate: plusDays(date, 5),
        priority: 'high',
      }],
    },
    {
      id: 'petitionFiled',
      label: 'Petition filed',
      advanceStageTo: 'petition-filed',
      tasks: (date) => [{
        title: 'Confirm hearing setting / agency notices',
        description: 'Clerk notifies respondent agencies; watch for DPS or agency opposition. Follow up if no setting.',
        dueDate: plusDays(date, 30),
        priority: 'medium',
      }],
    },
    {
      id: 'orderSigned',
      label: 'Order signed',
      advanceStageTo: 'order-signed',
      tasks: (date) => [{
        title: 'Confirm clerk served certified copies on ALL listed agencies',
        description: 'A missed agency keeps its records. Verify certified-mail receipts or e-service confirmations.',
        dueDate: plusDays(date, 30),
        priority: 'high',
      }, {
        title: 'Client closing letter + certified copies',
        description: 'Certified copies to client; lawful-denial rights explained; optional background-vendor dispute letters.',
        dueDate: plusDays(date, 14),
        priority: 'medium',
      }, {
        title: '180-day record-destruction follow-up',
        description: 'Spot-check that agencies completed destruction/return per the order.',
        dueDate: plusDays(date, 180),
        priority: 'low',
      }],
    },
  ],
  'uncontested-divorce': [
    {
      id: 'petitionFiled',
      label: 'Petition filed',
      advanceStageTo: 'petition-filed',
      tasks: (date) => [{
        title: 'Send respondent: file-stamped petition + waiver + not-your-lawyer letter',
        description: 'Waiver is VOID if signed before filing (Fam. Code § 6.4035) — send only the file-stamped copy.',
        dueDate: plusDays(date, 3),
        priority: 'high',
      }, {
        title: 'Earliest prove-up date (60-day waiting period ends)',
        description: 'Fam. Code § 6.702: no divorce before the 60th day after filing. Decree must be signed by both parties before this date.',
        dueDate: plusDays(date, 61),
        priority: 'medium',
      }],
    },
    {
      id: 'waiverSigned',
      label: 'Waiver signed & returned',
      advanceStageTo: 'waiver-signed',
      warn: (date, _data, keyDates) => {
        const filed = keyDates.petitionFiled?.date
        if (filed && date <= filed) {
          return `WAIVER DEFECT: signed ${date}, on or before the petition filing date ${filed} — VOID under Fam. Code § 6.4035. Re-execute with a date after filing.`
        }
        return null
      },
      tasks: (date) => [{
        title: 'File the waiver of service',
        description: 'Confirm signature date is AFTER the petition filing date, then file.',
        dueDate: plusDays(date, 3),
        priority: 'high',
      }, {
        title: 'Circulate Agreed Final Decree for signatures',
        description: 'Both parties sign before prove-up; run the decree completeness check (every asset/debt in exactly one column).',
        dueDate: plusDays(date, 14),
        priority: 'medium',
      }],
    },
    {
      id: 'provedUp',
      label: 'Prove-up completed / decree signed',
      advanceStageTo: 'proved-up',
      tasks: (date) => [{
        title: 'File BVS Form VS-165 and order certified copies',
        description: 'File the vital-statistics form; order certified copies of the decree for the client.',
        dueDate: plusDays(date, 2),
        priority: 'high',
      }, {
        title: 'Closing letter (name change checklist, 31-day remarriage rule)',
        description: 'Neither party may marry a third party before the 31st day after decree (waivable). Include title/account transfer checklist.',
        dueDate: plusDays(date, 7),
        priority: 'medium',
      }],
    },
  ],
}

MILESTONES['estate-package'] = [
  {
    id: 'draftsApproved',
    label: 'Drafts approved by attorney',
    advanceStageTo: 'drafting',
    tasks: (date) => [{
      title: 'Send drafts to client for review; schedule signing ceremony',
      description: 'Client reviews the package; book the ceremony with 2 disinterested witnesses (14+, non-beneficiaries) and a notary. Client attends ALONE.',
      dueDate: plusDays(date, 7),
      priority: 'medium',
    }],
  },
  {
    id: 'signingScheduled',
    label: 'Signing ceremony scheduled',
    advanceStageTo: 'signing-scheduled',
    tasks: (date) => [{
      title: 'Signing ceremony prep — regenerate statutory forms from CURRENT statutes',
      description: 'Pull current § 752.051 SDPOA form, MPOA form + § 166.163 disclosure, § 166.033 directive, § 251.104 self-proving affidavit. Confirm witnesses and notary.',
      dueDate: plusDays(date, -2),
      priority: 'high',
    }],
  },
  {
    id: 'executed',
    label: 'Documents executed',
    advanceStageTo: 'executed',
    tasks: (date) => [{
      title: 'Originals to client with storage letter; scans to file',
      description: 'Log where the originals are kept. Closing letter: revisit on marriage/divorce/birth/death/asset changes or ~3 years.',
      dueDate: plusDays(date, 3),
      priority: 'high',
    }, {
      title: 'Beneficiary-designation audit confirmation',
      description: 'Client must confirm retirement/life-insurance beneficiary designations match the plan — those pass OUTSIDE the will. Document the advice.',
      dueDate: plusDays(date, 14),
      priority: 'medium',
    }, {
      title: '3-year estate plan review reminder',
      description: 'Reach out for a plan review; offer spouse/family packages.',
      dueDate: plusDays(date, 1095),
      priority: 'low',
    }],
  },
]

export function findMilestone(matterType: string, milestoneId: string): MilestoneDef | undefined {
  return (MILESTONES[matterType] || []).find((m) => m.id === milestoneId)
}
