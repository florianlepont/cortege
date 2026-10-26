---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 14
subsystem: mobile-pdf-export
tags: [pdf, device-measurement, ios-simulator, android-emulator, photo-settings, probe]
requires: [33-01, 33-12, 33-13]
provides:
  - device-measured page counts, map overlay alignment and photo weight of the phase 33 layout
  - PHOTO_EXPORT_SETTINGS fixed at 800 px / 0.65 with both measured sizes per platform
  - RC-05 closed, DC-33-01 to DC-33-04, CLAUDE.md and user story updated
affects: [33-15]
key-files:
  created:
    - .planning/phases/33-pdf-export-exhaustive-and-simplified-inserted-v1/33-14-MEASUREMENTS.md
  modified:
    - mobile/src/app/survey-pdf/export-settings.ts
    - mobile/src/app/survey-pdf/export-settings.test.ts
    - docs/user-tests/device-checks.md
    - CLAUDE.md
    - docs/specs/user-stories.md
decisions:
  - "Photo settings go back to 800 px / JPEG 0.65: 640 / 0.6 is -29.1 % on iOS but only -18.4 % on Android, under the 25 % rule of the plan (owner option, see open items)"
  - "No probe fallback applied: P-1 to P-5 pass on WebKit and Skia; the three growth or storage anomalies are explained and listed for the owner"
  - "No page estimate or pin changed: builder pageCount equals pdfinfo on iOS and Android for every case"
metrics:
  tasks: 3
  files: 6
  completed: 2026-10-24
status: complete
---

# Phase 33 Plan 14: Device measurement and closing of the code Summary

The phase 33 layout was printed through the real `printToFileAsync` on the iOS simulator (WebKit) and an Android emulator (Skia): builder page counts equal `pdfinfo` on every case on both, the design probe passes on both, the map overlay is aligned at both frames, and the photo settings return to 800 px / 0.65 because Android gains only 18.4 % at 640 / 0.6.

Full tables, method and open items: `33-14-MEASUREMENTS.md` (committed, read by 33-15).

## What was measured and how

- Chrome rows (final code) for the 13 cases, then a throwaway in-app harness (request-file poll running the real `exportAndShareSurveyPdf`, real asset reader, real photo preparation, real MapLibre snapshot of real Fontainebleau cadastre parcels, recorder instead of share) on the iPhone 18 Pro simulator (iOS 27.0) and on an API 36 emulator (a clone AVD of `Pixel_8`, which is in use and holds a release build of another signature). PDFs measured with `pdfinfo`, `pdffonts`, `pdfimages -list`, `pdftotext -bbox`, `pdftoppm`.
- The harness was never committed; `mobile/index.js` was reverted and `mobile/src/harness33.ts` deleted before the first commit; `git status` is clean. The clone AVD was deleted, Metro killed, the simulator shut down.
- Not measured: a real phone, the iOS offline snapshot branch, phone-photo sources (the 24 photo sources are the herbier JPEGs, the same as the Chrome baseline, 1400 px illustrations), the owner's `Pixel_8`.

## Page counts (builder = Chrome = iOS = Android by `pdfinfo`)

| Case | Pin | iOS | Android | Last body text bottom (iOS / Android, body bottom 800) |
|---|---:|---:|---:|---|
| complete v3.2 submitted (no map, no history) | 5 (target 4, open) | 5 | 5 | 700.4 / 702.4 |
| complete v3.0 draft | 4 | 4 | 4 | 724.4 / 726.4 |
| complete typical | 6 | 6 | 6 | 746.5 / 743.8 |
| complete typical conditioned | 7 | 7 | 7 | 746.5 / 743.8 |
| complete worst, with and without route | 10 | 10 | 10 | 746.5 / 743.8 |
| summary (typical, worst, no basemap, no history) | 1 | 1 | 1 | 800.0 / 798.3 (designed source lines) |

Every font embedded (six families; Type 3 subsets on Android), the logo stored once, one map JPEG, 24 of 24 photos present as JPEG objects, no raster for any gradient or path. No text cut at a page bottom. Android `numberOfPages` from `printToFileAsync` is wrong again (7 for a 5 page file), as in 25.1-07; `pdfinfo` was used.

## Probe P-1 to P-5 (UI-SPEC B.2)

| Item | iOS (WebKit) | Android (Skia) |
|---|---|---|
| P-1 gradients (informational) | pass | pass |
| P-2 ring, `rotate(-90)` against path arc | pass | pass on geometry; 10.5 KB for two rings, 0.5 KB over the 10 KB line |
| P-3 contour art, `slice` | pass | pass |
| P-4 rounded JPEG clip | pass (one JPEG, +1.3 KB over it) | the probe's `object-fit: cover` form is stored as flate (+184 KB); the built form (explicit size and offset, as `photos-section.ts` and `map-figure.ts` do) keeps the JPEG; all real photos and maps are `jpeg` |
| P-5 numeral `letter-spacing: -3px` | pass: 15.99 to 91.26, "/ 50" at 94.25, same as Chrome | pass: 15.98 to 91.15, "/ 50" at 94.14; +15.7 KB is the two extra Type 3 font subsets |

Finding on the probe itself: without `print-color-adjust: exact` WebKit drops every CSS background (the first device probe lost its forest boxes); `styles.ts` sets it on every real document, so the product is unaffected. The probe was fixed and re-run. No fallback was applied (no layout change would result); the judgement on the growth line is an owner item.

## Overlay alignment (D-12)

Snapshots of the composite style with the cadastre layer, three real parcels, viewed at 200 dpi: the outline lies on the cadastre lines and the building edges with no visible offset at 515 x 250 and at 515 x 228, on both engines. No frame or snapshot change was needed.

## Photo decision (D-17) with numbers

| | 24 photos 800 / 0.65 | 24 photos 640 / 0.6 | PDF delta |
|---|---:|---:|---|
| iOS | 1460.6 KB | 1035.2 KB | -29.1 % |
| Android | 1161.2 KB | 947.9 KB | -18.4 % |

Android is under the 25 % rule, so `PHOTO_EXPORT_SETTINGS` is `{ cap: 24, longEdgePx: 800, jpegQuality: 0.65 }`, commented with both sizes per platform and the date. The photo data alone is -37.2 % (iOS) and -32.5 % (Android) at 640 / 0.6 and shows no visible blocking at 120 and 240 dpi; keeping it is a one line owner choice.

## Weight (D-03) and summary (UI-SPEC B.11)

- Against the 33-01 Chrome baseline at 800 / 0.65: typical +15.2 % (iOS) and +17.8 % (Android), worst +3.6 % (iOS) and -17.7 % (Android); at 640 / 0.6: typical -6.8 % and +6.7 %, worst -26.6 % and -32.8 %. The layout alone is +2.1 to +2.5 % in Chrome (the cover). No pre-phase build was run on a phone, so a like-for-like device delta is unknown.
- Summary: iOS 234.3 KB (typical) and 264.0 KB (fullest), Android 246.6 KB and 273.2 KB, all over the 200 KB target (the town snapshot is 192 to 220 KB on iOS). Carried as an open item, nothing changed (`map-snapshot.ts` is outside this plan's files).

## Open items for the owner (copied; details in 33-14-MEASUREMENTS.md)

1. Photo setting: 800 / 0.65 by the rule; 640 / 0.6 is lighter (-29 % iOS, -18 % Android, no visible blocking). Owner choice.
2. Complete PDFs not lighter than the baseline at 800 / 0.65 (typical +15 to +18 %, worst iOS +3.6 %); Android text-only documents are 160 to 180 KB heavier (Type 3 fonts, engine).
3. Summary over 200 KB on both engines (234 to 273 KB): lower snapshot width or quality, or move the target.
4. The v3.2 submitted fixture without map and history prints 5 pages, target 4. Real page 2 holds identity, chart, heading and factor A in 689.8 of 740 units; the 0.92 fill factor (capacity 680.8) against the estimate 692 causes it. Options: accept 5; trim the estimates by 11.2 (chart 214 to 200 with identity 288 to 284 gives 674, but 200 under-estimates the real 205.5); or `PAGE_FILL_FACTOR` 0.94 (695.6). The `it.failing` test and the estimates were not touched, because the measurement shows the estimates are accurate and only the safety factor decides.
5. Probe judgement calls on Android (P-2 and P-5 growth, the `object-fit` form of P-4).
6. Not measured: real phone, iOS offline snapshot, phone-photo sources.

## Deviations from Plan

- [Rule 3 - blocking, documented fix] The iOS build failed with the known Xcode 27.1 ExpoModulesJSI swiftinterface error. The workaround of the memory note was applied once in this worktree's git-ignored `node_modules` (`BUILD_LIBRARY_FOR_DISTRIBUTION=NO`, simulator slice and `.DerivedData` removed, rebuild) and the script restored afterwards. No tracked file changed.
- [Rule 3] The Android debug build used the existing debug APK of this worktree (native code unchanged since); the first launch needed the `debug_http_host` preference (`localhost:8081`) written through `run-as`, as the memory note describes. A clone AVD was used and deleted.
- Tasks 1 and 2 share one commit (the measurement file), because both fill the same file.
- No probe fallback and no estimate fix were needed, so none of the conditional files of Task 3 was touched (`map-figure.ts`, `photos-section.ts`, `ring-svg.ts`, `cover-section.ts`, `summary-section.ts`, `identity.ts`, `factor-section.ts`, `factor-chart-svg.ts`, `trend-section.ts`, `build-html.test.ts`, `page-estimate.ts`).
- STATE.md, ROADMAP.md and REQUIREMENTS.md were not touched, as instructed.
- No file under `docs/technical/` describes the export (grep: the only PDF mentions are passing references in `api-contract-v1.md` and `data-contract-v1.md`), so none was changed.

## Verification

- `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/__checks__ --coverage=false`: 37 suites, 922 tests pass. Full mobile unit run: 455 suites, 7110 tests pass.
- Root `npm run lint` exit 0, `npm run typecheck` exit 0. `npm run format:check`: the only warning is the pre-existing untracked `.claude/settings.local.json`.
- `npm run test:unit` exits 1 only on the API `check-env` parity suite (50 tests, the known bash 3.2 failure of the Mac, passes in CI; nothing in this plan touches it); the domain package (468 tests) passes, and the mobile suite was run separately (above).
- Acceptance greps: `DC-33-0[1-4]` 4 rows, `RC-05` row with the counts, `surveyExportChoice`, `sectionsFor`, `four functions` and `resume` in CLAUDE.md, `33-14` and `pdfinfo` in `export-settings.ts`.

## Known Stubs

None.

## Threat Flags

None. T-33-32: the harness hook lived only in the working tree, `git status` was clean before each commit and no harness file is tracked. T-33-33: fixtures and invented names only, PDFs stayed in the scratchpad. T-33-36: every device number comes from a real run; nothing was extrapolated.

## Self-Check: PASSED

- FOUND: 33-14-MEASUREMENTS.md (with `## Open items for the owner`), export-settings.ts (`33-14`, `pdfinfo`), device-checks.md (DC-33-01 to DC-33-04, RC-05 closed), CLAUDE.md, user-stories.md
- FOUND: commits 5abf88fd (docs) and 0214b24c (feat)
