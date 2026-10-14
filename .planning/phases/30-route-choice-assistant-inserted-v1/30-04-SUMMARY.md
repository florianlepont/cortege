---
phase: 30-route-choice-assistant-inserted-v1
plan: 04
subsystem: mobile
tags: [parcel-area, geodesic, surface-prefill, parcel-selection, offline]
requires: [30-02]
provides:
  - "ringAreaM2, polygonAreaM2 and parcelAreaHa: surface of the chosen parcels computed on the phone, offline, no geometry dependency"
  - "SurveyParcelSelectionScreen onSave(weatherPoint, surfaceHa): second argument for the route step prefill (plan 30-20)"
affects: [30-20]
key-files:
  created:
    - mobile/src/map/parcel-area.ts
    - mobile/src/map/parcel-area.test.ts
  modified:
    - mobile/src/screens/SurveyParcelSelectionScreen.tsx
    - mobile/src/screens/SurveyParcelSelectionScreen.test.tsx
decisions:
  - "Area formula of Chamberlain and Duquette (2007) on the WGS84 equatorial radius, iterating with wrap-around so a closed or an open ring gives the same area"
  - "parcelAreaHa returns null when no wanted parcel has geometry or the sum is 0, so the observer then types the surface (D-05, SEED-007)"
  - "ParcelSelectionRoute is left with its one-argument handler; plan 30-20 reads the second argument"
metrics:
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 04: Surface of the chosen parcels Summary

The phone now computes the surface of the chosen parcels from the geometry the selection screen already holds, and the parcel step hands it to `onSave` as a second argument so the route guide (30-20) can prefill its stand surface question. A cadastral parcel is not a stand, so the value stays an editable estimate. Nothing changes for the creation and edit flows until 30-20 reads it.

## What was built

- `mobile/src/map/parcel-area.ts` (pure, no React Native import): `ringAreaM2` (spherical polygon area, absolute value, rings under 3 points give 0), `polygonAreaM2` (outer ring minus holes, clamped at 0), `parcelAreaHa` (sums every polygon of every wanted parcel through `parcelPolygonsFrom`, MultiPolygon included, ids matched without regard to case, hectares, null when there is no geometry or the sum is 0). No `@turf/*` dependency.
- `mobile/src/screens/SurveyParcelSelectionScreen.tsx`: `onSave` type is now `(weatherPoint, surfaceHa) => Promise<void>`, called with `cachedParcelCentre(...)` and `parcelAreaHa(...)` of the same statuses and ids. The file is 359 lines (cap 400).

## Verification

- `parcel-area.test.ts`: 16 tests, 100 % statements, branches, functions and lines on `parcel-area.ts`. A 100 m square at latitude 46 gives 1 ha within 1 %; winding order, open rings, holes, MultiPolygon, case-insensitive ids, null cases are covered.
- `SurveyParcelSelectionScreen.test.tsx`, `src/navigation` and `src/__checks__`: 26 suites, 417 tests pass. New case: two chosen parcels give their summed surface as the second argument; the no-geometry case now expects `onSave(null, null)`.
- `npm run lint` and `npm run typecheck` exit 0; `npx tsc --noEmit -p .` in `mobile` passes; Prettier is clean on the touched files.
- `mobile/src/hooks/useSurveySync.ts` is unchanged against the merge base with `origin/main`; `grep -c "@turf" mobile/package.json` prints 0; precondition (`api/migrations/024_private_or_public_visibility.sql`) holds.

## Deviations from Plan

None. The existing test case asserting `toHaveBeenCalledWith(null)` was updated to `(null, null)`, which the plan's behaviour list requires ("saving with no loaded geometry calls `onSave(null, null)`").

## Threat model

T-30-08 mitigated (rings under 3 points give 0, holes clamped, null when the sum is 0). T-30-09 accepted (linear in the vertex count, run once on save).

## Known Stubs

None.

## Commits

- 2b9dde96: feat(30-04): geodesic area of the chosen parcels on the phone
- 1269f2b2: feat(30-04): parcel step passes the surface of the chosen parcels to onSave

## Self-Check: PASSED

Created files exist (`parcel-area.ts`, `parcel-area.test.ts`, this summary); both commits are on `claude/amazing-benz-d223f1`.
