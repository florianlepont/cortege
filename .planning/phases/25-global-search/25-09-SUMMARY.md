---
phase: 25-global-search
plan: 09
subsystem: mobile-search-ui
tags: [search, components, labels, i18n, accessibility]
requires: ["25-01", "25-02"]
provides:
  - "SearchGroupNotice: loading, offline and error lines of a network group"
  - "SearchGroupCard: group header with 'Voir les N' and the glass shell with hairlines"
  - "SearchBestResult: 'Meilleur résultat' card"
  - "result-labels: memberLabels, placeLabels, parcelLabels, ownSurveyLabels, communitySurveyLabels, bestResultLabels"
affects: [25-11, 25-12]
tech-stack:
  added: []
  patterns: ["pure label module shared by summary page and full lists", "catalogue-only texts, technical detail never shown"]
key-files:
  created:
    - mobile/src/screens/global-search/SearchGroupNotice.tsx
    - mobile/src/screens/global-search/SearchGroupNotice.test.tsx
    - mobile/src/screens/global-search/SearchGroupCard.tsx
    - mobile/src/screens/global-search/SearchGroupCard.test.tsx
    - mobile/src/screens/global-search/SearchBestResult.tsx
    - mobile/src/screens/global-search/SearchBestResult.test.tsx
    - mobile/src/screens/global-search/result-labels.ts
    - mobile/src/screens/global-search/result-labels.test.ts
  modified: []
key-decisions:
  - "Notice group type is SearchNoticeGroup (community | places | parcels), exported from SearchGroupNotice.tsx; the loading line carries testID search-loading-<group>"
  - "A zero survey_count leaves out the survey suffix of a parcel meta (parcelMeta receives surveyCount: null)"
  - "ownSurveyLabels meta is '<status> <updatedMeta>' built from the existing Mes Relevés catalogue entries"
metrics:
  tasks: 3
  files: 8
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 09: Page blocks and result labels Summary

Presentational blocks around the search rows (group notice lines, glass group card with "Voir les N", "Meilleur résultat" card) plus one pure module that gives every result type its title, meta and accessibility sentence from the catalogue.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | SearchGroupNotice and SearchGroupCard | 1a6d59f2 |
| 2 | SearchBestResult card | e0033aeb |
| 3 | Result labels for every result type (pure) | ec992b88 |

Tasks 1 and 2 were committed by the interrupted executor; task 3 files were present but uncommitted. They were reviewed against the plan (all five label functions plus `bestResultLabels`, zero-count handling, catalogue-only texts), found complete and correct, verified and committed unchanged.

## Verification

- `npx jest --config jest.unit.config.js src/screens/global-search src/__checks__ src/i18n`: 14 suites, 181 tests pass
- All acceptance greps of the three tasks pass; no `ForestCard`, no hex or `rgba(` literal in the three components
- `npm run lint`, `npm run typecheck` exit 0; Prettier check clean on all files of `mobile/src/screens/global-search`

## Deviations from Plan

None. Plan executed as written. The only recovery step was the interruption: task 3 was verified rather than rewritten.

## Interfaces for 25-11 and 25-12

- `SearchGroupNotice { group: "community" | "places" | "parcels"; variant: "loading" | "offline" | "error"; error?: "rateLimited" | "failed" | null; onRetry? }` (type `SearchNoticeGroup`); testIDs `search-loading-<g>`, `search-offline-<g>`, `search-retry-<g>`
- `SearchGroupCard { group: SearchGroupKey; seeAll?: { count; capped; onPress } | null; children }`; testIDs `search-group-<g>`, `search-see-all-<g>`; separators are inserted between non-null children, so pass rows or a notice as children
- `SearchBestResult { kind: "mine" | "community" | "member" | "place" | "parcel"; title; meta; trailing?; onPress }`; testID `search-best-result`; place and parcel add the static contour strip and "Voir sur la carte"
- `result-labels`: the five functions return `{ title, meta, accessibilityLabel }`; `bestResultLabels(best)` returns `{ kind, title, meta }` for `SearchBestResult` (spread `kind` straight into the card). Use the same functions for the rows so the summary and full lists read identical words
- No entrance animation in these blocks; the page owns any list entrance

## Known Stubs

None.

## Threat Flags

None. Error lines show catalogue sentences only (T-25-23).

## Self-Check: PASSED

All eight files exist; commits 1a6d59f2, e0033aeb and ec992b88 are in the log.
