# Marketing Plan — Flat-Fee Practice Lines

> **Status: DRAFT for Mike's review. Nothing in this folder is published until
> (1) Mike approves it, (2) fees/names/cities are filled in, and (3) each piece
> is checked against the Texas advertising rules and filed with State Bar
> Advertising Review where required.** See "Compliance rails" below.

## 1. Positioning

**The premise:** most people who need a lawyer for a debt suit, a record, a
simple divorce, a will, or a clear-liability wreck never hire one — they think
lawyers are unaffordable and the process is opaque. The automated workflows
change the cost structure, so the marketing message is:

> **Flat, published fees. A clear process. Start online in 10 minutes.**

Three brand pillars, in priority order:
1. **Price certainty** — flat fees for defined scopes (and a reduced
   contingency for qualifying wrecks). Never "cheap" — *certain*.
2. **Honest routing** — the intake gates say "no" fast and explain why. This
   becomes a marketing asset: "we'll tell you in one screen whether this fits."
3. **Speed to start** — the public portal (`/intake`) is the call to action on
   every single piece. It works at 11pm, when people actually confront these
   problems.

**Who we are NOT talking to:** complex litigation, contested custody, big
estates, catastrophic injury (those route to the standard practice — and the
routing story itself builds trust and referrals).

## 2. The funnel (already built — marketing just fills it)

```
Content / ads / referrals  →  practice-line landing page  →  /intake portal
→ auto-triage → attorney review → engagement letter → matter pipeline
```

The app tags every portal submission `source: public`, so **intakes-by-source
is the master KPI** — visible on the Legal Intakes summary strip.

## 3. Channels, in order of expected return

| # | Channel | Why | Cost | First move |
|---|---------|-----|------|-----------|
| 1 | **Google Business Profile** | "debt lawsuit lawyer near me" is where every one of these clients starts; GBP is free and most law firms neglect it | Free | Complete profile, weekly posts (drafts in `content/gbp-posts.md`), review-request system |
| 2 | **Existing-client cross-sell** | Every PI and debt client is an estate-package prospect; closed matters are a warm list | Free | Closing-letter P.S. + two email templates (`content/emails-cross-sell.md`) |
| 3 | **SEO articles** | These practice areas have high-intent, answerable questions; two articles are drafted | Time | Publish `content/article-*.md` on the website; one new article/month |
| 4 | **Practice-line landing pages** | Each line needs its own page with fees and FAQ, ending at `/intake` | Time | Drafts in `content/landing-*.md` |
| 5 | **Google Local Services Ads** | Pay-per-lead, screened, sits above regular ads; strong for debt defense + MVA | ~$25–75/lead | After landing pages are live |
| 6 | **Social (Facebook/Nextdoor)** | Debt suits, tickets, records — Nextdoor demographics ask these exact questions | Free–low | First month drafted (`content/social-first-month.md`) |
| 7 | **Referral network** | Bankruptcy attorneys (debt cases they decline), criminal defense (expunction after acquittal/dismissal), family law (Tier-1 divorces they don't want) | Coffee | Three lunch meetings; a one-pager per line |

Skip for now: TV/radio/billboards (wrong economics for flat-fee volume),
bought lead lists (quality + ethics risk), TikTok (until there's bandwidth).

## 4. 90-day calendar

**Weeks 1–2 — Foundation**
- Fill fees into all drafts; Mike approves every piece
- File what needs filing with Advertising Review (budget ~$150/filing)
- GBP complete; landing pages live; portal linked from the website

**Weeks 3–6 — Ignition**
- Publish both SEO articles; begin weekly GBP posts + 3 social posts/week
- Send cross-sell email #1 (estate package) to closed-matter clients
- Review-request email to every satisfied closing client (the app's closing
  letters get a review link)

**Weeks 7–12 — Measurement + paid**
- Read the funnel: portal submissions by matter type vs. channel activity
- Turn on Local Services Ads for the strongest line (expect debt defense)
- Referral lunches; publish articles 3 and 4
- Kill anything with zero attributable intakes; double the winner

## 5. KPIs (review monthly, 30 minutes)

- Public-portal intakes by matter type (the app tracks this)
- Intake → engagement conversion rate per line
- Cost per signed matter for any paid channel
- GBP: calls, direction requests, review count
- Revenue per line vs. time spent (the flat-fee math only works if honest)

## 6. Compliance rails (every piece, every time)

The 2021 Texas advertising rules (Tex. Disciplinary Rules Prof. Conduct
7.01–7.06) govern all of this. Working rules for this folder — **verify each
against the current rule text before first publication**:

1. **Nothing false or misleading** (7.01) — no guarantees, no outcome
   predictions, no unsubstantiated comparisons ("best," "cheapest"), no
   "specialist/expert" language without TBLS board certification.
2. **Advertised fees bind you.** Publish a flat fee only when Mike has
   committed to it; state exactly what it covers; honor it as advertised.
   Contingency mentions must disclose who pays costs/expenses.
3. **Required content**: each advertisement names a responsible attorney and
   the city/geographic location of the principal office.
4. **Filing**: assume paid ads and promotional pages must be filed with the
   State Bar Advertising Review Committee before/concurrently with first use
   unless clearly exempt (Rule 7.05 exemptions — e.g., communications to
   existing/former clients and much purely educational content). When unsure,
   file or use the Bar's pre-approval; keep copies + first-use dates on file.
5. **Solicitation (7.03)**: no live solicitation of strangers for profit;
   any targeted written/email solicitation carries the required
   "ADVERTISEMENT" labeling. The cross-sell emails to *former clients* are in
   the exempt category — but Mike confirms before sending.
6. **Disclaimers on every piece** (standard footer in `content/_footer.md`):
   attorney identity, office city, "not legal advice," and no
   attorney-client relationship absent a signed engagement.
7. Testimonials/reviews: never scripted, never incentivized, never quoted in
   ads without checking the current rule on soliciting/using them.

## 7. Content inventory (drafted, in `content/`)

| File | What | Filing likely needed? |
|------|------|----------------------|
| `_footer.md` | Standard compliance footer + disclaimers | n/a (component) |
| `landing-debt-defense.md` | Debt defense landing page | Yes — promotional |
| `landing-expunction.md` | Expunction landing page | Yes |
| `landing-divorce.md` | Uncontested divorce landing page | Yes |
| `landing-estate.md` | Estate package landing page | Yes |
| `landing-mva.md` | Reduced-fee MVA landing page | Yes — contingency disclosures matter most here |
| `article-debt-lawsuit.md` | SEO: "Sued by a debt collector in Texas" | Likely exempt (educational) — confirm |
| `article-expunction.md` | SEO: "Clearing your record in Texas" | Likely exempt — confirm |
| `social-first-month.md` | 12 social posts (4 weeks) | Mixed — educational vs promotional flagged per post |
| `gbp-posts.md` | 4 Google Business Profile posts | Same standard as ads — review |
| `emails-cross-sell.md` | 2 emails to former clients + closing-letter P.S. | Former clients = exempt category; confirm |
