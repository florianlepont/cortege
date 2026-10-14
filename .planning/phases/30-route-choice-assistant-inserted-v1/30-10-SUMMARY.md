---
phase: 30-route-choice-assistant-inserted-v1
plan: 10
subsystem: api
tags: [nestjs, survey-route, route-required, sync, client-marker]
requires:
  - phase: 30-09
    provides: "survey_route stored and read at every write site"
  - phase: 30-02
    provides: "open point P-2 validated: client marker header X-Cortege-Features: survey_route"
provides:
  - "route-required.ts: clientRequiresRoute, assertRouteForCreate, assertRouteForSubmit (422 route_required)"
  - "POST /v1/surveys, POST /v1/sync and POST /v1/surveys/:id/submit read the client marker header"
  - "surveys-route-required.e2e-spec.ts: mandatory route for the new client, unchanged old-client path"
affects: [30-16, 30-20, 30-23]
tech-stack:
  added: []
  patterns: ["Optional trailing requireRoute = false parameter threaded controller -> service, so every existing caller is untouched"]
key-files:
  created:
    - api/src/surveys/route-required.ts
    - api/test/route-required.spec.ts
    - api/test/surveys-route-required.e2e-spec.ts
  modified:
    - api/src/surveys/surveys.controller.ts
    - api/src/surveys/sync.controller.ts
    - api/src/surveys/surveys.service.ts
    - api/src/surveys/surveys-sync.service.ts
    - api/test/sync-error.utils.spec.ts
    - api/test/surveys.controller.spec.ts
    - api/test/surveys-sync.service.spec.ts
key-decisions:
  - "The route check runs only on the two create paths (fast-path create and locked insert) and first in the submit transaction; updates never run it, so a draft stored before the phase keeps syncing"
  - "No change to sync-error.utils.ts: mapSyncError already passes the code of a 422 through, a spec case now pins route_required"
  - "Header value is a comma-separated list, trimmed and case-insensitive, matched by whole entry"
requirements-completed: [REQ-C-route-record]
duration: 25min
completed: 2026-10-14
status: complete
---

# Phase 30 Plan 10: Mandatory route on the server for the new client Summary

The API refuses to create a survey without a valid `survey_route`, and to submit one without a stored route, with the 422 `route_required`, only when the request carries `X-Cortege-Features: survey_route` (open point P-2). Requests without the header behave exactly as before.

## What was built

- `api/src/surveys/route-required.ts`:
  - `clientRequiresRoute(header)` reads the marker.
  - `assertRouteForCreate(body, requireRoute)` refuses a body whose `survey_route` the package reader (`readSurveyRoute`) rejects.
  - `assertRouteForSubmit(storedRoute, requireRoute)` does the same for the stored row.
  - Both throw `UnprocessableEntityException({ code: ROUTE_REQUIRED_CODE, message: "survey_route is required" })`: constant code and message, nothing from the body echoed (T-30-59).
- `surveys.controller.ts` and `sync.controller.ts` read the header with `@Headers(CLIENT_FEATURES_HEADER.toLowerCase())` and pass `requireRoute` to `upsertForUser`, `submitSurvey` and `syncBatch`. `surveys-sync.service.ts` forwards it to each `survey.upsert` operation.
- `surveys.service.ts`: `assertRouteForCreate` before the fast-path create and in the locked insert branch (`!existing`); `assertRouteForSubmit(existing.survey_route, requireRoute)` first in the submit transaction, before the IBP and parcel validation. Updates never check, so a legacy draft without a route keeps syncing from either client.
- A refused create in a sync batch is reported by the existing per-operation catch as `fatal_error` with code `route_required` and `http_status` 422; the other operations of the batch proceed (T-30-58).

## Verification

- Unit: `route-required.spec.ts` (helpers), `sync-error.utils.spec.ts` (422 route_required mapping), `surveys-sync.service.spec.ts` (requireRoute forwarded, mixed batch), `surveys.controller.spec.ts` (header turns the flag on). Whole API unit run: 1417 passed, 50 failed, all 50 in `check-env-parity.spec.ts` (known, bash 3.2).
- E2E `surveys-route-required.e2e-spec.ts`, 8 cases: create refused without route (and with `null`) and nothing stored; same body created with a canonical route; mixed sync batch; legacy draft (inserted without header) updated without the key, submission refused, then submitted after an update carrying a route; score identical with and without the header; route check before IBP validation; old client create/update/sync/submit unchanged; a header not listing the feature is ignored.
- Whole `npm run test:e2e` on the local Homebrew `ibp_test`: 52 suites, 50 passed, 394 tests passed, 3 skipped, 3 failed, all three the known environmental ones (`list-pagination.e2e-spec.ts` one case, `migrate-lock.e2e-spec.ts` two cases). No other failure: the ~35 existing e2e files that create surveys without the header pass unchanged.
- `npm run lint`, `npm run typecheck` clean. `npm run format:check` flags only `.claude/settings.local.json` (not part of this plan).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing controller spec asserted the old call signature**
- **Found during:** Task 1 (unit run)
- **Issue:** `api/test/surveys.controller.spec.ts` expected `upsertForUser(user, body)` and `submitSurvey(user, id)`; the controller now passes the `requireRoute` flag as a third argument.
- **Fix:** Updated the expectations to pass `false` and added the `"survey_route"` header case.
- **Files modified:** `api/test/surveys.controller.spec.ts`
- **Commit:** e8d71af8

**2. [Plan note] `sync-error.utils.ts` not modified**
- The plan said to extend it only if it did not pass a 422 code through. It already does; only the spec case was added.

None of the spec rules were changed.

## Known Stubs

None.

## Threat Flags

None. T-30-57 accepted as planned (data-quality rule, the app always sends the marker), T-30-58 and T-30-59 mitigated and tested.

## Commits

- e8d71af8: feat(30-10): route required for the new client at create and submit
- 66270c0b: test(30-10): e2e proof of the mandatory route and of the unchanged old-client path

## Self-Check: PASSED

Created files exist (`route-required.ts`, `route-required.spec.ts`, `surveys-route-required.e2e-spec.ts`); both commits are in the branch log.
