---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 01
subsystem: pdf-export
tags: [pdf, harness, chromium, probe, baseline]
requires: []
provides:
  - "Reusable local PDF render harness recipe (33-RENDER-HARNESS.md)"
  - "Baseline page counts and sizes of the five UI-SPEC B.11 scenarios"
  - "Chromium results for the design probe P-1 to P-5 and the device probe brief for 33-14"
affects: [33-02, 33-14]
tech-stack:
  added: []
  patterns: ["throwaway jest harness outside the repo (roots in the scratchpad) + Chrome headless print + poppler"]
key-files:
  created:
    - .planning/phases/33-pdf-export-exhaustive-and-simplified-inserted-v1/33-RENDER-HARNESS.md
  modified: []
key-decisions:
  - "Baseline uses real JPEGs (24 photos at 800 px, JPEG 65; basemap 1030 x 680) and the logo resized to 240 px, like the app, so the sizes are realistic"
  - "Gradient-only enhancements (forestEnd, bandXTop) stay unbuilt whatever the device result is: the solid contract is the deliverable"
requirements-completed: [REQ-C-pdf-modern-layout, REQ-C-pdf-lean-export]
duration: 35min
completed: 2026-10-24
status: complete
---

# Phase 33 Plan 01: Local render harness, baseline and Chromium design probe Summary

A written, reproducible harness (jest outside the repo, real builders, real fonts, Chrome headless print, poppler) renders today's PDF in about a minute, with today's baseline measured and the five risky print effects P-1 to P-5 shown to pass on Chromium; no file under `mobile/`, `api/`, `packages/` or `docs/` was touched.

## What was built

- `33-RENDER-HARNESS.md` (the only kept artifact): setup commands (JPEG preparation with `sips`), the full text of `jest.harness.config.js` (env `WORKTREE`, `HARNESS_DIR`), `render.harness.test.ts` (five cases, `mode: "complete"` added through a cast so the file works before and after plan 33-02), `probe.harness.test.ts`, the run and measurement commands, the baseline table, the probe table and the device probe brief for plan 33-14.
- The harness files, HTML, PDFs and PNGs live in the session scratchpad (`.../scratchpad/pdf-harness/`) and are not committed.

## Baseline (Chrome print, builders of phase 30, no `mode`)

| Case | Builder pages | Chrome pages | PDF KB | Fonts |
|---|---:|---:|---:|---:|
| v32 | 4 | 4 | 145.5 | 6 |
| v30-draft | 4 | 4 | 145.8 | 6 |
| typical | 6 | 6 | 532.0 | 6 |
| typical-conditioned | 7 | 7 | 542.7 | 6 |
| worst | 10 | 10 | 1410.3 | 6 |

Identical to the research page counts (4, 4, 6, 7, 10). Photos are the bulk: 24 photos about 1.1 MB of the 1.41 MB. The logo is one shared image object across pages in Chrome.

## Chromium probe

All five effects pass and stay vector (the only raster object is the P-4 JPEG, kept as `jpeg`): P-1 gradients (+3.9 KB), P-2 ring with `rotate(-90)` and as a path arc, same arc (+5.9 KB), P-3 contour art with `xMaxYMax slice` (+3.0 KB), P-4 rounded clip of a JPEG (+3.8 KB beyond the JPEG), P-5 letter-spacing -3 on Sora-Light 64 (applied, 4 bytes, the growth is the font subsets). Fallbacks are recorded per item; they change no layout. WebKit and Skia are not tested here: plan 33-14 does it with the brief.

## Deviations from Plan

None in scope. Two harness adjustments made while running (no repository effect):
- The first baseline used the raw 2481 px logo (about 170 KB more per case); the harness now resizes it to 240 px like `LOGO_EXPORT_WIDTH_PX`. The recipe says so.
- The first probe page printed at 0.75 scale (no root zoom); the probe now mirrors the builders' shell (`@page` in pt, root `zoom: 1.33333`) so one design unit is one point.

## Notes for the next plans

- Run the harness after any builder change: `cd mobile && npx jest -c $HARNESS_DIR/jest.harness.config.js` (needs `WORKTREE`, `HARNESS_DIR`, `HARNESS_OUT`), then the Chrome print loop of the markdown. Recreate the folder from the markdown if the scratchpad is gone (the JPEG preparation commands are in the Setup block).
- After 33-02 adds the required `mode` field the harness still compiles (the cast); if later plans add other required fields, adjust `withMode` in the markdown copy.
- The harness uses `diagnostics: false` and `isolatedModules`, so it does not type check; the repository gates remain `npm run typecheck` and the unit tests.
- Not verified: anything on the iOS or Android print engines (plan 33-14).

## Commits

- bcf01c4d docs(33-01): local PDF render harness recipe and baseline page counts
- e77f6bd8 docs(33-01): Chromium design probe P-1 to P-5 and device probe brief for 33-14

## Self-Check: PASSED

- 33-RENDER-HARNESS.md exists with the headings "Baseline (before phase 33)", "Design probe (Chromium)", "Device probe brief for plan 33-14"
- `git status --porcelain mobile api packages docs` is empty; no `*harness*` untracked file in the repo
- Both commits are in `git log`; STATE.md, ROADMAP.md and REQUIREMENTS.md untouched
