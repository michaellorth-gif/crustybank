import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  TextField, DateField, SelectField, CheckField, Section, FormActions, NotesField,
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
        <Section
          key={i}
          title={arrests.length > 1 ? `Arrest ${i + 1}` : 'About the arrest'}
          intro={i === 0 ? 'Each arrest is looked at separately, so add one entry per arrest. Your best memory is fine — we verify everything against the official records before filing anything.' : undefined}
        >
          <div className="grid grid-cols-2 gap-3">
            <DateField label="When were you arrested?" required value={arrest.arrestDate} onChange={(v) => updateArrest(i, { arrestDate: v })} hint="Approximate is okay." />
            <TextField label="In what county?" required value={arrest.county} onChange={(v) => updateArrest(i, { county: v })} />
          </div>
          <TextField label="Which police department or agency?" value={arrest.agency} onChange={(v) => updateArrest(i, { agency: v })} placeholder="e.g. Austin Police, Travis County Sheriff" />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="What were you arrested for?" required value={arrest.offense} onChange={(v) => updateArrest(i, { offense: v })} placeholder="e.g. Possession of marijuana" />
            <SelectField
              label="How serious was the charge?" required value={arrest.level} onChange={(v) => updateArrest(i, { level: v })}
              options={[
                { value: 'classC', label: 'Ticket-level (fine only) — Class C' },
                { value: 'classB', label: 'Misdemeanor, up to 180 days jail — Class B' },
                { value: 'classA', label: 'Misdemeanor, up to 1 year jail — Class A' },
                { value: 'felony', label: 'Felony' },
              ]}
              hint="If you're not sure, pick your best guess — the records will tell us."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="How did the case end?" required value={arrest.disposition}
              onChange={(v) => updateArrest(i, { disposition: v })}
              options={[
                { value: 'never-charged', label: 'I was arrested but never charged' },
                { value: 'dismissed', label: 'The charge was dismissed' },
                { value: 'acquitted', label: 'I went to trial and was found not guilty' },
                { value: 'diversion-completed', label: 'I finished a diversion or pretrial program' },
                { value: 'deferred-completed', label: 'I finished deferred adjudication (probation) and it was dismissed' },
                { value: 'probation-completed', label: 'I was convicted and finished probation' },
                { value: 'convicted', label: 'I was convicted' },
                { value: 'pending', label: "It's still going on" },
              ]}
            />
            <DateField label="When did it end?" value={arrest.dispositionDate} onChange={(v) => updateArrest(i, { dispositionDate: v })} hint="Approximate is okay." />
          </div>
          <CheckField
            label="I was also charged with a felony from this same incident"
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

      <Section title="One more question">
        <CheckField label="I've had a record cleared (expunged) before" checked={priorExpunction} onChange={setPriorExpunction} hint="Some types of relief can only be used once, so this helps us check." />
      </Section>

      <NotesField value={notes} onChange={setNotes} placeholder="A job or apartment application coming up, others arrested with you, anything you're worried about…" />

      <FormActions onClose={onClose} isLoading={isLoading} />
    </form>
  )
}
