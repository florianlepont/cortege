---
phase: 29-private-or-public-before-submission-inserted-v1
plan: 02
subsystem: mobile
tags: [sqlite, offline-first, visibility, privacy, sync-queue]
status: complete
requires:
  - phase: 29-01
    provides: "server-side shared-only predicate, migration 024 backfill (the pull of the backfill is proved here)"
provides:
  - "New drafts stored with visibility 'public' (column, payload, queued upsert, returned survey)"
  - "updateLocalDraft keeps the stored visibility; UpdateDraftInput has no visibility field"
  - "queueSurveyVisibilityChange returns { changed, frozen }; updateSurveyVisibility result gains frozen"
  - "A draft write path (autosave, flush, wizard finalisation, save edits, patcher) that never carries visibility"
affects: [29-05, 29-07]
tech-stack:
  added: []
  patterns:
    - "Only the visibility queue path (and the pull) can change a stored visibility; every draft write keeps it"
key-files:
  created:
    - mobile/src/storage/surveys.visibility.sqlite.test.ts
  modified:
    - mobile/src/storage/surveys.ts
    - mobile/src/storage/types.ts
    - mobile/src/storage/sync.ts
    - mobile/src/storage/sync.pull.sqlite.test.ts
    - mobile/src/storage.test.ts
    - mobile/src/hooks/useEditingDraft.ts
    - mobile/src/hooks/useSurveyDraftPatcher.ts
    - mobile/src/state/AppStateProvider.tsx
    - mobile/src/hooks/useEditingDraft.test.ts
    - mobile/src/hooks/useEditingDraft.autosave.test.ts
    - mobile/src/hooks/useSurveyDraftPatcher.test.ts
key-decisions:
  - "D-04: createLocalDraft writes 'public' in the payload, the column and the returned object"
  - "D-05: the draft write path never writes visibility; updateLocalDraft reads it from the stored payload (fail-closed to 'private' for unknown values), so a finish-step choice survives a late autosave"
  - "D-07 (client): a change on a status 'submitted' local row returns frozen before any queue read or write, equal value included"
  - "D-14: no SQLite change (db.ts untouched, user_version stays 5); the existing pull already replaces a clean submitted row, now proved for the 024 backfill"
metrics:
  tasks: 2
  completed: 2026-10-13
---

# Phase 29 Plan 02: Storage defaults, kept visibility and frozen guard Summary

**The phone now stores a new draft as shared with the association, no draft write can overwrite a later visibility choice, and a visibility change on an already submitted survey is refused locally before anything is queued.**

## Accomplishments

- `createLocalDraft` stores `visibility = 'public'` (payload, INSERT parameter, returned survey). Drafts created before this phase keep `'private'` (accepted consequence, no data fix).
- `updateLocalDraft` takes the visibility only from the stored payload (anything but `"public"` stays `"private"`); `UpdateDraftInput.visibility` is gone, so no caller can write it through the draft path.
- `queueSurveyVisibilityChange` selects `status` and returns `{ changed: false, frozen: true }` for a submitted row before touching the queue; every other path returns `frozen: false`. `updateSurveyVisibility` exposes `frozen`.
- `useEditingDraft` (autosave, flush, wizard finalisation, save edits) and `useSurveyDraftPatcher` no longer pass visibility; `useEditingDraft` lost its visibility parameter and its request field, and `AppStateProvider` lost the memo that derived the editing survey's visibility (the stale-overwrite defect of 29-RESEARCH M3.1).
- Tests: new `surveys.visibility.sqlite.test.ts` (default, kept private and public, choice followed by a late autosave, queue row versus rewritten upsert, equal value, frozen submitted row with nothing queued and the row unchanged); a pull test named for the 024 backfill in `sync.pull.sqlite.test.ts`; hook tests assert no `visibility` key on every `updateLocalDraft` call; `storage.test.ts` expects `"public"`.

## Task Commits

1. **Task 1: Storage defaults, kept value, frozen guard** - `318385da` (feat)
2. **Task 2: Draft write path stops carrying visibility** - `c4ee64e9` (fix)

## Verification Run

- `cd mobile && npx jest --config jest.unit.config.js` whole mobile suite: 400 suites, 5879 tests pass.
- `npm run lint`, `npm run typecheck`: pass. `npx prettier --check` on every changed file: pass.
- `grep -rn editingSurveyVisibility mobile/src`: nothing. `grep -c "visibility:"` on `useEditingDraft.ts` and `useSurveyDraftPatcher.ts`: 0. `git diff -- mobile/src/storage/db.ts`: empty.

## Deviations from Plan

- **TDD order:** the plan marks both tasks `tdd="true"`; the implementation edits were made before the new tests were written, so no separate failing-test (RED) run was recorded. The new tests were verified against the final code and cover each behaviour listed in the plan. No other deviation.
- Interpretation: an equal-value change on a submitted survey also reports `frozen: true` (the guard runs before the equal-value check), since a submitted survey takes no visibility operation at all on the client.

## Known Stubs

None.

## Threat Flags

None. T-29-06 and T-29-07 mitigated as planned; T-29-08 accepted (D-04).

## Notes for Later Plans

- Plan 29-05 edits `AppStateProvider.tsx` next: the editing-survey visibility memo and the `useEditingDraft` parameter no longer exist there.
- Plan 29-07 (finish step) must write the choice through `updateSurveyVisibility(apiUrl, "", id, choice)` (queue only) and treat `frozen: true` as "already submitted".
- Not implemented on purpose (per plan): treating a server read-only refusal on a queued visibility operation as benign (29-RESEARCH M3.3).
- Dead UI plumbing `handleToggleVisibility` and its "public" status wording (`fr.status.surveyOps`) still exist; they are out of this plan.

## Self-Check: PASSED

- Files: `mobile/src/storage/surveys.visibility.sqlite.test.ts` and every modified file present; working tree clean apart from this summary.
- Commits found: `318385da`, `c4ee64e9`.
- STATE.md and ROADMAP.md untouched.
