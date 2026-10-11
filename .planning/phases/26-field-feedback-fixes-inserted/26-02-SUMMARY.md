---
phase: 26-field-feedback-fixes-inserted
plan: 02
subsystem: mobile-ui
tags: [genus, sorting, i18n, pdf, factor-a]

requires:
  - phase: 26-01
    provides: decision D-07 pinned (recognition keeps confidence order)
provides:
  - shared Latin, accent-insensitive genus comparator (genus-order.ts)
  - fr.genus.latinLabel ("Abies (Sapin)")
  - Factor A picker chips in Latin order with Latin-first labels
  - PDF Factor A genus list in Latin order with the same label
affects: [26-10]

tech-stack:
  added: []
  patterns:
    - "Display-only sort: sort a copy at render or print time, never the package constant, the manifest or the stored array"

key-files:
  created:
    - mobile/src/app/genus-order.ts
    - mobile/src/app/genus-order.test.ts
  modified:
    - mobile/src/i18n/fr/genus.ts
    - mobile/src/ui/FactorGenusListInput.tsx
    - mobile/src/ui/FactorGenusListInput.test.tsx
    - mobile/src/app/survey-pdf/factor-fields.ts
    - mobile/src/app/survey-pdf/factor-fields.test.ts
    - mobile/src/app/survey-pdf/factor-section.test.ts

key-decisions:
  - "Decision D-06: sort key is foldSearchText of the Latin code, compared by Intl.Collator('fr', base) with a plain-compare fallback when Intl is missing"
  - "Decision D-10: chip and PDF label is 'Latin (French)'; the PDF previously printed 'French (Latin)', now unified"
  - "Decision D-07 untouched: GenusRecognitionModal not modified"

patterns-established:
  - "sortGenusCodes(codes) returns a new array; ORDERED_GENUS_CODES computed once at module level in the picker"

requirements-completed: [D-06, D-07, D-10]

coverage:
  - id: D1
    description: "Genus codes sort by folded Latin name, supplementary genera interleaved, input and package constant not mutated"
    requirement: D-06
    verification:
      - kind: unit
        ref: "mobile/src/app/genus-order.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Picker chips in Latin order with 'Latin (French)' labels; selection keeps click order in the stored value"
    requirement: D-10
    verification:
      - kind: unit
        ref: "mobile/src/ui/FactorGenusListInput.test.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "PDF Factor A genus items in Latin order with the same label; counted logic unchanged"
    requirement: D-06
    verification:
      - kind: unit
        ref: "mobile/src/app/survey-pdf/factor-fields.test.ts; factor-section.test.ts"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-10-10
status: complete
---

# Phase 26 Plan 02: Latin genus order Summary

**The Factor A genus picker and the PDF genus list now show genera in accent-insensitive Latin order with "Latin (French)" labels, while the stored `factors.A.genera` order, the package constant and recognition suggestions are unchanged.**

## Accomplishments

- `mobile/src/app/genus-order.ts`: `genusSortKey`, `createGenusComparator`, `compareGenusCodes`, `sortGenusCodes`. Ceratonia lands between Celtis and Cercis, Quercus deciduae before Quercus sempervirens, 34 codes strictly ascending, Abies first and Ulmus last.
- `fr.genus.latinLabel(code)` builds "Abies (Sapin)" and "Quercus deciduae (Chêne à feuilles caduques)", falling back to the Latin name alone.
- `FactorGenusListInput`: module-level `ORDERED_GENUS_CODES`, chips labelled with `latinLabel`; toggling still appends in click order.
- PDF `factorA` collects the valid unique codes, then prints them through `sortGenusCodes` with the same label.

## Task Commits

1. Task 1: shared Latin comparator and Latin-first label - `af15c618`
2. Task 2: picker chips and PDF genus list in Latin order - `863e9b9a` (also carries a Prettier line-wrap fix to `genus-order.ts` from Task 1)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extra PDF test file needed the new label**
- **Found during:** Task 2
- **Issue:** `survey-pdf/factor-section.test.ts` asserted the old "Hêtre (Fagus)" text (the plan anticipated this).
- **Fix:** Updated the two assertions to "Fagus (Hêtre)".
- **Commit:** `863e9b9a`

**2. [Rule 1 - Formatting] Prettier on genus-order.ts**
- Task 1 was committed before the format check; the wrap fix went into the Task 2 commit.

## Known Stubs

None.

## Threat Flags

None. T-26-05 mitigated: the sort works on a copy at render and print time; tests assert the package constant's first and last codes and the click-order value from a toggle. T-26-06: labels still pass the PDF builder's single `escapeHtml`.

## Issues Encountered

- `npm run format:check` reports only the untracked local `.claude/settings.local.json` (out of scope, not touched).
- Verification: full mobile unit suite (318 suites, 4266 tests), `npm run lint` and `npm run typecheck` pass.

## Next Phase Readiness

Nothing blocks the remaining plans. The visual check of the picker on a device belongs with the phase device checks.

## Self-Check: PASSED

- FOUND: mobile/src/app/genus-order.ts, mobile/src/app/genus-order.test.ts
- FOUND commits: af15c618, 863e9b9a
