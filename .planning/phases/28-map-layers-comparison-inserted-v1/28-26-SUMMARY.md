---
phase: 28-map-layers-comparison-inserted-v1
plan: 26
subsystem: mobile-map
tags: [map, immersive, swipe-mode, wiring, reanimated, item-13c]
requires: ["28-24", "28-25"]
provides:
  - "useBasemapSwipe: inputs windowProgress (SharedValue) and windowApplied; every pan x goes through windowX with the scale shown at that frame"
  - "useExplorerSwipe: output immersive { window, buttons, applied, buttonsHidden } (type ExplorerImmersive)"
  - "ExplorerSwipeLayers: children (the Explorer map) rendered with the stacked maps, line, grabber and tags inside ImmersiveWindow; surface, top stack and quit pill outside"
  - "ExplorerPanelsView: prop buttons { opacity, hidden }; download button, children and chip inside ImmersiveButtons"
  - "BasemapSwipeOverlay: the whole stack is one root that fades in 160 ms after 80 ms and out 160 ms"
affects:
  - "28-18 (device checks: alignment of the finger and the wipe on the receded window, DL-02, blur under a faded group)"
status: complete
tech-stack:
  added: []
  patterns:
    - "touches mapped onto a scaled container with one function (windowX) at the controller, so the wipe maths never knows about the scale"
key-files:
  created: []
  modified:
    - mobile/src/screens/public-map/useBasemapSwipe.ts
    - mobile/src/screens/public-map/useBasemapSwipe.test.tsx
    - mobile/src/screens/public-map/useExplorerSwipe.ts
    - mobile/src/screens/public-map/useExplorerSwipe.test.tsx
    - mobile/src/screens/public-map/ExplorerSwipeLayers.tsx
    - mobile/src/screens/public-map/ExplorerSwipeLayers.test.tsx
    - mobile/src/screens/public-map/BasemapSwipeOverlay.tsx
    - mobile/src/screens/public-map/BasemapSwipeOverlay.test.tsx
    - mobile/src/screens/public-map/ExplorerPanelsView.tsx
    - mobile/src/screens/public-map/ExplorerPanelsView.test.tsx
    - mobile/src/screens/PublicMapScreen.tsx
    - mobile/src/screens/public-map/PublicMapScreen.test.tsx
decisions:
  - "Touches during the 360 ms entrance are measured with the animated scale (1 - (1 - 0.94) * progress read at the event), not ignored, so a quick swipe right after the globe stays aligned"
  - "Without windowProgress or with windowApplied false, no x is mapped (not even clamped), so every pre-existing controller case is unchanged"
  - "The strip, the settle animation and the release x are all in window coordinates, because the stacked maps are drawn inside the window; the line therefore starts at the finger-relative window x"
  - "The chip moved inside the ImmersiveButtons wrapper, before the bubble and the notices column in z-order (the chip is already hidden while the bubble is open, so only its order against the notices changed)"
  - "BasemapSwipeOverlay: the three per-block 160 ms fades (indicator, dots, Terminé) were replaced by the single root fade of the spec, to avoid a double fade; the hint keeps its own fade in and 1 s fade out"
metrics:
  tasks: 2
  completed: 2026-10-12
---

# Phase 28 Plan 26: Immersive wiring Summary

The swipe mode of the Explorer is now immersive (CONTEXT item 13 c, UI-SPEC section 3c): the map and everything drawn on it recede in one window, the map buttons fade out and leave the touch and accessibility trees, the top stack fades in after them, and the finger stays aligned with the wipe. The comparison is never immersive.

## What was built

- **Controller** (`useBasemapSwipe.ts`): optional `windowProgress` and `windowApplied`. A `toWindow(x)` helper reads the progress at the event and returns `windowX(x, width, 1 - (1 - IMMERSIVE_SCALE) * progress)`. It is applied to `onBegin` and `onUpdate`; the machine, the strip, the settle and the compare release x (`clampLine(result.releaseX)`) all follow from the mapped x. A touch in the margin counts as the nearest edge (clamp in `windowX`).
- **Swipe hook** (`useExplorerSwipe.ts`): `useImmersive(swipeMode)` is called once (swipe mode only; the comparison and the free map pass false), `immersiveApplies()` decides `applied`, both reach the controller, and `immersive: { window, buttons, applied, buttonsHidden }` is returned (`buttonsHidden` = the swipe mode).
- **Layers** (`ExplorerSwipeLayers.tsx`): takes the Explorer map as `children`. Inside `ImmersiveWindow`: the map, the second and third stacked maps, `CompareLine`, `CompareGrabber`, the two side tags. Outside and above it, in screen coordinates: `SwipeSurface`, `BasemapSwipeOverlay`, `QuitComparePill`.
- **Overlay** (`BasemapSwipeOverlay.tsx`): the root is an `Animated.View` with `FadeIn.duration(BUTTON_FADE_MS).delay(BUTTON_FADE_IN_DELAY_MS)` and `FadeOut.duration(BUTTON_FADE_MS)`, both `ReduceMotion.System`.
- **Panels** (`ExplorerPanelsView.tsx`): `buttons: { opacity, hidden }`; the download button, the children (capsule, locate arrow, legend with its panel and the offline badge) and the chip sit in `ImmersiveButtons`. The bubble and its backdrop, the notices column and the card stay outside.
- **Screen** (`PublicMapScreen.tsx`, 361 lines, was 359): `MapCanvas` is the child of `ExplorerSwipeLayers`; `buttons` comes from `swipe.immersive`.

## Tests

- `useBasemapSwipe`: full progress (388 to 200 on width 400 reveals 0.5, compare zone, release `x` 200), mid-entrance (0.5: screen 394 maps to 400, 297 maps to 300, then the final scale once the progress is 1), margin touch, `windowApplied` false, no progress value.
- `useExplorerSwipe`: off at rest, on in the swipe mode, never on in the comparison, off after the swipe mode ends, `applied` false passthrough.
- `ExplorerSwipeLayers`: window props, what is inside and outside it, map first in z-order, empty window at rest.
- `BasemapSwipeOverlay`: root fade in (160 ms after 80 ms) and out (160 ms), Reduce Motion on both; the hint test now targets its innermost wrapper.
- `ExplorerPanelsView`: wrapper content (download button, children, chip inside; bubble, notices and card outside), hidden flag passthrough, order test made independent of the wrapper.
- `PublicMapScreen`: window scale 1 at rest, 0.94 in the swipe mode, back to 1 after Terminé and after a compare release, never immersive in the comparison, Reduce Motion, buttons `pointerEvents` / accessibility flags, surface and top stack outside the window.

## Deviations from Plan

**1. [Rule 3 - Blocking] `ExplorerSwipeLayers.test.tsx` fixture touched in Task 1.** The new required `immersive` field of `ExplorerSwipe` broke the type check of that test's `makeSwipe`, and every commit must compile, so the fixture got the field in the Task 1 commit. Its real cases are in Task 2.

**2. [Scope] The overlay's three per-block fades were removed** (see decisions). The plan said the root fades in 160 ms after 80 ms; keeping the per-block 160 ms fades on top would have faded twice. The test that counted three wrappers now asserts the single root.

**3. [Note] The pan handlers run on the JS thread** (`runOnJS(true)`, unchanged), not on the UI thread as the plan wording says; the progress is read with `.value` there, which is the value the UI thread last published. The mapping function is still the same worklet-safe `windowX`.

No auto-fixes were needed.

## Verification

- `npx jest ... useBasemapSwipe useExplorerSwipe` with coverage: 100 % statements and lines on both files.
- `npx jest -c jest.unit.config.js src/screens src/__checks__`: pass (1685 tests in `src/screens`); `npx tsc --noEmit` in `mobile/`: clean; `PublicMapScreen.tsx` 361 lines; no touched source file over 400 lines (`useBasemapSwipe.ts` 398).
- `npm run test:coverage:mobile`: 365 suites, 5219 tests pass, `src/map` unchanged at 100 %.
- `npm run lint`, `npm run typecheck`, `npx prettier --check mobile/src`: clean.

## What the simulator test (28-18) should verify

1. Entering the swipe mode: the window recedes to about 0.94 with rounded corners and a shadow (light) or a ring (dark); the capsule, download button, locate arrow, legend (i), offline badge and chip fade out; the top stack fades in slightly after.
2. A swipe started during the 360 ms entrance, and one from the very edge of the screen, keeps the wipe front under the finger. A touch in the margin around the window behaves as a touch at the nearest edge.
3. Release in the compare zone: the window returns to full size in 240 ms while the line eases to the centre; the buttons are back; the comparison is full size.
4. Terminé and the idle exit bring the window and the buttons back. Reduce Motion: same states, no animation.
5. Rendering risks to look at on a device: the iOS blur / native glass of the capsule and download button under a group opacity (the buttons fade as one layer, ImmersiveButtons), and whether the map view re-parents or flickers when the window starts to scale (DL-02). On Android, check `elevation` shadow of the window and that the faded buttons are not reachable by TalkBack.
6. The chip is now earlier in z-order than the notices column; confirm no overlap between a notice and the chip.

## Known Stubs

None.

## Threat Flags

None. T-28-61 mitigated (one mapping, `windowX`, for every pan event, tested with the scale, device check in 28-18). T-28-62 mitigated: the buttons are hidden only while `swipeMode` is on; Terminé, the compare release and Reduce Motion are tested; the focus-loss and panel-open exits go through the same `swipeMode` state.

## Commits

- 1d6c5de1: feat(28-26): the swipe controller measures touches on the receded window and the swipe hook owns the immersive effect
- fdd1e4e0: feat(28-26): the swipe mode recedes the map window, fades the map buttons and fades in the top stack

## Self-Check: PASSED

- All 12 modified files exist and are committed; commits 1d6c5de1 and fdd1e4e0 are on the branch.
- `STATE.md` and `ROADMAP.md` untouched.
