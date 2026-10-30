# Campaign entry template (`client/src/campaigns.ts`)

Copy, fill from the CPSC notice (verbatim), and append to `campaigns`.

```ts
{
  slug: '<brand>-<product>',            // lowercase, hyphenated
  status: 'draft',                      // 'live' only after approval + filing
  product: {
    name: '<MODEL> <product type>',     // e.g. 'DR-HSH015 space heater'
    brand: '<BRAND>',
    modelNumber: '<MODEL>',             // omit if none
    productCategory: '<battery-charger | heater-appliance | ebike-scooter | furniture-tipover | infant-child | tool-equipment | vehicle-part | medical-device | other>',
    hazardType: '<fire-burn | explosion | electric-shock | laceration | fall | choking-ingestion | co-poisoning | entrapment-strangulation | other>',
  },
  recall: {
    number: '<NN-NNN>',
    date: '<YYYY-MM-DD>',
    url: '<CPSC notice URL>',
    units: '<CPSC Units field, verbatim>',
    hazard: '<CPSC Hazard field, verbatim>',
    incidents: '<CPSC Incidents/Injuries field, verbatim>',
    soldAt: '<CPSC Sold At field, verbatim>',
    remedy: '<CPSC Remedy field, verbatim or trimmed for length only>',
    identify: '<from the CPSC Description: how to tell if a unit is affected>',
  },
  page: {
    headline: '<Brand> <product> recall: <hazard in plain words>',
    subhead: 'If a <brand> <product> <what it does>, here is what to do first, and what a claim can involve.',
    whoThisIsFor: [
      '<situation sentence 1>',
      '<situation sentence 2>',
      'You still have the product, or what is left of it. (If you do, do not throw it away or follow the recall\'s destroy-for-refund instructions yet. Read on.)',
    ],
    faq: [
      { q: 'The recall says to <remedy step>. Should I?', a: '<keep-the-evidence answer, hedged>' },
      { q: 'I bought it at <retailer>. Does that matter?', a: '<Texas retailer/marketplace answer, hedged>' },
      { q: 'My homeowner\'s insurance already paid.', a: '<subrogation coordination answer>' },
      { q: 'How long do I have?', a: 'Texas generally allows two years from the date of injury to file suit, with some exceptions. Evidence disappears much faster.' },
    ],
  },
  // firstUse: '<YYYY-MM-DD>',           // set at launch — Advertising Review record
},
```

Rules: no fact on the page that is not in the CPSC notice; no promise of any
outcome; product and company names used only to identify the recalled product.
