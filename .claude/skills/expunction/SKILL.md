---
name: expunction
description: Use this skill when Mike asks to screen, draft, or file a Texas expunction (expungement) of arrest records under Code of Criminal Procedure Chapter 55A, or an order of nondisclosure (record sealing) under Government Code Chapter 411, Subchapter E-1. Triggers on 'expunction,' 'expunge,' 'expungement,' 'clear my record,' 'seal my record,' 'nondisclosure,' or a request to screen a criminal history for record-clearing relief. Do NOT use for pending criminal defense or occupational licenses.
---

# Texas Expunction & Nondisclosure (Flat-Fee Automated Workflow)

You help Mike screen and draft Texas expunction petitions and orders of nondisclosure
on a flat-fee model. The product: eligibility screen → petition + proposed order →
e-file → (usually unopposed) hearing or submission → serve the order on every agency.

**IMPORTANT — recodification:** the expunction statute is now Code of Criminal
Procedure **Chapter 55A** (effective January 1, 2025). Do not cite the old art. 55.01
numbering in filed documents; most online forms are outdated. Cites in
`references/eligibility.md` were verified against current law (August 2026).

**Every generated document is a DRAFT for attorney review. Never file anything without
Mike's sign-off. Eligibility determinations are recommendations only — Mike makes the
final call, on a certified criminal-history run, not on the client's memory.**

## Workflow

### Step 1 — Screen (templates/intake.md)

Run the client's arrest history through the eligibility tree in
`references/eligibility.md`. Screen **every arrest separately** — expunction is
arrest-based, and one client often has multiple eligible and ineligible arrests.
Output for each arrest: **eligible now / eligible on [date] / nondisclosure instead /
ineligible**, with the article relied on.

Decision-quality rules:
- Never conclude "eligible" from client memory alone. Require: DPS criminal-history
  record and/or county records showing the actual disposition. Client says
  "dismissed" ≠ dismissed (it might be deferred adjudication, which generally means
  nondisclosure, not expunction).
- A felony charge arising from the same transaction, or court-ordered community
  supervision on the charge (other than certain Class C deferred outcomes),
  generally defeats expunction — flag any hint of either for Mike.
- If expunction fails but the client completed **deferred adjudication**, pivot to an
  **order of nondisclosure** (Gov't Code ch. 411, subch. E-1) screen — different
  statute, different waiting periods, offense exclusions (e.g., family violence),
  and a "sealing not destruction" client conversation.

### Step 2 — Draft

- Petition: `templates/petition.md`. The petition must include the statutorily
  required identifying information and list **every agency and entity** believed to
  hold records — DPS, arresting agency, sheriff, DA/county attorney, jail, court
  clerk, DPS crime records division, plus any private background vendors worth
  naming. Missing agencies = records that survive.
- Proposed order: `templates/order.md`. Courts sign the proposed order, so agency
  completeness matters even more here.
- Verification: petitions must be verified — use notarization or an unsworn
  declaration per local practice.

**Attorney review checkpoint: Mike reviews eligibility conclusion + petition +
order before filing.**

### Step 3 — File and finish

1. File in a district court (or justice/municipal court for qualifying Class C
   scenarios) of the county of arrest or prosecution as the statute directs; pay
   filing fee (fee varies by county; some charge extra per-agency notice fees).
2. Clerk notifies respondent agencies; DPS or an agency occasionally opposes (usually
   over waiting periods or same-transaction felonies). Most petitions with a correct
   screen are unopposed; hearing is often ministerial or waived by submission.
3. After the order is signed: confirm the clerk serves certified copies on every
   listed agency; calendar 60/180-day follow-ups; instruct client on lawful denial
   rights and give them certified copies of the order.
4. Optional add-on: dispute letters to major private background-check vendors with
   the signed order.

## Fee model notes

- Flat fee per arrest screened + petition; multi-arrest discounts; nondisclosure as a
  separately priced product. The screen itself (Step 1) can be a cheap paid product
  that upsells honestly — including telling ineligible clients "no, and here's when
  or why not," which builds referrals.
- Advertising for this product line is consumer advertising — run it through State
  Bar Advertising Review before publishing.
