---
phase: 25-global-search
plan: 07
subsystem: search
tags: [mobile, hooks, api-client, debounce, offline, recent-searches]
requires: ["25-01", "25-02"]
provides:
  - "searchCommunity, searchPlaces, searchParcels (mobile/src/api/ibp-api.ts)"
  - "useSearchGroup, SEARCH_DEBOUNCE_MS and the SearchGroupStatus / SearchGroupError / SearchGroupState types"
  - "useGlobalSearch and its GlobalSearch result type"
  - "useSearchRecents"
affects: [25-11, 25-12, 25-13]
tech-stack:
  added: []
  patterns: ["keyed settle: a result carries the request key it answers, so status is derived, not stored", "inline fetcher kept stable by useLatestCallback"]
key-files:
  created:
    - mobile/src/hooks/useSearchGroup.ts
    - mobile/src/hooks/useSearchGroup.test.ts
    - mobile/src/hooks/useGlobalSearch.ts
    - mobile/src/hooks/useGlobalSearch.test.ts
    - mobile/src/hooks/useSearchRecents.ts
    - mobile/src/hooks/useSearchRecents.test.ts
  modified:
    - mobile/src/api/ibp-api.ts
    - mobile/src/api/ibp-api.test.ts
key-decisions:
  - "Status is derived each render (idle, offline, waiting, loading, ready, error) from enabled, offline, live vs effective query and the key of the last settled answer"
  - "While the text waits for the pause, no request is sent for the older text; the effect only issues a request when the live query equals the effective one"
  - "A failing group returns data null (rows of another text are never shown under an error line); a loading group keeps its previous rows"
  - "The Lieux fetcher returns an empty list without a call under 3 characters, so the group is ready and empty and disappears"
metrics:
  tasks: 3
  files: 8
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 07: Search data layer on the phone Summary

Three typed client functions for the per-group search endpoints, a generic `useSearchGroup` state machine (350 ms debounce, kept rows, stale-answer drop, offline and reconnection, 429-aware errors, per-group retry), `useGlobalSearch` combining the local own-survey match with the three network groups and the pure rules of plan 25-01, and `useSearchRecents` over the local storage of plan 25-02.

## Tasks and commits

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Typed client functions for the three search endpoints | d0d43130 |
| 2 | useSearchGroup, the per-group state machine | edeb7d00 |
| 3 | useGlobalSearch and useSearchRecents | b6c5251b |

## What was built

- `searchCommunity(apiUrl, token, { q, author?, limit? })`, `searchPlaces(.., { q, limit? })`, `searchParcels(.., { q })`: GET with bearer token, trimmed `q`, every parameter through `encodeURIComponent` (T-25-20), wire types from `@cortege/ibp-domain`. `searchCommunitySurveys` stays until plan 25-14.
- `useSearchGroup<T>({ query, enabled, offline, fetcher, immediate? })` returns `{ data, status, error, retry }`. Exports `SEARCH_DEBOUNCE_MS = 350`. `immediate` skips the debounce (tapped recent search, full-list page); a query present at mount is requested at once.
- `useGlobalSearch({ query, surveys, apiUrl, accessToken, immediate? })` returns `{ normalized, active, offline, mine, community, places, parcels, parcelsShown, best, order, busy, settled, resultCount }`. `surveys` arrives as an argument: no context is read or written.
- `useSearchRecents()` returns `{ recents, save, remove, clear, reload }`, stable callbacks, loaded on mount, silent after unmount.

## Notes for the next plans

- Groups receive the normalised query (trimmed, collapsed whitespace), so a trailing space never re-triggers a request.
- `community.data` is a `SearchCommunityResponse` (`members` and `surveys`); `places.data` / `parcels.data` are `{ items }`. All are `null` while a group is idle, offline, in error, or has not answered yet.
- `parcelsShown` is true for parcel-looking text online and for any active query offline; the Parcelles group is requested only when it is shown and a token exists. Without a token every network group is "idle" (also offline: no offline line without a token, as the plan states).
- `settled` is simply `!busy`: it is also true for an inactive query and when every group is offline or idle. A screen deciding on the "no result" message must combine `active && settled && resultCount === 0` (and the offline case) itself.
- `busy` counts only "waiting" and "loading" statuses, so the field spinner shows from the keystroke while a network group is enabled.
- `retry()` bumps a per-group nonce: it re-requests the current effective text at once without waiting for the pause.
- Error details go to `logStatusDetail("search", error)` only (the typed text is never logged); in tests `console.debug` is spied to keep output clean.
- The endpoints themselves arrive in plan 25-13 (API wiring); until then calls would 404, nothing in the app calls these functions yet.

## Deviations from Plan

None in scope. Two design details beyond the plan text, both inside the hook's contract:

- The request effect is skipped while the live text differs from the debounced one, instead of re-issuing the old debounced text when a group is re-enabled (found while testing a disable/re-enable sequence).
- On error `data` is null rather than the previous rows, because stale rows of an older text under an error line would mislead.

RED/GREEN was done within each task (tests and implementation written together, one `feat` commit per task), as in plans 25-01 and 25-02.

## Verification

- `cd mobile && npx jest --config jest.unit.config.js src/api/ibp-api.test.ts src/hooks/useSearchGroup.test.ts src/hooks/useGlobalSearch.test.ts src/hooks/useSearchRecents.test.ts`: pass.
- `npm run test:coverage:mobile`: exit 0, 276 suites and 3500 tests pass; the three new hooks are at 100 percent statements, branches, functions and lines.
- `npm run lint` and `npm run typecheck`: exit 0. Prettier check passes on all eight files of the plan (the repo-wide `format:check` was not used because of the git-ignored `.claude/settings.local.json`).
- Acceptance greps hold: the three `/search/*` paths in `ibp-api.ts`; `SEARCH_DEBOUNCE_MS = 350` and `rateLimited` in `useSearchGroup.ts`; zero `console.` in `useSearchGroup.ts`; `pickBestResult(`, `useIsOffline()` and `looksLikeParcelQuery(` in `useGlobalSearch.ts`; zero `useSurveys` / `surveys-context` in `useGlobalSearch.ts`.

## Known Stubs

None.

## Threat Flags

None. T-25-18 (debounce, parcel gate, 3-character places gate, stale-answer drop), T-25-19 (errors to `logStatusDetail` only) and T-25-20 (encoded parameters, asserted on `&` and accents) are mitigated as planned.

## Self-Check: PASSED

- FOUND: mobile/src/hooks/useSearchGroup.ts, useSearchGroup.test.ts, useGlobalSearch.ts, useGlobalSearch.test.ts, useSearchRecents.ts, useSearchRecents.test.ts
- FOUND: searchCommunity, searchPlaces, searchParcels in mobile/src/api/ibp-api.ts
- FOUND commits: d0d43130, edeb7d00, b6c5251b
