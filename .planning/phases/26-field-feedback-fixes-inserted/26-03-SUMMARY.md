---
phase: 26-field-feedback-fixes-inserted
plan: 03
subsystem: mobile-ui
tags: [offline, community-survey, safe-area, i18n, centered-state]

requires:
  - phase: 26-field-feedback-fixes-inserted
    provides: decision D-03 (finding F-1) from CONTEXT and RESEARCH
provides:
  - shared CenteredState (ui/CenteredState.tsx), frame-aware centred message with icon or spinner and retry
  - fr.communitySurvey.offline ("Ce relevé nécessite une connexion.")
  - offline prop on CommunitySurveyScreen and CommunityHistoryScreen, fed by useIsOffline() at the routes
affects: [26-10]

tech-stack:
  added: []
  patterns:
    - "Page-sized state as a ScrollView whose contentInsetAdjustmentBehavior follows the frame, so iOS insets it under the native large title"
    - "Offline read from useIsOffline() at the route, never inferred from the error class"

key-files:
  created:
    - mobile/src/ui/CenteredState.tsx
    - mobile/src/ui/CenteredState.test.tsx
  modified:
    - mobile/src/i18n/fr/community-survey.ts
    - mobile/src/screens/community-survey/CommunitySurveyScreen.tsx
    - mobile/src/screens/community-survey/CommunitySurveyScreen.test.tsx
    - mobile/src/screens/community-survey/CommunityHistoryScreen.tsx
    - mobile/src/screens/community-survey/CommunityHistoryScreen.test.tsx
    - mobile/src/navigation/routes/CommunitySurveyRoute.tsx
    - mobile/src/navigation/routes/CommunityHistoryRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx

key-decisions:
  - "Decision D-03: offline and the survey not loaded shows the offline copy at once (no wait for the request to fail); a survey already loaded keeps its page"
  - "CenteredState computes the sub-page bottom rule itself (tab bar clearance outside a large-title frame, none inside, plus 16) because ui/ must not import from screens/"
  - "The retry button sits in an alignSelf center wrapper with no flex key, so the stretched capsule of F-1 cannot come back"

patterns-established:
  - "CenteredState: one component for offline, error and loading of a full page"

requirements-completed: [D-03]

coverage:
  - id: D1
    description: "CenteredState: ScrollView with frame-driven insets, icon or spinner, live-region message, retry directly below, non-stretching button wrapper, bottom padding rule"
    requirement: D-03
    verification:
      - kind: unit
        ref: "mobile/src/ui/CenteredState.test.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both community pages show offline, error and loading through CenteredState; a loaded survey stays visible offline"
    requirement: D-03
    verification:
      - kind: unit
        ref: "mobile/src/screens/community-survey/CommunitySurveyScreen.test.tsx; CommunityHistoryScreen.test.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "Routes pass offline from useIsOffline()"
    requirement: D-03
    verification:
      - kind: unit
        ref: "mobile/src/navigation/routes/routes.test.tsx (CommunitySurveyRoute, CommunityHistoryRoute)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real centring under the native iOS large title (inside the safe area, above the tab bar)"
    verification: []
    human_judgment: true
    rationale: "Jest cannot run the native frame; checked on the iOS simulator in plan 26-10 (DC-D-04, DC-D-05)"

duration: 20min
completed: 2026-10-10
status: complete
---

# Phase 26 Plan 03: Offline community survey Summary

**Offline, another member's survey page (and its parcel history) now shows a centred "Ce relevé nécessite une connexion." with a cloud-offline icon and the retry button directly below, in a scroll view that iOS insets under the native large title.**

## Accomplishments

- `ui/CenteredState.tsx`: ScrollView (`contentInsetAdjustmentBehavior` from `useFrameInsetBehavior()`), centred content, icon or spinner, polite live-region message, optional secondary `AppButton` in a non-stretching wrapper, bottom padding like `useSubPageContentStyle`.
- `CommunitySurveyScreen` and `CommunityHistoryScreen` replace their duplicated loading/error block with three `CenteredState` returns (offline, error, loading, testIDs `community-offline`, `community-error`, `community-loading`) and lose the now unused `centered` and `message` styles.
- `CommunitySurveyRoute` and `CommunityHistoryRoute` pass `offline={useIsOffline()}`; offline is never inferred from the error.
- `routes.test.tsx` mock of `useIsOffline` is now mutable (`mockIsOffline`, reset in the file-level `beforeEach`).

## Task Commits

1. Task 1: shared CenteredState and the offline copy - `111b5e90`
2. Task 2: community pages use CenteredState, offline from the network state - `c76abe58`

## Deviations from Plan

None - plan executed as written. The Task 1 RED step was not run separately (test and component written together, green on first run).

## Known Stubs

None.

## Threat Flags

None. T-26-07 mitigated: only catalogue copy is shown; raw errors still go to `logStatusDetail`, unchanged. T-26-08 accepted: retry is a manual press.

## Issues Encountered

- `npm run format:check` reports only the untracked local `.claude/settings.local.json` (out of scope, not touched).
- Verification: full mobile unit suite (319 suites, 4280 tests) with coverage thresholds, `npm run lint` and `npm run typecheck` pass.

## Next Phase Readiness

The simulator check of the centring (DC-D-04, DC-D-05) belongs to plan 26-10.

## Self-Check: PASSED

- FOUND: mobile/src/ui/CenteredState.tsx, mobile/src/ui/CenteredState.test.tsx
- FOUND commits: 111b5e90, c76abe58
