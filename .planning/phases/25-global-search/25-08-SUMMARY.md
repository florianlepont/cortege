---
phase: 25-global-search
plan: 08
subsystem: mobile-explorer
tags: [explorer, map, focus, maplibre, navigation]
requires: ["25-01", "25-03"]
provides:
  - "PublicMapFocus union (survey, place, parcel), each with a nonce"
  - "focusRegionFor, placeZoom, focusParcelIds, placeFocus, parcelFocus, PARCEL_FOCUS_SPAN_FACTOR (mobile/src/screens/public-map/focus-region.ts)"
  - "useExplorerFocus hook"
  - "PlacePinLayer and MapCanvas.placePin"
affects: [25-11, 25-12]
tech-stack:
  added: []
  patterns: ["focus consumed once per nonce", "pure region maths split from the screen to stay under the 400-line cap"]
key-files:
  created:
    - mobile/src/screens/public-map/focus-region.ts
    - mobile/src/screens/public-map/focus-region.test.ts
    - mobile/src/screens/public-map/useExplorerFocus.ts
    - mobile/src/screens/public-map/useExplorerFocus.test.ts
    - mobile/src/map/maplibre/PlacePinLayer.tsx
  modified:
    - mobile/src/navigation/types.ts
    - mobile/src/screens/PublicMapScreen.tsx
    - mobile/src/screens/public-map/MapCanvas.tsx
    - mobile/src/screens/public-map/PublicMapScreen.test.tsx
    - mobile/src/map/maplibre/layers.test.tsx
    - mobile/src/screens/survey-detail/SeeOnMapAction.tsx
    - mobile/src/screens/survey-detail/SeeOnMapAction.test.tsx
    - mobile/src/navigation/routes/routes.test.tsx
key-decisions:
  - "A parcel focus draws the parcel selected and opens nothing: since the Phase 24 owner check a tap on a studied parcel opens its latest survey page and no sheet exists (reconciles the UI-SPEC wording)"
  - "A place focus is centred exactly on the place (no south offset); only the survey kind keeps the 22 percent offset that clears the sheet"
  - "The pin clears on a later non-place focus or when useScreenFocus turns false (a screen pushed over Explorer counts as blur)"
metrics:
  tasks: 2
  files: 13
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 08: Explorer focus (place pin, parcel highlight) Summary

`PublicMapFocus` is now a union of survey, place and parcel; Explorer centres per kind (place at zoom 13/17/14, parcel framed with a 1.5 span margin or zoom 17 on the centroid), draws one static terracotta pin with a white ring for a place, and draws a found parcel selected, once per nonce. "Voir sur la carte" of a survey is unchanged (it now sends `kind: "survey"`).

## Tasks and commits

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Focus union, pure region maths and the survey call sites | a79b186a |
| 2 | Place pin layer and the Explorer focus hook | c85c8859 |

## What was built

- `navigation/types.ts`: the union, documented per kind; `SearchPlaceKind` type-imported from `@cortege/ibp-domain`.
- `focus-region.ts` (pure, 100 percent covered): `placeZoom`, `focusRegionFor` (survey branch moved verbatim from the screen; parcel span never below the zoom-18 span, T-25-21), `focusParcelIds`, `placeFocus(item, nonce)`, `parcelFocus(item, nonce)`.
- `useExplorerFocus({ focus, focusTo, setHighlightedId })` returns `{ initialRegion, highlightedParcelIds, placePin }`. The effect is keyed on `focus.nonce` only, so a reload re-render or a rebuilt focus object never replays it (T-25-22).
- `PlacePinLayer` (source `search-place`, circle layer `search-place-pin`, radius 8, `brandMapTokens.parcelSelected`, `brandColors.white` ring of 2), drawn after `ParcelPolygonsLayer` in `MapCanvas` (new optional `placePin` prop).
- `PublicMapScreen.tsx` is 302 lines (was 311); no search field or control added to Explorer (D-01).

## Notes for the next plans (25-11, 25-12)

- Build the navigation param with `placeFocus(item, Date.now())` / `parcelFocus(item, Date.now())` and navigate to `publicMap` > `publicMapHome` with `{ focus }`, exactly as `SeeOnMapAction` does.
- `PublicMapScreen.test.tsx` now mocks `../../ui/useScreenFocus` (returns true) and `PlacePinLayer` as host components; other screen tests that render `PublicMapScreen` for real without a navigator need the same mock because `useScreenFocus` imports `@react-navigation/native`.
- Because a screen pushed above Explorer's `publicMapHome` blurs it, the pin disappears when the user opens a survey from the map and is not restored on back (the "stays until Explorer loses focus" rule). The parcel highlight and the survey highlight are not affected.
- `PARCEL_FOCUS_SPAN_FACTOR = 1.5` is a first value; tune it at the owner check.

## Deviations from Plan

None. RED/GREEN was done within each task (tests written with the implementation, one `feat` commit per task, as in plan 25-01).

## Verification

- `npx jest` on `src/screens/public-map/focus-region.test.ts`, `SeeOnMapAction.test.tsx`, `PublicMapScreen.test.tsx`, `routes.test.tsx`: pass. Task 2 command (`src/map/maplibre src/screens/public-map SeeOnMapAction src/__checks__`) and `src/navigation`: 74 suites, 811 tests pass.
- `npm run test:coverage:mobile`: exit 0, 278 suites, 3525 tests; `PlacePinLayer.tsx`, `focus-region.ts`, `useExplorerFocus.ts` at 100 percent, thresholds hold.
- `npm run lint`, `npm run typecheck`: exit 0. Prettier check on the touched directories and files passes. Repo-wide `format:check` was not used (the known `.claude/settings.local.json` report).
- Acceptance greps hold: `kind: "place"`, `kind: "parcel"`, `kind: "survey"`, `<PlacePinLayer`, `useExplorerFocus(`, `PublicMapScreen.tsx` under 400 lines, 0 hex or `rgba(` literals in `PlacePinLayer.tsx`.
- Not run: `api/test/check-env-parity.spec.ts` (known bash 3.2 failure, out of scope).

## Known Stubs

None.

## Threat Flags

None. T-25-21 (clamped parcel span, bbox-less path tested) and T-25-22 (one-shot per nonce, reload-after-focus test) are mitigated.

## Self-Check: PASSED

- FOUND: focus-region.ts, focus-region.test.ts, useExplorerFocus.ts, useExplorerFocus.test.ts, PlacePinLayer.tsx
- FOUND commits: a79b186a, c85c8859
