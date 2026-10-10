---
phase: 29-field-feedback-fixes-inserted
plan: 01
subsystem: recognition
tags: [expo-file-system, expo-camera, tflite, privacy, timing, android]

requires:
  - phase: 15-species-recognition
    provides: genus classifier, GenusRecognitionModal, GenusCameraView
provides:
  - guarded deletion of the two temporary recognition photos (camera capture, resized JPEG)
  - per-classification timings (load, preprocessing, inference, total) on every outcome
  - flag-gated numbers-only timing line for Release measurement builds (EXPO_PUBLIC_GENUS_TIMING)
  - stale-state guard for a sheet closed while classifying
  - decision D-07 (confidence order) pinned by a test
affects: [29-02, 29-10]

tech-stack:
  added: []
  patterns:
    - "Delete only the exact URIs a feature created, behind a cache-directory guard; never sweep a directory"
    - "Injectable clock (now = monotonicNow) for latency tests"

key-files:
  created:
    - mobile/src/recognition/temp-files.ts
    - mobile/src/recognition/temp-files.test.ts
    - mobile/src/recognition/timing.ts
    - mobile/src/recognition/timing.test.ts
  modified:
    - mobile/src/recognition/genusClassifierModel.ts
    - mobile/src/recognition/genusClassifierModel.test.ts
    - mobile/src/app/feature-flags.ts
    - mobile/src/app/feature-flags.test.ts
    - mobile/README-native.md
    - mobile/src/ui/GenusRecognitionModal.tsx
    - mobile/src/ui/GenusRecognitionModal.test.tsx
    - mobile/src/ui/GenusCameraView.tsx

key-decisions:
  - "Decision D-07 kept: the modal shows suggestions in the classifier's confidence order, no alphabetical sort (pinned by a test with Ulmus, Abies, Quercus_deciduae, Betula, Acer)"
  - "A failure before the tensor exists books its time to preprocessing, a later failure to inference, so totalMs stays preprocessing + inference"
  - "reportGenusTiming runs before the stale-run check, so a closed sheet still yields a measurement"

patterns-established:
  - "Timing line: '[genus-timing] ' + JSON of the outcome word and numbers rounded to 0.1 ms, printed through console.info only when the build flag is on"

requirements-completed: [SC-7, D-07]

coverage:
  - id: D1
    description: "The resized JPEG is deleted in a finally right after its base64 read, on success, decode failure, read failure and model run failure"
    requirement: SC-7
    verification:
      - kind: unit
        ref: "mobile/src/recognition/genusClassifierModel.test.ts#deletes the resized JPEG"
        status: pass
    human_judgment: false
  - id: D2
    description: "The camera capture is deleted once classification ends for ok, unavailable and closed-while-classifying; foreign and '..' URIs are refused; no directory is listed"
    requirement: SC-7
    verification:
      - kind: unit
        ref: "mobile/src/recognition/temp-files.test.ts; mobile/src/ui/GenusRecognitionModal.test.tsx#deletes the camera capture"
        status: pass
    human_judgment: false
  - id: D3
    description: "Timings on every outcome and a flag-gated numbers-only line for Release builds"
    requirement: SC-7
    verification:
      - kind: unit
        ref: "mobile/src/recognition/timing.test.ts; genusClassifierModel.test.ts#reports timings"
        status: pass
    human_judgment: false
  - id: D4
    description: "Recognition suggestions keep confidence order (decision D-07)"
    requirement: D-07
    verification:
      - kind: unit
        ref: "mobile/src/ui/GenusRecognitionModal.test.tsx#keeps the classifier's confidence order"
        status: pass
    human_judgment: false
  - id: D5
    description: "No photo left in cache/Camera and cache/ImageManipulator on a real Android phone (DC-D-03) and latency numbers (DC-D-01, DC-D-02)"
    requirement: SC-7
    verification: []
    human_judgment: true
    rationale: "Needs a real Android device with a debuggable and a timing Release build; owned by plan 29-10"

duration: 25min
completed: 2026-10-10
status: complete
---

# Phase 29 Plan 01: Recognition temp-file cleanup and timing Summary

**Genus recognition now deletes its camera capture and resized JPEG on every path (guarded to the exact cache URIs, no sweep) and reports shutter-to-suggestion latency through a build flag, with confidence order pinned and the sheet-closed race fixed.**

## Performance

- **Duration:** about 25 min
- **Completed:** 2026-10-10
- **Tasks:** 3/3
- **Files modified:** 12 (4 created, 8 modified)

## Accomplishments

- `deleteTempPhoto` / `isDeletableTempPhoto` (`mobile/src/recognition/temp-files.ts`): only URIs under `FileSystem.cacheDirectory` without ".." are deleted, idempotently, errors swallowed, URI never logged. No directory is listed, so the bundled model copy of PR #272 survives.
- `classifyGenusPhoto(uri, now = monotonicNow)` deletes the resized JPEG in a `finally` after its base64 read and returns `RecognitionTimings` on every outcome (invalid_manifest and load_failed report 0 for the stages not reached). `loadModel`, its cache variables and the test reset helper are untouched.
- `timing.ts` + `isGenusTimingEnabled`: with `EXPO_PUBLIC_GENUS_TIMING=true` a Release build prints one `[genus-timing] {...}` line of numbers only; `README-native.md` gains the section "Genus recognition timing (Phase 29)" with the logcat command and the `run-as` listing for DC-D-03.
- `GenusRecognitionModal`: capture deleted in a `finally`, `runRef` guard so a sheet closed mid-classification stays closed, timing reported per photo. The Phase 15 comments that claimed the photo is never written were corrected (research flag F-D).

## Task Commits

1. Task 1: guarded delete, resized-file cleanup, timings in the classifier - `ad63e14f`
2. Task 2: timing line behind a build flag, README section - `5187f27b`
3. Task 3: modal cleanup, stale guard, timing report, D-07 test, comments - `8628ddec`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing `toEqual` assertions on the outcome could not stay unchanged**
- **Found during:** Task 1
- **Issue:** The plan says existing assertions still pass unchanged, but adding `timings` to every outcome breaks `toEqual({ status, reason })`.
- **Fix:** Those assertions became `toMatchObject({ status, reason })`; the invalid_manifest case asserts the full zero timings. No assertion was weakened beyond tolerating the new field.
- **Files modified:** `mobile/src/recognition/genusClassifierModel.test.ts`
- **Commit:** `ad63e14f`

**2. [Rule 1 - Bug] Failure stage misattribution in timings**
- **Found during:** Task 1
- **Issue:** The naive approach booked a preprocessing failure's time to inference.
- **Fix:** Track whether the tensor was produced; a failure before it books its time to preprocessing and none to inference, so `totalMs` = preprocessing + inference holds.
- **Commit:** `ad63e14f`

**3. Test not written: classifier throwing inside the modal**
- The classifier never throws by contract, and a rejected `handlePhoto` promise (called with `void`) is an unhandled rejection that kills the jest worker. The `finally` is still in place and the ok, unavailable and closed-while-classifying paths are tested; a throwing-classifier case was dropped.

## Known Stubs

None.

## Threat Flags

None. T-29-01 to T-29-04 are mitigated as planned (guard tests, finally on every path, no sweep, numbers-only payload with a key-set test).

## Issues Encountered

- `npm run format:check` reports `.claude/settings.local.json` (a local, untracked-by-plan tooling file, not touched by this plan). Out of scope.
- Verification: `npm run lint`, `npm run typecheck`, the full mobile unit suite with coverage (317 suites, 4255 tests) pass; `src/recognition` stays at 100 % statements and lines.
- The branch is `claude/phase-29-93b0d0`, not a `worktree-agent-*` branch; commits were made on it as instructed (sequential executor), never on `main`.

## Next Phase Readiness

Plan 29-10 can take DC-D-01 to DC-D-03 on an Android phone using the README-native section. Plan 29-02 adds the alphabetical genus sort for the picker only; the recognition modal deliberately does not use it.

## Self-Check: PASSED

- FOUND: mobile/src/recognition/temp-files.ts, temp-files.test.ts, timing.ts, timing.test.ts
- FOUND commits: ad63e14f, 5187f27b, 8628ddec
