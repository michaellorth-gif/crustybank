import React from 'react'

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm'

export function TextField({
  label, value, onChange, required, placeholder, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        placeholder={placeholder}
      />
    </div>
  )
}

export function DateField({
  label, value, onChange, required, hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input type="date" required={required} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

export function SelectField({
  label, value, onChange, options, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} required={required}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export function CheckField({
  label, checked, onChange, warn,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  warn?: boolean
}) {
  return (
    <label className={`flex items-start gap-2 text-sm ${warn && checked ? 'text-red-700' : 'text-gray-700'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
      />
      <span>{label}</span>
    </label>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-gray-200 pt-4">
      <legend className="text-sm font-semibold text-gray-900 pr-2">{title}</legend>
      <div className="space-y-3 mt-2">{children}</div>
    </fieldset>
  )
}

export function FormActions({ onClose, isLoading, submitLabel }: { onClose: () => void; isLoading: boolean; submitLabel?: string }) {
  return (
    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
      <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
        Cancel
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Submitting…' : submitLabel || 'Submit & Triage'}
      </button>
    </div>
  )
}

export interface ClientInfo {
  clientName: string
  clientEmail: string
  clientPhone: string
}

export function ClientInfoFields({ value, onChange }: { value: ClientInfo; onChange: (v: ClientInfo) => void }) {
  return (
    <Section title="Client">
      <TextField label="Full name" required value={value.clientName} onChange={(v) => onChange({ ...value, clientName: v })} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Email" type="email" value={value.clientEmail} onChange={(v) => onChange({ ...value, clientEmail: v })} />
        <TextField label="Phone" value={value.clientPhone} onChange={(v) => onChange({ ...value, clientPhone: v })} />
      </div>
    </Section>
  )
}

export interface IntakePayload {
  matterType: 'debt-defense' | 'expunction' | 'uncontested-divorce' | 'estate-package'
  clientName: string
  clientEmail?: string
  clientPhone?: string
  data: Record<string, unknown>
}
