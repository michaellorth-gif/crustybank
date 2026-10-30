// Public recall landing page: /recall/:slug. Renders a campaign from the
// registry with the product-injury intake form prefilled. Draft campaigns are
// visible only with ?preview=draft so Mike can review before publication.

import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'
import { CheckCircle, ShieldAlert, Flame, ExternalLink } from 'lucide-react'
import ProductInjuryForm from '../components/intake/ProductInjuryForm'
import { IntakePayload } from '../components/intake/fields'
import Wordmark from '../components/Wordmark'
import { findCampaign } from '../campaigns'

const FOOTER_FIRM = 'ClearFee Legal PLLC — Michael L. Orth, Attorney Responsible for this communication. Principal office: Dallas, Texas.'
const FOOTER_AD =
  'This is an advertisement. The information here is general information about Texas law, not legal advice about your situation, and reading it does not make us your lawyers. An attorney-client relationship is created only by a signed engagement agreement. Results depend on the facts of each case, and no result is guaranteed. If there is no recovery, you owe no attorney\'s fee; you may remain responsible for case expenses and amounts owed to medical providers or lien holders as stated in the written fee agreement.'
const FOOTER_CPSC =
  'Recall facts on this page are quoted from the U.S. Consumer Product Safety Commission notice linked above. This firm is not affiliated with the CPSC, the manufacturer, or any retailer named. Product and company names are used only to identify the recalled product.'

const DISCLAIMER =
  'Submitting this form does not create an attorney-client relationship, and the firm is not your lawyer unless and until you sign an engagement letter. Deadlines keep running until an attorney has agreed in writing to represent you. The information you submit is kept confidential and reviewed by an attorney.'

export default function RecallLanding() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const campaign = findCampaign(slug)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const preview = params.get('preview') === 'draft'
  if (!campaign || campaign.status === 'retired' || (campaign.status === 'draft' && !preview)) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6">
        <div className="text-center">
          <Wordmark size="lg" />
          <p className="mt-4 text-gray-600">This page is not available.</p>
          <Link to="/intake" className="text-primary-600 hover:underline text-sm">Go to the intake portal</Link>
        </div>
      </div>
    )
  }

  const submit = async (payload: IntakePayload) => {
    setSubmitting(true)
    setError(null)
    try {
      await axios.post('/api/public/intake', payload)
      setDone(true)
      window.scrollTo({ top: 0 })
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.message
        ? String(err.response.data.message)
        : 'Something went wrong — please try again or call the office.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const { recall, product, page } = campaign

  return (
    <div className="min-h-screen bg-paper">
      {campaign.status === 'draft' && (
        <div className="bg-amber-100 text-amber-900 text-xs text-center py-1.5 px-4">
          DRAFT PREVIEW — not published. Attorney approval and Advertising Review filing required before this page goes live.
        </div>
      )}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <Wordmark size="lg" />
          <p className="text-sm text-gray-500 text-right hidden sm:block">Know the price before you begin.</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {done ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Received — thank you.</h2>
            <p className="text-gray-600 mb-4">
              An attorney will review your information and contact you, usually within one business day.
              Until then: keep the product exactly as it is, and do not return it, destroy it, or accept a refund.
            </p>
            <p className="text-xs text-gray-500 max-w-lg mx-auto">{DISCLAIMER}</p>
          </div>
        ) : (
          <>
            <section className="bg-white rounded-xl shadow-sm p-8">
              <p className="text-xs uppercase tracking-[0.14em] text-primary-700 font-semibold mb-3">Product recall · Texas injury claims</p>
              <h1 className="font-display text-3xl font-bold text-ink leading-tight mb-3">{page.headline}</h1>
              <p className="text-gray-700 mb-5">{page.subhead}</p>
              <button
                onClick={() => { setShowForm(true); setTimeout(() => document.getElementById('intake-form')?.scrollIntoView({ behavior: 'smooth' }), 50) }}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Tell us what happened
              </button>
              <p className="text-xs text-gray-500 mt-3">Free review. No fee unless there is a recovery; see the fee disclosure below.</p>
            </section>

            <section className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="font-display text-xl font-bold text-ink mb-4 flex items-center gap-2"><Flame size={20} className="text-primary-600" /> What the CPSC recall says</h2>
              <dl className="grid sm:grid-cols-[160px_1fr] gap-x-4 gap-y-3 text-sm">
                <dt className="text-gray-500">Product</dt><dd className="text-gray-800">{product.brand} {product.name}{product.modelNumber ? `, model ${product.modelNumber}` : ''}</dd>
                <dt className="text-gray-500">Recall number</dt><dd className="text-gray-800">{recall.number} · announced {recall.date}</dd>
                <dt className="text-gray-500">Hazard</dt><dd className="text-gray-800">{recall.hazard}</dd>
                <dt className="text-gray-500">Units</dt><dd className="text-gray-800">{recall.units}</dd>
                <dt className="text-gray-500">Reported incidents</dt><dd className="text-gray-800">{recall.incidents}</dd>
                <dt className="text-gray-500">Sold at</dt><dd className="text-gray-800">{recall.soldAt}</dd>
                <dt className="text-gray-500">How to identify it</dt><dd className="text-gray-800">{recall.identify}</dd>
                <dt className="text-gray-500">The recall remedy</dt><dd className="text-gray-800">{recall.remedy}</dd>
              </dl>
              <a href={recall.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline mt-4">
                Read the full CPSC notice <ExternalLink size={14} />
              </a>
            </section>

            <section className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="font-display text-xl font-bold text-ink mb-3">This page is for you if</h2>
              <ul className="space-y-2 text-gray-700 text-sm list-disc pl-5">
                {page.whoThisIsFor.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </section>

            <section className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="font-display text-xl font-bold text-ink mb-3">If someone was hurt: do these five things</h2>
              <ol className="space-y-3 text-sm text-gray-700 list-decimal pl-5">
                <li><span className="font-medium text-gray-900">Get medical care</span> and keep every appointment. Untreated injuries read as minor to the people who evaluate claims.</li>
                <li><span className="font-medium text-gray-900">Keep the product.</span> Do not throw it away, return it, cut the cord, or plug it in, even if the recall notice tells you to destroy it for a refund. Put it in a box with the cord, packaging, and any debris, and write down the date.</li>
                <li><span className="font-medium text-gray-900">Photograph everything</span>: the product, the room, the injuries, the receipt or order page. If the fire department came, ask for the report number.</li>
                <li><span className="font-medium text-gray-900">Save the paperwork.</span> Order confirmation, the listing, the recall email, any message from the company.</li>
                <li><span className="font-medium text-gray-900">Do not give a recorded statement or sign anything</span> from the manufacturer, a retailer, or their insurer before you have talked to a lawyer. A refund or replacement offer can come with a release.</li>
              </ol>
            </section>

            <section className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="font-display text-xl font-bold text-ink mb-3">What a claim can involve</h2>
              <p className="text-sm text-gray-700 mb-3">
                A product injury claim in Texas is a claim that the product was defective in its design, its manufacture, or its warnings, and that the defect caused the injury. A recall is not by itself proof of a defect, and it does not decide who is responsible, but the recall record (what the company knew, when, and from how many reports) is usually central to the case.
              </p>
              <p className="text-sm text-gray-700 mb-3">
                Who can be held responsible depends on the chain of distribution. The manufacturer is the primary focus. A retailer that did not make the product is protected by Texas law in many situations, and an online marketplace may not be treated as the seller at all. Those are facts we investigate before telling you whether the case is worth bringing, and we tell you plainly either way.
              </p>
              <p className="text-sm text-gray-700">
                Our fee is contingent: no recovery, no attorney's fee. Product cases do involve expert and testing costs, and the written fee agreement you receive before hiring us spells out exactly how expenses are handled.
              </p>
            </section>

            <section className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="font-display text-xl font-bold text-ink mb-4">Questions people ask</h2>
              <div className="space-y-4">
                {page.faq.map((f, i) => (
                  <div key={i}>
                    <h3 className="font-medium text-gray-900 text-sm">{f.q}</h3>
                    <p className="text-sm text-gray-700 mt-1">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="intake-form" className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-display text-xl font-bold text-ink mb-1">Tell us what happened</h2>
              <p className="text-sm text-gray-500 mb-4">
                Answer as best you can — estimates are fine. An attorney reviews everything before any conclusion is reached.
              </p>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
              )}
              {showForm ? (
                <ProductInjuryForm
                  onSubmit={submit}
                  onClose={() => setShowForm(false)}
                  isLoading={submitting}
                  prefill={{
                    campaign: campaign.slug,
                    recallNumber: recall.number,
                    productName: product.name,
                    brand: product.brand,
                    modelNumber: product.modelNumber,
                    productCategory: product.productCategory,
                    hazardType: product.hazardType,
                  }}
                />
              ) : (
                <button onClick={() => setShowForm(true)} className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
                  Start the form
                </button>
              )}
              <div className="flex items-start gap-2 text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
                <ShieldAlert size={16} className="shrink-0 mt-0.5 text-gray-400" />
                <p>{DISCLAIMER}</p>
              </div>
            </section>
          </>
        )}

        <footer className="text-xs text-gray-500 space-y-2 pb-8">
          <p className="font-medium text-gray-700">{FOOTER_FIRM}</p>
          <p>{FOOTER_AD}</p>
          <p>{FOOTER_CPSC}</p>
        </footer>
      </main>
    </div>
  )
}
