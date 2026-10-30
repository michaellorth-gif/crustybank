import { useState } from 'react'
import {
  TextField, DateField, SelectField, CheckField, Section, FormActions, NotesField,
  ClientInfoFields, ClientInfo, IntakePayload,
} from './fields'

// Values a recall landing page can pass in so the client never retypes what the
// page already knows (product, recall number, hazard) and the submission carries
// the campaign slug for attribution.
export interface ProductPrefill {
  campaign?: string
  recallNumber?: string
  productName?: string
  brand?: string
  modelNumber?: string
  productCategory?: string
  hazardType?: string
}

export default function ProductInjuryForm({
  onSubmit, onClose, isLoading, prefill,
}: {
  onSubmit: (payload: IntakePayload) => void
  onClose: () => void
  isLoading: boolean
  prefill?: ProductPrefill
}) {
  const [client, setClient] = useState<ClientInfo>({ clientName: '', clientEmail: '', clientPhone: '' })
  const [incidentDate, setIncidentDate] = useState('')
  const [incidentCounty, setIncidentCounty] = useState('')
  const [productName, setProductName] = useState(prefill?.productName || '')
  const [brand, setBrand] = useState(prefill?.brand || '')
  const [modelNumber, setModelNumber] = useState(prefill?.modelNumber || '')
  const [productCategory, setProductCategory] = useState(prefill?.productCategory || 'other')
  const [hazardType, setHazardType] = useState(prefill?.hazardType || 'fire-burn')
  const [recallStatus, setRecallStatus] = useState(prefill?.recallNumber ? 'recalled' : 'unknown')
  const [recallNumber, setRecallNumber] = useState(prefill?.recallNumber || '')
  const [purchaseChannel, setPurchaseChannel] = useState('unknown')
  const [retailerName, setRetailerName] = useState('')
  const [sellerName, setSellerName] = useState('')
  const [manufacturerName, setManufacturerName] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [hasReceipt, setHasReceipt] = useState(false)
  const [productPreserved, setProductPreserved] = useState('yes')
  const [photosVideo, setPhotosVideo] = useState(false)
  const [injurySeverity, setInjurySeverity] = useState('moderate')
  const [fatality, setFatality] = useState(false)
  const [injuredIsMinor, setInjuredIsMinor] = useState(false)
  const [treatmentStatus, setTreatmentStatus] = useState('treating')
  const [providers, setProviders] = useState('')
  const [propertyDamage, setPropertyDamage] = useState('none')
  const [fireDepartmentReport, setFireDepartmentReport] = useState(false)
  const [insuranceClaimFiled, setInsuranceClaimFiled] = useState(false)
  const [insurerName, setInsurerName] = useState('')
  const [contactedManufacturer, setContactedManufacturer] = useState(false)
  const [acceptedCompensation, setAcceptedCompensation] = useState(false)
  const [cpscReportFiled, setCpscReportFiled] = useState(false)
  const [priorAttorney, setPriorAttorney] = useState(false)
  const [notes, setNotes] = useState('')

  const fireLike = hazardType === 'fire-burn' || hazardType === 'explosion'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      matterType: 'product-injury',
      clientName: client.clientName,
      clientEmail: client.clientEmail || undefined,
      clientPhone: client.clientPhone || undefined,
      data: {
        incidentDate,
        incidentCounty: incidentCounty || undefined,
        productName,
        brand: brand || undefined,
        modelNumber: modelNumber || undefined,
        productCategory,
        hazardType,
        recallStatus,
        recallNumber: recallStatus === 'recalled' && recallNumber ? recallNumber : undefined,
        campaign: prefill?.campaign || undefined,
        purchaseChannel,
        retailerName: retailerName || undefined,
        sellerName: sellerName || undefined,
        manufacturerName: manufacturerName || undefined,
        purchaseDate: purchaseDate || undefined,
        hasReceipt,
        productPreserved,
        photosVideo,
        injurySeverity,
        fatality,
        injuredIsMinor,
        treatmentStatus,
        providers: providers || undefined,
        propertyDamage,
        fireDepartmentReport,
        insuranceClaimFiled,
        insurerName: insuranceClaimFiled && insurerName ? insurerName : undefined,
        contactedManufacturer,
        acceptedCompensation,
        cpscReportFiled,
        priorAttorney,
        notes: notes || undefined,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ClientInfoFields value={client} onChange={setClient} />

      <Section title="The product">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="What is the product?" required value={productName} onChange={setProductName} placeholder="Space heater, power bank, e-bike battery…" />
          <TextField label="Brand" value={brand} onChange={setBrand} />
          <TextField label="Model number, if you can find it" value={modelNumber} onChange={setModelNumber} hint="Usually on a label on the bottom or back, or on the box." />
          <SelectField
            label="Type of product" value={productCategory} onChange={setProductCategory}
            options={[
              { value: 'battery-charger', label: 'Battery, power bank, or charger' },
              { value: 'heater-appliance', label: 'Heater or household appliance' },
              { value: 'ebike-scooter', label: 'E-bike, scooter, or hoverboard' },
              { value: 'furniture-tipover', label: 'Furniture (tip-over)' },
              { value: 'infant-child', label: 'Baby or children\'s product' },
              { value: 'tool-equipment', label: 'Tool or equipment' },
              { value: 'vehicle-part', label: 'Vehicle part or accessory' },
              { value: 'medical-device', label: 'Medical device' },
              { value: 'other', label: 'Something else' },
            ]}
          />
        </div>
        <SelectField
          label="What did it do?" required value={hazardType} onChange={setHazardType}
          options={[
            { value: 'fire-burn', label: 'Caught fire, overheated, or burned someone' },
            { value: 'explosion', label: 'Exploded' },
            { value: 'electric-shock', label: 'Electric shock' },
            { value: 'laceration', label: 'Cut or laceration' },
            { value: 'fall', label: 'Broke or collapsed and someone fell' },
            { value: 'choking-ingestion', label: 'Choking, swallowing, or poisoning' },
            { value: 'co-poisoning', label: 'Carbon monoxide' },
            { value: 'entrapment-strangulation', label: 'Trapped or strangled a child' },
            { value: 'other', label: 'Something else' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Has this product been recalled?" value={recallStatus} onChange={setRecallStatus}
            options={[
              { value: 'recalled', label: 'Yes, it was recalled' },
              { value: 'not-recalled', label: 'No, not that I know of' },
              { value: 'unknown', label: "I don't know" },
            ]}
            hint="We'll check the CPSC recall list either way."
          />
          {recallStatus === 'recalled' && (
            <TextField label="Recall number, if you have it" value={recallNumber} onChange={setRecallNumber} placeholder="e.g., 27-054" />
          )}
        </div>
      </Section>

      <Section title="What happened?">
        <div className="grid grid-cols-2 gap-3">
          <DateField label="When did it happen?" required value={incidentDate} onChange={setIncidentDate} hint="Texas gives you a limited time after an injury to bring a claim, so this date matters." />
          <TextField label="In what county?" value={incidentCounty} onChange={setIncidentCounty} />
        </div>
        <SelectField
          label="How badly was anyone hurt?" required value={injurySeverity} onChange={setInjurySeverity}
          options={[
            { value: 'minor', label: 'Minor — first aid, no doctor needed' },
            { value: 'moderate', label: 'Saw a doctor or went to the ER; no surgery' },
            { value: 'serious', label: 'Serious — hospital stay, surgery, or significant burns' },
            { value: 'catastrophic', label: 'Life-changing injuries' },
          ]}
        />
        <CheckField label="Someone died" checked={fatality} onChange={setFatality} warn hint="We're sorry. An attorney will contact you personally." />
        <CheckField label="The person hurt is under 18" checked={injuredIsMinor} onChange={setInjuredIsMinor} warn hint="A parent or guardian will need to be involved." />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Where are you in treatment?" required value={treatmentStatus} onChange={setTreatmentStatus}
            options={[
              { value: 'not-started', label: "Haven't seen a doctor yet" },
              { value: 'treating', label: 'Still being treated' },
              { value: 'complete', label: 'Finished treatment' },
            ]}
            hint="If no one has seen a doctor, please do soon — for your health first."
          />
          <SelectField
            label="Damage to your home or belongings?" value={propertyDamage} onChange={setPropertyDamage}
            options={[
              { value: 'none', label: 'None' },
              { value: 'minor', label: 'Minor — scorched surface, a few items' },
              { value: 'major', label: 'Major — a room or more, or expensive items' },
              { value: 'total-loss', label: 'Lost the home or vehicle' },
            ]}
          />
        </div>
        <TextField label="Where has the injured person been treated?" value={providers} onChange={setProviders} placeholder="ER, burn unit, urgent care, doctor — name and city, separated by commas" />
        {fireLike && (
          <CheckField label="The fire department came" checked={fireDepartmentReport} onChange={setFireDepartmentReport} hint="Their report is important — we'll request it." />
        )}
      </Section>

      <Section title="The product itself" intro="In a product case, the product is the proof. These questions matter more than they look.">
        <SelectField
          label="Do you still have the product?" required value={productPreserved} onChange={setProductPreserved}
          options={[
            { value: 'yes', label: 'Yes, I still have it' },
            { value: 'partially', label: 'Parts of it — it burned or broke apart' },
            { value: 'returned-to-seller', label: 'I sent it back to the seller or manufacturer' },
            { value: 'discarded', label: 'I threw it away' },
            { value: 'unknown', label: "I'm not sure where it is" },
          ]}
          hint="If you still have it: please don't throw it away, return it, or plug it in. Keep it exactly as it is."
        />
        <CheckField label="I have photos or video of the product, the damage, or the injuries" checked={photosVideo} onChange={setPhotosVideo} />
      </Section>

      <Section title="Where it came from" intro="Fill in what you know. A screenshot of your order history answers most of this.">
        <SelectField
          label="Where was it bought?" required value={purchaseChannel} onChange={setPurchaseChannel}
          options={[
            { value: 'amazon-third-party', label: 'Amazon — sold by a third-party seller' },
            { value: 'amazon-direct', label: 'Amazon — sold by Amazon itself' },
            { value: 'big-box', label: 'A store like Walmart, Target, Costco, Home Depot, Best Buy' },
            { value: 'online-retailer', label: 'Another website (Temu, Walmart.com, eBay, brand site)' },
            { value: 'manufacturer-direct', label: 'Directly from the manufacturer' },
            { value: 'secondhand-gift', label: 'It was a gift or bought used' },
            { value: 'unknown', label: "I don't know" },
          ]}
          hint="On Amazon, the order page says 'Sold by' — that name is what we need."
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Store or website" value={retailerName} onChange={setRetailerName} />
          <TextField label="'Sold by' name, if different" value={sellerName} onChange={setSellerName} />
          <TextField label="Manufacturer, if known" value={manufacturerName} onChange={setManufacturerName} hint="Often on the recall notice or the product label." />
          <DateField label="When was it bought?" value={purchaseDate} onChange={setPurchaseDate} hint="Approximate is fine." />
        </div>
        <CheckField label="I have the receipt or can find the order in my account" checked={hasReceipt} onChange={setHasReceipt} />
      </Section>

      <Section title="Insurance and the company">
        <CheckField label="I filed a homeowner's or renter's insurance claim for the damage" checked={insuranceClaimFiled} onChange={setInsuranceClaimFiled} hint="That's fine — we just need to coordinate so the product isn't taken or discarded." />
        {insuranceClaimFiled && (
          <TextField label="Insurance company" value={insurerName} onChange={setInsurerName} />
        )}
        <CheckField label="I've contacted the manufacturer or seller about what happened" checked={contactedManufacturer} onChange={setContactedManufacturer} warn hint="Not a problem — please don't contact them again until you've talked to us." />
        <CheckField label="I accepted a refund, replacement, gift card, or payment from them" checked={acceptedCompensation} onChange={setAcceptedCompensation} warn hint="Please keep anything you signed or were sent." />
        <CheckField label="I reported this to the CPSC (SaferProducts.gov)" checked={cpscReportFiled} onChange={setCpscReportFiled} />
        <CheckField label="I hired another lawyer for this before" checked={priorAttorney} onChange={setPriorAttorney} warn />
      </Section>

      <NotesField value={notes} onChange={setNotes} placeholder="How it was being used when it failed, who was there, what the company told you, anything else…" />

      <FormActions onClose={onClose} isLoading={isLoading} />
    </form>
  )
}
