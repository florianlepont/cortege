---
phase: 28-map-layers-comparison-inserted-v1
plan: 02
subsystem: mobile-map
tags: [map, layers, catalogue, i18n, wmts, licences]
requires: []
provides:
  - "mobile/src/map/layers.ts: the pure layer catalogue (six layers, templates, tile zoom caps, weights, coverage)"
  - "fr.mapLayers (mobile/src/i18n/fr/map-layers.ts): every user-facing text of the phase"
  - "styles.ts reads ORTHO_TILES and CADASTRE_TILES from the catalogue"
affects:
  - "28-03 to 28-18 (every plan that reads layers.ts or fr.mapLayers)"
  - "28-06 (API parity spec copies the literal template and cap tables)"
tech-stack:
  added: []
  patterns:
    - "one catalogue entry per layer, nothing switches on map | satellite by hand"
    - "each WMTS template is one full string literal so the API spec finds it verbatim"
key-files:
  created:
    - mobile/src/map/layers.ts
    - mobile/src/map/layers.test.ts
    - mobile/src/i18n/fr/map-layers.ts
    - mobile/src/i18n/fr/map-layers.test.ts
  modified:
    - mobile/src/map/maplibre/styles.ts
    - mobile/src/i18n/fr/index.ts
    - mobile/src/i18n/catalogue.test.ts
decisions:
  - "The forest legend image is NOT bundled: the file served at the documented URL is 300 x 835 (37 classes), not the 300 x 69 the capabilities declare. Owner question below."
  - "Plan and Satellite source lines keep the UI-SPEC wording (both records agree)"
  - "Carte de 1950 and Photos 1950 coverage is null in the catalogue (box too wide to test a point)"
metrics:
  duration: "about 25 minutes"
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 02: Layer catalogue, French catalogue module, legend asset Summary

One pure, tested catalogue (`mobile/src/map/layers.ts`) now describes the six layers in swipe-cycle order with verified WMTS templates, online and offline tile zoom caps, measured tile weights and coverage boxes, and every text of the phase lives in `fr.mapLayers` with source lines checked against the Géoplateforme records. The forest-types legend image was not bundled (see "Verified records" and "Owner questions").

## Verified records

All fetched on 2026-10-11 from `data.geopf.fr`, saved in the session scratchpad (never executed).

### IGNF_PLAN-IGN (CSW record)

- Update sentences: "Plan IGN est une carte numérique multi échelle, mise à jour en continu et déclinée en plusieurs styles" and "Le produit est sinon mis à jour de manière mensuelle à partir de la BD TOPO® aux grandes échelles" (the yearly code `annually` in the record is the downloadable version only).
- Licence: "Licence Ouverte / Open License (compatible ODC-BY, CC-BY 2.0)"; use limitation "Aucune contrainte"; public access "Pas de restriction d'accès public selon INSPIRE".
- Decision: UI-SPEC wording kept. `layers.map.source` = "Plan : données mises à jour régulièrement par l'IGN." (record: continuous, monthly at large scales); era "aujourd'hui".

### IGNF_BD-ORTHO (CSW record)

- Update sentences: "Les prises de vues aériennes (PVA) sont réalisées chaque année sur une période estivale allant d'avril à octobre. Le programme d'acquisition suit une logique départementale ou territoriale" and "Il existe un millésime par an de BD ORTHO® depuis 2000 et un assemblage tous les 3 à 6 ans pour avoir un millésime couvrant l'ensemble du territoire." Maintenance code `irregular`.
- Licence: same Licence Ouverte line, same "Aucune contrainte".
- Decision: UI-SPEC wording kept. `layers.satellite.source` = "Satellite : photographies aériennes récentes, millésime variable selon le département."; era "aujourd'hui".

### Capabilities (GetCapabilities, WGS84BoundingBox)

| Layer | lon min, lat min | lon max, lat max | Catalogue |
|-------|------------------|------------------|-----------|
| `GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40` | -6.08889, 41.1844 | 10.961, 51.2745 | coverage box |
| `LANDCOVER.FORESTINVENTORY.V2` | -5.15047, 41.3252 | 9.57054, 51.0991 | coverage box |
| `GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950` | -179.5, -75 | 179.5, 75 | `null` (whole globe) |
| `ORTHOIMAGERY.ORTHOPHOTOS.1950-1965` | -67.7214, -21.4013 | 55.8464, 51.0945 | `null` (mainland and overseas in one box) |

### Forest types legend (NOT as expected)

- Capabilities declare the legend as `LANDCOVER.FORESTINVENTORY.V2-legend.png`, `width="300" height="69"`.
- The file actually served at `https://data.geopf.fr/annexes/ressources/legendes/LANDCOVER.FORESTINVENTORY.V2-legend.png` is **300 x 835**, 8-bit RGB (31 KB), 37 classes, one long list. Viewed before use; nothing executed.
- Classes in the image's order: Forêt fermée sans couvert arboré; de feuillus purs en îlots; de chênes décidus purs; de chênes sempervirents purs; de hêtre pur; de châtaignier pur; de robinier pur; d'un autre feuillu pur; à mélange de feuillus; de conifères purs en îlots; de pin maritime pur; de pin sylvestre pur; de pin laricio ou pin noir pur; de pin d'Alep pur; de pin à crochets ou pin cembro pur; d'un autre pin pur; à mélange de pins purs; de sapin ou épicéa; de mélèze pur; de douglas pur; à mélange d'autres conifères; d'un autre conifère pur autre que pin; à mélange de conifères; à mélange de feuillus prépondérants et conifères; à mélange de conifères prépondérants et feuillus; Forêt ouverte sans couvert arboré; de feuillus purs; de conifères purs; à mélange de feuillus et conifères; Peupleraie; Lande; Formation herbacée.
- Consequence: the plan's check `file ... | grep "PNG image data, 300 x 69"` cannot pass, and a 300 x 835 image (about 620 pt tall at the bubble's 224 pt content width) does not fit a "compact legend under the row". The plan and UI-SPEC allow dropping the image when it does not read, so `mobile/assets/map-layers/forest-types-legend.png` was **not created**. `overlays.legendA11y` names the classes by their groups, in the image's order: "forêts fermées de feuillus, de conifères ou mélangées, forêts ouvertes, peupleraies, landes et formations herbacées".

### Final Plan and Satellite strings

- `layers.map.source`: "Plan : données mises à jour régulièrement par l'IGN."
- `layers.satellite.source`: "Satellite : photographies aériennes récentes, millésime variable selon le département."

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Verify records, boxes, legend | none (read-only, results above) | none created |
| 2 | French catalogue module | 33abb21f | `fr/map-layers.ts`, `fr/map-layers.test.ts`, `fr/index.ts`, `i18n/catalogue.test.ts` |
| 3 | Layer catalogue, styles.ts | 700f3681 | `map/layers.ts`, `map/layers.test.ts`, `map/maplibre/styles.ts` |

## Verification

- `npx jest -c jest.unit.config.js src/i18n src/__checks__/abbreviations.test.ts src/__checks__/catalogue-dash.test.ts --coverage=false`: 98 tests pass.
- `npx jest -c jest.unit.config.js src/map src/__checks__/icons.test.ts --coverage=false`: 147 tests pass; `layers.ts` and `map-layers.ts` at 100 % statements, branches, functions and lines.
- `npm run test:coverage:mobile`: 328 suites, 4446 tests pass, no threshold failure.
- `npm run lint`, `npm run typecheck`: exit 0. `prettier --check mobile/src/map mobile/src/i18n`: clean. `npm run format:check` only warns on `.claude/settings.local.json` (local untracked file, not touched, out of scope).
- Acceptance greps: no `BD`, `V2`, `SCAN`, `WMTS` word in `map-layers.ts` (0); `grep -c mapLayers fr/index.ts` is 2; the two required strings are present; none of the superseded keys exists; the 1950 photos template is in `layers.ts`; `styles.ts` imports from `../layers` and holds no `LAYER=ORTHOIMAGERY`.

## Deviations from Plan

**1. [Rule 3 - Blocking] `catalogue.test.ts` key list**
- **Found during:** Task 2. The test pins the exact list of top-level `fr` sections, so adding `mapLayers` fails it.
- **Fix:** one added entry `"mapLayers"` in the list (`mobile/src/i18n/catalogue.test.ts`). Test file only; Phase 27 may add sibling entries in the same list (trivial merge).
- **Commit:** 33abb21f

**2. [Rule 1 - Bug in the spec text] `compare.tagA11y`**
- The UI-SPEC writes `tagA11y: (name) => name`; the catalogue test calls every function with a proxy and requires a string, so it is `` `${name}` ``. Same output for a string.
- **Commit:** 33abb21f

**3. Legend asset not produced (plan Task 1 acceptance not met)**: see "Forest types legend" above. Per the plan's own fallback, the image stays out and the owner is asked.

**4. Commit guard**: the plan and the orchestrator ask for commits on the current branch `claude/focused-sutherland-89f87e`; the strict `worktree-agent-*` branch allow-list of the commit protocol was therefore not applied (the protected-branch deny-list was: HEAD is not main, master or a release branch).

## Decisions Made

- Spacing before ":" and "%" are plain spaces, copied from `fr.offlineMap.areas.running.percent` (so `download.chip.running(42)` equals it); only "1 : 50 000" uses no-break spaces.
- `megabytes` rounds half up in integer tenths (9 450 000 gives "9,5"), prints "0" for 0 or a non-number, and drops a ",0" ("5", not "5,0"); from 9 950 000 bytes it prints a whole number so it never shows "10,0".
- `LAYER_CATALOGUE` overlay entry carries `cadastreOpacity: 0.9` only to keep the type uniform (never read for the overlay).
- The vector Plan source's `offlineMaxTileZoom` is 18, like online: the 13 to 17 pack range, not the source cap, bounds what is downloaded.

## Known Stubs

None. (`overlays.legendA11y`, `overlays.forestOffline` and the other strings are used by later plans; no data flows to the UI yet because no UI is built in this plan.)

## Owner questions

1. **Forest legend.** The official legend served by the Géoplateforme is a 300 x 835 list of 37 classes (capabilities say 300 x 69). Options: (a) no legend in the bubble, only the meta line "Feuillus, conifères, mélangées" (current state); (b) a grouped five-line legend drawn by the app (closed broadleaf, closed conifer, closed mixed, open, poplar, moorland, herbaceous) with colours read from the image; (c) bundle the tall image behind an expandable "Légende" row. Plans that import the asset (bubble, 28-1x) must not `require` it until the owner chooses.

## Notes for the next plans

- Import everything layer related from `mobile/src/map/layers.ts`; `BasemapKey` is unchanged (`basemaps.ts`).
- `fr.mapLayers.layers.<i18nKey>` matches `LayerEntry.i18nKey` (`map`, `satellite`, `etatMajor`, `carte1950`, `photos1950`, `forestTypes`); `forestTypes` has no `swipeName` or `era` (it is never a base).
- `download.megabytes(bytes)` takes bytes and returns the string passed to `estimate`, `estimateSplit`, `optionAll` and `optionBase`.
- 28-06: copy `VERIFIED_TEMPLATES` and `ZOOM_CAPS` (online, offline) literally from `mobile/src/map/layers.test.ts`.
- Phase 27 is untouched; the only shared edits are one import line and one entry in `fr/index.ts`, plus one entry in the `catalogue.test.ts` key list.

## Self-Check: PASSED

- FOUND: mobile/src/map/layers.ts, mobile/src/map/layers.test.ts, mobile/src/i18n/fr/map-layers.ts, mobile/src/i18n/fr/map-layers.test.ts
- FOUND commits 33abb21f and 700f3681 on `claude/focused-sutherland-89f87e`
- NOT PRODUCED (by decision): mobile/assets/map-layers/forest-types-legend.png
