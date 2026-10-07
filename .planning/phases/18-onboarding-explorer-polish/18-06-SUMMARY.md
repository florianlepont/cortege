# Batch 6 — Score-band markers, legend, native user location (MAP-03/04)

## What shipped

- `brand-tokens.ts`: `brandMapTokens.scoreMarker{low,mid,high}` and
  `scoreMarkerSelectedBorder` — the moss/ochre/terracotta palette for the /50 total bands.
- `screens/public-map/SurveyMarker.tsx`: renders a `View` pastille colored by
  `bandTone(totalBand(ibpTotal))` instead of the system default pin color, with
  `tracksViewChanges={false}` for map-marker performance; `selected` is folded into the marker's
  React `key` (`${entry.key}-${selected}`) in `MapCanvas.tsx` so a selection change forces a fresh
  snapshot instead of relying on prop diffing that RN Maps markers don't always pick up.
- `screens/public-map/ScoreLegend.tsx` (+ test): a collapsible legend (starts collapsed, one toggle
  button, three rows with color swatches and band labels).
- `MapCanvas.tsx`: `<MapView showsUserLocation showsMyLocationButton={false}>` replaces the custom
  current-location `<Marker>`; `PublicMapScreen.tsx`'s `currentLocation` state removed entirely —
  the OS-native blue-dot halo is the one true representation of "you are here".

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green.
`public-map/styles.ts` again approached the 400-line cap after adding legend styles — fixed by
moving them inline into `ScoreLegend.tsx` (shared file down to 356 lines).
