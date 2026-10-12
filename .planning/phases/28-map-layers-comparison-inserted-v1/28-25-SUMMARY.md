---
phase: 28-map-layers-comparison-inserted-v1
plan: 25
subsystem: mobile-map
tags: [map, immersive, swipe-mode, tokens, reanimated, item-13c]
requires: ["28-23"]
provides:
  - "theme-visual: visual.immersive { shadow: { color, opacity, radius, offsetY }, ring: string | null } per scheme"
  - "swipe-machine: IMMERSIVE_SCALE = 0.94, IMMERSIVE_IN_MS = 360, IMMERSIVE_OUT_MS = 240, BUTTON_FADE_MS = 160, BUTTON_FADE_IN_DELAY_MS = 80"
  - "wipe-geometry: windowX(x, width, scale)"
  - "useImmersive(on) -> { window, buttons } (shared values) and immersiveApplies()"
  - "ImmersiveWindow({ progress, applied, children }) and ImmersiveButtons({ opacity, hidden, children })"
affects:
  - "28-26 (wires the effect into the Explorer)"
status: complete
tech-stack:
  added: []
  patterns:
    - "an opaque-backed outer view carries the iOS shadow / Android elevation, an always-mounted inner view clips the map"
key-files:
  created:
    - mobile/src/screens/public-map/useImmersive.ts
    - mobile/src/screens/public-map/useImmersive.test.tsx
    - mobile/src/screens/public-map/ImmersiveWindow.tsx
    - mobile/src/screens/public-map/ImmersiveWindow.test.tsx
  modified:
    - mobile/src/app/theme-visual.ts
    - mobile/src/app/visual-tokens.test.ts
    - mobile/src/map/swipe-machine.ts
    - mobile/src/map/swipe-machine.test.ts
    - mobile/src/map/wipe-geometry.ts
    - mobile/src/map/wipe-geometry.test.ts
decisions:
  - "Light immersive tokens: black shadow, opacity 0.18, radius 24, offsetY 8, no ring. Dark: black shadow opacity 0.4, radius 16, offsetY 6, ring #5E5F5F"
  - "The 3:1 check applies to the dark ring only (ratio 3.11 against #08090A); a light shadow cannot be measured as a contrast, so the test asserts its values and the absent ring. This is the reading of the UI-SPEC contrast sentence"
  - "The dark ring starts from the mapControl.hairline level composited over the dark canvas (about #4D4E4E, 2.4:1) and is raised to the first neutral grey that passes 3:1"
  - "useImmersive mounted with on = true starts in the final state without an animation, as with false"
  - "windowX treats a scale that is not above 0 (0, negative, NaN) as 'no mapping' and returns the clamped x"
metrics:
  tasks: 2
  completed: 2026-10-12
---

# Phase 28 Plan 25: Immersive building blocks Summary

The parts of the immersive swipe mode (CONTEXT item 13 c) exist in isolation, tested: tokens, constants, the window coordinate mapping, the progress hook and the two wrappers. Plan 28-26 wires them into the Explorer.

## What was built

- **Tokens** (`theme-visual.ts`): `visual.immersive { shadow, ring }`. Light is a soft shadow (0.18, 24, 8) and no ring. Dark is a faint shadow (0.4, 16, 6) plus an opaque `#5E5F5F` ring, tested at 3:1 against `colors.canvas` (`#08090A`) and at least as strong as the composited `mapControl.hairline`.
- **Constants** (`swipe-machine.ts`): `IMMERSIVE_SCALE`, `IMMERSIVE_IN_MS`, `IMMERSIVE_OUT_MS`, `BUTTON_FADE_MS`, `BUTTON_FADE_IN_DELAY_MS`, with a test tying the three durations to `brandMotion.durations.slow`, `.base` and `.fast`.
- **Geometry** (`wipe-geometry.ts`): `windowX(x, width, scale)` = `(x - width / 2) / scale + width / 2` clamped to `[0, width]`; a touch in the margin counts as the nearest edge.
- **Hook** (`useImmersive.ts`): `useImmersive(on)` returns `{ window, buttons }`. Enter: window `withTiming(1, 360 ms, decelerate)`, buttons `withTiming(0, 160 ms)`. Exit: window `withTiming(0, 240 ms, standard)`, buttons `withDelay(80, withTiming(1, 160 ms))`. Every timing carries `ReduceMotion.System`; under Reduce Motion both values are set at once (also when only the preference changes). Both animations are cancelled on unmount. `immersiveApplies()` is false only on Android with `LEFT_MAP_ANDROID_VIEW === "surface"` (currently "texture", so true everywhere today).
- **Wrappers** (`ImmersiveWindow.tsx`): `ImmersiveWindow` (testIDs `immersive-window`, `immersive-window-ring`) and `ImmersiveButtons` (`immersive-buttons`).

## Rendering notes (recorded in the component's doc comment)

- iOS: the shadow is on the outer view, which has an opaque `colors.canvas` background and the window's animated corner radius, so React Native derives the shadow path from its bounds and no offscreen pass is run over the Metal map view. The shadow is never put on the clipping view or the map.
- Android: the shadow is the outer view's `elevation` (progress times `brandElevation.level3.elevation`, which needs that opaque background). Below API 28 the outset shadow may be lost (charter 13.9, accepted).
- The inner clip view (animated radius, `overflow: "hidden"`) stays mounted at radius 0 and is an absolute-fill, `pointerEvents="box-none"` view, so the map is never re-parented when the effect starts and touches are unchanged at rest. Device check DL-02 (28-18) confirms it is harmless at rest.
- With `applied` false (an Android surface map view) the outer and inner styles are empty and the ring is not mounted; the buttons still fade.
- The worklets capture plain values (`canvas`, `shadow`, `ring`), not the whole theme.

## Deviations from Plan

**1. [Naming] The hook test is `useImmersive.test.tsx`, not `.test.ts`.** It renders a probe component, so it contains JSX. The plan's verify commands match it (jest patterns are substrings).

No other deviation. No auto-fixes were needed.

## Verification

- `npx jest ... src/map/wipe-geometry.test.ts src/map/swipe-machine.test.ts` with 100 % statements and lines on both files: pass.
- `npx jest ... useImmersive ImmersiveWindow` with 100 % statements, branches and lines on both files: pass.
- `src/app` (55 suites) and `src/__checks__` (motion, icons, dash, abbreviations, layers, fonts, structure): pass.
- `npm run test:coverage:mobile`: 365 suites, 5192 tests pass, `src/map` at 100 % statements and lines.
- `npm run lint`: clean. `npx tsc --noEmit` in `mobile/`: clean. Prettier is clean on every file of this plan (the two files it flags under `src/screens/public-map`, `DownloadChip.tsx` and `useExplorerLayers.ts`, belong to the parallel plan 28-24).
- No hex or `rgba(` literal in `ImmersiveWindow.tsx` or `useImmersive.ts`.

## Known Stubs

None. The components are not mounted anywhere yet by design; 28-26 wires them.

## Threat Flags

None. T-28-59 (faded buttons still reachable) is mitigated and tested: `ImmersiveButtons` sets `pointerEvents="none"`, `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"` while hidden. T-28-60 (Android surface clip) is mitigated and tested through `immersiveApplies()` with `Platform` and `LEFT_MAP_ANDROID_VIEW` mocked; the device check stays in 28-18.

## Commits

- a989ed66: feat(28-25): immersive tokens, constants and the window coordinate mapping
- c3665a67: feat(28-25): the immersive hook and the receding window and fading buttons wrappers

## Self-Check: PASSED

- Files created and present: `useImmersive.ts`, `useImmersive.test.tsx`, `ImmersiveWindow.tsx`, `ImmersiveWindow.test.tsx`.
- Commits a989ed66 and c3665a67 exist on the branch.
