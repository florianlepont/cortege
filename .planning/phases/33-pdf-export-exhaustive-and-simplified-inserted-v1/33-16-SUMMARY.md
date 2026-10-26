---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 16
subsystem: mobile-pdf-export
tags: [pdf, photo-settings, page-fill-factor, snapshot-profile, device-measurement, gap-closure]
requires: [33-14]
provides:
  - PHOTO_EXPORT_SETTINGS 640 px / JPEG 0.6 (owner decision 2026-10-26)
  - PAGE_FILL_FACTOR 0.94, the v3.2 sheet without map or history builds 4 pages
  - takeBasemapJpeg profile "complete" | "summary" (summary 900 px / 0.7), chosen by the export mode
  - open items 1, 3 and 4 of 33-14-MEASUREMENTS.md marked decided, device re-measurement of the summary weight
affects: [33-15]
key-files:
  modified:
    - mobile/src/app/survey-pdf/export-settings.ts
    - mobile/src/app/survey-pdf/export-settings.test.ts
    - mobile/src/app/survey-pdf/paginate.ts
    - mobile/src/app/survey-pdf/paginate.test.ts
    - mobile/src/app/survey-pdf/build-html.test.ts
    - mobile/src/app/survey-pdf/page-estimate.ts
    - mobile/src/app/survey-pdf/map-snapshot.ts
    - mobile/src/app/survey-pdf/map-snapshot.test.ts
    - mobile/src/app/survey-pdf/assemble-export-data.ts
    - mobile/src/app/survey-pdf/assemble-export-data.test.ts
    - .planning/phases/33-pdf-export-exhaustive-and-simplified-inserted-v1/33-14-MEASUREMENTS.md
    - docs/user-tests/device-checks.md
    - CLAUDE.md
decisions:
  - "Photos 640 px / 0.6 (owner overrides the 25 % rule of 33-14: iOS -29.1 %, Android -18.4 %)"
  - "PAGE_FILL_FACTOR 0.94 with no other pinned count changed, so the stop rule was not triggered and 0.93 was not tried"
  - "Summary basemap profile 900 px / 0.7: the sharpest candidate, visually identical to 1100 / 0.8 at 200 dpi; no candidate brings Android under 200 KB, so the Android size is an open item"
metrics:
  tasks: 3
  completed: 2026-10-26
status: complete
---

# Phase 33 Plan 16: the owner's three decisions on the open items of 33-14 Summary

Photos are now 640 px / JPEG 0.6, the packing fill factor is 0.94 so the v3.2 sheet without map or history builds the 4 pages of its target, and only the one-page summary gets a lighter basemap (900 px / 0.7): iOS then lands under 200 KB, Android does not (209 to 242 KB) and that size goes to the owner review.

## What changed

| Task | Commit | Change |
|---|---|---|
| 1 | 4485f673 | `PHOTO_EXPORT_SETTINGS` `{ cap: 24, longEdgePx: 640, jpegQuality: 0.6 }`, comment with the 33-14 numbers and the 2026-10-26 decision, test pin, open item 1 marked decided |
| 2 | b732aa1b | `PAGE_FILL_FACTOR` 0.92 to 0.94 (doc comment with the device evidence), the `it.failing` test of the v3.2 fixture is a normal test expecting 4, one synthetic `paginate.test.ts` block enlarged (see deviations), open item 4 marked decided |
| 3 | 8630b98f | `takeBasemapJpeg` `profile?: "complete" \| "summary"` (default complete, any unknown value falls back to complete), `SNAPSHOT_SUMMARY_WIDTH_PX` 900 and `SNAPSHOT_SUMMARY_JPEG_QUALITY` 0.7, `assemble-export-data.ts` passes `summary` only when the effective mode is summary, device re-measurement, DC-33-01, DC-33-02 and the new DC-33-05, CLAUDE.md, open item 3 marked decided |

## Final values

- Photos: cap 24, 640 px, JPEG 0.6.
- `PAGE_FILL_FACTOR` 0.94 (capacity 695.6 of 740 units). `COMPLETE_BASE_PAGES` stays 5 (typical without photos), re-derived from the final builder; the estimate tests are unchanged.
- Summary snapshot profile 900 px / 0.7 (`summary`); complete profile 1100 px / 0.8, untouched.

## Page counts (builder = Chrome `pdfinfo`, 11 harness cases, Chrome root zoom 4/3)

| Case | Pages | KB | Lowest text of a page (pt, body bottom 800) |
|---|---:|---:|---:|
| complete v3.2 submitted, no map, no history | 4 (was 5) | 166.9 | 732.6 |
| complete v3.2 with the fullest route | 5 | 174.1 | 707.5 |
| complete v3.0 draft | 4 | 166.4 | 724.3 |
| complete typical | 6 | 445.2 | 745.7 |
| complete typical with note and route | 7 | 455.7 | 745.7 |
| complete worst case | 10 | 1025.4 | 745.7 |
| complete worst case without route | 10 | 1020.0 | 745.7 |
| summary | 1 | 137.8 | 799.5 |
| summary fullest | 1 | 141.7 | 799.5 |
| summary no basemap | 1 | 67.7 | 787.5 |
| summary no history | 1 | 132.6 | 787.5 |

Every complete page ends at 745.7 pt at most (54 pt above the body bottom, the 790 pt line is not approached), so no block is within 10 pt of the footer and the stop rule did not fire. The summaries end on their two source lines at 799.5 pt, designed. Page 2 of the 4 page v3.2 file (looked at): the identity card, the factor chart, the stand heading and the whole card of factor A, ending at 732.6 pt, nothing split; page 3 holds B to G, page 4 the context factors H to J and the two closing notes. The Chrome sizes use a 69 KB stand-in map, so they are not phone sizes.

## Device sizes of the summary (iPhone 18 Pro simulator iOS 27.0, API 36 emulator; real export path, real MapLibre snapshots of Fontainebleau)

KB, typical / fullest / fullest with the cadastre style:

| Profile | iOS | Android |
|---|---|---|
| 1100 / 0.8 (baseline, reproduces 33-14) | 234.1 / 264.0 / 287.7 | 246.7 / 273.3 / 292.4 |
| 900 / 0.7 (chosen) | 161.1 / 178.5 / 198.7 | 209.0 / 227.0 / 241.6 |
| 800 / 0.7 | 144.2 / 157.3 / 174.5 | 200.5 / 216.7 / 229.3 |
| 900 / 0.65 | 148.8 / 164.5 / 183.5 | 203.7 / 220.9 / 235.1 |

At 200 dpi the outline and the cadastre lines of 900 / 0.7 are the same as at 1100 / 0.8 on both engines (aligned, sharp, parcel numbers legible); 800 / 0.7 is a little softer. The real `takeBasemapJpeg({ profile: "summary" })` gives the same bytes as the 900 / 0.7 row. Photos weight was not re-run on the devices (the photo code path is unchanged; the 33-14 device numbers for 640 / 0.6 stand: iOS 1035.2 KB, Android 947.9 KB). Everything is detailed in the last section of `33-14-MEASUREMENTS.md` (tagged 33-16).

## Deviations from Plan

**1. [Rule 3 - blocking] A shell command edited the main checkout by mistake.** A `cd` with a path missing the worktree segment made one Python edit land on `/Users/florian/Projects/cortege/mobile/src/app/survey-pdf/paginate.ts` and `paginate.test.ts` (the main checkout). I saved the diff, restored both files with `git checkout -- <file>` (they carried only my edits; the pre-existing untracked entries of the main checkout were not touched) and re-applied the same edits in the worktree. Nothing was committed there.

**2. [Rule 1] One synthetic test of `paginate.test.ts` needed re-sizing.** `a chain of keepWithNext blocks moves together` used blocks of 450 + 20 + 20 + 200 = 690 units, which fit the new capacity of 695.6, so the chain no longer moved. The last block is now 230 (710 units). This is a unit test of the packing rule with made-up heights, not a fixture count, so the stop rule (no pinned count changed) still holds.

**3. Measurement scope.** The Chrome table has 11 cases, not the 13 of 33-14 (its two duplicate 800 / 640 photo rows are the same file in Chrome), and adds the v3.2 fixture with the fullest route. The 4 page v3.2 file was not re-printed on the phone engines (same builder, layout and engines as 33-14, whose page 2 measure of 689.8 of 740 is the evidence), and the photo weights were not re-run on the devices. The iOS run reused the 33-14 Debug build (native code unchanged), so the Xcode 27.1 ExpoModulesJSI workaround was not needed. The Android run used a config-only AVD `Pixel_8_c16` (no 12 GB clone, 20 GB free) with the 33-14 debug APK and the `debug_http_host` preference.

**4. Commit grouping.** Open item 4 of the measurements file was marked decided in the Task 2 commit and items 1 and 3 in the Tasks 1 and 3 commits, each with its own change.

No Rule 4 case. STATE.md, ROADMAP.md and REQUIREMENTS.md were not touched, as instructed.

## Cleanup

Metro killed, the iOS simulator shut down, the emulator killed and its AVD (`Pixel_8_c16`) deleted, the throwaway app harness (`mobile/src/harness33.ts`, the `mobile/index.js` import) removed before every commit, no `node_modules` script changed. The Chrome harness and all PDFs, JPEGs and crops stay in the session scratchpad.

## Open items for the owner review (33-15)

1. Android summary is over 200 KB at every candidate: 209.0 KB (typical), 227.0 KB (fullest), 241.6 KB (fullest with the cadastre style). About 152 KB of an Android summary is not the basemap (Type 3 font subsets, 148.5 KB with no basemap in 33-14), so the 200 KB target on Android can only be met by a far smaller map (800 / 0.7 gives 200.5 KB for the typical survey and a softer map) or by moving the Android target. iOS is under 200 KB (198.7 KB at worst, with 1.3 KB to spare).
2. Unchanged from 33-14: complete PDFs not lighter than the 33-01 Chrome baseline at 800 / 0.65 (the 640 / 0.6 choice improves it: typical iOS -6.8 %, worst iOS -26.6 %, Android +6.7 % and -32.8 % against that baseline), Android text-only documents about 160 to 180 KB heavier than Chrome (engine), the probe judgement calls on Android (P-2, P-4, P-5).
3. Not measured: a real phone, the iOS offline snapshot branch, phone-photo sources (herbier JPEGs were used), a device re-print of the 4 page v3.2 file.

## Verification

- `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/__checks__ --coverage=false`: 37 suites, 926 tests pass. Full mobile unit run: 455 suites, 7114 tests pass.
- `npm run lint` exit 0, `npm run typecheck` exit 0, `npm run format:check`: only the pre-existing untracked `.claude/settings.local.json` warning.
- No U+2014 in any added line.

## Known Stubs

None.

## Threat Flags

None. T-33-37: the profile comes from the effective export mode held in the assembler (a draft asked for a summary falls back to complete and so to the complete profile, tested), an unknown value falls back to the complete profile (tested), no new input surface. T-33-38: every device number comes from a real run on the simulator and the emulator, the unmeasured items are listed above.

## Self-Check: PASSED

- FOUND: commits 4485f673, b732aa1b, 8630b98f
- FOUND: `PAGE_FILL_FACTOR = 0.94` in paginate.ts, `longEdgePx: 640` and `jpegQuality: 0.6` and `2026-10-26` in export-settings.ts, `SNAPSHOT_SUMMARY_WIDTH_PX` in map-snapshot.ts, no `it.failing` left in build-html.test.ts
- FOUND: DC-33-05 and the 33-16 section in the documents; git status clean before this file
