---
phase: 28-map-layers-comparison-inserted-v1
plan: 14
subsystem: mobile-map
tags: [map, wipe, comparison, curtain, accessibility, reanimated, gesture-handler]
requires: ["28-01", "28-02", "28-05", "28-09", "28-11"]
provides:
  - "mobile/src/screens/public-map/MapStack.tsx: onStyleLoaded, onStyleFailed props and a ground colour until the first style load"
  - "mobile/src/screens/public-map/WipeLayer.tsx: WipeLayer, WipeLayerProps, WipeLayerStyle"
  - "mobile/src/screens/public-map/useCurtainClip.ts: useCurtainClip, CurtainPhase, CurtainClip, UseCurtainClipOptions"
  - "mobile/src/screens/public-map/CurtainHandle.tsx: CurtainHandle, CurtainHandleProps, CurtainSideAction, knobCenterY, HANDLE_WIDTH, KNOB_SIZE, KNOB_HEIGHT_RATIO, LINE_STEP_PERCENT"
  - "mobile/src/screens/public-map/CurtainSideTags.tsx: CurtainSideTags, CurtainSideTagsProps, TAG_HEIGHT"
  - "brandMapTokens.lightBasemapBackground"
affects:
  - "28-17 (Explorer wiring), 28-18 (device checks)"
tech-stack:
  added: []
  patterns:
    - "one stacked map element (stable key) serves the wipe and the curtain"
    - "the pan writes the clamped line position straight to a shared value on the UI thread; JS only hears about the release"
key-files:
  created:
    - mobile/src/screens/public-map/WipeLayer.tsx
    - mobile/src/screens/public-map/WipeLayer.test.tsx
    - mobile/src/screens/public-map/useCurtainClip.ts
    - mobile/src/screens/public-map/CurtainHandle.tsx
    - mobile/src/screens/public-map/CurtainHandle.test.tsx
    - mobile/src/screens/public-map/CurtainSideTags.tsx
  modified:
    - mobile/src/screens/public-map/MapStack.tsx
    - mobile/src/screens/public-map/MapStack.test.tsx
    - mobile/src/screens/public-map/useSwipeSpike.test.tsx
    - mobile/src/app/brand-tokens.ts
decisions:
  - "Branch built: COMPARISON_BUILT true, WIPE_PRESENTATION wipe, SIDE_WIPE wipe, LEFT_MAP_ANDROID_VIEW texture (28-01 provisional go): Task 1 and Task 2 both built in full"
  - "The light map ground is a new token brandMapTokens.lightBasemapBackground (#EDEAE2); the dark one is the existing darkBasemapBackground; MapStack picks by scheme"
  - "knobTop of CurtainSideTags is the y of the knob's CENTRE (the sketch's kt), from knobCenterY(height)"
metrics:
  duration: "about 45 minutes"
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 14: Stacked map, curtain clip, handle and side tags Summary

The map side of the swipe mode and the comparison is built per the 28-01 spike outcome (wipe, comparison, side wipe all on, texture-left): `WipeLayer` draws any base as a clipped stacked map with the shared content, `useCurtainClip` follows the line and slides it out, `CurtainHandle` is the draggable, accessible line with its glass knob and edge exit, and `CurtainSideTags` names both sides. Wiring into the Explorer is 28-17.

## Branch built

`map-stack-mode.ts` (28-01): `WIPE_PRESENTATION = "wipe"`, `COMPARISON_BUILT = true`, `SIDE_WIPE = "wipe"`, `LEFT_MAP_ANDROID_VIEW = "texture"`. So both tasks are built in full; nothing was skipped.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Stacked layer map with shared content and load events | `61e0e115` |
| 2 | Curtain clip, accessible handle and side tags | `4aed250c` |

## Exported API (for 28-17 and later)

### MapStack.tsx (additions)
- `MapStackProps.onStyleLoaded?: () => void`, `onStyleFailed?: () => void` (wired to `onDidFinishLoadingStyle` and `onDidFailLoadingMap`).
- Until the first style load the clip wrapper has `backgroundColor` = `brandMapTokens.darkBasemapBackground` (dark scheme) or `brandMapTokens.lightBasemapBackground` (light). It is removed at the first `onDidFinishLoadingStyle` and does not come back (a failed load keeps it).

### WipeLayer.tsx
- `WipeLayer({ layer: BaseLayerKey, clipLeft, clipRight, width, initialRegion, cameraRef, content, styleRefreshKey = 0, styleRetryKey = 0, onStyleLoaded?, onStyleFailed? })`
- `content: (style: WipeLayerStyle) => ReactNode` with `WipeLayerStyle = { cadastreInStyle, cadastreOpacity }` (from `useMapStyle(layer, styleRefreshKey, styleRetryKey)`): the screen returns `<MapContentLayers base={layer} ... interactive={false} />`.
- Render it as one element with a stable `key` ("second-map") at a stable tree position, for the wipe and the curtain alike. A change of `layer` swaps the style of the same `MapLibreMap` instance (tested). The third map (side wipe) is a second `WipeLayer`, mounted only when `SIDE_WIPE === "wipe"`.

### useCurtainClip.ts
- `useCurtainClip({ compare: Pick<CompareState, "secondSide" | "x"> | null, width, phase = "active", leaveTo = "right", onLeft? }): { lineX, clipLeft, clipRight }` (all `SharedValue<number>`).
- `CurtainPhase = "active" | "leaving" | "covering"`.
- `active`: `lineX` = `clampLine(compare.x, width)` (re-synced when `compare.x` changes); `clipLeft/clipRight` = `[lineX, width]` for `secondSide: "right"`, `[0, lineX]` for `"left"`.
- `leaving`: `lineX` slides to the `leaveTo` edge (`width` for "right", 0 for "left") with `withTiming` (`SETTLE_MS` 240 ms, `ReduceMotion.System`, standard easing), then `onLeft` fires exactly once per departure (immediately and synchronously under Reduce Motion; an interrupted slide never fires it; the animation is cancelled on cleanup).
- `covering`: clip `[0, width]` for either side.
- `compare: null`: `lineX = width`, clip `[width, width]` (nothing of the second map).
- Pass `{ clipLeft, clipRight }` to the second `WipeLayer`, and `lineX` to `CurtainHandle` and `CurtainSideTags`.

### CurtainHandle.tsx
- `CurtainHandle({ lineX, width, height, lineTop = 0, leftName, rightName, onMoveLine(x), onEdgeExit("A" | "B"), onSideAction("left" | "right", 1 | -1), onQuit() })`, `testID="curtain-handle"`.
- Drag: `onBegin` stores the start, `onUpdate` writes `clampLine(start + translationX, width)` to `lineX` on the UI thread; `onEnd` runs `edgeExitKeeps` then `onEdgeExit(keeps)` (x < 40 keeps "B", x > width - 40 keeps "A") or `onMoveLine(x)` through `runOnJS`, and refreshes the JS percent. No haptic is played (the screen plays the selection haptic of the edge exit, 28-17).
- Accessibility: `accessibilityRole="adjustable"`, label "Séparation de la comparaison", the hint, value text `handleA11yValue({ left, right, percent })`; `increment`/`decrement` move the line by `LINE_STEP_PERCENT` (10) of the width (clamped to 22 pt from the edges, also written to `lineX` and reported by `onMoveLine`); actions `leftNext`, `leftPrevious`, `rightNext`, `rightPrevious` ("Fond suivant/précédent à gauche/droite") call `onSideAction`; `quit` ("Quitter la comparaison") calls `onQuit`.
- Look: 44 pt strip over the full height (from `lineTop`), 4 pt line (`visual.curtain.edge` 1 pt, `visual.curtain.line` 2 pt, `edge` 1 pt), 44 pt glass knob (`mapControl.glass`, 1 pt `mapControl.hairline`) with `swap-horizontal-outline` 22 at `knobCenterY(height)`.
- Helpers/constants: `knobCenterY(height) = Math.round(height * 0.32)`, `HANDLE_WIDTH` 44, `KNOB_SIZE` 44, `KNOB_HEIGHT_RATIO` 0.32, `LINE_STEP_PERCENT` 10, `CurtainSideAction`.

### CurtainSideTags.tsx
- `CurtainSideTags({ lineX, width, knobTop, leftName, rightName, swipeMode, leftUnavailable, rightUnavailable })`, `testID`s `curtain-tag-left` and `curtain-tag-right`. `knobTop` is the y of the knob's CENTRE (`knobCenterY(height)`), as the sketch's `kt`; the tags are centred on it.
- 32 pt (`TAG_HEIGHT`) glass pills 30 pt from the line (`TAG_GAP`), `brandTypography.meta` (12 SemiBold) in `mapControl.text`, one line; chevrons (`chevron-back-outline`, `chevron-forward-outline`, 14, half opacity) round the name while `swipeMode`; `cloud-offline-outline` before the name of an unavailable side; `maxWidth` from `tagMaxWidth`, opacity 0 under 72 pt via `withTiming` 160 ms `ReduceMotion.System`; follow `lineX` on the UI thread; `pointerEvents="none"` and hidden from accessibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Edge-exit example of the plan is inconsistent with the geometry**
- **Found during:** Task 2 tests
- **Issue:** the behaviour list says `onEnd` at 378 on width 400 calls `onMoveLine(378)`, but 378 is within 40 pt of the right edge, so `edgeExitKeeps(378, 400)` is "A" (UI-SPEC section 4: the line is clamped at 22 pt, so a release between 22 and 40 pt of the edge is an edge exit).
- **Fix:** followed the geometry and the UI-SPEC. The test checks the clamp at 378 on `onUpdate`, a release at 300 reports `onMoveLine(300)`, and releases at 30 and 375 call `onEdgeExit("B")` and `onEdgeExit("A")`.
- **Files modified:** `mobile/src/screens/public-map/CurtainHandle.test.tsx`

**2. [Rule 3 - Blocking] Spike test broke on the ground colour**
- **Found during:** Task 1
- **Issue:** `useSwipeSpike.test.tsx` collects every `backgroundColor` of the stacked tree and now saw the new ground colour.
- **Fix:** the test ignores the ground colour (28-17 deletes this scaffolding anyway).
- **Files modified:** `mobile/src/screens/public-map/useSwipeSpike.test.tsx`
- **Commit:** `61e0e115`

**3. [Rule 2 - Missing functionality] Light ground token**
- **Issue:** the plan asks for "the light map ground otherwise" but no such token existed, and hex literals are allowed only in the token files.
- **Fix:** added `brandMapTokens.lightBasemapBackground` (`#EDEAE2`, a pale neutral) in `app/brand-tokens.ts`. It is a value to tune on the device (DL checks).
- **Commit:** `61e0e115`

Additions beyond the plan, small: `lineTop` prop of `CurtainHandle` (line and strip start under the top safe area, the knob stays at 32 % of the window), `compare: null` support in `useCurtainClip`, `covering` also for `secondSide: "left"`.

## Verification

- `npx jest -c jest.unit.config.js src/screens/public-map src/__checks__ --coverage=false`: 41 suites, 535 tests pass (run when the tree held 28-13's committed files; an earlier run showed `structure.test.ts` failing on 28-13's in-progress `useBasemapSwipe.ts` at 403 lines, not mine, fixed by the time of the last run).
- Coverage (per-file run): `MapStack.tsx`, `WipeLayer.tsx`, `useCurtainClip.ts`, `CurtainHandle.tsx`, `CurtainSideTags.tsx` all at 100 % statements, branches, functions, lines.
- `npm run lint` and `npm run typecheck`: clean. `npm run format:check`: one warning on `.claude/settings.local.json`, a file not touched here (pre-existing).
- Acceptance greps: `accessibilityRole="adjustable"` and `edgeExitKeeps(` present in `CurtainHandle.tsx`; no hex or `rgba(` literal in `CurtainHandle.tsx` or `CurtainSideTags.tsx`; `onDidFinishLoadingStyle` in `MapStack.tsx`; `useMapStyle(layer` in `WipeLayer.tsx`.

## Known Stubs

None. Nothing here is wired to the screen yet (28-17); the components are exercised only by their tests, so the Reanimated worklets (`useDerivedValue`, `useAnimatedStyle`, gesture callbacks) run on a real UI thread for the first time in 28-17 and in the device checks (28-18). The test mock evaluates them once at render.

## Threat Flags

None. T-28-35 (map count) is mitigated by design: one `WipeLayer` instance serves the wipe and the curtain, the third is mounted only for a side wipe, and no map is duplicated for an already drawn layer. T-28-36 (which side shows which layer) is mitigated by the tags and the handle's value naming both sides.

## Self-Check: PASSED

All files exist and commits `61e0e115` and `4aed250c` are in `git log`.
