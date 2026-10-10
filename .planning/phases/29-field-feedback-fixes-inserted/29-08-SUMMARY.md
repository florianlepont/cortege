---
phase: 29-field-feedback-fixes-inserted
plan: 08
subsystem: mobile-map
tags: [explorer, offline, own-surveys, navigation, hooks]

requires:
  - phase: 29-field-feedback-fixes-inserted
    provides: "29-04 listLocalSurveyMapSources and map/own-surveys.ts; 29-03 offline-aware community routes"
provides:
  - useLocalSurveyMapData and LocalSurveyMapData (hooks/useLocalSurveyMapData.ts), route-level and focus-gated
  - PublicMapRoute merge of local own items with API items, dedup by survey id, local-id routing
  - PublicMapScreen ownItems prop (normal markers, counted by the pill)
affects: [29-10]

tech-stack:
  added: []
  patterns:
    - "Route-level async hook with a cancelled flag, gated by useScreenFocus, reloaded by the surveys list identity and the offline flag"

key-files:
  created:
    - mobile/src/hooks/useLocalSurveyMapData.ts
    - mobile/src/hooks/useLocalSurveyMapData.test.ts
  modified:
    - mobile/src/navigation/routes/PublicMapRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/screens/PublicMapScreen.tsx
    - mobile/src/screens/public-map/PublicMapScreen.test.tsx
    - mobile/src/state/render-counts.test.tsx
  deleted:
    - mobile/src/map/own-drafts.ts
    - mobile/src/map/own-drafts.test.ts

key-decisions:
  - "Decision D-01: the Explorer draws every own survey the phone holds (draft dashed, submitted normal) from local data; an id already returned by the API is drawn once (publishedIds), other members' markers stay online only"
  - "Decision D-09: positions come from the plan 29-04 builder (in-memory server position, else the centre of the cached parcel geometry); a survey outside every downloaded area is not drawn"
  - "Decision D-02: no stale marking added; the count pill counts the own markers and the existing 'Hors connexion' badge is the only offline signal"
  - "Behaviour change (deliberate): any id of surveys.surveys opens the owner's surveys/surveyDetail, so an own survey's marker now opens the owner's detail even when the marker comes from the API online (it used to open the community page)"

patterns-established:
  - "Own-survey routing by membership in the local survey list (localIds), not by which source drew the marker"

requirements-completed: [D-01, D-02, D-09]

coverage:
  - id: D1
    description: "useLocalSurveyMapData resolves sources and distinct cached parcels, reloads on list identity or offline flip, does nothing while unfocused, survives a rejected read and an unmount"
    requirement: D-01
    verification:
      - kind: unit
        ref: "mobile/src/hooks/useLocalSurveyMapData.test.ts (100 % on the file)"
        status: pass
    human_judgment: false
  - id: D2
    description: "PublicMapRoute passes drafts and submitted surveys separately, drops an API-returned id from ownItems, routes local ids to surveyDetail and others to communitySurvey"
    requirement: D-01
    verification:
      - kind: unit
        ref: "mobile/src/navigation/routes/routes.test.tsx (PublicMapRoute, 100 % on the file)"
        status: pass
    human_judgment: false
  - id: D3
    description: "PublicMapScreen draws an own item with the normal marker, opens it, and offline counts it with only the offline badge as signal"
    requirement: D-02
    verification:
      - kind: unit
        ref: "mobile/src/screens/public-map/PublicMapScreen.test.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: "After a force quit in airplane mode the Explorer shows the own surveys of downloaded areas"
    requirement: D-01
    verification:
      - kind: manual
        ref: "device checks DC-D-04 and DC-D-05, run on the Android emulator in plan 29-10"
        status: pending
    human_judgment: true

duration: 25min
completed: 2026-10-10
status: complete
---

# Phase 29 Plan 08: Explorer own surveys from local data Summary

**Explorer now reads the owner's surveys from SQLite through a route-level, focus-gated hook, draws drafts dashed and submitted surveys normally beside the API markers without duplicates, and opens any survey the phone holds as the owner's own detail; the old draft-only builder is gone.**

## Accomplishments

- `useLocalSurveyMapData(surveys, isOffline)` loads `listLocalSurveyMapSources()` and the cached parcels of the distinct normalised parcel ids (`getCachedParcelById`), returns an empty value before the first load, keeps the previous data on a failed read (logged through `logStatusDetail("ownSurveyMap.load", error)`), ignores a late result after unmount, and never runs while Explorer is unfocused. It is not called inside `useSurveySync`; `useSurveySync.ts` and `AppStateProvider.tsx` are untouched.
- `PublicMapRoute` merges through `ownSurveyMapItems` with `publishedIds` from the API items, passes `draftItems={ownMap.drafts}` and `ownItems={ownMap.own}`, and routes by membership in the local survey list.
- `PublicMapScreen` takes `ownItems` and builds `mapItems` as `[...items, ...draftItems, ...ownItems]`; the count pill and the offline badge are unchanged (D-02).
- `map/own-drafts.ts` and its test are deleted (replaced by `map/own-surveys.ts` from 29-04).

## Task Commits

1. Task 1: route-level hook loading local survey rows and cached parcels - `bba2f231`
2. Task 2: merge, `ownItems`, owner routing, old builder removed - `e4985a53`

## Behaviour change to note

An own survey's marker now opens the owner's detail (`surveys` / `surveyDetail`) whenever its id is in the local survey list, including when the marker comes from the API online. Before, only drafts did; a submitted own survey drawn from the API opened the read-only community page. This is deliberate (research Pitfall 2: offline an own marker must never reach the community page, and the owner expects his own page). Other ids still open `communitySurvey`. Mitigates T-29-18: only ids of `surveys.surveys` reach the owner-only detail.

## Deviations from Plan

None - plan executed as written. The RED step was not run separately (tests and code written together, green on the first run, apart from an `await unmount()` fix in the hook test to avoid overlapping `act()` warnings).

## Known Stubs

None.

## Threat Flags

None. T-29-17 mitigated (only the owner-gated `local_surveys` rows are read, API markers are never persisted), T-29-18 mitigated (local-id routing, tested), T-29-19 mitigated (loads gated by `useScreenFocus()`).

## Issues Encountered

- `npm run format:check` reports only the untracked local `.claude/settings.local.json` (out of scope, not touched).
- Verification: `npm run lint`, `npm run typecheck`, the plan's jest targets and the full mobile unit suite with coverage (325 suites, 4354 tests, floors hold) pass. `useLocalSurveyMapData.ts`, `own-surveys.ts` and `PublicMapRoute.tsx` are at 100 %.
- The airplane-mode-after-force-quit check (DC-D-04, DC-D-05) is left to plan 29-10 on the Android emulator.

## Next Phase Readiness

Plan 29-10 can run the device checks for the offline Explorer.

## Self-Check: PASSED

- FOUND: mobile/src/hooks/useLocalSurveyMapData.ts, mobile/src/hooks/useLocalSurveyMapData.test.ts
- MISSING as intended: mobile/src/map/own-drafts.ts, mobile/src/map/own-drafts.test.ts
- FOUND commits: bba2f231, e4985a53
