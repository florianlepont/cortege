---
phase: 29-private-or-public-before-submission-inserted-v1
verified: 2026-10-13T00:00:00Z
status: human_needed
score: 20/20 must-haves verified (3 success criteria, 17 decisions); 5 device-only items pending
behavior_unverified: 0
overrides_applied: 0
gaps: []
deferred: []
human_verification:
  - test: "DV-29-01 (iPhone, light then dark): complete a new draft, tap Terminer le relevé on the summary, then again from the last factor page"
    expected: "Native form sheet at about 0.65 height with grabber, title Qui peut voir ce relevé ?, Partagé avec l'association selected first, Privé second, footnote under them; same sheet from both entries; VoiceOver reads the title as a heading, cards as radios with captions, selected state, confirm label Terminer le relevé <name>. Visibilité : ..."
    why_human: "Native sheet detent (0.65), wording acceptance by the owner and VoiceOver output cannot be checked without a device (stack-options.ts says the detent is to be measured at plan 29-10)"
  - test: "DV-29-02 (airplane mode): choose Privé on a complete draft, tap Enregistrer le choix, reopen, leave airplane mode, finish"
    expected: "Offline notice and button label Enregistrer le choix, sheet closes, Privé still selected on reopen, survey submits after reconnection, summary line reads Privé"
    why_human: "Real connectivity transitions and queue drain on a phone; unit tests mock the network"
  - test: "DV-29-03 (second account, local or deployed API with migration 024): look for the private survey of the first account"
    expected: "Absent from Explorer (marker and parcel colour), global search, parcel history and community pages; a shared survey of the first account is visible; an older draft shows Restera privé (choix à la fin), a new draft Sera partagé avec l'association (choix à la fin)"
    why_human: "Cross-device, cross-account check against a running API; server side is proven by e2e but the end-to-end render on a phone is not"
  - test: "DV-29-04 (after migration 024 on the server the phone talks to): old submitted survey after one pull"
    expected: "Summary shows Partagé avec l'association"
    why_human: "Needs a real pull from a migrated server"
  - test: "DV-29-05 (optional, Android emulator): both entries, light and dark"
    expected: "Sheet opens as full-screen modal, title clears the status bar, back closes it"
    why_human: "Visual layout on Android"
---

# Phase 29: Private or Public Before Submission Verification Report

**Phase Goal:** The observer chooses who sees a survey before submitting it.
**Verified:** 2026-10-13
**Status:** human_needed (every automated truth verified; only the owner device checks of plan 29-10 Task 3 remain, by design)
**Re-verification:** No, initial verification

Verified from the code, not from the SUMMARY files. Tests run by the verifier: API unit (`survey-read-paths`, `surveys-visibility-guard`, `surveys-normalize.utils`: 147 pass), API e2e on local `ibp_test` (`private-visibility` 14, `surveys-visibility` 10, `migration-024-visibility-backfill` 10, `private-visibility-retention` 2, `sync-installed-app-compat` 6, `parcel-history` 2, `epic-e-search-reports` 4: all pass), mobile (48 suites, 734 tests: finish sheet, picker, RadioCard, CasPicker, visibility line, summary header, storage visibility and pull, sync operations, navigation, i18n, and the `__checks__` gates including `catalogue-dash`, `abbreviations`, `structure`: all pass).

## Success Criteria (ROADMAP contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Before submitting the observer chooses private or shared; stored, synced, read-only after submit | VERIFIED | Choice: `mobile/src/screens/FinishSheet.tsx` + `ui/VisibilityPicker.tsx` (two radio cards, order shared then private, line 12). Entries: `SurveyDetailRoute.tsx:46,74` and `FactorDetailRoute.tsx:77-78` navigate to `surveyFinish`; no other caller of `submitSurvey` in mobile (grep: only `FinishSheetRoute.tsx:43`). Stored and synced: `useFinishSheet.ts` confirm order flush, `setDraftVisibility`, then `submitSurvey` (lines 84-111, ordering test `useFinishSheet.test.ts:118`); `handleSetDraftVisibility` (`useSurveySyncSurveyOperations.ts:381-388`) queues through `updateSurveyVisibility` with an empty token, the finish's own drain (`sendPendingChangesBeforeFinish`) sends it before the submit call. Read-only: `surveys.service.ts:902-910` (422 `submitted_read_only_fields`), `:938` (`AND status <> 'submitted'` in the UPDATE), `:451-476` (upsert path writes the stored value back, 409), `surveys-normalize.utils.ts:44,323-327,364`, fast path `surveys.repository.ts:326`. Locally: `sync.ts:704` frozen refusal. Tests: `surveys-visibility.e2e-spec.ts` (b)(c)(d)(g incl. concurrent submit vs PATCH), `surveys-same-version.e2e-spec.ts:338`, `surveys-submit.e2e-spec.ts:181`. |
| SC2 | A private survey never reaches another member on map, search or lists, enforced on the server with API tests | VERIFIED | `PUBLIC_SURVEY_PREDICATE` = submitted, live, `visibility = 'public'` (`public-map.queries.ts:15`) is used by map items (`:96`), parcel statuses (`:166`), community list (`:290`), community detail, history and `assertPublicSurvey` (`community-surveys.service.ts:101,124,243`), community search and members (`search.queries.ts:31,79`), parcel search counts and ordering (`parcel-search.queries.ts:75,119`), reports (`reports.service.ts:183`). Parcel history uses the caller-aware `submittedVisibleToCallerSql("$3")` (`parcels.service.ts:16,125`, caller from `parcels.controller.ts:18-22`). Every controller route is classified in `api/test/helpers/survey-read-routes.ts`; `survey-read-paths.spec.ts` fails on an unclassified route or unguarded query; `private-visibility.e2e-spec.ts` has one two-user case per member read route (11) plus owner routes answering unknown-id 404. |
| SC3 | The toggle removed in Phase 11 is restored with the right wording; existing surveys keep their visibility | VERIFIED | Wording `mobile/src/i18n/fr/survey-finish.ts`: Partagé avec l'association / Privé, no "public" (pinned by `catalogue-additions-29.test.ts:89-101`), no em dash (`catalogue-dash.test.ts` passes). Existing data: `api/migrations/024_private_or_public_visibility.sql` sets every submitted survey to `public`, writes a `backfilled` event per authored survey so the owner's phone pulls it, drops and recreates `idx_surveys_public_submitted` with the visibility clause; `migration-024-visibility-backfill.e2e-spec.ts` (10 tests incl. idempotence, drafts untouched, no event for anonymised rows) passes on a real DB. |

## Decisions D-01 to D-17

| D | Decision | Status | Evidence |
|---|----------|--------|----------|
| D-01 | Depends on Phase 11 not 36 | VERIFIED (tracking pending) | ROADMAP Phase 29 block already reads "Depends on: Phase 11 ... Not Phase 36". The exact wording and the progress rows are plan 29-10 Task 4, intentionally pending. |
| D-02 | Two values, UI never says "public"; labels Privé and Partagé avec l'association with one line each | VERIFIED | `survey-finish.ts:12-20`; only mapper of the wire value is `app/visibility-display.ts`; no globe glyph (`people-outline` / `lock-closed-outline`); `catalogue-additions-29.test.ts` and the `__checks__` gates pass. |
| D-03 | Names stay `visibility`, column not renamed | VERIFIED | No rename in migration 024 or contract (`packages/ibp-domain/src/contract/survey.ts` only re-documents `SurveyVisibility`). |
| D-04 | Selector in the submission step, shared pre-selected | VERIFIED | `FinishSheetRoute`/`FinishSheet`; `useFinishSheet.ts:62-64` opens on shared unless the draft is private; `createLocalDraft` now stores `public` (`storage/surveys.ts:50,97`); `finishSheetScreenOptions` native form sheet (`stack-options.ts`), registered in `SurveysStack.tsx`. |
| D-05 | Draft stores its choice; rides the normal upsert and `visibility_update` queue offline | VERIFIED | `queueSurveyVisibilityChange` rewrites a queued upsert or adds a `survey_visibility_update` row (`storage/sync.ts:681-800`); `updateLocalDraft` keeps the stored value (`surveys.ts:479-482`); offline path closes the sheet with the choice kept (`useFinishSheet.test.ts:205`, `surveys.visibility.sqlite.test.ts`). |
| D-06 | Backfill submitted surveys to public in a new migration, recreate the index | VERIFIED | Migration 024 (see SC3); runner recorded it right after 023 (e2e test). |
| D-07 | Read-only after submit on every channel, per-channel codes | VERIFIED | PATCH /visibility 422 (`surveys.service.ts:902`), generic PATCH 422 with `visibility` in the forbidden list (`surveys-normalize.utils.ts:44`; FOR UPDATE lock in `patchSurvey`/`patchSurveyVisibility`), sync `visibility_update` 422 (e2e (d)), upsert 409 `survey_submitted_read_only` and `sync_version_conflict` (`surveys-same-version` 6b), idempotent same-value replay 200. Docs superseded: `publication-visibility-post-submit-v1.md` header and status. |
| D-08 | `visibility_changed` events for draft changes, no new type | VERIFIED | `applyVisibilityChange` and `patchSurvey` insert `visibility_changed` (`surveys.service.ts:851,955`); e2e (a)(e). `backfilled` is the existing 014 type. |
| D-09 | One shared predicate with `visibility = 'public'` | VERIFIED | `public-map.queries.ts:15`; all read sites listed in SC2 embed the constant, none hand-derive; guarded by `survey-read-paths.spec.ts`. |
| D-10 | Parcel history: caller's own plus others' public | VERIFIED | `submittedVisibleToCallerSql` (`public-map.queries.ts:22-24`, equality on user_id so a NULL author never matches); `parcel-history.e2e-spec.ts`, `private-visibility.e2e-spec.ts` case for the route, `parcels.service.spec.ts`. |
| D-11 | Private survey totally invisible; next version still counts all submitted | VERIFIED | Statuses and counts use the predicate; `getDefaultVersionNumber` (`parcels.service.ts:282-297`), `validateParcelSubmit` (`:339-352`) and the fast path `FAST_PATH_VERSION_NUMBER_SQL` (`surveys.repository.ts:~184`) count all submitted live surveys with no visibility filter; `private-visibility-retention.e2e-spec.ts` numbering proof; documented in `api-contract-v1.md`. |
| D-12 | Guarantee tests, 404 not 403 on direct access, route enumeration | VERIFIED | `private-visibility.e2e-spec.ts` (detail, attachments list, content, download-url all 404 for B, 200 for shared); reports changed to 404 for a hidden survey (`reports.service.ts:197-203`, `reports.service.spec.ts`); enumeration spec `survey-read-paths.spec.ts` + helper. |
| D-13 | Retained private survey stays private after account deletion | VERIFIED | `private-visibility-retention.e2e-spec.ts:186` (author nulled, still hidden; shared one stays visible). |
| D-14 | Wire shape unchanged, no SQLite migration | VERIFIED | No change to `db.ts` (schema stays at 5); DTOs unchanged in shape; `sync-installed-app-compat.e2e-spec.ts` passes. |
| D-15 | Read-only visibility line for owner; `visibilityFilter` dead code removed | VERIFIED | `survey-detail/visibility-line.ts`, `SummaryHeader.tsx` (non pressable `View` with icon and text), wired in `SurveyDetailScreen.tsx` via `resolveVisibilityLine`; `visibilityFilter`, toggle chain and `PagerFinishNotice` removed (grep of `mobile/src` finds none outside tests). |
| D-16 | Community search and Explorer untouched | VERIFIED | `git diff ee146e95..HEAD --name-only` shows no file under `mobile/src/map`, `screens/public-map`, global search hooks or screens; only server results change. |
| D-17 | PDF export unchanged | VERIFIED | No file under `mobile/src/app/survey-pdf/` or the PDF hook changed in the phase range. |

## Required Artifacts and Wiring

| Artifact | Status | Details |
|----------|--------|---------|
| `api/migrations/024_private_or_public_visibility.sql` | VERIFIED | Substantive, applied by globalSetup, tested |
| `api/src/surveys/public-map.queries.ts` | VERIFIED | Predicate and caller-aware variant exported and consumed by 7 modules |
| `api/src/surveys/surveys.service.ts` write guards | VERIFIED | Lock plus status-guarded UPDATE plus re-read to distinguish 422 from 404 |
| `mobile/src/screens/FinishSheet.tsx`, `finish-sheet/*`, `navigation/routes/FinishSheetRoute.tsx` | VERIFIED | Registered in stack, both entries navigate to it, route swallows back and gesture while submitting |
| `mobile/src/ui/VisibilityPicker.tsx`, `RadioCard.tsx` | VERIFIED | Used by the sheet; `CasPicker` refactored onto `RadioCard`, its tests still pass |
| `mobile/src/storage/sync.ts` `queueSurveyVisibilityChange` / `updateSurveyVisibility` | VERIFIED | Returns `frozen` for a submitted survey; consumed by `handleSetDraftVisibility` |
| `mobile/src/screens/survey-detail/visibility-line.ts` + `SummaryHeader.tsx` | VERIFIED | Both statuses, both values |

Data-flow (Level 4): the sheet choice is read from the stored survey (`survey.visibility`), written through the local queue, drained to `POST /v1/sync`, stored in the `surveys.visibility` column, and read back by the predicate; the summary line reads the stored value after pull. Every hop is covered by a passing test.

## Behavior-dependent truths

The ordering and freeze invariants (flush then store then submit; never submit after a failed write; concurrent submit versus visibility PATCH; frozen answer locks the sheet) are exercised by named passing tests (`useFinishSheet.test.ts:118,155,167,190`; `surveys-visibility.e2e-spec.ts` (g)). No PRESENT_BEHAVIOR_UNVERIFIED truth.

## Anti-Patterns

TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER scan over all 124 non-planning files changed in `ee146e95..HEAD`: no match. No em dash in catalogue strings (gate passes; em dashes found in `mobile/src` are in comments and test descriptions only, which the rule does not cover). No stub handlers: the confirm button runs the real sequence, the picker carries `onChange`, the summary line is intentionally non-interactive (D-15). No debt markers.

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| REQ-C-privacy-choice C1 (choice before submit) | SATISFIED | SC1 |
| C2 (stored on draft, default shared, synced, survives interrupted submit) | SATISFIED | D-04, D-05 |
| C3 (read-only after submit, every channel) | SATISFIED | D-07 |
| C4 (never reaches another member, server enforced, API tests) | SATISFIED | SC2, D-09..D-12 |
| C5 (backfill, no index regression) | SATISFIED | D-06; index recreated with `visibility = 'public'` (the 015 shape) |
| C6 (wording) | SATISFIED | D-02 |
| C7 (owner read-only line) | SATISFIED | D-15 |
| C8 (retention) | SATISFIED | D-13 |

No orphaned requirement mapped to Phase 29.

## Notes and accepted consequences (not gaps)

- Server default for a create that sends no visibility stays `private` (fail-closed, `surveys.service.ts:134,376`); the app always sends `public` for new drafts. Documented in `publication-visibility-post-submit-v1.md` rule 1.
- Drafts created before the phase open the sheet on Privé (accepted in CONTEXT amendments).
- An owner's private-only parcel shows as not studied in server-coloured layers (accepted, D-11).
- Known environmental failures in the wider suites (check-env-parity needs bash 4, list-pagination timezone, migrate-lock create-database permission) are not phase regressions and were not re-run.

## Human Verification Required

Intentionally pending (plan 29-10 Task 3, owner device checks; Task 4 tracking files also pending). These are the only open items:

1. **DV-29-01** iPhone, light and dark, both entries: sheet appearance at 0.65 detent, wording acceptance, VoiceOver.
2. **DV-29-02** airplane mode: choose Privé, Enregistrer le choix, reopen, reconnect, finish; summary line reads Privé.
3. **DV-29-03** second account against a Phase 29 API: private survey absent from Explorer, search, parcel history, community pages; shared one visible; draft lines Restera privé / Sera partagé.
4. **DV-29-04** after migration 024 on the phone's server: old submitted survey reads Partagé avec l'association after one pull.
5. **DV-29-05** (optional) Android emulator: full-screen modal, status bar clearance, back closes.

## Gaps Summary

None. All three success criteria and all seventeen decisions are verified against the code and by passing targeted tests. Status is human_needed only because the owner device checkpoint is outstanding, as planned.

---

_Verified: 2026-10-13_
_Verifier: Claude (gsd-verifier)_
