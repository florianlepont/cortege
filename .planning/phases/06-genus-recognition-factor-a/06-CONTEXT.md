# Phase 6: Genus Recognition for Factor A - Context

**Gathered:** 2026-09-27
**Status:** Executed autonomously; two open gates block full completion (see Deferred)
**Source:** ROADMAP phase 6 (success criteria 1-6), REQUIREMENTS `REQ-C-species-recognition`,
ADR-002 (`docs/technical/adr-002-on-device-species-recognition-v1.md`), the measurement document's
§15 (calibration). Run autonomously, following the phase 5/3 pattern; decisions below were taken
without asking and are recorded for the owner's review.

<domain>
## Phase Boundary

Build the photograph-a-tree entry point on top of Phase 3's `FactorInput` components, feed a
calibrated genus suggestion into Phase 5's genus-list data contract, and close Phase 1's accepted
Android measurement deviation. Six success criteria (ROADMAP):

1. From Factor A, the surveyor photographs one subject (tree/leaf/bark) and sees the most likely
   genus first, alternatives underneath, each with a plain-words confidence indicator.
2. The indicator uses ADR-002's per-genus calibrated thresholds; all 34 CNPF genera are suggested,
   none withheld.
3. A suggestion never applies itself; confirming adds the genus to Factor A's list (Phase 5), which
   persists across reopen; the recognition photo itself is not kept.
4. Works in airplane mode: model bundled in the binary, inference on-device; a load failure shows a
   clear message and falls back to manual entry.
5. The genus list reaches the server through the normal `/v1/sync` flow and reads back correctly
   (already proven by Phase 5 - this phase adds no API code).
6. Closes Phase 1's accepted Android deviation: a real-device latency run (median/p95/worst, online
   and airplane mode) plus an accuracy spot-check, recorded in the measurement document's §7 format.

Depends on Phase 5 (closed) for the genus-list contract, and on Phase 1/ADR-002 for the model,
runtime choice and calibration data.

Out of scope: species-level identification, server-side recognition, the stand-photo (multi-tree)
case, capturing corrections to build a retraining dataset (all named out of scope by ADR-002
itself).
</domain>

<decisions>
## Implementation Decisions

### The model artifact is not reachable from this container (Claude, autonomous - owner must act)
ADR-002's promoted model (`genus_classifier.tflite`, EfficientNet-B0, float16, 8.24 MB,
MD5-verified 2026-09-26) and its labels file are preserved outside the repository at
`~/Projects/cortege-ml-artifacts/genus-classifier-iteration4/`. That path does not exist in this
container (confirmed: `~/Projects` itself is absent, and no `.tflite` file exists anywhere on the
filesystem). Per this phase's own instructions, **the model was not fabricated** to fill the gap.
`mobile/assets/models/genus_classifier.tflite` and `genus_classifier_manifest.json` are explicit,
documented placeholders (see `mobile/assets/models/README.md`) — a short text file and a manifest
with `"placeholder": true`, sufficient for Metro to bundle a `.tflite` asset and for
`react-native-fast-tflite` to exercise the real "model failed to load" path (ADR-002 D-08), but not
a working classifier. **This blocks success criteria 1, 2 and 4 from being demonstrably true on a
real device** until someone with access to that path replaces both files. Criterion 6's Android
accuracy spot-check is blocked by the same gap, on top of its own device gap below.

### No real Android device is available either (Claude, autonomous - matches Phase 1's own gap)
This container has no `adb`, no Android SDK, and (confirmed via `expo prebuild -p android --clean`
succeeding, but no toolchain to go further) no way to run `./gradlew assembleRelease` against a
device or emulator. Per the roadmap's own instruction ("If you have no real Android device
available, say so explicitly and record it as an open gate rather than skipping or fabricating the
measurement"), **criterion 6 is recorded as an open gate, not silently skipped or declared done.**
This is the same gap ADR-002's "Confidence caps" section already named for Phase 1; Phase 6 does
not close it either, for the same reason (no device, not a feasibility failure).

### Runtime deviates from ADR-002's exact library pairing, for a lower-risk equivalent (Claude, autonomous)
ADR-002 names `react-native-fast-tflite` paired with `react-native-vision-camera` (for a live
frame-processor pipeline). This phase's actual requirement — "photograph a single subject, then
classify the photo" (D-10/D-11) — does not need a live camera view or frame-by-frame inference: a
single still photo is enough. `react-native-fast-tflite` (the inference runtime — non-negotiable,
this is ADR-002's real deliverable) is kept exactly as specified; the capture step reuses
`expo-image-picker`'s `launchCameraAsync`, the same camera-capture call the app already ships for
survey attachments (`useSurveySyncSurveyOperations.ts`), instead of adding
`react-native-vision-camera` as a second new native dependency. This removes an entire native
integration surface (a config plugin, `vision-camera-resize-plugin`, the Podfile.lock sequencing
hazard ADR-002's hand-off section named) with no loss against the actual success criteria, and
reuses camera permission code already proven in this repo's CI. If a future phase needs live
frame-by-frame classification (e.g. tracking a subject before capture), it can add
`react-native-vision-camera` then, informed by a real need rather than by the spike's own use case.

### Preprocessing pipeline: `expo-image-manipulator` (resize) + `jpeg-js` (pure-JS decode) (Claude, autonomous)
`react-native-fast-tflite` takes a raw pixel tensor (`ArrayBuffer`), not an image file — something
must decode the captured JPEG into pixels. `expo-image-manipulator` (already a dependency, used by
`storage/attachments.ts`) resizes/re-encodes to the model's expected square input;
`jpeg-js` (new dependency, BSD-3-Clause, zero dependencies, pure JavaScript, no Buffer/native
requirement) decodes the result to raw RGBA bytes. A small hand-written base64 decoder
(`mobile/src/app/base64.ts`) bridges `expo-file-system`'s base64 file read to `jpeg-js`'s byte
input without assuming a global `Buffer` or `atob` (neither is guaranteed present on Hermes).

### Confidence bands: per-genus "strong", pooled "medium"/"weak" (Claude, autonomous)
The measurement document gives two different things under "confidence calibration": a **per-genus**
"strong" threshold (§15.2, one value per genus, the amendment's headline finding) and a **pooled**
four-level cut (§15.4: strong/medium/weak/very-weak, fit once across all 34 genera). Four genera
calibrate "strong" below the pooled medium cut (Cercis) or even the pooled weak cut (Tamarix),
which would let a score clear "strong" while nominally falling inside a lower pooled band.
`mobile/src/recognition/calibration.ts` resolves this by clamping the medium/weak cuts to at most
the genus's own strong threshold, keeping every genus's four bands strictly nested. This is this
phase's own synthesis of the two sections, not a value transcribed verbatim from the document;
it is unit-tested for monotonicity across all 34 genera.

### Factor A's genus-list UI did not exist yet — built here, not only the recognition entry point (Claude, autonomous)
Phase 5 built the data contract and scoring only (`packages/ibp-domain`, API, docs); it explicitly
did not touch the mobile form (`FactorDetailScreen.tsx`'s own comment said so: "Factor A stays
plain numeric fields (Phase 5 rebuilds it as a genus list)" — stale by the time this phase started).
Recognition has nowhere to add a genus without that list existing, so this phase also replaces
Factor A's numeric `native_genus_count` field with `FactorGenusListInput` (a new chips-style
multi-select, built on the same `FactorInputShell`/`AppChoiceChip` primitives Phase 3 shipped) and
updates `useSurveyForm.ts`/`constants.ts` to carry `factors.A.genera` end to end. A legacy local
draft's bare count cannot be decomposed into named genera (the same rule Phase 5 applied to
already-submitted surveys, extended here to a still-local draft): reopening one shows an empty
genus list, not a reconstructed count.

### GBIF CC-BY attribution (Claude, autonomous)
ADR-002 names a real, low-cost obligation: crediting CC-BY-licensed GBIF training images before the
model ships. A "Crédits photographiques" row was added to `AccountSettingsRows.tsx` (Compte
screen), opening an alert with the attribution text — no dedicated About screen existed to extend.
</decisions>

<canonical_refs>
## Canonical References
- `.planning/ROADMAP.md` phase 6 (success criteria, model/calibration hand-off)
- `docs/technical/adr-002-on-device-species-recognition-v1.md` (the decision this phase implements)
- `docs/technical/species-recognition-spike-measurements-v1.md` §7 (device-measurement format to
  match for criterion 6), §15 (calibration data)
- `packages/ibp-domain/src/genus.ts`, `packages/ibp-domain/src/contract/factor-a.ts` (Phase 5's
  contract this phase writes into)
- `mobile/README-native.md` (native build/CI conventions this phase follows: no committed
  `ios`/`android`, Expo config plugins only when native config is actually needed)
</canonical_refs>

<deferred>
## Deferred / Open Gates (do not silently mark done)

- **The real model artifact.** `mobile/assets/models/genus_classifier.tflite` and
  `genus_classifier_manifest.json` are placeholders (see that directory's own `README.md`).
  Whoever has access to `~/Projects/cortege-ml-artifacts/genus-classifier-iteration4/` must replace
  both, confirm `inputSize`/`preprocessing` against the real export report, and re-verify on a real
  device before this feature can be considered shipped.
- **Criterion 6, the Android device run.** No real Android device was available in this
  container. The latency/accuracy measurement Phase 1 deferred and this phase's own ROADMAP
  wording says blocks shipping is still open.
- Field-guidance help text for the Juniperus/Table 2 look-alike exclusions (still Phase 5's
  deferred item; not addressed here either — out of this phase's scope).
</deferred>
