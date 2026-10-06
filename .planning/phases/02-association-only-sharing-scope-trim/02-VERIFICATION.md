---
phase: 02-association-only-sharing-scope-trim
verified: 2026-10-06T20:00:00Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: false
human_verification: []
---

# Phase 2: Association-only sharing and scope trim Verification Report

**Phase Goal:** The app matches its real audience (association members only, no anonymous public surface, no half-built moderation), and the survey-detail and account screens do what `REQUIREMENTS.md` already claims they do.
**Verified:** 2026-10-06, on branch `claude/roadmap-seeds-16a6af` (main at `0fb6d2f`, after Phase 12.1)
**Status:** passed (8/8 roadmap criteria hold on today's code; two bookkeeping and cleanup warnings below)
**Re-verification:** No, initial verification. This phase was executed as five plans without per-task PLAN.md files and was never goal-backward verified. `02-VALIDATION.md` is the executor's own rollup, so I did not use it as evidence.

The code has moved a lot since 2026-09-27 (Phase 12.1: community survey page, survey detail split into sub-pages, wizard, dark mode). Every criterion was re-checked against the current files, not against the SUMMARYs.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `GET /public/map-items` and `GET /public/parcels/status` require auth; Explorer shows submitted surveys of any member | VERIFIED | `api/src/surveys/public.controller.ts` carries `@UseGuards(AuthGuard)` on the whole `PublicController` (map-items, parcels/status and the later community routes). `PUBLIC_SURVEY_PREDICATE` in `public-map.queries.ts:9` is `s.status = 'submitted' AND s.deleted_at IS NULL`, with no `visibility` clause. `api/migrations/017_association_only_visibility.sql` recreates `idx_surveys_public_submitted` without the visibility predicate. `api/test/public-map-items.e2e-spec.ts:37` asserts 401 on both routes. Mobile: `fetchPublicMapItems`/`fetchPublicParcelStatuses` take `accessToken`, threaded by `usePublicMapExplorer`, `useNearbyParcels`, `useParcelStatuses`. I ran `public.controller.spec`, `public-map.service.spec`, `parcels.service.spec`: 51/51 pass. I did not run the e2e (needs DB). |
| 2 | Private/public control removed from survey detail; every submitted survey visible to every member | VERIFIED | `DetailActions.tsx` and the detail header have no toggle. `i18n/fr/survey-detail.ts` has no `visibilityPublic/Private` or `setPrivate/setPublic` strings. The read paths ignore `visibility` (criterion 1). The column, `PATCH /surveys/:id/visibility` and `toggleVisibility` in `surveys-context.ts` remain dormant by decision D-01 (REQ-X-visibility overridden, restored by REQ-C-privacy-choice). |
| 3 | Report entry point removed from mobile; `reports` module intact in the API | VERIFIED | No `createSurveyReport`, `handleReportSurvey` or `/reports` call anywhere in `mobile/src` (grep). `SelectedSurveyCard.tsx` is a summary card only. `api/src/reports/` (controller, service, module, dtos) still exists and `ReportsModule` is still imported in `api/src/app.module.ts:47`. |
| 4 | Compte screen: account deletion with destructive confirmation, wired to `DELETE /me` | VERIFIED | Path: Compte header settings icon (`AccountStack.tsx:40`, `navigation.navigate("settings")`) to `SettingsScreen`, whose last section `key: "delete"` holds the destructive centered row "Supprimer mon compte" (`SettingsScreen.tsx:154-166`, footer `account.deleteWarning`). It calls `onDeleteAccount` (`handleDeleteAccount` in `useSurveySync.ts`), which shows one destructive `Alert` ("Supprimer le compte", copy says surveys are anonymised and retained), then `deleteMyAccount()` (`ibp-api.ts:163`, `DELETE /me`), then logout and local purge. API: `users.controller.ts:88` `@Delete("me")`, `users.service.ts:248` anonymises retained surveys. `auth-profile.e2e-spec.ts:221` covers delete plus anonymise. `SettingsScreen.test.tsx` passes (single confirmation, danger zone last, "anonymis" copy). The entry is on Settings, one tap from Compte, not on the Compte screen body itself. |
| 5 | Survey detail shows previous submitted surveys of the parcel and IBP total/factor deltas against the latest previous version | VERIFIED (satisfied differently now) | `screens/survey-detail/HistorySection.tsx` uses `useParcelSurveyHistory` (`GET /parcels/:id/surveys/history`) and `computeIbpTotalDelta`/`computeFactorDeltas` (`app/ibp-scoring.ts:97,105`), renders the total/stand/context deltas, one pill per factor, and a row per previous version. Since OA-46 it is no longer on the summary page: it is on the `surveyHistory` sub-page (`SurveyHistoryScreen.tsx:57`, route registered in `SurveysStack.tsx:126`), under the event log. `HistorySection.test.tsx` and `ibp-scoring.test.ts` pass. |
| 6 | Explorer: tapping a studied parcel opens its latest survey detail or history | VERIFIED (better than recorded) | `PublicMapScreen.tsx:144` `handleSelectParcel` opens `ParcelHistoryCard` for `studied` parcels only. In 02-VALIDATION this was history-only because no member survey page existed. Phase 12.1 added `CommunitySurveysService` and the `communitySurvey` screen: `ParcelHistoryCard` rows call `onOpenSurvey`, wired to `navigation.navigate("communitySurvey", { surveyId })` (`PublicMapRoute.tsx:68,107`). The recorded deviation is now closed. |
| 7 | Docs: REQUIREMENTS no longer "Built" for the four items; US-A4 retagged out of MVP; `user-stories.md` section 8 refiled | VERIFIED | `.planning/REQUIREMENTS.md:43,48,60` carry `[ ]` and "Partial" (not Built); social login moved to Deferred (line 189). `docs/specs/epic-a-access-and-security.md` US-A4 reads `Release: V1, deferred out of MVP scope`. `docs/specs/user-stories.md:48` has "Deferred to the next milestone (V1)" separate from "V2 Backlog" (line 52). |
| 8 | UX audit Lot 0 (BUG-03, 04, 05, 06, 07, 08, DS-01/02/14) | VERIFIED | BUG-03: `resolveSurveyUiStatus` (`survey-logic.ts:90`) checks `sync_state === "failed"` before `submitted`; `survey-logic.test.ts` passes. BUG-04 (deferred here): fixed in Phase 3 batch 1, `parseFiniteNumberInput` replaces `,` with `.` (`app/number-utils.ts:7`). BUG-05: single confirmation, danger zone last, "anonymised" copy (criterion 4). BUG-06: `statusBarStyleForScheme` returns `dark-content` for the light scheme (`navigation-theme.ts:6`, used at `AppNavigation.tsx:53`; now also correct in dark mode). BUG-07: `ANDROID_TAB_ICONS.home` requires `assets/tabs/home.png`, a distinct file from `surveys.png`; `tab-config.test.ts` passes. BUG-08: `HomeScreen.tsx:109,169` real `refreshing` state; `HomeScreen.test.tsx` passes. DS-01/02/14: tokens moved to `theme.ts` by Phase 12 dark mode; `inputBorder` is `#807D75` (`theme.ts:64`). I did not recompute contrast ratios. BUG-01/02 (score scale) belong to 01.8 and were not re-audited here. |

**Score:** 8/8 truths verified (0 behavior-unverified: every state-dependent item above has a passing test I ran, or an e2e that I located but did not run).

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `api/src/surveys/public.controller.ts` | VERIFIED | Guarded; wired in the surveys module |
| `api/src/surveys/public-map.queries.ts` | VERIFIED | Predicate without visibility, used by map, parcel status and community queries |
| `api/migrations/017_association_only_visibility.sql` | VERIFIED | Present, idempotent; followed by 018 and 019 |
| `api/src/surveys/parcels.service.ts` / `parcels.controller.ts` | VERIFIED | History is unconditional on `status = 'submitted'`, controller guarded |
| `mobile/src/screens/survey-detail/HistorySection.tsx` | VERIFIED | Rendered by `SurveyHistoryScreen` |
| `mobile/src/hooks/useParcelSurveyHistory.ts` | VERIFIED | Used by `HistorySection` and `ParcelHistoryCard`; offline short-circuit added by phase 8 |
| `mobile/src/screens/public-map/ParcelHistoryCard.tsx` | VERIFIED | Rendered by `PublicMapScreen:253` |
| `mobile/src/screens/SettingsScreen.tsx` | VERIFIED | Delete row last, single confirmation |

### Key Link Verification

| From | To | Status |
|------|----|--------|
| Compte header settings icon | `SettingsScreen` delete row | WIRED |
| `SettingsScreen` delete row | `handleDeleteAccount` to `deleteMyAccount` to `DELETE /me` | WIRED |
| `PublicMapScreen` parcel tap | `ParcelHistoryCard` to `fetchParcelSurveyHistory` | WIRED |
| `ParcelHistoryCard` row | `communitySurvey` screen | WIRED |
| Survey detail to history sub-page | `SurveyHistoryScreen` to `HistorySection` | WIRED |
| Map and parcel-status callers | access token | WIRED (token threaded through four routes) |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| `HistorySection` | `items`, deltas | `GET /parcels/:id/surveys/history` (SQL on `surveys`/`survey_parcels`, `parcels.service.ts:115`) | Yes | FLOWING |
| `PublicMapScreen` | map items | `/public/map-items` on `idx_surveys_public_submitted` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Mobile targeted units | `jest -c mobile/jest.unit.config.js` on SettingsScreen, HistorySection, ibp-scoring, survey-logic, tab-config, HomeScreen | 6 suites, 85 tests pass | PASS |
| API targeted units | `jest -c api/jest.unit.config.js` on public.controller, parcels.service, public-map.service | 3 suites, 51 tests pass | PASS |
| Full e2e | not run (instruction: do not run the full e2e) | n/a | SKIPPED |

### Probe Execution

No probes declared or present (`scripts/*/tests/probe-*.sh` absent). Step 7c skipped.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| REQ-A-delete-account | Contributor deletes the account irreversibly; personal data erased, submitted surveys anonymised | SATISFIED | Mobile entry: `mobile/src/screens/SettingsScreen.tsx:154-166`, `mobile/src/hooks/useSurveySync.ts` (`handleDeleteAccount`/`performDeleteAccount`, lines ~225-270), `mobile/src/api/ibp-api.ts:163`, copy in `mobile/src/i18n/fr/status/session.ts:57` and `settings.ts:26`. API: `api/src/users/users.controller.ts:88`, `api/src/users/users.service.ts:248`; e2e `api/test/auth-profile.e2e-spec.ts:221`. |
| REQ-B-survey-detail | Survey detail with deadline, completion rate, previous surveys on the parcel, IBP total and factor deltas | SATISFIED for the Phase 2 scope, with two stale clauses | Previous surveys and deltas: `mobile/src/screens/survey-detail/HistorySection.tsx`, shown by `mobile/src/screens/SurveyHistoryScreen.tsx`; API `api/src/surveys/parcels.service.ts` + `parcels.controller.ts:15`. The "submission deadline" clause was removed by OA-41 (`api/migrations/019_no_submission_deadline.sql`), so the requirement text is stale. A completion rate exists in the survey list and the debug tab (`DebugTab.tsx:73`); I found no completion percentage on the survey summary page, only the finish-bar CTA that names what is missing. |
| REQ-C-versioning | Explicit version number and observation year; app proposes the next version; shows previous scores | PARTIAL | Recorded and enforced: `api/migrations/008_parcels_and_versioning.sql`, `parcels.service.ts` `getDefaultVersionNumber` (line 274) and `validateParcelSubmit` (next version must equal highest submitted plus one), `surveys.repository.ts:145-176`. The next version is assigned by the server at upsert, not proposed in a mobile UI. Previous scores and deltas are shown (`HistorySection.tsx`, `ParcelHistoryCard.tsx:42`, `CommunitySurveyScreen.tsx:97,219` version chip and history rows). The owner's own survey detail shows no version or year label (`SurveyDetailScreen.tsx:83-84` passes them to the PDF export only). |
| REQ-B-own-surveys-map, REQ-B-manage-published, REQ-X-visibility | See criteria 1 and 2 | SATISFIED | Criteria 1, 2 |

No orphaned requirements found in the Phase 2 mapping (`REQUIREMENTS.md:260-263`).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/REQUIREMENTS.md` | 43, 48, 60, 260-263 | REQ-A-delete-account, REQ-B-survey-detail, REQ-C-versioning, REQ-B-own-surveys-map still `[ ]`, status "Partial/New, Build in Phase 2" although Phase 2 is closed | Warning | Traceability is stale; the next milestone audit will read them as unbuilt. REQ-C-versioning should stay Partial with the proposal gap named. |
| `mobile/src/i18n/fr/status/sync.ts` | 51 | `reportSurveyMissing` has no consumer (report flow deleted) | Info | Dead string |
| `mobile/src/screens/SurveyDetailScreen.tsx` | 226 | `publishableOnPublicMap` reads `visibility === "public"` in the dev-only debug tab | Info | Dev-only, harmless, but the notion no longer applies |
| `mobile/src/hooks/useSurveyList.ts`, `app/survey-logic.ts` | 60, 147 | `visibilityFilter` state still threaded through the list and context, no UI sets it | Info | Dead plumbing kept with the dormant visibility column |
| `.planning/phases/02-*/02-VALIDATION.md` | 19 | Says the PR had no CI record from the session; no later CI evidence is attached to the phase | Info | Not verifiable by me; PR #171 and later merges are the record |

No `TBD`, `FIXME` or `XXX` markers in the files this phase touched that I opened (`HistorySection`, `ParcelHistoryCard`, `SettingsScreen`, migration 017).

### Human Verification Required

None required for the status. Optional: a real Auth0 account deletion on a device was part of the owner's phone passes, which I cannot see, so I rely on the e2e and the unit test only.

### Gaps Summary

No goal gap. Two follow-ups for the planner: (1) update `REQUIREMENTS.md` statuses (REQ-A-delete-account, REQ-B-survey-detail, REQ-B-own-surveys-map to Built; drop the "deadline" clause from REQ-B-survey-detail; keep REQ-C-versioning Partial until a next-version proposal or a version label exists in the mobile UI); (2) remove the dead report string and visibility filter plumbing when convenient.

---

_Verified: 2026-10-06_
_Verifier: Claude (gsd-verifier)_
