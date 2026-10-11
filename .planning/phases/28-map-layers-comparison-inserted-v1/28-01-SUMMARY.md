---
phase: 28-map-layers-comparison-inserted-v1
plan: 01
subsystem: mobile-map
tags: [map, wipe, comparison, spike, maplibre, device-check]
requires: []
provides:
  - "mobile/src/screens/public-map/MapStack.tsx: MapStack, useMapSync -> { cameraRef, syncFrom }"
  - "mobile/src/screens/public-map/map-stack-mode.ts: WIPE_PRESENTATION, COMPARISON_BUILT, SIDE_WIPE, LEFT_MAP_ANDROID_VIEW"
  - "MapCanvas optional props: frozen, onViewChange, rotationLocked, hideMarkers, androidView"
  - "theme tokens visual.curtain.line and visual.curtain.edge (contrast tested)"
affects:
  - "28-11, 28-13, 28-14, 28-16, 28-17, 28-18"
key-files:
  created:
    - mobile/src/screens/public-map/MapStack.tsx
    - mobile/src/screens/public-map/map-stack-mode.ts
    - mobile/src/screens/public-map/useSwipeSpike.tsx
    - mobile/src/screens/public-map/SpikeStacks.tsx
  modified:
    - mobile/src/screens/public-map/MapCanvas.tsx
    - mobile/src/screens/PublicMapScreen.tsx
    - mobile/src/app/feature-flags.ts
    - mobile/src/app/theme-visual.ts
    - docs/user-tests/device-checks.md
status: complete
---

# Phase 28 Plan 01: Wipe and comparison device spike Summary

wipe_presentation: wipe
comparison_built: true
side_wipe: wipe
left_android_view: texture

**Decision (owner, 2026-10-11): provisional go.** The spike has no UX (no indicator, no Terminé), so the owner could not judge it on the iPhone; they chose to build the full UX now and to judge the fluidity on the iPhone at the end of the phase (plan 28-18, device checks). The constants above are therefore a provisional "go texture-left". The choice of `texture` (against `surface`) for the Android Explorer map is the orchestrator's reasoned default from the emulator evidence, NOT a choice of the owner: it is one constant (`LEFT_MAP_ANDROID_VIEW`) to revisit after the iPhone and Android judgement.

## What was built

Tasks 1 and 2 (commits `deff4e1d`, `878e059d`): the reusable clipped map `MapStack` with `useMapSync`, the contrast-tested curtain tokens, and a throwaway spike driver (`useSwipeSpike`, `SpikeStacks`) behind `EXPO_PUBLIC_SWIPE_SPIKE`, which plan 28-17 deletes. Task 3 (commit `d0d1d610` and the closing commit): device check DL-01 and the recorded outcome in `map-stack-mode.ts`.

## Evidence

- **Android emulator** (Pixel_8, API 36, Release, Fontainebleau; software GL, indicative): the incoming layer is cut exactly at the finger and at the line, in surface and texture mode; a release in the middle keeps both layers behind a draggable line; a side swipe mounts a third map that stays within its side; markers hidden in a comparison. Surface-left: the stacked maps were cut off over the top 158 px in two runs; not with texture-left. Follow while panning at about 400 px/s: right map trailed 60 to 140 px (surface) and about 50 px (texture), noisy. Memory VmRSS: 1 map 354 to 360 MB, 2 maps 366 to 398 MB, 3 maps 371 to 409 MB, each stacked texture map holds a 9.7 MB GL layer; no crash. Pan rate 14 fps (surface) and 24 fps (texture) on software GL.
- **iPhone 18 Pro simulator** (orchestrator, 2026-10-11): globe then a right-to-left swipe released near 30 %: Plan | Satellite behind a white line; a swipe on the right side alone: Photos 1950 on the right, Plan unchanged. Uncovered strips show black ground.
- **Owner's iPhone:** the Release build installed and launched; the spike mode shows no indicator by design, so no judgement; deferred to 28-18.

## Notes for the next plans

- A ground colour per layer is needed in the real stacked maps (strips are black before their first tiles); the real stacked maps must carry the same parcel and cadastre children.
- A swipe starting within about 40 px of the right edge triggers Android's back gesture (test gotcha).
- Scaffolding for 28-17 to delete: `useSwipeSpike`, `SpikeStacks.tsx` (`SpikeStacks`, `LineHandle`, `SPIKE_PHOTOS_STYLE`), `isSwipeSpikeEnabled` and `swipeSpikeLeftView` in `feature-flags.ts`, the README "Swipe spike (Phase 28)" section, the spike wiring and globe override in `PublicMapScreen.tsx`.
- Kept by 28-17: `MapStack`, `useMapSync`, the `MapCanvas` props, the curtain tokens, `map-stack-mode.ts`.
