---
phase: 28-map-layers-comparison-inserted-v1
plan: 15
subsystem: mobile-map
tags: [map, offline, download, card, chip, announcements]
requires: ["28-02", "28-10"]
provides:
  - "DownloadCard: compact bottom card (estimate lines, Télécharger) with failed and partial views"
  - "DownloadChip: the percentage and the outcome on the map, carrier of success criterion 5"
  - "useDownloadAnnouncements: screen-level announcements of a download"
  - "DownloadStatusView partial rendering, defaultAreaName, capsule constants of styles.ts"
affects:
  - "28-16 (wires the card, chip and announcements into the Explorer)"
  - "28-13, 28-12 (notices column starts below the chip's row; capsule geometry)"
tech-stack:
  added: []
  patterns:
    - "card shows no progress; the chip is the only progress surface"
    - "announcements live in a screen hook, independent of the chip's visibility"
key-files:
  created:
    - mobile/src/screens/public-map/DownloadCard.tsx
    - mobile/src/screens/public-map/DownloadCard.test.tsx
    - mobile/src/screens/public-map/DownloadChip.tsx
    - mobile/src/screens/public-map/DownloadChip.test.tsx
    - mobile/src/screens/public-map/useDownloadAnnouncements.ts
    - mobile/src/screens/public-map/useDownloadAnnouncements.test.ts
    - mobile/src/screens/public-map/area-name.ts
    - mobile/src/screens/public-map/area-name.test.ts
  modified:
    - mobile/src/screens/public-map/DownloadStatusView.tsx
    - mobile/src/screens/public-map/DownloadStatusView.test.tsx
    - mobile/src/screens/public-map/OfflineAreasSheet.tsx
    - mobile/src/screens/public-map/OfflineAreasSheet.test.tsx
    - mobile/src/screens/public-map/styles.ts
decisions:
  - "The chip's timer for 'done' runs only while the chip is visible, so a done chip hidden by the swipe mode is shown 4 s once it returns"
  - "Failed and partial views keep the card closable by an absolute close control in the corner (the status view has its own title)"
  - "On a jump over a 25 % step only the step reached is announced"
metrics:
  duration: "about 40 minutes"
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 15: Compact download card, chip and announcements Summary

The Explorer now has the owner's final download surfaces as tested components: a compact bottom card with the honest weight split by base and other layers and one "Télécharger" button, a chip left of the capsule's download button that carries the byte-weighted percentage (success criterion 5) and the outcome, and a screen-level announcements hook. They are not wired into the screen yet (28-16).

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Partial view of `DownloadStatusView`, shared `defaultAreaName` | da07e32a | `DownloadStatusView.tsx` (+ test), `area-name.ts` (+ test), `OfflineAreasSheet.tsx` (+ test) |
| 2 | Compact download card | a3857c37 | `DownloadCard.tsx` (+ test) |
| 3 | Chip, announcements, capsule constants | b329121e | `DownloadChip.tsx`, `useDownloadAnnouncements.ts`, `styles.ts` (+ tests) |
| fix | Done status without a list is a plain success | 5eee0ba4 | `DownloadStatusView.tsx` (+ test) |

## Exported names (for the next plans)

- `DownloadCard` (`DownloadCard.tsx`), props `DownloadCardProps`: `{ estimate: AreaLayersEstimate; view: "form" | "failed" | "partial"; failedLayers: readonly MapLayerKey[]; runningElsewhere: boolean; bottom: number; onDownload: (name: string) => void; onRetry: () => void; onDone: () => void; onClose: () => void }`. Type `DownloadCardView`. testIDs `download-card` (positioned view, `entering` fade 160 ms), `download-start`, `download-close`. `onDownload` receives `defaultAreaName()`. Position is absolute, `left`/`right` 14, `bottom` as given.
- `DownloadChip` (`DownloadChip.tsx`), props `DownloadChipProps`: `{ status: AreaDownloadStatus | null; visible: boolean; top: number; onPress: () => void; onExpire: () => void }`. `top` is the capsule's top. testIDs `download-chip` (the accessible node: progressbar / button / label) and `download-chip-position`. Constant `DONE_CHIP_DURATION_MS = 4000`. `onPress` fires only for failed and partial; `onExpire` once, 4 s after a plain success, only while `visible`.
- `useDownloadAnnouncements(status: AreaDownloadStatus | null): void` (`useDownloadAnnouncements.ts`): call it once in the Explorer screen with `useOfflineAreas().downloadStatus`.
- `defaultAreaName(now = new Date())` (`area-name.ts`).
- `measureStatuses(name, totalTiles)` now returns four statuses: running, done, failed and a partial (`areaId: "measure-partial"`, all four extra layers). `OfflineAreasSheet` keys and measures its unseen copies by the `areaId` suffix (testIDs `offline-area-measure-running|done|failed|partial`).
- `styles.ts`: `CAPSULE_BUTTON_SIZE = 50`, `CAPSULE_RIGHT = 14`, `capsuleButtonCenterY(top, index)` (border + buttons above + hairlines + half a button; index 1 is the download button), `capsuleHeight(buttonCount)`. `createControlStyles` uses them, no visual change.

## What the card shows

Form view, policy "all": "Télécharger cette zone", close ("Fermer", 30 pt drawn, 44 pt target, `close-outline`), "Environ N Mo pour la zone encadrée en vert" (SemiBold), "Fonds de carte : X Mo. Autres couches : Y Mo.", "Réglable dans Paramètres, Cartes.", and `AppButton` primary "Télécharger" (min height 46, 16 SemiBold label). Policy "base": "Fonds de carte seulement, réglable dans Paramètres." and no third line. `exceedsCap`: `areas.tooLarge` replaces line 1 and the button is disabled. `runningElsewhere`: lines 2 and 3 are dropped and the disabled button reads "Téléchargement…". No bar, percentage, tile count or "En cours" anywhere in the card. Failed and partial views render `DownloadStatusView` (with `announce={false}`: the screen hook speaks) plus a corner close control.

## Verification

- `npx jest -c jest.unit.config.js src/screens/public-map src/__checks__ --coverage=false`: 37 suites, 421 tests pass.
- Task 1 verify (DownloadStatusView, OfflineAreasSheet, area-name, SurveyParcelSelectionScreen): pass.
- Coverage: `DownloadCard.tsx` 100 % statements/lines (threshold 95), `DownloadChip.tsx` and `useDownloadAnnouncements.ts` 100 % statements, branches, functions, lines (threshold 100).
- `npm run lint`, `npm run typecheck`, `npm run format:check`: exit 0.
- Acceptance greps: `download.partial(`, `export function defaultAreaName`, `export const CAPSULE_BUTTON_SIZE = 50`, `accessibilityRole="progressbar"` present; no `ProgressBar|running.percent|running.tiles` in the card; no `withRepeat|setInterval` in the chip.
- Not run: device check of the glass chip over the map and of the corner close control on the failed view (native glass is mocked in tests).

## Deviations from Plan

**1. [Rule 1 - Bug] Done status without `failedLayers`** (commit 5eee0ba4)
- **Found during:** final run of `src/screens/public-map`. `PublicMapScreen.test.tsx` (modified by the 28-01 executor, uncommitted, not mine) builds a done status without `failedLayers`, so `status.failedLayers.length` threw in `DownloadStatusView`.
- **Fix:** `status.failedLayers ?? []` in the done state (a status without the list is a plain success), with a test. `PublicMapScreen.test.tsx` was left alone; its stale fixture can get `failedLayers: []` in 28-16.

**2. [Rule 3 - Blocking] `OfflineAreasSheet` measuring copies keyed by `areaId`**
- A fourth status with phase "done" collides with the existing done copy (React key and `offline-area-measure-done` testID). The sheet now keys and measures by the `areaId` suffix. Behaviour is unchanged apart from the extra unseen copy reserving the partial result's height; its test was updated for the four copies.

**3. [Discretion]** Announcements for a jump over a step (60 % right after the start) say "50 %" only, not the skipped "25 %".

**4. [Discretion]** The chip's 4 s timer for the plain success runs only while the chip is visible.

## Known Stubs

None. The three components are complete but unused by the screen until 28-16 wires them.

## Threat Flags

None. T-28-37 (partial chip and partial view name the missing layers) and T-28-38 (card shows the weight split by base and other layers with the settings pointer) are mitigated as planned.

## Notes on failures outside this plan

During the run, `src/__checks__/structure.test.ts` and `motion.test.ts` failed once because of the in-progress `useSwipeSpike.tsx` of plan 28-01 (478 lines, unguarded timings); they passed on the final run, once that file was changed. Not mine, not touched.

## Self-Check: PASSED

- FOUND commits da07e32a, a3857c37, b329121e, 5eee0ba4 on `claude/focused-sutherland-89f87e`
- FOUND all created files listed above
