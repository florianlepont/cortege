---
phase: 30-route-choice-assistant-inserted-v1
plan: 09
subsystem: api
tags: [postgres, nestjs, jsonb, sync, survey-route]
requires:
  - phase: 30-07
    provides: "migration 025 (surveys.survey_route), SurveyRouteDto, read-only-after-submit and same-version comparison"
provides:
  - "survey_route written at every survey write site (fast-path create and update, locked insert and update) as a bound jsonb parameter"
  - "survey_route returned by GET /v1/surveys/:id, GET /v1/sync/changes and the community survey detail (O-15)"
  - "surveys-route.e2e-spec.ts: end-to-end storage contract on POST /v1/surveys and POST /v1/sync"
affects: [30-10, 30-23]
tech-stack:
  added: []
  patterns: ["Phase 27 weather pattern reused, with the keep rule of spec section 8: absent or null never clears a route"]
key-files:
  created:
    - api/test/surveys-route.e2e-spec.ts
  modified:
    - api/src/surveys/surveys.repository.ts
    - api/src/surveys/surveys.service.ts
    - api/src/surveys/surveys-sync.service.ts
    - api/src/surveys/community-surveys.service.ts
    - api/test/surveys-upsert-fast-path.spec.ts
    - api/test/surveys-sync.service.spec.ts
    - api/test/community-surveys.service.spec.ts
    - api/test/sync-installed-app-compat.e2e-spec.ts
    - api/test/community-survey-detail.e2e-spec.ts
key-decisions:
  - "Keep rule: surveyRoute = body.survey_route ?? stored route ?? null on both update paths, so a body without the key or with null never erases a route (spec section 8); only a value replaces it, and only on a draft (the 30-07 read-only rule refuses it on a submitted survey)"
  - "The restricted UPDATE of submitted surveys never lists survey_route (D-09); a comment at the statement says why"
  - "The community detail returns the column as stored (?? null): it is validated on write and the existing PUBLIC_SURVEY_PREDICATE (submitted, active, shared) is the only visibility rule, unchanged"
patterns-established:
  - "Fast-path parameter list: survey_route is $28, the xmin CAS token moved to $29 (create binds 28, update 29)"
requirements-completed: [REQ-C-route-record, REQ-C-route-display]
duration: 35min
completed: 2026-10-14
status: complete
---

# Phase 30 Plan 09: Route stored and returned by the API Summary

**The recorded route is now written at all four survey write sites and returned by the survey read, the changes feed and the community detail, with the keep-on-absent rule, read-only after submit, and an 18-case end-to-end suite on both entry points.**

## Accomplishments

- `surveys.repository.ts`: `SurveyFastWriteInput.surveyRoute`; `fastWriteValues` binds the route as JSON text (or null) at index 27 right after `weather`, the CAS token moved to index 28; the create statement gains `survey_route` and `$28::jsonb`, the update statement `survey_route = $28::jsonb` and `xmin = $29::xid`. The "full" read is `SELECT *`, so `findOwnedOrThrow` and the upsert read already carry the column.
- `surveys.service.ts`: `routeParameter(route)` helper next to `weatherParameter`; fast create passes `body.survey_route ?? null`; fast update and locked update pass `body.survey_route ?? existing.survey_route`; locked insert binds one more parameter (`$25::jsonb`), locked update `survey_route = $22::jsonb`. The restricted submitted UPDATE is untouched. `getSurveyById` returns `survey_route` (null when none) and its type union lists it.
- `surveys-sync.service.ts`: selects `s.survey_route` and maps `survey_route: row.survey_route ?? null`.
- `community-surveys.service.ts`: selects the column and returns it (O-15). The detail query keeps the phase 29 visibility predicate, so a draft or a private survey still answers 404 and the history items carry no route.

## Task Commits

1. Task 1, write sites, reads and unit specs: `fb7c53eb`
2. Task 2, end-to-end contract and compatibility cases: `64560333`

Both tasks were test first: the three unit specs were edited before the source (RED confirmed by the compile failure on the missing `surveyRoute` field), then the source made them green. Each task is one commit rather than a test/feat pair.

## Tests

- Unit (`surveys-upsert-fast-path.spec.ts`): the pinned positions moved (28 create values, 29 update values, route at index 27, token at index 28, `xmin = $29`, locked insert 25 values, locked update route at index 21); new cases for the fast create, keep on absent and null, replace, stored null stays null, locked insert and update, `getSurveyById` null-not-missing, and the restricted submitted UPDATE not containing `survey_route`. Sync and community specs cover the select, the `?? null` mapping and the missing-key case.
- E2E `surveys-route.e2e-spec.ts` (18 cases, both entry points): round trip and changes feed (null never a missing key); keep on absent and null; replace; add to a route-less draft; identical replay gives `synced` with the same `updated_at` and no new event, whatever the key order; changed route at the same version gives 409 `sync_version_conflict`; null or absent replay is synced; after submit a different route gives 409 `survey_submitted_read_only` listing `survey_route`, identical, absent and null resends are accepted and the stored route is unchanged, a route added to a legacy submitted survey is refused; undeclared nested key 400 on `/v1/surveys` and stripped on `/v1/sync`; invalid routes refused on both; the event journal never carries the route.
- `sync-installed-app-compat.e2e-spec.ts`: an installed-app body without the key updates a draft, survives submit and a replay without clearing the route, and the pulled change carries it.
- `community-survey-detail.e2e-spec.ts`: another member reads the route of a finished shared survey (null for one without); draft and private-finished surveys answer 404 and do not leak into the shared survey's payload.

## Verification

- `npx jest -c jest.unit.config.js` (api): 56 of 57 suites, 1405 tests pass; the only failing suite is `test/check-env-parity.spec.ts`, the known bash 3.2 failure on this Mac (CI runs bash 4).
- `npm run test:e2e` against the local Homebrew PostgreSQL 16 `ibp_test`: 49 of 51 suites pass (386 tests). The two failing suites are unrelated and environmental: `list-pagination.e2e-spec.ts` (one case, fails identically on the base commit `641a0f79`, checked in a throwaway worktree: the local database timezone is Europe/Paris, not UTC) and `migrate-lock.e2e-spec.ts` (`permission denied to create database` for the local `ibp` role). The phase 27 suite `surveys-note-weather`, `surveys-same-version`, `surveys-idempotency` and all migration specs pass.
- `npm run lint`, `npm run typecheck` and `npm --prefix api run build`: pass. `npm run format:check`: only `.claude/settings.local.json` is flagged (not part of this plan).

## Deviations from Plan

None to a rule. Clarifications:

- The plan's "keep rule" wording says "body value when present and non-null, otherwise the stored value". It is implemented as `body.survey_route ?? existing.survey_route ?? null`, which is the same thing. On a create (no stored row) an absent or null value stores NULL, as the plan requires.
- The plan's "full row read used by submit carries it" needed no code: the "full" column set is `SELECT *`. It is covered by the e2e cases that submit a survey with a route and read it back.
- `api/test/surveys-sync.service.spec.ts` was reformatted by Prettier after the new case was added (pre-existing formatting of the file was otherwise untouched).

## Known Stubs

None.

## Threat Flags

None. T-30-22 to T-30-26 are mitigated and pinned by tests: read-only compare plus a restricted UPDATE without the column and null-never-erases (unit and e2e), no new endpoint and the owner-scoped upsert unchanged, community read only through the phase 29 predicate (draft and private cases answer 404), the value is a bound `$n::jsonb` parameter, and the identical-replay and key-order e2e cases guard against a false 409 loop.

## Notes for next plans

- Plan 30-10 (mandatory route for the new client) must read `survey_route` from the body for create and from the stored row for submit; the stored row already carries it through `findOwnedOrThrow`. No request in this plan sends `X-Cortege-Features`.
- Deploy note (research Pitfall 12): this API change must be deployed before any app build that sends `survey_route`; plan 30-23 records it.
- The e2e suite needs a UTC database timezone and a role that can create databases to be fully green locally; CI provides both.

## Self-Check: PASSED

Files verified present: `api/test/surveys-route.e2e-spec.ts` and the modified sources and specs listed above. Commits `fb7c53eb` and `64560333` exist on the branch.
