---
phase: 32
plan: 32
subsystem: factor-pages-owner-feedback
tags: [surface-from-route, lower-class-count, ibp-domain, parity]
status: complete
key-files:
  created:
    - mobile/src/screens/factor-detail/SurfaceFromRouteRow.tsx
  modified:
    - packages/ibp-domain/src/rules/common.ts
    - packages/ibp-domain/src/rules/v3-0.ts
    - packages/ibp-domain/src/rules/v3-2.ts
    - packages/ibp-domain/src/index.ts
    - packages/ibp-domain/src/parity/cases.ts
    - mobile/src/hooks/useSurveyForm.ts
    - mobile/src/app/types.ts
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/factor-detail/renderValueFields.tsx
    - mobile/src/screens/factor-detail/DmhCountFields.tsx
    - mobile/src/screens/factor-detail/useRouteSurfacePrefill.ts
    - mobile/src/screens/factor-detail/CountingModeStrip.tsx
    - mobile/src/screens/survey-form/FactorsList.tsx
    - mobile/src/i18n/fr/factor-detail.ts
    - docs/technical/ibp-validation-matrix-v2.md
    - docs/specs/ibp-form-spec.md
    - CLAUDE.md
---

# Phase 32 Plan 32: surface from the route, lower class count only when needed

Owner feedback of 2026-10-30 on factors C, D, E (and F counted in full). Two changes: the surface the route already holds is no longer asked a second time, and the lower diameter counter (BMm, GB) is asked only when the score can depend on it.

## Rule check (owner reading confirmed)

The package rules agree with the owner. `scoreDensityV30` and `scoreDensityV32` read the lower class only when upper per hectare is under 1 (v3.0: lower alone, 0 or 1; v3.2: sum, 0 or 1). From 1 upper per hectare the score is 2 or 5 on the upper class alone. No stop was needed.

## Package changes (commit 8faddc7a)

- `readDensityPair` (rules/common.ts): a lower count that is not given at all (absent, null or blank string) is accepted when upper per hectare is at least 1, and reads as 0 (never looked at). Below 1, or a lower count present but not a number, stays unreadable (null, as before). Surface rules unchanged.
- New const `DENSITY_LOWER_UNREAD_FROM_PER_HA = 1`, used by both scorers (same arithmetic, `scoreDensityV30` written as one branch, behaviour identical) and by the reader.
- New `densityLowerCountNeeded(factor, raw)`, exported from the package entry: true while upper per hectare cannot be computed (no readable upper count or positive surface) or is under 1; false from 1. The form uses it; the threshold lives only in the package.
- Tests: `rules.test.ts`, `readers.test.ts` (updated three assertions that expected null/invalid for upper per hectare >= 1 without a lower count). Parity cases `MAT-LOW-01` to `MAT-LOW-05` (both versions, draft and submit, hand-computed totals 21/7/28, 19/7/26, 20/7/27; unreadable cases `factor_invalid_raw`). No existing case changed. Package coverage 100 percent; the same cases pass through the API adapter (`ibp-parity`, 120 tests) and the mobile adapter (132 tests).
- Readiness (`evaluateSubmitReadiness`) follows automatically (it is derived from scoring).

## Mobile changes (commits 1985000a, b9fa0b7b)

- `useSurveyForm`: C, D, E payload built through `readDensityPerHa` (package); a lower count already typed is stored in every case; the lower field is `required` only while `densityLowerCountNeeded`, otherwise `notNeeded: true` with no error when empty. New `FactorField.notNeeded`; `computeFactorProgress` leaves such a field out of the tile's progress. The key figure follows the package with no code change (shows per-hectare figure without a lower count from 1/ha).
- Surface: while `surface_ha` equals the route's zone (compared as the prefill writes it, two decimals), the "Surface" section is replaced by one read-only caption, "Surface décrite : 2,0 ha, d'après le parcours" (`SurfaceFromRouteRow`), for C, D, E and counted-in-full F (`DmhCountFields`). A different value, or no route surface, keeps the editable row as before. `useRouteSurfacePrefill` now also reports `fromRoute` on the first render (no one-frame flash of the row) and returns `zoneHa`. Per coordinator update of the same day, there is no "Modifier" action.
- Lower counter hidden in the capped mode while `notNeeded`; counted in full both counters always stay (without the required marker when not needed).
- Removed dead code: `FromRouteCaption` ("D'après le parcours" note under the row, never reachable now), its style and catalogue string.
- Catalogue: `countingMode.surfaceFromRoute`, pinned in `route-guide.test.ts`.
- Docs: matrix v2 (new section and `MAT-LOW-*` rows), form spec (C, D, E), CLAUDE.md.

## Deviations from Plan

- [Coordinator update] "Modifier" action and reveal state dropped after the first implementation (built, then removed before the commit that landed).
- [Rule 2] Removed `FromRouteCaption` and its catalogue string and style, which became unreachable.
- The hero card of C, D, E still reads "À calculer" while upper per hectare is under 1 and the lower count is not yet typed (unchanged: the package reads no density then).

## Verification

- `npm run typecheck`: pass. `npm --workspace mobile run lint`: clean.
- `npm --workspace mobile run test:unit:coverage`: 491 suites, 7772 tests pass; `src/navigation` 100 percent.
- `npm --workspace @cortege/ibp-domain run test:coverage`: 518 tests, 100 percent.
- `npm --workspace api run test:unit -- ibp-parity`: pass. The full API unit run fails only `check-env-parity.spec.ts` (bash 3.2 on this Mac, known).
- Prettier clean on touched ts/tsx files.
- Not verified on a device or simulator: the layout of the caption line and the hidden counter were checked in renderer tests only.

## Risks

- A stored payload of C, D, E may now lack `bmm_count`/`gb_count`. Server and mobile read it through the package, but any external reader of the raw payload (exports, the API contract doc) that assumes the key is present should tolerate it; the PDF export already skips missing values.
- Hiding the lower row in the capped mode while the typed upper count changes: a lower value typed earlier stays stored and reappears if the upper count falls back under 1 per hectare.
- No way left to edit a surface that equals the route's zone from the factor page (owner decision); the stored value can only differ if it was changed before, which keeps the editable row.

## Self-Check: PASSED
