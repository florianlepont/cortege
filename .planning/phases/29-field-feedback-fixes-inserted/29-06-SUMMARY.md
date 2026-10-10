---
phase: 29-field-feedback-fixes-inserted
plan: 06
subsystem: mobile-i18n
tags: [abbreviations, catalogue, source-gate, ratchet]
status: complete

requires:
  - phase: 29-field-feedback-fixes-inserted
    provides: decisions D-04, D-05, D-11 from CONTEXT, research "Abbreviations (D-04, D-05)"
provides:
  - i18n/fr/abbreviations.ts: abbreviationsFr (terms, sheet.open, sheet.close), AbbreviationTerm
  - fr.abbreviations section in the catalogue
  - __checks__/abbreviations.test.ts: POLICY, findUnexplainedAbbreviations, findMissingDefinitions, findUnusedTerms, PENDING_REWRITE
affects: [29-07, 29-09]

tech-stack:
  added: []
  patterns:
    - "Source gate modelled on catalogue-dash.test.ts: TypeScript parser leaves, comments and JSDoc skipped, fixtures in a temp dir, then a scan of the real catalogue; a pending list asserted by exact equality so it cannot go stale"

key-files:
  created:
    - mobile/src/i18n/fr/abbreviations.ts
    - mobile/src/__checks__/abbreviations.test.ts
  modified:
    - mobile/src/i18n/fr/index.ts
    - mobile/src/i18n/catalogue.test.ts

key-decisions:
  - "Decision D-04: one { long, explanation } entry per abbreviation that is written out or explained (IBP, BMg, BMm, TGB, GB, IGN, GBIF, CC0, CC BY, WGS 84, dmh) in fr.abbreviations.terms, plus the sheet texts (open, close)"
  - "Decision D-05: the gate scans every string, template part and JSX text of the fr catalogue (registry file excluded) and reports file, line, token and reason (unregistered, not-written-out, dev-only-outside, snake-case)"
  - "Decision D-11: allowlist is ha, cm, m, km, Mo, Ko, OK, PDF, GPS, ex.; IBP is info and must keep its long form in onboarding.ts, auth-gate.ts and survey-export.ts; DEV, URL, API, IP are dev-only in settings.ts and auth-gate.ts"
  - "The registry shrinks by itself: a policy key that no catalogue string uses fails findUnusedTerms; the registered explained terms must equal Object.keys(fr.abbreviations.terms)"

requirements-completed: [D-05, D-11]

metrics:
  tasks: 2
  files: 4
  completed: 2026-10-10
---

# Phase 29 Plan 06: Abbreviation registry and gate Summary

Catalogue registry of abbreviation texts (one shared entry each) and a source gate that fails on any abbreviation neither allowed, defined once nor written out, with today's 38 findings frozen in an exact-equality pending ratchet for plan 29-09.

## What was built

- `fr.abbreviations.terms`: eleven `{ long, explanation }` entries, explanations never repeat the bare short form; `fr.abbreviations.sheet` holds `open({ term })` ("Que signifie X ?") and `close`. Exposed in `fr/index.ts` and in the exact section list of `catalogue.test.ts`.
- `abbreviations.test.ts`: `POLICY` with the four treatments, pure helpers `findUnexplainedAbbreviations`, `findMissingDefinitions`, `findUnusedTerms`, 14 fixture tests (every behaviour of the plan) and five real-catalogue assertions.

## Pending ratchet (PENDING_REWRITE, 38 entries)

Re-ran the real scan first, as asked, since plans 29-02, 29-03 and 29-05 added catalogue strings. The result matches the inventory of the plan: no new finding, no missing registry entry.

- Written-out terms whose file lacks the long form: BMg and BMm (factor-detail, ibp-method, labels, validation), TGB and GB (factor-detail, validation), IGN (public-map, survey-export), CC0 and CC BY (account), WGS 84 (survey-export)
- Removed by plan 29-09: S0, S1, S2, S5 (ibp-method, labels), JSON (survey-detail), INSEE (survey-export), P/G (survey-detail)
- Rewritten by plan 29-09: bmg_count, bmm_count, tgb_count, gb_count, surface_ha, trees_per_ha, open_flowering_percent, class_score, type_count (labels)
- Not seen by the catalogue scan (outside the catalogue, research flag F-H): ACA and M in `ClusterListSheet.tsx`, still for plan 29-09.

Plan 29-09 empties `PENDING_REWRITE` and asserts an empty list.

## Deviations from Plan

None - plan executed as written. The one rule 3 touch: the first lint run flagged literal non-breaking spaces in the normaliser regex of the new test file (`no-irregular-whitespace`); replaced by escapes.

## Verification

- `npx jest -c jest.unit.config.js src/__checks__ src/i18n --coverage=false`: 11 suites, 140 tests pass
- `npm --workspace mobile run test:unit:coverage`: 324 suites, 4336 tests pass, coverage floors hold (src/i18n unchanged at 100 %)
- `npm run lint` and `npm run typecheck` exit 0; `npm run format:check` reports only the untracked local `.claude/settings.local.json` (not part of the plan, not touched)

## Commits

- 6e8ec688 feat(29-06): abbreviation registry texts in the catalogue
- fcf776ed test(29-06): abbreviation gate over the fr catalogue with a pending ratchet

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Files and both commits verified present.
