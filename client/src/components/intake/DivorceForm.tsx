import { useState } from 'react'
import {
  TextField, DateField, CheckField, Section, FormActions, NotesField,
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

      <Section
        title="Does the flat-fee divorce fit your situation?"
        intro="Check everything that's true. If some of these don't apply, that's okay — we'll tell you honestly which kind of divorce fits and what it costs before you decide anything."
      >
        <TextField label="Which county do you live in?" required value={filingCounty} onChange={setFilingCounty} hint="The divorce is usually filed in the county where you or your spouse lives." />
        <CheckField
          label="One of us has lived in Texas for at least 6 months, and in that county for at least 90 days"
          checked={residencyStateSixMonths && residencyCountyNinetyDays}
          onChange={(v) => { setResidencyStateSixMonths(v); setResidencyCountyNinetyDays(v) }}
          hint="Texas requires this before a divorce can be filed."
        />
        <CheckField label="My spouse and I agree on how to split everything — property, accounts, and debts" checked={fullAgreement} onChange={setFullAgreement} />
        <CheckField
          label="My spouse will sign the paperwork voluntarily"
          checked={spouseWillSignWaiver} onChange={setSpouseWillSignWaiver}
          hint="This means no one has to be officially served by a process server."
        />
        <CheckField label="We have children together under 18" checked={minorChildren} onChange={setMinorChildren} warn hint="Children from other relationships don't count here." />
        <CheckField label="Someone in the marriage is currently pregnant" checked={wifePregnant} onChange={setWifePregnant} warn />
        <CheckField label="Either of us owns a house, land, or other real estate" checked={realProperty} onChange={setRealProperty} warn />
        <CheckField
          label="A retirement account (401k, pension) needs to be divided between us"
          checked={retirementDivision} onChange={setRetirementDivision} warn
          hint="Each keeping their own is fine — this is only about splitting one."
        />
        <CheckField
          label="There has been violence, threats, or fear in the relationship"
          checked={familyViolence} onChange={setFamilyViolence} warn
          hint="Your answer is confidential and only seen by the attorney. It helps us make sure you're safe and treated fairly."
        />
        <CheckField label="Either of us is active-duty military and currently deployed" checked={activeDutyDeployed} onChange={setActiveDutyDeployed} warn />
      </Section>

      <Section title="About the marriage">
        <TextField label="Your spouse's full name" required value={respondentName} onChange={setRespondentName} />
        <TextField label="Your spouse's mailing address" value={respondentAddress} onChange={setRespondentAddress} hint="Where we'd send them the paperwork to sign." />
        <div className="grid grid-cols-2 gap-3">
          <DateField label="When were you married?" value={marriageDate} onChange={setMarriageDate} hint="Approximate is okay." />
          <DateField label="When did you stop living together?" value={separationDate} onChange={setSeparationDate} hint="Approximate is okay." />
        </div>
        <CheckField label="One of us wants to go back to a former name" checked={nameChangeRequested} onChange={setNameChangeRequested} hint="This can be included in the divorce at no extra charge." />
        {nameChangeRequested && (
          <TextField label="The name to restore (spelled exactly as it should appear)" value={formerName} onChange={setFormerName} />
        )}
      </Section>

      <NotesField value={notes} onChange={setNotes} placeholder="Cars, bank accounts, credit cards, any timing you're hoping for…" />

      <FormActions onClose={onClose} isLoading={isLoading} />
    </form>
  )
}
