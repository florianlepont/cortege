---
phase: 30-route-choice-assistant-inserted-v1
plan: 15
subsystem: mobile-factor-screens
tags: [factor-detail, pager, route, uncapped, surface-prefill, d-07]
requires: [30-08, 30-11]
provides:
  - "CountingModeChip, CountingModeCaption, FromRouteCaption (mobile/src/screens/factor-detail/CountingModeStrip.tsx)"
  - "useRouteSurfacePrefill and formatSurfaceForField (mobile/src/screens/factor-detail/useRouteSurfacePrefill.ts), reusable by 30-19 for F's own surface"
  - "FactorDetailRoute reads the recorded route with useSurveyRoute and passes uncappedFactors and zoneSurfaceHa to FactorPager"
  - "optional props uncappedFactors and zoneSurfaceHa on FactorPager and FactorDetailScreen; uncappedFactors on FactorsList; countedInFull on FactorTile"
affects: [30-19]
key-files:
  created:
    - mobile/src/screens/factor-detail/CountingModeStrip.tsx
    - mobile/src/screens/factor-detail/CountingModeStrip.test.tsx
    - mobile/src/screens/factor-detail/useRouteSurfacePrefill.ts
    - mobile/src/screens/factor-detail/useRouteSurfacePrefill.test.ts
  modified:
    - mobile/src/navigation/routes/FactorDetailRoute.tsx
    - mobile/src/navigation/routes/FactorDetailRoute.test.tsx
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/FactorDetailScreen.test.tsx
    - mobile/src/screens/survey-form/FactorPager.tsx
    - mobile/src/screens/survey-form/FactorPager.test.tsx
    - mobile/src/screens/survey-form/FactorsList.tsx
    - mobile/src/screens/survey-form/FactorsList.test.tsx
    - mobile/src/screens/survey-form/factors.styles.ts
decisions:
  - "The prefill is per mount of the factor page: it writes once into an empty field, and the moment the field holds any value (observer's or prefill's) the hook is done, so a value typed then cleared is not refilled while the page stays open. Re-opening the page with an empty field prefills again"
  - "The prefilled text is the zone with a decimal comma and no grouping (formatSurfaceForField), not formatHectares, because the thin space of formatHectares would not parse back through parseFiniteNumberInput"
  - "The prefill applies to C, D, E whatever the counting mode (spec section 7: the three surface fields start from the surface décrite), the badge, tag and caption only to the factors counted in full"
metrics:
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 15: Counting mode signals and surface prefill Summary

A factor the recorded route counts in full now says so where it matters, in the method's word "Relevé déplafonné", and the surface field of C, D and E starts from the route's surface décrite.

## What was built

- **CountingModeStrip.tsx**: `CountingModeChip` (an `AppChoiceChip variant="status" tone="neutral"` in a host `View` with testID `counting-chip`, non-interactive), `CountingModeCaption` (one row, `trail-sign-outline` 18 in the secondary ink, the sentence of `fr.factorDetail.countingMode[factor]`, one accessibility element, glyph hidden; nothing for H) and `FromRouteCaption` ("D'après le parcours").
- **useRouteSurfacePrefill.ts**: writes the zone once into an empty surface field, never over a value, and returns `fromRoute` while the parsed field value equals the zone (T-30-36).
- **FactorDetailRoute**: `useSurveyRoute(survey)`; `uncappedFactors` is the record's list only when `counting` is `uncapped` (else a stable empty list), `zoneSurfaceHa` the record's zone or null. A survey without a valid route (read through `readSurveyRoute`, null when invalid) gives nothing new (T-30-35).
- **FactorPager**: the badge under the title row (the header grows only on those factors), props passed through to `FactorDetailScreen`.
- **FactorDetailScreen**: the caption at the top of the input card, the prefill for C, D, E and "D'après le parcours" under their surface field.
- **FactorsList / FactorTile**: a one-line, tail-truncated "Relevé déplafonné" tag on tiles of factors counted in full.

## Line counts (cap 400)

| File | Lines |
|------|-------|
| mobile/src/screens/survey-form/FactorPager.tsx | 371 (was 355) |
| mobile/src/screens/FactorDetailScreen.tsx | 362 (was 322) |
| mobile/src/screens/survey-form/FactorsList.tsx | 185 (was 166) |
| mobile/src/navigation/routes/FactorDetailRoute.tsx | 140 (was 119) |

## Deviations from Plan

### Minimal adjustments

**1. [Rule 3 - Repo state] The factor list tag sits on its own line in the tile, not before the progress ring**
- **Found during:** Task 2
- **Issue:** `FactorTile` is a three-column tile (about 30 % wide) whose top row already holds the letter badge, the factor icon and the ring: a 12 pt "Relevé déplafonné" tag there would be truncated to a few letters.
- **Fix:** the tag is a one-line (`numberOfLines={1}`, tail ellipsis) line between the tile title and the progress line, same 12 SemiBold secondary style. Still shown only on factors counted in full.
- **Files modified:** mobile/src/screens/survey-form/FactorsList.tsx, mobile/src/screens/survey-form/factors.styles.ts

**2. [Rule 3 - Repo state] FactorPager does not pass props to FactorsList**
- **Issue:** `FactorPager` does not render `FactorsList` (it only imports `computeFactorProgress`), and the `FactorsList` component of `survey-form/` has no production caller (the Score page uses `survey-detail/FactorsList`). 
- **Fix:** `FactorsList` and `FactorTile` accept `uncappedFactors` and `countedInFull` (tested), the pager passes the props to `FactorDetailScreen` only.

**3. Badge placement:** the plan truth says "in the pager title row", the action and UI-SPEC section 11 say under the title row and the total. Followed the action and UI-SPEC (inside the header, below the row), so a narrow phone keeps its full factor name.

**4. No truncation prop on the badge:** `AppChoiceChip variant="status"` has no `numberOfLines` and the label is short; the host `View` is `alignSelf: flex-start`. Not changed to avoid touching a shared primitive.

## Deferred / notes

- The Score page's own factor list (`screens/survey-detail/FactorsList.tsx`) does not show the tag; the plan did not list it and the spec's "liste des facteurs" is satisfied by the survey-form list. Worth a decision if the owner wants it there too.
- The prefill is per mount (see decisions): an observer who clears the field and re-opens the page gets the zone again.

## Verification

- `cd mobile && npx jest -c jest.unit.config.js`: 421 suites, 6237 tests passed
- `npm run lint`, `npm run typecheck`: clean; Prettier check on changed files clean
- `git diff a6c5dd72 -- mobile/src/hooks/useSurveySync.ts`: empty
- STATE.md, ROADMAP.md, REQUIREMENTS.md not touched

## Known Stubs

None.

## Self-Check: PASSED
