import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  TextField, SelectField, CheckField, Section, FormActions, NotesField,
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

      <Section title="Your family">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Are you married?" required value={maritalStatus} onChange={setMaritalStatus}
            options={[
              { value: 'single', label: 'Single' },
              { value: 'married', label: 'Married' },
              { value: 'widowed', label: 'Widowed' },
              { value: 'divorced', label: 'Divorced' },
            ]}
          />
          <TextField label="Which county do you live in?" value={homesteadCounty} onChange={setHomesteadCounty} />
        </div>
        {married && (
          <>
            <TextField label="Your spouse's full name" required value={spouseName} onChange={setSpouseName} />
            <CheckField label="My spouse wants the same documents too" checked={mirrorPackageForSpouse} onChange={setMirrorPackageForSpouse} hint="Couples are priced as a bundle." />
          </>
        )}
        {children.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1">
              <TextField label={`Child ${i + 1} — full name`} value={c.name} onChange={(v) => updateChild(i, { name: v })} />
            </div>
            <div className="flex flex-col gap-1 pt-5">
              <CheckField label="Under 18" checked={c.minor} onChange={(v) => updateChild(i, { minor: v })} />
              <CheckField label="From a previous relationship" checked={c.fromPriorRelationship} onChange={(v) => updateChild(i, { fromPriorRelationship: v })} />
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
          <Plus size={14} /> Add a child
        </button>
      </Section>

      <Section
        title="The people you'd trust"
        intro="Name a first choice and a backup for each role. You can change your mind before signing."
      >
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Who should carry out your will?" required value={executorName} onChange={setExecutorName} hint="Called the executor. Often a spouse, adult child, or close friend." />
          <TextField label="Backup" value={executorAltName} onChange={setExecutorAltName} />
          <TextField label="Who should handle your finances if you can't?" required value={financialAgent} onChange={setFinancialAgent} hint="Financial power of attorney." />
          <TextField label="Backup" value={financialAgentAlt} onChange={setFinancialAgentAlt} />
          <TextField label="Who should make medical decisions if you can't?" required value={medicalAgent} onChange={setMedicalAgent} hint="Medical power of attorney." />
          <TextField label="Backup" value={medicalAgentAlt} onChange={setMedicalAgentAlt} />
        </div>
        {hasMinors && (
          <TextField label="Who should raise your children if neither parent can?" required value={guardianName} onChange={setGuardianName} hint="Called the guardian." />
        )}
        <SelectField
          label="When should the financial power of attorney start?" required value={poaEffective} onChange={setPoaEffective}
          options={[
            { value: 'immediately', label: 'Right away (most people choose this)' },
            { value: 'incapacity', label: 'Only if a doctor says I can’t manage my affairs' },
          ]}
        />
      </Section>

      <Section title="Who should inherit?">
        <SelectField
          label="When you pass away, who gets what you own?" required value={residuaryPlan} onChange={setResiduaryPlan}
          options={[
            { value: 'spouse-then-children', label: 'Everything to my spouse; if they’re gone, split equally among my children' },
            { value: 'children-equally', label: 'Split equally among my children' },
            { value: 'other', label: 'Something different (the attorney will work it out with you)' },
          ]}
        />
        {residuaryPlan === 'other' && (
          <TextField label="Tell us roughly what you have in mind" value={residuaryOther} onChange={setResiduaryOther} />
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">If someone inherits while young, hold their share until age</label>
          <input
            type="number"
            min={18}
            max={40}
            value={trustAge}
            onChange={(e) => setTrustAge(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Between 18 and 40. Most people pick 25.</p>
        </div>
      </Section>

      <Section
        title="A few questions that help us point you to the right service"
        intro="None of these are deal-breakers. They just tell us whether the simple package fits or whether you'd be better served by something more tailored."
      >
        <CheckField label="Everything I own, including life insurance, may be worth more than $10 million" checked={estateOverExemptionRisk} onChange={setEstateOverExemptionRisk} warn hint="Large estates can involve estate-tax planning." />
        <CheckField label="Someone who'd inherit has a disability or receives government benefits" checked={specialNeedsBeneficiary} onChange={setSpecialNeedsBeneficiary} warn hint="An inheritance can affect benefits unless it's set up carefully." />
        <CheckField label="I plan to leave out a spouse or child, or treat my children unequally in a way they may not expect" checked={disinheritance} onChange={setDisinheritance} warn />
        <CheckField
          label="I, or someone close to me, has concerns about my memory, or someone is pressuring me about these decisions"
          checked={capacityConcerns} onChange={setCapacityConcerns} warn
          hint="Your answer is confidential. It helps us make sure the documents truly reflect your wishes."
        />
        <CheckField label="I own a business, significant mineral rights, or property in another country" checked={complexAssets} onChange={setComplexAssets} warn />
        <CheckField label="I own real estate outside Texas" checked={outOfStateProperty} onChange={setOutOfStateProperty} warn />
        <CheckField label="I already have a will or power of attorney" checked={priorWill} onChange={setPriorWill} hint="New documents replace the old ones — we'll ask for copies." />
      </Section>

      <NotesField value={notes} onChange={setNotes} placeholder="Specific items you want to go to specific people, anyone you want left out, where you'd like the originals kept…" />

      <FormActions onClose={onClose} isLoading={isLoading} />
    </form>
  )
}
