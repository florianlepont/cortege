---
phase: 25-global-search
plan: 13
subsystem: api
tags: [search, controller, throttle, dto, e2e, api-contract]
requires:
  - "25-05 (SearchService.community)"
  - "25-06 (GeocoderService.searchPlaces)"
  - "25-10 (ParcelSearchService.search)"
provides:
  - "GET /v1/search/community, /v1/search/places, /v1/search/parcels (SearchController, AuthGuard)"
  - "search throttle kind (PRODUCTION_THROTTLE_LIMITS.search = 240) and SEARCH_THROTTLE"
  - "SearchCommunityQueryDto, SearchPlacesQueryDto, SearchParcelsQueryDto"
  - "api/test/search.e2e-spec.ts (CI gate)"
  - "Search (phase 25) section of api-contract-v1.md"
affects: [25-14, 25-15]
tech-stack:
  added: []
  patterns: ["delegation-only controller with per-handler @Throttle(SEARCH_THROTTLE)", "e2e app built with configureApp so the global ValidationPipe is active"]
key-files:
  created:
    - api/src/surveys/dtos/search-query.dto.ts
    - api/src/surveys/search.controller.ts
    - api/test/search.controller.spec.ts
    - api/test/search.e2e-spec.ts
  modified:
    - api/src/common/rate-limit.config.ts
    - api/test/rate-limit.config.spec.ts
    - api/src/surveys/surveys.module.ts
    - docs/technical/api-contract-v1.md
key-decisions:
  - "SEARCH_THROTTLE overrides the default throttler of the three handlers (same mechanism as SYNC_THROTTLE and UPLOAD_THROTTLE); the per-IP ceiling still applies"
  - "The e2e spec builds its own app with configureApp (prefix and ValidationPipe) because createE2eApp from the shared helper has no validation pipe, so the 400 cases could not be asserted with it"
  - "Places limit defaults to 10 in the controller; the services keep their own clamps"
requirements-completed: [REQ-B-global-search]
metrics:
  tasks: 3
  files: 8
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 13: Search endpoints over HTTP Summary

The three search endpoints are live behind the auth guard with their own `search` throttle (240 per minute per client in production), validated query DTOs, the module wiring, an end-to-end spec and the API contract section.

## Tasks and commits

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Throttle kind, DTOs, SearchController and module wiring | 093beba2 |
| 2 | End-to-end spec of the three endpoints | 523a2c09 |
| 3 | API contract section for the search | 8e17a5ec |

## What was built

- `rate-limit.config.ts`: `search: 240` in `PRODUCTION_THROTTLE_LIMITS`, `SEARCH_THROTTLE` exported next to `UPLOAD_THROTTLE`; spec extended (production value, `kinds` list, `SEARCH_THROTTLE` shape).
- `search-query.dto.ts`: `q` is `@IsString @MinLength(2) @MaxLength(100)` on all three; community adds `author` (max 100) and `limit` 1..50; places adds `limit` 1..10.
- `SearchController` (`@Controller("search")`, `@UseGuards(AuthGuard)`): `community` passes `user.id`, `places` calls `searchPlaces(q, limit ?? 10)`, `parcels` calls `search(q)`; three `@Throttle(SEARCH_THROTTLE)`. The unit spec checks delegation and, through Nest metadata, the guard, the paths and the throttle override of each handler.
- `surveys.module.ts`: `SearchController` plus `SearchService`, `GeocoderService`, `ParcelSearchService` registered.
- `search.e2e-spec.ts`: 401 on the three routes; 400 for missing, 1-character and 101-character `q` on each route, `author` over 100, community `limit` 0 and 51, places `limit` 0 and 11; community accents and case, literal `%` and `_`, draft and deleted surveys absent, members with `survey_count` and only `author_name`/`survey_count` keys (no id or email), `author` filter (members empty), the caller excluded from surveys and members; places `{ items: [] }` under the synthetic provider; parcels found by section and number and by key (centroid, `survey_count` at least 1), a draft not counted, `hello world` gives `{ items: [] }`.
- `api-contract-v1.md`: "Search (phase 25)" subsection with the three endpoints, parameters, rules, JSON examples, errors and the throttle; `search_provider_unavailable` (503) in the business codes and `503` in the status list; the old community search now reads "ignoring case and accents". No em dash added.

## Verification

- `cd api && npx jest --config jest.unit.config.js test/rate-limit.config.spec.ts test/search.controller.spec.ts`: pass (15 tests). `npm --workspace api run build`: exit 0.
- `npm run test:coverage:api`: 44 of 45 suites pass; the only failure is `check-env-parity.spec.ts` (macOS bash 3.2 `declare -A`, known and unrelated). `search.controller.ts` is at 100%.
- `npm run lint` and `npm run typecheck`: exit 0 (the e2e spec is linted and type-checked by them). Prettier is clean on every `.ts` file of this plan (whole-repo `format:check` not run: it reports the git-ignored `.claude/settings.local.json`).
- Acceptance greps: `search: 240`, `export const SEARCH_THROTTLE`, 3 `@Throttle(SEARCH_THROTTLE)`, `SearchController` and `ParcelSearchService` in the module, `/v1/search/community|places|parcels` and `author=` in the e2e spec, 3 `.expect(401)`, the four contract greps, "ignoring case and accents", 0 added em dash: all hold.

## E2E did NOT run locally

`search.e2e-spec.ts` was written, linted and type-checked but never executed here. Docker Desktop was started and answers, but no container was running and `api/.env.test` does not exist; the session's permission rules refused every command that reads or copies `api/.env.test.example` or creates `api/.env.test`, so the test database could not be configured, and I did not work around that. The CI `e2e` and `e2e-minio` jobs are the gate. Unverified expectations that CI will confirm:

- The three SQL builders of plan 25-10 and the community SQL of 25-05 run for the first time against PostgreSQL here (including PostgreSQL 16 `unaccent` on `é`, `ê`, `É` and `è`; the `oe`/`ae` ligature assumption A7 of 25-05 is not exercised by this spec).
- `PATCH /v1/users/me { display_name }` is used to give the author an accented display name; `DELETE /v1/surveys/:id` answers 204.
- The parcel key search relies on `CadastreProviderService.lookupParcelByKey` behaving under the synthetic provider so that the database fallback answers; the spec accepts either a null result or a thrown one (both end in the database item, a 200).

## Deviations from Plan

None in scope. One implementation note: the plan reads the helpers of `community-surveys.e2e-spec.ts`, but `createE2eApp` does not install the global `ValidationPipe`, so the spec builds the Nest app itself with `configureApp` (as `surveys-upsert-cas.e2e-spec.ts` does) to be able to assert the 400 cases; other helpers (`loginTestUser`, `uniqueId`, `uniqueCoordSeed`, `getNextVersionNumber`, `validDirectFactors`) are reused. `resolveParcel` was not reused because the spec needs `section`, `number` and `commune_code` of the resolved parcel; it calls `/v1/parcels/resolve` directly.

## Notes for the next plans

- 25-14 and 25-15: the phone can call the endpoints as 25-07 describes. `q` below 2 characters is a 400 on the server, so the client must not call below the threshold (the places service also answers `[]` under 3 characters). The `author` call must still send a `q` of at least 2 characters (it is ignored server-side).
- 25-15 (docs): the API contract section is done; CLAUDE.md still needs the module-table and env-table updates (`GEOCODING_IGN_SEARCH_URL`, the new controller/services), and the search text may appear in the host Caddy access log (T-25-39, accepted, no API log).
- The `search` throttle replaces the default budget on these routes, so search traffic does not consume the 600 per minute default budget.

## Known Stubs

None.

## Threat Flags

None. T-25-35 (guard on the controller, 401 asserted by the e2e), T-25-36 (per-handler throttle), T-25-37 (DTO limits, 400 cases asserted) and T-25-38 (no draft, deleted or own data, no id/email on members) are mitigated as planned; the e2e assertions are pending the CI run.

## Self-Check: PASSED (e2e not run)

- FOUND: api/src/surveys/search.controller.ts, api/src/surveys/dtos/search-query.dto.ts, api/test/search.controller.spec.ts, api/test/search.e2e-spec.ts, docs/technical/api-contract-v1.md section "Search (phase 25)"
- FOUND commits: 093beba2, 523a2c09, 8e17a5ec
- NOT RUN: `api/test/search.e2e-spec.ts` (no test database configurable locally); the CI `e2e` and `e2e-minio` jobs are its gate
