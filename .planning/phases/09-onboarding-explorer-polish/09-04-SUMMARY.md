# Batch 4 — Explorer filter chips (MAP-02)

## What shipped

- `screens/public-map/period-filter.ts` (+ test): `computePeriodRange(period, now)` builds
  local-date (not UTC) `YYYY-MM-DD` bounds for `all/month/quarter/year`, avoiding a timezone
  rollback of the boundary date that `.toISOString()` would introduce.
- `screens/public-map/ExplorerFilterBar.tsx` (+ test): period chips, region chips
  (`""/"ACA"/"M"`, exported `REGION_KEYS`/`RegionKey`), a "Mes relevés" toggle, and an active-filter
  count + reset link — replacing the old free-text fields and "Appliquer" button.
- `PublicMapScreen.tsx`: `period`/`mineOnly` state; `visibleItems` filters client-side by
  `ownSurveyIds` when `mineOnly` is on; a `useEffect` on `[fromDate, toDate, region]` (skipping the
  first render via a ref) calls `viewport.applyFilters()` — chip taps apply immediately, no "Apply"
  step.
- `AppChoiceChip.tsx`: added an optional `accessibilityLabel` prop (defaults to `label`), needed to
  satisfy the repo-wide "every Pressable has a role and a catalogue label (D-07)" check once filter
  chips existed.
- `i18n/fr/public-map.ts`: filter chip and reset copy.

## Deliberate scope decision

The region filter is a 3-way chip (ACA/M/all), matching the domain's `REGION_VERSIONS`; filters
stay a separate chip row above the map rather than folding into the Explorer sheet (batch 5) — see
`09-CONTEXT.md`.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green.
