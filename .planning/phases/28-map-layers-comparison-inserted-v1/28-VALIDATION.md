---
phase: 28
slug: map-layers-comparison-inserted-v1
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-11
revised: 2026-10-11
---

# Phase 28 - Validation Strategy

Source: the current plans `28-01` to `28-18` (final UI design: swipe mode, comparison by release in the middle, overlay bubble, compact download card and chip) and the "Validation Architecture" section of `28-RESEARCH.md`. Every task carries its own `<automated>` command; device-only behaviour is listed under "Manual-Only Verifications".

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
- Repo gates always on: `mobile/src/__checks__/` (dash, abbreviations, icons, motion, layers, structure with the 400-line cap); `PublicMapScreen.tsx` held at or under 380 lines by 28-16 and 28-17

## Requirement-to-Plan Map

| Requirement | Plans (implementation) | Test type |
|-------------|------------------------|-----------|
| REQ-DOC-layer-licences | 28-02, 28-16, 28-18 | unit (catalogue strings, abbreviation and dash gates, legend lines), doc check (`map-layers-and-licences-v1.md`) |
| REQ-D-map-layers | 28-01, 28-02, 28-04, 28-05, 28-09, 28-11, 28-13, 28-14, 28-16, 28-17 | unit (catalogue, styles and caps, cycle, Parcelles rules, `useMapStyle`, layers), device DL-03, DL-05, DL-08 |
| REQ-D-layer-compare | 28-01, 28-05, 28-09, 28-13, 28-14, 28-17 | unit (state machine thresholds, geometry, layers state, handle and stacks with mocked maps), device spike DL-01, DL-04 |
| REQ-D-explorer-modes | 28-05, 28-09, 28-12, 28-13, 28-16, 28-17 | unit (explore regression cases, dots, labelled controls, exits), device DL-02, DL-03 |
| REQ-D-offline-layers | 28-03, 28-04, 28-06, 28-07, 28-08, 28-10, 28-11, 28-12, 28-15, 28-16 | unit (policy with the real SQLite helper, estimate, packs, API styles and parity, availability), device DL-06, DL-07 |
| REQ-D-offline-percent | 28-07, 28-10, 28-15, 28-16, 28-17 | unit (weighted percent never decreasing, chip states and taps, announcements), device DL-06 |

28-12 (notices) and 28-18 (record and device checks) also carry these ids in their frontmatter as supporting plans. ROADMAP success criterion 5 is met by the download chip (owner decision 2026-10-11).

## Wave 0 Requirements

Test-first files that later plans rely on:

- [ ] `mobile/src/map/layer-cycle.test.ts`, `parcels-visibility.test.ts`, `wipe-geometry.test.ts`, `swipe-machine.test.ts` (28-05, pure `src/map` modules, 100 % statements and lines, every threshold edge)
- [ ] `mobile/src/storage/offline-layers-policy.sqlite.test.ts` (28-03, real SQLite helper `test/node-sqlite-db.ts`)
- [ ] `api/test/map-styles.spec.ts` parity cases (28-06: each API template found verbatim in `mobile/src/map/layers.ts`, shared offline-cap table)

Also written test-first: `mobile/src/map/layers.test.ts` (28-02), `layer-styles.test.ts`, `offline-estimate.test.ts`, `layer-notices.test.ts` (28-04).

## Manual-Only Verifications

| Check | Behavior | Requirement | Why manual | Plan |
|-------|----------|-------------|------------|------|
| DL-01 | Wipe and comparison spike: clipping at the finger and at the line, camera lag, three maps' memory, dark; go or no-go | REQ-D-layer-compare, REQ-D-map-layers | Real GL maps on Android and iOS | 28-01 Task 3 |
| DL-02 | Explore regression: capsule, locate arrow, markers, legend, cluster list, parcel tap, overlay button at rest | REQ-D-explorer-modes | Whole-screen feel on a phone | 28-18 Task 2 |
| DL-03 | Swipe mode: globe, freeze, wipe behind the finger, thresholds feel, hint, "Terminé", tap exit, 8 s idle, VoiceOver actions on the indicator | REQ-D-map-layers, REQ-D-explorer-modes | Gesture feel and screen readers | 28-18 Task 2 |
| DL-04 | Comparison by release in the middle, side swipes, line drag, edge exit, "Quitter la comparaison", markers hidden and back, VoiceOver on the line (or the instant fallback) | REQ-D-layer-compare | Gesture feel, stacked maps | 28-18 Task 2 |
| DL-05 | Overlay bubble: Types de forêt and its legend (keep or drop), Parcelles three states, "Avec IBP" draft-only question | REQ-D-map-layers | Legibility and owner decision | 28-18 Task 2 |
| DL-06 | Download: card estimate, card closing, chip percentage across packs, done, failed and partial chips, per-layer measured size (three runs) | REQ-D-offline-percent, REQ-D-offline-layers | Native packs and real sizes | 28-18 Tasks 2 and 3 |
| DL-07 | Airplane mode and force quit: downloaded layers render, missing ones skipped with the notice, offline pills | REQ-D-offline-layers | Native offline cache | 28-18 Task 2 |
| DL-08 | Legibility and dark mode: parcels and cadastre on each base and with the overlay, 0.6 fill factor on old bases, over-zoom scaled with its hint, policy row after a relaunch | REQ-D-map-layers, REQ-D-offline-layers | Visual tuning | 28-18 Task 2 |

## Validation Sign-Off

- [ ] All tasks have an automated verify or an explicit device checkpoint
- [ ] No three consecutive tasks without automated verification
- [ ] `nyquist_compliant: true` set after execution review

Note: DL-09 (swipe zones and haptics: the three zones, the zone hint, the detent felt on the iPhone and on Android, no flutter at a boundary, release haptics, haptics kept under Reduce Motion; the owner confirms or tunes COMPARE_MIN, COMPARE_MAX and ZONE_HYSTERESIS) was added after the owner decision of 2026-10-11 (CONTEXT item 11). The state machine thresholds are unit tested in 28-05 (amended).
