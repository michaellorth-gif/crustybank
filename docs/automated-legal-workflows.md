# Automated Legal Workflows — Flat-Fee Practice Lines

Three Claude Code skills in `.claude/skills/` implement discounted, heavily automated
practice-area workflows. Each follows the same architecture:

**gate/screen → generate drafts → attorney review checkpoint → e-file → tracked
follow-through**, with honest routing out of the product when a case doesn't fit.

| Skill | Product | Court | Automation core |
|---|---|---|---|
| `debt-defense` | Flat-fee defense of consumer collection suits (**flagship**) | Mostly JP (≤ $20k), some county/district | Deadline triage, answer generation (general + verified denials), TRCP 500.9 discovery pressure, exemption-based settlement posture |
| `expunction` | Record clearing under CCP ch. 55A (+ nondisclosure pivot) | District (mostly) | Arrest-by-arrest eligibility tree with verified 55A cites, petition + order generation, agency-list completeness |
| `uncontested-divorce` | Tier 1 agreed divorce: no kids, no real property | District / CCL family | Hard intake gate, § 6.4035 waiver sequencing, 60-day clock, agreed decree with completeness check |

## Shared operating rules

1. **Every document is a draft.** Nothing is filed, served, or sent without Mike's
   review. Each SKILL.md embeds named attorney-review checkpoints.
2. **Limited-scope engagement letters** define each flat-fee tier and the events
   that convert a case out of the product (Tex. Disciplinary R. Prof. Conduct 1.02
   informed-consent practice).
3. **Flat-fee handling**: document earned/refundable treatment; route unearned fees
   per trust-accounting rules.
4. **Advertising** for these consumer products goes through State Bar Advertising
   Review before publication.
5. **Verified law**: statutory cites in the reference files were verified against
   current law in August 2026 (notably: expunction recodified as CCP ch. 55A eff.
   1/1/2025). Rule cites (TRCP) and dollar caps should be pinpoint-checked
   periodically; each reference file marks what was verified.

## Roadmap (from the practice-line planning discussion)

- Next products on the same backbone: wills/estate packages (reuses doc-assembly),
  small estate affidavits / muniment of title, traffic tickets (volume play + PI
  lead funnel), reduced-fee clear-liability MVA track (extends the existing
  pi-demand-letter workflow).
- Infrastructure candidates: web intake forms feeding these skills' intake
  templates, eFileTexas filing integration, deadline calendaring into the
  practice-management stack.
