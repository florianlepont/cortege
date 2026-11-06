---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 18
subsystem: mobile-pdf-export
tags: [pdf, cover, parcel-map, registry, page-counts, device-measurement, export-sheet, gap-closure, owner-review]
requires: [33-17]
provides:
  - the parcel map on page 1 of the complete PDF (D-24), the body map and its registry entry removed
  - re-derived page-count pins and COMPLETE_BASE_PAGES 4
  - device re-measure of the cover map, the counts and the export sheet on the iOS simulator and the Android emulator
  - device-check rows DV-33-06 to DV-33-11 and CLAUDE.md in line with the code
affects: [33-15]
key-files:
  modified:
    - mobile/src/app/survey-pdf/cover-section.ts
    - mobile/src/app/survey-pdf/cover-section.test.ts
    - mobile/src/app/survey-pdf/styles.ts
    - mobile/src/app/survey-pdf/styles.test.ts
    - mobile/src/app/survey-pdf/export-settings.ts
    - mobile/src/app/survey-pdf/export-settings.test.ts
    - mobile/src/app/survey-pdf/sections.ts
    - mobile/src/app/survey-pdf/sections.test.ts
    - mobile/src/app/survey-pdf/assemble-export-data.ts
    - mobile/src/app/survey-pdf/assemble-export-data.test.ts
    - mobile/src/app/survey-pdf/build-html.test.ts
    - mobile/src/app/survey-pdf/page-estimate.ts
    - mobile/src/app/survey-pdf/identity.ts
    - mobile/src/app/survey-pdf/identity.test.ts
    - mobile/src/app/survey-pdf/html.ts
    - mobile/src/app/survey-pdf/html.test.ts
    - mobile/src/i18n/fr/survey-export.ts
    - mobile/src/i18n/fr/survey-export.test.ts
    - mobile/test/survey-export-fixtures.ts
    - .planning/phases/33-pdf-export-exhaustive-and-simplified-inserted-v1/33-14-MEASUREMENTS.md
    - docs/user-tests/device-checks.md
    - CLAUDE.md
  deleted:
    - mobile/src/app/survey-pdf/map-section.ts
    - mobile/src/app/survey-pdf/map-section.test.ts
decisions:
  - "The cover shows the map and no identity fact, parcel id or year; the quiet panel has no legend line (orchestrator defaults)"
  - "fitToContents kept on iOS although about 27 pt of empty area beyond the bottom padding is added by the native sheet: the written fallback does not remove it and is meant for a blank, cut or jumping sheet; the choice is left to the owner"
  - "Draft cover: banner 368, tiles 400, map zone 528 to 792, legend ends at 791.2 pt in Chrome (budget 792)"
metrics:
  tasks: 5
  completed: 2026-10-26
status: complete
---

# Phase 33 Plan 18: the cover carries the parcel map (D-24), the pins and the device re-measure Summary

The complete PDF now opens on a 356-unit forest panel, the two sub-score tiles and the parcel map "Localisation" (the shared `buildMapFigure` at `COVER_MAP_FRAME_SIZE` 515 x 228, with its legend, the outline fallback and quiet panels), the body has no map, and every page-count pin dropped or stayed (typical 6 to 5, typical with note and route 7 to 6, worst case 10 to 9, v3.2 with the fullest route 5 to 4); Chrome, the iPhone 18 Pro simulator and the API 36 emulator all print the builder's counts, and the cover map is aligned on both phone engines.

## What changed

| Task | Commit | Change |
|---|---|---|
| 1 | fa527d03 | `COVER_PANEL_HEIGHT` 356 (banner 368, watermark 543), title 148, date 240, score 264, tiles 376; the six-fact grid and its constant, type and functions removed; the map zone at 504 (heading 20, box 228, legend 12, zone 264 high, 528 on a draft); `COVER_MAP_FRAME_SIZE` next to `MAP_FRAME_SIZE`, the figure CSS appended once at the end of `coverCss` |
| 2 | 424307f6 | the `map` registry entry and `map-section.ts` (with its test) deleted, phase 31 anchor after `factors` written in `sections.ts`; the loader frames the complete snapshot at `COVER_MAP_FRAME_SIZE`; fixtures follow; `build-html.test.ts` re-written (order, CSS order, new pins, map-on-the-cover, trend-after-the-factors, D-23 whole-document test); `COMPLETE_BASE_PAGES` 4; Chrome table of 14 cases in `33-14-MEASUREMENTS.md` |
| 3 | 20556aba | no reader left: `methodShortText`, `shortenList`, `cover.methodWithCas`, `cover.versionShort` and `identity.method` removed with their tests (`shortenText` stays, the summary uses it) |
| 4 | 89ace8e2 | device re-measure (iOS simulator, Android emulator) and the export sheet on both, written into `33-14-MEASUREMENTS.md`; `COVER_MAP_FRAME_SIZE` comment with the engines and date; counts comment of `PDF_PAGE_BLOCK_HEIGHT` |
| 5 | 8251ceaf | `DV-33-06` to `DV-33-11` in `device-checks.md` (pending owner re-check on the iPhone), DC-33-01 and DC-33-03 updated, CLAUDE.md (sheet, registry, cover, identity, charts, constants, counts) |

Task 1 was committed with the six `build-html.test.ts` cases that Task 2 rewrites still red (the body held its own map block too, so the page-1 and trend tests no longer matched); every other suite was green at that commit and the whole mobile suite is green at the end.

## Final pins

| Case | After 33-16 | Now (builder = Chrome = iOS = Android where run) | B.11 target |
|---|---:|---:|---|
| v3.2 submitted, no map, no history | 4 | 4 | not above 4 |
| v3.2 with the fullest route | 5 | 4 | none |
| v3.0 draft | 4 | 4 | not above 4 |
| typical (map, 3 history points, 6 photos) | 6 | 5 | not above 6 |
| typical with note and fullest route | 7 | 6 | not above 7 |
| worst case, with and without the route | 10 | 9 | not above 10 |
| summaries | 1 | 1 | exactly 1 |
| 30 parcels, v3.2 | none | 4 | none |

No pin went up and the stop rule never fired; the builder gave exactly the planner's simulation on the first run. `COMPLETE_BASE_PAGES` is 4 (typical without photos), pinned equal by `page-estimate.test.ts`, within one page for the v3.2, draft, conditioned and worst fixtures. A submitted typical survey printed as a draft is 6 pages (the draft banner costs 24 units on every body page); it is not a pinned case.

## Chrome table (harness of 33-RENDER-HARNESS.md, layout android 4/3, photos 640 px / 0.6)

| case | builder | pdfinfo | KB | lowest body text bottom (pt, rule 790) | cover legend bottom (pt, 768 / 792 draft) |
|---|---:|---:|---:|---:|---:|
| complete-v32 | 4 | 4 | 165.9 | 713.8 | none (quiet panel) |
| complete-v32-route | 4 | 4 | 170.7 | 687.5 | none |
| complete-v30-draft | 4 | 4 | 167.6 | 724.3 | none (no parcel) |
| complete-typical | 5 | 5 | 437.4 | 745.7 | 767.2 |
| complete-typical-conditioned | 6 | 6 | 448.2 | 745.7 | 767.2 |
| complete-worst | 9 | 9 | 1031.6 | 745.7 | 767.2 |
| complete-worst-no-route | 9 | 9 | 1026.0 | 745.7 | 767.2 |
| complete-many-parcels | 4 | 4 | 172.7 | 662.6 | none |
| complete-many-parcels-wide | 4 | 4 | 172.7 | 662.6 | none |
| complete-typical-outline | 5 | 5 | 377.0 | 745.7 | 767.2 |
| summary | 1 | 1 | 133.1 | 799.5 | n/a |
| summary-worst | 1 | 1 | 137.0 | 799.5 | n/a |
| summary-no-basemap | 1 | 1 | 71.6 | 787.5 | n/a |
| summary-no-history | 1 | 1 | 127.9 | 787.5 | n/a |
| (extra) complete-long-name | 5 | 5 | 439.9 | 745.7 | 767.2 |
| (extra) complete-draft-typical | 6 | 6 | 445.6 | 769.7 | 791.2 |

What the covers show (120 dpi): the typical cover has the panel, the two rings, "Localisation" with the map, scale bar, north arrow and the source line, 36 units of paper under it; the v3.0 draft has the banner at 368, the tiles at 400 and a quiet panel "Aucune parcelle liée à ce relevé." under the pale watermark; the worst case shows the three outlines (and a long 20 / 24 site name on three lines that one contour ring crosses, as the old cover did for names of that length; date, eyebrow and subtitle are clear of the rings); the outline-only cover shows the pale canvas and the "contour des parcelles seul" legend; the 30-parcel and the 30-id wide documents print a quiet "no outline" panel on the cover (the fixtures have no geometry), no id and no ellipsis anywhere.

## Device results

Real `exportAndShareSurveyPdf` and real `assembleSurveyExportData` (so the loader's cover framing was exercised), real assets, real photo preparation, real MapLibre snapshots of real cadastre parcels of Fontainebleau; iPhone 18 Pro simulator (iOS 27.0, WebKit) and an API 36 emulator (Skia). Full tables in `33-14-MEASUREMENTS.md`.

| engine | case | pages (= builder) | KB | lowest body text | cover legend bottom |
|---|---|---:|---:|---:|---:|
| ios | complete-v30-draft | 4 | 87.6 | 724.2 | none |
| ios | complete-v32 | 4 | 87.5 | 694.1 | none |
| ios | complete-many-parcels (narrow / wide) | 4 / 4 | 88.0 / 88.0 | 662.3 | none |
| ios | complete-typical | 5 | 486.3 | 746.5 | 767.9 |
| ios | complete-worst | 9 | 1111.5 | 746.5 | 767.9 |
| ios | summary | 1 | 165.9 | 800.0 (designed) | n/a |
| android | complete-v30-draft | 4 | 325.7 | 721.9 | none |
| android | complete-v32 | 4 | 299.4 | 692.7 | none |
| android | complete-many-parcels (narrow / wide) | 4 / 4 | 299.5 / 299.7 | 660.1 | none |
| android | complete-typical | 5 | 555.6 | 743.8 | 766.1 |
| android | complete-worst | 9 | 999.9 | 743.8 | 766.1 |
| android | summary | 1 | 220.5 | 798.3 (designed) | n/a |

- Cover map alignment at 200 dpi (three parcels, cadastre composite style): outlines on the cadastre lines and the building footprints of the town hall block, no visible offset (under 2 units) on both engines. Verdict: `COVER_MAP_FRAME_SIZE` 515 x 228 stays.
- One cover map JPEG on page 1 (1100 x 487 on iOS, 1100 x 486 on Android), the logo once, six fonts embedded; the group labels of both charts sit inside their chart on both engines; the 30-parcel identity card is 341.9 / 368.1 pt (iOS) and 342.3 / 367.8 (Android) tall for the narrow and the wide ids, under the estimate 388.
- Sizes are not like for like with 33-14 and 33-16 (worst case iOS 1111.5 against 1035.2 KB because its cover map is the cadastre-style snapshot at the complete profile, 239 KB; summary iOS 165.9 against 161.1, Android 220.5 against 209.0, from the 33-17 chart and text). The Android summary stays over 200 KB (unchanged open item).

## The export sheet and the fitToContents verdict

| Variant (iOS, iPhone 18 Pro, default text size) | top | button bottom | visible sheet bottom | height |
|---|---:|---:|---:|---:|
| submitted | 435.0 pt | 776.5 pt | 861.7 pt | 427 pt (arithmetic 430) |
| draft | 389.7 pt | 776.5 pt | 861.7 pt | 472 pt (arithmetic 478) |

Fitted, nothing cut, title and cross have their room, no "Annuler", no blank or jumping sheet; at `accessibility-extra-extra-extra-large` the sheet takes the full height below the status bar, the title wraps on three lines beside the cross and the button is below the fold (scrolling by gesture was not exercised, no input tool for the simulator). Android: a full-screen modal, title under the status bar, the cross and the hardware back key both close it.

Deviation to read: the area under the button is 85 pt (24 padding, 34 safe area inset in the content padding, about 27 pt that the native iOS 26 sheet adds). The plan's rule (no empty band over 16 pt beyond the bottom padding) is exceeded by about 11 pt. A test with `insets.bottom` removed from the padding gave a sheet 34 pt shorter and a 51 pt area, so the 27 pt are native and constant. The A.7 fallback (`[f, 1]`) was not applied: it would leave a larger empty area on the submitted sheet and is written for a blank, cut or jumping sheet. `stack-options.ts` and `navigation.test.tsx` are unchanged. The test edit was reverted and is not in the repository.

## Deviations from Plan

1. **[Process] Task 1 commit left six `build-html.test.ts` cases red** until Task 2 rewrote them (the old body map block and the cover map printed the heading twice). Task 2 fixed them; nothing else was red.
2. **[Rule 1 - judgement] The cover test of the escaped observer** read `&lt;script&gt;`: the observer is no longer printed on the cover, so the test now asserts the cover holds no observer text and no `<script`.
3. **fitToContents verdict** as above: the plan's strict pass rule is exceeded by about 11 pt of native area; kept, recorded, owner to decide.
4. **Extra Chrome cases** (a 64 character name, a draft with a map) and an extra `complete-many-parcels-wide` device job, beyond the 14 cases.
5. **Scope of the device runs**: the v3.2 with route and the conditioned typical were measured in Chrome only; a draft with a map was measured in Chrome only on the cover (the device draft had no parcel).

No Rule 4 case. `STATE.md`, `ROADMAP.md` and `REQUIREMENTS.md` were not touched.

## Cleanup

In-app harness (two files under `mobile/src` and the `mobile/index.js` import) removed before every commit, `git status` clean; Metro and both servers killed; simulator shut down (text size back to `large`); emulator killed and the clone AVD `Pixel_8_c18` deleted; `adb reverse` removed. No `node_modules` script touched, nothing installed on the physical iPhone.

## Verification

- `npm run lint` and `npm run typecheck` exit 0; `npm run format:check` only reports the pre-existing untracked `.claude/settings.local.json`.
- Full mobile unit run with coverage: 454 suites, 7105 tests pass, thresholds held (the plan's survey-pdf, `__checks__`, navigation and i18n runs are inside it).
- No U+2014 in any added line of `mobile`, `CLAUDE.md` or `device-checks.md`; `build-html.ts`, `map-projection.ts`, `map-figure.ts` and `survey-pdf-export.ts` unchanged against the base commit; `MAP_FRAME_SIZE` still exported; `grep buildMapBlock|mapSectionCss` finds nothing.

## Known Stubs

None.

## Threat Flags

None. T-33-44 (a test feeds an `http:` and a quote-carrying data URI: the cover draws the outline), T-33-45 (banner 368 and watermark 543 pinned, both covers viewed), T-33-46 (harness removed, no PDF or crop committed, `git status` clean), T-33-47 (every device number comes from a real run, unmeasured items listed), T-33-48 (`buildMapFigure`, `map-projection.ts`, `MAP_FRAME_SIZE` unchanged, the anchor is written in `sections.ts` and CLAUDE.md) are mitigated.

## Open items for the owner's re-check (33-15)

1. The empty area under the button of the iOS sheet (85 pt, 27 pt native): keep `fitToContents` as it is, or drop `insets.bottom` from the iOS bottom padding (51 pt on this phone; older phones and iOS before 26 then need the inset).
2. A site name of 49 characters or more on three lines can be crossed by a contour ring on the cover (cosmetic, as before).
3. Not measured on a device: a real phone, scrolling of the sheet at the largest text size, a draft cover with a map (Chrome only, legend at 791.2 pt of 792), the fullest-route v3.2 and the conditioned typical, the offline snapshot branch, phone-photo sources.
4. Android summary 220.5 KB, over the 200 KB target (unchanged since 33-16).

## Self-Check: PASSED

- FOUND: commits fa527d03, 424307f6, 20556aba, 89ace8e2, 8251ceaf
- FOUND: `COVER_MAP_FRAME_SIZE` in `export-settings.ts` and `CLAUDE.md`, `DV-33-06` to `DV-33-11` in `device-checks.md`, the section "Re-measurement of plans 33-17 and 33-18 (2026-10-26)" in `33-14-MEASUREMENTS.md`
- MISSING (deleted on purpose): `map-section.ts`, `map-section.test.ts`
