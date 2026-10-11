---
phase: 28-map-layers-comparison-inserted-v1
plan: 12
subsystem: mobile-map
tags: [map, notices, offline, availability, accessibility]
requires: ["28-02", "28-04", "28-07"]
provides:
  - "mobile/src/screens/public-map/map-notices.ts: buildMapNotices, MapNotice, MapNoticeKind, MapNoticeInput"
  - "mobile/src/screens/public-map/useLayerAvailability.ts: which layers can show at the view centre"
  - "mobile/src/screens/public-map/useTransientFlag.ts: a flag true for a while after a trigger"
  - "mobile/src/screens/public-map/MapNoticeStack.tsx: the centred column of map pills"
  - "MapInfoPill icon and danger props"
affects:
  - "28-16 and 28-17 (wiring into the Explorer and the swipe cycle)"
tech-stack:
  added: []
  patterns:
    - "notices built by a pure function from what the screen knows, ids stable per kind and layer"
    - "availability from the native pack metadata (listAreaLayers) of the ready area under the centre"
key-files:
  created:
    - mobile/src/screens/public-map/map-notices.ts
    - mobile/src/screens/public-map/map-notices.test.ts
    - mobile/src/screens/public-map/useLayerAvailability.ts
    - mobile/src/screens/public-map/useLayerAvailability.test.ts
    - mobile/src/screens/public-map/useTransientFlag.ts
    - mobile/src/screens/public-map/useTransientFlag.test.ts
    - mobile/src/screens/public-map/MapNoticeStack.tsx
    - mobile/src/screens/public-map/MapNoticeStack.test.tsx
  modified:
    - mobile/src/screens/public-map/MapChips.tsx
    - mobile/src/screens/public-map/MapChips.test.tsx
decisions:
  - "useTransientFlag ignores the nonce present at mount (only a change is a trigger), so a counter that starts at 0 shows nothing"
  - "Only the glyph takes the danger ink; the text keeps the map control ink (colour is not the only carrier: the sentence names the failure)"
  - "The retry link is its own glass pill under the error pill, so it is a real 44 pt target and the pill itself stays non-interactive"
  - "A layer shown on both sides of a comparison counts once for the offline and coverage notices"
metrics:
  duration: "about 30 minutes"
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 12: Notices column, layer availability, transient flag Summary

The Explorer can now tell which layers work at the view centre and say why anything is missing: an ordered notice list (hidden surveys, skipped layers, coverage, offline, error, over-zoom), a hook reading the offline packs of the area under the centre, a timer hook for the transient pills, and the centred pill column that shows them.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | Notice builder, layer availability and the transient flag | 081b8557 |
| 2 | Glyph on MapInfoPill and the centred notice stack | da7d8752 |

## Exported names (for 28-16 and 28-17)

`mobile/src/screens/public-map/map-notices.ts`
- `buildMapNotices(input: MapNoticeInput): MapNotice[]`
- `MapNoticeInput = { shownBases: readonly BaseLayerKey[]; overlay: boolean; mapZoom: number; center: { lat; lng }; isOffline: boolean; isAvailable: (key: MapLayerKey) => boolean; failedLayer: MapLayerKey | null; hiddenSurveys: boolean; skippedCount: number }`
- `MapNotice = { id; kind: MapNoticeKind; text; icon; danger?; retry? }`, `MapNoticeKind = "hidden" | "skipped" | "outside" | "offline" | "error" | "overzoom"`
- ids: `hidden`, `skipped`, `outside-<key>`, `offline-<key>` or `offline-several`, `error-<key>`, `overzoom`. `isAvailable` is only called when `isOffline`.
- Coverage notices are given online and offline; the error notice has `danger: true, retry: true`.

`mobile/src/screens/public-map/useLayerAvailability.ts`
- `useLayerAvailability({ areas: readonly OfflineAreaSummary[], center: { lat, lng }, isOffline }): { isAvailable(key), areaAtCenter }`
- Online everything is available; offline Plan and Satellite always, an extra only if the pack of the most recent ready area at the centre exists. `listAreaLayers()` is loaded on mount and when the sorted ids of the ready areas change; a rejection leaves only Plan and Satellite; late answers after unmount are dropped.

`mobile/src/screens/public-map/useTransientFlag.ts`
- `useTransientFlag(nonce: number | null, durationMs: number): boolean`

`mobile/src/screens/public-map/MapNoticeStack.tsx`
- `MapNoticeStack({ notices, top, onRetry })`, `NOTICE_SIDE_INSET = 72`. testIDs `map-notice-<kind>` (the `Animated.View` of the notice) and `map-notice-retry`. Column is `box-none`, `left`/`right` 72, centred; the caller computes `top` (capsule top, or below the swipe stack, "Quitter la comparaison" or the download chip row).
- Announces each new id once with `AccessibilityInfo.announceForAccessibility` (again only if it left and came back); pill wrapper is a polite live region; `FadeIn` at `brandMotion.durations.fast` with `ReduceMotion.System`.

`MapChips.tsx`: `MapInfoPill` takes `icon?: keyof typeof Ionicons.glyphMap` and `danger?: boolean`; with an icon the label is one line, tail-truncated; without, unchanged.

## Verification

- `npx jest -c jest.unit.config.js src/screens/public-map src/__checks__`: 31 suites, 352 tests pass.
- Coverage (per-file): `map-notices.ts`, `useLayerAvailability.ts`, `useTransientFlag.ts`, `MapNoticeStack.tsx`, `MapChips.tsx` all 100 % statements, branches, functions, lines.
- `npm run lint`, `npm run typecheck`: exit 0. `npm run format:check`: only warns on `.claude/settings.local.json` (local untracked file, not mine).
- Acceptance greps present: `export function buildMapNotices`, `listAreaLayers()`, `export function useTransientFlag`, `icon?: keyof typeof Ionicons.glyphMap`, `ReduceMotion.System`, `map-notice-`.

## Deviations from Plan

**1. [Rule 3 - Blocking] Raw `Pressable` is forbidden by ESLint (charter 12.4)**
- **Found during:** Task 2 lint.
- **Fix:** the retry link uses `AppPressable` with `disableScale disableRipple` inside an interactive `GlassSurface`, the same pattern as `GlassIconButton`'s map pill.
- **Files:** `MapNoticeStack.tsx`, its test (mocks `AppPressable` as a host Pressable).

**2. Design choices where the plan was silent**
- `useTransientFlag` ignores the mount-time nonce (see decisions).
- `GlassSurface` takes no accessibility props, so the live region and label sit on a `View` wrapping the pill, not on the pill; the retry link is outside that wrapper so a screen reader reaches it.

Nothing else; the plan ran as written. STATE.md and ROADMAP.md untouched as instructed.

## Known Stubs

None. Nothing is wired into the Explorer yet (28-16 and 28-17).

## Threat Flags

None. T-28-30 mitigated (offline and coverage pills name the layer and the reason, nothing switches by itself); T-28-31 relies on `listAreaLayers` ignoring invalid metadata (28-07) and a rejection degrading to Plan and Satellite only.

## Self-Check: PASSED

- FOUND: all eight created files and the two modified files listed above
- FOUND commits 081b8557 and da7d8752 on `claude/focused-sutherland-89f87e`
