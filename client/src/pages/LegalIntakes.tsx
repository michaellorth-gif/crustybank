import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Scale, Trash2, AlertTriangle, ChevronDown, ChevronUp, Gavel, FileX2, HeartCrack, ScrollText, Settings, Globe } from 'lucide-react'
import { api } from '../services/api'
import DebtDefenseForm from '../components/intake/DebtDefenseForm'
import ExpunctionForm from '../components/intake/ExpunctionForm'
import DivorceForm from '../components/intake/DivorceForm'
import EstateForm from '../components/intake/EstateForm'
import MatterPanel from '../components/intake/MatterPanel'
import FirmSettingsModal from '../components/intake/FirmSettingsModal'
import { IntakePayload } from '../components/intake/fields'

type MatterType = 'debt-defense' | 'expunction' | 'uncontested-divorce' | 'estate-package'

interface LegalIntake {
  id: string
  matterType: MatterType
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  status: 'new' | 'in-review' | 'accepted' | 'declined'
  stage: string
  source: 'internal' | 'public'
  data: Record<string, unknown>
  triage: Record<string, unknown> | null
  keyDates: Record<string, { date: string; taskIds?: string[] }> | null
  reviewNotes: string | null
  relatedTaskId: string | null
  createdAt: string
}

const matterMeta: Record<MatterType, { label: string; icon: typeof Gavel; color: string }> = {
  'debt-defense': { label: 'Debt Defense', icon: Gavel, color: 'bg-blue-100 text-blue-700' },
  'expunction': { label: 'Expunction', icon: FileX2, color: 'bg-purple-100 text-purple-700' },
  'uncontested-divorce': { label: 'Uncontested Divorce', icon: HeartCrack, color: 'bg-rose-100 text-rose-700' },
  'estate-package': { label: 'Estate Package', icon: ScrollText, color: 'bg-amber-100 text-amber-700' },
}

const statusColors: Record<string, string> = {
  'new': 'bg-yellow-100 text-yellow-800',
  'in-review': 'bg-blue-100 text-blue-800',
  'accepted': 'bg-green-100 text-green-800',
  'declined': 'bg-gray-200 text-gray-600',
}

export default function LegalIntakes() {
  const [newIntakeType, setNewIntakeType] = useState<MatterType | null>(null)
  const [filter, setFilter] = useState<MatterType | 'all'>('all')
  const [showFirmSettings, setShowFirmSettings] = useState(false)
  const queryClient = useQueryClient()

  const { data: intakes = [], isLoading } = useQuery({
    queryKey: ['legal-intakes'],
    queryFn: async () => {
      const response = await api.get('/intakes')
      return response.data as LegalIntake[]
    },
  })

  const createIntake = useMutation({
    mutationFn: async (payload: IntakePayload) => {
      const response = await api.post('/intakes', payload)
      return response.data as LegalIntake
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-intakes'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setNewIntakeType(null)
    },
  })

  const updateIntake = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: string; reviewNotes?: string }) => {
      const response = await api.patch(`/intakes/${id}`, data)
      return response.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['legal-intakes'] }),
  })

  const deleteIntake = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/intakes/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['legal-intakes'] }),
  })

  const visible = filter === 'all' ? intakes : intakes.filter((i) => i.matterType === filter)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legal Intakes</h1>
          <p className="text-gray-600">Flat-fee practice-line intake forms with automated first-pass triage</p>
        </div>
        <div className="flex gap-2">
          {(Object.keys(matterMeta) as MatterType[]).map((mt) => (
            <button
              key={mt}
              onClick={() => setNewIntakeType(mt)}
              className="flex items-center gap-2 bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              <Plus size={16} />
              {matterMeta[mt].label}
            </button>
          ))}
          <button
            onClick={() => setShowFirmSettings(true)}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            title="Firm settings for document signature blocks"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <SummaryStrip intakes={intakes} />

      {showFirmSettings && <FirmSettingsModal onClose={() => setShowFirmSettings(false)} />}

      <div className="flex gap-2 mb-6">
        {(['all', ...Object.keys(matterMeta)] as Array<MatterType | 'all'>).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === f ? 'bg-primary-100 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f === 'all' ? 'All' : matterMeta[f as MatterType].label}
          </button>
        ))}
      </div>

      {newIntakeType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-1">New {matterMeta[newIntakeType].label} Intake</h2>
            <p className="text-sm text-gray-500 mb-4">
              Submitting runs automated triage. Results are a first pass for attorney review — not a legal determination.
            </p>
            {newIntakeType === 'debt-defense' && (
              <DebtDefenseForm onSubmit={(p) => createIntake.mutate(p)} onClose={() => setNewIntakeType(null)} isLoading={createIntake.isPending} />
            )}
            {newIntakeType === 'expunction' && (
              <ExpunctionForm onSubmit={(p) => createIntake.mutate(p)} onClose={() => setNewIntakeType(null)} isLoading={createIntake.isPending} />
            )}
            {newIntakeType === 'uncontested-divorce' && (
              <DivorceForm onSubmit={(p) => createIntake.mutate(p)} onClose={() => setNewIntakeType(null)} isLoading={createIntake.isPending} />
            )}
            {newIntakeType === 'estate-package' && (
              <EstateForm onSubmit={(p) => createIntake.mutate(p)} onClose={() => setNewIntakeType(null)} isLoading={createIntake.isPending} />
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading intakes…</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Scale size={40} className="mx-auto mb-3 text-gray-300" />
          No intakes yet. Start one with the buttons above.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((intake) => (
            <IntakeCard
              key={intake.id}
              intake={intake}
              onStatusChange={(status) => updateIntake.mutate({ id: intake.id, status })}
              onDelete={() => {
                if (confirm(`Delete intake for ${intake.clientName}? This cannot be undone.`)) {
                  deleteIntake.mutate(intake.id)
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function IntakeCard({
  intake, onStatusChange, onDelete,
}: {
  intake: LegalIntake
  onStatusChange: (status: string) => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = matterMeta[intake.matterType]
  const Icon = meta.icon
  const triage = intake.triage || {}
  const flags = collectFlags(triage)

  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-gray-900">{intake.clientName}</h3>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>{meta.label}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColors[intake.status]}`}>
                {intake.status}
              </span>
              {intake.stage !== 'intake' && (
                <span className="px-2 py-0.5 rounded text-xs font-medium capitalize bg-indigo-100 text-indigo-700">
                  {intake.stage.replace(/-/g, ' ')}
                </span>
              )}
              {intake.source === 'public' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700" title="Submitted through the public portal">
                  <Globe size={11} /> web
                </span>
              )}
            </div>
            <TriageSummary intake={intake} />
            {flags.length > 0 && (
              <div className="mt-2 space-y-1">
                {flags.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Submitted {new Date(intake.createdAt).toLocaleString()}
              {intake.clientEmail && ` · ${intake.clientEmail}`}
              {intake.clientPhone && ` · ${intake.clientPhone}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={intake.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="new">New</option>
            <option value="in-review">In review</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
          </select>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
            title={expanded ? 'Collapse' : 'Full triage detail'}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <MatterPanel intake={intake} />
          <div className="mt-4 pt-4 border-t border-gray-100 grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Intake data</h4>
              <KeyValueList obj={intake.data} />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Triage (automated first pass)</h4>
              <KeyValueList obj={triage} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryStrip({ intakes }: { intakes: LegalIntake[] }) {
  const open = intakes.filter((i) => i.status === 'new' || i.status === 'in-review')
  const urgent = intakes.filter((i) => {
    const days = i.triage?.daysRemaining as number | null | undefined
    return typeof days === 'number' && days <= 5 && i.status !== 'declined' && i.stage !== 'closed'
  })
  const publicNew = intakes.filter((i) => i.source === 'public' && i.status === 'new')
  const cells = [
    { label: 'Open intakes', value: open.length, cls: 'text-gray-900' },
    { label: 'Urgent deadlines (≤5 days)', value: urgent.length, cls: urgent.length ? 'text-red-600' : 'text-gray-900' },
    { label: 'New from web portal', value: publicNew.length, cls: publicNew.length ? 'text-teal-600' : 'text-gray-900' },
    { label: 'Accepted matters', value: intakes.filter((i) => i.status === 'accepted').length, cls: 'text-green-700' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cells.map((c) => (
        <div key={c.label} className="bg-white rounded-lg shadow-sm px-4 py-3">
          <div className={`text-2xl font-bold ${c.cls}`}>{c.value}</div>
          <div className="text-xs text-gray-500">{c.label}</div>
        </div>
      ))}
    </div>
  )
}

function TriageSummary({ intake }: { intake: LegalIntake }) {
  const t = intake.triage as Record<string, unknown> | null
  if (!t) return null

  if (intake.matterType === 'debt-defense') {
    const deadline = t.answerDeadline as { deadline: string } | null
    const days = t.daysRemaining as number | null
    return (
      <p className="text-sm text-gray-600 mt-1">
        {deadline ? (
          <>
            Answer due <span className={days !== null && days <= 5 ? 'font-semibold text-red-600' : 'font-semibold'}>{deadline.deadline}</span>
            {days !== null && ` (${days} day${Math.abs(days) === 1 ? '' : 's'} ${days < 0 ? 'PAST' : 'left'})`}
            {' · '}
          </>
        ) : 'Not served yet · '}
        {String(t.plaintiffClass || '')} · limitations: {String(t.limitations || 'n/a')}
      </p>
    )
  }

  if (intake.matterType === 'expunction') {
    const screens = (t.screens as Array<{ label: string; recommendation: string }>) || []
    return (
      <div className="text-sm text-gray-600 mt-1 space-y-0.5">
        {screens.map((s, i) => (
          <p key={i}><span className="font-medium">{s.label}:</span> {s.recommendation}</p>
        ))}
      </div>
    )
  }

  if (intake.matterType === 'estate-package') {
    const eligible = t.packageEligible as boolean
    return (
      <p className="text-sm mt-1">
        <span className={eligible ? 'text-green-700 font-medium' : 'text-orange-700 font-medium'}>
          {eligible ? 'Package eligible' : 'Not flat-fee package'}
        </span>
        <span className="text-gray-600"> · {String(t.recommendation || '')}</span>
      </p>
    )
  }

  const eligible = t.tier1Eligible as boolean
  return (
    <p className="text-sm mt-1">
      <span className={eligible ? 'text-green-700 font-medium' : 'text-orange-700 font-medium'}>
        {eligible ? 'Tier 1 eligible (pending conflicts check)' : 'Not Tier 1'}
      </span>
      <span className="text-gray-600"> · {String(t.recommendation || '')}</span>
    </p>
  )
}

function collectFlags(triage: Record<string, unknown>): string[] {
  const flags: string[] = []
  if (Array.isArray(triage.flags)) flags.push(...(triage.flags as string[]))
  if (Array.isArray(triage.escalations)) flags.push(...(triage.escalations as string[]))
  if (Array.isArray(triage.screens)) {
    for (const s of triage.screens as Array<{ label: string; flags?: string[] }>) {
      for (const f of s.flags || []) flags.push(`${s.label}: ${f}`)
    }
  }
  return flags
}

function KeyValueList({ obj }: { obj: Record<string, unknown> }) {
  return (
    <dl className="space-y-1">
      {Object.entries(obj).map(([k, v]) => {
        if (v === undefined || v === null || k === 'disclaimer') return null
        return (
          <div key={k} className="grid grid-cols-[140px_1fr] gap-2">
            <dt className="text-gray-500 break-words">{k}</dt>
            <dd className="text-gray-800 break-words whitespace-pre-wrap">
              {typeof v === 'object' ? JSON.stringify(v, null, 1).replace(/[{}"[\]]/g, '').trim() : String(v)}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
