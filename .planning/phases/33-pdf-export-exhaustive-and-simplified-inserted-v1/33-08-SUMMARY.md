---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 08
subsystem: mobile-pdf-export
tags: [pdf, map, photos, export-settings]
requires: ["33-02", "33-03"]
provides:
  - "buildMapFigure, MapFigure, mapFigureCss, MAP_FRAME_RADIUS (shared parcel figure)"
  - "MAP_FRAME_SIZE 515 x 250, PHOTO_EXPORT_SETTINGS trial 640 px at 0.6"
  - "PHOTO_FRAME_RADIUS 8"
affects: ["33-11", "33-13", "33-14"]
tech-stack:
  added: []
  patterns: ["figure extracted from a section so a second document reuses it at its own frame"]
key-files:
  created:
    - mobile/src/app/survey-pdf/map-figure.ts
    - mobile/src/app/survey-pdf/map-figure.test.ts
  modified:
    - mobile/src/app/survey-pdf/map-section.ts
    - mobile/src/app/survey-pdf/map-section.test.ts
    - mobile/src/app/survey-pdf/photos-section.ts
    - mobile/src/app/survey-pdf/photos-section.test.ts
    - mobile/src/app/survey-pdf/export-settings.ts
    - mobile/src/app/survey-pdf/export-settings.test.ts
decisions:
  - "The overlay border rect uses rx 11.5 (radius 12 minus the half pixel inset of its 1 px stroke) so its outer edge follows the CSS clip of radius 12"
  - "mapFigureCss takes the palette for API symmetry with the other section CSS builders but needs none (parameter named _palette)"
metrics:
  tasks: 2
  completed: 2026-10-24
status: complete
---

# Phase 33 Plan 08: Shared parcel figure, 250 map frame, trial photo encoding Summary

The parcel map is now one shared builder (`buildMapFigure`) used by the complete map section, with a 515 x 250 frame, radius 12 corners and the accent section title; photos keep the cap of 24 and 6 per page with a trial lighter encoding (640 px, JPEG 0.6), a radius 8 frame and the same title, and the dead 0.9 fill constant is gone.

## What was built

- `map-figure.ts` (new, pure): `buildMapFigure(map, palette)` returns `{ kind: "noGeometry" }` or `{ kind: "figure", html, frame, hasBasemap }`. The html is one `div.map-frame` (image plus SVG overlay with parcels, border, scale bar, north arrow), drawn exactly as the map section drew it, except the corner radius. The base64 JPEG check runs before the basemap is inlined; a non-JPEG basemap falls back to the outline on the pale canvas (fitted at `map.frameSize`, padding 0.1, zoom capped at 19). Also exports `mapFigureCss` and `MAP_FRAME_RADIUS = 12`. Imports only from `map-projection.ts`, which is untouched.
- `map-section.ts` rewritten on top of the figure: same parcels line, source line, outline note, no-outline note, no-parcel note and the same height formula (24 + frame height + text lines + 10, `breakBefore` true). `mapSectionCss` starts with `mapFigureCss` and the heading rule is `sectionTitleCss(".map-heading", palette)`.
- `export-settings.ts`: `MAP_FRAME_SIZE` 515 x 250 (D-12), `PHOTO_EXPORT_SETTINGS` `{ cap: 24, longEdgePx: 640, jpegQuality: 0.6 }` (D-17 trial, comments rewritten), `PDF_PAGE_FILL_FACTOR` and its test removed (`paginate.ts` keeps the only live fill factor, research Pitfall 10).
- `photos-section.ts`: heading rule from `sectionTitleCss(".photos-heading", palette)`, new `PHOTO_FRAME_RADIUS = 8` with `overflow: hidden` on `.photos-frame`; cell 255 x 200 and 6 per page unchanged.
- Tests: figure-level tests moved to `map-figure.test.ts` (515 x 250 and 515 x 228 cases, radius, non-JPEG and `http:` fallbacks for T-33-18); `map-section.test.ts` keeps the block-level ones at 515 x 250 plus a height-formula pin; export-settings and photos CSS pins updated.

## Commits

- b90c0df9 feat(33-08): shared parcel figure and map section built on it
- c00a6d30 feat(33-08): 250 map frame, trial photo encoding, photo heading and radius

## Verification

- `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/__checks__ --coverage=false`: 34 suites, 771 tests pass (includes the unchanged `build-html.test.ts`, so no pinned count moved)
- `npx tsc --noEmit -p .` (mobile), `npm run lint`, `npm run typecheck`: exit 0
- `npm run format:check`: only the pre-existing untracked `.claude/settings.local.json` is reported (unrelated, not touched)
- `git diff --quiet -- mobile/src/app/survey-pdf/map-projection.ts` exits 0; `PDF_PAGE_FILL_FACTOR` no longer appears under `mobile/src`

## Looked at with the render harness (Chrome, layout check only)

The `typical` case rendered with a 515 x 250 frame (harness data only, nothing committed): the map and "Evolution de la parcelle" now share page 4 (the trend with its per-factor table fits below the map, with free space left), the map frame has visibly rounded corners with the overlay, scale bar ("100 m") and north arrow inside the clip, and the heading shows the accent bar title. Page 5 shows the photo pages with the new accent title and rounded photo frames (radius 8). The rounded clip of a JPEG works in Chromium; the phone engines are for plan 33-14 (probe P-4).

## Deviations from Plan

None - plan executed as written. One small judgment call: the border `rx` is 11.5 rather than 12 (see decisions).

## Notes for the next plans

- 33-11 (summary): call `buildMapFigure(data.map, palette)` and build its own caption/notes around `figure.html`; the frame size comes from the data (`SUMMARY_MAP_FRAME_SIZE` 515 x 228 in the loader). Add `mapFigureCss(palette)` to the summary CSS (or reuse `mapSectionCss`, which already includes it); do not define `.map-frame` twice.
- 33-13: `build-html.test.ts` and the worst-case fixture still carry the literal 515 x 340 frame; re-pin page counts there. The loader reads `MAP_FRAME_SIZE` (now 250), so real exports change, the fixture does not.
- 33-14 must measure on devices: overlay alignment at 250, the 640 px / 0.6 photo encoding (size and sharpness) and the rounded clip (probe P-4: set `MAP_FRAME_RADIUS` and `PHOTO_FRAME_RADIUS` to 0 if it fails).

## Known Stubs

None.

## Threat Flags

None. T-33-18 mitigated (the JPEG data URI check moved with the figure and runs before inlining; tests feed `http:`, `file:`, a quote-injection and a PNG URI and expect the outline fallback).

## Self-Check: PASSED

- Files created: `map-figure.ts`, `map-figure.test.ts` found; commits b90c0df9 and c00a6d30 present in `git log`.
