import { useState } from 'react'
import {
  TextField, DateField, SelectField, CheckField, Section, FormActions, NotesField,
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

      <Section title="About the lawsuit" intro="Most of this is on the first page of the papers you received. Copy it as best you can.">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Which court is listed on the papers?" required value={courtType} onChange={setCourtType}
            options={[
              { value: 'justice', label: 'Justice Court (Justice of the Peace / "JP")' },
              { value: 'county', label: 'County Court' },
              { value: 'district', label: 'District Court' },
            ]}
            hint="Look near the top for “Justice Court,” “County Court at Law,” or “District Court.” JP is the most common for these cases."
          />
          <TextField label="County" required value={county} onChange={setCounty} placeholder="e.g. Harris" hint="The county named on the papers." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Case number (if you see one)" value={causeNumber} onChange={setCauseNumber} hint="Often labeled “Cause No.”" />
          <TextField label="Amount they say you owe ($)" type="number" value={amountClaimed} onChange={setAmountClaimed} />
        </div>
        <TextField
          label="Who is suing you?" required value={plaintiffName} onChange={setPlaintiffName}
          placeholder="e.g. Midland Credit Management, Inc."
          hint="The company name listed as “Plaintiff” — copy it exactly."
        />
        <TextField label="Law firm listed for the other side (if any)" value={plaintiffFirm} onChange={setPlaintiffFirm} />
        <CheckField
          label="I've been handed or mailed the official court papers"
          checked={served} onChange={setServed}
          hint="Lawyers call this being “served.” If you only found out some other way, uncheck this."
        />
        {served && (
          <DateField
            label="What date did you receive them?" required value={serviceDate} onChange={setServiceDate}
            hint="This date starts your deadline to respond, so please be as accurate as you can."
          />
        )}
        <CheckField
          label="The papers include a sworn statement or affidavit about the account"
          checked={swornPetition} onChange={setSwornPetition}
          hint="Look for a page signed before a notary, often titled “Affidavit.” It's fine if you're not sure — leave this unchecked."
        />
        <CheckField
          label="A judge has already ruled against me in this case"
          checked={defaultJudgmentSigned} onChange={setDefaultJudgmentSigned} warn
          hint="For example, you received a paper titled “Default Judgment.”"
        />
      </Section>

      <Section title="About the debt" intro="Estimates are fine here.">
        <TextField
          label="Which company was the debt originally with?" value={originalCreditor} onChange={setOriginalCreditor}
          placeholder="e.g. Capital One, Synchrony / Care Credit"
          hint="Often a different company than the one suing you — debts get sold."
        />
        <SelectField
          label="Do you recognize this debt as yours?" required value={recognizesDebt} onChange={setRecognizesDebt}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
            { value: 'unsure', label: "I'm not sure" },
            { value: 'identity-theft', label: 'No — I think someone used my identity' },
          ]}
        />
        <DateField
          label="Roughly when did you last make a payment on it?" value={lastPaymentDate} onChange={setLastPaymentDate}
          hint="Your best guess is enough. Old debts can have important legal deadlines."
        />
        <CheckField
          label="I have filed for bankruptcy, or I'm planning to"
          checked={priorBankruptcy} onChange={setPriorBankruptcy} warn
        />
      </Section>

      <NotesField value={notes} onChange={setNotes} placeholder="Calls or letters from collectors, anything you already paid, what you're hoping for…" />

      <FormActions onClose={onClose} isLoading={isLoading} />
    </form>
  )
}
