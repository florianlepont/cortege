# Batch 2 — isOnline/isSyncing through the sync engine

The two booleans `SyncStatusPill` needs, sourced from the real network probe and the sync
engine's in-flight state, reaching Home and Mes Relevés without disturbing the existing
render-isolation guarantees.

## What shipped

- `mobile/src/hooks/survey-sync/useSurveySyncNetwork.ts`: `isOnline` (mirrors the existing
  `lastOnlineStateRef`, defaulting to `true` so the pill never flashes "offline" before the first
  network probe resolves) and `isSyncing` (an `activeSyncCount` incremented/decremented around
  `runSync`'s push path, the auto-pull path and the manual `handlePullChanges` path — every place
  that writes to the local queue or pulls remote changes).
- `useSurveySync.ts` threads both through its return value.
- `mobile/src/state/sync-status-context.ts` (new): `{isOnline, isSyncing}` only, provided by
  `AppStateProvider` as a sibling of `status-context.ts`, not a merge into it — see 16-CONTEXT.md's
  scope decision. `SettingsRoute` stays the only reader of the status-message context; `HomeRoute`
  and `SurveyListRoute` (batches 3-4) read the new one instead.
- `render-counts.test.tsx`'s `statusUpdate` scenario caught the alternative (merging into
  `status-context`) immediately: a plain status message started re-rendering Home too. Confirms the
  narrow-context split was the right call, not just a style preference.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — green;
`npm run test:coverage:mobile` (the actual CI gate for `unit-mobile`, not part of the plain
pre-commit checklist) also checked at every batch afterward, since its per-directory coverage
thresholds (`./src/navigation/`, `./src/hooks/`) are strict enough to catch an uncovered new
branch/function that the plain test run doesn't fail on.
