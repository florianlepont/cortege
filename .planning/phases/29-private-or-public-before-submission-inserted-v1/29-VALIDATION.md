---
phase: 29
slug: private-or-public-before-submission-inserted-v1
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-13
---

# Phase 29 - Validation Strategy

Source: plans `29-01` to `29-10` and the "Validation Architecture" section of `29-RESEARCH.md`. Every task carries its own `<automated>` command; device-only behaviour is listed under "Manual-Only Verifications".

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + ts-jest (api, mobile), Supertest (api e2e), `@testing-library/react-native` (mobile) |
| **Config files** | `api/jest.unit.config.js`, `api/jest.config.js` (e2e), `mobile/jest.unit.config.js` |
| **Quick run (api unit)** | `cd api && npx jest --config jest.unit.config.js <spec files>` |
| **Quick run (api e2e)** | `cd api && npx jest -c jest.config.js --runInBand <file>` (needs Postgres `ibp_test`, Homebrew postgresql@16 if Docker is down) |
| **Quick run (mobile)** | `cd mobile && npx jest --config jest.unit.config.js <paths>` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && npm run test:e2e && npm run format:check` |
| **Estimated runtime** | unit a few minutes; one e2e file 10 to 60 s; explain harness slower |

## Sampling Rate

- **After every task commit:** the task's own `<automated>` command
- **After every plan wave:** `npm run lint && npm run typecheck && npm run test:unit` plus the e2e files that wave touched
- **Never two API e2e runs at once:** `globalSetup` drops and re-migrates `ibp_test` (the plans put at most one API e2e plan in each wave)
- **Before `/gsd-verify-work`:** full suite green and `npm run format:check`
- **Max feedback latency:** about 60 s per task

## Per-Task Verification Map

| Task | Plan | Wave | Requirement (claim) | Secure behavior | Test type | Automated command (abridged, full text in the plan) | File exists | Status |
|------|------|------|---------------------|-----------------|-----------|------------------------------------------------------|-------------|--------|
| 29-01-1 | 01 | 1 | REQ-C-privacy-choice (C5, D-06) | backfill keeps existing visibility, owners refreshed by events, index matches predicate | api e2e | `jest -c jest.config.js --runInBand test/migration-024-visibility-backfill.e2e-spec.ts` | W0 | pending |
| 29-01-2 | 01 | 1 | C4 (D-09, D-10, D-11) | private never in shared predicate; history caller-aware; version numbering unchanged | api unit | `jest --config jest.unit.config.js test/parcels.service.spec.ts test/public-map.service.spec.ts test/search.queries.spec.ts test/community-surveys.service.spec.ts test/parcel-search.service.spec.ts` | yes | pending |
| 29-01-3 | 01 | 1 | C4 | fixtures flipped to explicit shared, explain harness uses legacy visibility SQL | api e2e | map, bbox, method-version, community list/detail, search e2e files + `public-routes-explain` | yes | pending |
| 29-02-1 | 02 | 1 | C2, C3 (D-05, D-14) | new drafts shared; stored value kept; frozen after submit locally | mobile sqlite | `src/storage/surveys.visibility.sqlite.test.ts`, `sync.pull`, `sync.engine`, `storage.test.ts` | W0 | pending |
| 29-02-2 | 02 | 1 | C2 | autosave never re-sends stale visibility | mobile hook | `src/hooks/useEditingDraft src/hooks/useSurveyDraftPatcher` | yes | pending |
| 29-03-1 | 03 | 1 | C6 (D-02) | wording pinned, "public" absent, no em dash | mobile unit + gates | `catalogue-additions-29`, `visibility-display`, `catalogue-dash`, `abbreviations` | W0 | pending |
| 29-03-2 | 03 | 1 | C1 | two-option radio picker, shared default | mobile unit | `RadioCard`, `VisibilityPicker`, `CasPicker`, `visual-tokens`, icons, motion gates | W0 | pending |
| 29-03-3 | 03 | 1 | C7 (D-15) | read-only line for both values and draft wording | mobile unit | `visibility-line`, `SummaryHeader`, `structure` | W0 | pending |
| 29-04-1 | 04 | 2 | C4 (R18) | reports answer 404 for hidden survey and drafts | api unit + e2e | `reports.service.spec` + `epic-e-search-reports`, `attachments-reports-transactions` e2e | yes | pending |
| 29-04-2 | 04 | 2 | C4 (D-10) | two-user parcel history | api e2e | `parcel-history.e2e-spec.ts` | yes | pending |
| 29-05-1 | 05 | 2 | C2, C3 | queue-only `setDraftVisibility`, toggle chain removed | mobile hook | `useSurveySyncSurveyOperations`, `useSurveySync`, `src/state` | yes | pending |
| 29-05-2 | 05 | 2 | D-15 | `visibilityFilter` removed | mobile unit | `survey-logic`, `useSurveyList`, `routes`, `state` | yes | pending |
| 29-05-3 | 05 | 2 | C4 (D-10) | own survey in history opens the owner summary | mobile route | `SurveyHistoryRoute.test.tsx`, `SurveyHistoryScreen.test.tsx` | W0 | pending |
| 29-06-1 | 06 | 3 | C3 (D-07) | visibility in read-only classifiers | api unit | `surveys-normalize.utils`, `surveys-upsert-fast-path`, `sync-error.utils` | yes | pending |
| 29-06-2 | 06 | 3 | C3 | service guard, row locks, status-guarded UPDATE | api unit | `surveys-sync.service`, `surveys.controller`, `surveys-upsert-fast-path`, `surveys.repository` | yes | pending |
| 29-06-3 | 06 | 3 | C3 | every write channel refuses, submit race consistent | api e2e | `surveys-visibility`, `surveys-submit`, `surveys-same-version`, `sync-installed-app-compat` | yes | pending |
| 29-07-1 | 07 | 3 | C1, C2 | outcome mapping, finish orchestration | mobile unit | `finish-outcome`, `useFinishSheet` | W0 | pending |
| 29-07-2 | 07 | 3 | C1 | sheet screen states | mobile unit | `FinishSheet.test.tsx` + `src/__checks__` | W0 | pending |
| 29-07-3 | 07 | 3 | C1 | route and native sheet options registered | mobile unit | `FinishSheetRoute`, `src/navigation`, `structure` | W0 | pending |
| 29-08-1 | 08 | 4 | C1, C7 | summary FinishBar opens the sheet, line wired | mobile unit | `SurveyDetailScreen`, `routes`, `structure` | yes | pending |
| 29-08-2 | 08 | 4 | C1 | pager pill opens the sheet, pager returns on success | mobile unit | `src/screens/survey-form`, `FactorDetailRoute` | yes | pending |
| 29-09-1 | 09 | 4 | C8 (D-12) | route enumeration and SQL scan so no read path skips the predicate | api unit (no DB) | `test/survey-read-paths.spec.ts` | W0 | pending |
| 29-09-2 | 09 | 4 | C4, C8 (D-12) | two-user matrix, identical 404 bodies | api e2e | `test/private-visibility.e2e-spec.ts` | W0 | pending |
| 29-09-3 | 09 | 4 | C4 (D-11, D-13) | numbering over private surveys, account deletion keeps privacy | api e2e | `test/private-visibility-retention.e2e-spec.ts` | W0 | pending |
| 29-10-1 | 10 | 5 | D-01, D-07 doc | contracts and superseded rule written | doc grep | grep assertions in the plan | n/a | pending |
| 29-10-2 | 10 | 5 | all | CLAUDE.md, specs, full gate | gate | greps + `npm run lint && npm run format:check` + typecheck + unit tests | n/a | pending |
| 29-10-3 | 10 | 5 | all | owner device checks DV-29-01 to DV-29-05 | manual checkpoint | owner | n/a | pending |
| 29-10-4 | 10 | 5 | D-01 | device checks recorded, REQUIREMENTS, ROADMAP, STATE last | doc grep | greps in the plan | n/a | pending |

*Status: pending, green, red, flaky. The executor updates the column.*

## Wave 0 Requirements

- [ ] `api/test/migration-024-visibility-backfill.e2e-spec.ts` (created by 29-01)
- [ ] `api/test/survey-read-paths.spec.ts` (29-09)
- [ ] `api/test/private-visibility.e2e-spec.ts` and `private-visibility-retention.e2e-spec.ts` (29-09)
- [ ] helper `createSubmittedSurvey` / `visibility` option in `api/test/helpers/surveys-e2e.ts` (29-04)
- [ ] `mobile/src/ui/RadioCard.test.tsx`, `VisibilityPicker.test.tsx`, `i18n/fr/catalogue-additions-29.test.ts`, `app/visibility-display.test.ts`, `screens/survey-detail/visibility-line.test.ts` (29-03)
- [ ] `mobile/src/screens/finish-sheet/*.test.ts`, `FinishSheet.test.tsx`, `navigation/routes/FinishSheetRoute.test.tsx` (29-07)
- [ ] `mobile/src/storage/surveys.visibility.sqlite.test.ts` (29-02), `SurveyHistoryRoute.test.tsx` (29-05)

No framework install is needed.

## Manual-Only Verifications

| Behavior | Requirement | Why manual | Steps |
|----------|-------------|------------|-------|
| DV-29-01 sheet: detents, grabber, both cards readable in light and dark, VoiceOver radio group, Shared pre-selected, finish then read-only line | C1, C6, C7 | native sheet and VoiceOver | owner iPhone, from the summary and from the factor pager |
| Airplane mode: choose Private, finish, postponed message, reopen still Private, back online finish | C2 | network state | device with airplane mode, against the Phase 29 API (local API or after deploy) |
| Second account cannot find the private survey (Explorer, search, parcel history, community page) | C4 | needs two real accounts | second account on another device or simulator against the Phase 29 API |
| After deploying migration 024 an old submitted survey shows "Partagé avec l'association" after one pull | C5 | needs a deployed backend with old data | dev backend |

Results go to `docs/user-tests/device-checks.md` (plan 29-10, task 4). Device checks must run against an API that contains Phase 29, otherwise private surveys would still be visible to others.

## Validation Sign-Off

- [x] All tasks have an `<automated>` verify or a Wave 0 dependency (the checkpoint task 29-10-3 is manual by design)
- [x] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Wave 0 files exist (set when executed)
- [x] No watch-mode flags
- [x] Feedback latency under 60 s per task
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
