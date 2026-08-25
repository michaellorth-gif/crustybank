import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  TextField, SelectField, CheckField, Section, FormActions,
  ClientInfoFields, ClientInfo, IntakePayload,
} from './fields'

interface ChildEntry {
  name: string
  minor: boolean
  fromPriorRelationship: boolean
}

export default function EstateForm({
  onSubmit, onClose, isLoading,
}: {
  onSubmit: (payload: IntakePayload) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [client, setClient] = useState<ClientInfo>({ clientName: '', clientEmail: '', clientPhone: '' })
  const [maritalStatus, setMaritalStatus] = useState('single')
  const [spouseName, setSpouseName] = useState('')
  const [mirrorPackageForSpouse, setMirrorPackageForSpouse] = useState(false)
  const [children, setChildren] = useState<ChildEntry[]>([])
  const [executorName, setExecutorName] = useState('')
  const [executorAltName, setExecutorAltName] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [financialAgent, setFinancialAgent] = useState('')
  const [financialAgentAlt, setFinancialAgentAlt] = useState('')
  const [medicalAgent, setMedicalAgent] = useState('')
  const [medicalAgentAlt, setMedicalAgentAlt] = useState('')
  const [poaEffective, setPoaEffective] = useState('immediately')
  const [residuaryPlan, setResiduaryPlan] = useState('spouse-then-children')
  const [residuaryOther, setResiduaryOther] = useState('')
  const [trustAge, setTrustAge] = useState('25')
  const [homesteadCounty, setHomesteadCounty] = useState('')
  const [estateOverExemptionRisk, setEstateOverExemptionRisk] = useState(false)
  const [specialNeedsBeneficiary, setSpecialNeedsBeneficiary] = useState(false)
  const [disinheritance, setDisinheritance] = useState(false)
  const [capacityConcerns, setCapacityConcerns] = useState(false)
  const [complexAssets, setComplexAssets] = useState(false)
  const [outOfStateProperty, setOutOfStateProperty] = useState(false)
  const [priorWill, setPriorWill] = useState(false)
  const [notes, setNotes] = useState('')

  const married = maritalStatus === 'married'
  const hasMinors = children.some((c) => c.minor)

  const updateChild = (i: number, patch: Partial<ChildEntry>) =>
    setChildren((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      matterType: 'estate-package',
      clientName: client.clientName,
      clientEmail: client.clientEmail || undefined,
      clientPhone: client.clientPhone || undefined,
      data: {
        maritalStatus,
        spouseName: married ? spouseName : undefined,
        mirrorPackageForSpouse: married ? mirrorPackageForSpouse : undefined,
        children: children.filter((c) => c.name.trim()),
        executorName,
        executorAltName: executorAltName || undefined,
        guardianName: guardianName || undefined,
        financialAgent,
        financialAgentAlt: financialAgentAlt || undefined,
        medicalAgent,
        medicalAgentAlt: medicalAgentAlt || undefined,
        poaEffective,
        residuaryPlan,
        residuaryOther: residuaryPlan === 'other' ? residuaryOther : undefined,
        trustAge: Number(trustAge) || 25,
        homesteadCounty: homesteadCounty || undefined,
        estateOverExemptionRisk,
        specialNeedsBeneficiary,
        disinheritance,
        capacityConcerns,
        complexAssets,
        outOfStateProperty,
        priorWill,
        notes: notes || undefined,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ClientInfoFields value={client} onChange={setClient} />

      <Section title="Family">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Marital status" required value={maritalStatus} onChange={setMaritalStatus}
            options={[
              { value: 'single', label: 'Single' },
              { value: 'married', label: 'Married' },
              { value: 'widowed', label: 'Widowed' },
              { value: 'divorced', label: 'Divorced' },
            ]}
          />
          <TextField label="County of residence" value={homesteadCounty} onChange={setHomesteadCounty} />
        </div>
        {married && (
          <>
            <TextField label="Spouse's full name" required value={spouseName} onChange={setSpouseName} />
            <CheckField label="Spouse wants a mirror-image package too (bundle)" checked={mirrorPackageForSpouse} onChange={setMirrorPackageForSpouse} />
          </>
        )}
        {children.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1">
              <TextField label={`Child ${i + 1} — full name`} value={c.name} onChange={(v) => updateChild(i, { name: v })} />
            </div>
            <div className="flex flex-col gap-1 pt-5">
              <CheckField label="Minor" checked={c.minor} onChange={(v) => updateChild(i, { minor: v })} />
              <CheckField label="Prior relationship" checked={c.fromPriorRelationship} onChange={(v) => updateChild(i, { fromPriorRelationship: v })} />
            </div>
            <button type="button" onClick={() => setChildren((p) => p.filter((_, idx) => idx !== i))} className="p-2 text-gray-400 hover:text-red-600 mt-4">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setChildren((p) => [...p, { name: '', minor: false, fromPriorRelationship: false }])}
          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <Plus size={14} /> Add child
        </button>
      </Section>

      <Section title="Who's in charge (name alternates — first choices get hit by buses too)">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Executor" required value={executorName} onChange={setExecutorName} />
          <TextField label="Alternate executor" value={executorAltName} onChange={setExecutorAltName} />
          <TextField label="Financial agent (POA)" required value={financialAgent} onChange={setFinancialAgent} />
          <TextField label="Alternate financial agent" value={financialAgentAlt} onChange={setFinancialAgentAlt} />
          <TextField label="Medical agent" required value={medicalAgent} onChange={setMedicalAgent} />
          <TextField label="Alternate medical agent" value={medicalAgentAlt} onChange={setMedicalAgentAlt} />
        </div>
        {hasMinors && (
          <TextField label="Guardian for minor children" required value={guardianName} onChange={setGuardianName} />
        )}
        <SelectField
          label="When does the financial POA take effect?" required value={poaEffective} onChange={setPoaEffective}
          options={[
            { value: 'immediately', label: 'Immediately (most common)' },
            { value: 'incapacity', label: 'Only on incapacity (springing)' },
          ]}
        />
      </Section>

      <Section title="Distribution plan">
        <SelectField
          label="Who inherits the estate?" required value={residuaryPlan} onChange={setResiduaryPlan}
          options={[
            { value: 'spouse-then-children', label: 'All to spouse, then children equally' },
            { value: 'children-equally', label: 'Children equally (per stirpes)' },
            { value: 'other', label: 'Something else (attorney drafts)' },
          ]}
        />
        {residuaryPlan === 'other' && (
          <TextField label="Describe the plan" value={residuaryOther} onChange={setResiduaryOther} />
        )}
        <TextField label="Hold inheritances in trust until age" type="number" value={trustAge} onChange={setTrustAge} />
      </Section>

      <Section title="Screening (honest answers route the case correctly)">
        <CheckField label="Total estate (including life insurance) may approach the federal estate-tax exemption" checked={estateOverExemptionRisk} onChange={setEstateOverExemptionRisk} warn />
        <CheckField label="A beneficiary has special needs / receives government benefits" checked={specialNeedsBeneficiary} onChange={setSpecialNeedsBeneficiary} warn />
        <CheckField label="Plan disinherits a spouse or child, or treats children unequally in a way they don't expect" checked={disinheritance} onChange={setDisinheritance} warn />
        <CheckField label="Any concern about memory, capacity, or family pressure driving this plan" checked={capacityConcerns} onChange={setCapacityConcerns} warn />
        <CheckField label="Owns a business, significant mineral interests, or foreign assets" checked={complexAssets} onChange={setComplexAssets} warn />
        <CheckField label="Owns real estate outside Texas" checked={outOfStateProperty} onChange={setOutOfStateProperty} warn />
        <CheckField label="Has an existing will or POA (will be revoked/replaced)" checked={priorWill} onChange={setPriorWill} />
      </Section>

      <Section title="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          placeholder="Specific gifts, excluded persons, storage preferences…"
        />
      </Section>

      <FormActions onClose={onClose} isLoading={isLoading} />
    </form>
  )
}
