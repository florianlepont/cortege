---
phase: 28-map-layers-comparison-inserted-v1
plan: 18
subsystem: docs
tags: [docs, licences, offline-cost, device-checks, map-layers]
requires: ["28-06", "28-08", "28-27"]
provides:
  - "docs/technical/map-layers-and-licences-v1.md: the layers, licences, attribution, offline policy, estimated cost and the swipe mode and comparison as built"
  - "docs/README.md index entry; OA-127 note"
  - "docs/user-tests/device-checks.md: outcomes known on 2026-10-12 (informal owner validation)"
affects: []
key-files:
  created:
    - docs/technical/map-layers-and-licences-v1.md
  modified:
    - docs/README.md
    - docs/user-tests/owner-acceptance.md
    - docs/user-tests/device-checks.md
decisions:
  - "Only Task 1 was executed in full; Tasks 2 and 3 (emulator and iPhone runs, measured pack sizes) could not be run by the executor"
  - "The informal validation by the owner is recorded as informal, not as a scripted pass"
metrics:
  completed: 2026-10-12
status: partial
---

# Phase 28 Plan 18: Layers and licences record, device check outcomes Summary

The layers-and-licences document describes the Phase 28 map features as built after the owner's iPhone rounds (success criterion 1 met in full); the estimated offline cost is recorded and the measured table is left empty with a note that the measurement is pending (criterion 4 is only half met); the device checks DL-01 to DL-05 and DL-09 carry the owner's informal iPhone validation of 2026-10-12 and DL-06 to DL-08 stay untested.

Status is `partial`: Task 1 is done, Task 2 (scripted device checks, emulator measurements) and the measured part of Task 3 were not run.

## What was done

| Task | Outcome | Commit |
|------|---------|--------|
| 1 | Document written (decision, layer table with Géoplateforme ids and metadata records, licences and attribution, offline behaviour, estimated cost, swipe mode and comparison as built, tunables, sources); index entry; OA-127 note | 396a52a7 |
| 2 | Not run (device checkpoint). Instead, the outcomes known from the owner's own testing on 2026-10-12 were written into the rows | 396a52a7 |
| 3 | Partly: outcomes written, tunables recorded as accepted; the Measured table is empty by design | 396a52a7 |

Section 6 of the document records the late changes of the owner feedback rounds: the receded window fitted between a top zone (carousel: layer pill and five dots) and a bottom zone (hint bubble, then notices) with a non-uniform scale (`immersiveTarget`, `IMMERSIVE_ASPECT_STRETCH` 1.1); bare basemaps only while swiping; no "Terminé" pill (a tap on the map leaves, accessibility action "done"); the intro hint staying until the first touch; the Explorer opening on the last known position (about 15 km) when location is already allowed; Parcelles "Aucune" hiding the survey count pills; the grabber and side tags at the vertical centre; "Quitter la comparaison" at the bottom; the readiness gate of the stacked maps (double-buffered side step; reveal order ready, aligned camera, visible, cover released) that removed the white flashes.

## Owner's answers (quoted with the date)

2026-10-12, informal, on his iPhone 15 Pro (Release builds from this branch, several rounds, frame-level screen recordings used to remove flashes): at the end "c'est tout bon". Confirmed: the capsule layout and download button (DL-02), the immersive swipe mode with the window placement (DL-03), the single comparison mode with line, grabber, tags and side step with no remaining glitch (DL-04, DL-05), the Explorer opening on his position, Parcelles Aucune hiding the pills. He asked for no change to any tunable, so the current values are recorded as accepted. Not explicitly answered (defaults kept): legend colours, draft-only parcels for Avec IBP (drafts of the author count), notices in the swipe mode (they stay, in the bottom zone), fill factor 0.6, hint scrim.

## Deviations from Plan

- **Task 2 not run by the executor:** device checks, emulator measurements (DL-06, DL-07, DL-09 Android) and the Release install on the iPhone cannot be done by this agent. The owner's own testing replaced the iPhone part for the rows listed above.
- **Acceptance criterion "no DL-02 to DL-09 row with 🔲" not met by design:** DL-06, DL-07 and DL-08 stay 🔲; the Measured table is empty (instructed by the caller; no figure invented).
- **Stale expected text left in rows:** the "Expected" column of DL-03 and DL-04 still mentions the "Terminé" pill and the notices as first written; the Notes column states what differs as built (rows are not rewritten, per the plan).
- Out of scope and untouched: `.planning/STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `CLAUDE.md`, any code under `mobile/` or `api/`, Phase 27 files.

## Remaining open

- Offline pack measurements (DL-06): three runs on one 4 km by 4 km area at Fontainebleau with the policy "Toutes les couches" on the Android emulator, reading the `offline.layer-size` lines, plus the total on an iPhone; then fill the Measured table of the document and compare with the estimate (about 53 MB base, about 84 MB all layers).
- Airplane mode and force quit with downloaded layers (DL-07) on both platforms.
- Legibility and dark mode pass (DL-08): old-map fill factor 0.6, hint scrim, cadastre opacity 0.7, dark dimming 0.8, light and dark on both platforms.
- Android emulator run of DL-02 to DL-05 and the Android vibration log of DL-09 (`dumpsys vibrator_manager`); TalkBack and VoiceOver on the indicator, grabber and tags; Reduce Motion.
- Taptic feel of the tunables: accepted by default; the felt detent and ticks were not judged separately.
- `LEFT_MAP_ANDROID_VIEW` (texture or surface) decision on an Android phone; it also decides the rounded corners of the receded window on Android. Texture is the orchestrator's default, not the owner's choice.
- Questions never answered explicitly: forest legend colours, draft-only parcels for Avec IBP, exit hint overlapping a notice (known, not fixed, plan 28-22).

## Gaps for --gaps

None requested by the owner: he asked for no change. The items above under "Remaining open" are checks not yet run, not requested changes.

## CLAUDE.md lines proposed (not applied)

Under "Navigation" (mobile architecture), after the tab description:

- Explorer map layers (Phase 28): `mobile/src/map/layers.ts` is the single catalogue (five bases in the swipe cycle, the Types de forêt overlay, templates, zoom caps, weights); nothing else switches on `"map" | "satellite"` by hand. The globe in the top-right capsule enters the swipe mode (the map recedes into a window between a carousel above and a hint and notices zone below, bare basemaps only; a tap on the map leaves). A release in the middle third opens the single comparison mode: free map, centre line, slim exit-only grabber (outer fifths quit), side tags with chevrons that step one side. The layers state is in `useMapLayersState` / `map-layers-state.ts`, the pure rules in `map/swipe-machine.ts` and `map/wipe-geometry.ts`. Stacked maps are never shown before they are rendered (`useStackedReady`, `useCoverRelease`). Record: `docs/technical/map-layers-and-licences-v1.md`.

Under the `local_meta` list:

- key `offline_layers_policy`: `base` or `all` (default `all`), set in Paramètres, Cartes; applies to future downloads; left by `clearLocalIbpData`; the schema stays at version 5.

Under "Mobile PDF export" or the maps rows of the tech stack:

- Offline maps: one native pack per layer in a fixed order (`map` with the cadastre first, the 1950 photographs last), extras best effort, 45 s stall watchdog, Photos 1950 capped at tile zoom 17 offline; on Android the packs are created from `GET /v1/map-styles/{name}.json` (six fixed names in `api/src/surveys/map-styles.service.ts`).

Under the API module table (`surveys` row): `map-styles.service.ts` serves six fixed pack styles (`map`, `satellite`, `etat-major`, `carte-1950`, `photos-1950`, `types-foret`), its WMTS templates pinned to the mobile catalogue by a unit spec.

Under "Documentation index" (technical): `map-layers-and-licences-v1.md` (map layers, Géoplateforme licences and attribution, offline policy and cost).

## Self-Check: PASSED

- FOUND: docs/technical/map-layers-and-licences-v1.md (no U+2014), docs/README.md entry, OA-127 note, 8 DL-02 to DL-09 rows still present
- FOUND commit 396a52a7 on `claude/focused-sutherland-89f87e`; no file under `mobile/` or `api/` in it
