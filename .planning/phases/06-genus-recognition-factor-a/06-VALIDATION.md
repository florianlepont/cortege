---
phase: 06
slug: genus-recognition-factor-a
status: complete — Android device run + real-device photo test deferred to Phase 13 (owner decision)
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-27
closed: 2026-09-27
---

# Phase 6 — Validation Strategy

> Per-phase validation contract. Plan 06-01 produces all the evidence below; this phase has one
> plan, matching Phase 5's discipline for a phase this size.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + ts-jest, mobile workspace (`mobile/jest.unit.config.js`); no API or `packages/ibp-domain` changes this phase |
| **Config files** | `mobile/jest.unit.config.js` (moduleNameMapper extended: `.tflite` → the existing numeric image mock; `expo-file-system-legacy.mock.ts` extended with `readAsStringAsync`/`EncodingType`) |
| **Quick run command** | `cd mobile && npx jest --config jest.unit.config.js src/recognition src/app/factor-a-genus-list.test.ts src/app/base64.test.ts src/app/genus-recognition-text.test.ts src/ui/FactorGenusListInput.test.tsx src/ui/GenusRecognitionModal.test.tsx` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check` |
| **Native build proof (no device)** | `cd mobile && npx expo export --platform ios`; `npx expo prebuild -p android --clean` |
| **Estimated runtime** | mobile unit ~20 s; full root gate ~2 min |

---

## Sampling Rate

- **Model identifiers:** none in code, this file or PR body.
- **After every task:** the task's own `<automated>` command (06-01-PLAN.md).
- **Before closing the phase:** full local gate (lint, typecheck, unit, format) plus the two
  native-pipeline smoke checks (`expo export`, `expo prebuild -p android`).

---

## Criterion → Command Map

| Criterion | Behavior | Test Type | Automated Command | Status |
|---|---|---|---|---|
| 1. Photograph one subject, most-likely-first + alternatives, plain-words confidence | `GenusRecognitionModal` renders ranked results with `confidenceLine` text | unit | `GenusRecognitionModal.test.tsx` | ✅ plumbing green; real model in place since PR #178 (labels order + preprocessing confirmed from the source model) — **on-device photo confirmation deferred to Phase 13** |
| 2. Per-genus calibrated indicator, all 34 genera suggested, none withheld | `calibration.ts`, `rankGenusSuggestions` | unit | `calibration.test.ts`, `genusClassifierModel.test.ts` | ✅ green (calibration math and real-model wiring); **field accuracy deferred to Phase 13** (same lab-vs-field cap ADR-002 already names) |
| 3. Suggestion never applies itself; confirmed genus persists in Factor A's list; photo not kept | `GenusRecognitionModal` confirm flow, `addGenusToListValue`, no attachment/photo storage call anywhere in the recognition path | unit | `GenusRecognitionModal.test.tsx` ("only calls onConfirmGenus once... confirms"), `factor-a-genus-list.test.ts` | ✅ green |
| 4. Airplane mode works (bundled model, on-device); load failure shows a clear message and falls back | Metro `.tflite` asset bundling (`expo export` proof), `classifyGenusPhoto`'s catch-all `unavailable` outcome, no network call anywhere in `genusClassifierModel.ts` | unit + build smoke | `genusClassifierModel.test.ts` (`load_failed`/`inference_failed` cases); `npx expo export --platform ios` | ✅ plumbing proven with the real bundled model (PR #178); **on-device airplane-mode confirmation deferred to Phase 13** |
| 5. Genus list reaches the server through `/v1/sync` and reads back | Phase 5's own E2E proof (`surveys-factor-a-genus-list.e2e-spec.ts`); this phase adds no API code | inherited | `npm --workspace api run test:e2e -- surveys-factor-a-genus-list` (unchanged from Phase 5) | ✅ green (unchanged) |
| 6. Real Android device run, latency + accuracy, matching measurement doc §7 format | Not performed | manual (device) | none — no device available | 🔜 **deferred to Phase 13's field validation (owner decision 2026-09-27), not skipped or fabricated** |

---

## Per-Task Verification Map

| Task | Requirement | Test Type | Automated Command | Status |
|---|---|---|---|---|
| A: calibration + classifier module | REQ-C-species-recognition | unit | `npx jest --config mobile/jest.unit.config.js src/recognition src/app/base64.test.ts` (run from `mobile/`) | ✅ green |
| B: Factor A genus-list UI + form wiring | REQ-C-species-recognition | unit | `npx jest --config mobile/jest.unit.config.js src/app/factor-a-genus-list.test.ts src/ui/FactorGenusListInput.test.tsx src/hooks/useSurveyForm.test.ts` | ✅ green |
| C: recognition entry point + confirm flow | REQ-C-species-recognition | unit | `npx jest --config mobile/jest.unit.config.js src/ui/GenusRecognitionModal.test.tsx src/screens/FactorDetailScreen.test.tsx src/app/genus-recognition-text.test.ts src/__checks__/structure.test.ts` | ✅ green |
| D: attribution, docs, roadmap | REQ-C-species-recognition | full gate | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check` | ✅ green |

---

## Wave 0 Requirements

- [x] `mobile/src/recognition/calibration.ts` + `.test.ts` — criterion 2
- [x] `mobile/src/recognition/genusClassifierModel.ts` + `.test.ts` — criteria 1, 4
- [x] `mobile/src/ui/FactorGenusListInput.tsx` + `.test.tsx` — criterion 3 (the list itself)
- [x] `mobile/src/ui/GenusRecognitionModal.tsx` + `.test.tsx` — criteria 1, 3, 4
- [x] `mobile/assets/models/genus_classifier.tflite` + manifest + `README.md` — criterion 4 (bundling); **real artifact since PR #178** (was a placeholder at first close of this wave)

---

## Manual-Only Verifications

- **Real-device recognition accuracy and confidence-label honesty (criteria 1, 2).** The real model
  is in place (PR #178); on-device confirmation with real tree photographs is **deferred to
  Phase 13's field validation** by owner decision, not performed here.
- **Criterion 6, the Android latency/accuracy run.** No device available in either container this
  phase ran in. **Deferred to Phase 13**, not skipped or fabricated.
- **CI's `native-android`/`native-ios` jobs**, which build the real native TFLite runtime on a real
  toolchain this container lacks. Both PRs (#176, #178) exercised these CI jobs on GitHub Actions'
  own runners, which have the real toolchain — both passed (Android and iOS native builds green).

---

## Local gate

Run on 2026-09-27 in this session (no Docker/PostgreSQL instance used — no API or database code
changed this phase).

| # | Command | Result |
|---|---------|--------|
| 1 | `npm install` (root) | 1357 packages added, clean |
| 2 | `npm --workspace mobile run typecheck` | exit 0 |
| 3 | `npm --workspace mobile run lint` | exit 0, 0 errors (after one fix: a raw "—" JSX literal moved into `genus-recognition-text.ts`) |
| 4 | `cd mobile && npx jest --config jest.unit.config.js --runInBand` | 116 suites, 1400 tests, all green |
| 5 | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check` (root) | all green: ibp-domain 230/230, api 752/752, mobile 1400/1400; format clean after one `prettier --write` pass (7 files reflowed, no logic change) |
| 6 | `cd mobile && npx expo export --platform ios` | bundled cleanly; `assets/models/genus_classifier.tflite` (764 B placeholder) listed as a Metro asset |
| 7 | `cd mobile && npx expo prebuild -p android --clean` | succeeded, no config-plugin errors |

Nothing was left red. The real model artifact, initially shipped as a placeholder per this phase's
own instructions, was closed the same day by a follow-up PR (#178) run from a machine with access
to `~/Projects/cortege-ml-artifacts/genus-classifier-iteration4/`: real `.tflite` (MD5-verified),
real label order, and preprocessing confirmed by inspecting the source `SavedModel` graph rather
than assumed. The one remaining item — a real Android device run (criterion 6) plus real-device
photo accuracy — is explicitly **deferred to Phase 13's field validation** by owner decision
(2026-09-27), recorded in `06-CONTEXT.md`, `06-01-SUMMARY.md` and `ROADMAP.md`'s phase 6 entry. The
phase is marked **Complete** on that basis.
