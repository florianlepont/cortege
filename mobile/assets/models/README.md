# Genus classifier model assets — placeholder gate

`genus_classifier.tflite` and `genus_classifier_manifest.json` in this directory are
**placeholders**, not the real model.

## Why

Phase 6 (`.planning/phases/06-genus-recognition-factor-a/`) implements on-device tree-genus
recognition per ADR-002 (`docs/technical/adr-002-on-device-species-recognition-v1.md`). ADR-002's
promoted model — `genus_classifier.tflite`, EfficientNet-B0, float16, 8,238,676 bytes, MD5-verified
2026-09-26 — and its labels/calibration source files are preserved outside the repository at
`~/Projects/cortege-ml-artifacts/genus-classifier-iteration4/` (deliberately: 42 MB of binaries
would stay in git history forever). That path was not reachable from the container this phase was
built in — confirmed absent, not just unchecked. Per this phase's own instructions, the model was
not fabricated to fill the gap.

## What is here instead

- `genus_classifier.tflite`: a short text file, not a valid TFLite flatbuffer. Metro needs a real
  file at this path to bundle the `.tflite` asset extension; at runtime,
  `react-native-fast-tflite`'s `loadTensorflowModel` fails to parse it, which exercises the exact
  "model load failed" path ADR-002 requires (D-08): a clear message, then a fallback to manual
  genus entry. This is not a bug — it is the correct, currently-true state of a repository that
  does not (yet) carry the real model.
- `genus_classifier_manifest.json`: a placeholder manifest with `"placeholder": true`. Its
  `labels` array is `packages/ibp-domain/src/genus.ts`'s `CNPF_FACTOR_A_GENUS_CODES` order (main
  list then supplementary) — a reasonable default, but **not verified** against the real model's
  output tensor order, since that would come from the artifact folder's own `labels` file, which
  was equally unreachable. `inputSize` (224) and `preprocessing` (`rescale_0_1`) are standard
  EfficientNet-B0 defaults, not confirmed against the real training/export report.

## Before this ships

Whoever has access to `~/Projects/cortege-ml-artifacts/genus-classifier-iteration4/` must:

1. Replace `genus_classifier.tflite` with the real, MD5-verified model file.
2. Replace `genus_classifier_manifest.json`'s `labels` array with the real model's label order
   (from that folder's own `labels` file), and set `"placeholder": false`.
3. Confirm `inputSize` and `preprocessing` against the training/export report, updating both if
   they differ from the EfficientNet-B0 defaults assumed here.
4. Re-run `mobile/src/recognition/genusClassifierModel.test.ts` and, on a real device, confirm the
   app suggests a genus instead of falling back to manual entry.
5. Add the CC-BY-4.0 attribution for the GBIF-sourced training images that ADR-002 requires before
   the model ships to end users (see `mobile/src/screens/account/AccountSettingsRows.tsx`, the
   "Crédits" row, or wherever it lands).
