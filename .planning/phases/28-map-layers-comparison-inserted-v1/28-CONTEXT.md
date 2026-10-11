# Phase 28: Map Layers & Comparison (INSERTED, V1) - Context

**Gathered:** 2026-10-11
**Status:** Ready for planning

<domain>
## Phase Boundary

The map offers several layers with a comparison option, and the Explorer both explores and studies maps. Out of scope: parcel annotation (Phase 31), anything touching the survey form or payload (Phase 27 runs in parallel and owns those files).
</domain>

<decisions>
## Implementation Decisions

### Layer catalogue (V1)
- Existing bases stay: Plan IGN v2, Orthophoto.
- Old bases added: Carte d'état-major (`GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40`, 1820-1866, max zoom 15), Carte IGN 1950 (`GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950`, max zoom 15), Photos aériennes 1950-1965 (`ORTHOIMAGERY.ORTHOPHOTOS.1950-1965`, max zoom 18). Purpose: read the age of the forest.
- Overlay added: BD Forêt V2 (`LANDCOVER.FORESTINVENTORY.V2`, max zoom 16).
- Not in V1 (dormant, owner saw the sample sheet): relief shading and slopes, ONF public forests, CORINE.
- Licence and usage terms per layer are NOT yet established: research must settle them before integration (success criterion 1).
- Zoom ceilings below the pack zooms (13 to 17) are accepted: those bases are context layers; the UI must handle over-zoom (scaled tiles) without a blank map.

### Comparison
- Sliding curtain: one vertical handle, layer A left, layer B right, same view. Not side-by-side maps, not a quick toggle.

### Explorer modes
- Explorer stays the default and is unchanged. A discreet control opens "study" mode, which holds layers and comparison. Nothing existing is hidden by default (criterion 3).

### Offline
- Policy is a setting (in the account settings), two levels: "base maps only" or "all layers". Default: all layers (owner choice). No weight cap; the estimated weight is shown before a download and the real cost per layer is measured in the phase (criterion 4).
- Offline sheet shows the download percentage (criterion 5). The catalogue already has percent strings (`mobile/src/i18n/fr/offline-map.ts`); researcher checks what is missing in the Explorer sheet.

### Decided after research (2026-10-11)
- Photos 1950-1965: offline maxzoom 17 (online stays 18), about 84 MB per area with all layers instead of 151.
- Overlays (BD Forêt) apply to both sides of the curtain; only bases are compared.
- Curtain = two synchronised maps (research: one map cannot clip rasters); a device spike decides go/no-go first. Fallback if no-go: quick toggle between two layers (to confirm with the owner then).
- Policy setting lives in Paramètres > Cartes, stored in `local_meta` (`offline_layers_policy`, default `all`); "base maps only" = Plan, Orthophoto and cadastre.

### Owner confirmations (2026-10-11, after planning)
- The 2 km survey prompt follows the offline layers policy in force in Paramètres (no separate base-only rule); its figure is the policy's estimate.
- The closed-sheet download chip (UI-SPEC U-14, plans 28-12 and 28-15) is kept in the phase, not cut.

### Owner decisions after the sketches 016 to 018 (2026-10-11), they supersede the earlier contract where they differ
- **Entry (016 B, reshaped):** a labeled glass pill "Couches" at the top-left replaces the third capsule button. The **basemap switch (Plan/Satellite) is removed**: the layers panel replaces it. The capsule keeps the download button only (plus the locate button below it). Choosing Plan or Satellite in the panel writes the saved basemap preference as the old switch did; an old base (état-major, 1950 map, 1950 photos) is session-only.
- **Panel structure:** three blocks. (1) **Fonds** (the five bases). (2) A **Comparer** action (a button in the panel that starts the curtain). (3) **Superpositions**: Types de forêt (switch, both sides of the curtain) and **Parcelles**, a single three-state control covering the app's parcel polygons AND the cadastre lines: **Toutes** (cadastre lines plus all parcel polygons, today's rendering), **Avec IBP** (only the parcels that have an IBP survey, no cadastre lines), **Aucune** (neither). Default Toutes; session state like the rest of the study state (resets at cold start); the entry dot also lights when Parcelles is not Toutes.
- **During a comparison** the top-left shows both the "Couches" pill (to reopen the panel) and the exit control.
- **Curtain (017 A):** round knob at 32 % of the height, tags attached to the handle at 30 pt from the line (22 pt knob radius + 8). On the old bases the parcel fill is lightened (to tune on the phone) because the pale historical maps look washed out under the 38 % fill and the white casing.
- **Download (018 A, simplified):** after "Télécharger" the area sheet **closes** and only the chip (left of the download button) shows the progress (byte-weighted percent), then the result. There is no running view in the sheet and no "En cours" line. Tapping the chip: while running nothing; failed reopens the sheet on "Réessayer"; partial reopens it on the partial message; done disappears after 4 s. ROADMAP success criterion 5 is therefore met by the chip (the percentage shows on the Explorer map, not in the sheet): owner decision 2026-10-11.

### Claude's Discretion
- Control placement, icons (Ionicons outline), curtain handle design, layer naming in French, how the setting is worded.
</decisions>

<canonical_refs>
## Canonical References

- `.planning/seeds/SEED-001-couches-de-carte.md` (constraints: IGN usage, offline weight, cadastre/parcel legibility, dark mode, sprites @2x)
- `.planning/ROADMAP.md` Phase 28
- `docs/specs/epic-h-forest-insights-and-analytics.md`
- `CLAUDE.md` Visual layer rules (useBrandTheme, dense `surface` over maps, outline icons, fr catalogue, no em dash)
- `mobile/src/map/basemaps.ts`, `map/maplibre/styles.ts`, `map/offline-styles.ts`, `map/offline-packs.ts`, `hooks/useMapStyle.ts`, `screens/public-map/MapControls.tsx`, `OfflineAreasSheet.tsx`
- `28-layers-sample-sheet.html` (one tile per candidate layer, Fontainebleau, zoom 14)
- IGN Géoplateforme WMTS: `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetCapabilities` (note: some layers need a non-"normal" style, e.g. `estompage_grayscale`, and their own tile matrix set)
</canonical_refs>

<code_context>
## Existing Code Insights

- `BasemapKey = "map" | "satellite"` today; one pack and one composite style file per basemap; dark variant for the plan only.
- Cadastre is a raster overlay added to every style (`withCadastre`), min zoom 15.
- Avoid the survey form and payload files (Phase 27).
</code_context>

<specifics>
- Owner wants to understand layers through samples; the sheet serves that.
</specifics>

<deferred>
## Deferred Ideas
- Relief shading, slopes, ONF public forests, CORINE as later layers.
</deferred>
