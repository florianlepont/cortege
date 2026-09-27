---
phase: 06-genus-recognition-factor-a
plan: 01
subsystem: mobile
tags: [ibp, factor-a, genus-list, ml, on-device-inference, adr-002, adr-003]
requires: ["05-factor-a-genus-list-data-contract-corrections"]
provides:
  - "Factor A genus-list UI (FactorGenusListInput), wired through useSurveyForm.ts's factors.A.genera - Phase 5 shipped the contract only"
  - "mobile/src/recognition/: calibration.ts (per-genus calibrated confidence) and genusClassifierModel.ts (bundled-model loading, preprocessing, ranking)"
  - "GenusRecognitionModal + FactorAGenusRecognitionEntry: photograph -> classify -> confirm flow on Factor A"
  - "GBIF CC-BY attribution row (AccountSettingsRows.tsx)"
affects: []
tech-stack:
  added: ["react-native-fast-tflite@^3.0.1", "react-native-nitro-modules@^0.37.1", "jpeg-js@^0.4.4"]
  patterns:
    - "FactorField.value stays a plain string even for identity data (genus codes), comma-joined - the same convention FactorChipsInput's derived count already used, just carrying codes instead of a count"
    - "classifyGenusPhoto never throws: every failure (missing/corrupt model, bad manifest, preprocessing or inference error) resolves to a typed {status: 'unavailable', reason} outcome"
key-files:
  created:
    - mobile/src/recognition/calibration.ts
    - mobile/src/recognition/calibration.test.ts
    - mobile/src/recognition/genusClassifierModel.ts
    - mobile/src/recognition/genusClassifierModel.test.ts
    - mobile/src/app/base64.ts
    - mobile/src/app/base64.test.ts
    - mobile/src/app/factor-a-genus-list.ts
    - mobile/src/app/factor-a-genus-list.test.ts
    - mobile/src/app/genus-recognition-text.ts
    - mobile/src/app/genus-recognition-text.test.ts
    - mobile/src/ui/FactorGenusListInput.tsx
    - mobile/src/ui/FactorGenusListInput.test.tsx
    - mobile/src/ui/GenusRecognitionModal.tsx
    - mobile/src/ui/GenusRecognitionModal.test.tsx
    - mobile/src/screens/FactorAGenusRecognitionEntry.tsx
    - mobile/src/i18n/fr/genus.ts
    - mobile/src/i18n/fr/genus-recognition.ts
    - mobile/src/types/tflite-asset.d.ts
    - mobile/assets/models/genus_classifier.tflite (placeholder at first close; replaced with the real artifact by PR #178, same day)
    - mobile/assets/models/genus_classifier_manifest.json (placeholder at first close; replaced with the real artifact by PR #178, same day)
    - mobile/assets/models/README.md
  modified:
    - mobile/package.json
    - mobile/metro.config.js
    - mobile/tsconfig.json
    - mobile/jest.unit.config.js
    - mobile/test/expo-file-system-legacy.mock.ts
    - mobile/src/app/constants.ts
    - mobile/src/hooks/useSurveyForm.ts
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/account/AccountSettingsRows.tsx
    - mobile/src/i18n/fr/index.ts
    - mobile/src/i18n/fr/factor-detail.ts
    - mobile/src/i18n/fr/validation.ts
    - mobile/src/i18n/fr/account.ts
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
decisions:
  - "The real model/labels artifact was unreachable from this container (~/Projects does not exist here); shipped a documented placeholder instead of fabricating a model - closed same day by PR #178, run from a machine with the real artifacts (see mobile/assets/models/README.md and 06-CONTEXT.md)"
  - "No real Android device was available either; criterion 6 (device latency/accuracy run) and real-device photo accuracy are deferred to Phase 13's field validation by owner decision, not skipped or invented"
  - "Capture uses expo-image-picker's launchCameraAsync (already shipped, CI-proven) instead of adding react-native-vision-camera: the feature needs a single photo, not a live frame-processor pipeline, so only react-native-fast-tflite (the actual inference runtime) was added as new native surface"
  - "Confidence bands: per-genus 'strong' threshold (§15.2) with pooled medium/weak cuts (§15.4), clamped so all four bands nest correctly even for genera whose calibrated 'strong' sits below the pooled medium/weak cuts (Cercis, Tamarix)"
  - "Factor A's genus-list mobile UI did not exist before this phase (Phase 5 built only the contract) - built here as part of giving recognition somewhere to write its result"
metrics:
  duration: "~1 session"
  completed: 2026-09-27
  tasks: 4
  files: 35
---

# Phase 6 Plan 01: Genus Recognition for Factor A - Summary

Factor A now has a working genus-list UI (`FactorGenusListInput`) for the first time - Phase 5 built
only the data contract and scoring, leaving the mobile form on the legacy numeric field. On top of
it, a "Identifier par photo" entry point runs a photograph -> on-device classification -> confirm
flow (`GenusRecognitionModal`), suggesting all 34 CNPF genera ranked by a per-genus calibrated
confidence label (never a bare percentage), and a confirmed suggestion is merged into whatever the
surveyor already picked - never applied automatically. The recognition photo itself is never
persisted or queued; only the confirmed genus code crosses back into the form.

**Two things this phase could not close at first pass, and said so rather than declaring done —
one closed same day, one deferred:**

1. **The real `.tflite` model and its labels file — closed by PR #178.** ADR-002's promoted
   artifact lives outside the repository at
   `~/Projects/cortege-ml-artifacts/genus-classifier-iteration4/`, which did not exist in this
   container. `mobile/assets/models/` shipped an explicit, documented placeholder at first close (a
   short text file, not a valid TFLite flatbuffer, and a manifest marked `"placeholder": true`) -
   the correct, honest behaviour of a repository that did not yet carry the real model, not a bug.
   Later the same day, PR #178 (run from a machine with that path present) replaced both files with
   the real, MD5-verified artifact (8,238,676 bytes), corrected `genus_classifier_manifest.json`'s
   `labels` order to the model's real output-tensor order (`genus_labels.txt` - not alphabetical,
   `Pinus` before `Picea`), and confirmed the preprocessing this phase had only guessed at
   (`"rescale_0_1"`) by loading the source `SavedModel` and reading its graph: it embeds its own
   `Rescaling` (1/255) and `Normalization` (ImageNet mean/variance) layers, so the correct input is
   raw `[0, 255]` pixels, not pre-divided floats - `preprocessPhoto()`'s division was removed.
2. **Criterion 6's real Android device run - deferred to Phase 13.** No Android device, emulator,
   or even `adb`/Android SDK was available in either container this phase ran in. `expo prebuild -p
   android --clean` succeeds (confirmed twice), and CI's `native-android` job later built the real
   native TFLite runtime successfully on both PRs (#176, #178) - but no on-device latency/accuracy
   run was possible in this environment. This is the same gap ADR-002 already recorded for Phase 1
   (Android build succeeds, no device run performed). By owner decision (2026-09-27), this - plus a
   plain real-device accuracy check with actual tree photographs - is deferred to Phase 13's field
   validation rather than blocking this phase further.

**ROADMAP.md's phase 6 entry is now checked, with its progress-table status naming the one
deferred item plainly** - not silently declared complete, but not held open indefinitely either.

## Tasks

| Task | Name | Files |
|---|---|---|
| A | Calibration and classifier module | calibration.ts/.test.ts, genusClassifierModel.ts/.test.ts, base64.ts/.test.ts, model assets |
| B | Factor A genus-list UI and useSurveyForm wiring | factor-a-genus-list.ts/.test.ts, FactorGenusListInput.tsx/.test.tsx, useSurveyForm.ts, constants.ts, FactorDetailScreen.tsx |
| C | Recognition entry point and confirm flow | GenusRecognitionModal.tsx/.test.tsx, FactorAGenusRecognitionEntry.tsx, genus-recognition-text.ts/.test.ts |
| D | Attribution, docs, roadmap | AccountSettingsRows.tsx, this phase's `.planning` docs, ROADMAP.md, REQUIREMENTS.md |

## Calibration: reconciling §15.2 and §15.4

The measurement document's per-genus "strong" thresholds (§15.2) and its pooled medium/weak cuts
(§15.4) do not compose cleanly for every genus: Cercis calibrates "strong" at 0.4221 (below the
pooled medium cut, 0.4866) and Tamarix at 0.2027 (below even the pooled weak cut, 0.3461).
`classifyConfidence` clamps the medium/weak cuts to at most the genus's own strong threshold, so a
score that clears "strong" never also falls inside a nominally lower band - verified by a
monotonicity test sweeping all 34 genera. This clamping is this phase's own synthesis, not a number
transcribed from either section directly, and is called out as such in `calibration.ts`'s own
comments.

## Factor A's genus-list UI: the gap Phase 5 left

`FactorDetailScreen.tsx` carried a comment reading "Factor A stays plain numeric fields (Phase 5
rebuilds it as a genus list)" - stale, since Phase 5's own summary confirms it touched only
`packages/ibp-domain`, `api` and docs. `FactorChipsInput` (built for B/I/J's derived counts) cannot
be reused as-is: it reconstructs "the first N options" from a count on reopen, which would show the
wrong genera for a real list. `FactorGenusListInput` is a sibling component, controlled by the
actual genus codes (comma-joined into the same `FactorField.value: string` channel every other
FactorInput variant uses), so a recognition confirm is just `field.onChange(addGenusToListValue(...))`
- no new state channel needed. A legacy local draft's bare `native_genus_count` cannot be decomposed
into named genera (Phase 5's own rule for already-submitted surveys, extended here to a still-local
draft): reopening one now shows an empty genus list and, if resaved without re-picking, an honest
"zero genera observed" rather than a reconstructed count.

## Native surface added

Only `react-native-fast-tflite` (+ its peer `react-native-nitro-modules`) is new native surface -
no Expo config plugin was needed (GPU delegates were left off; CPU inference only). Capture reuses
`expo-image-picker`, already shipped and CI-proven. `expo export --platform ios` was run in this
session and successfully bundled `assets/models/genus_classifier.tflite` (764 B, the placeholder at
the time) as a Metro asset; `expo prebuild -p android --clean` also succeeded. Neither exercises the
actual native TFLite runtime build - that was left to CI's own verification once each PR opened,
per this environment's standard PR-babysitting workflow, and CI confirmed it: `native-android` and
`native-ios` both built successfully on PR #176 (placeholder model) and PR #178 (real model,
8,238,676 bytes).

## Verification

- `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`: all green
  (root, all three workspaces: ibp-domain 230 tests, api 752 tests, mobile 1400 tests, 116 suites).
- `npx expo export --platform ios`: bundled cleanly, including the new `.tflite` asset.
- `npx expo prebuild -p android --clean`: succeeded with no config-plugin errors.
- No API or `packages/ibp-domain` changes: Phase 5 already made both adapters thin pass-throughs,
  so the genus-list payload this phase's UI now sends was already scored and synced correctly.

## Deviations from Plan

- **Runtime pairing**: ADR-002 named `react-native-fast-tflite` + `react-native-vision-camera`.
  This phase kept only `react-native-fast-tflite` (the actual inference runtime) and used the
  already-shipped `expo-image-picker` for capture instead of adding `react-native-vision-camera`,
  since the feature needs a single photo, not a live frame-processor pipeline. Recorded as a
  decision in `06-CONTEXT.md`, not a silent substitution.
- **The real model binary** was unreachable from this container - recorded as an open gate rather
  than fabricated, then closed same day by PR #178 once run from a machine with access to the real
  artifacts (see above, and `06-CONTEXT.md`/`06-VALIDATION.md`).
- **The Android device run and real-device photo accuracy** were unreachable from either container
  this phase ran in - deferred to Phase 13's field validation by owner decision, not fabricated or
  silently skipped.
