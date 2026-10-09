---
phase: 25-global-search
plan: 02
subsystem: search
tags: [i18n, catalogue, local-storage, local_meta, recent-searches]
requires: []
provides:
  - "fr.search catalogue module (searchFr) with every text of the search page"
  - "Recent searches store in local_meta (loadSearchRecents, saveSearchRecent, removeSearchRecent, clearSearchRecents)"
  - "clearLocalIbpData also deletes search_recents"
affects: [25-03, 25-04, 25-05, 25-06, 25-07, 25-08]
tech-stack:
  added: []
  patterns: ["best-effort local_meta key/value store", "destructured count arguments for the catalogue Proxy test"]
key-files:
  created:
    - mobile/src/i18n/fr/search.ts
    - mobile/src/i18n/fr/search.test.ts
    - mobile/src/storage/search-recents.ts
    - mobile/src/storage/search-recents.sqlite.test.ts
  modified:
    - mobile/src/i18n/fr/index.ts
    - mobile/src/i18n/catalogue.test.ts
    - mobile/src/storage/surveys.ts
key-decisions:
  - "Count arguments are destructured: rows.memberMeta({ count }), announce.results({ count })"
  - "rows.parcelMeta({ commune, code, surveyCount }) with commune and surveyCount nullable; unknown commune reads 'Commune {code}'"
  - "Guillemets use ordinary spaces, as the existing catalogue does (not non-breaking spaces)"
  - "No SQLite migration: PRAGMA user_version stays 5"
metrics:
  tasks: 2
  files: 7
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 02: Catalogue and recent searches Summary

The `fr.search` catalogue module with every text of the search page, and the phone-local recent searches store in `local_meta` (max 8, case-insensitive de-duplication), cleared with the rest of the local data.

## Tasks and commits

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Catalogue module fr.search | ba39eece |
| 2 | Recent searches in local_meta, cleared with the local data | c4003634 |

## What was built

- `mobile/src/i18n/fr/search.ts`: `searchFr` (`as const`) with the UI-SPEC structure (`field`, `groups`, `best`, `seeAll`, `seeAllA11y`, `rows`, `start`, `noResult`, `offline`, `error`, `loading`, `announce`, `list`). Registered as `search: searchFr` in `fr`; `"search"` added to the catalogue test's key list.
- `mobile/src/storage/search-recents.ts`: `SEARCH_RECENTS_KEY = "search_recents"`, `SEARCH_RECENTS_MAX = 8`, and four best-effort async functions. Defensive parse (invalid JSON, non-array, non-string entries). Queries are trimmed with inner whitespace collapsed; under 2 characters is ignored.
- `clearLocalIbpData` deletes `search_recents` in the same transaction (`key IN (?, ?, ?)`), so a logout purge or owner change never leaks searches to the next account (T-25-03).

## Notes for the next plans

- Signatures: `memberMeta({ count })`, `announce.results({ count })`, `seeAll({ count, capped })`, `parcelMeta({ commune: string | null, code, surveyCount: number | null })`, `placeMeta({ kind, context: string | null })`, `list.title({ group, count })`; the others take a single string (`noResult.title(query)`, `start.recentOpenA11y(query)`, `error.retryA11y(group)`, ...) or `{ title, meta }` / `{ name, meta }`.
- `rows.placeKind` has keys `municipality`, `locality`, `street`, `address`, `other`; map the wire `SearchPlaceKind` onto them.
- The recents writers return the new list (`saveSearchRecent`, `removeSearchRecent`), so a screen can set its state from the result. On a storage failure they return `[]` rather than throwing.
- `saveSearchRecent` does not decide when to save (Return or opening a result, U-14): that is the screen's call.
- `fr.surveyList.search` was not touched (its old keys go with the old page in plan 25-14).

## Deviations from Plan

### Minor

**1. Spaces inside guillemets.** The plan says non-breaking spaces "as in the existing catalogue". The existing catalogue (`survey-list.ts`) in fact uses ordinary spaces, so the new module does too, which also matches the behaviour examples of the plan (`Aucun résultat pour « marie »`). No functional impact.

RED/GREEN was done within each task (tests and implementation written together, one `feat` commit per task), as in plan 25-01.

## Verification

- `cd mobile && npx jest --config jest.unit.config.js src/i18n src/__checks__ src/storage`: 35 suites, 481 tests pass (includes `catalogue-dash`, `surveys.transactions.sqlite`, `local-owner.sqlite`).
- `npx tsc --noEmit` in `mobile`, `npm run lint`, `npm run typecheck`: exit 0. Prettier check passes on `mobile/src/i18n` and `mobile/src/storage`.
- All acceptance greps hold (`search: searchFr`, `"search",` in the catalogue test, the three copy strings, no U+2014, the two constants, `key IN (?, ?, ?)`, zero `user_version` in `search-recents.ts`).
- `npm run format:check` over the whole repository was not run; Prettier was checked on the touched directories (plan 25-01 noted a pre-existing unrelated report on `.claude/settings.local.json`).

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: mobile/src/i18n/fr/search.ts, search.test.ts, mobile/src/storage/search-recents.ts, search-recents.sqlite.test.ts
- FOUND commits: ba39eece, c4003634
