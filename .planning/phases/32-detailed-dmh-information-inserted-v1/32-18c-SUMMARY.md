---
phase: 32
plan: 18c
status: complete
---

# Phase 32 Plan 18c: Drawing plate and side-by-side tools on Accueil Summary

The dendromicrohabitat drawing now sits on a moss plate in the brand ink with heavier strokes (brief B-C3, owner decision B-I5 option 2), and the photo tool and the guide are two half-width tiles on one line on Accueil.

## What changed

### Drawing (`mobile/src/ui/DmhDrawing.tsx`)

- Plate: the wrapper (still `accessibilityRole="image"`, the caller's label, `testID="dmh-drawing"`) has radius `brandRadius.card` (22), fill `visual.glass.iconTile`, padding 16. The drawing inside keeps the 4:3 frame, now at most 200 pt tall (was 240), in its own inner `View`.
- Ink: `semanticColors.ctaPrimary` (was `colors.textPrimary`).
- Width: `DMH_DRAWING_RENDER_SCALE = 1.5` (exported) multiplies each stroke width at render. The data module and `DMH_DRAWING_STROKE_RANGE` are untouched; `dmh-drawings.test.ts` still passes.
- Props unchanged, so `DmhGroupPage` works as it is (it still renders the drawing inside its "Comment le reconnaître" block; the hero placement belongs to the later task).
- `DmhDrawing.test.tsx` updated (plate style, 4:3 and 200 frame, ink, scaled widths). New `DmhDrawing.contrast.test.ts` (did not touch `app/visual-tokens.test.ts`): ctaPrimary on the plate, over the canvas and over the glass card, light and dark, at least 3:1. Measured: light 7.0 (canvas) and 7.3 (card); dark 7.7 and 6.8.

### Accueil tools (`screens/home/ToolsSection.tsx`, `layout-budget.ts`)

- Two half-width tiles (`flex: 1`, one row, 8 pt apart), photo on the left, guide on the right. Same glass look. Icon tile (40 pt) on top, then the title (one line, `adjustsFontSizeToFit` down to 0.85) and the body (up to two lines). No chevron. `book-outline` for the guide. All testIDs (`tool-identify-tree`, `tool-dmh-guide`), the accessibility labels and the `surveyDmhGuide` navigation are unchanged.
- Strings: identify body "Le genre, sur photo."; guide title "Dendromicrohabitats", body "Le guide, sans réseau." (the full name stays in the accessibility label). No em dash.
- `layout-budget.ts`: `TOOL_ROW_*` replaced by `TOOL_TILE_*`; a tile is 12 + 40 + 8 + 20 + 16 + 12 = 108 pt; `toolsSectionHeight` counts one tile.

## Map peek on Accueil (draft, 3 recent surveys, no alert)

| Case | Original (one 56 pt row) | With guide row (17b) | Now (tile line) |
|------|--------------------------|----------------------|-----------------|
| `sectionTop` | 526 | 590 | 578 |
| 393 x 852: section / map | 133 / 107 | 69 / 43 | 81 / 55 |
| 375 x 812: section / map | 102 / 76 | 38 / 12 | 50 / 24 |
| Two-line title, 393 x 852 | 105 | 41 | 53 (map 27) |
| Two-line title, 375 x 812 | 74 | 10 | 22 (map 0) |

The peek does NOT return to its original value: the side-by-side layout wins back only 12 pt of the 64 the guide row cost, because a tile with the icon on top is 108 pt, 52 pt taller than the original single 56 pt row. The 96 pt target of the 12.2-14 budget is still unmet at launch with a draft. `layout-budget.test.ts` carries the new measured numbers.

## Deviations

- The 108 pt tile height is a consequence of "icon tile on top, title and one short line below"; it was not possible to match the pre-guide peek with that structure. If the owner wants more map, options are a smaller icon tile (32 pt saves 8 pt), a title-only tile, or "Outils" below "Autour de vous". Not done here.
- Guide title shortened to "Dendromicrohabitats" so it can fit one line in a half tile.

## Verification

- Jest (`src/ui`, `src/screens/home`, `src/screens/HomeScreen*`, `src/navigation`, `src/__checks__`): all green except `src/ui/AppGroupedList.test.tsx` ("a row without subtitle has no wrapper around its label"), a file R1a has modified in the same tree and which I did not touch.
- `tsc --noEmit` (mobile) clean; eslint and prettier clean on my files.

## Not verified on a device

I could not run the app. The owner should check on the iPhone and an Android phone:

- Plate: the drawing reads on the moss plate in light and dark, the heavier strokes look right (2 to 3.5 pt), the drawing is not cut at 200 pt, the plate corners match the card radius.
- Tiles: "Identifier un arbre" and "Dendromicrohabitats" fit on one line at the default text size and at a larger one (the title shrinks to 85 percent before it would cut); the bodies fit on one line; both tiles have the same height; the press scale and haptics feel the same as before.
- How much of the "Autour de vous" map shows at launch (expected 81 pt of the section on a 393 x 852 phone with a draft).

## Self-Check: PASSED

Commits: 1c9515e5 (drawing), b5c69d61 (tiles).
