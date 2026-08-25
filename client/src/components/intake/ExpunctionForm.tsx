import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  TextField, DateField, SelectField, CheckField, Section, FormActions,
  ClientInfoFields, ClientInfo, IntakePayload,
} from './fields'

interface ArrestEntry {
  arrestDate: string
  county: string
  agency: string
  offense: string
  level: string
  disposition: string
  dispositionDate: string
  sameTransactionFelony: boolean
}

const emptyArrest = (): ArrestEntry => ({
  arrestDate: '', county: '', agency: '', offense: '', level: 'classB',
  disposition: 'dismissed', dispositionDate: '', sameTransactionFelony: false,
})

export default function ExpunctionForm({
  onSubmit, onClose, isLoading,
}: {
  onSubmit: (payload: IntakePayload) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [client, setClient] = useState<ClientInfo>({ clientName: '', clientEmail: '', clientPhone: '' })
  const [arrests, setArrests] = useState<ArrestEntry[]>([emptyArrest()])
  const [priorExpunction, setPriorExpunction] = useState(false)
  const [notes, setNotes] = useState('')

  const updateArrest = (i: number, patch: Partial<ArrestEntry>) => {
    setArrests((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      matterType: 'expunction',
      clientName: client.clientName,
      clientEmail: client.clientEmail || undefined,
      clientPhone: client.clientPhone || undefined,
      data: {
        arrests: arrests.map((a) => ({
          arrestDate: a.arrestDate,
          county: a.county,
          agency: a.agency || undefined,
          offense: a.offense,
          level: a.level,
          disposition: a.disposition,
          dispositionDate: a.dispositionDate || undefined,
          sameTransactionFelony: a.sameTransactionFelony,
        })),
        priorExpunction,
        notes: notes || undefined,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ClientInfoFields value={client} onChange={setClient} />

      {arrests.map((arrest, i) => (
        <Section key={i} title={`Arrest #${i + 1}`}>
          <div className="grid grid-cols-2 gap-3">
            <DateField label="Arrest date" required value={arrest.arrestDate} onChange={(v) => updateArrest(i, { arrestDate: v })} />
            <TextField label="County" required value={arrest.county} onChange={(v) => updateArrest(i, { county: v })} />
          </div>
          <TextField label="Arresting agency" value={arrest.agency} onChange={(v) => updateArrest(i, { agency: v })} placeholder="e.g. Austin PD" />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Offense charged" required value={arrest.offense} onChange={(v) => updateArrest(i, { offense: v })} placeholder="e.g. Poss. marijuana < 2oz" />
            <SelectField
              label="Offense level" required value={arrest.level} onChange={(v) => updateArrest(i, { level: v })}
              options={[
                { value: 'classC', label: 'Class C misdemeanor' },
                { value: 'classB', label: 'Class B misdemeanor' },
                { value: 'classA', label: 'Class A misdemeanor' },
                { value: 'felony', label: 'Felony (any degree)' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Outcome (per client — will be record-verified)" required value={arrest.disposition}
              onChange={(v) => updateArrest(i, { disposition: v })}
              options={[
                { value: 'never-charged', label: 'Never charged after arrest' },
                { value: 'dismissed', label: 'Charge dismissed' },
                { value: 'acquitted', label: 'Acquitted at trial' },
                { value: 'diversion-completed', label: 'Diversion / pretrial program completed' },
                { value: 'deferred-completed', label: 'Deferred adjudication completed' },
                { value: 'probation-completed', label: 'Probation completed' },
                { value: 'convicted', label: 'Convicted' },
                { value: 'pending', label: 'Still pending' },
              ]}
            />
            <DateField label="Disposition date" value={arrest.dispositionDate} onChange={(v) => updateArrest(i, { dispositionDate: v })} />
          </div>
          <CheckField
            label="A felony charge arose from this same incident"
            checked={arrest.sameTransactionFelony}
            onChange={(v) => updateArrest(i, { sameTransactionFelony: v })}
            warn
          />
          {arrests.length > 1 && (
            <button
              type="button"
              onClick={() => setArrests((prev) => prev.filter((_, idx) => idx !== i))}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
            >
              <Trash2 size={14} /> Remove this arrest
            </button>
          )}
        </Section>
      ))}

      <button
        type="button"
        onClick={() => setArrests((prev) => [...prev, emptyArrest()])}
        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        <Plus size={16} /> Add another arrest
      </button>

      <Section title="History & notes">
        <CheckField label="Client has previously been granted an expunction" checked={priorExpunction} onChange={setPriorExpunction} />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          placeholder="Anything else — co-arrestees, program details, urgency (job application, etc.)"
        />
      </Section>

      <FormActions onClose={onClose} isLoading={isLoading} />
    </form>
  )
}
