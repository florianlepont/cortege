---
phase: 15-genus-recognition-factor-a
verified: 2026-10-06T21:55:00Z
status: passed
score: 5/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Success criterion 6: on a real Android phone, run the bundled genus classifier on a set of real photos, online and in airplane mode. Record median, p95 and worst total latency against the 3 s budget, plus an accuracy spot-check that the bundled .tflite behaves as on iOS. Write it up in the format of docs/technical/species-recognition-spike-measurements-v1.md section 7."
    expected: "Latency within the 3 s budget at median and p95 in both network states; the top-1 genus on the spot-check set matches what the iOS build and the lab figures lead one to expect."
    why_human: "Needs a physical Android device. ROADMAP defers it to Phase 13 by owner decision (2026-09-27); no Android device or SDK was available in either container the phase ran in. It closes Phase 1's accepted Android deviation, and the feature is not meant to ship to Android users before it is done. Phase 13's own success criteria (ROADMAP lines 685-690) do not mention this run, so it must be added there or it will be forgotten."
  - test: "Success criteria 1, 2 and 4 on a phone: take real photos of trees, leaves and bark, with the device in airplane mode. Check the order of the suggestions, that the confidence words are honest (a genus labelled "Fiable" is usually right, one labelled "Très faible" often is not), and that nothing needs the network."
    expected: "The most likely genus is first with alternatives underneath, plain-word confidence on each, all in airplane mode; a wrong first guess is usually in the alternatives."
    why_human: "Real-device accuracy against actual tree photographs was never measured; the lab and GBIF figures behind ADR-002 are capped by its own 'confidence caps' section. The owner has used the flow on an iPhone (OA-31 and OA-33 confirmed on the Release build on 2026-10-06; the Accueil photo tool OA-107 and OA-114 reached the phone pass), but no accuracy or airplane-mode result is recorded anywhere."
  - test: "Check that no recognition photo lingers on the device after a recognition (the expo-camera capture file and the resized JPEG that preprocessing writes)."
    expected: "Nothing persistent: no attachment, no database row, no sync of the photo. The two temporary files in the app cache are cleared by the OS; decide whether that is acceptable for D-13 or whether the files should be deleted explicitly."
    why_human: "The code never stores the photo as an attachment or in SQLite, but it also never deletes the cache files (no deleteAsync in mobile/src/recognition, GenusCameraView or GenusRecognitionModal). Whether that satisfies 'the recognition photo is not kept' is an owner reading of D-13."
---

# Phase 6: Genus Recognition for Factor A Verification Report

**Phase Goal:** A surveyor fills Factor A faster by photographing a tree than by naming its genus from memory.
**Verified:** 2026-10-06T21:55:00Z
**Status:** human_needed (criteria 1 to 5 hold in code and tests; criterion 6 and the real-device accuracy of criteria 1, 2 and 4 are open by explicit ROADMAP deferral to Phase 13, not failures)
**Re-verification:** No, initial verification

I checked the code on the current branch (`0fb6d2f`), not the SUMMARY. The feature has been reworked since the phase closed: OA-31 and OA-33 replaced the system camera with a live `expo-camera` view and a framing guide, and OA-107 and OA-114 added a second entry point on Accueil (Outils). Each criterion below says whether it is met in the original or the changed form.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | From the Factor A section the surveyor photographs a single subject (D-10) and sees the most likely genus first with alternatives underneath (D-11), each with a plain-words confidence indicator (D-12). | ✓ VERIFIED (code and tests; real-photo behaviour is human) | `FactorDetailScreen.tsx:81` renders `FactorAGenusRecognitionEntry` above the genus list when the factor is A (OA-31, first thing on the screen). Its button opens `GenusRecognitionModal`, which requests camera permission and opens `GenusCameraView` straight away (OA-33): live `CameraView`, corner-bracket framing guide with the hint `t.captureHint`, shutter. After capture the modal classifies and shows `suggestions.slice(0, 1 + MAX_ALTERNATIVES_SHOWN)` (the best one badged "Le plus probable", then 4 alternatives), each card with `confidenceLine(suggestion.label)`. Ranking is `rankGenusSuggestions` in `genusClassifierModel.ts` (sorts all 34 by probability). Ran here: `genusClassifierModel.test.ts`, `GenusRecognitionModal.test.tsx`, `GenusCameraView.test.tsx`, `genus-recognition-text.test.ts`, `FactorDetailScreen.test.tsx` all pass (8 suites, 58 tests with the others below). The roadmap says "photographs a single subject, one tree, a leaf or bark"; the framing guide and hint carry that, the model does not check it. |
| 2 | The indicator uses ADR-002's per-genus calibrated thresholds, so a label means the same reliability whichever genus is shown; all 34 CNPF genera are suggested and none is withheld (D-04). | ✓ VERIFIED | `mobile/src/recognition/calibration.ts` holds `GENUS_STRONG_THRESHOLD` for the 34 codes plus the pooled medium (0.4866) and weak (0.3461) cuts. I diffed the 34 per-genus values against the table in `docs/technical/species-recognition-spike-measurements-v1.md` section 15.2 mechanically: identical, 34 of 34; the pooled cuts match section 15.4. `classifyConfidence` nests the bands by clamping medium and weak to at most the genus's own strong threshold (a documented synthesis for Cercis and Tamarix; `calibration.test.ts` checks monotonicity for all genera, passes). `assertAllGenusThresholdsPresent` fails if a genus lacks a threshold. `rankGenusSuggestions` maps every manifest label with no filtering, and `validateManifest` refuses a bundle whose labels are not exactly the 34 CNPF codes. Whether the words are honest on real photographs is human (below). |
| 3 | A suggestion never applies itself: the surveyor confirms it, and the accepted genus is added to Factor A's genus list, which is there again when the survey is reopened. The recognition photo is not kept (D-13). | ✓ VERIFIED (photo-cache point is a warning) | Confirmation only: the modal calls `onConfirmGenus` solely from the card button (`handleConfirm`), then closes; `FactorAGenusRecognitionEntry.handleConfirmGenus` merges with `addGenusToListValue`, which deduplicates. The modal test covers "only calls onConfirmGenus once ... confirms". Persistence: `useSurveyForm.buildFactorsPayload` writes `payload.A = { genera, ... }` even before the cover is entered (OA-107 fix), and the reopen path reads `factors.A.genera` back into the form (`useSurveyForm.ts` around line 312); a legacy bare-count draft reopens with an empty list, the same rule as Phase 5. `useSurveyDraftPatcher` has an add-genus path for the Accueil tool (line 238-254), and `useEditingDraft` can start a survey with a first genus (line 210). The photo: nothing writes it to SQLite, the attachment pipeline or the sync queue (grep of `mobile/src/recognition`, `GenusCameraView`, `GenusRecognitionModal`: no storage or attachment call). The capture and the resized JPEG land in the app cache and are not deleted by the code; I list that as a warning and a human decision rather than a failure, because the criterion's intent (not stored, not synced) holds. |
| 4 | Recognition works in airplane mode: the model is bundled in the app binary (D-07) and inference is on-device (D-06). If the model fails to load, the surveyor sees a clear message and falls back to manual entry (D-08). | ✓ VERIFIED (code; the airplane-mode run is human) | The model is bundled: `mobile/assets/models/genus_classifier.tflite` is 8,238,676 bytes with MD5 `87195ef82eb3dd2bb564821181f89883`, which I recomputed and which equals the figure in ROADMAP and the README; `metro.config.js` adds `tflite` to `assetExts`; `genusClassifierModel.ts` loads it by a static `import MODEL_ASSET` and `loadTensorflowModel`, with no `fetch` or API call anywhere in `src/recognition`, `GenusCameraView` or `GenusRecognitionModal` (grep). Preprocessing follows the manifest (`preprocessing: "raw_0_255"`, input 224, raw pixels, no `/255`). `react-native-fast-tflite` is a dependency in `package.json` (autolinked; it needs no config plugin, and `app.json` has none for it); the native CI builds below prove it compiles. Failure path: `classifyGenusPhoto` never throws; a bad manifest, a load failure or an inference error returns `{ status: "unavailable" }`; the modal then shows `t.unavailableMessage` with "Reprendre une photo" and "Continuer sans identification" (`unavailableAction`, closes the modal back to the manual genus chips); a denied camera permission shows `t.cameraPermissionRequired`. These branches are covered by `genusClassifierModel.test.ts` (`load_failed`, `inference_failed`, invalid manifest). The native CI jobs that build the TFLite runtime (`Native build - Android`, `Native build - iOS`) are green on `main` as recently as the merge of PR #239 (run 37528025093). The manifest's real label order is the model's output order (`Pinus` before `Picea`); `validateManifest` checks the set, and the classifier maps by manifest index, so the order difference with `genus.ts` is harmless. |
| 5 | The genus list reaches the server through the normal sync flow and appears in the survey read back from the API. | ✓ VERIFIED | No API code was added by this phase and none is needed: `grep` for genus or genera in `api/src` finds nothing; the genus list is plain `factors.A.genera` in the survey payload. The round trip is proved by Phase 5's `api/test/surveys-factor-a-genus-list.e2e-spec.ts` (replay twice, one survey row, one event, `genera` read back), green in CI on `main` (E2E - API, run 37520380121). On the mobile side, `buildFactorsPayload` produces the `genera` array the contract expects (`src/hooks/useSurveyForm.test.ts` line 181 asserts `{ genera: [], native_cover_percent: 2 }`). I did not trace a live phone-to-server sync. |
| 6 | Closes Phase 1's accepted Android deviation: a real Android device run records median, p95 and worst total latency, online and in airplane mode, against the 3 s budget, plus an accuracy spot-check, in the format of the measurement document's section 7. | ? UNCERTAIN, deferred (HUMAN) | Not performed, and honestly recorded as such in ROADMAP, 15-CONTEXT.md and 15-VALIDATION.md. ROADMAP defers it to Phase 13 by owner decision (2026-09-27), so under the task's rule it is a human item, not a failure. Nothing in the repository records an Android measurement (no Android section was added to the measurement document after Phase 1). See the first human verification item, and the warning that Phase 13's own criteria do not carry it. |

**Score:** 5/6 truths verified (0 behavior-unverified; 1 deferred to a human, Phase 13)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `mobile/assets/models/genus_classifier.tflite` | Real promoted model | ✓ VERIFIED | 8,238,676 bytes, MD5 matches |
| `mobile/assets/models/genus_classifier_manifest.json` | 34 labels in model order, input size, preprocessing | ✓ VERIFIED | `placeholder: false`, 34 labels |
| `mobile/src/recognition/genusClassifierModel.ts` | Load, preprocess, infer, rank, fail closed | ✓ VERIFIED | Never throws; tests pass |
| `mobile/src/recognition/calibration.ts` | Per-genus thresholds and bands | ✓ VERIFIED | 34 of 34 equal the measurement document |
| `mobile/src/ui/FactorGenusListInput.tsx` | Genus chips for Factor A | ✓ VERIFIED | Rendered by `FactorDetailScreen` for the `genusList` variant |
| `mobile/src/ui/GenusRecognitionModal.tsx` and `GenusCameraView.tsx` | Capture, classify, confirm | ✓ VERIFIED | Changed since the phase (live camera, OA-33); tests pass |
| `mobile/src/screens/FactorAGenusRecognitionEntry.tsx` | Entry point in Factor A | ✓ VERIFIED | Rendered at the top of the Factor A screen |
| `mobile/src/app/factor-a-genus-list.ts`, `base64.ts`, `genus-recognition-text.ts` | List helpers, decoder, wording | ✓ VERIFIED | Tests pass |
| `metro.config.js` `.tflite` asset ext, `jest.unit.config.js` mapper | Bundling | ✓ VERIFIED | Lines 5-8 and 36 |
| GBIF attribution row | "Crédits photographiques" in Compte | ✓ VERIFIED | `i18n/fr/account.ts` and `settings.ts` carry the credits entries |
| Android measurement in the spike document | Criterion 6 | ✗ MISSING (deferred) | Phase 13 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `FactorDetailScreen` | `FactorAGenusRecognitionEntry` | rendered when Factor A has a genus-list field | WIRED | line 81 |
| `GenusRecognitionModal` | `classifyGenusPhoto` | `handlePhoto` after capture | WIRED | outcome decides results or fallback |
| `classifyGenusPhoto` | bundled `.tflite` | static asset import and `loadTensorflowModel` | WIRED | no network path |
| `onConfirmGenus` | Factor A field | `addGenusToListValue` then `genusField.onChange` | WIRED | dedupes |
| form state | survey payload | `buildFactorsPayload` writes `A.genera` | WIRED | kept before the cover is entered |
| survey payload | server | existing `/v1/sync` path | WIRED | Phase 5 E2E |
| Accueil Outils | `GenusRecognitionModal` | `ToolsSection.tsx:134` | WIRED | a second entry, added after the phase (OA-107, OA-114) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `GenusRecognitionModal` results | `suggestions` | `classifyGenusPhoto`: camera JPEG, resized, decoded to RGB, run through the real model, softmax, ranked, labelled by calibration | Yes by construction (the bundled model is the real artefact, not a placeholder); the numbers on real photographs are not checked here | ✓ FLOWING (code); real output is human |
| `FactorGenusListInput` | `value` | the form's comma-joined genera, hydrated from the stored draft | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Recognition, calibration, list, camera, modal, Factor A screen | `npx jest -c jest.unit.config.js src/recognition src/ui/FactorGenusListInput.test.tsx src/ui/GenusRecognitionModal.test.tsx src/ui/GenusCameraView.test.tsx src/app/factor-a-genus-list.test.ts src/app/genus-recognition-text.test.ts src/screens/FactorDetailScreen.test.tsx` (from `mobile/`) | 8 suites, 58 tests passed | ✓ PASS |
| Model file is the promoted artefact | `md5 mobile/assets/models/genus_classifier.tflite` | `87195ef82eb3dd2bb564821181f89883`, 8,238,676 bytes | ✓ PASS |
| Thresholds equal the measurement document | scripted diff of `GENUS_STRONG_THRESHOLD` against section 15.2 | identical, 34 of 34 | ✓ PASS |
| No network call in the recognition path | `grep` for `fetch(`, `axios`, `apiClient` in `src/recognition`, `GenusCameraView`, `GenusRecognitionModal` | no match | ✓ PASS |
| Inference on a real device, latency, airplane mode | n/a | needs a device | ? SKIP (human) |

### Probe Execution

No probes declared; `scripts/*/tests/probe-*.sh` does not exist. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| REQ-C-species-recognition | 06-01 | On-device genus recognition for Factor A | ✓ SATISFIED in code (criteria 1 to 5); criterion 6 and real-photo accuracy are human, Phase 13 | Truths 1 to 6 |

No orphaned requirement for Phase 6.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/ROADMAP.md` Phase 13 | 685-690 | Phase 13's success criteria do not mention the Android latency and accuracy run | ⚠️ Warning | The deferral lives only in Phase 6's text and the progress table; add it to Phase 13 so it is planned and recorded |
| `mobile/src/ui/GenusCameraView.tsx`, `mobile/src/recognition/genusClassifierModel.ts` | capture and `preprocessPhoto` | Capture file and resized JPEG written to the cache, never deleted | ⚠️ Warning | Not persisted or synced, so D-13 holds in intent, but the files outlive the recognition until the OS clears the cache |
| `mobile/assets/models/README.md` | provenance | Says labels are in the same order as `CNPF_FACTOR_A_GENUS_CODES`; `Pinus` and `Picea` are swapped | ℹ️ Info | No functional effect (see truth 4) |
| `mobile/src/ui/GenusCameraView.tsx` | 107 | `backgroundColor: "#000000"` | ℹ️ Info | A hex literal that Phase 4's lint rule should have caught; see 13-VERIFICATION.md |
| `mobile/src/ui/GenusCameraView.tsx` | guide layer | The framing guide asks for one subject but nothing checks the photo | ℹ️ Info | The criterion says the surveyor photographs a single subject; the app guides, it cannot enforce it |

A grep for `TBD|FIXME|XXX|TODO` over `mobile/src/recognition`, `GenusRecognitionModal.tsx`, `GenusCameraView.tsx`, `FactorGenusListInput.tsx` and `FactorAGenusRecognitionEntry.tsx` finds nothing.

### Human Verification Required

#### 1. Android device run (success criterion 6)

**Test:** On a real Android phone, run the bundled classifier on a set of real photos, online and in airplane mode. Record median, p95 and worst total latency against the 3 s budget, and an accuracy spot-check, in the format of section 7 of the measurement document.
**Expected:** Within the 3 s budget at median and p95 in both states; the spot-check agrees with iOS and with the lab figures.
**Why human:** Needs a physical Android device. Deferred to Phase 13 by owner decision (2026-09-27); no device was available in either container. Closes Phase 1's accepted Android deviation.

#### 2. Real photographs, confidence honesty, airplane mode (criteria 1, 2, 4)

**Test:** Photograph real trees, leaves and bark on a phone with the network off, and read the suggestions.
**Expected:** The most likely genus is first, alternatives follow, confidence words are honest, and nothing needs the network.
**Why human:** Real-device accuracy was never measured. The owner confirmed the flow on an iPhone on 2026-10-06 (OA-31, OA-33; OA-107 and OA-114 for the Accueil tool), but no accuracy or airplane-mode result is on record.

#### 3. Recognition photo left in the cache (criterion 3, D-13)

**Test:** After a recognition, inspect the app cache (or read the code path) for the capture and resized files.
**Expected:** An owner decision: accept OS-managed cache cleanup as "not kept", or have the app delete both files after classification.
**Why human:** A product reading of D-13; the code stores nothing durable but also deletes nothing.

### Gaps Summary

No code gap. Criteria 1 to 5 hold on the current branch: the real model is bundled and byte-identical to the promoted artefact, calibration matches the measurement document for all 34 genera, nothing applies itself, the confirmed genus lands in `factors.A.genera` and persists through reopen, the load-failure path falls back to manual entry, and the sync round trip is proved by Phase 5's E2E, green in CI. The flow has since been improved by OA-31, OA-33, OA-107 and OA-114, and the owner has used it on an iPhone.

What remains is exactly what ROADMAP says it defers: the Android device run (criterion 6) and real-photograph accuracy, both for Phase 13. Two follow-ups for the planner: put the Android run into Phase 13's success criteria, and decide whether to delete the two temporary photo files explicitly.

---

_Verified: 2026-10-06T21:55:00Z_
_Verifier: Claude (gsd-verifier)_

## Update 2026-10-10

The three human checks are now tracked as D-01 to D-03 in `docs/user-tests/device-checks.md`. The first has already failed in the field: on the Android phones the association's testers used, the camera stayed black and the recognition never worked, and the owner thinks the workflow must be rethought. Phase 29 reworks it, deletes the two temporary files explicitly (D-03) and measures latency and accuracy on real Android phones (D-01, D-02). Status stays `human_needed` until then.

## Closed 2026-10-10

The owner closed the phase: the three device checks are carried over and tracked, so they no longer hold it open. They live as D-01 to D-03 of `docs/user-tests/device-checks.md` and in the success criteria of Phase 29 (the model now loads in Android Release builds, PR #272; latency and accuracy on a real Android phone, and the explicit deletion of the two temporary recognition files, remain). Verified on 2026-10-10: the recognition returns genera on the owner's iPhone 15 Pro and, in a Release build, on the Pixel 8 emulator.
