---
phase: 28-map-layers-comparison-inserted-v1
plan: 27
subsystem: docs-device-checks
tags: [docs, device-checks, validation, item-13]
requires: ["28-26"]
provides:
  - "docs/user-tests/device-checks.md: rows DL-02 to DL-09 (status 🔲) and the protocol section 'Map layers (Phase 28)'"
  - "28-VALIDATION.md revised 2026-10-12: plans 28-19 to 28-27 in the requirement map, new pure tests in Wave 0, DL-02 to DL-05 and DL-08 rewritten, DL-09 row, tunables in the DL-09 note, 380-line gate kept"
affects:
  - "28-18 (the owner checklist runs on these rows; it fills the outcomes)"
status: complete
key-files:
  created: []
  modified:
    - docs/user-tests/device-checks.md
    - .planning/phases/28-map-layers-comparison-inserted-v1/28-VALIDATION.md
decisions:
  - "Rows and protocol are in English with the French app strings quoted, like the rest of device-checks.md"
  - "The idle exit of the swipe mode is written as 8 s (IDLE_MS = 8000 in the code), not the 7 s of an earlier CONTEXT entry"
  - "The protocol section sits between the table and 'Recognition measurement'; emulator steps 1 to 9, iPhone steps 10 to 18, then the answers expected from the owner"
metrics:
  tasks: 2
  commits: 2
---

# Phase 28 Plan 27: Device checks and validation for item 13 Summary

The Phase 28 owner checklist now has eight rows (DL-02 to DL-09) that describe the Explorer as built after the owner feedback round, a protocol in the order of the rows, and a validation strategy that maps every plan up to 28-27. No outcome is written; 28-18 stays last and fills them.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Device check rows DL-02 to DL-09 and the protocol section | 2307c668 |
| 2 | The validation strategy follows the item 13 plans | bc154b9e |

## What was written

- **Rows** (all 🔲, read from the code and the summaries of 28-19 to 28-26): DL-02 capsule, round download button, overlay bubble and legend; DL-03 immersive swipe mode with the notices-column discretion stated as a question for the owner; DL-04 single comparison mode, centre line, slim grabber, outer-fifth exit; DL-05 side tag chevrons and tag swipe; DL-06 download button, card and chip; DL-07 airplane mode; DL-08 legibility, dark, receded-window ring and shadow; DL-09 zones and haptics with the tunables and their current values (`COMPARE_MIN` 1/3, `COMPARE_MAX` 2/3, `ZONE_HYSTERESIS` 0.03, `EDGE_EXIT_FRACTION` 1/5, `TAG_SWIPE_MIN` 44 pt, `TAG_FLICK_VELOCITY` 500 pt/s, `IMMERSIVE_SCALE` 0.94, `IMMERSIVE_IN_MS` 360, `IMMERSIVE_OUT_MS` 240, `BUTTON_FADE_MS` 160, `BUTTON_FADE_IN_DELAY_MS` 80). DL-01 unchanged.
- **Protocol 'Map layers (Phase 28)'**: nine emulator steps (preparation, uiautomator measurements, `adb shell input motionevent` drives, `dumpsys vibrator_manager`, three download runs reading `offline.layer-size`, airplane mode, screenshots, TalkBack), nine iPhone steps, and the answers expected: tunables, notices in the swipe mode, legend colours, draft-only parcels for Avec IBP, Android map view, fill factor and hint scrim.
- **Validation**: source line names 28-01 to 28-27 and CONTEXT item 13; the 380-line gate of `PublicMapScreen.tsx` kept and tied to 28-16, 28-17 and 28-19 to 28-26; requirement rows extended with 28-19 to 28-27 and their test types; Wave 0 lists the new pure tests (`edgeExitKeeps`, `edgeExitCue`, `tagSwipeStep`, `halfBounds`, `windowX`, immersive constants and ring contrast); manual table DL-02 to DL-05 and DL-08 rewritten, DL-09 row added (nine DL rows); DL-09 note lists the tunables.

## Verification

- `grep -cE "^\| DL-0[2-9] "` on device-checks.md: 8; on 28-VALIDATION.md `DL-0[1-9]`: 9; 🔲 on the eight rows: 8; each row has 7 cells.
- Row-level greps of the plan (recede and notices in DL-03, grabber in DL-04, chevron in DL-05, `EDGE_EXIT_FRACTION` and `TAG_FLICK_VELOCITY` in DL-09, `IMMERSIVE_` in the validation): all pass.
- No U+2014 in either file (grep count 0).
- Prettier on `device-checks.md`: the file was already not prettier-clean at HEAD (wide tables) and Markdown is outside the repo's `format:check` scope (`**/*.{ts,tsx,json}`); no `.ts`, `.tsx` or `.json` file changed.
- No file outside the two listed files and this SUMMARY changed; no `mobile/` file, no STATE, ROADMAP, REQUIREMENTS or CLAUDE.md.

## Deviations from Plan

None. The plan executed as written. Small choices: the idle exit is 8 s as in the code; the protocol section was placed before the Recognition section rather than at the end of the file.

## Known Stubs

None. The rows are intentionally 🔲 (the outcomes belong to 28-18).

## Threat Flags

None. T-28-63 mitigated: every row was written from the code constants and the summaries of 28-19 to 28-26, with the known unfixed points (exit hint overlapping the first notice pill, chip against the notices in the stacking order, native glass under a group opacity, map flicker when the window scales) listed in the rows for the owner run.

## Self-Check: PASSED

- FOUND: docs/user-tests/device-checks.md (8 rows DL-02 to DL-09, section 'Map layers (Phase 28)')
- FOUND: .planning/phases/28-map-layers-comparison-inserted-v1/28-VALIDATION.md (28-27, EDGE_EXIT_FRACTION, 380)
- FOUND: commits 2307c668, bc154b9e on claude/focused-sutherland-89f87e
