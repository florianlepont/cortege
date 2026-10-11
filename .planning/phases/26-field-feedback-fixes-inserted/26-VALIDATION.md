---
phase: 26
slug: field-feedback-fixes-inserted
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-10
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> "decision D-0x" = CONTEXT decision. "DC-D-0x" = device check in `docs/user-tests/device-checks.md`. "SC-n" = ROADMAP success criterion n.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + ts-jest (`--runInBand`), mobile workspace |
| **Config file** | `mobile/jest.unit.config.js` |
| **Quick run command** | `cd mobile && npx jest -c jest.unit.config.js <path or pattern> --coverage=false` |
| **Full suite command** | `npm run test:unit` (CI: `npm --workspace mobile run test:unit:coverage`) |
| **Quality gates** | `npm run lint`, `npm run typecheck`, `npm run format:check` |
| **Estimated runtime** | quick ~3 s per file; full suite a few minutes |

---

## Sampling Rate

- **After every task commit:** targeted jest file(s) from the map below, `--coverage=false`
- **After every plan wave:** `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`
- **Before `/gsd-verify-work`:** `npm --workspace mobile run test:unit:coverage` green (100 % floors on `src/map/`, `src/recognition/`, `src/i18n/`, `src/navigation/`)
- **Max feedback latency:** 30 seconds for the targeted run

---

## Per-Task Verification Map

Task IDs are assigned by the planner; rows are keyed by requirement until then.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| D-01 | Local reader returns every own survey (draft and submitted) with score and parcel ids | sqlite unit | `npx jest -c jest.unit.config.js src/storage/surveys.map-sources.sqlite.test.ts` | ✅ | ✅ green |
| D-01 | Builder: draft vs own split, dedup against API ids, skip when no position/score | unit | `... src/map/own-surveys.test.ts` | ✅ | ✅ green |
| D-01 | Route merges both groups; own surveys open own detail, others open community page | unit | `... src/navigation/routes/routes.test.tsx -t PublicMapRoute` | ✅ | ✅ green |
| D-02 | "Hors connexion" badge when offline | unit | `... src/screens/public-map/ScoreLegend.test.tsx` | ✅ | ✅ green |
| D-03 | Offline copy and Retry on both community pages | unit | `... src/screens/community-survey src/ui/CenteredState.test.tsx` | ✅ | ✅ green |
| D-04 | Registry entries, info sheet open/close, a11y label, 44 pt target | unit | `... src/ui/AbbreviationInfo.test.tsx` | ✅ | ✅ green |
| D-05 | Gate fails on an unexplained abbreviation; real catalogue clean | unit | `... src/__checks__/abbreviations.test.ts` | ✅ | ✅ green |
| D-06 | Latin, accent-insensitive sort; picker and PDF list sorted; no mutation of stored order | unit | `... src/app/genus-order.test.ts src/ui/FactorGenusListInput.test.tsx` | ✅ | ✅ green |
| D-07 | Recognition modal keeps confidence order | unit | `... src/ui/GenusRecognitionModal.test.tsx` | ✅ | ✅ green |
| D-08 | Compact mode below the height threshold; map share under 50 % per listed device | unit | `... src/screens/parcel-selection/layout-budget.test.ts` | ✅ | ✅ green |
| SC-7 | No temp file left after ok, unavailable and thrown paths; guard refuses foreign URIs | unit | `... src/recognition` | ✅ | ✅ green |
| Gates | No em dash, outline icons, 400-line cap, colour literals, motion | unit/lint | `... src/__checks__` and `npm run lint` | ✅ | ✅ green |

*Status: ✅ green · ✅ green · ❌ red · ⚠️ flaky*

### Task mapping (planner, 2026-10-10)

| Requirement | Plan / task | Test file(s) |
|-------------|-------------|--------------|
| SC-7 | 26-01 T1, T2, T3 | `src/recognition/temp-files.test.ts`, `genusClassifierModel.test.ts`, `timing.test.ts`, `src/app/feature-flags.test.ts`, `src/ui/GenusRecognitionModal.test.tsx` |
| D-07 | 26-01 T3 | `src/ui/GenusRecognitionModal.test.tsx` (confidence order case) |
| D-06, D-10 | 26-02 T1, T2 | `src/app/genus-order.test.ts`, `src/ui/FactorGenusListInput.test.tsx`, `src/app/survey-pdf/factor-fields.test.ts` |
| D-03 | 26-03 T1, T2 | `src/ui/CenteredState.test.tsx`, `src/screens/community-survey/*.test.tsx`, `src/navigation/routes/routes.test.tsx` |
| D-01, D-09 | 26-04 T1, T2 | `src/storage/surveys.map-sources.sqlite.test.ts`, `src/map/own-surveys.test.ts` |
| D-08 | 26-05 T1, T2 | `src/screens/parcel-selection/layout-budget.test.ts`, `ParcelSelectionCard.test.tsx` |
| D-05, D-11 | 26-06 T1, T2 | `src/i18n/catalogue.test.ts`, `src/__checks__/abbreviations.test.ts` (pending ratchet) |
| D-04, D-11 | 26-07 T1, T2 | `src/ui/AbbreviationInfo.test.tsx`, `SurveyScoreScreen.test.tsx`, `SurveyWizardScreen.test.tsx`, `ScoreLegend.test.tsx` |
| D-01, D-02, D-09 | 26-08 T1, T2 | `src/hooks/useLocalSurveyMapData.test.ts`, `routes.test.tsx -t PublicMapRoute`, `PublicMapScreen.test.tsx` |
| D-04, D-05, D-11 | 26-09 T1, T2 | `src/__checks__/abbreviations.test.ts` (asserts `[]`), `ClusterListSheet.test.tsx`, `src/i18n/fr/survey-export.test.ts` |
| SC-1, SC-7, D-01, D-03, D-08 (manual) | 26-10 T2, T3 | device and simulator checks recorded in `docs/user-tests/device-checks.md` |

---

## Wave 0 Requirements

- [x] `mobile/src/map/own-surveys.test.ts` and `mobile/src/storage/surveys.map-sources.sqlite.test.ts`
- [x] `mobile/src/ui/CenteredState.test.tsx`
- [x] `mobile/src/__checks__/abbreviations.test.ts` and `mobile/src/ui/AbbreviationInfo.test.tsx`
- [x] `mobile/src/app/genus-order.test.ts`
- [x] `mobile/src/screens/parcel-selection/layout-budget.test.ts`
- [x] `mobile/src/recognition/temp-files.test.ts`

Framework install: none (Jest already configured).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Model loads and recognises on two real Android phones (Release build) | SC-1, DC-D-01 | Needs physical phones | Install Release APK, take photos online and in airplane mode, confirm suggestions |
| Latency median and p95 vs 3 s, online and airplane mode | SC-7, DC-D-01 | Real hardware timing | Timing line via logcat, record in `docs/user-tests/device-checks.md` |
| No photo lingers after a recognition | SC-7, DC-D-03 | Device file system | Inspect app cache after recognitions on iPhone and Android |
| Offline community survey page centred, inside safe area | D-03 | Native large-title frame cannot run in Jest | iOS simulator and device, airplane mode, tap another member's survey |
| Parcel-selection map share on the smallest screen | D-08 | Real layout heights | iPhone SE 3 simulator, Android `wm size 1080x1920`/Pixel_8 |
| Offline own surveys after restart | D-01 | Real SQLite and map | Airplane mode, force quit, relaunch, Explorer |
| Recognition on two real Android phones, latency median and p95 vs 3 s, empty cache folders | SC-1, SC-7 (DC-D-01 to DC-D-03) | Needs physical Android phones; DEFERRED by the owner on 2026-10-11 (none available), to be run by the Android testers | Release APK with EXPO_PUBLIC_GENUS_TIMING=true, protocol in docs/user-tests/device-checks.md |
| Full parcel card at 393 x 852; wizard-step and Explorer-legend IBP glyphs on Android | D-08, D-04 | Visual, not checked on a device | Open the screens on a phone or simulator |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30 s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-11

## Validation Audit 2026-10-11

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 12 test files of the map exist and pass (267 targeted tests); the full mobile suite is 325 suites, 4362 tests, with the 100 % floors of src/map, src/recognition, src/i18n and src/navigation held. Device behaviour was checked on the Pixel_8 emulator and the owner's iPhone (see 26-VERIFICATION.md); the two items above remain manual.
