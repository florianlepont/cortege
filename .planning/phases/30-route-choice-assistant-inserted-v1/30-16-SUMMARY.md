---
phase: 30-route-choice-assistant-inserted-v1
plan: 16
subsystem: mobile-sync
tags: [route, sync, offline, finish-gate, client-marker]
requires: [30-08, 30-10, 30-11]
provides:
  - "A draft without a valid route stays on the phone (upsert and photo rows untouched) until a route is written"
  - "recoverRouteBlockedDrafts: a draft the server refused for its route is unblocked and re-queued once routed"
  - "A 422 route_required on submit is stored as last_sync_error_code route_required"
  - "The client marker X-Cortege-Features: survey_route on every request of apiRequest"
  - "canFinishSurvey(survey, isComplete, hasRoute), hasRoute in useLocalDraftSummary, route-aware finish button and pager pill"
key-files:
  modified:
    - mobile/src/storage/sync.ts
    - mobile/src/api/client.ts
    - mobile/src/screens/survey-detail/summary-state.ts
    - mobile/src/screens/survey-detail/useLocalDraftSummary.ts
    - mobile/src/screens/survey-detail/useSurveyDetailData.ts
    - mobile/src/screens/survey-form/usePagerFinish.ts
  created:
    - mobile/src/storage/sync.routeless-drafts.sqlite.test.ts
requirements: [REQ-C-route-record]
completed: 2026-10-14
status: complete
---

# Phase 30 Plan 16: Mandatory route on the phone Summary

The route is now mandatory on the phone, in step with the server (30-10): a draft without a valid route never leaves the phone and cannot be finished, the phone identifies itself as the new client, and a server refusal reads as "choose the parcours".

## `useSurveySync.ts` and the sync hooks: UNCHANGED

`mobile/src/hooks/useSurveySync.ts` and `mobile/src/hooks/survey-sync/` are untouched. `git diff` of both against `a6c5dd72` is empty, and against the merge base with `origin/main` it is empty too. Everything reached the sync layer through `storage/sync.ts` (the drain) and `api/client.ts` (the HTTP client).

## What was done

**Task 1 (commit 1b11d336)**
- `drainQueue` (`storage/sync.ts`): `findRoutelessSurveyIds` reads, once per drain, the payload of each non-submitted survey that has a pending or failed `survey_upsert` or `attachment_upload` row; `readSurveyRoute` decides. Those two kinds of rows are left out of the batch exactly as the OA-18 filter does for unnamed drafts: no request, no retry count, row status unchanged. The `survey_delete` rows still go out. A submitted survey is never held (it is already on the server, and an older one has no route, P-3).
- `recoverRouteBlockedDrafts` (called at the start of the drain, after `recoverSiteNameBlockedDrafts`): a blocked draft whose error code is `route_required` (or whose message matches `survey_route ... required`) and that now has a valid route returns to `draft`/`pending`, unblocked, and its upsert is queued again with the current payload (the blocking failure had deleted its queue row; no duplicate if one is pending). One still without a route stays blocked.
- `submitSurvey`: a 422 whose body `code` is `route_required` is stored with `last_sync_error_code = 'route_required'` (status back to `draft`, not blocked); another 422 keeps `submit_validation`. The catalogue sentence `fr.syncErrors.byCode.route_required` (30-11) then says to choose the parcours.
- `apiRequest` (`api/client.ts`): adds `X-Cortege-Features: survey_route` (constants from the package) next to the bearer token on every request; a header the caller set under the same name, in any letter case, wins.

**Task 2 (commit d7902cd6)**
- `canFinishSurvey(survey, isComplete, hasRoute)`: false without a route, otherwise as before.
- `resolveFinishCta`: for a complete draft that cannot be finished, the label is `blocked`, then `nameRequired`, then `routeRequired` ("Choisissez le parcours pour terminer"); a complete draft with a route stays `ready`; a submitted survey stays `hidden`.
- `useLocalDraftSummary` exposes `hasRoute` (`readSurveyRoute(draft.survey_route) !== null`, false when not loaded or not found); `useSurveyDetailData` passes it to `canFinishSurvey`.
- `usePagerFinish` reads the route with `useSurveyRoute(survey)`; the pill is offered only when the route is loaded and valid.

## Tests

- New `sync.routeless-drafts.sqlite.test.ts` (12 cases, real SQL): routeless upsert and photo held and untouched; invalid route and unreadable payload count as no route; delete still goes out; sent with the route after `patchLocalSurveyRoute`; a submitted survey without route is not held; recovery with and without route, other block reasons untouched, no double queueing; `route_required` and other 422 on submit.
- `client.test.ts`: marker sent with and without token, caller's header not overridden.
- `summary-state`, `useLocalDraftSummary`, `useSurveyDetailData`, `usePagerFinish` tests extended.
- Results: `npx jest -c jest.unit.config.js` in `mobile/`: 422 suites, 6261 tests, all green. `npm run lint` and `npm run typecheck` exit 0. Prettier check on `mobile/src` and `packages` is clean (`.claude/settings.local.json` is not mine and was not touched). The root `npm run test:unit` was not run (`check-env-parity.spec.ts` fails on bash 3.2 on this Mac, CI runs bash 4).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing sync fixtures had no route**
- **Found during:** Task 1, after the hold was in place
- **Issue:** 33 existing tests insert drafts without a `survey_route` and expect them to be sent; with the new rule they are (correctly) held.
- **Fix:** the fixtures now carry a valid route (`sync.engine`, `sync.retry`, `sync.unnamed-drafts`: route in the payload; `sync.attachments`: a local `createLocalDraft` wrapper that writes the route through `patchLocalSurveyRoute`; `storage.test.ts`: one draft routed). No assertion changed.
- **Files modified:** `mobile/src/storage/sync.{engine,retry,attachments,unnamed-drafts}.sqlite.test.ts`, `mobile/src/storage.test.ts`
- **Commit:** 1b11d336

**2. [Rule 3 - Blocking] `routes.test.tsx` pager pill tests**
- **Found during:** Task 2, full mobile suite
- **Issue:** three `FactorDetailRoute` pill tests read the real `useSurveyRoute` (storage), which gave no route.
- **Fix:** a `useSurveyRoute` mock returning a loaded valid route in that test file; the gate itself is proved in `usePagerFinish.test.ts`.
- **Files modified:** `mobile/src/navigation/routes/routes.test.tsx`
- **Commit:** d7902cd6

**3. [Design choice] `resolveFinishCta` has no new `hasRoute` parameter**
- The route label is the remaining case of a complete draft that `canFinishNow` (which already carries `hasRoute`) refuses, after the blocked and name cases, so the function signature is unchanged and `SurveyDetailScreen.tsx` (369 lines) needed no edit. Behaviour matches the plan.

## Known Stubs

None.

## Threat Flags

None. T-30-60 (routeless rows untouched, recovery tested), T-30-61 (rows stay pending, payload stays in SQLite, the routed upsert carries the route) and T-30-62 (both finish entries use `canFinishSurvey` with `hasRoute`) are mitigated as planned.

## Notes for later plans

- A held draft shows no special state yet: the owner's "Parcours à choisir" state and the route choice from the Contexte page are plan 30-22. Until then a legacy draft without route only shows the disabled summary button.
- A pulled draft of the server without route (legacy, spec section 8) is held too if edited on the phone, until it has a route.

## Self-Check: PASSED

- `mobile/src/storage/sync.routeless-drafts.sqlite.test.ts` exists; commits 1b11d336 and d7902cd6 exist; acceptance greps for `readSurveyRoute`, `recoverRouteBlockedDrafts`, `ROUTE_REQUIRED_CODE`, `CLIENT_FEATURES_HEADER`, `routeRequired`, `hasRoute`, `useSurveyRoute(` hold.
