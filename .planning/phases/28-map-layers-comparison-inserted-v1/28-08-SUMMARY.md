---
phase: 28-map-layers-comparison-inserted-v1
plan: 08
subsystem: mobile-settings
tags: [map, offline, settings, action-sheet]
requires: ["28-02", "28-03", "28-04"]
provides:
  - "Paramètres > Cartes row 'Couches hors ligne' (key offline-layers), section footer and AppActionSheet with both weights"
  - "SettingsScreen props offlineLayersPolicy, onChangeOfflineLayersPolicy, offlineLayersBytes"
  - "AppGroupedList nav rows accept accessibilityHint"
affects: ["28-10", "28-15"]
tech-stack:
  added: []
  patterns:
    - "weights shown in the sheet come from referenceAreaBytes (estimator), computed once in the route"
key-files:
  created: []
  modified:
    - mobile/src/screens/SettingsScreen.tsx
    - mobile/src/screens/SettingsScreen.test.tsx
    - mobile/src/ui/AppGroupedList.tsx
    - mobile/src/ui/AppGroupedList.test.tsx
    - mobile/src/navigation/routes/SettingsRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/state/render-counts.test.tsx
decisions:
  - "The accessibility hint was a one-line passthrough in AppGroupedList (the pressable already forwards rest props), so policy.rowHint is wired"
  - "The action sheet is mounted only when offline maps are enabled, same gate as the row"
metrics:
  duration: "about 15 minutes"
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 08: Offline layers setting in Paramètres Summary

Paramètres > Cartes now holds the "Couches hors ligne" row under "Cartes hors ligne": it shows the current level and opens an action sheet with the 4 km by 4 km message and both options labelled with the estimator's weights; the choice persists through `useOfflineLayersPolicy`.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Policy row, footer and action sheet in SettingsScreen | bccc5f63 | `SettingsScreen.tsx` (+ test), `AppGroupedList.tsx` (+ test) |
| 2 | Wire the policy and reference estimates in SettingsRoute | 0bea863f | `SettingsRoute.tsx`, `routes.test.tsx` |
| - | Harness fix (see deviations) | 6230293c | `state/render-counts.test.tsx` |

## What was built

- `SettingsScreen`: row `offline-layers` (icon `layers-outline`, value "Toutes les couches" or "Fonds de carte seulement", a11y label and hint from `fr.mapLayers.policy`), section `footer` = `policy.footer`, and `AppActionSheet` (title, message, two options with `download.megabytes(bytes)`, cancel). Choosing the current level does nothing; the other one calls `feedback.selection()` then `onChangeOfflineLayersPolicy`. Row, footer and sheet render only when `isOfflineMapsEnabled()`. File is 261 lines (cap 400).
- `AppGroupedList`: optional `accessibilityHint` on nav rows, passed to the pressable (tested).
- `SettingsRoute`: `useOfflineLayersPolicy()` plus `useMemo` of `{ all: referenceAreaBytes("all"), base: referenceAreaBytes("base") }`; no figure is typed anywhere.

## Verification

- `jest SettingsScreen.test.tsx src/ui src/__checks__`: 55 suites, 547 tests pass.
- `jest src/navigation SettingsScreen.test.tsx`: 15 suites, 278 tests pass.
- `npm run lint`, `npm run typecheck`: exit 0. `npm run format:check`: only the untracked local `.claude/settings.local.json` warns (out of scope, same as 28-02/28-03).
- `npm --workspace mobile run test:unit`: after the harness fix, the only failure seen was `render-counts` (fixed); other suites passed (338/339 before the fix).

## Deviations from Plan

**1. [Rule 3 - Blocking] Mocked the policy hook in the render-count harness**
- **Found during:** full mobile unit run after Task 2
- **Issue:** `src/state/render-counts.test.tsx` renders the real `SettingsRoute`; the new hook calls `getDb`, which that harness deliberately forbids, so `initialMount` failed.
- **Fix:** added a stable `jest.mock("../hooks/useOfflineLayersPolicy")` there (test only, 5 lines).
- **Files modified:** `mobile/src/state/render-counts.test.tsx`
- **Commit:** 6230293c

**2. Extra test file touched:** `AppGroupedList.test.tsx` gained one case for the hint passthrough (not listed in the plan's `files_modified`).

## Known Stubs

None.

## Threat Flags

None. Only the two fixed options can be chosen (T-28-20); each shows its weight and the message states it applies to future downloads (T-28-21).

## Self-Check: PASSED

Commits bccc5f63, 0bea863f, 6230293c exist on the branch; all modified files present; STATE.md and ROADMAP.md untouched; Phase 27 files untouched.
