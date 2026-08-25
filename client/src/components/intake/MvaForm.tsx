import { useState } from 'react'
import {
  TextField, DateField, SelectField, CheckField, Section, FormActions,
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

      <Section title="The wreck">
        <div className="grid grid-cols-2 gap-3">
          <DateField label="Date of accident" required value={accidentDate} onChange={setAccidentDate} hint="Starts the 2-year limitations clock" />
          <TextField label="County" value={accidentCounty} onChange={setAccidentCounty} />
        </div>
        <SelectField
          label="What happened?" required value={liabilityScenario} onChange={setLiabilityScenario}
          options={[
            { value: 'rear-ended', label: 'Client was rear-ended' },
            { value: 'other-driver-cited', label: 'Other driver was cited by police' },
            { value: 'other-driver-dwi', label: 'Other driver was DWI' },
            { value: 'left-turn-red-light', label: 'Other driver turned left / ran a light' },
            { value: 'hit-and-run', label: 'Hit and run' },
            { value: 'disputed', label: 'Fault is disputed' },
            { value: 'client-cited', label: 'Client was cited' },
            { value: 'other', label: 'Something else' },
          ]}
        />
        <CheckField label="Client received any citation from the accident" checked={clientCited} onChange={setClientCited} warn />
        <CheckField label="Client believes they may share some fault" checked={clientPartialFault} onChange={setClientPartialFault} warn />
        <CheckField label="A commercial vehicle (18-wheeler, company truck, rideshare) was involved" checked={commercialVehicle} onChange={setCommercialVehicle} warn />
      </Section>

      <Section title="Injuries & treatment">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Injury severity" required value={injurySeverity} onChange={setInjurySeverity}
            options={[
              { value: 'soft-tissue', label: 'Soft tissue / sprains' },
              { value: 'fractures', label: 'Fractures (no surgery)' },
              { value: 'surgery', label: 'Surgery done or recommended' },
              { value: 'catastrophic', label: 'Catastrophic' },
            ]}
          />
          <SelectField
            label="Treatment status" required value={treatmentStatus} onChange={setTreatmentStatus}
            options={[
              { value: 'not-started', label: 'Not started yet' },
              { value: 'treating', label: 'Currently treating' },
              { value: 'complete', label: 'Treatment complete' },
            ]}
          />
        </div>
        <CheckField label="Anyone died in the accident" checked={fatality} onChange={setFatality} warn />
        <TextField label="Providers so far (ER, urgent care, chiro, ortho…)" value={providers} onChange={setProviders} placeholder="Name + city, separated by commas" />
        <CheckField label="Client is under 18" checked={clientIsMinor} onChange={setClientIsMinor} warn />
      </Section>

      <Section title="Insurance (the case IS the coverage)">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Other driver's name" value={otherDriverName} onChange={setOtherDriverName} />
          <TextField label="Other driver's insurance carrier" value={liabilityCarrier} onChange={setLiabilityCarrier} />
          <TextField label="Claim number (if opened)" value={claimNumber} onChange={setClaimNumber} />
          <TextField label="Client's own auto carrier" value={clientAutoCarrier} onChange={setClientAutoCarrier} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <SelectField
            label="UM/UIM coverage?" value={umUimCoverage} onChange={setUmUimCoverage}
            options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unknown', label: 'Unknown' }]}
          />
          <SelectField
            label="PIP / MedPay?" value={pipMedPay} onChange={setPipMedPay}
            options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unknown', label: 'Unknown' }]}
          />
          <SelectField
            label="Health insurance" value={healthInsurance} onChange={setHealthInsurance}
            options={[
              { value: 'private', label: 'Private' },
              { value: 'medicare', label: 'Medicare' },
              { value: 'medicaid', label: 'Medicaid' },
              { value: 'erisa', label: 'Employer self-funded (ERISA)' },
              { value: 'none', label: 'None' },
              { value: 'unknown', label: 'Unknown' },
            ]}
          />
        </div>
      </Section>

      <Section title="Risk screens">
        <CheckField label="Client already gave a recorded statement to an adjuster" checked={recordedStatementGiven} onChange={setRecordedStatementGiven} warn />
        <CheckField label="Another attorney was previously hired on this case" checked={priorAttorney} onChange={setPriorAttorney} warn />
      </Section>

      <Section title="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          placeholder="Prior accidents, preexisting conditions, witnesses, photos, other claimants…"
        />
      </Section>

      <FormActions onClose={onClose} isLoading={isLoading} />
    </form>
  )
}
