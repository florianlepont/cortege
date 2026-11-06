---
phase: 32
plan: 35
subsystem: factor-g-zones
tags: [factor-g, open-areas, ibp-domain, parity, grouped-rows, owner-feedback]
status: complete
key-files:
  created:
    - mobile/src/screens/factor-detail/OpenAreasSection.tsx
    - mobile/src/screens/factor-detail/OpenAreasSection.test.tsx
    - mobile/src/screens/factor-detail/OpenAreaRow.tsx
    - mobile/src/screens/factor-detail/no-open-area.ts
    - mobile/src/screens/factor-detail/open-areas.styles.ts
  modified:
    - packages/ibp-domain/src/factor-details.ts
    - packages/ibp-domain/src/factor-details.test.ts
    - packages/ibp-domain/src/index.ts
    - packages/ibp-domain/src/parity/cases.ts
    - api/test/surveys-submit.e2e-spec.ts
    - mobile/src/hooks/useUncappedEntry.ts
    - mobile/src/hooks/useSurveyForm.ts
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/factor-detail/UncappedFieldBlock.tsx
    - mobile/src/navigation/routes/FactorDetailRoute.tsx
    - mobile/src/app/factor-key-figure.ts
    - mobile/src/i18n/fr/factor-detail.ts
    - docs/technical/ibp-validation-matrix-v2.md
    - docs/specs/ibp-form-spec.md
    - CLAUDE.md
metrics:
  completed: 2026-10-30
---

# Phase 32 Plan 35: factor G takes several zones, the app computes the percent

Owner decision 2026-10-30 ("oui saisir plusieurs zones et l'appli calcule"). The observer of G lists the open flowering zones, each a surface in hectares; the form derives the percent from the sum over the route's `zone_surface_ha` and stores it in the scored `open_flowering_percent`. Scoring is unchanged and no scorer reads the new key.

## Package (`@cortege/ibp-domain`, `factor-details.ts`)

New exports (all through `index.ts`):
- `UNCAPPED_DETAIL_KEYS.G = ["open_areas_ha"]`, `OPEN_AREAS_MAX_COUNT = 20`
- `readOpenAreasHa(value)`: non-array gives `null`; otherwise keeps the finite numbers from 0 to `ROUTE_SURFACE_MAX_HA`, each rounded to 2 decimals, the first 20; unreadable entries are dropped; `[]` is a valid empty list
- `sumOpenAreasHa(areas)`: sum of the entries above 0, 2 decimals
- `floweringPercentFromAreas(areas, surfaceHa)`: sum over surface times 100, capped at 100, 2 decimals; `null` when the list is empty or the surface is not a finite number above 0
- `openAreasExceedSurface(areas, surfaceHa)`: true when the sum is above a usable surface (drives the warning line)
- `clampOpenAreaHa(value)`: a typed or stepped zone brought to what the list stores (NaN is 0, below 0 is 0, above the maximum is the maximum, 2 decimals)

Parity: `MAT-G-UNC-01@both` (G with `open_flowering_percent: 2` plus `[0.3, 0.1]`: G = 5, draft and submit, totals 20 / 7 / 27 in the MAT-SUBMIT-02 set) and `MAT-G-UNC-02@both` (`#over`: percent 100 with zones above the surface gives G = 2; `#none`: percent 0 with `[]` gives G = 0), each in both method versions. Listed in `docs/technical/ibp-validation-matrix-v2.md` (new "Follow-up 32-35" section) and `docs/specs/ibp-form-spec.md` Factor G. They run in the package, `api/test/ibp-parity.spec.ts` and `mobile/src/app/ibp-parity.test.ts` unchanged.

## Payload

`factors.G = { open_flowering_percent: <number>, open_areas_ha?: number[] }`. The list goes out only beside the scored percent and only when non-empty (the form omits an empty list). A zone at 0 is kept in the stored list (a row added and not yet filled). The percent keeps the form's text shape (`toFieldText`, decimal comma in the field, a number in the payload). A G with only `open_flowering_percent` is unchanged and needs no migration.

API: nothing to change. `factors` is `Record<string, unknown>` stored verbatim (`survey-upsert.dto.ts`, `survey-patch.dto.ts`), so `open_areas_ha` passes through create, patch and sync. New e2e test in `api/test/surveys-submit.e2e-spec.ts` ("keeps the G open_areas_ha zones verbatim ...") reads it back unchanged and checks the score is 5 from the percent alone. The PDF is untouched.

## Mobile form

- `useUncappedEntry`: state `openAreasHa: number[]`; `addOpenArea` (a row at 0, at most 20), `setOpenArea(index, ha)` (clamped by the package), `removeOpenArea(index)`, `clearOpenAreas`; each returns the new list from the latest state (two calls in one batch both count); `loadUncapped` reads `G.open_areas_ha` tolerantly, `resetUncapped` clears it, `uncappedPayload` exposes it.
- `useSurveyForm` actions (the surface is passed by the page, like `cap` for F): `addOpenArea()`, `setOpenArea(index, ha, zoneSurfaceHa)`, `removeOpenArea(index, zoneSurfaceHa)`, `markNoOpenArea(on)`. A zone change or removal writes `open_areas_ha` and the percent from `floweringPercentFromAreas` in the same batch (capped at 100); removing the last zone clears the percent; `markNoOpenArea(true)` stores 0 with no zone; `false` empties the field only while it holds 0. Adding an empty row leaves the percent alone (an older G with only a percent keeps it until a zone is filled; an empty G stays "À remplir").
- The four actions travel in `UncappedEntryProps` (`FactorDetailRoute` -> pager -> screen).

## G page

`FactorDetailScreen` swaps the percent track for `OpenAreasSection` when `factor === "G"`, the form entry is present and the route surface is above 0; otherwise (route-less old draft, tests) the plain 32-33 percent row stays. The section "Zones de milieux ouverts fleuris" is one `AppGroupedContainer`: a row per zone ("Zone 1", ..., `ValueStepper` capsule 0,1 ha, tap to type, one adjustable element, plus a 44 pt `trash-outline` remove button named "Supprimer la zone N"), the accent row "Ajouter une zone" (`add-circle-outline`, gone at 20 zones with a note), then "Aucune zone de milieux ouverts fleuris" (SelectionCircle, ticked iff percent is 0 and no zone, locked with a caption while a zone exists, same pattern as F's none row). Under the list: "Total des zones : 0,4 ha sur 2,0 ha décrits" (decimal commas) and, when the zones exceed the surface, "Les zones dépassent la surface décrite : le total est limité à 100 %" (live region, caption tone). Add and remove are announced ("Zone 2 ajoutée", "Zone 2 supprimée"). The hero keeps the percent with the sub label "calculé d'après les zones et la surface décrite" (pending word "À calculer"). All strings in `fr.factorDetail.openAreas` (and `valueRows.hectaresSuffix`, `keyFigure.sub.fromZones`).

## Deviations from Plan

- **A zone at 0 is stored, so the package accepts 0 in `open_areas_ha`** (the brief said "numbers > 0" and also "a zone with 0 is ignored by the sum but kept"; both cannot hold, a kept empty row has to be stored to survive a reload). Entries below 0 or above the surface maximum are still dropped.
- The reader keeps the first 20 entries rather than rejecting a longer list (tolerant, like `readSurveyRoute`).
- Extra package exports beyond the brief: `sumOpenAreasHa`, `openAreasExceedSurface`, `clampOpenAreaHa` (so mobile re-implements no rule).
- A removed last zone clears the percent (G back to "À remplir") instead of leaving a stale figure.
- The page shows no field error line in zones mode: the derived percent is always valid, and an empty one is the pager's "À remplir".
- No API code change was needed (only the test).

## Verification

- `npm run typecheck`: clean
- `npm --workspace mobile run lint` (unpiped): exit 0
- `npm --workspace mobile run test:unit:coverage`: 495 suites, 7853 tests green, thresholds met, `src/navigation` 100 / 100 (branches at its 98 floor) / 100 / 100, gates green (catalogue literal, em dash, abbreviations, icons, 400-line cap, unused style keys)
- `npm --workspace @cortege/ibp-domain run test:coverage`: 544 tests, 100 percent statements, branches, functions, lines
- `npm --workspace api run test:unit -- ibp-parity`: 128 passed
- API e2e `surveys-submit` against local Postgres (`ibp_test`): 9 passed including the new test (after `npm run build:domain`)
- Prettier on every touched `.ts` and `.tsx`

## Not verified

I could not run the app or see a device, so none of this was seen rendering. The owner should check on a phone, on a survey with a route (so a described surface exists):
- G page: the zone list replaces the percent track; the hero shows the percent and the sub label "calculé d'après les zones et la surface décrite".
- Tap "Ajouter une zone": a "Zone 1 / 0,0 ha" row appears; tapping the value types a surface (decimal keyboard), the capsule steps by 0,1; the hero percent follows (0,3 ha on 2,0 ha shows 15 %).
- Row layout at 390 pt width and large text: label, value, capsule and the 44 pt trash button on one line ("Zone 12" with the longest value).
- Remove a zone: percent recomputes, VoiceOver says "Zone N supprimée"; removing the last one returns G to "À remplir".
- Zones larger than the surface: percent held at 100 %, the warning line shows.
- "Aucune zone ..." row: ticks only with 0 % and no zone, locked caption while a zone exists.
- 20 zones: the add row disappears with the note.
- An older survey with only a percent: the zone list starts empty, the hero shows the stored percent.

## Known risks

- If the route's surface is edited later (Parcelles, "Parcours utilisé", edit mode), the stored percent is not recomputed until a zone is touched; the total line then shows the new surface against a percent from the old one.
- Adding a first empty zone to a G that already has a percent does not clear that percent (deliberate, see above); a stale figure stays until a zone value is entered.

## Known Stubs

None.

## Commits

- a044df85 feat(32-35): open_areas_ha detail of factor G and the percent derived from the zones
- 8b125e98 test(32-35): the API keeps G open_areas_ha verbatim
- 2b81b36a feat(32-35): clampOpenAreaHa brings a typed zone surface to what the list stores
- 7eef5a2b feat(32-35): the zone list of factor G as a grouped section with its none row
- 25e3d827 feat(32-35): G page takes several zones and the form computes the percent from them

## Self-Check: PASSED
