# Phase 28: Map Layers & Comparison (INSERTED, V1) - Research

**Researched:** 2026-10-11
**Domain:** MapLibre React Native 11 raster layers, IGN Geoplateforme WMTS, native offline packs, Explorer UX (React Native / Expo 57)
**Confidence:** HIGH for layers, licences, offline cost and code seams (all measured or read); MEDIUM for the curtain (no single-map option exists, the two-map approach needs a device spike); LOW for dark-mode raster tuning (device judgement)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Layer catalogue (V1)**
- Existing bases stay: Plan IGN v2, Orthophoto.
- Old bases added: Carte d'état-major (`GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40`, 1820-1866, max zoom 15), Carte IGN 1950 (`GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950`, max zoom 15), Photos aériennes 1950-1965 (`ORTHOIMAGERY.ORTHOPHOTOS.1950-1965`, max zoom 18). Purpose: read the age of the forest.
- Overlay added: BD Forêt V2 (`LANDCOVER.FORESTINVENTORY.V2`, max zoom 16).
- Not in V1 (dormant, owner saw the sample sheet): relief shading and slopes, ONF public forests, CORINE.
- Licence and usage terms per layer are NOT yet established: research must settle them before integration (success criterion 1).
- Zoom ceilings below the pack zooms (13 to 17) are accepted: those bases are context layers; the UI must handle over-zoom (scaled tiles) without a blank map.

**Comparison**
- Sliding curtain: one vertical handle, layer A left, layer B right, same view. Not side-by-side maps, not a quick toggle.

**Explorer modes**
- Explorer stays the default and is unchanged. A discreet control opens "study" mode, which holds layers and comparison. Nothing existing is hidden by default (criterion 3).

**Offline**
- Policy is a setting (in the account settings), two levels: "base maps only" or "all layers". Default: all layers (owner choice). No weight cap; the estimated weight is shown before a download and the real cost per layer is measured in the phase (criterion 4).
- Offline sheet shows the download percentage (criterion 5). The catalogue already has percent strings (`mobile/src/i18n/fr/offline-map.ts`); researcher checks what is missing in the Explorer sheet.

### Claude's Discretion
- Control placement, icons (Ionicons outline), curtain handle design, layer naming in French, how the setting is worded.

### Deferred Ideas (OUT OF SCOPE)
- Relief shading, slopes, ONF public forests, CORINE as later layers.

Phase boundary: parcel annotation (Phase 31) and anything touching the survey form or payload (Phase 27, parallel) are out of scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

ROADMAP says "none new yet". Proposed IDs, following the `REQ-{epic}-{slug}` convention of `.planning/REQUIREMENTS.md` (the planner or owner confirms them):

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-DOC-layer-licences | Source, licence, attribution wording and usage rule of every offered layer are recorded (criterion 1) | "IGN layers: verified facts and legal terms" below: all four layers are Licence Ouverte, WMTS has no rate limit, attribution wording proposed |
| REQ-D-map-layers | The observer switches base layers and an overlay in the Explorer (criterion 2, first half) | Catalogue, tile URL templates, style builders, `useMapStyle` generalisation |
| REQ-D-layer-compare | The observer compares two layers on the same view with a sliding curtain (criterion 2, second half) | "Curtain" section: two synchronised maps, risks, spike |
| REQ-D-explorer-modes | Explorer explores by default; a discreet control opens study mode with layers and comparison; the explore flow stays intact (criterion 3) | "Explorer structure" section, 400-line cap plan |
| REQ-D-offline-layers | Offline policy setting (base maps only / all layers), one native pack per layer, estimate before download, real cost measured (criterion 4) | "Offline cost" and "Pack architecture" sections |
| REQ-D-offline-percent | The Explorer sheet shows the download percentage (criterion 5) | "Criterion 5" section: already built in the open sheet; what is missing is listed |
</phase_requirements>

## Summary

All four candidate layers work with MapLibre raster sources, are served by the Géoplateforme WMTS under the Licence Ouverte (per the IGN catalogue records), and the WMTS service has no rate limit (the CGU of 15 October 2024 and the usage-limits page of 7 August 2026 list WMTS as "not subject to usage limit"). No layer is blocked. Each needs the exact `FORMAT` (jpeg for the two old maps, png for the 1950 photos and BD Forêt), `STYLE=normal` and `TILEMATRIXSET=PM`; a wrong format answers HTTP 400. Outside their coverage the tiles answer 404 (never a blank tile), which the native downloader skips cleanly.

Offline cost is the decisive finding. MapLibre Native downloads a 256-pixel raster source one zoom level above the pack zoom (pack 13 to 17 becomes tile zoom 14 to 18, read from `coveringZoomLevel` in maplibre-native), clamped to the source's min/max zoom. Measured on a 4 x 4 km area in the Fontainebleau forest (the "2 km around a survey" area): today's two packs (Plan IGN + orthophoto + cadastre) already weigh about 53 MB, 2.4 times the 22 MB the app shows, and "all layers" adds 98 MB, of which 95.6 MB is the 1950 photographs (PNG, about 50 KB a tile, 2145 tiles down to tile zoom 18). Capping that one source at maxzoom 17 for the offline style brings the area to about 84 MB, at 16 to about 63 MB. This is the only layer that makes "all layers by default, no cap" heavy, and it is a one-line decision for the owner.

The curtain cannot be done in one map with this library version (raster paint properties are not data-driven, the style spec has no raster clip, MapLibre Native 13.6.1). The only workable design is two `Map` views on the same camera, the upper one inside an `overflow: hidden` wrapper that follows the handle, the camera of the upper one driven by the lower one's `onRegionIsChanging` events. It costs a second GL map and a camera lag of a frame or two; it must be proven by a device spike before the rest of the phase builds on it.

Success criterion 5 is already built: since 2026-10-08 (commit c257d4eb) the Explorer's offline sheet replaces its form by `DownloadStatusView` with a bar and "Téléchargement : N %". What is missing is listed in the Criterion 5 section (nothing shows the percentage once the sheet is dismissed, the percentage is a plain mean over packs, and the Android path was only verified on 2026-10-11).

**Primary recommendation:** Add a layer catalogue (`mobile/src/map/layers.ts`, pure) as the single description of every layer (WMTS template, format, tile zoom range, weight constants, French names, attribution); build one native pack per layer, sequentially, with weighted progress; keep the Explorer unchanged and add a `layers-outline` button that opens a study panel in the existing `ExplorerSheet`; run a curtain spike first and gate the rest of the comparison work on it.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Layer catalogue, style building, tile URL templates | Mobile (pure TS in `mobile/src/map/`) | API (copy of the same constants for pack styles) | Tiles are fetched by the phone; the API only republishes tiny styles because Android reads pack styles from http(s) only |
| Base and overlay rendering, curtain | Mobile (native MapLibre views) | none | Pure client rendering, no data from the API |
| Tiles and licences | External (IGN Géoplateforme WMTS) | none | No key, no quota on WMTS; the app never proxies tiles |
| Offline packs per layer | Mobile (native `OfflineManager`) | API (`GET /v1/map-styles/<layer>.json`, Android only) | One native pack per style, created from an http(s) style on Android |
| Offline policy setting | Mobile storage (`local_meta` key) | Mobile Settings screen | Device preference, never synced, SQLite stays at version 5 |
| Layer availability offline | Mobile (native pack metadata) | Mobile storage (`offline_areas`) | The native pack metadata already records the area id; it gets a layer key |
| Download percentage | Mobile (`useOfflineAreas` + `DownloadStatusView`) | none | Native progress events aggregated on the phone |

## Standard Stack

### Core (all already installed, no new package)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@maplibre/maplibre-react-native` | 11.4.0 [VERIFIED: node_modules package.json] | Maps, raster sources, offline packs | Already the map stack; native MapLibre Android 13.6.1 opengl [VERIFIED: android/gradle.properties] |
| `react-native-reanimated` | 4.5.1 [VERIFIED: mobile/package.json] | Curtain handle position as a shared value, wrapper width on the UI thread | Project motion rules (`ReduceMotion.System`) |
| `react-native-gesture-handler` | ~2.32.0 [VERIFIED: mobile/package.json] | Pan gesture on the curtain handle (`GestureHandlerRootView` is already at the app root, `App.tsx:167`) | Already installed and rooted |
| `expo-sqlite` (`local_meta`) | ~57.0.3 | Offline policy persistence | Same pattern as `storage/map-preference.ts` |
| `@nestjs/*` (API) | 11 | `GET /v1/map-styles/<layer>.json` for Android packs | Existing `MapStylesController` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Two synchronised `Map` views for the curtain | One map with clipped raster | Not possible in this library version: raster paint properties are `PropertyValueSpecification` (not data-driven) and style-spec 26.2.1 has no raster clip layer [VERIFIED: `maplibre-gl-style-spec/dist/index.d.ts`] |
| One native pack per layer | One pack with one composite style holding every source | One percentage for free, but all-or-nothing, no per-layer cost, no per-layer availability, a transient failure fails everything |
| Overlays as child components (`RasterSource` + `Layer`, like `CadastreLayer`) | Overlays inside `mapStyle` | Changing `mapStyle` reloads the whole style (visible flash); a child source is added without a reload |

**Installation:** none. **Package Legitimacy Audit:** no external package is added in this phase, so the seam check has nothing to run; every name above comes from `mobile/package.json` / `api/package.json` and the lockfile.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none added) | - | - | - | - | - | No install in this phase |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## IGN layers: verified facts and legal terms (success criterion 1)

All values below were fetched on 2026-10-11 from `data.geopf.fr` (capabilities document, tiles, CSW metadata records). Tile numbers: Fontainebleau forest, z14 x=8314 y=5667 (centre 48.4073 N, 2.6917 E).

### Tile URL templates that work with MapLibre raster sources [VERIFIED: curl against data.geopf.fr]

Common base: `https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}` plus:

| App layer | `LAYER=` | `FORMAT=` (exact) | Source `maxzoom` | Tile at z14 (curl) | Coverage (capabilities bbox + record) |
|-----------|----------|-------------------|------------------|--------------------|---------------------------------------|
| Etat-major 1820-1866 | `GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40` | `image/jpeg` | 15 | 200, 18 368 B | Metropolitan France of the time, lon -6.09..10.96, lat 41.18..51.27. Guadeloupe and London answer 404 |
| Carte 1950 (SCAN 50) | `GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950` | `image/jpeg` | 15 | 200, 27 329 B | Metropolitan and overseas except French Polynesia and Wallis and Futuna (record). Guadeloupe 200 |
| Photos 1950-1965 | `ORTHOIMAGERY.ORTHOPHOTOS.1950-1965` | `image/png` (jpeg gives 400) | 18 | 200, 56 920 B (8-bit grayscale PNG) | Metropolitan, overseas departments and regions and overseas collectivities except French Polynesia; French Guiana partial (capabilities abstract). London 404 |
| BD Forêt V2 | `LANDCOVER.FORESTINVENTORY.V2` | `image/png` (RGBA, transparent outside forest) | 16 | 200, 9 838 B | Metropolitan France, lon -5.15..9.57, lat 41.33..51.10 (Corsica inside). Guadeloupe and London 404 |

Pitfalls verified on the service:
- Wrong `FORMAT` answers `400 InvalidParameterValue "Format image/png unknown"` (1950 photos asked in jpeg, état-major asked in png).
- `TILEMATRIXSET=PM` works for all four; the limited sets (`PM_6_15`, `PM_3_15`, `PM_0_18`, `PM_6_16`) give the same bytes. `STYLE=normal` works for all four; the `SCAN50_1950` and `BDORTHOHISTORIQUE` styles give the same or near-same image. Use `PM` and `normal`.
- Past the layer's maximum tile zoom the answer is `404` (z16 for the two old maps, z19 for the 1950 photos, z17 for BD Forêt). Declaring `maxzoom` on every source is therefore mandatory: MapLibre then overscales the last tile instead of requesting missing ones.
- Tile `Cache-Control: private, max-age=1814400` (21 days).
- The sample sheet 28-layers-sample-sheet.html matches these layers.

### Real tile weights (14 random tiles per zoom in the 4 x 4 km Fontainebleau area) [VERIFIED: curl]

| Layer | z14 | z15 | z16 | z17 | z18 |
|-------|-----|-----|-----|-----|-----|
| Orthophoto (existing, jpeg) | 15.4 KB | 16.0 KB | 17.1 KB | 15.0 KB | 12.9 KB |
| Cadastre (existing, png) | - | 12.1 KB | 18.5 KB | 10.6 KB | 5.6 KB |
| Etat-major (jpeg) | 16.4 KB | 13.5 KB | - | - | - |
| Carte 1950 (jpeg) | 24.8 KB | 17.9 KB | - | - | - |
| Photos 1950-1965 (png) | 53.7 KB | 55.6 KB | 53.9 KB | 51.3 KB | 42.0 KB |
| BD Forêt (png) | 15.6 KB | 8.0 KB | 5.4 KB | - | - |
| Plan IGN vector tile (pbf, 512) | z13 99 KB | z14 73 KB | z15 26 KB | z16 7.7 KB | z17 3.6 KB |

Variation by place (z16 unless stated, 8 tiles each): photos 1950-1965 49.5 to 60.7 KB everywhere (stable, about 15 %); orthophoto 5.7 KB (Beauce) to 19.5 KB (Paris); cadastre z17 4.6 KB (Beauce) to 36 KB (Paris, 3.4 times the forest); BD Forêt 0.9 to 6.4 KB. Estimates are therefore trustworthy for the photos and loose (up to 3 times in a city) for cadastre and orthophoto.

### Licence and usage terms

| Layer | Licence | Source | Usage limit | Status |
|-------|---------|--------|-------------|--------|
| Etat-major (`IGNF_SCAN-EM-40K`) | "Licence Ouverte / Open License (compatible ODC-BY, CC-BY 2.0)", access constraint "Aucune contrainte" | CSW record on data.geopf.fr | WMTS not limited | Usable |
| Carte 1950 (`IGNF_SCAN-50-HISTO`) | same | same | same | Usable |
| Photos 1950-1965 (`IGNF_BD-ORTHO-HISTO`) | same | same | same | Usable |
| BD Forêt V2 (`IGNF_BD-FORET`) | same, link to the Etalab open-licence PDF | same | same | Usable |
| Existing: Plan IGN, BD ORTHO, parcellaire | same | same | WMTS not limited; vector tiles (TMS) 400 requests/s per IP | Already used |

- Default licence: the Géoplateforme CGU (version of 15 October 2024) state that data in the APIs follow the licence chosen by the data provider and, failing one, "la Licence Ouverte / Open Licence - Etalab s'applique" [CITED: https://cartes.gouv.fr/cgu/]. The Licence Ouverte grants free reuse including commercial and requires mentioning the source and the date of the last update of the information, without implying official endorsement [CITED: https://www.data.gouv.fr/pages/legal/licences/etalab-2.0, via search summary; text of the Etalab Licence Ouverte 2.0].
- Rate limit: the usage-limits page (modified 7 August 2026) lists WMS-Raster 40/s, WMS-Vector 50/s, WFS 30/s, download 10/s, and states that rate limiting does not apply to the WMTS raster API or its TMS counterpart; the CGU table gives vector TMS 400/s. 429 blocks last 5 seconds [CITED: https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/limites-d-usage/ and https://cartes.gouv.fr/cgu/].
- Bulk offline downloads: the CGU hold no passage that allows or forbids caching or offline copies, and do not use the phrase "usage raisonnable"; they only forbid use that harms or distorts the APIs and let IGN limit or block abusive use ("usage abusif") [CITED: https://cartes.gouv.fr/cgu/]. The Licence Ouverte itself grants the right to reproduce and copy. So offline packs of a 4 x 4 km area per survey are covered; there is no written IGN statement about bulk tile downloads. Risk is low, confidence MEDIUM. Downloads must stay sequential per layer and be cached natively (the native downloader limits itself to 20 concurrent requests, `DEFAULT_MAXIMUM_CONCURRENT_REQUESTS = 20` [VERIFIED: maplibre-native constants.hpp]).
- Attribution wording: the CGU contain no required wording. Reuse the existing pattern (`fr.publicMap.legend.attribution`: "Fonds de carte et cadastre : © Institut national de l'information géographique et forestière (IGN), Géoplateforme. Carte : MapLibre.") and extend it with the layers in use. Because the Licence Ouverte asks for the date of last update, add per-layer vintage text in the layer panel: état-major "levés de 1825 à 1866, mises à jour jusqu'en 1889" ; carte 1950 "cartes au 1 : 50 000, dernière édition disponible vers 1959" ; photos "1950 à 1965, en niveaux de gris" ; BD Forêt "élaborée de 2007 à 2018, millésime variable selon le département, plages de 0,5 ha au moins" (all from the CSW abstracts).
- Blocked layers: none. Open point for the owner: nothing legal, but BD Forêt V2 is a 2007-2018 vintage and does not map stands under 0.5 ha (5000 m2): say so in the panel so it is not read as current.

## Architecture Patterns

### System Architecture Diagram

```
Settings (Paramètres > Cartes)                      Explorer (PublicMapScreen)
  row "Couches hors ligne" ----> local_meta           top-right capsule: [plan/satellite] [layers-outline] [download]
  key offline_layers_policy                                   |
  "base" | "all" (default all)                                 v  (layers-outline = study mode, explore unchanged)
              |                                        StudyPanel in ExplorerSheet (one sheet for all panels)
              |                                        base A pick, overlays (BD Forêt), "Comparer" + base B pick
              v                                                |  state: { base, overlays, compareWith } (ephemeral)
 useOfflineAreas.startDownload                                 v
   layersForPolicy(policy) --> [map, satellite, (etat-major, carte-1950, photos-1950, bd-foret)]
   estimateAreaDownload(bounds, layers)  <-- weights from catalogue (measured)            MapCanvas
   sequential per layer:                                        |  base A:  <Map mapStyle=styleFor(A)> children: overlays, cadastre, parcels, markers
     style source: iOS file/inline, Android GET /v1/map-styles/<layer>.json (API)        |  base B (compare on): second <Map> in clipped wrapper
     OfflineManager.createPack({mapStyle, bounds, 13..17, metadata:{areaId, layer}})     |      camera = jumpTo(A) on A.onRegionIsChanging
   progress: sum(bytesWeight_i x pct_i) / sum(bytesWeight_i), never goes back            |  handle: Gesture.Pan -> shared x -> wrapper left/width
              |                                                                          v
              v                                                              useMapStyle(layer): online remote/inline, offline composite
 DownloadStatusView (bar + "Téléchargement : N %") in the sheet  ------------------->  native MapLibre (tiles from cache by URL offline)
```

### Recommended Project Structure (new or changed)
```
mobile/src/
├── map/
│   ├── layers.ts                 # NEW pure: catalogue (key, tier, WMTS template, format, tile zoom range, weights, i18n key, attribution key)
│   ├── layer-styles.ts           # NEW pure: styleFor(layer), withOverlay(), raster source builder (maxzoom, tileSize 256)
│   ├── offline-estimate.ts       # NEW pure: covering zoom (+1 for 256 px), per-layer tile count and bytes
│   ├── basemaps.ts               # keep BasemapKey = "map" | "satellite" (picker, PDF, existing tests unchanged)
│   ├── offline-packs.ts          # CHANGED: layers list, sequential, weighted progress, PackMetadata {areaId, layer}
│   ├── offline-styles.ts         # CHANGED: only the Plan IGN needs a file; raster layers are inline
│   └── maplibre/styles.ts        # CHANGED: ORTHO template reused from the catalogue
├── hooks/
│   ├── useMapStyle.ts            # CHANGED: layer key input
│   ├── useOfflineAreas.ts        # CHANGED: policy, estimate by layers, weighted progress
│   └── useOfflineLayersPolicy.ts # NEW
├── storage/offline-layers-policy.ts   # NEW, same shape as map-preference.ts
├── screens/public-map/
│   ├── StudyPanel.tsx, LayerRow.tsx, CurtainCompare.tsx, useStudyMode.ts   # NEW (keep PublicMapScreen under 400 lines)
│   └── MapControls.tsx           # CHANGED: third capsule button
└── i18n/fr/map-layers.ts         # NEW catalogue file (IGN written out here)
api/src/surveys/map-styles.service.ts   # CHANGED: layer names, raster styles (no fetch), parity test
```

### Pattern 1: one catalogue entry describes everything
**What:** a layer is data: key, tier (`base` | `extra`), kind (`vector-plan` | `raster` | `overlay`), `layer`/`format`, tile zoom range, measured weight per tile zoom, French name key, attribution key, vintage key.
**When to use:** every place that today switches on `"map" | "satellite"` (styles, packs, estimates, API styles, panel rows).
```typescript
// Source: verified templates above; same shape as the existing ORTHO_TILES in mobile/src/map/maplibre/styles.ts
const wmts = (layer: string, format: "image/jpeg" | "image/png") =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=${layer}&STYLE=normal&FORMAT=${format}&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`

export function rasterSource(entry: RasterLayer): RasterSourceSpecification {
  return {
    type: "raster",
    tiles: [entry.tiles],
    tileSize: 256, // IGN tiles are 256 px: MapLibre then uses tile zoom = map zoom + 1
    minzoom: entry.minTileZoom, // 0
    maxzoom: entry.maxTileZoom, // 15, 15, 18 (17 offline, see below), 16: never request what the service answers 404 to
    attribution: entry.attribution,
  }
}
```

### Pattern 2: bases through `mapStyle`, overlays as children, cadastre and parcels on every map
**What:** changing the base swaps `mapStyle` (as plan/satellite does today); BD Forêt is a `RasterSource` + `Layer` child like `CadastreLayer` (`mobile/src/map/maplibre/CadastreLayer.tsx`) so toggling never reloads the style. Z-order: base, BD Forêt, cadastre, parcel fill and outline, markers.
**Why:** `useMapStyle` already returns `cadastreInStyle` for the offline composite; keep that flag and add nothing else to the style.

### Pattern 3: one native pack per layer, sequential, weighted percent
**What:** `OfflineManager.createPack` takes one `mapStyle` string, so a style with several sources downloads all of them (the downloader iterates `parser.sources` whatever the layer visibility [VERIFIED: offline_download.cpp]). Per-layer packs give per-layer cost (`status.completedResourceSize`), per-layer availability (pack metadata) and failure isolation. Run them one after the other (each already opens up to 20 requests), and compute
`percent = sum(w_i * pct_i) / sum(w_i)` with `w_i` the estimated bytes of layer i; keep the existing "the bar only moves on" guard in `useOfflineAreas` (`shownPercentage = Math.max(...)`).
The first pack is always the Plan IGN with the cadastre (it carries the cadastre tiles, glyphs and sprite); the other packs carry only their raster source (the offline database stores a tile once by URL and links it to each region, so the old duplicate cadastre in the satellite pack is already shared [VERIFIED: offline_database.cpp `getRegionResource` looks up by URL]).

### Pattern 4 (curtain): see the Curtain section.

### Suggested plan slicing
1. Catalogue + pure builders + estimator + API styles + parity test (no UI).
2. Curtain spike on the Android emulator and the iPhone (go or no-go, fallback decision).
3. Offline: per-layer packs, policy storage and Settings row, estimate, weighted progress, real size capture.
4. Study mode: control, panel, layer switching, overlay, attribution and vintage text.
5. Curtain implementation (only after step 2).
6. Legibility and dark mode pass, docs (api-contract, device checks, licence record), device checks.

### Anti-Patterns to Avoid
- **Estimating raster packs at tile zoom 13 to 17:** the native pack uses 14 to 18 for 256-px sources. Use the covering-zoom function, not `tile-math.ts` `countTilesForBounds` as is.
- **Leaving a source `maxzoom` unset:** MapLibre requests tiles IGN answers with 404 and the map goes blank beyond the layer's zoom.
- **Swapping `mapStyle` to toggle an overlay:** reloads the whole style.
- **Duplicating layer constants in more places:** the API keeps one copy (it cannot import mobile); everything else reads the catalogue.
- **Drawing survey markers on the clipped second map:** `ViewAnnotation` views would show twice or be cut at the curtain; hide markers and clusters while comparing (parcels and cadastre stay on both maps).

## Curtain: sliding comparison of two layers (questions 2 and 9)

**Verdict:** two `Map` views, same camera, the upper clipped by a wrapper. No single-map option exists in this library version.

Evidence:
- Raster paint properties (`raster-opacity`, `raster-brightness-*`, ...) are `PropertyValueSpecification`, not data-driven, so no expression can mask a raster by screen position [VERIFIED: style-spec 26.2.1 `index.d.ts`].
- The style spec bundled with the library has no clip layer type for rasters [VERIFIED: grep of `maplibre-gl-style-spec/dist/index.d.ts`].
- A raster source `bounds` only limits which tiles are requested; it does not clip at pixel level, and moving it per frame mutates the style each frame [ASSUMED from the spec text; not tried].
- Native view clip of one map: a map has one style, so two layers on the same pixels cannot be shown by clipping one view.

API surface available in 11.4.0 [VERIFIED: `src/components/map/Map.tsx`, `camera/Camera.tsx`]: `Map` props `onRegionIsChanging`, `onRegionDidChange`, `dragPan`, `touchZoom`, `touchRotate`, `touchPitch`, `doubleTapZoom`, `androidView: "surface" | "texture"`; `CameraRef.jumpTo({ center, zoom, bearing, pitch })`. On Android the camera-move listener fires an `onRegionIsChanging` event per camera move without throttling (`MLRNMapView.kt` line 526); iOS has `mapViewRegionIsChanging` [VERIFIED].

Recommended structure (layout skeleton):
```tsx
// Container flex 1. x = curtain position in px, a Reanimated shared value driven by Gesture.Pan.
<View style={StyleSheet.absoluteFill}>
  <Map /* A: interactive, the same MapCanvas as today */ onRegionIsChanging={syncB} onRegionDidChange={syncB}>...</Map>
  <Animated.View pointerEvents="none" style={[styles.clip, wrapperStyle /* left: x, right: 0, overflow: "hidden" */]}>
    <Animated.View style={[styles.fullWidth, innerStyle /* left: -x, width: screenWidth */]}>
      <Map /* B */ dragPan={false} touchZoom={false} touchRotate={false} touchPitch={false} doubleTapZoom={false}
           androidView="texture" mapStyle={styleB}>
        <Camera ref={cameraB} initialViewState={...} />
        {/* the same cadastre and ParcelPolygonsLayer children as A: B hides A's overlays on the right */}
      </Map>
    </Animated.View>
  </Animated.View>
  <CurtainHandle x={x} /> {/* 44 pt wide hit area, 2 px line, outline glyph, GestureDetector */}
</View>
// syncB: cameraB.current?.jumpTo({ center, zoom, bearing: 0, pitch: 0 }) from the A event
```

Rules and risks:
1. **Camera lag [ASSUMED, spike].** B follows A by one or two frames while A moves (event round trip through JS); at rest they agree after `onRegionDidChange`. Lock north-up and no pitch in compare mode (`touchRotate={false}`, `touchPitch={false}` on A too) so only centre and zoom are synchronised. If the lag is not acceptable on the owner's phone, fallbacks: hide B while a gesture runs and show it on `onRegionDidChange` (a flash), or restrict compare to a still view. The owner excluded the quick toggle, so a fallback change needs a new owner decision.
2. **Android clipping [ASSUMED, spike].** A `GLSurfaceView` (default `androidView="surface"`) may not honour an ancestor's `overflow: hidden`; a `TextureView` does. Use `androidView="texture"` on B (and test whether A must be texture too for z-order). Cost: texture mode is slower and uses more memory on mid-range phones.
3. **Cost on mid-range Android [ASSUMED, spike]:** two GL contexts and two tile caches. Old bases are raster-only styles (light); the Plan IGN vector style is the heavy one. Comparing Plan against a photo layer is the expensive case; measure it on the Pixel 8 emulator and a real mid-range phone.
4. **Gestures:** B has `pointerEvents="none"` so touches reach A; the handle owns its own pan (a thin vertical strip above both maps). The Explorer's bottom sheet and capsule stay above.
5. **Dark mode:** each map takes its own style through `useMapStyle`; the plan keeps the recoloured vector style (`darkenPlanIgnStyle`), photos and old maps are not recoloured (see Legibility).
6. **Over-zoom:** the old maps top out at tile zoom 15, which is map zoom 14 at native sharpness (256-px tiles, +1 offset); at map zoom 16 or 17 they are scaled 4 to 8 times. This is the accepted behaviour; with `maxzoom` set MapLibre never goes blank. A small hint ("fond peu détaillé à cette échelle") above map zoom 15 is optional.
7. **Reduce Motion:** the handle follows the finger (no animation to disable); any snap or entrance uses `brandMotion` with `ReduceMotion.System`.

## Offline cost (question 4)

**How the native downloader sizes a pack** [VERIFIED: maplibre-native `offline_download.cpp` and `tile_cover.cpp`, `main` branch read 2026-10-11; the library pins native 13.6.1, device confirmation still advised]:
- `coveringZoomLevel(zoom, type, tileSize)` adds `log2(512 / tileSize)`: a 256-px raster source gets tile zoom = `round(packZoom + 1)`; vector sources (512) get `floor(packZoom)`. Then it is clamped to the source's min/max zoom.
- So the existing satellite pack (source maxzoom 19) downloads tile z14 to z18, the cadastre (min 15) z15 to z18, the Plan IGN vector z13 to z17.
- Every source of the style is downloaded whatever the layer visibility. A 404 tile is skipped and subtracted from the required count (the percentage still reaches 100); any other error (a 400) leaves the request pending (see Pitfall 3).
- No tile count limit applies (the limit exists for Mapbox tile servers only).
- Glyphs: 6 font stacks x up to 256 ranges; measured 0.52 and 0.56 MB per stack (Regular and Bold, 19 non-empty ranges each) so about 3.3 MB; sprite about 0.7 MB (the PNG is 320 570 B at both ratios); style JSON 287 KB. This fixed part is stored once and shared by every area.

### Table: one 4 x 4 km area (2 km radius, the survey prompt), pack zooms 13 to 17, Fontainebleau [VERIFIED: tile counts computed with the repo's own `lonToTileX`/`latToTileY` formulas; weights measured by curl]

| Layer | Tile zooms in the pack | Tiles | Avg bytes per tile | MB per area |
|-------|-----------------------|-------|--------------------|-------------|
| Plan IGN (vector tiles) | z13-17 | 549 | 99/73/26/7.7/3.6 KB | 4.2 (+ about 4.3 shared fixed: style, sprite, glyphs) |
| Orthophoto (existing) | z14-18 | 2145 | 13 to 17 KB | 29.0 |
| Cadastre (existing, in the first pack, shared) | z15-18 | 2136 | 5.6 to 18.5 KB | 15.5 |
| Etat-major 1820-1866 | z14-15 | 45 | 16.4 / 13.5 KB | 0.6 |
| Carte 1950 | z14-15 | 45 | 24.8 / 17.9 KB | 0.9 |
| BD Forêt V2 | z14-16 | 145 | 15.6 / 8.0 / 5.4 KB | 1.0 |
| Photos 1950-1965, maxzoom 18 | z14-18 | 2145 | 42 to 56 KB | **95.6** |
| Photos 1950-1965, offline maxzoom 17 | z14-17 | 545 | 51 to 56 KB | 28.4 |
| Photos 1950-1965, offline maxzoom 16 | z14-16 | 145 | 54 to 56 KB | 7.9 |

| Total | MB (4 x 4 km) | MB (9 x 9 km, the largest area under today's 3000-tile cap) |
|-------|---------------|----------------------------------------------------------|
| Base maps only (Plan + orthophoto + cadastre) | about 53 | about 255 |
| All layers, photos at z18 | about 151 | about 756 |
| All layers, photos capped at z17 offline | about 84 | about 416 |
| All layers, photos capped at z16 offline | about 63 | about 307 |
| What the app shows today for this area (`estimateAreaDownload`: 549 x 2 x 20 000 B) | 22 | 116 (2901 x 2 x 20 KB) |

Reading:
- **No layer other than the 1950 photographs matters:** the three other additions (état-major, carte 1950, BD Forêt) together are 2.5 MB per area. The photographs are 63 % of "all layers".
- **The existing estimate is wrong, independent of this phase:** it assumes tile zoom 13 to 17 and 20 KB a tile (`AVERAGE_TILE_BYTES`, `MIN/MAX_TILE_ZOOM` in `tile-math.ts`). For today's two packs the real figure is about 2.4 times higher. Replace the estimator by the catalogue-based one so the number shown before a download is honest (success criterion 4: "the estimated weight is shown before a download").
- **Recommendation:** keep "all layers" as default as decided, and set the offline `maxzoom` of the 1950 photographs to 17 (online stays 18). The map overscales one level offline, the area drops from about 151 to about 84 MB. This changes an owner-stated zoom ceiling for one layer, so it needs one owner confirmation (Open Question 1). Without the cap nothing breaks; the cost is 96 MB per survey area for a context layer.
- Weights vary by place (see variation above); show the figure as "environ N Mo" and keep a measured constant per layer and tile zoom with the date and sample in a comment.
- Time is unmeasured; on cellular the 151 MB default is heavy, the estimate before the download is the only guard (owner: no cap).

### Real cost measurement (criterion 4)
- The progress callback gives `completedResourceSize` and `requiredResourceCount` per pack [VERIFIED: `OfflinePackStatus` in `OfflinePack.ts`]. Capture the final `completedResourceSize` of each pack and (a) write the sum into `offline_areas.estimated_bytes` at `finalizeOfflineArea` (no schema change; `useOfflineAreasSummary` and the Settings row then show a real figure), (b) emit one `logStatusDetail` line per layer in development builds, (c) record the measured per-layer table in a doc (device check) after one download on the owner's phone. This turns the 2.4x finding from derived to confirmed.

## Pack architecture and Android (question 4, continued)

- One native pack per style: `createPack({ mapStyle: string, bounds, minZoom, maxZoom, metadata })` [VERIFIED: `OfflineManager.ts`].
- **Android needs http(s) pack styles** (finding F-3, 2026-10-11): `packStyleFor(os, apiUrl, basemap, styleFileUri)` returns `${apiUrl}/map-styles/${basemap}.json`; the API serves only `map` and `satellite` (`api/src/surveys/map-styles.service.ts`, `OFFLINE_STYLE_NAMES`). Each new layer needs an API style name: `etat-major`, `carte-1950`, `photos-1950`, `bd-foret` (raster-only styles built in the API, no fetch, no cache). Update `api/test/map-styles.spec.ts`, `docs/technical/api-contract-v1.md` (section `GET /map-styles/{map|satellite}.json`), and the controller comment. The API is deployed by a registry-polling timer after merge: a new mobile build calling a style the old API does not know gets 404 on Android, so a layer pack failure must never fail the area (see Pitfall 4).
- The API copy of the constants is the one unavoidable duplication (already the case for `ORTHO_TILES` and `CADASTRE_TILES`). Add one parity test so the two copies cannot drift: either the mobile catalogue is a pure file the API spec imports by relative path, or the spec compares the four WMTS templates to a literal list in both test suites (planner chooses; Open Question 5).
- Metadata: `PackMetadata` becomes `{ areaId, layer }`; `isPackMetadata` currently accepts only `basemap` in `map | satellite`. Project memory says prod data and installed clients are test data, so no migration of old packs is needed [CITED: project memory prod-is-test-data].
- Per-layer availability offline: read the layers of the area covering the view centre from `OfflineManager.getPacks()` metadata (`resolveOfflineAreaForPoint` already picks the area); no SQLite table is needed. Layers without a pack are shown disabled with a short reason ("non téléchargé"). The 2-level policy is a setting for future downloads only: say so in the setting text; existing areas keep what they have.
- iOS may keep writing a style file; raster layer styles can be inline objects for display (`mapStyle` accepts `StyleSpecification`) so only the Plan IGN style still needs a file (`writeOfflineStyle` for `map`).

## Criterion 5: percentage in the Explorer sheet (question 5)

Today [VERIFIED: code read]:
- `PublicMapScreen` renders `OfflineAreasSheet` in the one `ExplorerSheet`. After "Télécharger la zone affichée", `useOfflineAreas.startDownload` sets `downloadStatus = { phase: "running", ... percentage }` at once; the sheet hides the form and shows `DownloadStatusView`: area name, `ProgressBar` (`variant="slide"`, testIDs `offline-download-bar`), "Téléchargement : N %" (`fr.offlineMap.areas.running.percent`), "N sur M tuiles", a 25 % step announcement for screen readers, then the "done" and "failed" states. Built in commit c257d4eb on 2026-10-08, before the 2026-10-10 decision that created criterion 5.
- The catalogue already holds `running.percent`, `running.tiles`, `running.a11y.*`, `prompt.downloading(percent)`.
- The only indeterminate piece left is the form button label "Téléchargement…" (`t.downloading`), which is hidden under the status the moment the status is set.

So criterion 5 is satisfied inside the open sheet. What is still missing:
1. **Closed sheet:** dragging the sheet down mid-download (`closeSheet`) leaves the download running with no sign in the Explorer; the percentage is visible only if the panel is reopened (`openOfflineAreas` keeps a running status). Add a passive indicator: the capsule's download button shows a ring or a short "N %" chip while `downloadingAreaId !== null`.
2. **Multi-layer percentage:** `downloadAreaPacks` averages pack percentages equally (`entries.reduce(... ) / entries.length`). With layers of 1 MB and 96 MB an equal mean is meaningless; weight by estimated bytes and run sequentially (Pattern 3). The tile figure under the bar (`downloadedTiles` derived from the percentage against `estimate.totalTileCount`) must come from the same estimator.
3. **Native percentage can jump or regress:** it is `completed / required` and `required` grows while the style and TileJSON resolve (`requiredResourceCountIsPrecise`); the existing max-hold guard stays.
4. **Android proof:** F-3 was fixed and checked on the emulator on 2026-10-11 ("progress passes 0 %"); no real-phone check. Add a device check for the percentage with the new multi-pack flow on both platforms.
5. **Wording:** the roadmap sentence ("not only an indeterminate button") is already true in code; the plan should record criterion 5 as "verified plus the closed-sheet indicator plus weighted percentage", with tests in `DownloadStatusView.test.tsx` and `useOfflineAreas.test.ts`.

## Explorer structure and study mode (question 6)

Current structure [VERIFIED]: `navigation/routes/PublicMapRoute.tsx` (125 lines) owns data and the basemap preference; `screens/PublicMapScreen.tsx` (309 lines) composes `MapCanvas` (181), `MapTopControls` + `MapBottomDock` (`MapControls.tsx`, 113), `ScoreLegend` (bottom left), `DownloadEdgeGlow` and one `ExplorerSheet` (234) whose content is the open panel (`OfflineAreasSheet` or `ClusterListSheet`). The capsule holds the plan/satellite toggle (icon of the target basemap) and, when offline maps are enabled, the download button.

Recommendation, without hiding anything existing:
- Explore mode is the screen as it is today. The capsule gets a third button, `layers-outline`, opening the study panel in the same `ExplorerSheet` (panels are mutually exclusive: opening one clears the others, as `closeSheet` already assumes). No new top-level screen, no tab.
- Study mode = state `{ base, overlays, compareWith }` plus the panel; the plan/satellite capsule button keeps working and sets the base. While study mode is open nothing is removed; comparing hides markers and clusters only (they cannot be drawn on the clipped second map), parcels and cadastre stay on both maps.
- Panel content: base list (Plan, Satellite, Etat-major, Carte 1950, Photos 1950-1965) with the vintage line, an overlay toggle (BD Forêt), "Comparer" with a second base picker, attribution line. Offline: layers without a downloaded pack shown disabled.
- **400-line cap** (`src/__checks__/structure.test.ts` over `src/screens` and `src/navigation`, tests exempt): `PublicMapScreen.tsx` has about 90 lines of room. Put study state in `useStudyMode.ts`, the panel in `StudyPanel.tsx`/`LayerRow.tsx`, the curtain in `CurtainCompare.tsx`; `MapCanvas` takes `studyState` props or the curtain wraps two canvases. Do not grow `PublicMapScreen.tsx` beyond the wiring.
- Keep `BasemapKey = "map" | "satellite"` (parcel picker `SurveyParcelSelectionScreen`, `ParcelMap`, PDF `map-snapshot.ts`, `map-preference.ts` stay unchanged); the study layers use a new `MapLayerKey`.
- Icons (all exist in Ionicons, all `-outline` [VERIFIED: glyph map]): `layers-outline` (study), `git-compare-outline` (compare), `swap-horizontal-outline` or `resize-outline` (curtain handle), `time-outline` (vintage), `cloud-download-outline`, `leaf-outline`.
- Layer names (French, discretion): "Plan", "Satellite", "Carte d'état-major (1820-1866)", "Carte de 1950", "Photos aériennes (1950-1965)", "Forêt : types de peuplement". Avoid "BD", "V2", "SCAN" and a bare "IGN" in names (abbreviation gate, below).

## Settings (question 7)

- The only settings screen is `Paramètres`: `mobile/src/screens/SettingsScreen.tsx` (209 lines) wired by `navigation/routes/SettingsRoute.tsx`; its "Cartes" section (`fr.settings.maps`) already holds the "Cartes hors ligne" row (`AppGroupedList` nav row with icon, label, value). "Account settings" in the decision therefore means this screen; the Compte screen is the profile (Open Question 6).
- Preferences live in the SQLite `local_meta` key/value table (no migration): `map_basemap` (`storage/map-preference.ts`: `loadBasemapPreference`/`saveBasemapPreference`, `INSERT ... ON CONFLICT DO UPDATE`), `search_recents`, `parcel_history:<ID>`, onboarding flag, profile cache. SecureStore holds tokens only. `clearLocalIbpData` deletes owner/search/history keys but leaves `map_basemap`; leave the policy alone too (a device preference).
- Add `storage/offline-layers-policy.ts` (`OFFLINE_LAYERS_POLICY_KEY = "offline_layers_policy"`, values `"base" | "all"`, default `"all"`, unknown value falls back to default) and `hooks/useOfflineLayersPolicy.ts` mirroring `useBasemapPreference`. SQLite `user_version` stays 5.
- Control: a nav row in "Cartes" whose value is the current level, opening `AppActionSheet` (`ui/AppActionSheet.tsx`: native `ActionSheetIOS` on iOS, a modal on Android) with the two levels; footer text states the estimated weight order of magnitude and that it applies to future downloads. French wording (proposal): row "Couches hors ligne", values "Toutes les couches" and "Fonds de carte seulement".
- Who reads it: `useOfflineAreas` (estimate and download; also used by `useOfflineMapPrompt`, so the 2 km survey prompt follows the policy and its "environ 2 km autour, N Mo" figure grows about 3 to 7 times: Open Question 2) and `OfflineAreasRoute`. Tabs stay mounted, so re-read the policy when the Explorer or the prompt opens, not once at mount.

## Legibility on the new bases and dark mode (questions 8 and 9)

Today [VERIFIED]:
- Cadastre: raster from `CADASTRE_TILES`, `raster-opacity` 0.9, min zoom 15, added to every composite style (`withCadastre`) or as a child (`CadastreLayer`, default opacity 0.9).
- Parcels: one GeoJSON source `parcels`, a `parcels-fill` and a `parcels-outline` layer, colours per feature from `brandMapTokens` (`parcel-features.ts`): selected terracotta (fill alpha 0.30, width 3), studied moss (alpha 0.22), neutral sage (alpha 0.16), unscored warm grey `#8C847A` (alpha 0.22), width 2; Explorer fills by score band.
- Dark: only the Plan IGN has a dark variant; `darkenPlanIgnStyle` flips the lightness of every `*-color` paint property (hue and alpha kept, saturation x0.75, lightness 0.08 + (1 - l) x 0.8 clamped 0.08..0.88), puts a `basemap-dark-ground` background (`brandMapTokens.darkBasemapBackground` `#0E1512`) under the layers and leaves sources, sprite and glyphs alone so one pack serves both themes. The orthophoto is not recoloured in dark.

What the new bases change (judgement, to settle on a device):
1. **Pale sepia state map and 1950 map:** the sage neutral stroke (`#B0C78E`) and low fills may nearly vanish on cream paper. Give parcel outlines a thin light "casing" line under `parcels-outline` on every non-plan base (a `line` layer with `line-width: ["+", ["get","strokeWidth"], 2]`) or raise the neutral stroke width by 1; colours come from tokens (hex and `rgba(` literals are only allowed in the five token files), so add a `parcelCasing` entry to `brand-tokens.ts`.
2. **1950 photographs are grayscale:** moss, terracotta and score colours stay readable; no change expected beyond the casing.
3. **BD Forêt over a base:** its categories are green, orange and violet and clash with score colours (green means a high score). Draw it under the cadastre and parcels, default `raster-opacity` about 0.55, and never under the parcel fill without the casing. Offer it as an overlay (as decided), not as a replacement for the parcel layer.
4. **Cadastre opacity:** 0.9 is fine on the Plan and photographs; on the état-major and 1950 maps its dark lines compete with the map's own linework: test 0.7 there (a per-layer token in the catalogue).
5. **Dark mode for rasters:** `raster-brightness-max`, `raster-saturation` and `raster-contrast` exist in the paint spec and are static properties, so a per-scheme constant works: dimming the pastel state map and the 1950 map (for example brightness-max 0.8) is cheap and consistent with the dark UI; the photographs stay untouched like today's orthophoto. Values are LOW confidence until seen on a device; put them in `theme-visual.ts` per scheme (numbers, not hex).
6. **Controls over a map** keep a dense surface (`theme.visual.mapControl.glass` or `mapPanel`): all bases stay light in dark mode except the recoloured plan, as the rule in CLAUDE.md already says. The curtain handle takes the same dense surface and an outline glyph.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tile covering and counting | Own pyramid math | `lonToTileX`/`latToTileY`/`countTilesForZoom` in `tile-math.ts` plus a covering-zoom function | Already tested; only the zoom mapping is new |
| Curtain gesture and position | `PanResponder` + `Animated` (gated by `motion.test.ts`) | `Gesture.Pan` (gesture-handler) with a Reanimated shared value | UI-thread updates, `ReduceMotion.System` rules |
| Map clipping | Snapshots of one map pasted over the other | Two live `Map` views and `overflow: hidden` | Snapshots lag and cost memory |
| Download bar and states | A new progress UI | `DownloadStatusView`, `ProgressBar`, `AppActionSheet`, `AppGroupedList` | Already styled, announced and tested |
| Preference storage | A new table or a migration | `local_meta` key/value as in `map-preference.ts` | Schema stays at 5 |
| Style recolouring in dark | A second raster pipeline | Static `raster-brightness-max` per scheme | One number per layer |
| Pack percent across packs | Averaging percentages | Weighted by estimated bytes, plus the existing max-hold | Layers differ by 100 times |
| WMTS capabilities parsing in the app | Runtime GetCapabilities | Constants in the catalogue, checked by a test against the verified templates | The service parameters are fixed and verified |

**Key insight:** the hard parts (tile storage, downloading, retry, cache sharing, rendering) are native MapLibre; the app only chooses sources, sizes and orders the work, and tells the truth about weight.

## Common Pitfalls

### Pitfall 1: the +1 zoom offset makes every raster estimate and cap wrong
**What goes wrong:** the shown "~22 Mo" is about 53 MB in reality; "all layers" becomes 151 MB; the 3000-tile cap does not bound raster size (the 9 x 9 km area is 10 985 orthophoto tiles).
**Why:** 256-px sources are downloaded at tile zoom = pack zoom + 1.
**How to avoid:** one covering-zoom function used by the estimator, the catalogue weights and the tests. Keep the area-size cap on the viewport (today's rule), and show the MB.
**Warning signs:** `completedResourceSize` of a finished pack far above the estimate.

### Pitfall 2: wrong `FORMAT` or missing `maxzoom`
**What goes wrong:** blank layer (400) or blank beyond zoom 15, and a pack that logs errors.
**How to avoid:** the exact formats in the table; `maxzoom` on every source; a catalogue test asserting each template and zoom range.

### Pitfall 3: a non-404 tile error can leave a pack stuck below 100 %
**What goes wrong:** in `offline_download.cpp` only `NotFound` removes the request and decrements the required count; any other error returns without freeing the request slot, so the pack can sit "active" at 99 %. During this research 2 of about 870 WMTS requests answered `400 "Layer LANDCOVER.FORESTINVENTORY.V2 unknown"` for tiles that answer 200 a moment later (both BD Forêt); a pack of thousands of tiles could meet some.
**Why it matters:** the app only fails a pack when it goes `inactive`; a hang shows as a bar that never ends.
**How to avoid:** [ASSUMED, not reproduced on a device] add a per-pack stall watchdog (no progress for about 45 s at 90 % or more: accept the pack as complete with a logged warning, or restart it), and treat a failed or stalled extra-layer pack as non-fatal. Repeat the all-layers download 3 times in the device check on BD Forêt.

### Pitfall 4: optional layers must never fail the area
**What goes wrong:** the default is "all layers"; one extra layer failing (API without the new style on Android, IGN glitch) would delete the area (today `downloadAreaPacks` rejects as a whole and `useOfflineAreas` deletes it).
**How to avoid:** the base packs (Plan with cadastre, orthophoto) are required; extra layers are best effort, the area is `ready` with the packs that completed, and the study panel lists what is there.

### Pitfall 5: abbreviation gate on layer names
`src/__checks__/abbreviations.test.ts` reads every catalogue string: "BD", "V2", "SCAN", "WMTS" would fail; "IGN" is allowed only if its long form ("Institut national de l'information géographique et forestière") occurs in the same catalogue file. Write layer names in plain French and keep the attribution (with the long form) in `fr/map-layers.ts`. No em dash anywhere in `mobile/src` (`catalogue-dash.test.ts`).

### Pitfall 6: coverage ratchet on `src/map`
`mobile/jest.unit.config.js` has `global: { statements: 100, lines: 100 }`, and `src/map/` has no path override, so every new file under `mobile/src/map/` needs 100 % statement and line coverage in CI (`npm run test:unit:coverage`). Keep pure logic in `src/map/` fully tested; screens and hooks have lower floors.

### Pitfall 7: markers and clusters on the clipped map
`ViewAnnotation` views belong to one map. Hide markers while comparing; do not render a second set.

### Pitfall 8: a style swap resets overlays and flashes
Use child sources for overlays; swap `mapStyle` only for the base.

## Code Examples

### Covering zoom, estimate (pure, `src/map/offline-estimate.ts`)
```typescript
// Source: maplibre-native tile_cover.cpp coveringZoomLevel + offline_download.cpp coveringZoomRange
const TILE_SIZE_UNIT = 512
export function coveringZoomRange(
  packMin: number, packMax: number,
  tileSize: number, source: { minzoom: number; maxzoom: number },
  type: "raster" | "vector",
): [number, number] {
  const offset = Math.log2(TILE_SIZE_UNIT / tileSize)
  const round = type === "raster" ? Math.round : Math.floor
  return [Math.max(round(packMin + offset), source.minzoom), Math.min(round(packMax + offset), source.maxzoom)]
}
// layer bytes = sum over z in range of countTilesForZoom(bounds, z) * layer.avgTileBytes[z]
```

### Preference storage (pattern of `storage/map-preference.ts`)
```typescript
export const OFFLINE_LAYERS_POLICY_KEY = "offline_layers_policy"
export type OfflineLayersPolicy = "base" | "all"
export const DEFAULT_OFFLINE_LAYERS_POLICY: OfflineLayersPolicy = "all"
// load: SELECT value FROM local_meta WHERE key = ?  (unknown or missing -> default)
// save: INSERT INTO local_meta (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
```

### Weighted progress (pure, in `offline-packs.ts`)
```typescript
// done packs count 100, the running pack its native percentage, the rest 0; weights = estimated bytes
const percentage = layers.reduce((sum, l, i) => sum + l.weight * entries[i].percentage, 0) / totalWeight
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `geoservices.ign.fr` usage pages and "Géoportail" keys | `cartes.gouv.fr` CGU and help; no key for these services | 2024 to 2026 (`geoservices.ign.fr/usages` now 301-redirects to `cartes.gouv.fr`) | Cite cartes.gouv.fr, not the old site |
| Per-basemap pack with a duplicated cadastre | Cadastre in the first pack only; native DB shares tiles by URL | this phase | Lower stored size, same behaviour |
| Estimate = tiles z13 to 17 x 20 KB | Covering-zoom estimator with measured weights | this phase | The number shown becomes honest |

**Deprecated/outdated:** the assumption in 08-CONTEXT D-06 ("a documented assumption, not a measured average", `AVERAGE_TILE_BYTES = 20 000`) is superseded by the measurements above.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A `GLSurfaceView` map may ignore an ancestor's `overflow: hidden`; `androidView="texture"` clips correctly | Curtain | Curtain shows unclipped on Android; spike decides |
| A2 | One or two frames of camera lag between the two maps is acceptable | Curtain | Visible mis-registration while panning; fallback needs an owner decision |
| A3 | Two GL maps run acceptably on a mid-range Android | Curtain | Plan-vs-photo comparison too slow; limit comparison to raster layers |
| A4 | A non-404 error leaves a pack stuck (read from native source, not reproduced) | Pitfall 3 | Without a watchdog a pack may hang; with one, a harmless extra |
| A5 | The +1 zoom pack size (about 53 MB today, 151 MB all layers) matches a real device pack | Offline cost | Estimates off; mitigated by capturing `completedResourceSize` |
| A6 | Glyph fixed cost about 3.3 MB (extrapolated from 2 of 6 stacks) and sprite about 0.7 MB | Offline cost | Fixed part off by a few MB |
| A7 | No IGN statement forbids bulk offline tile caching (CGU silent; Licence Ouverte grants reproduction) | Licences | IGN could ask to limit; low risk, keep downloads sequential and cached |
| A8 | Dark-mode raster dimming values (brightness-max about 0.8) and cadastre opacity 0.7 on old maps | Legibility | Visual only, tuned on device |
| A9 | Raster source `bounds` cannot clip at pixel level | Curtain | If it could, a one-map curtain would exist; not tried |
| A10 | Attribution wording extended from the existing legend text satisfies the Licence Ouverte mention duty | Licences | Wording adjusted; no code impact |

## Open Questions

1. **Photos 1950-1965 offline zoom ceiling (needs the owner).**
   - Known: at maxzoom 18 the layer is 96 MB per 4 x 4 km area, 63 % of "all layers"; at 17 it is 28 MB, at 16 8 MB.
   - Unclear: whether the owner accepts one level of blur offline for this layer given "no weight cap".
   - Recommendation: online 18, offline pack 17; ask in one line at plan time.
2. **Does the 2 km survey prompt follow the policy?** Default "all" turns "environ 2 km autour, 11 Mo" into about 85 to 150 Mo before a field day. Recommendation: yes, same setting, with the honest estimate; owner may prefer "base only" for that prompt.
3. **May BD Forêt be a curtain side?** Recommendation V1: the curtain compares two bases; overlays apply to both sides. A "photo vs photo + forêt" comparison is then not available.
4. **Curtain go or no-go.** The spike (Android emulator Pixel_8, then iPhone) decides; fallbacks listed under Curtain risk 1.
5. **How to keep API and mobile layer constants in step.** Import the pure mobile file from an API spec, or a literal parity list in both suites; planner chooses.
6. **"Account settings" is the Paramètres screen** (there is no other settings screen); confirm no new Compte entry is wanted.
7. **"Base maps only" meaning:** defined here as Plan IGN, Orthophoto and the cadastre (today's downloads). Confirm.
8. **BD Forêt legend:** the Géoplateforme publishes one (`https://data.geopf.fr/annexes/ressources/legendes/LANDCOVER.FORESTINVENTORY.V2-legend.png`, 300 x 69 px, 200 verified); offline it would have to be an app asset. Decide whether V1 shows it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | tests, tooling | yes | 22.22.3 | - |
| npm | workspaces | yes | 10.9.8 | - |
| curl and Node `fetch` to `data.geopf.fr` | tile measurement, API styles | yes (network reached 2026-10-11) | - | - |
| Jest (mobile, api) | unit tests | yes | 29.7.0 (run verified: `src/map/tile-math`, `src/map/offline-packs` pass) | - |
| adb and Android emulator AVD `Pixel_8` | curtain spike, offline pack check | yes (adb in `~/Library/Android/sdk/platform-tools`, AVD present) | - | owner's phone |
| `xcrun simctl` iOS simulators | iOS visual check | yes (iOS 26.5 and 27.0 runtimes, none booted) | - | owner's iPhone |
| Owner's iPhone | native iOS pack and Liquid Glass checks | yes (owner) | - | simulator |
| Docker / PostgreSQL | API e2e | not needed (API change is unit-tested in `api/test/*.spec.ts`) | - | - |

**Missing dependencies with no fallback:** none.

## Validation Architecture

`workflow.nyquist_validation` is not set in `.planning/config.json`, so this section is included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7 + ts-jest (mobile and api), `@testing-library/react-native` for components |
| Config file | `mobile/jest.unit.config.js` (MapLibre mocked by `mobile/test/maplibre.mock.ts`, `cameraMocks.jumpTo` and `offlineMocks` available), `api/jest.unit.config.js` |
| Quick run command | `npm --workspace mobile run test:unit -- src/map` (verified working) |
| Full suite command | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`; coverage ratchet: `npm run test:coverage:mobile` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-DOC-layer-licences | Catalogue holds source, licence, vintage, attribution per layer; attribution strings contain the IGN long form | unit | `npm --workspace mobile run test:unit -- src/map/layers` | Wave 0 |
| REQ-D-map-layers | WMTS templates, formats, `maxzoom`, `tileSize: 256` per layer; `styleFor` for each base; overlay builder; `mapStyleFor` unchanged for plan and satellite | unit | `npm --workspace mobile run test:unit -- src/map/layer-styles src/map/maplibre/styles` | Wave 0 and existing |
| REQ-D-map-layers | `useMapStyle` returns the right style per layer, online and offline, dark plan only | unit | `npm --workspace mobile run test:unit -- src/hooks/useMapStyle` | existing, extend |
| REQ-D-layer-compare | Curtain geometry (wrapper left/width, inner offset), camera sync calls `jumpTo` on A's events, markers hidden while comparing, B non-interactive | unit (component, mocked maps) | `npm --workspace mobile run test:unit -- src/screens/public-map/CurtainCompare` | Wave 0 |
| REQ-D-layer-compare | Real registration, lag, clipping, performance | device | see device checks | manual |
| REQ-D-explorer-modes | Study button opens the panel in the sheet, explore flow unchanged (basemap toggle, download, clusters), panels exclusive | unit (component) | `npm --workspace mobile run test:unit -- src/screens/public-map src/screens/PublicMapScreen` | existing, extend |
| REQ-D-explorer-modes | No file over 400 lines in `src/screens`, `src/navigation` | gate | `npm --workspace mobile run test:unit -- src/__checks__/structure` | existing |
| REQ-D-offline-layers | Covering zoom, per-layer tile count and bytes, totals for base and all, over-zoom clamping, 256 versus 512 | unit | `npm --workspace mobile run test:unit -- src/map/offline-estimate src/map/tile-math` | Wave 0 |
| REQ-D-offline-layers | Per-layer sequential packs, optional layer failure does not fail the area, metadata `{areaId, layer}`, stall watchdog, weighted percent never decreases | unit | `npm --workspace mobile run test:unit -- src/map/offline-packs src/hooks/useOfflineAreas` | existing, extend |
| REQ-D-offline-layers | Policy persistence (default all, unknown value falls back, round trip) with a real SQLite helper | unit | `npm --workspace mobile run test:unit -- src/storage/offline-layers-policy` | Wave 0 (use `test/node-sqlite-db.ts` like `map-preference.sqlite.test.ts`) |
| REQ-D-offline-layers | Settings row shows the level, the action sheet saves it | unit | `npm --workspace mobile run test:unit -- src/screens/SettingsScreen` | existing, extend |
| REQ-D-offline-layers | API serves each layer style, 404 for unknown names, no fetch for raster styles | unit (api) | `npm --workspace api run test:unit -- map-styles` | existing, extend |
| REQ-D-offline-layers | Real pack sizes per layer, completion with all layers, airplane-mode rendering of each layer | device | see device checks | manual |
| REQ-D-offline-percent | Percent text and bar while running with several packs; indicator on the closed sheet | unit | `npm --workspace mobile run test:unit -- src/screens/public-map/DownloadStatusView src/screens/public-map/OfflineAreasSheet src/screens/public-map/MapControls` | existing, extend |
| all | Catalogue gates: no em dash, abbreviations, outline icons, motion, layers, fonts | gate | `npm --workspace mobile run test:unit -- src/__checks__` | existing |

### Repo gates the new code must satisfy (`mobile/src/__checks__/`)
- `catalogue-dash.test.ts`: no U+2014 in any string, template or JSX text under `mobile/src` (comments too, to be safe).
- `abbreviations.test.ts`: no unregistered abbreviation ("BD", "V2", "SCAN" fail); "IGN" only with its long form in the same catalogue file.
- `icons.test.ts`: Ionicons `-outline` only.
- `motion.test.ts`: motion through `brandMotion` with `ReduceMotion.System`; React Native `Animated` only in allowlisted files (use Reanimated and gesture-handler for the curtain).
- `structure.test.ts`: 400-line cap on `src/screens` and `src/navigation`, user-facing literals only in `src/i18n`, no unused style keys.
- `layers.test.ts`: no `borderWidth` on a gradient view, no `borderCurve`.
- ESLint: hex and `rgba(` literals only in `brand-tokens.ts`, `theme.ts`, `visual-tokens.ts`, `theme-visual.ts`, `forest-aurora-tokens.ts`; unused variables are errors (prefix `_`), `no-explicit-any` warns, no `require`.
- Coverage ratchet: 100 % statements and lines on `src/map/` (global rule), floors per other directory.

### Sampling Rate
- **Per task commit:** `npm --workspace mobile run test:unit -- <touched dir or file>`
- **Per wave merge:** `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`
- **Phase gate:** full suite green, `npm run test:coverage:mobile` at the thresholds, device checks recorded in `docs/user-tests/device-checks.md`, before `/gsd-verify-work`

### Device checks (cannot be Jest tests; add rows to `docs/user-tests/device-checks.md`)
1. **Curtain spike and result:** Android emulator (Pixel_8) and iPhone: clipping, registration lag during pan and pinch, drag smoothness of the handle, memory and frame feel with Plan versus photos, dark mode, rotation locked.
2. **Offline all layers:** one 4 x 4 km area with policy "all" on both platforms: completion, final percentage, `completedResourceSize` per layer, repeated 3 times (stall check, BD Forêt), then airplane mode and force quit: each downloaded layer renders and the others are shown disabled.
3. **Percentage:** bar reaches 100 with several packs; the indicator on the closed sheet; Android and iPhone.
4. **Legibility:** parcels (selected, studied, unscored, score colours) and cadastre on each base and with BD Forêt, light and dark; over-zoom beyond tile zoom 15 on the old maps is scaled, not blank.
5. **Settings:** the policy survives a relaunch and changes the next download's estimate.

### Wave 0 Gaps
- [ ] `mobile/src/map/layers.test.ts`, `layer-styles.test.ts`, `offline-estimate.test.ts` (100 % coverage required)
- [ ] `mobile/src/storage/offline-layers-policy.test.ts` (+ `.sqlite.test.ts`)
- [ ] `mobile/src/hooks/useOfflineLayersPolicy.test.ts`
- [ ] `mobile/src/screens/public-map/CurtainCompare.test.tsx`, `StudyPanel.test.tsx`, `useStudyMode.test.ts`
- [ ] Extend `maplibre.mock.ts` only if the curtain needs a second `Camera` mock (the `jumpTo` mock exists)
- [ ] Extend `api/test/map-styles.spec.ts`
- [ ] Framework install: none

## Security Domain

`security_enforcement` is not set to false in `.planning/config.json`, so this section is included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (the style route is public by design, as today) | existing `MapStylesController` has no guard; it exposes only public IGN URLs |
| V3 Session Management | no | - |
| V4 Access Control | no new data | nothing user specific is served |
| V5 Input Validation | yes | `:file` param of `GET /v1/map-styles/:file`: accept only names of a fixed list, 404 otherwise; never use the name as a path or URL |
| V6 Cryptography | no | - |
| V12 / V13 API and web service | yes | the global per-client throttle (default 600 per minute) covers the handful of style requests of a download |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Server-side request forgery through a style or layer name | Tampering, Information disclosure | The API fetches only the fixed Plan IGN style URL; raster layer styles are built from constants; unknown names 404 |
| Tile URL or style injection | Tampering | Styles are built from the catalogue, never from user input or server responses beyond the fixed IGN style |
| Disclosure of the observer's area to a third party | Information disclosure | Already true (tiles are requested from IGN); no tracking added, no key, no account sent; say nothing new in the privacy text unless the owner wants it |
| Resource exhaustion by a very large offline area | Denial of service | Keep the area-size cap (3000 tiles at z13 to 17 on the viewport), sequential packs, honest estimate before download |
| Supply chain | Tampering | No new package |

## Project Constraints (from CLAUDE.md)

- All user-facing text from the typed French catalogue `mobile/src/i18n/fr/` (new file `map-layers.ts`, exported through `index.ts`); no em dash (U+2014) in any string, template or JSX text under `mobile/src`; abbreviations written out (gate above).
- Colours only through `useBrandTheme()` (`colors`, `semanticColors`, `visual`); literals only in the five token files; controls over a map take a dense `surface` (`theme.visual.mapControl.glass` or `mapPanel`), basemaps stay light in dark mode except the recoloured plan.
- Ionicons outline glyphs only; motion through `brandMotion` with `ReduceMotion.System`; every endless loop gated by `useScreenVisible()`; haptics only through `ui/feedback.ts`; at most two animated hero layers per screen.
- No `borderWidth` on a gradient view, no `borderCurve`.
- Never call `useSurveySync` anywhere else; read state through context hooks (not touched here). Map data hooks (`useOfflineAreas`, `useMapStyle`) are called by the screens that need them.
- `src/screens` and `src/navigation` files stay at or under 400 lines (tests exempt).
- SQLite schema stays at version 5; preferences go to `local_meta`.
- IBP rules live once in `@cortege/ibp-domain`; this phase does not touch them. Avoid every survey form and payload file (Phase 27 runs in parallel); this research found no required change in them.
- Before committing: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run format:check`. Prettier: double quotes, no semicolons, trailing commas, 100 columns. Unused variables are errors (prefix `_`); `no-require-imports` is an error.
- Docs to update when implemented: `docs/technical/api-contract-v1.md` (map-styles section), `docs/user-tests/device-checks.md`, the owner-acceptance journal (OA-127 closes), CLAUDE.md map and offline lines (layers, packs per layer, policy key).

## Sources

### Primary (HIGH confidence)
- `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetCapabilities` (fetched 2026-10-11): layer ids, formats, styles, tile matrix sets, limits, bounding boxes, legend URLs.
- `data.geopf.fr` GetTile requests (curl, 2026-10-11): templates, status codes, byte sizes, 404 and 400 behaviour.
- CSW records `https://data.geopf.fr/csw?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&OUTPUTSCHEMA=http://standards.iso.org/iso/19115/-3/mdb/2.0&elementSetName=full&ID=<IGNF_SCAN-EM-40K | IGNF_SCAN-50-HISTO | IGNF_BD-ORTHO-HISTO | IGNF_BD-FORET | IGNF_PLAN-IGN | IGNF_BD-ORTHO | IGNF_BD-PARCELLAIRE>`: licence, constraints, abstracts, coverage, vintages.
- `https://cartes.gouv.fr/cgu/` (version of 15 October 2024) and `https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/limites-d-usage/` (modified 7 August 2026): licence default, fair use, limits, WMTS not limited.
- maplibre-native `main`: `platform/default/src/mln/storage/offline_download.cpp`, `offline_database.cpp`, `src/mln/util/tile_cover.cpp`, `include/mln/util/constants.hpp` (read via the GitHub API on 2026-10-11).
- Installed library: `node_modules/@maplibre/maplibre-react-native` 11.4.0 (`Map.tsx`, `Camera.tsx`, `OfflineManager.ts`, `OfflinePack.ts`, `MLRNMapView.kt`, `android/gradle.properties`), `node_modules/@maplibre/maplibre-gl-style-spec` 26.2.1.
- Repo code read: `mobile/src/map/*`, `map/maplibre/*`, `hooks/useMapStyle.ts`, `useOfflineAreas.ts`, `useOfflineMapPrompt.ts`, `screens/public-map/*`, `screens/PublicMapScreen.tsx`, `screens/SettingsScreen.tsx`, `storage/map-preference.ts`, `storage/offline-map.ts`, `i18n/fr/offline-map.ts`, `api/src/surveys/map-styles.*`, `mobile/jest.unit.config.js`, `mobile/src/__checks__/*`.

### Secondary (MEDIUM confidence)
- `https://www.data.gouv.fr/pages/legal/licences/etalab-2.0` and the Etalab Licence Ouverte 2.0 text, through search summaries (the licence page itself redirected on direct fetch): attribution duty (source and date of last update), compatibility with CC-BY and ODC-BY.
- `https://geoservices.ign.fr/usages` redirects (301) to `https://cartes.gouv.fr/`.

### Tertiary (LOW confidence)
- Android `SurfaceView` clipping and per-frame event latency: reasoning only, to be settled by the spike.
- Dark-mode raster values: design judgement.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new package, versions read from the installed tree.
- Layers, licences, limits: HIGH for the facts fetched; MEDIUM on bulk-caching (no explicit IGN statement).
- Offline cost: HIGH on the formula (native source) and on weights (measured), MEDIUM until one device pack confirms `completedResourceSize`.
- Curtain: MEDIUM that two maps is the only route, LOW on Android clipping and lag until the spike.
- Architecture and pitfalls: HIGH on repo seams, MEDIUM on the stall risk (not reproduced).

**Research date:** 2026-10-11
**Valid until:** 2026-11-10 (IGN pages moved recently; maplibre-native pinned at 13.6.1 by the library)
