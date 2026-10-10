---
phase: 24
slug: survey-history-split
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-09
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + ts-jest (mobile, api, ibp-domain); `react-test-renderer` and `@testing-library/react-native/pure` (hooks) on mobile; Supertest for API e2e |
| **Config file** | `mobile/jest.unit.config.js`, `api/jest.unit.config.js`, `api/jest.config.js` (e2e), `packages/ibp-domain/jest.config.js` |
| **Quick run command** | `cd mobile && npx jest --config jest.unit.config.js <paths>` (2 to 5 s); API: `cd api && npx jest --config jest.unit.config.js test/<spec>` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`, plus `npm run test:coverage:mobile` (coverage floors) for waves touching `src/navigation` or deleting tests |
| **Estimated runtime** | ~24 seconds for a targeted run; mobile full suite about 42 s, with coverage about 60 s |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` command (targeted Jest paths, plus `npx tsc --noEmit` where the task changes types)
- **After every plan wave:** Run `npm run lint && npm run typecheck && npm run test:unit && npm run format:check && npm run test:coverage:mobile`
- **Before `/gsd-verify-work`:** Full suite must be green; API e2e locally when `api/.env.test` exists, else the CI `e2e` job
- **Max feedback latency:** 24 seconds (targeted runs)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | REQ-C-history-split (D-10) | T-24-01, T-24-02 | Query filters and parameters unchanged (`["P1", 5]`, `["s-2", 20]`) | api unit | `cd api && npx jest --config jest.unit.config.js test/parcels.service.spec.ts test/community-surveys.service.spec.ts` | ✅ extend | ⬜ pending |
| 24-01-02 | 01 | 1 | REQ-C-history-split (D-10) | T-24-01 | Field present, no new data class | api e2e + typecheck | `cd mobile && npx tsc --noEmit && cd .. && npm --workspace api run build` (e2e: `cd api && npx jest --runInBand --config jest.config.js test/parcel-history.e2e-spec.ts test/community-survey-detail.e2e-spec.ts` with `api/.env.test`, else CI) | ✅ extend | ⬜ pending |
| 24-02-01 | 02 | 1 | REQ-C-history-split (D-01) | N/A | N/A | ui unit | `cd mobile && npx jest --config jest.unit.config.js src/ui/AppGroupedList.test.tsx src/__checks__/structure.test.ts` | ✅ extend | ⬜ pending |
| 24-02-02 | 02 | 1 | REQ-C-history-split (D-01) | T-24-04, T-24-05 | Malformed payload guarded, stale answers dropped | hook unit | `cd mobile && npx jest --config jest.unit.config.js src/hooks/useParcelSurveyHistory.test.ts src/screens/public-map src/screens/survey-detail/HistorySection.test.tsx` | ✅ extend | ⬜ pending |
| 24-02-03 | 02 | 1 | REQ-C-history-split (criterion 2) | N/A | Fewer requests with `withPhotos: false` | hook unit + contrast | `cd mobile && npx jest --config jest.unit.config.js src/hooks/useCommunitySurvey.test.ts src/app/visual-tokens.test.ts` | ✅ extend | ⬜ pending |
| 24-03-01 | 03 | 1 | REQ-C-history-split (D-11, D-12) | T-24-06 | Journal reads own events only | screen + catalogue + gates | `cd mobile && npx jest --config jest.unit.config.js src/screens/SurveyJournalScreen.test.tsx src/screens/survey-detail/EventsTab.test.tsx src/i18n src/__checks__` | ❌ W0 (new `SurveyJournalScreen.test.tsx`, test-first in this task) | ⬜ pending |
| 24-03-02 | 03 | 1 | REQ-C-history-split (D-13) | T-24-06 | `surveyJournal` absent from the Explorer param list | typecheck + gates | `cd mobile && npx tsc --noEmit && npx jest --config jest.unit.config.js src/__checks__/structure.test.ts src/__checks__/motion.test.ts src/i18n/catalogue.test.ts` | ✅ | ⬜ pending |
| 24-03-03 | 03 | 1 | REQ-C-history-split (D-13) | T-24-06 | Route registered in the survey stack only | navigation + coverage | `cd mobile && npx jest --config jest.unit.config.js src/navigation src/state/render-counts.test.tsx` then `npm run test:coverage:mobile` | ✅ extend | ⬜ pending |
| 24-04-01 | 04 | 2 | REQ-C-history-split (D-06, D-10) | T-24-08 | Non-finite totals clamped, finite coordinates | pure unit (TDD) | `cd mobile && npx jest --config jest.unit.config.js src/app/trend-geometry.test.ts` | ❌ W0 (new, test-first) | ⬜ pending |
| 24-04-02 | 04 | 2 | REQ-C-history-split (D-01, D-07, D-08, D-09, D-10) | T-24-08, T-24-09 | Unknown method tags never match; delta base is the survey just before | pure unit (TDD) + coverage | `cd mobile && npx jest --config jest.unit.config.js src/app/parcel-history.test.ts src/app/trend-geometry.test.ts` then `npm run test:coverage:mobile` | ❌ W0 (new, test-first) | ⬜ pending |
| 24-05-01 | 05 | 2 | REQ-C-history-split (D-12) | T-24-10 | No ids in catalogue strings | catalogue | `cd mobile && npx jest --config jest.unit.config.js src/i18n src/__checks__/catalogue-dash.test.ts src/screens/survey-detail/HistorySection.test.tsx src/screens/public-map` | ❌ W0 (new `i18n/fr/parcel-history.test.ts`, test-first) | ⬜ pending |
| 24-05-02 | 05 | 2 | REQ-C-history-split (D-01, D-12) | T-24-10 | N/A | catalogue | `cd mobile && npx jest --config jest.unit.config.js src/i18n src/__checks__/catalogue-dash.test.ts src/navigation/navigation.test.tsx` | ✅ extend | ⬜ pending |
| 24-06-01 | 06 | 2 | REQ-C-history-split (D-02, D-04) | T-24-06, T-24-11 | Journal option not destructive, Supprimer last | screen + route | `cd mobile && npx jest --config jest.unit.config.js src/screens/SurveyDetailScreen.test.tsx src/navigation/routes/routes.test.tsx src/__checks__/structure.test.ts && npx tsc --noEmit` | ✅ extend | ⬜ pending |
| 24-06-02 | 06 | 2 | REQ-C-history-split (D-02, D-03, D-05) | T-24-06 | Menu only on the owner's summary | hook + screen + coverage | `cd mobile && npx jest --config jest.unit.config.js src/screens/survey-detail/useSurveyDetailHeader.test.tsx src/screens/SurveyDetailScreen.test.tsx && npx tsc --noEmit` then `npm run test:coverage:mobile` | ✅ extend | ⬜ pending |
| 24-07-01 | 07 | 3 | REQ-C-history-split (D-01) | T-24-12 | No request offline or without a token | pure + hook unit | `cd mobile && npx jest --config jest.unit.config.js src/screens/survey-detail/history-row.test.ts src/screens/survey-detail/useHistoryRow.test.ts` | ❌ W0 (new, test-first) | ⬜ pending |
| 24-07-02 | 07 | 3 | REQ-C-history-split (D-01, D-02) | N/A | N/A | screen + gates + coverage | `cd mobile && npx jest --config jest.unit.config.js src/screens/SurveyDetailScreen.test.tsx src/i18n src/__checks__` then `npm run test:coverage:mobile` | ✅ extend | ⬜ pending |
| 24-08-01 | 08 | 3 | REQ-C-history-split (D-06, D-10) | T-24-08, T-24-13 | One reveal per mount, Reduce Motion honoured, no loop | component (SVG, Reanimated mock) + gates | `cd mobile && npx jest --config jest.unit.config.js src/screens/survey-detail/TrendCurve.test.tsx src/__checks__/motion.test.ts src/__checks__/fonts.test.ts src/__checks__/layers.test.ts src/__checks__/structure.test.ts` | ❌ W0 (new, test-first; simulator spike first) | ⬜ pending |
| 24-08-02 | 08 | 3 | REQ-C-history-split (D-06, D-10) | N/A | Forest card adds no animated hero layer | component + gates | `cd mobile && npx jest --config jest.unit.config.js src/screens/survey-detail/TrendCard.test.tsx src/screens/survey-detail/TrendCurve.test.tsx src/__checks__` | ❌ W0 (new, test-first) | ⬜ pending |
| 24-09-01 | 09 | 3 | REQ-C-history-split (D-07) | N/A | N/A | component + gates | `cd mobile && npx jest --config jest.unit.config.js src/screens/survey-detail/FactorDeltasCard.test.tsx src/__checks__/structure.test.ts src/__checks__/layers.test.ts` | ❌ W0 (new, test-first) | ⬜ pending |
| 24-09-02 | 09 | 3 | REQ-C-history-split (D-08) | T-24-14, T-24-15 | Rows open the read-only page only | component + gates | `cd mobile && npx jest --config jest.unit.config.js src/screens/survey-detail/HistoryList.test.tsx src/screens/survey-detail/FactorDeltasCard.test.tsx src/__checks__` | ❌ W0 (new, test-first) | ⬜ pending |
| 24-10-01 | 10 | 4 | REQ-C-history-split (D-06 to D-10) | N/A | N/A | component | `cd mobile && npx jest --config jest.unit.config.js src/screens/survey-detail/ParcelHistoryView.test.tsx` | ❌ W0 (new, test-first) | ⬜ pending |
| 24-10-02 | 10 | 4 | REQ-C-history-split (criterion 1, D-13) | T-24-08, T-24-16 | Offline: no request; error action reloads | screen + route + coverage | `cd mobile && npx jest --config jest.unit.config.js src/screens/SurveyHistoryScreen.test.tsx src/navigation src/state/render-counts.test.tsx` then `npm run test:coverage:mobile` | ✅ rewrite | ⬜ pending |
| 24-10-03 | 10 | 4 | REQ-C-history-split (criterion 1) | N/A | N/A | gates + coverage | `cd mobile && npx jest --config jest.unit.config.js src/__checks__ src/i18n src/screens/survey-detail` then `npm run test:coverage:mobile` | ✅ (deletes `HistorySection.test.tsx`) | ⬜ pending |
| 24-11-01 | 11 | 5 | REQ-C-history-split (criterion 2, D-03) | T-24-06 | Community page never imports the journal, events or header hook (source test) | screen + route + source test | `cd mobile && npx jest --config jest.unit.config.js src/screens/community-survey src/navigation/routes/routes.test.tsx src/i18n src/__checks__/structure.test.ts && npx tsc --noEmit` | ✅ extend | ⬜ pending |
| 24-11-02 | 11 | 5 | REQ-C-history-split (criterion 2, D-13) | T-24-06, T-24-17 | Community history loads without photos; no journal path (source test) | screen + typecheck | `cd mobile && npx jest --config jest.unit.config.js src/screens/community-survey && npx tsc --noEmit` | ❌ W0 (new `CommunityHistoryScreen.test.tsx`, test-first) | ⬜ pending |
| 24-11-03 | 11 | 5 | REQ-C-history-split (D-13) | T-24-06 | `surveyJournal` not in the Explorer stack | navigation + coverage | `cd mobile && npx jest --config jest.unit.config.js src/navigation src/state/render-counts.test.tsx` then `npm run test:coverage:mobile` | ✅ extend | ⬜ pending |
| 24-12-01 | 12 | 6 | REQ-C-history-split | N/A | N/A | doc grep | `grep -q "surveyJournal" CLAUDE.md && grep -q "communityHistory" CLAUDE.md && grep -q "parcel-history.ts" CLAUDE.md` | ✅ | ⬜ pending |
| 24-12-02 | 12 | 6 | REQ-C-history-split (criterion 3) | T-24-18, T-24-19, T-24-20 | Owner checkout restored, clean tree; blocking-human gate | full suite + manual | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check` + owner phone check | ✅ | ⬜ pending |
| 24-12-03 | 12 | 6 | REQ-C-history-split | T-24-19 | Marked done only after "go" | doc grep | `grep -q "\[x\] \*\*REQ-C-history-split\*\*" .planning/REQUIREMENTS.md && grep "^| OA-124" docs/user-tests/owner-acceptance.md \| grep -q "Closed"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No separate Wave 0 plan: every new test file is written test-first (RED, then GREEN) inside the task that creates its module, and no framework or fixture install is needed.

- [ ] `mobile/src/app/trend-geometry.test.ts` (24-04-01) and `mobile/src/app/parcel-history.test.ts` (24-04-02), with the shared helper `mobile/test/parcel-history-fixtures.ts` (24-04-02) used by every later view test
- [ ] `mobile/src/i18n/fr/parcel-history.test.ts` (24-05-01) and the `LIST_ARGUMENTS` entry for `parcelHistory.page.trend.a11y` in `mobile/src/i18n/catalogue.test.ts`
- [ ] `mobile/src/screens/SurveyJournalScreen.test.tsx` (24-03-01)
- [ ] `mobile/src/screens/survey-detail/history-row.test.ts`, `useHistoryRow.test.ts` (24-07-01)
- [ ] `TrendCurve.test.tsx`, `TrendCard.test.tsx` (24-08), `FactorDeltasCard.test.tsx`, `HistoryList.test.tsx` (24-09), `ParcelHistoryView.test.tsx` (24-10-01)
- [ ] `mobile/src/screens/community-survey/CommunityHistoryScreen.test.tsx` (24-11-02)
- [ ] `jest.mock` entries for `SurveyJournalScreen` and `CommunityHistoryScreen` in `state/render-counts.test.tsx`, `navigation/navigation.test.tsx` and `navigation/routes/routes.test.tsx` (24-03-03, 24-11-03)
- [x] Framework install: none (existing Jest, mocks for react-native-svg, Reanimated, expo-network and fake navigation already in `mobile/test/`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Owner confirms the split on the phone, light and dark | REQ-C-history-split (ROADMAP criterion 3) | Owner acceptance is the phase's exit criterion | Plan 24-12 Task 2 "how-to-verify" steps 1 to 9 on the owner's iPhone (Release build from the main checkout) |
| Curve reveal repaints on device (clip-rect assumption A1) | REQ-C-history-split (D-06) | Native SVG repaint of an animated clip cannot be observed in Jest | Plan 24-08 Task 1 simulator spike sets `TREND_REVEAL_MODE`; plan 24-12 step 2 confirms on the phone; fallback `"dash"` |
| Arrow U+2192 renders from the system font (A2) | REQ-C-history-split (D-01) | Glyph fallback depends on the device fonts | Plan 24-12 step 1; fallback " à " in `fr.surveyDetail.rows.historyValue` |
| "Historique de la parcelle" wraps on two lines at 375 pt and at large Dynamic Type, value never truncated (A3) | REQ-C-history-split (D-01) | Text measurement on a real screen | Plan 24-12 step 1 on a 375 pt class iPhone or simulator, plus the largest accessibility text size |
| Reduce Motion on and off | REQ-C-history-split (criterion 3) | System setting | Plan 24-12 step 8 |
| Android / Expo Go sheet shows "Journal du relevé" then "Supprimer" | REQ-C-history-split (D-02) | Android device pass is carried by Phase 28 | Covered by `SurveyDetailScreen.test.tsx` sheet options; device pass in Phase 28 |
| API e2e for the new field | REQ-C-history-split (D-10) | Needs PostgreSQL and `api/.env.test` | Locally when `api/.env.test` exists, else the CI `e2e` job (plan 24-01 Task 2) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (each new test file is created test-first by its own task)
- [x] No watch-mode flags
- [x] Feedback latency < 24s for targeted runs (coverage runs at wave ends)
- [ ] `nyquist_compliant: true` set in frontmatter (left to the plan checker after review)

**Approval:** pending
