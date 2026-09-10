import { useState } from 'react'
import {
  TextField, DateField, SelectField, CheckField, Section, FormActions, NotesField,
  ClientInfoFields, ClientInfo, IntakePayload,
} from './fields'

export default function MvaForm({
  onSubmit, onClose, isLoading,
}: {
  onSubmit: (payload: IntakePayload) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [client, setClient] = useState<ClientInfo>({ clientName: '', clientEmail: '', clientPhone: '' })
  const [accidentDate, setAccidentDate] = useState('')
  const [accidentCounty, setAccidentCounty] = useState('')
  const [liabilityScenario, setLiabilityScenario] = useState('rear-ended')
  const [clientCited, setClientCited] = useState(false)
  const [clientPartialFault, setClientPartialFault] = useState(false)
  const [injurySeverity, setInjurySeverity] = useState('soft-tissue')
  const [fatality, setFatality] = useState(false)
  const [treatmentStatus, setTreatmentStatus] = useState('treating')
  const [providers, setProviders] = useState('')
  const [otherDriverName, setOtherDriverName] = useState('')
  const [liabilityCarrier, setLiabilityCarrier] = useState('')
  const [claimNumber, setClaimNumber] = useState('')
  const [clientAutoCarrier, setClientAutoCarrier] = useState('')
  const [umUimCoverage, setUmUimCoverage] = useState('unknown')
  const [pipMedPay, setPipMedPay] = useState('unknown')
  const [healthInsurance, setHealthInsurance] = useState('unknown')
  const [commercialVehicle, setCommercialVehicle] = useState(false)
  const [priorAttorney, setPriorAttorney] = useState(false)
  const [recordedStatementGiven, setRecordedStatementGiven] = useState(false)
  const [clientIsMinor, setClientIsMinor] = useState(false)
  const [notes, setNotes] = useState('')

  const yesNoUnknown = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'unknown', label: "I don't know" },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      matterType: 'reduced-fee-mva',
      clientName: client.clientName,
      clientEmail: client.clientEmail || undefined,
      clientPhone: client.clientPhone || undefined,
      data: {
        accidentDate,
        accidentCounty: accidentCounty || undefined,
        liabilityScenario,
        clientCited,
        clientPartialFault,
        injurySeverity,
        fatality,
        treatmentStatus,
        providers: providers || undefined,
        otherDriverName: otherDriverName || undefined,
        liabilityCarrier: liabilityCarrier || undefined,
        claimNumber: claimNumber || undefined,
        clientAutoCarrier: clientAutoCarrier || undefined,
        umUimCoverage,
        pipMedPay,
        healthInsurance,
        commercialVehicle,
        priorAttorney,
        recordedStatementGiven,
        clientIsMinor,
        notes: notes || undefined,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ClientInfoFields value={client} onChange={setClient} />

      <Section title="What happened?">
        <div className="grid grid-cols-2 gap-3">
          <DateField label="When was the accident?" required value={accidentDate} onChange={setAccidentDate} hint="Texas gives you a limited time after a wreck to bring a claim, so this date matters." />
          <TextField label="In what county?" value={accidentCounty} onChange={setAccidentCounty} />
        </div>
        <SelectField
          label="Which of these best describes it?" required value={liabilityScenario} onChange={setLiabilityScenario}
          options={[
            { value: 'rear-ended', label: 'I was rear-ended' },
            { value: 'other-driver-cited', label: 'The other driver got the ticket' },
            { value: 'other-driver-dwi', label: 'The other driver was drunk or on drugs' },
            { value: 'left-turn-red-light', label: 'The other driver turned in front of me or ran a light' },
            { value: 'hit-and-run', label: 'The other driver left the scene' },
            { value: 'disputed', label: "We disagree about whose fault it was" },
            { value: 'client-cited', label: 'I got the ticket' },
            { value: 'other', label: 'Something else' },
          ]}
        />
        <CheckField label="I received a ticket or citation from the accident" checked={clientCited} onChange={setClientCited} warn />
        <CheckField label="I think I may have been partly at fault" checked={clientPartialFault} onChange={setClientPartialFault} warn hint="Honesty here helps us — it changes how the case is handled, not whether we'll talk to you." />
        <CheckField label="The other vehicle was a commercial vehicle" checked={commercialVehicle} onChange={setCommercialVehicle} warn hint="An 18-wheeler, delivery truck, company vehicle, or a rideshare driver on a trip." />
      </Section>

      <Section title="Your injuries and treatment">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="How badly were you hurt?" required value={injurySeverity} onChange={setInjurySeverity}
            options={[
              { value: 'soft-tissue', label: 'Sore, strained, or bruised — no broken bones' },
              { value: 'fractures', label: 'Broken bone(s), no surgery' },
              { value: 'surgery', label: 'I had surgery, or a doctor recommended it' },
              { value: 'catastrophic', label: 'Life-changing injuries' },
            ]}
          />
          <SelectField
            label="Where are you in treatment?" required value={treatmentStatus} onChange={setTreatmentStatus}
            options={[
              { value: 'not-started', label: "I haven't seen a doctor yet" },
              { value: 'treating', label: "I'm still being treated" },
              { value: 'complete', label: "I've finished treatment" },
            ]}
            hint="If you haven't seen a doctor, please do soon — for your health first, and gaps in treatment hurt claims."
          />
        </div>
        <CheckField label="Someone died in this accident" checked={fatality} onChange={setFatality} warn hint="We're sorry. An attorney will contact you personally." />
        <TextField label="Where have you been treated so far?" value={providers} onChange={setProviders} placeholder="ER, urgent care, chiropractor, orthopedist — name and city, separated by commas" />
        <CheckField label="I'm under 18" checked={clientIsMinor} onChange={setClientIsMinor} warn hint="A parent or guardian will need to be involved." />
      </Section>

      <Section title="Insurance" intro="Fill in what you know. Anything you're unsure about, leave blank or pick “I don't know” — we'll find it.">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="The other driver's name" value={otherDriverName} onChange={setOtherDriverName} hint="From the crash report or the exchange of information." />
          <TextField label="The other driver's insurance company" value={liabilityCarrier} onChange={setLiabilityCarrier} />
          <TextField label="Claim number, if they gave you one" value={claimNumber} onChange={setClaimNumber} />
          <TextField label="Your own auto insurance company" value={clientAutoCarrier} onChange={setClientAutoCarrier} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <SelectField
            label="Does your policy cover uninsured drivers?" value={umUimCoverage} onChange={setUmUimCoverage}
            options={yesNoUnknown}
            hint="Called UM/UIM coverage."
          />
          <SelectField
            label="Does your policy pay your medical bills?" value={pipMedPay} onChange={setPipMedPay}
            options={yesNoUnknown}
            hint="Called PIP or MedPay. Many Texas policies include it."
          />
          <SelectField
            label="Your health insurance" value={healthInsurance} onChange={setHealthInsurance}
            options={[
              { value: 'private', label: 'Through work or bought privately' },
              { value: 'medicare', label: 'Medicare' },
              { value: 'medicaid', label: 'Medicaid' },
              { value: 'erisa', label: 'Employer self-funded plan' },
              { value: 'none', label: 'None' },
              { value: 'unknown', label: "I don't know" },
            ]}
            hint="Affects how medical bills get paid back at the end."
          />
        </div>
      </Section>

      <Section title="Two last questions">
        <CheckField label="I've already given a recorded statement to an insurance adjuster" checked={recordedStatementGiven} onChange={setRecordedStatementGiven} warn hint="Not a problem — we just need to know. Please don't give any more without talking to us." />
        <CheckField label="I hired another lawyer for this accident before" checked={priorAttorney} onChange={setPriorAttorney} warn />
      </Section>

      <NotesField value={notes} onChange={setNotes} placeholder="Witnesses, photos or video, earlier accidents or injuries to the same body parts, other people hurt in the wreck…" />

      <FormActions onClose={onClose} isLoading={isLoading} />
    </form>
  )
}
