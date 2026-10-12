---
phase: 28
slug: map-layers-comparison-inserted-v1
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-11
revised: 2026-10-12
---

# Phase 28 - Validation Strategy

Source: the current plans `28-01` to `28-27` (final UI design: swipe mode, comparison by release in the middle, overlay bubble, compact download card and chip, then the owner feedback round of 2026-10-12, CONTEXT item 13: capsule layout, immersive swipe mode, one comparison mode with a fixed centre line, a slim grabber and side tags with chevrons; `28-19` to `28-26` build it, `28-27` writes its device checks) and the "Validation Architecture" section of `28-RESEARCH.md`. Every task carries its own `<automated>` command; device-only behaviour is listed under "Manual-Only Verifications".

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7 + ts-jest (mobile and api), `@testing-library/react-native` |
| **Config file** | `mobile/jest.unit.config.js`, `api/jest.unit.config.js` |
| **Quick run command** | `cd mobile && npx jest -c jest.unit.config.js <touched dir or file> --coverage=false` |
| **Per-file coverage gate** | `npx jest -c jest.unit.config.js <tests> --coverage --collectCoverageFrom=<files> --coverageThreshold='{"global":{"statements":100,"lines":100}}'` (the command-line threshold overrides the config, so per-directory keys without data do not fail a partial run) |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check` |
| **Coverage ratchet** | `npm run test:coverage:mobile` (100 % statements and lines on `src/map`, directory floors elsewhere) |
| **API** | `cd api && npx jest -c jest.unit.config.js test/map-styles.spec.ts` |

## Sampling Rate

- After every task commit: the task's `<automated>` command
- After every plan wave: the full suite command
- Before `/gsd-verify-work`: full suite and coverage green, device checks DL-01 to DL-09 recorded
- Repo gates always on: `mobile/src/__checks__/` (dash, abbreviations, icons, motion, layers, structure with the 400-line cap); `PublicMapScreen.tsx` held at or under 380 lines (the 380-line gate) by 28-16, 28-17 and 28-19 to 28-26 (375 lines after 28-20 to 28-23, 359 after 28-24, 361 after 28-26)

## Requirement-to-Plan Map

| Requirement | Plans (implementation) | Test type |
|-------------|------------------------|-----------|
| REQ-DOC-layer-licences | 28-02, 28-16, 28-18 | unit (catalogue strings, abbreviation and dash gates, legend lines), doc check (`map-layers-and-licences-v1.md`) |
| REQ-D-map-layers | 28-01, 28-02, 28-04, 28-05, 28-09, 28-11, 28-13, 28-14, 28-16, 28-17, 28-19 to 28-27 | unit (catalogue, styles and caps, cycle, Parcelles rules, `useMapStyle`, layers; count pill and hidden notice removed, legend spinner; capsule layout and round download button; immersive tokens, hook and wrappers), device DL-02, DL-03, DL-08 |
| REQ-D-layer-compare | 28-01, 28-05, 28-09, 28-13, 28-14, 28-17, 28-19 to 28-27 | unit (state machine thresholds, geometry, layers state, stacks with mocked maps; single comparison mode and the pure machine cleanup, reducer guard; the grabber, the centre line and the outer-fifth exit zones; the side tags, `tagSwipeStep` and the half wipe), device spike DL-01, DL-04, DL-05, DL-09 |
| REQ-D-explorer-modes | 28-05, 28-09, 28-12, 28-13, 28-16, 28-17, 28-19 to 28-27 | unit (explore regression cases, dots, labelled controls, exits; the capsule layout and notices below the chip; the immersive window, the touch mapping and the button fade), device DL-02, DL-03, DL-04 |
| REQ-D-offline-layers | 28-03, 28-04, 28-06, 28-07, 28-08, 28-10, 28-11, 28-12, 28-15, 28-16 | unit (policy with the real SQLite helper, estimate, packs, API styles and parity, availability), device DL-06, DL-07 |
| REQ-D-offline-percent | 28-07, 28-10, 28-15, 28-16, 28-17 | unit (weighted percent never decreasing, chip states and taps, announcements), device DL-06 |

28-12 (notices), 28-18 (record and owner device checks) and 28-27 (device check rows and this strategy) also carry these ids in their frontmatter as supporting plans. The item 13 plans by test type: 28-19 removals and legend spinner (unit); 28-20 single comparison mode and the pure machine cleanup (unit, 100 % `src/map`); 28-21 and 28-22 the grabber, the exit zones and the exit hint (unit); 28-23 the side tags and the half wipe (unit); 28-24 the capsule layout (unit); 28-25 and 28-26 the immersive window and the touch mapping (unit); 28-27 and the owner run of 28-18 the device checks. ROADMAP success criterion 5 is met by the download chip (owner decision 2026-10-11).

## Wave 0 Requirements

Test-first files that later plans rely on:

- [ ] `mobile/src/map/layer-cycle.test.ts`, `parcels-visibility.test.ts`, `wipe-geometry.test.ts`, `swipe-machine.test.ts` (28-05, pure `src/map` modules, 100 % statements and lines, every threshold edge)
- [ ] New pure tests of the item 13 plans in the same two files, kept at 100 % statements and lines: `edgeExitKeeps` by fifths and `EDGE_EXIT_FRACTION`, `edgeExitCue` (28-21); `tagSwipeStep` with `TAG_SWIPE_MIN` and `TAG_FLICK_VELOCITY`, `halfBounds` and `TAG_GAP` (28-23); `windowX` and the `IMMERSIVE_*` constants tied to `brandMotion.durations` (28-25); the 3:1 contrast test of the dark `visual.immersive` ring (28-25, token tests)
- [ ] `mobile/src/storage/offline-layers-policy.sqlite.test.ts` (28-03, real SQLite helper `test/node-sqlite-db.ts`)
- [ ] `api/test/map-styles.spec.ts` parity cases (28-06: each API template found verbatim in `mobile/src/map/layers.ts`, shared offline-cap table)

Also written test-first: `mobile/src/map/layers.test.ts` (28-02), `layer-styles.test.ts`, `offline-estimate.test.ts`, `layer-notices.test.ts` (28-04).

## Manual-Only Verifications

| Check | Behavior | Requirement | Why manual | Plan |
|-------|----------|-------------|------------|------|
| DL-01 | Wipe and comparison spike: clipping at the finger and at the line, camera lag, three maps' memory, dark; go or no-go | REQ-D-layer-compare, REQ-D-map-layers | Real GL maps on Android and iOS | 28-01 Task 3 |
| DL-02 | Capsule layout and overlay bubble (item 13 a, e): the capsule holds the globe and the layers button, the round download button 8 pt below it, locate arrow, legend (i) with no count pill and a bare spinner while loading; markers, cluster list and parcel tap as before; the bubble beside the capsule with the drawn five-group forest legend and Parcelles Toutes, Avec IBP, Aucune; the draft-only question | REQ-D-explorer-modes, REQ-D-map-layers | Whole-screen feel and legend colours on a phone | 28-18 Task 2 |
| DL-03 | Immersive swipe mode (item 13 c): the globe freezes the map, the window recedes (about 0.94, rounded, shadow in light, ring in dark) and every map button fades out, the top stack fades in, the wipe stays under the finger on the receded window (also during the entrance and in the margin), "Terminé", tap and 8 s idle restore the full map, Reduce Motion, faded buttons unreachable by screen readers; the question whether the notices column stays visible in the swipe mode | REQ-D-map-layers, REQ-D-explorer-modes | Gesture feel, rendering of the receded window and screen readers | 28-18 Task 2 |
| DL-04 | Single comparison mode (items 13 b, d): a release in the middle third brings the window back to full size and the line eases to the exact centre, free pan and zoom, globe disabled, one centred "Quitter la comparaison" pill, the slim grabber as the only grab point (exit-only drag, spring back to the centre, outer-fifth exit with tick and hint, interrupted drag never exits), markers hidden silently, VoiceOver exit actions on the grabber, Android stacked map without a cut-off strip | REQ-D-layer-compare | Gesture feel, stacked maps | 28-18 Task 2 |
| DL-05 | Side tags (item 13 d): each tag's back and forward chevrons (44 pt) and the horizontal swipe on a tag change that side to the previous or next layer, never the same layer on both sides, unavailable layers skipped, chevrons dimmed when no other layer exists, the change wipes in within its half in about 240 ms with a selection tick, no touch on the tags while the line is dragged, VoiceOver adjustable tag with "Fond suivant" and "Fond précédent"; the owner judges the swipe distance and the flick | REQ-D-layer-compare, REQ-D-map-layers | Gesture feel and screen readers | 28-18 Task 2 |
| DL-06 | Download: card estimate, card closing, chip percentage across packs, done, failed and partial chips, per-layer measured size (three runs) | REQ-D-offline-percent, REQ-D-offline-layers | Native packs and real sizes | 28-18 Tasks 2 and 3 |
| DL-07 | Airplane mode and force quit: downloaded layers render, missing ones skipped with the notice, offline pills | REQ-D-offline-layers | Native offline cache | 28-18 Task 2 |
| DL-08 | Legibility and dark mode: parcels and cadastre on each base and with the overlay, 0.6 fill factor on old bases, hint scrim over Satellite, capsule, download button, tags and pills neutral over Satellite and old maps, ring and shadow of the receded window in dark and light, over-zoom scaled with its hint, policy row after a relaunch | REQ-D-map-layers, REQ-D-offline-layers | Visual tuning | 28-18 Task 2 |
| DL-09 | Zones and haptics (items 11, 13 b): release in the first third springs back, in the middle third compares, beyond two thirds changes; hints per zone; detent entering the middle third, light tick entering the others, one haptic per crossing, release haptics, haptics kept under Reduce Motion; the grabber's tick entering an outer fifth and the tag's tick on a side change; Android vibration recorded with `dumpsys vibrator_manager` | REQ-D-layer-compare, REQ-D-explorer-modes | Haptics are felt, not measured | 28-18 Task 2 |

## Validation Sign-Off

- [ ] All tasks have an automated verify or an explicit device checkpoint
- [ ] No three consecutive tasks without automated verification
- [ ] `nyquist_compliant: true` set after execution review

Note: DL-09 (swipe zones and haptics: the three zones, the zone hint, the detent felt on the iPhone and on Android, no flutter at a boundary, release haptics, haptics kept under Reduce Motion, and since item 13 the grabber's and the tags' ticks) was added after the owner decision of 2026-10-11 (CONTEXT item 11). The state machine thresholds are unit tested in 28-05 (amended) and 28-20 to 28-23. In the owner run the owner confirms or tunes `COMPARE_MIN` (1/3), `COMPARE_MAX` (2/3), `ZONE_HYSTERESIS` (0.03), `EDGE_EXIT_FRACTION` (1/5), `TAG_SWIPE_MIN` (44 pt), `TAG_FLICK_VELOCITY` (500 pt/s) and the `IMMERSIVE_*` values (`IMMERSIVE_SCALE` 0.94, `IMMERSIVE_IN_MS` 360, `IMMERSIVE_OUT_MS` 240, with `BUTTON_FADE_MS` and `BUTTON_FADE_IN_DELAY_MS`); a change is a listed gap of 28-18, never applied by the device-check plans. The rows and their protocol are in `docs/user-tests/device-checks.md` (plan 28-27); the outcomes are filled by 28-18, the last plan.
