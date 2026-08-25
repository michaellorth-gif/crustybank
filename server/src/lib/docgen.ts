// Document generation for the flat-fee practice lines. Renders filing-ready DRAFTS
// in markdown from intake data + firm settings. Unknown facts stay as [BRACKETED]
// placeholders; every document is stamped for attorney review. The generators mirror
// the templates in .claude/skills/*/templates/.

import type { DebtIntakeData, ExpunctionIntakeData, ExpunctionArrest, DivorceIntakeData } from './legalTriage.js'

export interface Firm {
  attorneyName?: string
  barNumber?: string
  firmName?: string
  address?: string
  phone?: string
  email?: string
}

export interface GeneratedDoc {
  title: string
  category: string
  content: string
}

const REVIEW_BANNER =
  '> **DRAFT — ATTORNEY REVIEW REQUIRED. Do not file, serve, or send without sign-off.**\n\n'

function ph(value: string | undefined | null, placeholder: string): string {
  const v = (value || '').trim()
  return v ? v : `[${placeholder}]`
}

function signatureBlock(firm: Firm, clientRole: string): string {
  return [
    'Respectfully submitted,',
    '',
    ph(firm.attorneyName, 'ATTORNEY NAME'),
    `State Bar No. ${ph(firm.barNumber, 'BAR NUMBER')}`,
    ph(firm.firmName, 'FIRM NAME'),
    ph(firm.address, 'FIRM ADDRESS'),
    `Tel: ${ph(firm.phone, 'PHONE')}`,
    ph(firm.email, 'EMAIL'),
    `**Attorney for ${clientRole}**`,
  ].join('  \n')
}

function debtCourtName(data: DebtIntakeData): string {
  const county = ph(data.county, 'COUNTY').toUpperCase()
  if (data.courtType === 'justice') return `IN THE JUSTICE COURT, PRECINCT [___], PLACE [___]\n${county} COUNTY, TEXAS`
  if (data.courtType === 'county') return `IN THE COUNTY COURT AT LAW NO. [___]\n${county} COUNTY, TEXAS`
  return `IN THE [___] JUDICIAL DISTRICT COURT\n${county} COUNTY, TEXAS`
}

function debtCaption(data: DebtIntakeData, clientName: string): string {
  return [
    `**CAUSE NO. ${ph(data.causeNumber, 'CAUSE NUMBER')}**`,
    '',
    `| ${ph(data.plaintiffName, 'PLAINTIFF')}, *Plaintiff* | § | ${debtCourtName(data).split('\n')[0]} |`,
    '| :-- | :-: | :-- |',
    `| v. | § | |`,
    `| ${clientName.toUpperCase()}, *Defendant* | § | ${debtCourtName(data).split('\n')[1]} |`,
    '',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Debt defense

export function debtAnswer(data: DebtIntakeData, clientName: string, firm: Firm): GeneratedDoc {
  const isJP = data.courtType === 'justice'
  const assignee = !!data.originalCreditor &&
    !data.plaintiffName.toLowerCase().includes((data.originalCreditor || '').toLowerCase().split(' ')[0])
  const timeBarredHint = !!data.lastPaymentDate &&
    (Date.now() - new Date(data.lastPaymentDate).getTime()) / (365.25 * 24 * 3600 * 1000) >= 3.5

  const sections: string[] = []
  let n = 1

  sections.push(`**${n++}. ${isJP ? 'Appearance.' : 'General Denial.'}**` + (isJP
    ? ` Defendant appears and answers in this debt claim case governed by Rule 508 of the Texas Rules of Civil Procedure.`
    : ''))
  if (isJP) {
    sections.push(`**${n++}. General Denial.** Defendant generally denies each and every allegation in Plaintiff's Petition and demands that Plaintiff be required to prove its claims as required by law. Tex. R. Civ. P. 502.6, 92.`)
  } else {
    sections[0] = `**1. General Denial.** Pursuant to Rule 92 of the Texas Rules of Civil Procedure, Defendant generally denies each and every allegation contained in Plaintiff's Petition and any supplements or amendments thereto, and demands strict proof thereof.`
    n = 2
  }

  if (data.swornPetition) {
    sections.push(`**${n++}. Verified Denial of Account.** Defendant denies that the account which is the foundation of Plaintiff's action is just or true, in whole or in part, and denies each and every item of the account. Defendant further states the claim asserted is not a proper subject of a suit on sworn account under Rule 185. Tex. R. Civ. P. 93(10), 185.`)
  }

  if (assignee) {
    sections.push(`**${n++}. Verified Denials — Standing, Capacity, and Assignment.** Defendant denies the genuineness of each alleged assignment, transfer, or endorsement by which Plaintiff claims to own the alleged account, and denies that Plaintiff has standing or legal capacity to sue or is entitled to recover in the capacity in which it sues. Tex. R. Civ. P. 93(1), 93(2), 93(8).`)
  }

  const defenses: string[] = []
  if (timeBarredHint) defenses.push('- The claims are barred by the statute of limitations. Tex. Civ. Prac. & Rem. Code § 16.004. *(Verify accrual date from account records before filing.)*')
  if (data.recognizesDebt === 'identity-theft') defenses.push('- Defendant is not the person who incurred the alleged debt; any obligation arises from mistaken identity or identity theft.')
  if (defenses.length > 0) {
    sections.push(`**${n++}. Affirmative Defenses.** Pleading further, Defendant asserts:\n${defenses.join('\n')}`)
  }

  sections.push(`**${n++}. Attorney's Fees.** Defendant denies that Plaintiff is entitled to recover attorney's fees, and denies that all conditions precedent to any fee recovery, including presentment, have been satisfied.`)
  sections.push(`**${n++}. Prayer.** Defendant prays that Plaintiff take nothing, that Defendant recover costs, and for all other relief to which Defendant is entitled.`)

  const needsDeclaration = data.swornPetition || assignee
  const declaration = needsDeclaration ? `

## UNSWORN DECLARATION (Tex. Civ. Prac. & Rem. Code § 132.001)

My name is ${clientName}, my date of birth is [DOB], and my address is [ADDRESS], ${ph(data.county, 'COUNTY')} County, Texas, [ZIP], United States. I declare under penalty of perjury that the factual statements in the verified-denial paragraphs of the foregoing Answer are within my personal knowledge and are true and correct.

Executed in ${ph(data.county, 'COUNTY')} County, State of Texas, on the ___ day of [MONTH], [YEAR].

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  \n${clientName}, Declarant
` : ''

  return {
    title: `Answer — ${clientName} adv. ${data.plaintiffName}`,
    category: 'legal-draft',
    content: `${REVIEW_BANNER}${debtCaption(data, clientName)}
# DEFENDANT'S ${isJP ? 'ANSWER' : 'ORIGINAL ANSWER'}

Defendant ${clientName} files this ${isJP ? 'Answer' : 'Original Answer'} to Plaintiff's Petition and states:

${sections.join('\n\n')}

${signatureBlock(firm, 'Defendant')}
${declaration}
## CERTIFICATE OF SERVICE

I certify that a true copy of this Answer was served on all parties or their attorneys of record in accordance with ${isJP ? 'Rule 501.4' : 'Rule 21a'}, Texas Rules of Civil Procedure, on [DATE], by [METHOD].

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  \n${ph(firm.attorneyName, 'ATTORNEY NAME')}
`,
  }
}

export function debtDiscovery(data: DebtIntakeData, clientName: string, firm: Firm): GeneratedDoc {
  const isJP = data.courtType === 'justice'
  const jpMotion = isJP ? `# MOTION FOR DISCOVERY (Tex. R. Civ. P. 500.9)

Defendant moves the Court to authorize the discovery requests attached as Exhibit A. The requests are reasonable and necessary for trial preparation in this debt claim case: they concern Plaintiff's ownership of the alleged account, the records supporting the amount claimed, and the witnesses Plaintiff will rely on. Defendant requests that the Court order Plaintiff to respond within 30 days.

${signatureBlock(firm, 'Defendant')}

---

# EXHIBIT A — DEFENDANT'S DISCOVERY REQUESTS

` : `# DEFENDANT'S FIRST DISCOVERY REQUESTS TO PLAINTIFF

*(Served as of right. Calendar Plaintiff's TRCP 194 initial disclosures — due 30 days after the first answer was filed — and move to compel on default.)*

`
  return {
    title: `Discovery Requests — ${clientName} adv. ${data.plaintiffName}`,
    category: 'legal-draft',
    content: `${REVIEW_BANNER}${debtCaption(data, clientName)}
${jpMotion}## Requests for Production

1. The complete chain of title for the account made the basis of this suit, including every purchase and sale agreement, bill of sale, assignment, and transfer document, together with the account-level schedule or record referenced in each document sufficient to identify the account sued upon.
2. The credit agreement, cardmember agreement, promissory note, or other contract governing the account, including every version in effect from account opening through charge-off, and any documents showing its delivery to and acceptance by Defendant.
3. A complete transaction history for the account from a zero balance through the date of filing, itemizing all charges, payments, credits, interest, and fees.
4. All documents supporting the amount claimed, including the calculation of pre- and post-charge-off interest and all fees.
5. All documents Plaintiff contends establish that Defendant opened, used, or agreed to pay the account.
6. All affidavits, business-records certifications, or declarations Plaintiff intends to offer at trial, including under Tex. R. Evid. 902(10).
7. All communications between Plaintiff (or anyone acting for it) and Defendant concerning the account.
8. Documents sufficient to show the date of Defendant's last payment on the account and the dates of default and charge-off.

## Interrogatories

1. Identify the original creditor, the account number (last four digits), the date of Defendant's last payment, the date of default, and the date of charge-off.
2. Itemize the amount sued for: principal, interest (with rates, periods, and contractual or statutory basis), and each fee.
3. Identify each person or entity that transferred or held the account between the original creditor and Plaintiff, and the date of each transfer.
4. Identify each witness Plaintiff may call at trial and, for any records custodian, the entity whose records the witness will sponsor and the basis of the witness's personal knowledge of that entity's record-keeping systems.

## Requests for Admission

1. Admit that Plaintiff is not the original creditor of the account.
2. Admit that Plaintiff has no employee with personal knowledge of the original creditor's record-keeping practices.
3. Admit that Plaintiff does not possess a document signed by Defendant agreeing to pay the account.
4. Admit that the amount pleaded includes interest accrued after charge-off.

${signatureBlock(firm, 'Defendant')}
`,
  }
}

export function debtSettlementLetter(data: DebtIntakeData, clientName: string, firm: Firm): GeneratedDoc {
  const timeBarredHint = !!data.lastPaymentDate &&
    (Date.now() - new Date(data.lastPaymentDate).getTime()) / (365.25 * 24 * 3600 * 1000) >= 4
  return {
    title: `Settlement Offer — ${clientName} adv. ${data.plaintiffName}`,
    category: 'legal-draft',
    content: `${REVIEW_BANNER}*Set authority with the client BEFORE sending. Rule 408 communication.*

[DATE]

VIA [EMAIL / EFILE SERVICE CONTACT]

${ph(data.plaintiffFirm, "PLAINTIFF'S LAW FIRM")}  \n[ADDRESS]

**Re:** *${ph(data.plaintiffName, 'PLAINTIFF')} v. ${clientName}*, Cause No. ${ph(data.causeNumber, 'CAUSE NUMBER')}, ${ph(data.county, 'COUNTY')} County, Texas — CONFIDENTIAL SETTLEMENT COMMUNICATION (Tex. R. Evid. 408)

Counsel:

I represent ${clientName} in the above matter. My client has answered and intends to defend this case through trial if necessary.

Our review indicates your client will need to produce a complete, account-level chain of title and a sponsoring witness competent to lay the business-records foundation for the original creditor's records. We are prepared to try the evidentiary issues.
${timeBarredHint ? `
The account records indicate the last payment occurred on or about ${data.lastPaymentDate}, more than four years before suit was filed. The claim appears barred by Tex. Civ. Prac. & Rem. Code § 16.004, and prosecution of a time-barred consumer claim raises issues under Tex. Fin. Code ch. 392 and 15 U.S.C. § 1692 that my client reserves.
` : ''}
You are aware that Texas exempts wages from garnishment for claims of this kind and provides substantial homestead and personal-property exemptions. Even a judgment in your client's favor is unlikely to be economically collectable.

Without any admission of liability, and to resolve the matter, my client offers:

1. Payment of **$[AMOUNT]** in a single lump sum within [21] days of executed settlement documents;
2. Dismissal of the suit **with prejudice**, each party bearing its own costs and fees;
3. Your client's agreement to **delete its tradeline / cease reporting** on the account with all consumer reporting agencies, and to sell or transfer no interest in the account;
4. A mutual release limited to this account; and
5. Written confirmation that the payment resolves the account **in full**.

This offer expires at 5:00 p.m. on [DATE].

Sincerely,

${ph(firm.attorneyName, 'ATTORNEY NAME')}  \n${ph(firm.firmName, 'FIRM NAME')}
`,
  }
}

// ---------------------------------------------------------------------------
// Expunction

function arrestBlock(a: ExpunctionArrest, i: number): string {
  return `**Arrest #${i + 1}.** Petitioner was arrested on ${a.arrestDate} in ${a.county} County, Texas, by ${ph(a.agency, 'ARRESTING AGENCY')}, for the alleged offense of ${a.offense} (${a.level.replace('class', 'Class ')}). Disposition: ${a.disposition.replace(/-/g, ' ')}${a.dispositionDate ? ` on ${a.dispositionDate}` : ''}.`
}

export function expunctionPetition(data: ExpunctionIntakeData, clientName: string, firm: Firm): GeneratedDoc {
  // One petition per arrest is standard practice; this draft covers the FIRST
  // screened-eligible arrest and notes any others for separate petitions.
  const arrests = data.arrests
  const agencyRows = [
    'Texas Department of Public Safety, Crime Records Division',
    `${ph(arrests[0]?.agency, 'ARRESTING AGENCY')}`,
    `${arrests[0]?.county || '[COUNTY]'} County Sheriff's Office`,
    `${arrests[0]?.county || '[COUNTY]'} County District Attorney`,
    `${arrests[0]?.county || '[COUNTY]'} County District Clerk`,
    `${arrests[0]?.county || '[COUNTY]'} County jail / detention facility`,
    'FBI — Criminal Justice Information Services Division',
    '[COURT OF PROSECUTION, IF ANY]',
    '[BONDING COMPANY / PRETRIAL SERVICES, IF ANY]',
    '[PRIVATE BACKGROUND VENDORS, IF ANY]',
  ].map((a, i) => `| ${i + 1} | ${a} | [ADDRESS] |`).join('\n')

  return {
    title: `Petition for Expunction — ${clientName}`,
    category: 'legal-draft',
    content: `${REVIEW_BANNER}*Verify the eligibility route against the certified criminal history and pinpoint-check the ch. 55A article before filing. ${arrests.length > 1 ? `NOTE: intake lists ${arrests.length} arrests — file a separate petition per arrest; this draft covers Arrest #1.` : ''}*

**CAUSE NO. \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_**

| EX PARTE | § | IN THE DISTRICT COURT |
| :-- | :-: | :-- |
| ${clientName.toUpperCase()}, *Petitioner* | § | \\_\\_\\_\\_ JUDICIAL DISTRICT |
| | § | ${(arrests[0]?.county || '[COUNTY]').toUpperCase()} COUNTY, TEXAS |

# VERIFIED PETITION FOR EXPUNCTION OF RECORDS

Petitioner ${clientName} petitions this Court under Chapter 55A of the Texas Code of Criminal Procedure for expunction of all records and files relating to the arrest described below, and shows:

**1. Petitioner's identifying information.**
- Full name: ${clientName}
- Sex: [SEX] — Race: [RACE] — Date of birth: [DOB]
- Driver's license number: [DL NUMBER] ([STATE])
- Social Security number: [SSN — collect at signing, not stored in intake]
- Address at the time of arrest: [ARREST-TIME ADDRESS]

${arrestBlock(arrests[0], 0)}

**3. Entitlement.** Petitioner is entitled to expunction under Tex. Code Crim. Proc. art. [55A.052 / 55A.053 / OTHER — PINPOINT-CHECK AGAINST VERIFIED DISPOSITION] because [TRACK THE STATUTORY ELEMENTS FOR THE ROUTE]. Petitioner has not been convicted of, and did not receive court-ordered community supervision for, any offense arising from the arrest [ADAPT TO ROUTE].

**4. Agencies and entities** that may hold records subject to expunction:

| # | Agency / entity | Address |
| :-: | :-- | :-- |
${agencyRows}

**5. Prayer.** Petitioner prays that the Court set this petition for hearing; that on hearing the Court grant expunction of all records and files relating to the arrest; that the Court order each listed agency and entity to return, remove, delete, or destroy all such records as provided by Chapter 55A; and for all further relief to which Petitioner is entitled.

${signatureBlock(firm, 'Petitioner')}

## VERIFICATION

STATE OF TEXAS / COUNTY OF ${(arrests[0]?.county || '[COUNTY]').toUpperCase()}

Before me, the undersigned authority, personally appeared ${clientName}, who, being duly sworn, stated that they have read the foregoing Petition and that every factual statement in it is within their personal knowledge and is true and correct.

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  \n${clientName}, Petitioner

SUBSCRIBED AND SWORN TO before me on \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_, 20\\_\\_.

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  \nNotary Public, State of Texas
${arrests.length > 1 ? `\n---\n\n*Additional arrests requiring separate petitions:*\n\n${arrests.slice(1).map((a, i) => arrestBlock(a, i + 1)).join('\n\n')}` : ''}`,
  }
}

export function expunctionOrder(data: ExpunctionIntakeData, clientName: string, _firm: Firm): GeneratedDoc {
  const a = data.arrests[0]
  return {
    title: `Proposed Order of Expunction — ${clientName}`,
    category: 'legal-draft',
    content: `${REVIEW_BANNER}*The agency table must match the filed petition exactly. Check whether the county has a mandatory form order.*

**CAUSE NO. [CAUSE NUMBER]**

| EX PARTE | § | IN THE DISTRICT COURT |
| :-- | :-: | :-- |
| ${clientName.toUpperCase()}, *Petitioner* | § | \\_\\_\\_\\_ JUDICIAL DISTRICT |
| | § | ${(a?.county || '[COUNTY]').toUpperCase()} COUNTY, TEXAS |

# ORDER OF EXPUNCTION

On this day the Court considered the Verified Petition for Expunction of Records filed by ${clientName}. The Court finds that notice was given as required by Chapter 55A of the Texas Code of Criminal Procedure, that the Court has jurisdiction, and that Petitioner is entitled to expunction under Tex. Code Crim. Proc. art. [ARTICLE] of all records and files relating to the following arrest:

- Name: ${clientName} — Sex: [SEX] — Race: [RACE] — DOB: [DOB]
- DL No.: [DL NUMBER] — SSN: [SSN]
- Date of arrest: ${a?.arrestDate || '[DATE]'} — Arresting agency: ${ph(a?.agency, 'AGENCY')}
- Offense charged: ${a?.offense || '[OFFENSE]'} — Cause No.: [CAUSE NO or "none"] — Court: [COURT or "none"]

IT IS THEREFORE ORDERED that all records and files relating to the arrest described above are EXPUNGED as provided by Chapter 55A, Texas Code of Criminal Procedure.

IT IS FURTHER ORDERED that each agency and entity listed in the Petition shall return to the Court, or if return is impracticable obliterate, delete, and destroy, all records and files relating to the arrest, and shall delete from public records all index references to those records and files:

[AGENCY TABLE — IDENTICAL TO PETITION]

IT IS FURTHER ORDERED that the Texas Department of Public Safety shall notify any central federal depository of criminal records, including the Federal Bureau of Investigation, of this Order and request deletion or return of the applicable records.

IT IS FURTHER ORDERED that the release, maintenance, dissemination, or use of the expunged records and files for any purpose is PROHIBITED, and that Petitioner may deny the occurrence of the arrest and the existence of the expunction order as permitted by law.

IT IS FURTHER ORDERED that the Clerk shall send a certified copy of this Order to each listed agency and entity by certified mail, return receipt requested, or secure electronic means.

SIGNED on \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_, 20\\_\\_.

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  \n**JUDGE PRESIDING**
`,
  }
}

// ---------------------------------------------------------------------------
// Divorce

function divorceCaption(data: DivorceIntakeData, petitioner: string): string {
  const respondent = ph(data.respondentName as string | undefined, 'RESPONDENT NAME')
  return `**CAUSE NO. \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_**

| IN THE MATTER OF THE MARRIAGE OF | § | IN THE [DISTRICT COURT / COUNTY COURT AT LAW NO. \\_\\_] |
| :-- | :-: | :-- |
| ${petitioner.toUpperCase()} | § | \\_\\_\\_\\_ JUDICIAL DISTRICT |
| AND | § | |
| ${respondent.toUpperCase()} | § | ${ph(data.filingCounty, 'COUNTY').toUpperCase()} COUNTY, TEXAS |
`
}

export function divorcePetition(data: DivorceIntakeData, petitioner: string, firm: Firm): GeneratedDoc {
  const respondent = ph(data.respondentName as string | undefined, 'RESPONDENT NAME')
  const nameChange = data.nameChangeRequested
    ? `\n**10. Change of Name.** [Petitioner / Respondent] requests restoration of the former name of ${ph(data.formerName as string | undefined, 'FORMER FULL NAME')}, which is requested for no fraudulent purpose.\n`
    : ''
  return {
    title: `Original Petition for Divorce — ${petitioner}`,
    category: 'legal-draft',
    content: `${REVIEW_BANNER}*Tier 1 gate must be PASSED and conflicts cleared on both spouses before filing. Check for a county standing order.*

${divorceCaption(data, petitioner)}
# ORIGINAL PETITION FOR DIVORCE

**1. Discovery Level.** Discovery is intended to be conducted under Level 2 of Rule 190, Texas Rules of Civil Procedure. This is an agreed divorce; no discovery is anticipated.

**2. Parties.** This suit is brought by ${petitioner}, Petitioner. The last three numbers of Petitioner's driver's license are [DL3]; the last three numbers of Petitioner's Social Security number are [SSN3]. ${respondent} is Respondent.

**3. Domicile and Residency.** [Petitioner / Respondent] has been a domiciliary of Texas for the preceding six-month period and a resident of ${ph(data.filingCounty, 'COUNTY')} County for the preceding 90-day period. Tex. Fam. Code § 6.301.

**4. Service.** No service on Respondent is necessary at this time. Respondent will sign and file a waiver of service pursuant to Tex. Fam. Code § 6.4035.

**5. Protective Order Statement.** No protective order under Title 4 of the Texas Family Code, protective order under Chapter 7B of the Code of Criminal Procedure, or order for emergency protection under Article 17.292 of the Code of Criminal Procedure is in effect regarding the parties, and no application for any such order is pending.

**6. Dates of Marriage and Separation.** The parties were married on or about ${ph(data.marriageDate, 'MARRIAGE DATE')} and ceased to live together as spouses on or about ${ph(data.separationDate, 'SEPARATION DATE')}.

**7. Grounds.** The marriage has become insupportable because of discord or conflict of personalities that destroys the legitimate ends of the marital relationship and prevents any reasonable expectation of reconciliation. Tex. Fam. Code § 6.001.

**8. Children.** There are no children of the marriage under eighteen years of age or otherwise entitled to support, none are expected, and the wife is not pregnant.

**9. Property and Debts.** The parties have entered into, or expect to enter into, an agreement for the division of their community estate and their debts, which will be presented to the Court in an Agreed Final Decree of Divorce. Petitioner requests the Court to approve the agreement and divide the estate of the parties in a manner the Court deems just and right. Tex. Fam. Code § 7.001.
${nameChange}
**Prayer.** Petitioner prays that citation and notice issue as required by law only if waiver is not filed; that the Court grant a divorce and all other relief requested in this petition; and for general relief.

${signatureBlock(firm, 'Petitioner')}
`,
  }
}

export function divorceWaiver(data: DivorceIntakeData, petitioner: string, firm: Firm): GeneratedDoc {
  const respondent = ph(data.respondentName as string | undefined, 'RESPONDENT NAME')
  return {
    title: `Waiver of Service — ${petitioner} / ${respondent}`,
    category: 'legal-draft',
    content: `${REVIEW_BANNER}*HARD RULE: void unless signed AFTER the petition is filed (Fam. Code § 6.4035). Send only with a FILE-STAMPED petition, and confirm the signature date before filing.*

${divorceCaption(data, petitioner)}
# WAIVER OF SERVICE ONLY
### (Specific Waiver — Agreed Divorce)

I am ${respondent}, Respondent in this case. The last three numbers of my driver's license are [DL3]; the last three numbers of my Social Security number are [SSN3]. My mailing address is ${ph(data.respondentAddress as string | undefined, 'RESPONDENT ADDRESS')}.

1. I acknowledge that I received a file-stamped copy of the Original Petition for Divorce filed in this case on [FILING DATE]. I have read and understand it.
2. I understand that I have the right to be personally served with citation and a copy of the petition. I waive the issuance and service of citation only. I do NOT waive any other rights. I enter my appearance for all purposes.
3. I agree that the case may be decided by the presiding judge of the court or by a duly appointed associate judge.
4. I request notice of any hearing or trial in this case, sent to the address above.
5. I understand that ${ph(firm.attorneyName, 'ATTORNEY NAME')} represents ${petitioner} only and does not represent me, and that I have the right to hire my own attorney.
6. I have signed this waiver AFTER the petition was filed.

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  \n${respondent}, Respondent — Date signed: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_

### Unsworn Declaration (Tex. Civ. Prac. & Rem. Code § 132.001)

My name is ${respondent}, my date of birth is [DOB], and my address is ${ph(data.respondentAddress as string | undefined, 'ADDRESS')}, United States. I declare under penalty of perjury that the foregoing is true and correct.

Executed in [COUNTY] County, State of [STATE], on the \\_\\_\\_ day of [MONTH], [YEAR].

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  \nDeclarant

---

## Cover letter to Respondent

Dear ${respondent}:

I represent ${petitioner} in the divorce case filed on [FILING DATE] in ${ph(data.filingCounty, 'COUNTY')} County, Texas. **I am not your attorney and cannot give you legal advice.** You have the right to hire your own attorney, and I encourage you to do so if you have any questions about your rights.

Enclosed are (1) a file-stamped copy of the Original Petition for Divorce and (2) a Waiver of Service. If you agree, sign the waiver **on or after today's date** and either have it notarized or complete the unsworn declaration, then return it in the enclosed envelope or by email to ${ph(firm.email, 'EMAIL')}.

Signing the waiver gives up only the right to be formally served by a process server; it does not give up any other right. A proposed Agreed Final Decree will follow for your review before anything is finalized. The court cannot grant the divorce before the 60th day after filing.

Sincerely,

${ph(firm.attorneyName, 'ATTORNEY NAME')}  \n${ph(firm.firmName, 'FIRM NAME')}
`,
  }
}

export function divorceDecree(data: DivorceIntakeData, petitioner: string, _firm: Firm): GeneratedDoc {
  const respondent = ph(data.respondentName as string | undefined, 'RESPONDENT NAME')
  const nameChange = data.nameChangeRequested
    ? `\n**Change of Name.** IT IS ORDERED AND DECREED that the name of [PARTY] is changed to ${ph(data.formerName as string | undefined, 'FORMER FULL NAME')}.\n`
    : ''
  return {
    title: `Agreed Final Decree of Divorce — ${petitioner}`,
    category: 'legal-draft',
    content: `${REVIEW_BANNER}*Both parties sign BEFORE prove-up. Every asset and debt from intake must land in exactly one column. Some counties require their own decree form — check first.*

${divorceCaption(data, petitioner)}
# AGREED FINAL DECREE OF DIVORCE

On [DATE] the Court heard this case.

**Appearances.** Petitioner, ${petitioner}, appeared [in person / by remote appearance] with attorney and announced ready. Respondent, ${respondent}, waived issuance and service of citation by waiver filed on [WAIVER FILE DATE], entered an appearance, and has agreed to the terms of this decree as shown by Respondent's signature below.

**Record.** The making of a record of testimony was [waived by the parties with the Court's consent / made by the court reporter].

**Jurisdiction and Domicile.** The Court finds that it has jurisdiction of this case and the parties, that the residency and domicile requirements of Tex. Fam. Code § 6.301 were satisfied at filing, and that at least 60 days have elapsed since the petition was filed.

**Divorce.** IT IS ORDERED AND DECREED that ${petitioner}, Petitioner, and ${respondent}, Respondent, are divorced and that the marriage between them is dissolved on the ground of insupportability. Tex. Fam. Code § 6.001.

**Children of the Marriage.** The Court finds there are no children of the marriage under eighteen years of age or otherwise entitled to support and none are expected.

**Division of the Marital Estate.** The Court finds that the parties have entered into an agreement for the division of their estate, set out below, and that the agreement is just and right. Tex. Fam. Code § 7.001.

### Property to Petitioner
- P-1. [VEHICLE year/make/model, VIN], subject to any debt secured by it.
- P-2. All funds in [INSTITUTION] account ending [LAST4].
- P-3. All sums in or related to Petitioner's retirement, pension, 401(k), IRA, and other employee benefit plans.
- P-4. All personal property, clothing, jewelry, and effects in Petitioner's possession or control.

### Property to Respondent
- R-1 … R-n. [MIRROR STRUCTURE]

### Debts to Petitioner
- PD-1. The debt owed to [CREDITOR], account ending [LAST4].
- PD-2. All debts incurred solely by Petitioner from and after ${ph(data.separationDate, 'SEPARATION DATE')}.

### Debts to Respondent
- RD-1 … RD-n. [MIRROR STRUCTURE]

### Tax Provisions
For calendar year [YEAR], each party shall file [separate returns / as agreed], and any refund or liability for prior joint years shall be [divided / borne by the party whose income generated it].

**Notice Duties.** Each party is ORDERED to send the other written notice of any change of mailing address and to complete all transfer, title, and account-closure steps within 30 days of entry of this decree.
${nameChange}
**Court Costs.** Costs are borne by the party who incurred them.

**Clarifying Orders.** Without affecting the finality of this decree, this Court expressly reserves the right to make orders necessary to clarify and enforce it.

**Denial of Relief.** All relief requested and not expressly granted is denied. This is a final judgment disposing of all claims and all parties and is appealable.

**Remarriage.** Neither party may marry a third party before the 31st day after this decree is signed.

SIGNED on \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_, 20\\_\\_.

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  \n**JUDGE PRESIDING**

## APPROVED AND CONSENTED TO AS TO BOTH FORM AND SUBSTANCE:

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_ ${petitioner}, Petitioner — Date: \\_\\_\\_\\_\\_\\_\\_\\_

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_ ${respondent}, Respondent — Date: \\_\\_\\_\\_\\_\\_\\_\\_
`,
  }
}

// ---------------------------------------------------------------------------
// Engagement letters (limited scope, per product)

const productScopes: Record<string, { name: string; scope: string; excluded: string }> = {
  'debt-defense': {
    name: 'Debt-Defense Flat Fee',
    scope: 'case triage; preparation and filing of an answer; monitoring of the case docket; and settlement negotiation with opposing counsel within authority you set in writing',
    excluded: 'contested discovery beyond an initial set, trial, appeals, counterclaim prosecution (TDCA/FDCPA), post-judgment remedies, and bankruptcy advice — each available at a separately quoted tier',
  },
  'expunction': {
    name: 'Expunction Flat Fee',
    scope: 'record-verified eligibility screening for the arrests identified at intake; preparation and filing of one petition for expunction per quoted arrest; and attendance at one unopposed hearing or submission per petition',
    excluded: 'contested hearings (State or agency opposition), appeals, nondisclosure petitions unless separately quoted, and disputes with private background-check vendors beyond one round of order-based dispute letters',
  },
  'uncontested-divorce': {
    name: 'Uncontested Divorce — Tier 1 Flat Fee',
    scope: 'preparation and filing of an Original Petition for Divorce; preparation of a waiver of service; preparation of an Agreed Final Decree consistent with the agreement you and your spouse have reached; and one prove-up appearance',
    excluded: 'contested matters of any kind — if your spouse hires a lawyer to oppose, files a counter-petition, or the agreement fails, this engagement converts as described below; also excluded: suits involving children, real-property transfers, retirement division (QDRO), and post-decree enforcement',
  },
}

export function engagementLetter(matterType: string, clientName: string, firm: Firm): GeneratedDoc {
  const p = productScopes[matterType]
  return {
    title: `Engagement Letter (${p.name}) — ${clientName}`,
    category: 'legal-draft',
    content: `${REVIEW_BANNER}*Limited-scope engagement letter. Confirm fee amounts and trust-accounting treatment before sending (unearned portions remain refundable).*

[DATE]

${clientName}  \n[CLIENT ADDRESS]

**Re: Engagement of ${ph(firm.firmName, 'FIRM NAME')} — ${p.name}**

Dear ${clientName}:

Thank you for choosing ${ph(firm.firmName, 'FIRM NAME')}. This letter sets out the terms of our representation. Please read it carefully — it defines exactly what we will and will not do for the quoted fee.

**1. Scope of representation (limited scope).** We will represent you in the following matter only: [MATTER DESCRIPTION]. Our services are limited to: ${p.scope}.

**2. Services NOT included.** This flat fee does not include: ${p.excluded}. If your matter comes to require any excluded service, we will tell you promptly, quote the additional tier or hourly rate, and proceed only with your written agreement.

**3. Fee.** The flat fee for the services in Paragraph 1 is **$[AMOUNT]**, payable [in full at signing / half at signing and half before final documents are prepared]. Court costs and filing fees are your responsibility and are quoted separately at cost. To the extent any portion of the fee is unearned when the representation ends, it will be refunded.

**4. Your responsibilities.** Provide complete and accurate information; respond promptly; tell us immediately about any deadline, court notice, or paper you receive.

**5. No guaranteed outcome.** We will use our professional judgment on your behalf, but no result is promised or guaranteed.

**6. Termination.** You may end the representation at any time, subject to court approval where required. We may withdraw as permitted by the Texas Disciplinary Rules of Professional Conduct.

If these terms are acceptable, sign and return this letter with the fee.

Sincerely,

${ph(firm.attorneyName, 'ATTORNEY NAME')}  \nState Bar No. ${ph(firm.barNumber, 'BAR NUMBER')}  \n${ph(firm.firmName, 'FIRM NAME')}

**AGREED AND ACCEPTED:**

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_  \n${clientName} — Date: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_
`,
  }
}

// ---------------------------------------------------------------------------

export const DOC_TYPES: Record<string, Array<{ id: string; label: string }>> = {
  'debt-defense': [
    { id: 'answer', label: 'Answer' },
    { id: 'discovery', label: 'Discovery requests' },
    { id: 'settlement-letter', label: 'Settlement offer letter' },
    { id: 'engagement-letter', label: 'Engagement letter' },
  ],
  'expunction': [
    { id: 'petition', label: 'Petition for expunction' },
    { id: 'order', label: 'Proposed order' },
    { id: 'engagement-letter', label: 'Engagement letter' },
  ],
  'uncontested-divorce': [
    { id: 'petition', label: 'Original petition' },
    { id: 'waiver', label: 'Waiver of service + cover letter' },
    { id: 'decree', label: 'Agreed final decree' },
    { id: 'engagement-letter', label: 'Engagement letter' },
  ],
}

export function generateDocument(
  matterType: string,
  docType: string,
  data: Record<string, unknown>,
  clientName: string,
  firm: Firm
): GeneratedDoc {
  if (docType === 'engagement-letter') return engagementLetter(matterType, clientName, firm)

  if (matterType === 'debt-defense') {
    const d = data as unknown as DebtIntakeData
    if (docType === 'answer') return debtAnswer(d, clientName, firm)
    if (docType === 'discovery') return debtDiscovery(d, clientName, firm)
    if (docType === 'settlement-letter') return debtSettlementLetter(d, clientName, firm)
  }
  if (matterType === 'expunction') {
    const d = data as unknown as ExpunctionIntakeData
    if (docType === 'petition') return expunctionPetition(d, clientName, firm)
    if (docType === 'order') return expunctionOrder(d, clientName, firm)
  }
  if (matterType === 'uncontested-divorce') {
    const d = data as unknown as DivorceIntakeData
    if (docType === 'petition') return divorcePetition(d, clientName, firm)
    if (docType === 'waiver') return divorceWaiver(d, clientName, firm)
    if (docType === 'decree') return divorceDecree(d, clientName, firm)
  }
  throw new Error(`Unknown document type "${docType}" for matter "${matterType}"`)
}
