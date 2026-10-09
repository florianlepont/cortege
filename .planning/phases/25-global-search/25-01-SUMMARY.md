---
phase: 25-global-search
plan: 01
subsystem: search
tags: [ibp-domain, wire-types, search, accent-folding, pure-rules]
requires: []
provides:
  - "Search wire types in @cortege/ibp-domain (SearchMemberItem, SearchCommunityResponse, SearchPlaceKind, SearchPlaceItem, SearchPlacesResponse, SearchParcelItem, SearchParcelsResponse)"
  - "foldSearchText, normalizeSearchQuery (mobile/src/app/search-text.ts)"
  - "Pure search rules (mobile/src/app/global-search.ts)"
affects: [25-02, 25-03, 25-04, 25-05, 25-06, 25-07, 25-08]
tech-stack:
  added: []
  patterns: ["types-only contract file", "NFD fold with explicit fallback table"]
key-files:
  created:
    - packages/ibp-domain/src/contract/search.ts
    - mobile/src/app/search-text.ts
    - mobile/src/app/search-text.test.ts
    - mobile/src/app/global-search.ts
    - mobile/src/app/global-search.test.ts
  modified:
    - packages/ibp-domain/src/contract/index.ts
key-decisions:
  - "D-14 implemented (member before place); UI-SPEC section 3a order is superseded"
  - "global-search imports LocalSurvey from ../storage/types (type only) so tests do not load SQLite"
  - "Fallback fold table is chosen at module load by detecting whether 'é' normalises to length 2"
metrics:
  tasks: 3
  files: 6
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 01: Search contract and pure rules Summary

Seven search wire types in the shared package, an accent-folding helper safe on a runtime without NFD, and the pure presentation rules of the global search (own-survey match, parcel gate, member match, D-14 best result, group order, three-row summaries), all fully unit tested.

## Tasks and commits

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Search wire types in the shared package | 18a1121b |
| 2 | Accent folding and query normalisation | 5f7e039d |
| 3 | Pure search rules (global-search) | 7c790cb5 |

## What was built

- `packages/ibp-domain/src/contract/search.ts`: types only, re-exported by `contract/index.ts` (and so by the package entry). `SearchMemberItem` carries only `author_name` and `survey_count` (T-25-01 mitigation, D-17).
- `mobile/src/app/search-text.ts`: `foldSearchText` (NFD, combining marks stripped with a `̀-ͯ` class, oe/ae ligatures, lowercase; fallback table for the fixture letters when the runtime cannot decompose) and `normalizeSearchQuery`.
- `mobile/src/app/global-search.ts`: constants (`SEARCH_MIN_LENGTH` 2, `PLACES_MIN_LENGTH` 3, `SUMMARY_ROW_COUNT` 3, `PLACE_CONFIDENCE_MIN` 0.85, `COMMUNITY_RESULT_LIMIT` 50, `PLACES_RESULT_LIMIT` 10, `PARCELS_RESULT_LIMIT` 10), `isSearchActive`, `matchOwnSurveys`, `looksLikeParcelQuery`, `memberMatches`, `pickBestResult`, `groupOrder`, `isCapped`, `summaryRows`, `communitySummary`; types `SearchGroupKey`, `BestResult`, `BestResultInput`, `Summary`, `CommunityRow`, `CommunitySummary`.

## Notes for the next plans

- `pickBestResult` takes one object `{ query, parcels, members, places, mine, community }`; `summaryRows(items, promoted)` compares by identity, so pass the same object references the best result holds.
- `summaryRows` returns `{ rows, total, hasMore }`; `communitySummary` adds `capped` and rows tagged `member` or `community`.
- `memberMatches` is the only member filter on the phone; the server is expected to return members whose names contain the text and the phone decides promotion.
- Editing `packages/**` triggers the native CI jobs (`native-android`, `native-ios`) and `image-check`; a CI cost only.
- `npm run format:check` reports `.claude/settings.local.json` (pre-existing, untracked tooling file, not part of this plan).

## Deviations from Plan

None. The plan was executed as written. RED/GREEN was done within each task (tests written with the implementation) and committed as one `feat` commit per task, as the plan asks for per-task commits.

## Verification

- `npm --workspace @cortege/ibp-domain run test:coverage`: 230 tests, 100 percent.
- `npm run typecheck`: passes. `npm run lint`: passes.
- Mobile unit suite: 268 suites, 3430 tests pass. `global-search.ts` and `search-text.ts`: 100 percent statements, branches, functions and lines.
- Prettier check passes on all files of this plan.
- All acceptance greps hold (no runtime export in `search.ts`, no `p{` in `search-text.ts`, `ÿ` in the test file, `PLACE_CONFIDENCE_MIN = 0.85`, `@cortege/ibp-domain` import).

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: packages/ibp-domain/src/contract/search.ts, mobile/src/app/search-text.ts, search-text.test.ts, global-search.ts, global-search.test.ts
- FOUND commits: 18a1121b, 5f7e039d, 7c790cb5
