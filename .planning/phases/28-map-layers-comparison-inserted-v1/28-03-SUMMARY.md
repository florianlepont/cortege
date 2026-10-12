---
phase: 28-map-layers-comparison-inserted-v1
plan: 03
subsystem: mobile-storage
tags: [map, offline, local_meta, settings, action-sheet]
requires: []
provides:
  - "mobile/src/storage/offline-layers-policy.ts: OFFLINE_LAYERS_POLICY_KEY, DEFAULT_OFFLINE_LAYERS_POLICY, OfflineLayersPolicy, isOfflineLayersPolicy, loadOfflineLayersPolicy, saveOfflineLayersPolicy"
  - "mobile/src/hooks/useOfflineLayersPolicy.ts: useOfflineLayersPolicy() -> { policy, setPolicy, reload }"
  - "AppActionSheet optional message prop (iOS system message, Android footnote line)"
affects:
  - "28-08 (Parametres row), 28-10 (download hook and survey prompt), 28-15 (download card estimate)"
tech-stack:
  added: []
  patterns:
    - "device preference in local_meta, same upsert as map-preference.ts, not cleared by clearLocalIbpData"
    - "tabs stay mounted, so a preference hook re-reads on focus through useScreenFocus"
key-files:
  created:
    - mobile/src/storage/offline-layers-policy.ts
    - mobile/src/storage/offline-layers-policy.sqlite.test.ts
    - mobile/src/hooks/useOfflineLayersPolicy.ts
    - mobile/src/hooks/useOfflineLayersPolicy.test.ts
  modified:
    - mobile/src/ui/AppActionSheet.tsx
    - mobile/src/ui/AppActionSheet.test.tsx
decisions:
  - "Policy lives in local_meta key offline_layers_policy, values base or all, default all; SQLite user_version stays 5"
  - "The hook loads once on mount whatever the focus, then again each time focus turns true (no double load at mount)"
metrics:
  duration: "about 20 minutes"
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 03: Offline layers policy and action sheet message Summary

The two-level offline policy ("base" or "all", default "all") is persisted in `local_meta` and exposed as a focus-reloaded hook, and `AppActionSheet` gained an optional `message` line for the Paramètres choice.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Policy storage in local_meta and its hook | 2909aeec | `storage/offline-layers-policy.ts` (+ sqlite test), `hooks/useOfflineLayersPolicy.ts` (+ test) |
| 2 | Optional message line of AppActionSheet | dde4d4b6 | `ui/AppActionSheet.tsx`, `ui/AppActionSheet.test.tsx` |

## What was built

- `loadOfflineLayersPolicy()` reads `local_meta.offline_layers_policy`; a missing row or any value other than "base" or "all" reads as "all" (T-28-07 mitigated, tested). `saveOfflineLayersPolicy()` is the same upsert as `saveBasemapPreference`.
- `clearLocalIbpData` (in `storage/surveys.ts`, untouched) deletes by explicit key list and prefix, so the policy survives it; a sqlite test asserts this. `storage/db.ts` has no mention of the key; `user_version` stays 5.
- `useOfflineLayersPolicy()` returns `{ policy, setPolicy, reload }`: state starts at "all", loads on mount and each time `useScreenFocus()` turns true, guards against updates after unmount; `setPolicy` is a no-op for the current value, else updates state at once and saves once.
- `AppActionSheet`: `message?: string` is carried through the `latest` ref into `ActionSheetIOS.showActionSheetWithOptions` (undefined without a message), and drawn on Android as `<Text testID="app-action-sheet-message">` under the title (`brandTypeScale.footnote`, secondary text colour, centred, `brandFontScaleCaps.body`). Existing callers are unchanged.

## Verification

- `npx jest -c jest.unit.config.js src/storage/offline-layers-policy.sqlite.test.ts src/hooks/useOfflineLayersPolicy.test.ts --coverage=false`: 13 tests pass.
- `npx jest -c jest.unit.config.js src/ui/AppActionSheet.test.tsx src/__checks__/structure.test.ts --coverage=false`: 26 tests pass.
- `npm run test:coverage:mobile`: 330 suites, 4463 tests pass, no threshold failure; the two new modules at 100 % in every column.
- `npm run lint`, `npm run typecheck`: exit 0. `npm run format:check` only warns on `.claude/settings.local.json` (local untracked file, out of scope, same as in 28-02).
- Acceptance greps: key and default literals present, `grep -c offline_layers_policy mobile/src/storage/db.ts` is 0, `useScreenFocus` used by the hook, `message?: string` and `app-action-sheet-message` present in `AppActionSheet.tsx`.

## Deviations from Plan

**1. [Rule 1 - Test harness] Awaited `unmount()` in the hook test**: in this Testing Library version `unmount()` returns a promise; not awaiting it produced "overlapping act() calls" errors. Test only.

No other deviations. Phase 27 files untouched; `storage/surveys.ts` not modified.

## Decisions Made

- The mount load runs regardless of focus (a screen mounted unfocused still starts from the stored value), and the focus effect does not reload a second time at mount (`loadedOnceRef`).
- `setPolicy` compares against a ref mirroring the state, so two calls in the same tick with the same value save once.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or file surface.

## Notes for the next plans

- 28-08: `useOfflineLayersPolicy()` for the row, `AppActionSheet` with `title`, `message` and two options; the setting applies to future downloads only (say so in the message).
- 28-10 / 28-15: read `policy` from the hook, or call `loadOfflineLayersPolicy()` outside React. The hook already re-reads on focus, so no extra subscription is needed.
- The Android message line has no entrance or truncation handling; keep the message to one or two short lines.

## Self-Check: PASSED

- FOUND: mobile/src/storage/offline-layers-policy.ts, mobile/src/storage/offline-layers-policy.sqlite.test.ts, mobile/src/hooks/useOfflineLayersPolicy.ts, mobile/src/hooks/useOfflineLayersPolicy.test.ts
- FOUND commits 2909aeec and dde4d4b6 on `claude/focused-sutherland-89f87e`
