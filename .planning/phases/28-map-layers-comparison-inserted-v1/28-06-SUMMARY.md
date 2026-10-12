---
phase: 28-map-layers-comparison-inserted-v1
plan: 06
subsystem: api-map-styles
tags: [api, map-styles, android, offline-packs, wmts, parity]
requires: ["28-02"]
provides:
  - "GET /v1/map-styles/<name>.json for six names: map, satellite, etat-major, carte-1950, photos-1950, types-foret"
  - "RASTER_PACK_STYLES, rasterPackStyle, OFFLINE_STYLE_NAMES (six) in api/src/surveys/map-styles.service.ts"
  - "Spec parity with mobile/src/map/layers.ts (templates verbatim, offline cap table)"
affects:
  - "28-07 (Android pack creation asks these URLs)"
tech-stack:
  added: []
  patterns:
    - "name matched against a Set of the fixed list before any use (no path or URL built from it)"
    - "API spec reads the mobile catalogue source text and asserts each template is found verbatim"
key-files:
  modified:
    - api/src/surveys/map-styles.service.ts
    - api/src/surveys/map-styles.controller.ts
    - api/test/map-styles.spec.ts
    - docs/technical/api-contract-v1.md
decisions:
  - "satellite keeps source id ortho; the other raster styles use the catalogue source ids (etat-major, carte-1950, photos-1950, types-foret)"
  - "satellite no longer carries the cadastre; the map pack carries it (one tile stored once by URL)"
metrics:
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 06: One Android pack style per layer Summary

The API now publishes six pack styles. `map` stays the cached Plan IGN style plus the cadastre; the five raster names are built from constants (no fetch), one source and one layer each, `tileSize` 256, `minzoom` 0 and the offline cap (19, 15, 15, 17, 16). Any other name answers 404 `unknown_map_style` after a `Set` membership check. A spec reads `mobile/src/map/layers.ts` and finds each API template verbatim, plus the literal offline cap table of the mobile test.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Six pack styles, 404 cases, mobile parity | 57c1bdfa | `map-styles.service.ts`, `map-styles.controller.ts`, `test/map-styles.spec.ts` |
| 2 | Contract section "GET /map-styles/{name}.json" | 1ef6d6cd | `docs/technical/api-contract-v1.md` |

## Verification

- `npm --workspace api run test:unit -- test/map-styles.spec.ts`: 20 tests pass (six names, five no-fetch styles, satellite no cadastre, cap table, mobile verbatim parity, cache/stale/503, 8 refused names including `MAP`, `../map`, `map.json`, `""`, `photos-1950.png`, `__proto__`, `constructor`).
- `npm --workspace api run lint`: clean. `npm --workspace api run build` (the API part of `typecheck`): clean. Prettier clean on the three API files.
- Acceptance greps: the 1950 photos template is in the service; the spec names `mobile/src/map/layers.ts`; the old section title is gone (0), the new one present; no em dash added.

## Deviations from Plan

None to the plan. Out-of-scope finding: the full `npm --workspace api run test:unit` has one failing suite, `test/check-env-parity.spec.ts` (34 tests, `check-env.sh` parity). It does not touch any file of this plan; not fixed (probably the shell script's environment in this worktree).

Controller: only the doc comment changed. The route (`file.replace(/\.json$/, "")`) is unchanged; `map.json` as a name stays refused because the extension is stripped once.

## Known Stubs

None.

## Threat Flags

None. T-28-13 (set membership, constants, one fixed outbound URL, traversal and case variants tested), T-28-14 (no fetch for raster styles) and T-28-15 (parity spec) are mitigated as planned.

## Notes for the next plans

- 28-07: Android asks `GET /v1/map-styles/<key>.json` with the catalogue layer key as the name; an older API answers 404 for the four new names, which should only fail that layer's pack.
- The `map` pack carries the cadastre; the `satellite` style no longer does, so an Android satellite pack alone has no cadastre tiles.

## Self-Check: PASSED

- FOUND: api/src/surveys/map-styles.service.ts, api/test/map-styles.spec.ts, docs/technical/api-contract-v1.md
- FOUND commits 57c1bdfa and 1ef6d6cd on `claude/focused-sutherland-89f87e`
