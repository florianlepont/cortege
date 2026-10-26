---
phase: 32-detailed-dmh-information-inserted-v1
plan: 04
subsystem: mobile-ui
tags: [svg, drawings, react-native-svg, generated-module, source-gate]
requires: []
provides:
  - DmhDrawing primitive and drawingFor(code) data for plan 32-12 (DmhGroupPage)
  - build-dmh-drawings.mjs converter (re-run after any source correction in 32-09)
affects: [32-09, 32-12]
tech-stack:
  added: []
  patterns: [generated typed data module checked by a fixture-proven source gate]
key-files:
  created:
    - mobile/scripts/build-dmh-drawings.mjs
    - mobile/src/app/dmh-guide/drawings.ts
    - mobile/src/__checks__/dmh-drawings.test.ts
    - mobile/src/ui/DmhDrawing.tsx
    - mobile/src/ui/DmhDrawing.test.tsx
  modified:
    - mobile/src/app/visual-tokens.test.ts
decisions:
  - "Drawings are static vector element data (path, ellipse with rotate, circle) rendered directly by react-native-svg in colors.textPrimary; no animation, no tile, no token"
requirements-completed: [REQ-C-dmh-illustrations]
status: complete
duration: ~25 min
completed: 2026-10-26
---

# Phase 32 Plan 04: Static DMH drawings Summary

The 15 SVG drawings of the association ship as a generated, gated element-data module, shown by a static `DmhDrawing` primitive in the theme's text ink.

## Tasks

| Task | Commit | Result |
|------|--------|--------|
| 1. Converter, generated module, drawings gate | 97af22b7 | converter, drawings.ts (15 entries), 19-test gate |
| 2. DmhDrawing and ink contrast | 31c6bc2e | component, 7 tests, contrast assertion in both schemes |

## How the converter was run

```
node mobile/scripts/build-dmh-drawings.mjs .planning/phases/32-detailed-dmh-information-inserted-v1/drawings
npx prettier --write mobile/src/app/dmh-guide/drawings.ts
```

It checks the approved style per source (viewBox 800x600, one frame rect, one group with fill none / stroke / width 6 / round caps and joins, only path, ellipse, circle; own stroke-width 4 to 12; path-data rule; positive radii; rotate(angle cx cy) only on ellipses; no text, image, use, href, style, script), reports "style: ", "missing: ", "duplicate: " or "budget: " lines and writes nothing on any breach. Reproducible: a second run plus Prettier leaves `git diff` on drawings.ts empty.

## Drawings (elements, data bytes)

| Group | Elements | Bytes |
|-------|----------|-------|
| dmh_01 | 26 | 1470 |
| dmh_02 | 146 | 7086 |
| dmh_03 | 28 | 1986 |
| dmh_04 | 20 | 1383 |
| dmh_05 | 12 | 1060 |
| dmh_06 | 12 | 915 |
| dmh_07 | 22 | 1418 |
| dmh_08 | 53 | 3429 |
| dmh_09 | 16 | 1299 |
| dmh_10 | 22 | 2163 |
| dmh_11 | 16 | 1110 |
| dmh_12 | 66 | 5144 |
| dmh_13 | 12 | 876 |
| dmh_14 | 40 | 2292 |
| dmh_15 | 71 | 4423 |

Module size: 44,004 bytes (budget 120 KiB); largest drawing 7,086 bytes (budget 12 KiB).

## Ink contrast (colors.textPrimary on glass.cardFill over canvas)

Light 12.50:1, dark 16.41:1 (threshold 4.5:1, asserted in visual-tokens.test.ts for both schemes).

## Verification

- Pilot folder: converter reports the 12 missing codes, no style line; pilot with colour fill: "style: ... the group must set fill=none"; drawings.ts unchanged by both runs.
- `npm --workspace mobile run test:unit -- src/__checks__ src/app src/ui`: 129 suites, 2105 tests pass.
- `npm --workspace mobile run typecheck` and `npm --workspace mobile run lint`: clean.
- `npx prettier --check` on the six plan files: clean.
- Acceptance greps: no reanimated/timing/effect/state in DmhDrawing (0), no colour literal (0), Ellipse and Circle present, no `require(`/`uri:`/`https?:` in the module (0), `mobile/assets/dmh` absent.

## Deviations from Plan

None. Plan executed as written (the gate has 19 tests, above the 9 required).

## Known Stubs

None. The alt sentences (catalogue, 32-10) and the "every drawing has an alt sentence" check (32-12) are other plans' scope.

## Self-Check: PASSED

Files exist, commits 97af22b7 and 31c6bc2e present, full verification green.
