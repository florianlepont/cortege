---
phase: 30-route-choice-assistant-inserted-v1
plan: 03
subsystem: ibp-domain
tags: [route-record, survey-route, validator, canonical-form, wire-types]
requires: [30-02]
provides:
  - "Recorded route (SurveyRoute) constants, unions, guards, canonical form, validator and reader in @cortege/ibp-domain"
  - "ROUTE_REQUIRED_CODE and the P-2 client marker (X-Cortege-Features: survey_route)"
  - "survey_route optional nullable field on the four survey wire types"
affects: [30-05, 30-06, 30-07, 30-08, 30-10, 30-16]
key-files:
  created:
    - packages/ibp-domain/src/route/record.ts
    - packages/ibp-domain/src/route/record.test.ts
    - packages/ibp-domain/src/route/index.ts
    - packages/ibp-domain/src/contract/route.ts
  modified:
    - packages/ibp-domain/src/contract/survey.ts
    - packages/ibp-domain/src/contract/sync.ts
    - packages/ibp-domain/src/contract/public-map.ts
    - packages/ibp-domain/src/contract/index.ts
    - packages/ibp-domain/src/index.ts
decisions:
  - "Validator is strict on canonical form: unsorted uncapped_factors and unrounded surfaces or hours are issues, because the server stores and compares without reformatting (spec section 8)"
  - "UNCAPPABLE_FACTORS is typed readonly Exclude<FactorKey, 'H'>[] (narrower than FactorKey[]) so UncappableFactor excludes H at type level"
  - "A null complement on a partial route is route_complement_invalid; on the full parcours any defined complement is route_complement_unexpected"
metrics:
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 03: Recorded route in the shared package Summary

The recorded route ("Parcours utilisé", D-08 as revised) now has one home in `@cortege/ibp-domain`: constants and derived unions, the `SurveyRoute` wire type, a canonical form, a validator that returns codes (an absent record is `route_missing`), a tolerant reader, the `route_required` API code and the P-2 client marker, and `survey_route` as an optional nullable field on the survey wire types. Coverage of the package stays at 100 %.

## Validated decisions and open points applied

- Spec validated 2026-10-14 (30-02), no deviation recorded at the gate: every constant keeps its spec value (`ROUTE_SURFACE_MAX_HA` 5000 ha, `ROUTE_HOURS_MAX` 24 h, `ROUTE_RECORD_MAX_BYTES` 4096, 2 decimals).
- D-08 as revised, O-14 (only `full`, `partial_strip`, `partial_plot`; no group name, no sample total), O-18 (no objective answer), O-19 (route mandatory: absent record is an issue), O-15 (`survey_route` on the community detail), U-O11 (5000 ha).
- P-2 default: `CLIENT_FEATURES_HEADER = "X-Cortege-Features"`, `SURVEY_ROUTE_CLIENT_FEATURE = "survey_route"`, defined once here for the API (30-10) and the phone (30-16).
- P-1, P-3 and P-4 do not touch this plan.

## Tasks and commits

| Task | Commit | Content |
|------|--------|---------|
| 1 | b4b14599 | `route/record.ts` constants, unions, guards, `ROUTE_REQUIRED_CODE`, client marker; `contract/route.ts`; `survey_route` on `SurveyUpsertPayload`, `SurveyDetail`, `SyncChangeSurvey`, `CommunitySurveyDetail` (PATCH untouched); `route/index.ts` barrel and `export * from "./route"` |
| 2 | dcffc4d3 | `SURVEY_ROUTE_ISSUE_CODES`, `canonicalSurveyRoute`, `validateSurveyRoute`, `readSurveyRoute` with tests |

## API for later plans

- Issue codes (reported once each, in this order): `route_missing`, `route_not_object`, `route_too_large`, `route_version_invalid`, `route_method_invalid`, `route_counting_invalid`, `route_zone_invalid`, `route_uncapped_factors_invalid`, `route_uncapped_factors_unexpected`, `route_complement_missing`, `route_complement_unexpected`, `route_complement_invalid`, `route_guide_invalid`, `route_answers_invalid`.
- `canonicalSurveyRoute` is idempotent; the phone applies it before storage. `readSurveyRoute(value)` returns the canonical record or null and never throws.
- The size check measures UTF-16 units of `JSON.stringify` (commented; the record holds no free text so bytes agree for the database CHECK of 30-07).
- The route barrel is `packages/ibp-domain/src/route/index.ts`; 30-05 adds `guide.ts` there without touching `src/index.ts`.

## Verification

- `npm run test:coverage:domain`-equivalent (`npm --workspace @cortege/ibp-domain run test:coverage`): 11 suites, 341 tests, 100 % statements, branches, functions and lines; `jest.config.js` unchanged.
- `npm run lint`: green. `npm run typecheck`: green (package, mobile, api build).
- Mobile unit tests: 409 suites, 5968 tests green. Package unit tests green.
- `npm run format:check`: only `.claude/settings.local.json` is flagged (untracked tool config, not part of this plan, not touched). All plan files pass Prettier.
- `npm run test:unit` reports `api/test/check-env-parity.spec.ts` failing (50 tests): known Mac issue (bash 3.2, CI runs it with bash 4), unrelated to this plan.

## Deviations from Plan

None - plan executed exactly as written. Two interpretation choices inside the plan's latitude, listed under `decisions`: strictness of the validator on canonical form (sorted factors, rounded numbers, as the spec table requires "triée" and "2 décimales") and the narrower `UNCAPPABLE_FACTORS` type.

## Known Stubs

None.

## Threat Flags

None. T-30-05 (size and shape checks), T-30-06 (no free text, unknown keys dropped) and T-30-07 (idempotent canonical form) are mitigated in the package; server enforcement follows in 30-07 and 30-10.

## Self-Check: PASSED

- Files found: `route/record.ts`, `route/record.test.ts`, `route/index.ts`, `contract/route.ts`.
- Commits found: b4b14599, dcffc4d3.
