---
phase: 03-field-entry-ergonomics
batch: 6
title: Parcel map colors + Parcels near you sheet
status: complete
---

# Batch 6 — FLOW-09/FLOW-10

## What changed

- `mobile/src/components/ParcelOverlayPolygons.tsx`: the three hardcoded hex/rgba polygon colors
  (`#1d5fa2`, `#2f7d56`, `#6f8d74` and their rgba fills) are replaced with `brandMapTokens` (added
  batch 1): selected → terracotta (3px stroke), studied → moss, free/neutral → sage (2px stroke),
  selected outranking studied outranking neutral, matching the audit's FLOW-09 recommendation and
  readable in direct sunlight. New `ParcelOverlayPolygons.test.tsx` pins the mapping.
- `mobile/src/screens/survey-form/NearbyParcelsSheet.tsx`: a native sheet (`Modal`,
  `presentationStyle="pageSheet"` on iOS) offered as an alternative to tapping a polygon on the map.
  Reuses `useNearbyParcelsState()` (the same context `HomeScreen`'s "Autour de vous" card already
  loads through, per CLAUDE.md's documented split) rather than duplicating the fetch. 56pt checkable
  rows, one per nearby parcel with its distance, toggling `selectedParcelIds` through the existing
  `onToggleParcelSelection` callback and a light haptic (`survey-list/haptics.ts`, reused rather than
  duplicated) on each tap. Distinct states for location-denied, load error, loading and empty.
- `mobile/src/screens/survey-form/ParcelsSection.tsx`: a second overlay button next to "Plein écran"
  opens the sheet; local `nearbySheetVisible` state, no changes needed to the wizard's own state.
- `mobile/src/i18n/fr/nearby-parcels-sheet.ts` (`fr.nearbyParcelsSheet`): new catalogue section.
  The distance text takes a pre-formatted string, not a raw number — the catalogue's own hygiene
  test (`catalogue.test.ts`) feeds every function a name-shaped sample argument for non-count-shaped
  keys, so number formatting (`.toFixed(1)`) belongs in the component, not the catalogue function.

## Scope note

FLOW-10's other sub-points (a 48pt locate button, an explicit "cadastre unavailable offline" notice)
aren't in this phase's success criteria text (only "the parcel map's selected/studied/free states
use accessible, on-brand colors... parcel selection is also offered as a 'Parcels near you' native
sheet" is), and aren't touched here.

## Verification

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — all green
(104 suites / 1338 tests).
