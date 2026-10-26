---
phase: 33
slug: pdf-export-exhaustive-and-simplified
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-23
planned: 2026-10-24
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `33-RESEARCH.md`, section "Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + ts-jest, `testEnvironment: node` |
| **Config file** | `mobile/jest.unit.config.js` (roots `src`, coverage ratchet) |
| **Quick run command** | `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/screens/survey-detail src/navigation src/__checks__ src/i18n` |
| **Full suite command** | `npm run test:unit`, plus `npm run lint`, `npm run typecheck`, `npm run format:check` |
| **Estimated runtime** | ~30 s quick, a few minutes full |

---

## Sampling Rate

- **After every task commit:** the quick run command
- **After every plan wave:** `npm run test:unit`, `npm run lint`, `npm run typecheck`
- **Before `/gsd-verify-work`:** full suite green, device measurements recorded in the summary, RC-05 closed
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

Filled by the planner (2026-10-24), one row per task of the 15 plans. `jest` below means `cd mobile && npx jest -c jest.unit.config.js <paths> --coverage=false`; `tsc` means `cd mobile && npx tsc --noEmit -p .`. Every task also runs the acceptance greps of its plan.

| Task ID | Plan | Wave | Requirement | Threat Ref | Behavior proved | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 33-01-T1 | 01 | 1 | REQ-C-pdf-lean-export | T-33-01 | harness recipe written, baseline page counts and sizes of 5 scenarios on Chrome | artifact check | `test -f .../33-RENDER-HARNESS.md && grep -q "Baseline (before phase 33)" ... && git status --porcelain mobile api packages docs` empty | ❌ W0 (created by the task) | ⬜ pending |
| 33-01-T2 | 01 | 1 | REQ-C-pdf-modern-layout | T-33-01 | P-1 to P-5 Chromium verdicts, device probe brief | artifact check | `grep -q "Design probe (Chromium)"` and P-1..P-5 rows in `33-RENDER-HARNESS.md` | ❌ W0 | ⬜ pending |
| 33-02-T1 | 02 | 1 | REQ-C-pdf-modern-layout | n/a | `ExportMode`, `pageStyle`, seven forest palette keys, contrast pins | unit | `jest src/app/survey-pdf/palette.test.ts` | ✅ (edited) | ⬜ pending |
| 33-02-T2 | 02 | 1 | REQ-C-pdf-summary-page | T-33-03, T-33-04, T-33-05 | fixtures with mode and summary variants; loader skips photos, summary frame 515 x 228, draft coerced, no token in data | unit | `jest src/app/survey-pdf/assemble-export-data.test.ts src/app/survey-pdf/export-settings.test.ts` | ✅ (edited) | ⬜ pending |
| 33-02-T3 | 02 | 1 | REQ-C-pdf-two-versions | T-33-04 | facade type export, three runtime keys; `buildSurveyExportInput(args, mode)` coerces a draft summary | unit + typecheck | `jest src/app/survey-pdf-export.test.ts src/screens/survey-detail/useSurveyPdfExport.test.ts src/app/survey-pdf && tsc` | ✅ (edited) | ⬜ pending |
| 33-03-T1 | 03 | 2 | REQ-QA-pdf-sections-registry | n/a | ordered frozen registry, unique ids, mode filter, assembler names no section, complete document unchanged | unit | `jest src/app/survey-pdf/sections.test.ts src/app/survey-pdf/build-html.test.ts` | ❌ W0 (`sections.test.ts` new) | ⬜ pending |
| 33-03-T2 | 03 | 2 | REQ-C-pdf-modern-layout | T-33-06, T-33-07, T-33-08 | cover and summary page kinds, draft banner and watermark on the cover, no header logo, `sectionTitleCss` | unit + typecheck | `jest src/app/survey-pdf && tsc` | ✅ (edited) | ⬜ pending |
| 33-04-T1 | 04 | 2 | REQ-C-pdf-summary-page | n/a | cover and summary strings, `-resume` suffix word, dash and abbreviation gates | unit | `jest src/i18n/fr/survey-export.test.ts src/__checks__/catalogue-dash.test.ts src/__checks__/abbreviations.test.ts` | ✅ (edited) | ⬜ pending |
| 33-04-T2 | 04 | 2 | REQ-C-pdf-commune-row | T-33-10, T-33-11 | one Commune row "77186 (département 77)", 2A, 974, 988, malformed; `shortenText`, `shortenList` | unit + typecheck | `jest src/app/survey-pdf/identity.test.ts src/app/survey-pdf/html.test.ts src/app/survey-pdf/build-html.test.ts src/i18n && tsc` | ✅ (edited) | ⬜ pending |
| 33-04-T3 | 04 | 2 | REQ-C-pdf-two-versions | T-33-09 | file name by mode, SAFE pattern over every combination, runner passes mode | unit + typecheck | `jest src/app/survey-pdf/file-name.test.ts src/app/survey-pdf/run-export.test.ts src/app/survey-pdf-export.test.ts && tsc` | ✅ (edited) | ⬜ pending |
| 33-05-T1 | 05 | 2 | REQ-C-pdf-two-versions | T-33-12, T-33-13 | `fr.surveyExportChoice` strings; selection hook, draft fallback, close on missing survey | unit | `jest src/i18n/fr/survey-export-choice.test.ts src/screens/export-choice/useExportChoice.test.ts src/__checks__/catalogue-dash.test.ts src/__checks__/abbreviations.test.ts` | ❌ W0 (new tests) | ⬜ pending |
| 33-05-T2 | 05 | 2 | REQ-C-pdf-two-versions | T-33-12 | sheet layout, disabled dimmed summary card, draft sentence live region, test ids, gates | unit + typecheck | `jest src/screens/export-choice src/__checks__ && tsc` | ❌ W0 (`ExportChoiceSheet.test.tsx` new) | ⬜ pending |
| 33-06-T1 | 06 | 3 | REQ-C-pdf-lean-export | T-33-14 | one identity card with the method, 29 units shorter, nowrap ids, `methodShortText` | unit | `jest src/app/survey-pdf/identity.test.ts src/app/survey-pdf/build-html.test.ts` | ✅ (edited) | ⬜ pending |
| 33-06-T2 | 06 | 3 | REQ-C-pdf-modern-layout | T-33-15 | section titles and radius 12 on conditions, route, factor cards; tone strip; OBS_WIDTH 312; inkMuted chips | unit + typecheck | `jest src/app/survey-pdf && tsc` | ✅ (edited) | ⬜ pending |
| 33-07-T1 | 07 | 3 | REQ-C-pdf-modern-layout | T-33-16, T-33-17 | print ring geometry and clamping, no opacity; `scoreBands` | unit | `jest src/app/survey-pdf/ring-svg.test.ts src/app/survey-pdf/score-section.test.ts` | ❌ W0 (`ring-svg.test.ts` new) | ⬜ pending |
| 33-07-T2 | 07 | 3 | REQ-C-pdf-modern-layout | T-33-16 | rx 4 bars, captions option, chart 160, pins hold | unit | `jest src/app/survey-pdf/factor-chart-svg.test.ts src/app/survey-pdf/build-html.test.ts` | ✅ (edited) | ⬜ pending |
| 33-07-T3 | 07 | 3 | REQ-C-pdf-modern-layout | n/a | trend area, point and label styles, `resolveTrend` kinds incl. stale cache, block unchanged | unit + typecheck | `jest src/app/survey-pdf && tsc` | ✅ (edited) | ⬜ pending |
| 33-08-T1 | 08 | 3 | REQ-C-pdf-summary-page | T-33-18 | shared map figure (basemap, outline, no geometry) at 250 and 228, map section unchanged in output, `map-projection.ts` untouched | unit | `jest src/app/survey-pdf/map-figure.test.ts src/app/survey-pdf/map-section.test.ts src/app/survey-pdf/map-projection.test.ts src/app/survey-pdf/build-html.test.ts` | ❌ W0 (`map-figure.test.ts` new) | ⬜ pending |
| 33-08-T2 | 08 | 3 | REQ-C-pdf-lean-export | T-33-19 | map frame 515 x 250, photo trial 640 / 0.6, dead fill constant gone, photo titles and radius | unit + typecheck | `jest src/app/survey-pdf && tsc` | ✅ (edited) | ⬜ pending |
| 33-09-T1 | 09 | 3 | REQ-C-pdf-two-versions | n/a | `estimateCompletePages` formula (photo pages, cap 24, floor 2, NaN and negatives), no builder or fixture dependency; facade four functions | unit | `jest src/app/survey-pdf/page-estimate.test.ts src/app/survey-pdf-export.test.ts` | ❌ W0 (`page-estimate.test.ts` new) | ⬜ pending |
| 33-09-T2 | 09 | 3 | REQ-C-pdf-two-versions | T-33-20, T-33-21, T-33-22 | `surveyExportChoice` registered as form sheet / modal; route returns `{ mode, nonce }` by `popTo`; 100 % route coverage | unit + typecheck | `jest src/navigation src/__checks__ && tsc` plus the 100 % coverage command of the plan | ❌ W0 (`ExportChoiceRoute.test.tsx` new) | ⬜ pending |
| 33-10-T1 | 10 | 4 | REQ-C-pdf-modern-layout | T-33-23, T-33-24 | cover forest panel: contours, logo tile, title, date, score and pill, provisional line, escaping | unit | `jest src/app/survey-pdf/cover-section.test.ts` | ❌ W0 (new) | ⬜ pending |
| 33-10-T2 | 10 | 4 | REQ-C-pdf-lean-export | T-33-23 | tiles with rings, six facts with draft shift, one cover page with banner, no opacity or gradient | unit + typecheck | `jest src/app/survey-pdf/cover-section.test.ts src/__checks__ && tsc` plus the coverage command of the plan | ❌ W0 (new) | ⬜ pending |
| 33-11-T1 | 11 | 4 | REQ-C-pdf-summary-page | T-33-25 | zones sum to 764, title band, score card ring, chart 299 x 156 | unit | `jest src/app/survey-pdf/summary-section.test.ts` | ❌ W0 (new) | ⬜ pending |
| 33-11-T2 | 11 | 4 | REQ-C-pdf-summary-page | T-33-25, T-33-26, T-33-27 | map, evolution, sources; every fallback; one page for every summary fixture and variant | unit + typecheck | `jest src/app/survey-pdf/summary-section.test.ts src/__checks__ && tsc` plus the coverage command of the plan | ❌ W0 (new) | ⬜ pending |
| 33-12-T1 | 12 | 4 | REQ-C-pdf-two-versions | T-33-28, T-33-29 | one export per nonce, `share(mode)`, draft summary coerced, lock kept | unit | `jest src/screens/survey-detail/useExportRequest.test.ts src/screens/survey-detail/useSurveyPdfExport.test.ts` | ❌ W0 (`useExportRequest.test.ts` new) | ⬜ pending |
| 33-12-T2 | 12 | 4 | REQ-C-pdf-two-versions | T-33-28 | "Partager" opens the sheet, request applied once and cleared, screen under 400 lines | unit + typecheck | `jest src/screens/SurveyDetailScreen.test.tsx src/navigation src/__checks__ src/screens/survey-detail && tsc` | ✅ (edited) | ⬜ pending |
| 33-13-T1 | 13 | 5 | REQ-QA-pdf-sections-registry | T-33-30, T-33-31 | cover and summary registered, `build-html.ts` untouched, B.11 page targets (missed target: remediation order a, b L1 to L5, then report), map and trend share a page, whole blocks, no photo-only page before the last with fewer than two photos, one-page summary documents | unit + typecheck | `jest src/app/survey-pdf && tsc` | ✅ (edited) | ⬜ pending |
| 33-13-T2 | 13 | 5 | REQ-C-pdf-two-versions | n/a | old score card code gone, `COMPLETE_BASE_PAGES` from the final builder, estimate pinned exact on the typical fixture and within one page on the others, `src/app/` coverage floor | unit + typecheck | `jest src/app/survey-pdf src/app/survey-pdf-export.test.ts src/screens && tsc` plus the coverage command of the plan | ✅ (edited) | ⬜ pending |
| 33-14-T1 | 14 | 6 | REQ-C-pdf-lean-export | T-33-32, T-33-33, T-33-36 | Chromium rows on the final code, then iOS simulator: counts, sizes, fonts, images, bottoms, alignment, times, probe verdicts; or "not measured" with the reason, carried to 33-15 | device measurement (recorded) | `33-14-MEASUREMENTS.md` has at least 12 `chrome` rows and 13 `ios` rows (pdfinfo pages and size), or the line `iOS simulator: not measured` | ❌ W0 (measurement file created by the task) | ⬜ pending |
| 33-14-T2 | 14 | 6 | REQ-C-pdf-lean-export | T-33-32, T-33-36 | Android emulator: same measurements, or "not measured" carried to 33-15 | device measurement (recorded) | `33-14-MEASUREMENTS.md` has 13 `android` rows, or the line `Android emulator: not measured` | ✅ (after T1) | ⬜ pending |
| 33-14-T3 | 14 | 6 | REQ-C-pdf-modern-layout | n/a | constants fixed with measurements, weight against the 33-01 baseline for typical and worst at both photo settings, summary under 200 KB or an open item, open items for the owner, fallbacks applied, RC-05 closed, DC-33 rows, CLAUDE.md updated | unit + doc check | `jest src/app/survey-pdf src/__checks__` and `grep -q "DC-33-01" docs/user-tests/device-checks.md && grep -q "surveyExportChoice" CLAUDE.md`; full gates | ✅ (edited) | ⬜ pending |
| 33-15-T1 | 15 | 7 | REQ-C-pdf-two-versions | T-33-35 | Release build installed on the owner's iPhone from the worktree | install check | `xcrun devicectl device info apps --device 00008130-001829D822F2001C \| grep -q fr.etatssauvages.cortege` | n/a | ⬜ pending |
| 33-15-T2 | 15 | 7 | all five REQ-C ids | T-33-34 | owner review of both versions, including every open item carried from 33-14 (checkpoint) | manual (human-verify) | resume signal | n/a | ⬜ pending |
| 33-15-T3 | 15 | 7 | REQ-C-pdf-modern-layout | n/a | DV-33-01 to DV-33-05 rows and the gap list | doc check | `grep -c "DV-33-0[1-5]" docs/user-tests/device-checks.md` at least 5 | ✅ (edited) | ⬜ pending |

Requirement map (from the research, kept for reference):

| Requirement | Behavior | Test Type | Automated Command | File Exists |
|-------------|----------|-----------|-------------------|-------------|
| REQ-QA-pdf-sections-registry | unique ids, pinned order, mode filter, summary omits photo and factor sections, CSS only of included sections | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf/sections.test.ts src/app/survey-pdf/build-html.test.ts` | ❌ W0 (`sections.test.ts`), `build-html.test.ts` edited |
| REQ-C-pdf-two-versions | `mode` flows from input to data, facade keys unchanged, hook refuses summary on a draft, sheet disables the card, nonce handled once | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf-export.test.ts src/screens/survey-detail/useSurveyPdfExport.test.ts` plus the new sheet and request tests | edit + ❌ W0 |
| REQ-C-pdf-summary-page | one page for worst inputs, basemap present or absent, no history, one survey, stale cache, no photo read in the loader | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf/summary-section.test.ts src/app/survey-pdf/assemble-export-data.test.ts` | ❌ W0 |
| REQ-C-pdf-modern-layout | cover block, palette keys and contrast, ring/bars/trend SVG strings, no em dash, only `data:` URIs, no network attribute | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf/cover-section.test.ts src/app/survey-pdf/palette.test.ts src/app/survey-pdf/styles.test.ts` | ❌ W0 + edits |
| REQ-C-pdf-lean-export | page counts of all fixtures not above today's, map and trend share a page, no block cut | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf/build-html.test.ts src/app/survey-pdf/paginate.test.ts` | edit |
| REQ-C-pdf-commune-row | one Commune row, "77186 (département 77)", 2A/2B, 971, 98x, malformed id | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf/identity.test.ts` | edit |
| file naming | suffix by mode, regex, draft | unit | `npx jest -c jest.unit.config.js src/app/survey-pdf/file-name.test.ts` | edit |
| gates | dash, abbreviations, structure, icons | unit | `npx jest -c jest.unit.config.js src/__checks__` | ✅ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Design probe: Chromium in plan 33-01 (probe page P-1 to P-5, throwaway, not committed); WebKit and Skia in plan 33-14 with the same probe page and the pass rule of UI-SPEC B.2
- [ ] New test files, each created by the plan that needs it: `sections.test.ts` (33-03), `survey-export-choice.test.ts`, `useExportChoice.test.ts`, `ExportChoiceSheet.test.tsx` (33-05), `ring-svg.test.ts` (33-07), `map-figure.test.ts` (33-08), `page-estimate.test.ts`, `ExportChoiceRoute.test.tsx` (33-09), `cover-section.test.ts` (33-10), `summary-section.test.ts` (33-11), `useExportRequest.test.ts` (33-12)
- [ ] Fixtures (33-02): `mode` on the existing fixtures; `exportFixtureTypical`, `exportFixtureTypicalConditioned`, `exportFixtureSummary`, `exportFixtureSummaryWorst`, `summaryVariant(kind)` for `noBasemap`, `noGeometry`, `noParcel`, `noHistory`, `firstSurvey`, `staleCache`
- [ ] `palette.test.ts` key list and contrast pairs for the seven new keys (33-02)
- [ ] The reusable local render harness (throwaway jest test + Chrome headless) written once in `33-RENDER-HARNESS.md` by plan 33-01 and referenced by the builder plans

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Page counts, file weight, alignment of SVG and gradients, share sheet, generation time on iOS and Android | REQ-C-pdf-lean-export, REQ-C-pdf-modern-layout | print engines differ (WebKit, Chromium); height and width constants are device-measured | iOS simulator, Android emulator, then the owner's iPhone; `pdfinfo`, `pdffonts`, `pdfimages`, `pdftotext -bbox` as in 25.1-07 |
| Owner review of both versions on the phone | success criterion 2 | taste and fitness for patrons | the owner exports both versions of a submitted survey and a draft |

---

## Validation Sign-Off

- [x] All tasks have an automated verify or a Wave 0 dependency (the owner checkpoint 33-15-T2 is manual by nature; 33-14-T1 and T2 verify that the throwaway harness is gone and record the device numbers)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (every new test file is created by the task that needs it, listed above)
- [x] No watch-mode flags
- [ ] Feedback latency < 30 s (per-task jest runs are scoped; the two coverage commands of 33-13-T2 and the full gates take a few minutes)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-26 (owner review of the last build on the iPhone)
