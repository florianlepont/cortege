---
phase: 24-survey-history-split
plan: 01
subsystem: api
tags: [nestjs, postgres, ibp-domain, wire-contract, ibp-method-version]
requires:
  - phase: 11
    provides: parcel history and community survey detail endpoints
provides:
  - ibp_method_version on every item of GET /parcels/:parcelId/surveys/history
  - ibp_method_version on every entry of history[] in GET /public/community-surveys/:id
  - optional and nullable wire type on the shared package and on the mobile-local parcel history type
affects: [24-survey-history-split]
tech-stack:
  added: []
  patterns: ["additive nullable wire field (optional in the type = absent on an older server, null = v3.0)"]
key-files:
  created: []
  modified:
    - packages/ibp-domain/src/contract/public-map.ts
    - api/src/surveys/parcels.service.ts
    - api/src/surveys/community-surveys.service.ts
    - api/test/parcels.service.spec.ts
    - api/test/community-surveys.service.spec.ts
    - api/test/parcel-history.e2e-spec.ts
    - api/test/community-survey-detail.e2e-spec.ts
    - docs/technical/api-contract-v1.md
    - mobile/src/app/types.ts
key-decisions:
  - "The field is optional in the types (older server) and nullable (null = v3.0), so existing inline fixtures keep compiling"
  - "Query filters, order, limits and parameters left untouched: no new authorisation surface, no migration"
requirements-completed: [REQ-C-history-split]
status: complete
duration: 15min
completed: 2026-10-09
---

# Phase 24 Plan 01: Method version on the history payloads Summary

Both parcel history payloads now carry `ibp_method_version` (null = v3.0), which D-10 needs to cut the history curve between v3.0 and v3.2.

## Accomplishments

- `getParcelSurveyHistory` selects `s.ibp_method_version`; rows pass through unchanged.
- `CommunitySurveysService.getDetail` selects it in the history query and maps it into `CommunitySurveyHistoryItem`.
- `CommunitySurveyHistoryItem.ibp_method_version?: string | null` (shared package) and `ParcelSurveyHistoryItem.ibp_method_version?: string | null` (mobile).
- `api-contract-v1.md` documents the field on both endpoints.
- Unit specs assert the SQL contains `s.ibp_method_version`, the values pass through (null and the v3.2 tag) and the parameters stay `["P1", 5]` and `["s-2", 20]`. E2E specs assert the property is present.

## Task Commits

1. Task 1 (TDD, RED seen then GREEN): `ef04a8ae` feat(24-01): add ibp_method_version to the two history payloads
2. Task 2: `36391c1f` feat(24-01): document and type ibp_method_version on the history payloads

TDD: the new unit assertions were run first and failed (2 failed, 25 passed), then passed after the change.

## Verification actually run

| Check | Result |
|-------|--------|
| `cd api && npx jest --config jest.unit.config.js test/parcels.service.spec.ts test/community-surveys.service.spec.ts` | pass, 2 suites, 27 tests |
| `npm run typecheck` | exit 0 |
| `npm --workspace @cortege/ibp-domain run test:coverage` | pass, 230 tests, 100% statements/branches/functions/lines |
| `cd mobile && npx tsc --noEmit` | exit 0 |
| `npm --workspace api run build` | exit 0 |
| `npm run lint` | exit 0 |
| grep acceptance criteria (`s.ibp_method_version`, `ibp_method_version: item.ibp_method_version`, `ibp_method_version?: string \| null` in package and mobile, doc JSON examples and sentence, `toHaveProperty("ibp_method_version")` in both e2e specs) | all satisfied |
| Prettier on every changed `.ts` file | clean |

### Not run locally

- **E2E (`parcel-history.e2e-spec.ts`, `community-survey-detail.e2e-spec.ts`): NOT run.** `api/.env.test` does not exist in this worktree and no secrets were created. The CI `e2e` job is the gate for these two specs. The e2e files were only compiled indirectly (not type-checked by `npm run typecheck`); they are unverified until CI.
- **`npm run format:check`** reports one warning on `.claude/settings.local.json` (a git-ignored local file, not part of this plan). All files changed by this plan pass Prettier; `docs/technical/api-contract-v1.md` is not in the format script's scope (`.ts/.tsx/.json`) and Prettier would also reformat it, as it did before this change, so it was left as is.
- `npm run test:unit` for the whole repo was not run; the plan's verification covered the two API specs, the package coverage and the gates above.

## CI impact

Editing `packages/**` triggers the `native-android` and `native-ios` jobs (path filter in `ci.yml`) plus `image-check`/`build`. Expected CI cost, not a blocker.

## Deviations from Plan

None. The plan was executed as written.

## Known edge (documented, not changed)

Both history queries return the oldest rows (`ORDER BY ... ASC LIMIT`, 20). A parcel with more than 20 surveys would lose its newest ones. Not reachable with current data (RESEARCH Open Question 2).

## Known Stubs

None.

## Threat Flags

None. The new column is already exposed by the community detail top level and the public map; filters and parameters are unchanged (T-24-01 mitigated by the parameter assertions).

## Self-Check: PASSED

Commits `ef04a8ae` and `36391c1f` exist; all nine files in `files_modified` were changed.
