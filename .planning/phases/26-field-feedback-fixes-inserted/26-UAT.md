---
status: deferred
phase: 26-field-feedback-fixes-inserted
source: [26-VERIFICATION.md]
started: 2026-10-11T00:00:00Z
updated: 2026-10-11T00:00:00Z
---

## Current Test

none: the three items below were deferred by the owner on 2026-10-11 when Phase 26 was closed.
Reopen with `/gsd-verify-work 29` when the devices are available.

## Tests

### 1. Genus recognition on two real Android phones (SC-1, SC-7 device part, DC-D-01 to DC-D-03)
expected: with a Release APK built with `EXPO_PUBLIC_GENUS_TIMING=true`, on at least two Android phones (one low-end): the model loads and suggestions come back online and in airplane mode; median and p95 of `totalMs` and of `captureToSuggestionMs` under 3 s; `cache/Camera` and `cache/ImageManipulator` empty after several recognitions (debuggable build only). Protocol: `docs/user-tests/device-checks.md`, section "Recognition measurement (DC-D-01 to DC-D-03, Phase 26)".
result: deferred (owner, 2026-10-11: no Android phone available; the Android testers will run it)

### 2. Full parcel-selection card at 393 x 852
expected: the full (non compact) card shows its title, notice and hint on a large phone, the map keeps its share.
result: deferred (owner, 2026-10-11)

### 3. IBP info glyphs on Android
expected: the "i" glyph beside the title of the wizard method step and in the Explorer legend opens the IBP sheet on Android.
result: deferred (owner, 2026-10-11)

## Summary

total: 3
passed: 0
issues: 0
pending: 0
skipped: 0
deferred: 3
blocked: 0

## Gaps
