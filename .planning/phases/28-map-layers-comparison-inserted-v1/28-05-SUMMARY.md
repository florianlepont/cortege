---
phase: 28-map-layers-comparison-inserted-v1
plan: 05
subsystem: mobile-map
tags: [map, swipe, comparison, pure-modules, worklet, parcels]
requires: ["28-02"]
provides:
  - "mobile/src/map/layer-cycle.ts: BASEMAP_CYCLE, LayerAvailability, availableCycle, neighbourLayer, skippedCount, cycleIndex"
  - "mobile/src/map/parcels-visibility.ts: ParcelsMode, PARCELS_MODES, ParcelsRendering, parcelsRendering, hasIbpSurvey, isOldBase, parcelFillFactor, parcelCasingVisible"
  - "mobile/src/map/wipe-geometry.ts: SideKey, Bounds, Strip, LINE_MARGIN, EDGE_EXIT, TAG_GAP, TAG_MIN_WIDTH, sideOf, sideBounds, wipeStrip, revealedFraction, settledStrip, clampLine, edgeExitKeeps, linePercent, lineFromPercent, stepLinePercent, tagMaxWidth, tagVisible"
  - "mobile/src/map/swipe-machine.ts: thresholds, WipeGesture, MoveContext, LiveHint, ReleaseOutcome, ReleaseResult, beginGesture, moveGesture, liveHint, releaseGesture, compareSidesFor, tapAction, idleExitEnabled"
affects:
  - "28-07 and later UI plans (BasemapSwipeOverlay, WipeLayer, CurtainCompare, ParcelsControl, useBasemapSwipe)"
tech-stack:
  added: []
  patterns:
    - "gesture state is a plain object replaced on every move (shared-value friendly), functions carry the worklet directive"
    - "pure modules return keys and numbers, never text"
key-files:
  created:
    - mobile/src/map/layer-cycle.ts
    - mobile/src/map/layer-cycle.test.ts
    - mobile/src/map/parcels-visibility.ts
    - mobile/src/map/parcels-visibility.test.ts
    - mobile/src/map/wipe-geometry.ts
    - mobile/src/map/wipe-geometry.test.ts
    - mobile/src/map/swipe-machine.ts
    - mobile/src/map/swipe-machine.test.ts
  modified: []
decisions:
  - "SIDE_COMMIT is 0.33 (engine value), not one third; a release at exactly 0.33 cancels"
  - "liveHint: full-width wipe says nothing below the release-cancel point; a side wipe says change as soon as it started (UI-SPEC wording)"
  - "NaN positions are neutralised: clampLine centres, revealedFraction is 0, percent helpers clamp"
metrics:
  duration: "about 25 minutes"
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 05: Swipe, comparison and Parcelles pure modules Summary

Every rule of the basemap swipe mode, the comparison and the Parcelles control is now a pure, tested function in `mobile/src/map/`, with the sketch engine's numbers and 100 % statements and lines on all four modules, so the UI plans only render and wire.

## Tasks

| Task | Name | Commits |
|------|------|---------|
| 1 | Layer cycle and Parcelles visibility rules | 56b9ed85 (test, RED), 4e573aba (feat) |
| 2 | Wipe and curtain geometry | 154fb772 (test), 27f38061 (feat) |
| 3 | Swipe state machine and its thresholds | ff4cff79 (test), 438c4cd0 (feat) |

## Exported API (for the next plans)

### layer-cycle.ts
- `BASEMAP_CYCLE: readonly BaseLayerKey[]` (= `BASE_LAYER_KEYS`)
- `type LayerAvailability = (key: BaseLayerKey) => boolean`
- `availableCycle(isAvailable, exclude?): BaseLayerKey[]`
- `neighbourLayer(current, dir: 1 | -1, { isAvailable, exclude? }): BaseLayerKey | null` (worklet; wraps, skips; searched from the cycle position of `current` even if it is unavailable)
- `skippedCount(isAvailable): number`, `cycleIndex(key): number` (1 based)

### parcels-visibility.ts
- `type ParcelsMode = "all" | "withIbp" | "none"`, `PARCELS_MODES = ["all", "withIbp", "none"]`
- `parcelsRendering(mode): { cadastre: boolean; polygonFilter: FilterSpecification | null; tappable: boolean }`. The filters read two feature properties that the parcel features must carry: `hasSurvey` and `selected` (boolean). `withIbp` is `["any", ["==", ["get","hasSurvey"], true], ["==", ["get","selected"], true]]`, `none` is `["==", ["get","selected"], true]`. Neither property exists yet in `ParcelFeatureProperties` (`maplibre/parcel-features.ts`): the plan that wires the layers must add them.
- `hasIbpSurvey(item: Pick<PublicParcelStatusItem, "parcel_id" | "study_status">, surveyParcelIds: ReadonlySet<string>): boolean` (the set must hold trimmed, upper case ids, as `parcel-features.ts` compares them)
- `isOldBase(base)`, `parcelFillFactor(base, factor)` (factor on old bases, else 1), `parcelCasingVisible(base, forestOverlay)`

### wipe-geometry.ts (every function a worklet)
- Constants `LINE_MARGIN` 22, `EDGE_EXIT` 40, `TAG_GAP` 30, `TAG_MIN_WIDTH` 72
- `type SideKey = "full" | "left" | "right"`, `Bounds = readonly [number, number]`, `Strip = { left; right }`
- `sideOf(x, lineX)`, `sideBounds(side, lineX, width)`, `wipeStrip(bounds, dx, fingerX)`, `revealedFraction(bounds, dx, fingerX)`, `settledStrip(bounds, dx, "commit" | "cancel")`
- `clampLine(x, width)`, `edgeExitKeeps(x, width): "A" | "B" | null` (strictly under 40 pt: left keeps B, right keeps A)
- `linePercent(x, width)`, `lineFromPercent(percent, width)`, `stepLinePercent(percent, delta)`
- `tagMaxWidth("left" | "right", lineX, width)`, `tagVisible(maxWidth)`

### swipe-machine.ts (every function a worklet)
- Constants `SWIPE_SLOP` 6, `COMPARE_MIN` 0.2, `COMPARE_MAX` 0.8, `SIDE_COMMIT` 0.33, `IDLE_MS` 8000, `HINT_MS` 3000, `SETTLE_MS` 240, plus re-exported `EDGE_EXIT` and `LINE_MARGIN`
- `WipeGesture = { side, x0, y0, started, blocked, dx, dy, fingerX, incoming, rev }`
- `beginGesture({ x, y, lineX: number | null })`
- `moveGesture(gesture, { x, y }, { width, lineX, layerOf(side), otherOf(side), isAvailable })`
- `liveHint(gesture, comparisonAllowed): "compare" | "change" | "none-available" | null`
- `releaseGesture(gesture, comparisonAllowed): { outcome: "tap" | "none" | "cancel" | "compare" | "commit"; incoming; side; releaseX }`. `releaseX` is the raw finger x; a compare release is already inside [0.2 w, 0.8 w], the UI still runs `clampLine` on a very narrow map.
- `compareSidesFor(dx, shown, incoming): { sideA, sideB, secondSide }`
- `tapAction(comparing): "exit-swipe" | "nothing"`, `idleExitEnabled(screenReaderOn)`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] NaN positions**
- **Found during:** Task 2 (threat T-28-11)
- **Issue:** a NaN finger position would poison every clip and layout number.
- **Fix:** `clampTo` falls back to the range start, `clampLine` centres the line, `revealedFraction` returns 0; tested.
- **Files modified:** `mobile/src/map/wipe-geometry.ts`

**2. [Rule 3 - Blocking] `neighbourLayer` carries the worklet directive**
- **Found during:** Task 3
- **Issue:** `moveGesture` (a worklet) calls `neighbourLayer`; a non-worklet function cannot be called from the UI thread.
- **Fix:** added `"worklet"` to `neighbourLayer` in `layer-cycle.ts` (committed with the swipe machine).

None otherwise: the plan was executed as written. `liveHint` for a full-width wipe with the comparison not built uses the release rule (null at or below 0.33, "change" above), consistent with the plan's cases.

## Verification

- `npx jest -c jest.unit.config.js src/map --coverage=false`: 20 suites, 214 tests pass.
- Per-file coverage run (statements, branches, functions, lines all 100 %) on `layer-cycle.ts`, `parcels-visibility.ts`, `wipe-geometry.ts`, `swipe-machine.ts`.
- ESLint (mobile) on the new files, `tsc --noEmit` (mobile) and the root `npm run typecheck`: clean. Prettier clean on the eight files.
- `npm run format:check` reports one warning in `.claude/settings.local.json`, a file not touched here (pre-existing, out of scope).

## Known Stubs

None.

## Threat Flags

None. T-28-11 (NaN / unbounded positions) and T-28-12 (idle exit off with a screen reader) are mitigated and tested.

## Self-Check: PASSED

All eight files exist and commits 56b9ed85, 4e573aba, 154fb772, 27f38061, ff4cff79, 438c4cd0 are in `git log`.
