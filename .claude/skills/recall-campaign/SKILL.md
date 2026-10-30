---
name: recall-campaign
description: Use this skill when Mike asks to build, draft, review, or launch a recall advertising campaign — a landing page plus intake for a specific CPSC (or NHTSA/FDA) product recall flagged ADVERTISE by the daily recall screen. Triggers on 'recall campaign,' 'landing page for the [product] recall,' 'advertise the [product] recall,' 'recall ad copy,' or a CPSC recall number with a request to market it. Do NOT use for screening recalls (the daily scheduled task does that), for working up an individual product-injury case (use the intake pipeline and pi-demand-letter), or for non-recall PI advertising.
---

# Recall Campaign (landing page + intake + ad copy)

The product: a recall-specific landing page at `/recall/<slug>` in the practice
app, with the product-injury intake form prefilled (product, recall number,
hazard) and every submission tagged `campaign: <slug>` for attribution; plus the
ad copy that sends people there; plus the compliance record that lets it be
published. The national firms key their pages to the CPSC notice within hours.
The point of this skill is to match that speed without matching their sloppiness.

**Nothing goes live without Mike's approval and the Advertising Review filing.
Every fact on the page comes from the CPSC notice verbatim. No outcome
language, no "specialist," no implied CPSC or manufacturer affiliation.**

## Inputs

- The recall: CPSC recall number (e.g., `27-054`) or the notice URL. Pull the
  record from `https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallNumber=<number>`
  (or the HTML notice) — never from memory.
- The daily screen's read on it (ADVERTISE / WATCH), if available.

## Step 1 — Decision memo (five sentences, in chat)

Confirm the recall actually clears the bar before building anything:
1. **Pool**: units sold; reported fires/injuries; honest estimate of Texas
   injured parties.
2. **Collectability**: domestic manufacturer/importer with insurance, or a
   foreign Amazon storefront? Big-box retailer in the chain? Note the Texas
   seller analysis in one sentence (a marketplace that never held title is not
   the seller; a nonmanufacturing retailer is protected absent a Chapter 82
   exception).
3. **Case profile**: what fact pattern makes a real case (post-recall fire with
   burn injury, sale after the seller had incident reports, etc.).
4. **Weakness**: the strongest defense (low incident rate, misuse, assumption of
   risk after notice, product destroyed by the recall remedy).
5. **Verdict** and budget posture (search ads only, or search + social).

If the memo says PASS, stop here and say so.

## Step 2 — Campaign entry (`client/src/campaigns.ts`)

Add a `RecallCampaign` object using `templates/campaign-entry.md`:
- `slug`: lowercase, hyphenated, brand + product (`dreo-space-heater`).
- `status: 'draft'`.
- `product.*`: map to the `ProductInjuryForm` select values
  (`productCategory`, `hazardType`) so the form prefills correctly.
- `recall.*`: **copy the CPSC fields verbatim** — Hazard, Incidents/Injuries,
  Sold At, Remedy, Units, Description (for `identify`). Trim only for length,
  never for emphasis. Include the notice URL.
- `page.headline`: product + hazard, factual ("DREO space heater recall: fire
  and burn hazard"). No "lawsuit," "settlement," "compensation" in headlines.
- `page.whoThisIsFor`: three plain sentences describing the situation, not the
  reader's entitlement.
- `page.faq`: three to four questions people actually ask — the recall remedy
  vs. keeping the evidence; the retailer question; the insurance question;
  timing. Answers hedge honestly ("it can," "depends on facts we investigate").

Preview at `/recall/<slug>?preview=draft`. The page's fixed sections (five
things to do, what a claim can involve, footer disclosures) are shared code in
`client/src/pages/RecallLanding.tsx` — do not fork them per campaign.

## Step 3 — Ad copy (`docs/marketing/content/recall/<slug>.md`)

Use `templates/ad-copy.md`. Produce:
- **Google Search ads**: 3 headline sets (30 chars each) + 2 descriptions (90
  chars), keyed to "[brand] [product] recall," "[brand] recall lawyer," "[product]
  fire." Every description carries "Attorney advertising" or the firm name and
  city where space allows; the landing page carries the full disclosure.
- **Google Business Profile post** (one, factual, links to the page).
- **Social post** (Facebook/Nextdoor, one): recall facts, the keep-the-product
  advice, link. Short-form footer from `_footer.md`.
- **Negative keywords**: the manufacturer's own recall/refund queries
  ("dreo recall refund," "dreo replacement") so the budget is not spent on
  people who only want the refund.

## Step 4 — Compliance checklist (in the same file)

Tick each before approval:
- [ ] No false or misleading statement; every recall fact traceable to the
      CPSC notice (7.01).
- [ ] No guarantee, no outcome prediction, no "best/cheapest," no
      "specialist/expert" without TBLS certification.
- [ ] Attorney responsible and principal-office city on the page and in every
      ad where space allows (7.01/7.04 content requirements — verify current
      rule text).
- [ ] Contingency disclosure: no recovery → no attorney's fee; client may
      remain responsible for expenses/liens per the written agreement.
- [ ] "Attorney advertising" label on the page; no implied CPSC, manufacturer,
      or retailer affiliation; brand names used only to identify the product.
- [ ] Not a solicitation (7.03): the page and ads are general advertising; no
      targeted messages to identified incident victims.
- [ ] Filed with State Bar Advertising Review (or exemption documented) with
      the first-use date recorded in `firstUse` on the campaign entry.
- [ ] Mike's written approval recorded (date) in the ad-copy file.

## Step 5 — Launch and measure

1. Flip `status` to `'live'`, set `firstUse`, merge, deploy.
2. Ads point to `https://<app-url>/recall/<slug>`. The generic portal also
   accepts `/intake?matter=product-injury&campaign=<slug>&recall=<number>` for
   links that should land on the plain portal.
3. Intakes from the page show a `campaign` badge on the Legal Intakes list;
   the triage summary shows the track (pursue / review / decline-or-watch),
   product status, and SOL. Review every one within one business day.
4. At 30 days: intakes by campaign vs. spend; kill or double. Retire the
   campaign (`status: 'retired'`) when the recall ages out of search volume;
   the page then returns "not available."

## Step 6 — When a case comes in

Accepted product-injury intakes run the pipeline built into the app: client
evidence letter the same day (the recall remedy destroys the evidence),
preservation letters to every entity in the chain, product secured with a
chain-of-custody log, expert retained before anyone touches the unit, then
demand via the `pi-demand-letter` skill. Limitations task sits at 180 days
before the two-year bar because the expert's opinion has to precede suit.
