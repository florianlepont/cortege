---
phase: 16-information-architecture
verified: 2026-10-06
status: passed
score: 5/5 success criteria met (4 through rewritten criteria)
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "Criteria 1, 2, 3 and 5 as first written (SurveyProgressCard, SyncStatusPill in both headers, IbpFactorBars, Data and About in Compte)"
    reason: "Redesigned in Phase 12.1 (OA-14 to 19, OA-46, OA-51, OA-75). ROADMAP criteria rewritten by the owner on 2026-10-07; no code change."
    accepted_by: owner
    accepted_at: "2026-10-07"
---

# Phase 07: Information Architecture Verification Report

**Phase Goal:** Home and Mes Relevés each do one job instead of duplicating each other, sync state is visible wherever it matters, and survey detail and Compte read as one coherent app.
**Verified:** 2026-10-06 (against branch `claude/roadmap-seeds-16a6af`, `origin/main` at `0fb6d2f`)
**Status:** human_needed (no code gap; one bookkeeping acceptance owed by the owner)
**Re-verification:** No, initial verification. The phase closed on 2026-09-27 with a `16-VALIDATION.md` only.

Phase 7 shipped in six batches on 2026-09-27. Phase 12.1 (owner acceptance on the phone, closed 2026-10-06) then redesigned Home, Mes Relevés, survey detail (OA-46) and Compte. Each criterion below was therefore checked against the code as it is now, not against `07-0N-SUMMARY.md`. Where the code differs from the criterion text, the truth is marked "satisfied differently" and the owner decision that caused it is cited.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Home becomes a dashboard (resume action, alerts, progress); Mes Relevés becomes a pure list (title, search, filters, a "+" in the header); the duplicated draft cards merge into one `SurveyProgressCard`. | VERIFIED, satisfied differently | Home: `mobile/src/screens/HomeScreen.tsx` renders the sync line, an actionable `AppNotice` (`pickAlertSurvey`: a blocked survey outranks a plain error, with a "Voir" or "Reessayer" action), a resume hero (`pickResumeDraft`, 48 h window, ten-step progress bar `hero-progress-done/todo`, "Nouveau releve" link), the tools section and the nearby-parcels map. The draft carousel (`DraftCard`) is gone: `components/cards/` no longer exists. Mes Relevés: `SurveyListRoute.tsx` sets a native "+" header item on iOS and `ListTitleBar` (search and "+" buttons) elsewhere; `SurveyListScreen` shows two intro figures, sections "A terminer" and "Termines", rows, no create card and no "a faire" card (`CreateSurveyCard`, `ContinueDraftCard`, `AttentionSection`, `StatTile` are deleted). Filters moved to the search page (OA-52, OA-54). Difference: `ui/SurveyProgressCard.tsx` is not imported by any screen (only its own test and `HomeScreen.test.tsx:236`, which asserts it renders 0 times). Home shows the progress inside the resume hero instead, an owner decision after one draft read as three tiles (OA-17, closed, "Owner validated on the phone 2026-09-29"). The intent (no duplicated draft cards, one dashboard, one pure list) holds. Tests run here: `HomeScreen.test.tsx` passes. |
| 2 | A sync status indicator (offline, N to send, syncing, up to date) is visible in the Home and Mes Relevés headers, not only in Settings; a blocked or conflicted survey never reads "Soumis" in green. | VERIFIED, satisfied differently | Indicator: `ui/SyncStatusPill.tsx` no longer exists. Commit `70c1774` (OA-14, 15, 16, 19, OA-88) replaced it with `ui/SyncStatusLine.tsx`, the same four states from `resolveSyncStatusLineState` (offline wins, then syncing, then unsent work, then up to date) plus the haptic on syncing to up to date. It is rendered in `HomeScreen.tsx` (lines 181 and 227, native header and JS header variants), fed by `HomeRoute.tsx` through `state/sync-status-context.ts` (`isOnline`, `isSyncing`) and `surveyStats.pending`; tapping it opens Paramètres. Mes Relevés has no indicator: commit `0776e90` removed it, and OA-51 records the owner decision ("The 'A jour' pill is grouped with the '+' button. It makes no sense there", mock-up validated 2026-10-05: "no sync pill"). So the first half holds on Home only. Never green: `app/survey-logic.ts` `resolveSurveyUiStatus` tests `sync_state === "failed"` before `status === "submitted"` and returns `sync_blocked` or `sync_error`; `SurveyRow.tsx` maps those to the danger tone; Home's alert copy has distinct blocked and failed messages. `survey-logic.test.ts` and `SyncStatusLine.test.tsx` pass here. |
| 3 | Survey detail shows one score with its denominator and a peuplement/contexte split (`IbpFactorBars`), instead of the same number repeated three times with no scale. | VERIFIED, satisfied differently | Survey detail was rebuilt in OA-46 as a summary plus sub-pages. Summary: `survey-detail/ScoreCard.tsx` is the one score, `{ibp_total}` with `fr.surveyDetail.metric.outOfTotal` (the /50 denominator) and a ten-step fill bar; it is not tappable. Sub-page `SurveyScoreScreen.tsx` renders `ScoreBreakdown.tsx` (total out of 50, then two proportional bars: stand and management out of `IBP_MAX.stand` = 35, context out of `IBP_MAX.context` = 15) and `FactorsList.tsx` (each factor with `pointsOf({points, max})`). The total is shown once per page, with its scale, and the split has bars. Difference: `ui/IbpFactorBars.tsx` (the A to J horizontal bars named in the criterion) is not rendered anywhere; `grep IbpFactorBars` finds only its definition, its test and a comment in `useLocalDraftSummary.ts`. Owner validation: OA-45 and OA-46 closed ("Owner confirmed on the phone 2026-10-06"). `FactorsList.test.tsx` passes here; `ScoreBreakdown.tsx` has no test of its own (see Anti-Patterns). |
| 4 | The survey list row shows a score or progress ring; deletion follows the iOS swipe convention (destructive on the right) with a confirmation and an accessible alternative. | VERIFIED | `screens/survey-list/SurveyRow.tsx`: `RowIndicator` renders `IbpScoreBadge` for a submitted survey with a known score, a complete `FactorProgressRing` for a submitted survey without one, and a `FactorProgressRing` of `completion_rate` for anything in progress. Delete uses `Swipeable` with `renderRightActions` (revealed by swiping left, action on the right), and an `accessibilityActions` entry `{ name: "delete" }` with `onAccessibilityAction` calling the same handler. The handler calls `confirmDeleteSurvey` (`useSurveySyncSurveyOperations.ts:355`), which opens a native `Alert` with a destructive "Supprimer" button before `queueDeleteSurvey`; `useSurveySyncSurveyOperations.test.ts` covers that confirmation (describe "confirmDeleteSurvey", passes in the hook suite). The row is used by `SurveyListScreen` and the search page (`SurveySearchRoute` passes `confirmDeleteSurvey`). Owner: OA-57 (margin of the swipe button) closed on the phone 2026-09-29, OA-56 (page redesign) closed. |
| 5 | Compte is a grouped iOS-style list (Profile, Connection, Data, About, then Sign out) instead of a mix of inline forms, rows and pills. | VERIFIED, satisfied differently | `screens/AccountScreen.tsx` builds `AppGroupedListSection[]` with keys `profile` (title `fr.account.profile.title`), `connection` (`fr.account.sections.connection`) and `signout` (the destructive logout row alone), rendered by one `<AppGroupedList sections={sections} />` under an `IdentityCard`. Data and About are no longer in Compte: OA-75 (owner decision, closed on the phone 2026-10-06) moved them to Paramètres. `SettingsScreen.tsx` is itself an `AppGroupedList` with Apparence, Cartes hors ligne (`isOfflineMapsEnabled`), A propos (version via `expo-constants`, credits) and the delete-account section, reached from the gear in the Compte header (`navigation/stacks/AccountStack.tsx`). The sync actions were removed outright (OA-78, sync is automatic). `AccountScreen.test.tsx` and `AppGroupedList.test.tsx` pass here. |

**Score:** 5/5 criteria met in intent. One (4) is met as written; four (1, 2, 3, 5) are met by redesigns the owner validated on the phone.

### Suggested override block (for the owner to accept, not applied)

```yaml
overrides:
  - must_have: "A SyncStatusPill is visible in the Home and Mes Relevés headers"
    reason: "Replaced by SyncStatusLine on Home only; the pill was removed from Mes Relevés by owner decision (OA-51, mock-up validated 2026-10-05)"
    accepted_by: "owner"
    accepted_at: "TO BE FILLED BY THE OWNER"
  - must_have: "Survey detail shows one score with a peuplement/contexte split (IbpFactorBars)"
    reason: "Survey detail rebuilt as summary and sub-pages (OA-46); the split is ScoreBreakdown's two bars, IbpFactorBars is unused"
    accepted_by: "owner"
    accepted_at: "TO BE FILLED BY THE OWNER"
  - must_have: "Compte is a grouped list (Profile, Connection, Data, About, then Sign out)"
    reason: "Data and About moved to Paramètres (OA-75); sync section removed (OA-78)"
    accepted_by: "owner"
    accepted_at: "TO BE FILLED BY THE OWNER"
  - must_have: "The duplicated draft cards merge into one SurveyProgressCard"
    reason: "Progress shown in the Home resume hero instead (OA-17); SurveyProgressCard unused"
    accepted_by: "owner"
    accepted_at: "TO BE FILLED BY THE OWNER"
```

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `mobile/src/ui/SyncStatusPill.tsx` | 4-state pill (batch 1) | Replaced | Deleted; `ui/SyncStatusLine.tsx` (same states, tested) is its successor and is wired in `HomeScreen.tsx` |
| `mobile/src/ui/SurveyProgressCard.tsx` | One draft progress card | ORPHANED | Exists with a test, imported by no screen |
| `mobile/src/ui/AppGroupedList.tsx` | iOS grouped list primitive | VERIFIED | Used by `AccountScreen`, `SettingsScreen`, `OfflineAreasScreen`, `SurveyContextScreen`, `SurveyDetailScreen`, `CommunitySurveyScreen`, `GenusTargetSheet` |
| `mobile/src/ui/IbpFactorBars.tsx` | A to J bars | ORPHANED | Exists with a test, rendered nowhere |
| `mobile/src/state/sync-status-context.ts` | Narrow `isOnline` / `isSyncing` context | VERIFIED | Read by `HomeRoute.tsx` via `useSyncStatus`; fed from `useSurveySyncNetwork` |
| `mobile/src/screens/HomeScreen.tsx` | Dashboard | VERIFIED | See truth 1 |
| `mobile/src/screens/survey-list/SurveyRow.tsx` | Indicator, right swipe, rotor action | VERIFIED | See truth 4 |
| `mobile/src/screens/AccountScreen.tsx` | Grouped Compte | VERIFIED | See truth 5 |
| `mobile/src/screens/survey-detail/ScoreCard.tsx`, `ScoreBreakdown.tsx` | One score, denominator, split | VERIFIED | See truth 3 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `useSurveySyncNetwork` | `HomeScreen` sync line | `sync-status-context` then `HomeRoute` | WIRED | `HomeRoute.tsx:30` reads `useSyncStatus()` and passes `isOnline`, `isSyncing` |
| `SyncStatusLine` press | Paramètres | `onOpenSyncStatus` | WIRED | `HomeRoute.tsx:116` |
| `SurveyRow` delete (swipe or rotor) | `confirmDeleteSurvey` | `onDelete` prop | WIRED | List and search routes both pass `actions.confirmDeleteSurvey` |
| `resolveSurveyUiStatus` | `SurveyRow` chip and Home alert | direct import | WIRED | Failed is tested before submitted |
| `AccountScreen` | `AppGroupedList` | `sections` | WIRED | Profile, connection, signout |
| `Compte` gear | `SettingsScreen` | `AccountStack` header button | WIRED | `makeAccountHomeOptions` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `SyncStatusLine` | `isOnline`, `isSyncing`, `pendingCount` | `useSurveySyncNetwork` probe and in-flight counter, `surveyStats.pending` | Yes | FLOWING |
| `SurveyRow` `RowIndicator` | `score` | `surveyDetails` cache (a submitted survey without a cached detail shows a complete ring, by design) | Yes | FLOWING |
| `ScoreCard` / `ScoreBreakdown` | `displayedScores` | `useSurveyDetailData` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Sync line, Home dashboard, Compte, grouped list, factors list, survey status rules | `jest -c mobile/jest.unit.config.js --coverage=false` on `SyncStatusLine`, `HomeScreen`, `AccountScreen`, `AppGroupedList`, `FactorsList`, `survey-logic` | 6 suites, 85 tests passed | PASS |
| Debt markers | `grep -rnE "\b(TBD|FIXME|XXX)\b" mobile/src` | none | PASS |

I did not run the full unit suite, lint or typecheck; the phase's own gate is recorded in `16-VALIDATION.md` and was not re-run.

### Probe Execution

No probes declared; `scripts/*/tests/probe-*.sh` does not exist. Skipped.

### Requirements Coverage

The roadmap says "Requirements: none yet in `REQUIREMENTS.md`". SYNC-02 restates the spirit of `REQ-D-offline-work` and `REQ-D-auto-sync` (already built in earlier phases). No requirement IDs map to Phase 7 in `REQUIREMENTS.md`, so there is nothing orphaned.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `mobile/src/ui/SurveyProgressCard.tsx`, `mobile/src/ui/IbpFactorBars.tsx` | whole files | Dead components: built in batch 1, no longer rendered after the OA-17 and OA-46 redesigns. Their i18n sections (`fr.components.surveyProgressCard`, `fr.components.ibpFactorBars`) and tests stay; `useLocalDraftSummary.ts` still carries a "fed to IbpFactorBars" comment. | Warning | No user impact. They keep the roadmap wording ("merge into `SurveyProgressCard`", "`IbpFactorBars`") apparently satisfied when it is not. Delete them or reuse them. |
| `mobile/src/screens/survey-detail/ScoreBreakdown.tsx`, `mobile/src/screens/survey-list/SurveyRow.tsx` | whole files | No unit test targets them directly (`ScoreBreakdown` only through `CommunitySurveyScreen.test.tsx`; the swipe, rotor action and `RowIndicator` of `SurveyRow` have no test since `survey-list-500.test.tsx` went away). | Info | The swipe-right placement and rotor action rest on the owner's phone confirmation (OA-57), not on a test. |
| `.planning/phases/16-information-architecture/16-VALIDATION.md` | all | Describes `SyncStatusPill`, `DraftCard` merge, `IbpFactorBars` and a Compte with Data and About as delivered; none of that matches the code now. | Info | Historical record of 2026-09-27; this report supersedes it for the current state. |

### Human Verification Required

#### 1. Accept or amend the redesigned criteria

**Test:** Read the four deviations in the truths table (1, 2, 3, 5) and either accept them (fill the suggested overrides block) or reword the ROADMAP Phase 7 criteria.
**Expected:** The roadmap contract and the app agree.
**Why human:** Only the owner can accept a deviation from the roadmap contract. The evidence for each is an owner decision already recorded and confirmed on the phone, so this is expected to be a formality.

The first on-device look that `16-VALIDATION.md` listed as owed has been done: Phase 12.1 closes an entry only when the owner confirms it on the phone, and OA-17, OA-45, OA-46, OA-51 to OA-58, OA-70 to OA-79 are closed that way.

### Gaps Summary

There are no code gaps against the phase goal. Home and Mes Relevés each do one job, sync state is visible on Home, a failed or blocked survey never reads green, survey detail shows one scored total with its scale and the split, the list row has an indicator and a right-side confirmed delete with a rotor alternative, and Compte is a grouped list. The status is `human_needed` only because four criterion wordings were overtaken by owner-validated redesigns and the roadmap has not been amended. Two components built for this phase (`SurveyProgressCard`, `IbpFactorBars`) are dead code.

---

_Verified: 2026-10-06_
_Verifier: Claude (gsd-verifier)_
