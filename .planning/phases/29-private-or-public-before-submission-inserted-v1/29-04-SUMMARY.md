---
phase: 29-private-or-public-before-submission-inserted-v1
plan: 04
subsystem: api
tags: [reports, visibility, privacy, nestjs, e2e]
status: complete
requires:
  - phase: 29-01
    provides: "PUBLIC_SURVEY_PREDICATE (shared only), caller-aware parcel history"
provides:
  - "POST /v1/reports answers the same 404 as an unknown id for a survey the reporter may not read"
  - "createSubmittedSurvey e2e helper with an explicit visibility (used by 29-09)"
  - "Two-user proof of the caller-aware parcel history (D-10)"
affects: [29-09]
tech-stack:
  added: []
  patterns:
    - "Reportability is decided by the shared SQL predicate (computed as a column), not a second hand-written rule"
key-files:
  created:
    - api/test/reports.service.spec.ts
  modified:
    - api/src/reports/reports.service.ts
    - api/test/epic-e-search-reports.e2e-spec.ts
    - api/test/attachments-reports-transactions.e2e-spec.ts
    - api/test/helpers/surveys-e2e.ts
    - api/test/parcel-history.e2e-spec.ts
key-decisions:
  - "D-12: hidden survey (private, or draft of another member) throws NotFoundException(\"Survey not found\"), identical to the unknown id; moderators/admins keep any live survey; the author keeps the 403"
  - "D-09: findSurveyForReport selects (PUBLIC_SURVEY_PREDICATE) AS shared; the visibility column is no longer read"
requirements-completed: [REQ-C-privacy-choice]
duration: ~20min
completed: 2026-10-13
---

# Phase 29 Plan 04: Reports 404 for hidden surveys, createSubmittedSurvey helper, two-user history Summary

**Reporting no longer reveals that another member's private survey or draft exists: `POST /v1/reports` decides with the shared `PUBLIC_SURVEY_PREDICATE` and answers the unknown-id 404; the parcel history is proven caller-aware with two users.**

## Accomplishments

- `reports.service.ts`: `ReportedSurveyRow` now carries `shared` (computed with `PUBLIC_SURVEY_PREDICATE` from `surveys s`); `canReportSurvey` replaced by `assertCanReportSurvey` (moderator/admin allowed, author 403, not shared 404 "Survey not found"). Transaction, insert and `reported` event untouched.
- `api/test/reports.service.spec.ts`: seven-row decision table, including that the lookup SQL contains the predicate and no other `visibility` word.
- `epic-e-search-reports.e2e-spec.ts`: the 403 on another member's private survey became a dedicated test (D-12) comparing the 404 body with an unknown id's body, for a private submitted survey and a shared draft, and checking no report row was stored; the owner's 403 stays.
- `attachments-reports-transactions.e2e-spec.ts`: the reported survey is marked submitted by SQL before the non-moderator reports it.
- `createSubmittedSurvey(app, db, token, { visibility, siteName?, id?, at?, observationYear? })` in `helpers/surveys-e2e.ts`.
- `parcel-history.e2e-spec.ts`: describe "Phase 29 visibility (D-10)" with users A and B on one parcel (4 surveys): A sees A-private, A-shared, B-shared; B sees A-shared, B-shared, B-private; no token gives 401.

## Task Commits

1. **Task 1: Reports 404 for a survey the reporter may not read** - `754ab732` (feat)
2. **Task 2: createSubmittedSurvey helper and two-user parcel history proof** - `eae79319` (test)

## Verification Run

- `npx jest --config jest.unit.config.js test/reports.service.spec.ts`: 7 pass.
- e2e (`ibp_test`, runInBand): `epic-e-search-reports`, `attachments-reports-transactions`, `validation-reports` (19 tests) and `parcel-history` (2 tests) pass; `validation-reports.e2e-spec.ts` unmodified.
- `npm run lint`, `npm run typecheck`, `npm --workspace api run build`, `prettier --check` on all changed files: pass.

## Deviations from Plan

None - plan executed as written. Notes: the new D-12 e2e test has its own users and fixtures rather than reusing the first reports test, and it also covers a shared draft; the private-survey 403 assertion was removed from the old test (moved, not duplicated).

## Known Stubs

None.

## Threat Flags

None. T-29-11 and T-29-12 mitigated as planned; T-29-13 accepted unchanged.

## Self-Check: PASSED

- Files present: `api/test/reports.service.spec.ts` and all modified files.
- Commits found: `754ab732`, `eae79319`.
- STATE.md and ROADMAP.md untouched.
