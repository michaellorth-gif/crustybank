---
name: reduced-fee-mva
description: Use this skill when Mike asks to screen, intake, or work up a case on the REDUCED-FEE motor vehicle accident track — the discounted-contingency (e.g., 25% pre-suit) product for clear-liability Texas car wrecks handled on heavily automated workflows. Triggers on 'reduced fee MVA,' 'reduced fee track,' 'discount contingency,' 'clear liability wreck,' or an MVA intake explicitly on the reduced-fee product. Do NOT use for standard-fee PI matters, disputed-liability wrecks, commercial/trucking, surgical or catastrophic injuries, or wrongful death — those go to the standard PI practice (and demand drafting for ANY PI matter uses the pi-demand-letter skill).
---

# Reduced-Fee MVA Track (Discounted Contingency, Automated Workflow)

The product: a **reduced contingency fee (default 25% pre-suit, converting to the
standard fee if suit must be filed)** for motor-vehicle-accident cases that qualify
for a heavily automated workflow. The economics only work with a HARD intake gate —
liability must be clear, insurance must be reachable, and the injury profile must fit
the pipeline. Everything that fails the gate routes to the standard-fee PI practice,
which is a GOOD outcome, not a rejection: those cases need the full war chest.

**Every document is a DRAFT for Mike's review. The contingency fee agreement must be
in writing and signed before work begins (Tex. Disciplinary R. Prof. Conduct
1.04(d)). Demand letters are drafted with the `pi-demand-letter` skill — this skill
runs the pipeline around it.**

## The gate (run first — templates/intake.md)

**Route to STANDARD-FEE track** (with a one-line explanation to the client) on any of:
1. **Liability not clear**: anything other than rear-end, other-driver-cited,
   other-driver DWI, or other-driver left-turn/red-light scenarios. Any client
   citation or any self-reported share of fault (the 51% bar, Tex. Civ. Prac. &
   Rem. Code § 33.001, and even small comparative cuts break the discount math).
2. **Injury severity**: surgery, surgical recommendation, or catastrophic injury —
   these deserve full-fee attention and full-value workup.
3. **Fatality**: wrongful death/survival — standard track, immediate escalation
   (claims and limitations run differently; death claims accrue at death,
   § 16.003(b)).
4. **Commercial defendant** (trucking, rideshare on-app, company vehicle) —
   preservation fights and layered coverage are not automation material.
5. **Hit-and-run / uninsured defendant with no UM** — candid decline if there is no
   collectable coverage at all; UM-only claims MAY stay on the reduced track if the
   client's own UM coverage is confirmed.

**ESCALATE to Mike before signing** on: prior attorney on the case (fee-lien
exposure), minor claimant (tolling and settlement-approval procedures), limitations
inside 120 days, recorded statement already given, or Medicare/Medicaid/ERISA
health coverage (lien complexity — stays in the track, but priced knowingly).

## Limitations discipline

Two years from the accident (Tex. Civ. Prac. & Rem. Code § 16.003). The intake
system computes the SOL date and creates a high-priority task at **90 days before
limitations** — the file-suit-or-resolve decision point that also ends the reduced
fee (conversion to standard fee on filing is in the engagement letter). NEVER let a
reduced-fee file ride within 90 days of limitations without Mike's explicit plan.

## Pipeline (milestones drive the deadline tasks)

1. **Sign-up**: written reduced-contingency agreement (docgen), HIPAA
   authorizations collected, LOR + preservation letters out (docgen).
2. **LOR sent** → confirm carrier acknowledgment/claim number (+14d); check
   PIP/MedPay with client's carrier (+7d) — first-party benefits are free money the
   automated track should never miss.
3. **Treating**: monthly client check-in cadence; watch for treatment gaps (the
   adjuster will) — flag gaps > 30 days to Mike.
4. **Treatment complete** → order all records and itemized bills (+3d). Use
   affidavit-ready billing/records requests (Tex. Civ. Prac. & Rem. Code § 18.001
   affidavits at litigation stage if needed).
5. **Records complete** → draft the demand with the **pi-demand-letter skill**
   (+7d). Policy-limits demands must be Stowers-compliant where the facts support
   it — that analysis is in the demand skill.
6. **Demand sent** → response follow-up (+30d or the demand's deadline); track any
   Stowers deadline precisely.
7. **Negotiation** → offers logged; client authority documented in writing.
8. **Settled** → release review, lien resolution (hospital liens under Tex. Prop.
   Code ch. 55, health/Medicare/Medicaid/ERISA reimbursement), closing statement
   with the fee shown exactly as contracted, disbursement, closing letter.

## Fee mechanics (engagement letter enforces these)

- Reduced fee applies **pre-suit only**; filing suit converts to the standard fee —
  stated in the signed agreement, never sprung later.
- Fee computed on gross recovery; case expenses itemized and reimbursed per the
  agreement; liens are the client's obligations, resolved from their share, with
  our negotiation of lien reductions included in the service.
- No settlement without written client authority. Closing statement signed by the
  client in every case.
- Advertising for the reduced-fee product goes through State Bar Advertising
  Review; never advertise outcomes or "cheapest" comparisons.
