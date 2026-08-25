// Public (no-login) intake portal — linkable from the firm website.
// Uses raw axios (not the authed api client) so the 401 interceptor never fires.

import { useState } from 'react'
import axios from 'axios'
import { Scale, Gavel, FileX2, HeartCrack, ScrollText, CheckCircle, ShieldAlert } from 'lucide-react'
import DebtDefenseForm from '../components/intake/DebtDefenseForm'
import ExpunctionForm from '../components/intake/ExpunctionForm'
import DivorceForm from '../components/intake/DivorceForm'
import EstateForm from '../components/intake/EstateForm'
import { IntakePayload } from '../components/intake/fields'

type MatterType = 'debt-defense' | 'expunction' | 'uncontested-divorce' | 'estate-package'

const products: Array<{ id: MatterType; icon: typeof Gavel; title: string; blurb: string }> = [
  {
    id: 'debt-defense',
    icon: Gavel,
    title: 'Sued over a debt?',
    blurb: 'Credit card or collection lawsuit — flat-fee defense. Deadlines run fast; tell us about the suit today.',
  },
  {
    id: 'expunction',
    icon: FileX2,
    title: 'Clear your record',
    blurb: 'Expunction and record sealing for eligible Texas arrests — flat-fee screening and filing.',
  },
  {
    id: 'uncontested-divorce',
    icon: HeartCrack,
    title: 'Agreed divorce',
    blurb: 'Flat-fee uncontested divorce for spouses who agree on everything — no children, no real estate.',
  },
  {
    id: 'estate-package',
    icon: ScrollText,
    title: 'Will & estate package',
    blurb: 'Simple will, powers of attorney, and medical directives — one flat fee, one signing appointment.',
  },
]

const DISCLAIMER =
  'Submitting this form does not create an attorney-client relationship, and the firm is not your lawyer unless and until you sign an engagement letter. Do not consider your matter handled — court deadlines keep running until an attorney has appeared for you. The information you submit is kept confidential and reviewed by an attorney.'

export default function PublicIntake() {
  const [selected, setSelected] = useState<MatterType | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (payload: IntakePayload) => {
    setSubmitting(true)
    setError(null)
    try {
      await axios.post('/api/public/intake', payload)
      setDone(true)
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.message
        ? String(err.response.data.message)
        : 'Something went wrong — please try again or call the office.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
            <Scale size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Start Your Case Review</h1>
            <p className="text-sm text-gray-500">Flat-fee legal help — tell us about your situation and an attorney will review it</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {done ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Received — thank you.</h2>
            <p className="text-gray-600 mb-4">
              An attorney will review your information and contact you, usually within one business day.
              If you have a court deadline in the next few days, please also call the office.
            </p>
            <p className="text-xs text-gray-500 max-w-lg mx-auto">{DISCLAIMER}</p>
          </div>
        ) : !selected ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {products.map((p) => {
                const Icon = p.icon
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md hover:ring-2 hover:ring-primary-200 transition-all"
                  >
                    <Icon size={26} className="text-primary-600 mb-3" />
                    <h2 className="font-semibold text-gray-900 mb-1">{p.title}</h2>
                    <p className="text-sm text-gray-600">{p.blurb}</p>
                  </button>
                )
              })}
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-500 bg-white rounded-lg p-4 shadow-sm">
              <ShieldAlert size={16} className="shrink-0 mt-0.5 text-gray-400" />
              <p>{DISCLAIMER}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <button onClick={() => setSelected(null)} className="text-sm text-primary-600 hover:underline mb-3">
              ← Choose a different service
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {products.find((p) => p.id === selected)?.title}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Answer as best you can — estimates are fine. An attorney reviews everything before any conclusion is reached.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
            )}
            {selected === 'debt-defense' && (
              <DebtDefenseForm onSubmit={submit} onClose={() => setSelected(null)} isLoading={submitting} />
            )}
            {selected === 'expunction' && (
              <ExpunctionForm onSubmit={submit} onClose={() => setSelected(null)} isLoading={submitting} />
            )}
            {selected === 'uncontested-divorce' && (
              <DivorceForm onSubmit={submit} onClose={() => setSelected(null)} isLoading={submitting} />
            )}
            {selected === 'estate-package' && (
              <EstateForm onSubmit={submit} onClose={() => setSelected(null)} isLoading={submitting} />
            )}
            <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">{DISCLAIMER}</p>
          </div>
        )}
      </main>
    </div>
  )
}
