---
phase: 27-quick-survey-additions-inserted-v1
plan: 15
subsystem: mobile-ui
tags: [survey-note, parcel-history, global-search, own-surveys, offline, accessibility]
requires: ["27-02", "27-03", "27-07"]
provides:
  - "ParcelSurveyHistoryItem.survey_note and HistoryEntry.note (trimmed, blank gives null) for the own and community histories"
  - "HistoryList: one truncated note meta line and ', note : <text>' on the row label"
  - "OwnSurveyMatch and matchOwnSurveys(surveys, query, notesById): name first, else note, with the note-only flag matchedInNote"
  - "fr.search.rows.matchedInNoteMeta / matchedInNoteA11y: 'Trouvé dans la note' after the date line and at the end of the sentence"
  - "useOwnSurveyNotes(active, surveys): own notes map, read through listLocalSurveyNotes only while a search is active"
affects: [27-16, 27-19, 27-21]
tech-stack:
  added: []
  patterns: ["notes read in one SQL statement only while the search is active, keyed on the surveys' id:updated_at signature, stale answers dropped", "a note-only match is a flagged copy of the LocalSurvey, a name match is the survey itself"]
key-files:
  created:
    - mobile/src/hooks/useOwnSurveyNotes.ts
    - mobile/src/hooks/useOwnSurveyNotes.test.ts
  modified:
    - mobile/src/app/types.ts
    - mobile/src/app/parcel-history.ts
    - mobile/src/app/parcel-history.test.ts
    - mobile/test/parcel-history-fixtures.ts
    - mobile/src/screens/survey-detail/HistoryList.tsx
    - mobile/src/screens/survey-detail/HistoryList.test.tsx
    - mobile/src/app/global-search.ts
    - mobile/src/app/global-search.test.ts
    - mobile/src/screens/global-search/result-labels.ts
    - mobile/src/screens/global-search/result-labels.test.ts
    - mobile/src/screens/global-search/SearchGroupListScreen.tsx
    - mobile/src/screens/global-search/SearchResults.tsx
    - mobile/src/screens/survey-list/CompactSurveyRow.tsx
    - mobile/src/screens/survey-list/CompactSurveyRow.test.tsx
    - mobile/src/screens/survey-list/SurveyRow.tsx
    - mobile/src/screens/survey-list/SurveyRow.test.tsx
    - mobile/src/i18n/fr/search.ts
    - mobile/src/i18n/fr/catalogue-additions-27.test.ts
    - mobile/src/hooks/useGlobalSearch.ts
    - mobile/src/hooks/useGlobalSearch.test.ts
    - mobile/src/navigation/routes/SearchGroupRoute.tsx
    - mobile/src/navigation/routes/SearchGroupRoute.test.tsx
    - mobile/src/state/render-counts.test.tsx
key-decisions:
  - "D-06: a history row shows the note as its last meta line, one line, tail truncation, no weather and no doubt"
  - "D-07: the own-survey search matches the note on the phone only; the API community search is untouched"
  - "The hint separator is the middle dot already used by the date meta: 'Brouillon · 5 oct. · Trouvé dans la note'"
patterns-established:
  - "OwnSurveyMatch flows from matchOwnSurveys to the best-result card, the summary rows and the full list without a second type"
requirements-completed: []
duration: 55 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 15: Note in the parcel history and the own-survey search Summary

The survey note now shows on its row of the parcel history (own and community) and is searchable among the observer's own surveys, on the phone, with a calm "Trouvé dans la note" hint when the note and not the name was the reason. SQLite stays at 5 and the survey list never reads notes.

## What was built

- **History (D-06, UI-SPEC 3.4)**: `survey_note?: string | null` on `ParcelSurveyHistoryItem`; `HistoryEntry.note` filled by both builders through one `noteOrNull` (trimmed, blank or non-text gives null). `HistoryList` adds one `Text` (`surveyCardMeta`, `numberOfLines={1}`, tail) after the existing meta lines and appends `, note : <text>` to the label of both the current and the other rows. A row without a note renders exactly the previous elements; the row stays one press target.
- **Match (D-07, UI-SPEC 3.5)**: `matchOwnSurveys(surveys, query, notesById = EMPTY)` keeps input order, matches the name first (survey returned as is), else the folded note (copy flagged `matchedInNote: true`). Under `SEARCH_MIN_LENGTH` it returns `[]`; without the third argument it is the previous function.
- **Hint**: `ownSurveyLabels` (best-result card) adds the hint to the meta and the spoken sentence. The rows people actually see, `CompactSurveyRow` (search summary and Accueil recents) and `SurveyRow` (the "Voir les N" list), carry it too, on the date line and in the label.
- **Loading**: `useOwnSurveyNotes(active, surveys)` reads `listLocalSurveyNotes()` only while active, once, again when the `id:updated_at` signature changes, drops stale answers, forgets the notes when the search closes, and falls back to an empty map (logged through `logStatusDetail`) on a read failure. `useGlobalSearch` and `SearchGroupRoute` (`group === "mine"` and query of two characters or more) pass the map to `matchOwnSurveys`, so the best result, the groups, the "Voir les N" list and its count all include note matches.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 2f7797eb | feat(27-15): show the survey note on the parcel history rows |
| 2 | bdddbd4a | feat(27-15): match own surveys on their note and say when the note was the reason |
| 2 (fix) | 487eebcd | fix(27-15): take the note-hint wording from the catalogue |
| 3 | c70f1f66 | feat(27-15): search the notes of the own surveys while a search is active |

## Verification

- Task verify commands (history, global-search and result labels, hooks and routes) pass.
- `npm --workspace mobile run test:unit:coverage`: 342 suites, 4652 tests pass, coverage thresholds hold.
- `npm --workspace mobile run lint`, `npm run typecheck` clean; `npm run format:check` reports only the untracked local `.claude/settings.local.json`.
- `grep -c listLocalSurveyNotes mobile/src/hooks/useSurveyList.ts` prints 0. Source gates (`structure`, `abbreviations`, `catalogue-dash`, `layers`, `motion`, `icons`, `fonts`) pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] The hint must reach the rows people see**
- **Found during:** Task 2
- **Issue:** Only `ownSurveyLabels` (used by the best-result card) was in the plan, but the summary rows and the full list render `CompactSurveyRow` and `SurveyRow`, which never call it. Without a change there, a survey found by its note would sit in the list with no visible reason, exactly what must-have truth 3 and U-13 want to avoid.
- **Fix:** `CompactSurveyRow` and `SurveyRow` take `survey: OwnSurveyMatch` and add the same hint to their date line and label; the `mine` prop types in `SearchResults` and `SearchGroupListScreen` and `useGlobalSearch.mine` became `OwnSurveyMatch`. Tests added for both rows.
- **Files modified:** `CompactSurveyRow.tsx/.test.tsx`, `SurveyRow.tsx/.test.tsx`, `SearchResults.tsx`, `SearchGroupListScreen.tsx` (outside the plan's `files_modified`).
- **Commit:** bdddbd4a

**2. [Rule 1 - Bug] User-facing literals in components broke the structure gate**
- **Found during:** Task 2, after the first commit
- **Issue:** the template strings joining the hint to the date line and the label failed `structure.test.ts` (no user-facing literal outside `src/i18n`).
- **Fix:** `fr.search.rows.matchedInNoteMeta(meta)` and `matchedInNoteA11y(sentence)` in the catalogue (tested in `catalogue-additions-27.test.ts`); rows and labels call them.
- **Commit:** 487eebcd

**3. [Rule 3 - Blocking] Render-count harness has no storage**
- **Found during:** Task 3 full coverage run
- **Issue:** `render-counts.test.tsx` mounts the real `SearchGroupRoute`, whose new hook called an unmocked `listLocalSurveyNotes`.
- **Fix:** the harness stubs `useOwnSurveyNotes` with a static empty map, like its other idle search hooks. No expected count changed.
- **Commit:** c70f1f66

### Choices within the plan's latitude

- The plan said the meta ends with `" " + "Trouvé dans la note"` "(separator as the module uses)". The module's separator is the middle dot of `updatedMeta`, so the meta reads `Brouillon · 5 oct. 10:00 · Trouvé dans la note`.
- As in earlier plans, the tests were written alongside the code in one pass rather than as separate RED commits for the `tdd="true"` tasks.

## Known Stubs

None.

## Threat Flags

None. T-27-50: note matching runs over `local_surveys` on the phone only, `searchCommunity` is unchanged. T-27-51: the history renders the `survey_note` the server returns (submitted-only predicate is plan 27-17). T-27-52: one SQL read with `json_extract` while the search is active, cached until the survey signature changes, covered by `useOwnSurveyNotes.test.ts`.

## Self-Check: PASSED

- Files present: `mobile/src/hooks/useOwnSurveyNotes.ts`, `mobile/src/hooks/useOwnSurveyNotes.test.ts`
- Commits present in `git log`: 2f7797eb, bdddbd4a, 487eebcd, c70f1f66
- Acceptance greps: `survey_note?: string | null` in `types.ts`, `noteA11y` in `HistoryList.tsx`, `export type OwnSurveyMatch` and `notesById` in `global-search.ts`, `matchedInNote` in `result-labels.ts`, `useOwnSurveyNotes` in `useGlobalSearch.ts` and `SearchGroupRoute.tsx`
- STATE.md and ROADMAP.md diffs limited to this plan's progress
