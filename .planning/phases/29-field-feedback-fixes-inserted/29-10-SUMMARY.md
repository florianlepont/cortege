---
phase: 29-field-feedback-fixes-inserted
plan: 10
subsystem: device-verification
tags: [device-checks, android, ios, offline, recognition]

requires:
  - phase: 29-field-feedback-fixes-inserted
    provides: "plans 29-01 to 29-09 (temp-file cleanup and timings, genus order, CenteredState, offline own surveys, compact parcel card, abbreviations)"
provides:
  - Documents corrected (the recognition rework was set aside), measurement protocol, abbreviation rule in CLAUDE.md
  - Device verification of decisions D-03, D-08, D-10, D-04 on the Android emulator and of F-1 and F-2 on the owner's iPhone
  - Fix 2c54366b of the tall Réessayer button (found by the device check)
  - Findings F-3 (Android offline download) and the network indicator defect, both handed to separate sessions
affects: []

tech-stack:
  added: []
  patterns:
    - "Layout is measured from the native view tree (uiautomator bounds), not judged from screenshots"

key-files:
  created: []
  modified:
    - docs/user-tests/device-checks.md
    - .planning/ROADMAP.md
    - CLAUDE.md
    - mobile/src/ui/CenteredState.tsx
    - mobile/src/ui/CenteredState.test.tsx

key-decisions:
  - "SC-1 and SC-7 (Android recognition on two real phones, latency and cleanup measured as DC-D-01 to DC-D-03) are DEFERRED by the owner on 2026-10-11: no Android phone is available to her; the Android testers can run the measurement later with a Release APK built with EXPO_PUBLIC_GENUS_TIMING=true. The code part of SC-7 (temp files deleted, timings instrumented) is done and tested in plan 29-01."
  - "Decision D-09 stays as decided: an own survey is drawn offline only when its parcels are in a downloaded area. The owner's area is downloaded and her surveys appear; no position is persisted."
  - "The root fix of AppPressable (fill growth) lives on a separate branch (fix/apppressable-fill-growth), verified there on Android; this phase keeps its local height fix in CenteredState."

requirements-completed: [D-01, D-03, D-08]

coverage:
  - id: D1
    description: "Documents no longer say Phase 29 reworks the recognition workflow; measurement protocol and abbreviation rule written"
    requirement: SC-7
    verification:
      - kind: grep
        ref: "plan 29-10 Task 1 acceptance criteria"
        status: pass
    human_judgment: false
  - id: D2
    description: "Decision D-03 (F-1): offline community page is a centred message with a normal Réessayer button, inside the safe area"
    requirement: D-03
    verification:
      - kind: device
        ref: "Pixel_8 emulator 360 x 640 dp, airplane mode: button 237 x 88 px after fix 2c54366b (785 px before); owner's iPhone: button repaired"
        status: pass
    human_judgment: true
  - id: D3
    description: "Decision D-08: compact parcel-selection card on the smallest screen"
    requirement: D-08
    verification:
      - kind: device
        ref: "Android emulator 360 x 640 dp: card about 148 dp, about 60 % of the map viewport visible"
        status: pass
    human_judgment: true
  - id: D4
    description: "Decisions D-01 and D-09 (F-2): own surveys drawn offline after a force quit and relaunch"
    requirement: D-01
    verification:
      - kind: device
        ref: "Owner's iPhone, Release build of the branch (09:12), airplane mode, force quit, relaunch: her surveys appear on the Explorer map"
        status: pass
    human_judgment: true
  - id: D5
    description: "Decisions D-04, D-10 and the PDF: IBP sheet, Latin genus chips, Latin-ordered PDF list"
    requirement: D-04
    verification:
      - kind: device
        ref: "Android emulator (IBP sheet, chips); owner's iPhone (PDF ok); the sheet title close to the Android status bar accepted by the owner"
        status: pass
    human_judgment: true
  - id: D6
    description: "SC-1 and SC-7: recognition on two real Android phones, median and p95 of the latency against 3 s, empty cache folders (DC-D-01 to DC-D-03)"
    requirement: SC-1
    verification:
      - kind: manual
        ref: "docs/user-tests/device-checks.md rows D-01 to D-03"
        status: deferred
    human_judgment: true
---

# Phase 29 Plan 10: Device checks and documentation Summary

**Close the phase with the checks Jest cannot make: the offline community page, the compact parcel card, the offline own surveys, the genus chips and the IBP sheet, verified on an Android emulator and the owner's iPhone, with SC-1 and SC-7 (real Android phones) deferred.**

## Accomplishments

- Task 1 (commit 25526d0d): the wording "Phase 29 reworks the recognition workflow" removed from `device-checks.md` and `ROADMAP.md`, criterion 6 narrowed by decision D-01, the measurement protocol for DC-D-01 to DC-D-03 written, the abbreviation rule and gate added to `CLAUDE.md`.
- Task 2 (device checks), run by the orchestrator with the owner:
  - Android emulator (Pixel_8, 360 x 640 dp), Phase 29 code:
    - The first F-1 fix was incomplete: the Réessayer button measured 785 px tall in the native view tree. Root cause: `AppPressable`'s scale wrapper (`flexGrow: 1`) stretched an auto-height button inside flex-grown scroll content. Fixed in `2c54366b` (fixed button height, test pinned); re-measured 237 x 88 px in airplane mode.
    - D-08: the compact card is about 148 dp and leaves about 60 % of the map viewport.
    - D-10: Latin-first genus chips in Latin order. D-04: the IBP row and sheet. Plan 29-09: region names in the cluster list.
  - Owner's iPhone 15 Pro (Release build of the branch): F-1 button repaired, F-2 verified (own surveys on the map after airplane mode, force quit and relaunch), PDF ok.
- Task 3 (real Android phones): deferred, see Deferred Items.

## Task Commits

1. Task 1: `25526d0d` docs
2. Fix found by Task 2: `2c54366b` fix(29-03) CenteredState button height
3. Results recorded: `96a7169c`, `40dbf76b`, `f229f22e`, `1312161a`, `86a85118` (device-checks.md, including the correction of an early misreading of F-2)

## Deviations from Plan

1. **[Rule 1 - Bug] The plan 29-03 layout fix did not remove the tall capsule on a device.** Found by the Task 2 measurement; fixed in `2c54366b`. Jest cannot see Yoga layout, so the value is pinned by a test and the real height was measured.
2. **Plan 29-10 Task 2 was not run on an iPhone SE simulator.** The owner verified F-1, F-2 and the PDF on her iPhone 15 Pro instead; the small-screen card share is measured on Android only (the pure test covers 375 x 667).
3. **Task 3 deferred** by the owner (no Android phone).
4. **A test draft created by a stale debug build** ("Test_phase29_ne_pas_garder") was synced to the owner's account and deleted afterwards with her approval.

## Deferred Items

- **SC-1 and SC-7 device part (DC-D-01 to DC-D-03):** recognition confirmed and timed on at least two real Android phones. To run with the Android testers: Release APK built with `EXPO_PUBLIC_GENUS_TIMING=true` (see `mobile/README-native.md`), 1 warm-up and at least 10 photos online and in airplane mode, `adb logcat -s ReactNativeJS`, median/p95/worst against 3 s, the cache folders empty (debuggable build only for the owner). The rows stay unchecked in `docs/user-tests/device-checks.md`.
- **iOS visual check of the full parcel card at 393 x 852** and the wizard-step and Explorer-legend IBP glyphs on Android: not seen.

## Known Stubs

None.

## Threat Flags

None new. The debuggable build is not handed to testers (T-29-22); `mobile/.env` was not committed (T-29-23).

## Issues Encountered

- A stale Metro on port 8081 (main checkout, older commit) served old JS to the emulator; discarded the first screenshots, ran this worktree's Metro on another port.
- The emulator was shared with another Claude session; coordinated by message, and its settings were restored.
- Android offline area download is stuck at 0 % (finding F-3, MapLibre cannot parse the local file:// style URL): handed to a separate session, merged on `main` by the owner.
- The online/offline indicator is not reliable on the iPhone (airplane mode not reflected): existing defect, handed to a separate session.

## Next Phase Readiness

Phase 29 can go to verification with SC-1 and SC-7 (device part) recorded as deferred.

## Self-Check: PASSED

Lint, typecheck and 325 suites (4357 tests) with the coverage floors pass on `claude/phase-29-93b0d0`; Task 1 criteria and the device results above are recorded in `docs/user-tests/device-checks.md`.
