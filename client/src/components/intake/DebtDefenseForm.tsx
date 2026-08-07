import { useState } from 'react'
import {
  TextField, DateField, SelectField, CheckField, Section, FormActions,
  ClientInfoFields, ClientInfo, IntakePayload,
} from './fields'

export default function DebtDefenseForm({
  onSubmit, onClose, isLoading,
}: {
  onSubmit: (payload: IntakePayload) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [client, setClient] = useState<ClientInfo>({ clientName: '', clientEmail: '', clientPhone: '' })
  const [courtType, setCourtType] = useState('justice')
  const [county, setCounty] = useState('')
  const [causeNumber, setCauseNumber] = useState('')
  const [plaintiffName, setPlaintiffName] = useState('')
  const [plaintiffFirm, setPlaintiffFirm] = useState('')
  const [amountClaimed, setAmountClaimed] = useState('')
  const [served, setServed] = useState(true)
  const [serviceDate, setServiceDate] = useState('')
  const [defaultJudgmentSigned, setDefaultJudgmentSigned] = useState(false)
  const [swornPetition, setSwornPetition] = useState(false)
  const [originalCreditor, setOriginalCreditor] = useState('')
  const [recognizesDebt, setRecognizesDebt] = useState('unsure')
  const [lastPaymentDate, setLastPaymentDate] = useState('')
  const [priorBankruptcy, setPriorBankruptcy] = useState(false)
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      matterType: 'debt-defense',
      clientName: client.clientName,
      clientEmail: client.clientEmail || undefined,
      clientPhone: client.clientPhone || undefined,
      data: {
        courtType,
        county,
        causeNumber: causeNumber || undefined,
        plaintiffName,
        plaintiffFirm: plaintiffFirm || undefined,
        amountClaimed: amountClaimed ? Number(amountClaimed) : undefined,
        served,
        serviceDate: served && serviceDate ? serviceDate : undefined,
        defaultJudgmentSigned,
        swornPetition,
        originalCreditor: originalCreditor || undefined,
        recognizesDebt,
        lastPaymentDate: lastPaymentDate || undefined,
        priorBankruptcy,
        notes: notes || undefined,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ClientInfoFields value={client} onChange={setClient} />

      <Section title="The lawsuit">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Court" required value={courtType} onChange={setCourtType}
            options={[
              { value: 'justice', label: 'Justice court (JP)' },
              { value: 'county', label: 'County court' },
              { value: 'district', label: 'District court' },
            ]}
          />
          <TextField label="County" required value={county} onChange={setCounty} placeholder="e.g. Harris" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Cause number" value={causeNumber} onChange={setCauseNumber} />
          <TextField label="Amount claimed ($)" type="number" value={amountClaimed} onChange={setAmountClaimed} />
        </div>
        <TextField label="Plaintiff (exactly as pleaded)" required value={plaintiffName} onChange={setPlaintiffName} placeholder="e.g. Midland Credit Management, Inc." />
        <TextField label="Plaintiff's law firm" value={plaintiffFirm} onChange={setPlaintiffFirm} />
        <CheckField label="Client has been served with citation" checked={served} onChange={setServed} />
        {served && (
          <DateField
            label="Date served" required value={serviceDate} onChange={setServiceDate}
            hint="From the citation / return of service — this starts the answer clock"
          />
        )}
        <CheckField label="Petition is sworn / verified (affidavit of account attached)" checked={swornPetition} onChange={setSwornPetition} />
        <CheckField label="A default judgment has already been signed" checked={defaultJudgmentSigned} onChange={setDefaultJudgmentSigned} warn />
      </Section>

      <Section title="The debt">
        <TextField label="Original creditor" value={originalCreditor} onChange={setOriginalCreditor} placeholder="e.g. Synchrony Bank / Care Credit" />
        <SelectField
          label="Does the client recognize this debt?" required value={recognizesDebt} onChange={setRecognizesDebt}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
            { value: 'unsure', label: 'Unsure' },
            { value: 'identity-theft', label: 'No — identity theft suspected' },
          ]}
        />
        <DateField
          label="Approximate date of last payment" value={lastPaymentDate} onChange={setLastPaymentDate}
          hint="Drives the 4-year limitations screen — best estimate is fine"
        />
        <CheckField label="Client has filed (or plans to file) bankruptcy" checked={priorBankruptcy} onChange={setPriorBankruptcy} warn />
      </Section>

      <Section title="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          placeholder="Collection contacts, prior settlements, client goals, exposed assets…"
        />
      </Section>

      <FormActions onClose={onClose} isLoading={isLoading} />
    </form>
  )
}
