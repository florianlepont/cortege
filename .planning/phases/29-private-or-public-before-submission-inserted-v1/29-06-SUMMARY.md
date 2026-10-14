---
phase: 29-private-or-public-before-submission-inserted-v1
plan: 06
subsystem: api
tags: [visibility, privacy, sync, concurrency, row-lock, nestjs, e2e]
status: complete
requires:
  - phase: 29-04
    provides: "createSubmittedSurvey e2e helper with an explicit visibility; e2e session ordering on ibp_test"
provides:
  - "Visibility read-only after submit on every server write channel (PATCH /visibility, PATCH /surveys/:id, upsert higher version, same-version upsert, sync visibility_update)"
  - "assertVisibilityWritable: 422 submitted_read_only_fields with forbidden_fields and details { survey_id, fields }"
  - "Row-locked PATCH lookups and a status-guarded visibility UPDATE closing the submit race"
  - "Deterministic and concurrent race e2e proofs"
affects: [29-10]
tech-stack:
  added: []
  patterns:
    - "Every 422 that can reach mapSyncError carries details.fields (mapSyncError drops forbidden_fields)"
    - "Writes that can race POST /submit take FOR UPDATE on their lookup and guard the UPDATE with AND status <> 'submitted'"
    - "Race e2e: a raw pg Client holds FOR UPDATE, pg_stat_activity proves the request waits on the lock, then the holder commits"
key-files:
  created:
    - api/test/surveys-visibility-guard.spec.ts
  modified:
    - api/src/surveys/surveys-normalize.utils.ts
    - api/src/surveys/surveys.service.ts
    - api/test/surveys-normalize.utils.spec.ts
    - api/test/surveys-upsert-fast-path.spec.ts
    - api/test/sync-error.utils.spec.ts
    - api/test/surveys-sync.service.spec.ts
    - api/test/surveys-visibility.e2e-spec.ts
    - api/test/surveys-submit.e2e-spec.ts
    - api/test/surveys-same-version.e2e-spec.ts
    - api/test/sync-installed-app-compat.e2e-spec.ts
key-decisions:
  - "D-07 refined (orchestrator decision 1): per-channel codes of api-contract-v1.md, not a blanket 422: 422 submitted_read_only_fields on PATCH /surveys/:id, PATCH /surveys/:id/visibility and sync visibility_update; 409 survey_submitted_read_only on an upsert with a higher sync_version; 409 sync_version_conflict on a same-version upsert. All carry the field name in details.fields (except sync_version_conflict, which carries the versions as before)"
  - "Idempotent replays stay successful: the equal-value no-op runs before the submitted check, so PATCH /visibility answers 200 and visibility_update / upsert replays answer synced"
  - "PATCH /surveys/:id refuses the visibility key by presence after submit (even an equal value), like every other read-only key; the dedicated PATCH /visibility route is the one that accepts an equal-value replay"
  - "The restricted UPDATE of a submitted survey's upsert writes the stored visibility back (a different value is already refused with 409)"
requirements-completed: [REQ-C-privacy-choice]
duration: ~40min
completed: 2026-10-13
---

# Phase 29 Plan 06: Visibility frozen at submit on every write channel Summary

**A submitted survey's visibility can no longer change through any server write: the read-only rules now include `visibility`, the PATCH routes lock the row and the visibility UPDATE is status-guarded, so a write racing `POST /submit` either commits first or answers 422; drafts still change freely with their `visibility_changed` event.**

## D-07 per-channel code refinement (orchestrator decision 1)

CONTEXT D-07 wrote "422 `submitted_read_only_fields`" for every channel. This plan keeps the documented per-channel policy of `docs/technical/api-contract-v1.md` (lines 593-594), as recorded in the 29-CONTEXT "Amendments":

| Channel | Different value after submit | Stored value (replay) |
|---------|------------------------------|-----------------------|
| `PATCH /v1/surveys/:id/visibility` | 422 `submitted_read_only_fields`, `forbidden_fields: ["visibility"]`, `details.fields: ["visibility"]` | 200 no-op |
| `PATCH /v1/surveys/:id` with `visibility` | 422 `submitted_read_only_fields`, `forbidden_fields` and `details.fields` contain `visibility` (key presence: an equal value is refused too, like the other keys) | n/a (key refused) |
| `POST /v1/surveys` / sync upsert, higher `sync_version` | 409 `survey_submitted_read_only`, `details.fields` contains `visibility` | synced (only `sync_version` moves) |
| upsert, same `sync_version` | 409 `sync_version_conflict`, nothing written | synced (identical replay) |
| sync `survey.visibility_update` | per-operation `fatal_error`, `http_status` 422, `code` `submitted_read_only_fields`, `details.fields: ["visibility"]` | synced |

The installed client already maps all of these codes. Plan 29-10 records the rule in the contract.

## Accomplishments

- `getSubmittedReadOnlyFields` lists `visibility` (PATCH key presence); `getChangedSubmittedReadOnlyFields` reports `visibility` only when the stored row is submitted and the body carries a different non-null value, so `classifySameVersionContent` answers `conflict` on a submitted row and `visibility_only` stays a draft-only outcome.
- `SurveysService.assertVisibilityWritable` throws the 422 with `details { survey_id, fields: ["visibility"] }`, so `mapSyncError` keeps the field name in the sync result.
- `patchSurveyVisibility` and `patchSurvey` look the row up with `forUpdate: true` (submit already locks it); the equal-value no-op stays first.
- `applyVisibilityChange` UPDATE carries `AND status <> 'submitted'`; on 0 rows it re-reads (no lock needed) and answers 422 for a row submitted in between, 404 for a missing one. Drafts keep their one `visibility_changed` event (D-08).
- The upsert's restricted UPDATE of a submitted survey writes `existing.visibility`.
- No DTO or wire change (D-14).

## Race proof

- **Deterministic (f)**, for both `PATCH /surveys/:id/visibility` and `PATCH /surveys/:id`: a raw `pg` Client runs `BEGIN; SELECT id FROM surveys WHERE id = $1 FOR UPDATE`, the PATCH is fired without awaiting, `pg_stat_activity` is polled until a backend waits on a `Lock`, then after 300 ms the PATCH is asserted unsettled; the holder sets `status = 'submitted'` and commits: the PATCH answers 422 and the visibility is unchanged. A twin releases the lock without submitting: the PATCH answers 200 and applies.
- **Mutation check:** with the two `forUpdate: true` and the status guard removed locally (not committed), both "submit commits first" cases failed (the write was applied to the submitted row with a 200); restoring the committed file made them pass again.
- **Concurrent (g):** six rounds of `Promise.all([submit, PATCH /visibility])` on fresh complete drafts: submit always 201, PATCH only 200 or 422, stored visibility is `public` iff the PATCH answered 200, and the event count matches (1 or 0).

## Task Commits

1. **Task 1: visibility in the read-only rules**: `d151879f` (test, RED), `e959c810` (feat, GREEN)
2. **Task 2: service guard, row locks, status-guarded UPDATE**: `84f75c6b` (test, RED), `7abcc54d` (feat, GREEN)
3. **Task 3: e2e on every write channel plus the race**: `f89c763e` (test)

## Verification

- `npx jest --config jest.unit.config.js test/surveys-normalize.utils.spec.ts test/surveys-upsert-fast-path.spec.ts test/sync-error.utils.spec.ts test/surveys-sync.service.spec.ts test/surveys.controller.spec.ts test/surveys.repository.spec.ts test/surveys-visibility-guard.spec.ts`: pass
- `npx jest -c jest.config.js --runInBand test/surveys-visibility.e2e-spec.ts test/surveys-submit.e2e-spec.ts test/surveys-same-version.e2e-spec.ts test/sync-installed-app-compat.e2e-spec.ts`: 34/34 pass
- `... test/surveys-idempotency.e2e-spec.ts test/surveys-upsert-cas.e2e-spec.ts test/surveys-transactions.e2e-spec.ts`: 18/18 pass
- Full API unit suite (`npm --workspace api run test:unit`): 1310 pass; the only failing suite is `check-env-parity.spec.ts` (known: needs bash 4, the Mac has bash 3.2; CI runs it; untouched here)
- Full e2e (`npm run test:e2e`): 45/47 suites, 340 pass; the only failures are the two known environmental suites `list-pagination.e2e-spec.ts` (timezone) and `migrate-lock.e2e-spec.ts` (permission to create a database)
- `npm run lint`, `npm run typecheck`, `npm --workspace api run build`: exit 0; `npx prettier --check` on every changed file: clean
- Acceptance greps: `"visibility"` in `getSubmittedReadOnlyFields`, `existing.status === "submitted"` in the normalize utils, `private assertVisibilityWritable`, `AND status <> 'submitted'`, `forUpdate: true` count 5, `fields: ["visibility"]`, `FOR UPDATE` and `Promise.all` in the visibility e2e, the renamed submit test: all present

## Deviations from Plan

### Auto-added

**1. [Rule 2 - Missing test coverage] New unit spec `api/test/surveys-visibility-guard.spec.ts`**
- **Found during:** Task 2
- **Issue:** the Task 2 behaviour list names service-level cases (`patchSurveyVisibility` 422 response shape, equal-value no-op), but no existing unit spec exercises `patchSurveyVisibility`, `applyVisibilityChange` or `patchSurvey` on the real service.
- **Fix:** a dedicated spec over the real `SurveysService` with a mocked transaction: the 422 body and the `forUpdate: true` lookup, the no-op for draft and submitted, the status-guarded UPDATE and one event on a draft, the 422 / 404 after a 0-row UPDATE, `patchSurvey`'s `details.fields`, and the upsert restricted UPDATE writing the stored value.
- **Commit:** `84f75c6b`

**2. Race test strengthened beyond the plan's wording**
- The deterministic race polls `pg_stat_activity` for a lock waiter before the 300 ms unsettled check (so it proves the request really waits on the lock rather than just being slow), runs for both PATCH routes (`describe.each`), and adds a release-without-submit twin. The concurrent race runs six rounds instead of one.
- **Commit:** `f89c763e`

No other deviation; plan instructions matched the code (line numbers had drifted slightly).

## Known Stubs

None.

## Threat Flags

None: no new route, auth path or schema change; the refusal bodies carry only the caller's own survey id and field names (T-29-22, accepted).

## Self-Check: PASSED

- FOUND: api/test/surveys-visibility-guard.spec.ts, api/src/surveys/surveys.service.ts, api/src/surveys/surveys-normalize.utils.ts
- FOUND commits: d151879f, e959c810, 84f75c6b, 7abcc54d, f89c763e
