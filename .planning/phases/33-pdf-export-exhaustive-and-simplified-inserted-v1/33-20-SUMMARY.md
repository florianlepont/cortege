---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 20
subsystem: mobile-pdf-export
tags: [pdf, charts, plane, rose, device-measurement, ios-simulator, android-emulator, probe-p-6, gap-closure, owner-review]
requires: [33-19]
provides:
  - device re-measure of the plane, the rose and the summary's plane on the iOS simulator (WebKit) and the Android emulator (Skia)
  - probe P-6 and P-7 verdicts
  - device-check rows DV-33-12 to DV-33-15 (pending owner re-check), DV-33-10 superseded
  - CLAUDE.md in line with the charts and the package cut-off constants
affects: [33-15]
key-files:
  modified:
    - .planning/phases/33-pdf-export-exhaustive-and-simplified-inserted-v1/33-14-MEASUREMENTS.md
    - mobile/src/app/survey-pdf/factor-chart-svg.ts
    - docs/user-tests/device-checks.md
    - CLAUDE.md
decisions:
  - "P-6 passes on both engines (0.53 and 0.51 pt at most), so no builder change: the end-anchored texts print where Chrome prints them"
  - "The rows of the cases are the committed fixtures with real assets, photos and cadastre snapshots (the 33-14 recipe), not the real loader of 33-18: the charts do not depend on it"
metrics:
  tasks: 2
  completed: 2026-10-26
status: complete
---

# Phase 33 Plan 20: device re-measure of the CNPF-like charts and the documentation Summary

The plane, the rose and the summary's plane of plan 33-19 print the same on the iPhone 18 Pro simulator (iOS 27.0, WebKit) and on an API 36 emulator (Skia) as in Chrome: every page count equals the builder's pin, every text is inside its panel, probe P-6 passes (largest difference 0.53 pt), the charts are vector, and the owner's re-check rows and CLAUDE.md are written.

## What changed

| Task | Commit | Change |
|---|---|---|
| 1 | fa41924f | section "Device re-measure of plan 33-19, the CNPF-like charts (2026-10-26)" in `33-14-MEASUREMENTS.md` (14 device rows, the P-6 table, P-7, the 200 dpi observations, cleanup, open items); a comment on the chart block height in `factor-chart-svg.ts` (comment lines only) |
| 2 | 1b768ed5 | `DV-33-12` to `DV-33-15` in `device-checks.md` (pending owner re-check on the iPhone), `DV-33-10` superseded by D-28, results appended to `DC-33-01` and `DC-33-04`; CLAUDE.md: D-01 to D-29, the plane and the rose, "the plane" in the summary bullet, plans 33-14, 33-18 and 33-20, `STAND_BAND_CUT_OFFS` and `CONTEXT_BAND_CUT_OFFS` |

## Device results (the real `exportAndShareSurveyPdf`, real assets, photos at 640 / 0.6, real MapLibre snapshots of Fontainebleau cadastre parcels)

Pages equal the builder's pin everywhere (v3.2 4, typical 5, worst 9, low score 4, v3.0 draft 4, summaries 1, no pin went up). KB is `pdfinfo` bytes / 1000 (33-18 in brackets). Lowest body text of pages 2 and on, rule 790 pt (the summary's designed source lines sit at 800). Source line bottom on page 2 against the card's estimated bottom (549 pt; 535 for the draft; 711 for the worst case): a negative gap is above the estimate, the rule is at most 2 pt below.

| engine | case | pages | KB | lowest body text, pt | source line bottom / gap, pt |
|---|---|---:|---|---:|---|
| ios | complete-v32 | 4 | 89.3 (87.5) | 725.0 | 536.8 / -12.2 |
| ios | complete-typical | 5 | 488.0 (486.3) | 746.5 | 536.8 / -12.2 |
| ios | complete-worst | 9 | 1104.0 (1111.5) | 746.5 | 700.4 / -10.6 |
| ios | complete-low-score | 4 | 89.2 (new) | 725.0 | 536.8 / -12.2 |
| ios | complete-v30-draft | 4 | 89.1 (87.6) | 724.2 | 522.9 / -12.1 |
| ios | summary | 1 | 164.6 (165.9) | 800.0 | heading ends 520.6 (limit 555) |
| ios | summary-low-score | 1 | 164.5 (new) | 800.0 | heading ends 520.6 |
| android | complete-v32 | 4 | 328.9 (299.4) | 723.4 | 535.4 / -13.6 |
| android | complete-typical | 5 | 590.4 (555.6) | 743.8 | 535.4 / -13.6 |
| android | complete-worst | 9 | 1025.4 (999.9) | 743.8 | 698.7 / -12.3 |
| android | complete-low-score | 4 | 326.6 (new) | 723.4 | 535.4 / -13.6 |
| android | complete-v30-draft | 4 | 353.4 (325.7) | 721.9 | 521.2 / -13.8 |
| android | summary | 1 | 224.9 (220.5) | 798.3 | heading ends 519.8 |
| android | summary-low-score | 1 | 223.8 (new) | 798.3 | heading ends 519.8 |

Chrome for the same cases (33-19): v3.2, typical and low score 725.8 pt on page 2, source line at 536.2.

- Containment: every plane and rose text is inside its panel on both engines (plane 7.7 to 8.0 pt from the sides, rose 11.6 to 12.6 pt, 1.0 pt at least at the bottom by font box, 2.2 pt at least at the top); the summary's plane texts are 7.4 pt at least inside the panel and its heading is on one line, 34 and 35 pt under the 555 pt edge.
- Vector: `pdfimages -list` of all 14 files shows only the logo, the cover map JPEG (1100 x 487 and 1100 x 486) or the summary map (900 px) and the photos; nothing on page 2, no new raster object. Six fonts embedded on both engines.
- Cover legend bottom 767.9 pt (iOS) and 766.1 pt (Android) on the typical and worst covers, budget 768.

### Probe P-6 (right edges against Chrome, pt, `complete-typical` page 2)

| text | chrome | ios | android |
|---|---:|---:|---:|
| y tick "15" | 92.99 | 92.72 (-0.27) | 92.87 (-0.11) |
| level name "moyenne" | 92.98 | 92.48 (-0.50) | 92.87 (-0.11) |
| x axis title (ends "35") | 310.99 | 310.46 (-0.53) | 310.61 (-0.38) |
| "Continuité" | 386.99 | 387.23 (+0.25) | 386.53 (-0.46) |
| "ouverts" | 397.48 | 397.61 (+0.13) | 397.00 (-0.48) |
| "Dendromicrohabitats" | 424.99 | 424.99 (0.00) | 424.48 (-0.51) |

**P-6: pass on both engines** (limit 1 unit). The x title ends at the same place when the number is shorter (`complete-low-score`: 310.46 on iOS, 310.61 on Android), so the end anchor holds on both. **P-7: nothing to probe**, re-run grep over `plane-svg.ts` and `rose-svg.ts` finds no fill pattern, turned text, transform or transparency (only the two header comments that say so); dashed lines print dashed on both engines.

## What I saw in the 200 dpi crops (both engines alike)

Crops of the page 2 card of `complete-typical`, `complete-low-score` and `complete-v30-draft` and of the summary's score row, looked at on iOS and on Android.

- **Plane**: five bands in order (strong terracotta, pale terracotta, ochre, pale green, strong green), clearly told apart; tick values 0, 7, 14, 21, 28, 35 under the cuts, band names under the bands ("assez / faible" and "assez / forte" on two lines); two dashed level lines at 5 and 10 over the whole plot, level names "faible", "moyenne", "forte" in the left gutter, right-aligned on the same x as in Chrome; the marker is a dark green disc with its paper ring and two thin dotted guides (at 20 and 12 on the typical, in the first band and level on the low score where the guides are short but the disc stays readable on the terracotta); the bold axis titles "Contexte : N / 15" top left and "Peuplement et gestion : N / 35" bottom right, ending on the plot's right edge. Nothing clipped; the "15" tick and the y title are close but separate.
- **Rose**: pale green zone to the 5 ring (olive stroke), pale terracotta zone to the 2 ring (terracotta stroke), white hub inside a thin terracotta 0 ring, ten white spokes, scale 0, 2, 5, a dark green polygon with ten dots; stand names in green and context names in brown, two lines at most, each inside the panel and aligned to its axis (the left half ends at the same x on both engines). On the typical data the polygon passes right beside the ring value "2", still readable (no halo); on the low score it is a small star on the hub and the 2 ring with "0" and "2" readable.
- **v3.0 draft (I and J missing)**: two dashed grey spokes with no dot for "Milieux aquatiques" and "Milieux rocheux", the polygon runs A to H and stops (none to I or J, none from J to A), both names still printed in brown; the pale "Brouillon" watermark crosses the card without hiding anything; the marker at 20 and 4 sits just under the dashed line at 5.
- **Source line**: one line under both panels on both engines, ending at x 462.
- **Summary**: heading on one line over the plane in its panel, the forest card unchanged on the left, the five tints, dashed lines, disc with ring and guides, titles; no bars left. The 8-unit labels read at 200 dpi; whether they read on paper at 100 percent and on the phone is for the owner (DV-33-15).
- The only visible difference between the engines is the card heading "Lecture du score IBP", lighter and about 7 pt narrower on Android (Type 3 Sora ExtraBold subset); nothing moves.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] The in-app harness no longer existed**
- **Found during:** Task 1
- **Issue:** the 33-18 harness was removed before its commits as designed, and the plan asks for a re-run.
- **Fix:** rewrote a throwaway harness (`mobile/src/harness33.ts` and one import in `mobile/index.js`, never committed, removed before the first commit) following the 33-14 recipe: the committed fixtures with the real asset reader, real photo preparation and real MapLibre snapshots of real cadastre parcels, `share` replaced by a recorder. The real `assembleSurveyExportData` reader of 33-18 was not used; the charts do not depend on it. The recipe is in the measurements file.

**2. [Process] A first Android run was discarded**
- **Found during:** Task 1
- **Issue:** the iOS simulator was still running and polled the same server through the reversed port, so the PDFs recorded as Android were iOS PDFs (identical byte counts).
- **Fix:** shut the simulator down, re-ran the seven jobs on the emulator only. Every number in the measurements file and here comes from the second run; the discarded files were set apart and never read.

**3. [Scope] Cases not run on the devices**
- The plan's seven cases only: the 30-parcel documents, the fullest-route v3.2 and the conditioned typical stay Chrome only (as in 33-18).

No Rule 4 case. `STATE.md`, `ROADMAP.md` and `REQUIREMENTS.md` were not touched, no page-count pin was changed, no source line changed except one comment.

## Cleanup

Harness file and `mobile/index.js` import removed, `git status` clean before and after each commit; Metro and the result servers killed; the simulator shut down (text size never changed, stayed `large`); the emulator killed and the clone AVD `Pixel_8_c20` deleted; `adb reverse --remove-all`. Nothing installed on the physical iPhone, no PDF or crop committed (they stay in the scratchpad).

## Verification

- `npm run lint` and `npm run typecheck` exit 0; `npm run format:check` reports only the pre-existing untracked `.claude/settings.local.json`.
- `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf --coverage=false`: 31 suites, 879 tests pass.
- `git diff -U0 HEAD -- factor-chart-svg.ts` before the Task 1 commit held comment lines only (count of other changed lines: 0); no U+2014 in any added line of `CLAUDE.md`, `device-checks.md` or the measurements file; `grep -c "ten factor bars" CLAUDE.md` is 0; four rows `DV-33-12` to `DV-33-15`.

## Known Stubs

None.

## Threat Flags

None. T-33-55 (no harness, PDF or member data committed: fixtures and public cadastre parcels only, `git status` clean), T-33-56 (every device number is from a real run; the discarded Android run is disclosed) and T-33-57 (docs quote the measured numbers; greps on the new names and on the removed text) are mitigated.

## Open items for the owner's re-check (plan 33-15)

1. The two questions of plan 33-19, with the defaults taken: the CNPF sheet also marks a ring at 1 (kept 0, 2, 5, as in D-27); the source line names the Centre national de la propriété forestière in full and leaves out the acronyms CNPF and INRAE (kept; writing INRAE would wrap the line and move the typical survey to 6 pages).
2. To judge on paper and on the phone: the 8-unit labels, the five tints, the ring values that the polygon can cross (no halo).
3. Weight on Android: complete documents are 25.5 to 34.8 KB heavier than in 33-18 (Chrome +6.6 to +6.9 KB, iOS within 2 KB); the Android summary is 224.9 KB, over the 200 KB target (unchanged open item, 4.4 KB worse). The cause (Type 3 glyph subsets for the new 8-unit texts) was not isolated.
4. Not measured on a device: a real phone, the 30-parcel documents, the fullest-route v3.2 and the conditioned typical, the offline snapshot branch, phone-photo sources. The orchestrator's build for the physical iPhone follows.
5. Plan 33-15 must depend on 33-19 and 33-20 (the orchestrator updates its `depends_on`).

## Self-Check: PASSED

- FOUND: commits fa41924f and 1b768ed5.
- FOUND: the section "Device re-measure of plan 33-19" in `33-14-MEASUREMENTS.md`, `DV-33-12` to `DV-33-15` in `device-checks.md`, `STAND_BAND_CUT_OFFS` and `rose-svg.ts` in `CLAUDE.md`.
- `git status` clean apart from this SUMMARY before its commit; no harness file, no change to `mobile/index.js`.
