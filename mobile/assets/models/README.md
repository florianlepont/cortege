# Genus classifier model assets

`genus_classifier.tflite` and `genus_classifier_manifest.json` in this directory are the real,
promoted ADR-002 artifacts, not placeholders.

## Provenance

Phase 6 (`.planning/phases/06-genus-recognition-factor-a/`) implements on-device tree-genus
recognition per ADR-002 (`docs/technical/adr-002-on-device-species-recognition-v1.md`). The
promoted model — EfficientNet-B0, float16, 8,238,676 bytes, MD5 `87195ef82eb3dd2bb564821181f89883`
— was copied in from `~/Projects/cortege-ml-artifacts/genus-classifier-iteration4/` (kept outside
the repository deliberately: 42 MB of binaries would stay in git history forever).

- `genus_classifier.tflite`: byte-for-byte copy of that folder's `genus_classifier.tflite`
  (MD5-verified against it).
- `genus_classifier_manifest.json`: `labels` is that folder's own `genus_labels.txt` order (the
  model's actual output tensor order — note it is not alphabetical, e.g. `Pinus` before `Picea`),
  cross-checked against `packages/ibp-domain/src/genus.ts`'s `CNPF_FACTOR_A_GENUS_CODES` (same 34
  codes, same order). `inputSize` (224) matches `training_report.json`'s `image_size`.
  `preprocessing: "raw_0_255"` was confirmed by loading the SavedModel
  (`genus_classifier_keras/`) from that folder and inspecting its graph: the model embeds its own
  `Rescaling` layer (scale `1/255`, offset `0`, i.e. `rescaling_1/Cast/x = 0.003921569`) followed
  by a `Normalization` layer using the standard ImageNet constants
  (`mean = [0.485, 0.456, 0.406]`, `variance ≈ [0.229, 0.224, 0.225]`) ahead of the backbone — so
  the model expects raw `[0, 255]` pixels, not pre-divided `[0, 1]` floats.
  `mobile/src/recognition/genusClassifierModel.ts`'s `preprocessPhoto()` was updated to match (no
  `/255` division).

## Still outstanding

1. Real-device validation: confirm on a physical device with real tree photos that the app
   suggests a genus instead of falling back to manual entry. This must happen in the field, not in
   this environment.
2. Add the CC-BY-4.0 attribution for the GBIF-sourced training images that ADR-002 requires before
   the model ships to end users (see `mobile/src/screens/account/AccountSettingsRows.tsx`, the
   "Crédits" row, or wherever it lands).
