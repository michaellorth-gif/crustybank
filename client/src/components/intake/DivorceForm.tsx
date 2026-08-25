import { useState } from 'react'
import {
  TextField, DateField, CheckField, Section, FormActions,
  ClientInfoFields, ClientInfo, IntakePayload,
} from './fields'

export default function DivorceForm({
  onSubmit, onClose, isLoading,
}: {
  onSubmit: (payload: IntakePayload) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [client, setClient] = useState<ClientInfo>({ clientName: '', clientEmail: '', clientPhone: '' })
  const [respondentName, setRespondentName] = useState('')
  const [respondentAddress, setRespondentAddress] = useState('')
  const [formerName, setFormerName] = useState('')
  const [filingCounty, setFilingCounty] = useState('')
  const [residencyStateSixMonths, setResidencyStateSixMonths] = useState(false)
  const [residencyCountyNinetyDays, setResidencyCountyNinetyDays] = useState(false)
  const [minorChildren, setMinorChildren] = useState(false)
  const [wifePregnant, setWifePregnant] = useState(false)
  const [realProperty, setRealProperty] = useState(false)
  const [retirementDivision, setRetirementDivision] = useState(false)
  const [fullAgreement, setFullAgreement] = useState(false)
  const [familyViolence, setFamilyViolence] = useState(false)
  const [spouseWillSignWaiver, setSpouseWillSignWaiver] = useState(false)
  const [activeDutyDeployed, setActiveDutyDeployed] = useState(false)
  const [marriageDate, setMarriageDate] = useState('')
  const [separationDate, setSeparationDate] = useState('')
  const [nameChangeRequested, setNameChangeRequested] = useState(false)
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      matterType: 'uncontested-divorce',
      clientName: client.clientName,
      clientEmail: client.clientEmail || undefined,
      clientPhone: client.clientPhone || undefined,
      data: {
        respondentName,
        respondentAddress: respondentAddress || undefined,
        formerName: formerName || undefined,
        filingCounty,
        residencyStateSixMonths,
        residencyCountyNinetyDays,
        minorChildren,
        wifePregnant,
        realProperty,
        retirementDivision,
        fullAgreement,
        familyViolence,
        spouseWillSignWaiver,
        activeDutyDeployed,
        marriageDate: marriageDate || undefined,
        separationDate: separationDate || undefined,
        nameChangeRequested,
        notes: notes || undefined,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ClientInfoFields value={client} onChange={setClient} />

      <Section title="Tier 1 gate — answer honestly; failing the gate just means a different track">
        <TextField label="County where the divorce would be filed" required value={filingCounty} onChange={setFilingCounty} />
        <CheckField
          label="At least one spouse has lived in Texas for the last 6 months AND in the filing county for the last 90 days"
          checked={residencyStateSixMonths && residencyCountyNinetyDays}
          onChange={(v) => { setResidencyStateSixMonths(v); setResidencyCountyNinetyDays(v) }}
        />
        <CheckField label="The spouses agree on how to divide ALL property and debts" checked={fullAgreement} onChange={setFullAgreement} />
        <CheckField label="The other spouse will sign a waiver of service (cooperative, reachable)" checked={spouseWillSignWaiver} onChange={setSpouseWillSignWaiver} />
        <CheckField label="There are children of the marriage under 18 (or wife's household expects one)" checked={minorChildren} onChange={setMinorChildren} warn />
        <CheckField label="The wife is currently pregnant" checked={wifePregnant} onChange={setWifePregnant} warn />
        <CheckField label="Either spouse owns real estate (house, land, mineral interests)" checked={realProperty} onChange={setRealProperty} warn />
        <CheckField label="A retirement account (401k / pension) needs to be split between spouses" checked={retirementDivision} onChange={setRetirementDivision} warn />
        <CheckField label="There has been violence, threats, or fear between the spouses" checked={familyViolence} onChange={setFamilyViolence} warn />
        <CheckField label="Either spouse is active-duty military currently deployed" checked={activeDutyDeployed} onChange={setActiveDutyDeployed} warn />
      </Section>

      <Section title="Marriage details">
        <TextField label="Other spouse (respondent) — full name" required value={respondentName} onChange={setRespondentName} />
        <TextField label="Respondent's mailing address" value={respondentAddress} onChange={setRespondentAddress} placeholder="For the waiver packet" />
        <div className="grid grid-cols-2 gap-3">
          <DateField label="Date of marriage" value={marriageDate} onChange={setMarriageDate} />
          <DateField label="Date of separation" value={separationDate} onChange={setSeparationDate} />
        </div>
        <CheckField label="A spouse wants a former name restored in the decree" checked={nameChangeRequested} onChange={setNameChangeRequested} />
        {nameChangeRequested && (
          <TextField label="Former name to restore (exact spelling)" value={formerName} onChange={setFormerName} />
        )}
      </Section>

      <Section title="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          placeholder="Vehicles, accounts, debts, timing constraints…"
        />
      </Section>

      <FormActions onClose={onClose} isLoading={isLoading} />
    </form>
  )
}
