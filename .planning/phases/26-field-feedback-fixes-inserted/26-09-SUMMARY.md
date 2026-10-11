---
phase: 26-field-feedback-fixes-inserted
plan: 09
subsystem: mobile-i18n
tags: [abbreviations, catalogue, explorer, gate]

requires:
  - phase: 26-field-feedback-fixes-inserted
    provides: "26-06 abbreviation gate with the PENDING_REWRITE ratchet and fr.abbreviations registry; 26-07 IBP info sheet"
provides:
  - Catalogue free of unexplained abbreviations (factor texts, PDF identity and source, legend attribution, licence text, journal subtitle)
  - Region names (not raw codes) in the Explorer cluster list
  - Abbreviation gate asserting an empty list (ratchet removed)
affects: [26-10]

tech-stack:
  added: []
  patterns:
    - "Short form defined once in the factor intro, then used in threshold lines of the same file (gate accepts the long form anywhere in the file)"

key-files:
  created: []
  modified:
    - mobile/src/i18n/fr/ibp-method.ts
    - mobile/src/i18n/fr/labels.ts
    - mobile/src/i18n/fr/factor-detail.ts
    - mobile/src/i18n/fr/validation.ts
    - mobile/src/i18n/fr/survey-export.ts
    - mobile/src/i18n/fr/survey-export.test.ts
    - mobile/src/i18n/fr/survey-detail.ts
    - mobile/src/i18n/fr/public-map.ts
    - mobile/src/i18n/fr/account.ts
    - mobile/src/i18n/fr/abbreviations.ts
    - mobile/src/screens/public-map/ClusterListSheet.tsx
    - mobile/src/screens/public-map/ClusterListSheet.test.tsx
    - mobile/src/screens/public-map/PublicMapScreen.test.tsx
    - mobile/src/screens/public-map/markers.test.tsx
    - mobile/src/__checks__/abbreviations.test.ts

key-decisions:
  - "Decision D-04: BMg, BMm, TGB and GB are defined in the factor intros and field labels; IGN, WGS 84, Creative Commons written out; INSEE becomes 'code officiel géographique'; S0/S1/S2/S5 become bare points; JSON and the P/G and C sub-score entries are gone; snake_case identifiers in v3.0 hints are replaced by the form's labels"
  - "Decision D-05: the real scan asserts expect(unexplained).toEqual([]); the PENDING_REWRITE constant is deleted"
  - "Decision D-11: allowlist unchanged (units, OK, PDF, GPS, ex.); IBP unchanged"
  - "The registry term dmh was removed from POLICY and fr.abbreviations.terms together, because every string now writes dendromicrohabitats out (findUnusedTerms would otherwise fail)"

patterns-established:
  - "Region shown through fr.labels.regions with an explicit ACA/M guard; an unknown code shows an empty string"

requirements-completed: [D-04, D-05, D-11]

coverage:
  - id: D1
    description: "No unexplained abbreviation in the fr catalogue; registry has no unused term"
    requirement: D-05
    verification:
      - kind: unit
        ref: "mobile/src/__checks__/abbreviations.test.ts (real scan equals [])"
        status: pass
    human_judgment: false
  - id: D2
    description: "ClusterListSheet shows the region name for ACA and M, nothing for an unknown code, the cas for a v3.2 survey with a cas"
    requirement: D-04
    verification:
      - kind: unit
        ref: "mobile/src/screens/public-map/ClusterListSheet.test.tsx, markers.test.tsx, PublicMapScreen.test.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "Longer PDF source and coordinates lines still paginate and print in the A4 blocks"
    requirement: D-04
    verification:
      - kind: unit
        ref: "mobile/src/app/survey-pdf suites (pagination and map block) pass"
        status: pass
      - kind: manual
        ref: "PDF re-checked on the simulator in plan 26-10"
        status: pending
    human_judgment: true

duration: 25min
completed: 2026-10-11
status: complete
---

# Phase 26 Plan 09: Abbreviations written out Summary

**The French catalogue now defines or writes out every abbreviation (BMg/BMm/TGB/GB, IGN, WGS 84, INSEE, Creative Commons), shows region names instead of ACA/M in the Explorer cluster list, and the 26-06 gate asserts an empty list with no ratchet left.**

## Accomplishments

- Re-ran the real scan first: it matched the 38 frozen `PENDING_REWRITE` findings of plan 26-06 exactly, so plans 26-07 and 26-08 introduced no new finding. Nothing to reconcile.
- Factor texts (`ibp-method.ts`, `labels.ts`): intros of factors C, D and E define "bois morts de grosse dimension (BMg)", "bois morts de dimension moyenne (BMm)", "très gros bois (TGB)" and "gros bois (GB)" before the threshold lines use the short forms. Score classes S0/S1/S2/S5 are bare points ("= 0", "= 5", "plafonné à 2 points"), as in the PDF scale lines. The v3.0 hints no longer leak `bmg_count`, `surface_ha`, `class_score`, `type_count`...; they name the fields the form shows. "dmh" is written "dendromicrohabitats".
- Field labels (`factor-detail.ts`, `validation.ts`): "Nombre de bois morts de grosse dimension (BMg)", "... de dimension moyenne (BMm)", "Nombre de très gros bois (TGB)", "Nombre de gros bois (GB)". Object keys unchanged.
- PDF (`survey-export.ts`): coordinates read "(WGS 84, système géodésique mondial)", commune is "Commune (code officiel géographique)", map source names the Institut national de l'information géographique et forestière (IGN).
- Other strings: legend attribution keeps the "©" credit and writes the IGN name out (T-26-20); photo credits name "Creative Commons CC0 1.0 ou CC BY 4.0"; journal subtitle "Type et contenu de chaque événement."; unused `metric.standScore` and `metric.contextScore` deleted (the only other `standScore`/`contextScore` hits are unrelated local parameters).
- `ClusterListSheet.surveyPlaceLabel` returns `fr.labels.regions[code]` for ACA and M and "" otherwise; a v3.2 survey with a cas still shows "Cas N" (T-26-21).
- Gate: `PENDING_REWRITE` deleted, assertion is `expect(unexplained).toEqual([])`.

## Task Commits

1. Task 1: factor texts, field labels, dmh registry removal - `53ca67ac`
2. Task 2: remaining strings, cluster list region names, gate at zero - `4532161a`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tests used fake region codes**
- **Found during:** Task 2
- **Issue:** `PublicMapScreen.test.tsx`, `markers.test.tsx` and `ClusterListSheet.test.tsx` used region codes "ARA" and "BFC" that never exist in the data (real codes are ACA and M) and asserted the raw code on screen, which is exactly the behaviour being removed.
- **Fix:** fixtures use "ACA" and "M"; assertions use `fr.labels.regions`.
- **Files modified:** the three test files above
- **Commit:** `4532161a`

**2. [Rule 3 - Blocking] `dmh` registry entry became unused**
- **Found during:** Task 1
- **Issue:** after writing "dendromicrohabitats" out, `findUnusedTerms` failed on `dmh` (anticipated by the plan).
- **Fix:** removed `dmh` from POLICY and from `fr.abbreviations.terms` together.
- **Commit:** `53ca67ac`

## Known Stubs

None.

## Threat Flags

None. T-26-20 mitigated (the "©" credit and provider name stay in the legend and the PDF source), T-26-21 mitigated (region mapped through the catalogue, unknown code shows nothing, tested).

## Issues Encountered

- Not touched, outside the catalogue gate: MapLibre style attribution strings "Source : IGN" in `map/offline-styles.ts`, `map/maplibre/styles.ts` and `CadastreLayer.tsx`. They are style metadata (the map attribution control is off: `attribution={false}`), not catalogue text.
- `npm run test:unit` at the root reports 34 failures in `api/test/check-env-parity.spec.ts`; no API file was touched by this plan, the mobile, domain and API-other suites pass. Logged as unrelated.
- `npm run format:check` reports only the untracked local `.claude/settings.local.json` (not touched).
- `npm run lint`, `npm run typecheck`, the plan's jest targets and `npm --workspace mobile run test:unit:coverage` (325 suites, 4356 tests, floors hold) pass.
- The PDF has longer source and coordinates lines; unit suites for `src/app/survey-pdf` pass and the visual check is done on the simulator in plan 26-10.

## Next Phase Readiness

Plan 26-10 can re-check the PDF page layout and the Explorer cluster list on a device.

## Self-Check: PASSED

- FOUND: mobile/src/__checks__/abbreviations.test.ts (contains `expect(unexplained).toEqual([])`), mobile/src/screens/public-map/ClusterListSheet.tsx (contains `fr.labels.regions`)
- FOUND commits: 53ca67ac, 4532161a
