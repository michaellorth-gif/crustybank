// Recall campaign registry. Each entry drives a public landing page at
// /recall/<slug> with the intake form prefilled, and tags every submission from
// that page with `campaign: slug` so intakes-by-campaign is measurable.
//
// Facts in `recall` must be copied from the CPSC notice verbatim — never
// paraphrased upward. A campaign is `draft` until Mike approves the page and
// the ad copy and the piece is filed with State Bar Advertising Review; only
// then does it become `live`. Draft pages render only with ?preview=draft.
//
// The recall-campaign skill (.claude/skills/recall-campaign) generates entries.

export interface RecallCampaign {
  slug: string
  status: 'draft' | 'live' | 'retired'
  product: {
    name: string
    brand: string
    modelNumber?: string
    productCategory: string // ProductInjuryForm productCategory value
    hazardType: string // ProductInjuryForm hazardType value
  }
  recall: {
    number: string
    date: string // ISO
    url: string
    units: string
    hazard: string // CPSC "Hazard" text, verbatim
    incidents: string // CPSC "Incidents/Injuries" text, verbatim
    soldAt: string // CPSC "Sold At" text, verbatim
    remedy: string // CPSC "Remedy" summary, verbatim or lightly trimmed
    identify: string // how to tell if yours is affected (from the CPSC description)
  }
  page: {
    headline: string
    subhead: string
    whoThisIsFor: string[] // plain sentences, no promises
    faq: Array<{ q: string; a: string }>
  }
  firstUse?: string // ISO date first published (Advertising Review filing record)
}

export const campaigns: RecallCampaign[] = [
  {
    slug: 'dreo-space-heater',
    status: 'draft',
    product: {
      name: 'DR-HSH015 space heater',
      brand: 'DREO',
      modelNumber: 'DR-HSH015',
      productCategory: 'heater-appliance',
      hazardType: 'fire-burn',
    },
    recall: {
      number: '27-054',
      date: '2026-10-29',
      url: 'https://cpsc.gov/Recalls/2027/DREO-Recalls-DR-HSH015-Space-Heaters-Due-to-Fire-and-Burn-Hazards',
      units: 'About 338,800 (In addition, about 36,300 were sold in Canada)',
      hazard: 'The recalled space heaters can overheat and ignite, posing fire and burn hazards.',
      incidents: 'DREO has received 17 reports of space heaters igniting, three resulting in property damage and one in a burn injury to the hand.',
      soldAt: 'Costco stores nationwide and online at Dreo.com, BestBuy.com, Kohls.com, Lowes.com, QVC.com, HomeDepot.com, B2BRenew.com and Costco.com from September 2025 through October 2026 for between $70 and $110.',
      remedy: 'Consumers should stop using the recalled space heaters immediately and contact DREO for a free replacement space heater. Consumers will be asked to unplug the space heater, destroy it by cutting the electrical cord and follow instructions to send a photo of the destroyed heater.',
      identify: 'Black ceramic electric heaters about 11.5 inches wide and 13 inches tall with a remote control. Only units manufactured from April 2025 through January 2026 are included. The manufacture date (YYYY/MM) and model number DR-HSH015 are printed on a label on the heater\'s underside; "DREO" is on the front.',
    },
    page: {
      headline: 'DREO space heater recall: fire and burn hazard',
      subhead: 'If a DREO DR-HSH015 heater overheated, caught fire, or burned someone in your home, here is what to do first, and what a claim can involve.',
      whoThisIsFor: [
        'Your DREO DR-HSH015 heater overheated, smoked, or caught fire.',
        'Someone in your home was burned, or you lost property to a fire that started at the heater.',
        'You still have the heater, or what is left of it. (If you do, do not throw it away or cut the cord, even though the recall notice tells you to. Read on.)',
      ],
      faq: [
        {
          q: 'The recall says to cut the cord and send a photo for a replacement. Should I?',
          a: 'If no one was hurt and nothing was damaged, following the recall instructions is reasonable. If you were injured or had a fire, the heater is the evidence of what happened, and destroying it can make a claim impossible to prove. Talk to a lawyer before you do anything to it.',
        },
        {
          q: 'I bought it at Costco (or Best Buy, Lowe\'s, Home Depot). Does that matter?',
          a: 'It can. Texas law treats a retailer differently from a manufacturer, and whether a retailer can be held responsible depends on facts we would need to investigate, such as what it knew and when. The manufacturer and importer are usually the primary focus.',
        },
        {
          q: 'My homeowner\'s insurance already paid for the fire damage.',
          a: 'That is common and does not end things. Your insurer may pursue its own claim for what it paid, and your injury claim is separate. We coordinate with the insurer so the heater is not discarded and your claim is not settled around you.',
        },
        {
          q: 'How long do I have?',
          a: 'Texas generally allows two years from the date of injury to file suit, with some exceptions. Evidence, though, disappears much faster. The sooner the heater is secured and the facts documented, the better.',
        },
      ],
    },
  },
]

export function findCampaign(slug: string | undefined): RecallCampaign | undefined {
  if (!slug) return undefined
  return campaigns.find((c) => c.slug === slug)
}
