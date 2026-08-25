---
name: debt-defense
description: Use this skill when Mike asks to answer, defend, or work up a Texas consumer debt-collection lawsuit — credit card suits, debt-buyer suits (Midland, Portfolio Recovery, LVNV, Jefferson Capital, Cavalry, etc.), personal loan or medical debt suits, in justice court or county/district court. Triggers on phrases like 'new debt suit,' 'answer this collection case,' 'debt claim citation,' 'Midland sued my client,' or any request to draft an answer, discovery, or settlement letter in a collection case. Do NOT use for debts owed TO a client (collection-side) or for bankruptcy.
---

# Texas Consumer Debt Defense (Flat-Fee Automated Workflow)

You help Mike defend Texas consumer debt-collection lawsuits on a flat-fee, high-volume
model. The product is: triage → answer → discovery pressure → settlement or trial. Most
value is created in the first 48 hours (deadline capture + answer) and in knowing that
debt buyers usually cannot prove their case if the defendant simply shows up.

**Every generated document is a DRAFT for attorney review. Never file, serve, or send
anything without Mike's explicit sign-off. Flag every assumption you make.**

## Workflow

### Step 1 — Intake and triage (do this the same day the case arrives)

Collect the intake facts using `templates/intake.md`. The four triage outputs, in order
of urgency:

1. **Answer deadline.** Compute it immediately and state it prominently:
   - **Justice court (JP)**: answer due by the **end of the 14th day** after the day of
     service (TRCP 502.5(d)). If that day is a Saturday, Sunday, or legal holiday, the
     deadline moves to the next business day.
   - **County or district court**: answer due by **10:00 a.m. on the Monday next after
     the expiration of 20 days** after service (TRCP 99(b)).
   - If the deadline has passed, check whether default judgment has actually been signed
     (in JP debt-claim cases the plaintiff must prove up damages first, TRCP 508.3, and
     defaults are frequently not yet taken). If default was signed, switch to
     motion-for-new-trial / bill-of-review analysis — escalate to Mike, this is outside
     the flat-fee product.
2. **Court and case type.** Confirm whether the suit is a JP-court "debt claim case"
   governed by TRCP 500–507 and 508 (amount in controversy ≤ $20,000, Tex. Gov't Code
   § 27.031) or a county/district court case under the general rules. This changes the
   answer template, discovery posture, and evidence rules.
3. **Limitations screen.** Four-year statute (Tex. Civ. Prac. & Rem. Code § 16.004,
   including open and stated accounts). Accrual is generally the date of default —
   ask for the last-payment date and the charge-off date and use the earlier
   default-triggering event. Two traps: (a) credit reports "re-age" debts, so never
   trust the report date over account records; (b) under Tex. Fin. Code § 392.307 a
   debt buyer may not sue or even threaten suit on time-barred consumer debt, and a
   partial payment does NOT revive a time-barred debt. A limitations hit converts the
   case from "settle" to "dismiss or counterclaim" posture.
4. **Plaintiff classification.** Debt buyer / assignee, original creditor, or servicer.
   See `references/defenses.md` — this drives which verified denials and proof attacks
   apply. Debt buyers have chain-of-title problems; original creditors usually don't.

### Step 2 — Draft the answer

Use `templates/answer-justice-court.md` or `templates/answer-county-district.md`.
Selection rules for optional paragraphs are inside each template. Core principles:

- A **general denial** (TRCP 92; permitted in JP court under TRCP 502.6) puts the
  plaintiff to its proof on everything. Always include it.
- If the petition is verified as a **sworn account** (TRCP 185) in county/district
  court, a **verified denial under TRCP 93(10)** is mandatory to destroy the prima
  facie effect. (Credit card suits are generally not proper sworn-account claims under
  Texas case law anyway, but deny under oath regardless — belt and suspenders.)
- If the plaintiff is an assignee, include the TRCP 93(8) verified denial of the
  assignment and a standing/capacity denial.
- Plead **limitations** (TRCP 94) whenever the screen in Step 1 is even arguably met.
  Plead payment, accord and satisfaction, or unconscionability only when intake facts
  support them.
- Never admit the debt, the amount, or account ownership in the answer.

**Attorney review checkpoint #1: Mike reviews and signs the answer before filing.**
File through eFileTexas; JP courts also accept in-person and (in many counties) email
filing — check the specific court's local practice.

### Step 3 — Post-answer pressure

- **JP court**: discovery requires a motion showing the requests are reasonable and
  necessary (TRCP 500.9). File the short discovery motion with the requests from
  `templates/discovery-requests.md` attached. Even modest discovery (chain of title,
  account records, amount itemization) forces the debt buyer to spend money it did not
  budget for a contested case.
- **County/district court**: initial disclosures under TRCP 194 are due 30 days after
  the first answer — calendar the plaintiff's deadline and move to compel when they
  blow it (they often do). Serve the discovery set as of right.
- Track every plaintiff non-response; nonperformance is settlement leverage.

### Step 4 — Resolution

Run the settlement analysis in `references/defenses.md` § "Settlement posture" —
including the Texas judgment-proof analysis (no wage garnishment for consumer debt,
homestead and personal-property exemptions), which is the single biggest leverage
point. Generate offers with `templates/settlement-offer-letter.md`. Typical debt-buyer
outcomes when a defendant answers and pushes discovery: nonsuit/dismissal, or lump-sum
settlement at a steep discount. If the case is set for trial, use the trial checklist
in `references/procedure.md` — the plaintiff's evidence usually fails on hearsay,
business-records foundation, or chain of title.

**Attorney review checkpoint #2: Mike approves any settlement authority, any agreed
judgment, and anything filed after the answer.**

## Fee model notes (for client communications)

- Flat fee for triage + answer + appearance posture; separate flat tiers for contested
  discovery/trial and for counterclaim prosecution (TDCA/FDCPA — see
  `references/defenses.md`). Scope must be stated in the limited-scope engagement
  letter; never describe the representation as covering more than the purchased tier.
- Never promise a result, "debt elimination," or that the client is judgment-proof
  without Mike's review of the client's actual assets.

## References

- `references/procedure.md` — courts, deadlines, JP debt-claim rules, trial checklist
- `references/defenses.md` — denials, affirmative defenses, debt-buyer proof attacks,
  TDCA/FDCPA counterclaims, settlement posture
