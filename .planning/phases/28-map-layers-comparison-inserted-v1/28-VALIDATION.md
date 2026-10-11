---
phase: 28
slug: map-layers-comparison-inserted-v1
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-11
---

# Phase 28 - Validation Strategy

Source: the "Validation Architecture" section of `28-RESEARCH.md` (the full requirement-to-test map is there).

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7 + ts-jest (mobile and api), `@testing-library/react-native` |
| **Config file** | `mobile/jest.unit.config.js`, `api/jest.unit.config.js` |
| **Quick run command** | `npm --workspace mobile run test:unit -- src/map` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check` |
| **Coverage ratchet** | `npm run test:coverage:mobile` (100 % statements and lines, global) |

## Sampling Rate

- After every task commit: the quick run command on the touched directory
- After every plan wave: the full suite command
- Before `/gsd-verify-work`: full suite and coverage green
- Repo gates always on: `mobile/src/__checks__/` (dash, abbreviations, icons, motion, layers, structure)

## Per-Task Verification Map

Each plan task carries its own `<automated>` command (see the PLAN files). Requirement coverage:

| Requirement | Plans | Test type |
|-------------|-------|-----------|
| REQ-DOC-layer-licences | 28-02, 28-08, 28-14, 28-16 | unit (catalogue, attribution), doc check |
| REQ-D-map-layers | 28-02, 28-04, 28-08, 28-10, 28-11, 28-14, 28-16 | unit (styles, maxzoom, useMapStyle), device |
| REQ-D-layer-compare | 28-01, 28-08, 28-13, 28-15, 28-16 | unit (geometry, mocked maps), device spike DL-01 |
| REQ-D-explorer-modes | 28-08, 28-11, 28-14, 28-15, 28-16 | unit (component, regression of explore flow) |
| REQ-D-offline-layers | 28-03 to 28-07, 28-09 to 28-12, 28-16 | unit (estimate, packs, policy, api styles), device |
| REQ-D-offline-percent | 28-06, 28-09, 28-12, 28-15, 28-16 | unit, device DL-04 |

## Wave 0 Requirements

- [ ] `mobile/src/map/layers.test.ts`, `layer-styles.test.ts`, `offline-estimate.test.ts`
- [ ] `mobile/src/storage/offline-layers-policy` test with the real SQLite helper (`test/node-sqlite-db.ts`)
- [ ] `mobile/src/screens/public-map/CurtainCompare` test
- [ ] `api/test` map-styles parity spec

## Manual-Only Verifications

| Behavior | Requirement | Why manual | Instructions |
|----------|-------------|------------|--------------|
| Curtain registration, lag, clipping, performance | REQ-D-layer-compare | Real GL maps | Plan 28-01 DL-01 on Android emulator then iPhone |
| Real pack sizes per layer, airplane-mode rendering | REQ-D-offline-layers | Native packs | 28-16 DL-04, DL-05 |
| Dark mode tuning, legibility of parcels on old maps | REQ-D-map-layers | Visual | 28-16 owner checklist |

## Validation Sign-Off

- [ ] All tasks have an automated verify or an explicit device checkpoint
- [ ] No three consecutive tasks without automated verification
- [ ] `nyquist_compliant: true` set after execution review
