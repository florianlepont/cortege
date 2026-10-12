# Map layers, licences and offline cost (v1)

Status: recorded 2026-10-12 at the close of Phase 28 (map layers and comparison). It describes the app as built after the owner's iPhone feedback rounds, not as first planned. Facts about the Géoplateforme were fetched on 2026-10-11 (see Sources). The device-measured pack sizes are pending (section 5).

Related: [api-contract-v1.md](api-contract-v1.md) (section `GET /map-styles/{name}.json`), [technical-architecture-v1.md](technical-architecture-v1.md), the device checks DL-01 to DL-09 in [../user-tests/device-checks.md](../user-tests/device-checks.md), the dormant seed SEED-001.

## 1. Decision

The Explorer offers five base maps, one overlay and a three-state parcels setting. The purpose is to read the age of a forest: the same place today, in 1950 and in the 19th century.

| Group | Offered | Notes |
|-------|---------|-------|
| Bases (the swipe cycle, in this order) | Plan, Satellite, Carte d'état-major (1820-1866), Carte de 1950, Photos aériennes (1950-1965) | The Plan and the Satellite are the two bases of before this phase. The three old bases are session only: they are never saved as the preferred basemap. |
| Overlay | Types de forêt | Drawn over any base (not a base itself). The app draws its own legend in five groups (Feuillus, Conifères, Forêts mélangées, Peupleraies, Landes et forêts ouvertes). The tall official legend image (37 classes) is not bundled. |
| Parcelles | Toutes, Avec IBP, Aucune | Toutes: cadastre lines and every parcel polygon. Avec IBP: no cadastre lines, only parcels that have an IBP survey (a parcel with only the author's own draft counts). Aucune: no cadastre lines, no parcel polygons, no survey count pills; parcels are no longer tappable (markers and clusters still are). |

Dormant, not in V1 (owner decision at the layer sample sheet): relief shading, slopes, ONF public forests, CORINE land cover. They stay in SEED-001.

Zoom ceilings of the old bases are below the pack zooms. This is accepted: they are context layers, and past their data the last tile is scaled up (blurry, never blank) with the notice "Fond peu détaillé à cette échelle".

## 2. The layers

All raster layers are served by the Géoplateforme WMTS (`https://data.geopf.fr/wmts`, `STYLE=normal`, `TILEMATRIXSET=PM`, 256 px tiles). With 256 px tiles MapLibre reads tile zoom = map zoom + 1, so "tile zoom 15" is sharp up to map zoom 14. A wrong `FORMAT` answers HTTP 400, outside the coverage the service answers 404, and past the last tile zoom it answers 404 too: every source therefore declares its `maxzoom`.

| App name (key) | Géoplateforme layer id | Metadata record | Format | Tile zoom online | Tile zoom offline | Coverage | Era shown | Role and offline tier |
|----------------|------------------------|-----------------|--------|------------------|-------------------|----------|-----------|-----------------------|
| Plan (`map`) | vector style `PLAN.IGN/standard.json` (tiles TMS, 512 px) | IGNF_PLAN-IGN | vector (pbf) | 0 to 18 | pack 13 to 17 (tile zoom 13 to 17) | France and overseas | today (updated continuously, monthly at large scales) | base, required |
| Satellite (`satellite`) | `ORTHOIMAGERY.ORTHOPHOTOS` | IGNF_BD-ORTHO | image/jpeg | 0 to 19 | 14 to 18 (cap 19) | France and overseas | today, one vintage a year per department | base, required |
| Carte d'état-major (`etat-major`) | `GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40` | IGNF_SCAN-EM-40K | image/jpeg | 0 to 15 | 14 to 15 | metropolitan France of the time, lon -6.09 to 10.96, lat 41.18 to 51.27 | 1820-1866 (surveyed 1825 to 1866, updated to 1889) | base, extra |
| Carte de 1950 (`carte-1950`) | `GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950` | IGNF_SCAN-50-HISTO | image/jpeg | 0 to 15 | 14 to 15 | metropolitan and overseas, except French Polynesia and Wallis and Futuna | about 1950 (1 : 50 000, last edition about 1959) | base, extra |
| Photos aériennes (`photos-1950`) | `ORTHOIMAGERY.ORTHOPHOTOS.1950-1965` | IGNF_BD-ORTHO-HISTO | image/png (jpeg answers 400), grayscale | 0 to 18 | 14 to 17 (cap lowered to 17, see section 5) | metropolitan, overseas departments and regions, overseas collectivities except French Polynesia; French Guiana partial | 1950-1965 | base, extra |
| Types de forêt (`types-foret`) | `LANDCOVER.FORESTINVENTORY.V2` | IGNF_BD-FORET | image/png (RGBA, transparent outside forest) | 0 to 16 | 14 to 16 | metropolitan France, lon -5.15 to 9.57, lat 41.33 to 51.10 (Corsica inside) | inventory 2007 to 2018, vintage varies by department, stands of 0.5 ha or more | overlay, extra |
| Cadastre (lines, not a layer of the cycle) | `CADASTRALPARCELS.PARCELS` (TMS, png) | IGNF_BD-PARCELLAIRE | image/png | 15 to 20 | in the Plan's pack, tile zoom 15 to 18 | France | current | drawn over every base from map zoom 15 in the Toutes state; opacity 0.9, and 0.7 over the two old maps |

Notes:

- Tiles answer `Cache-Control: private, max-age=1814400` (21 days).
- The catalogue lives in `mobile/src/map/layers.ts` (one entry per layer, with the templates, zoom caps, measured tile weights and coverage boxes). The API keeps one copy of the five WMTS templates and of the offline caps (it cannot import the mobile file); a unit spec reads the mobile file and fails if the copies differ.
- The Carte de 1950 and the Photos 1950 have no coverage test in the app (their boxes are too wide to test a point); the others show "ne couvre pas cette zone" outside their box.
- On the two pastel old maps the parcel fill is lightened (factor 0.6) and given a white casing, and in the dark scheme their raster brightness is capped at 0.8. The Satellite and the 1950 photographs are not recoloured.

## 3. Licence and usage terms

| Layer | Licence | Constraint | Usage limit | Position |
|-------|---------|------------|-------------|----------|
| Carte d'état-major (IGNF_SCAN-EM-40K) | "Licence Ouverte / Open License (compatible ODC-BY, CC-BY 2.0)" | "Aucune contrainte" | WMTS not limited | Usable |
| Carte de 1950 (IGNF_SCAN-50-HISTO) | same | same | same | Usable |
| Photos 1950-1965 (IGNF_BD-ORTHO-HISTO) | same | same | same | Usable |
| Types de forêt (IGNF_BD-FORET) | same, with a link to the Etalab open licence | same | same | Usable |
| Plan, Satellite, cadastre (IGNF_PLAN-IGN, IGNF_BD-ORTHO, IGNF_BD-PARCELLAIRE) | same | same | WMTS not limited; vector tiles (TMS) 400 requests per second | Already used before this phase |

Terms in force (checked 2026-10-11):

- The Géoplateforme general terms of use (CGU, version of 15 October 2024) state that data served follow the licence chosen by the data provider and, failing one, that the Licence Ouverte / Open Licence (Etalab) applies. They contain no required attribution wording.
- The usage-limits page (modified 7 August 2026) lists WMS raster 40 per second, WMS vector 50, WFS 30 and download 10, and states that rate limiting does not apply to the WMTS raster API or its TMS counterpart; the CGU table gives vector TMS 400 per second. A 429 block lasts 5 seconds.
- The Licence Ouverte grants free reuse, including commercial, and requires citing the source and the date of the last update of the information, without implying official endorsement.
- Offline copies: the CGU say nothing for or against caching or bulk downloads; they forbid use that harms or distorts the services and let IGN limit abusive use. The licence itself grants the right to reproduce and copy. A 4 km by 4 km area per survey, downloaded layer by layer and cached natively (the native downloader opens at most 20 concurrent requests), is therefore covered. There is no written IGN statement about bulk tile downloads: risk low, confidence medium. Downloads stay sequential per area and per layer.
- Blocked layers: none.

How the app meets the duty to cite the source and the date:

- The swipe indicator and the side tags show the era of each base ("aujourd'hui", "1820-1866", "vers 1950", "1950-1965").
- The legend carries one source line per layer in use, written in the catalogue `mobile/src/i18n/fr/map-layers.ts`: for the état-major "levés de 1825 à 1866, mises à jour jusqu'en 1889", for the 1950 map "cartes au 1 : 50 000, dernière édition disponible vers 1959", for the photographs "prises de vues de 1950 à 1965, en niveaux de gris", for the forest types "inventaire forestier de 2007 à 2018, millésime variable selon le département, peuplements de 0,5 ha au moins", for the Plan and the Satellite their update rhythm, and for the cadastre "parcellaire en vigueur".
- The common line: "© Institut national de l'information géographique et forestière (IGN), Géoplateforme, Licence Ouverte. Carte : MapLibre."
- The Types de forêt are not read as current: the vintage and the 0.5 ha floor are stated in the source line.

## 4. Offline behaviour

Policy (Paramètres, Cartes, row "Couches hors ligne"): stored in the SQLite `local_meta` table under the key `offline_layers_policy`, values `base` or `all`, default `all` (owner choice); an unknown value reads as the default. The schema stays at version 5. It is a device preference that `clearLocalIbpData` leaves alone. It applies to future downloads only; areas already saved keep what they have.

- "Fonds de carte seulement" (`base`): the Plan, the Satellite and the cadastre.
- "Toutes les couches" (`all`): adds the Carte d'état-major, the Carte de 1950, the Types de forêt and the Photos 1950.
- One native pack per layer, created one after the other in a fixed order: Plan (it carries the cadastre, glyphs and sprite), Satellite, état-major, Carte de 1950, Types de forêt, Photos 1950 last (the heaviest). The pack metadata is `{ areaId, layer }`. The native database stores a tile once by URL, so the cadastre shared by several packs is not duplicated.
- The Plan and the Satellite are required; the other layers are best effort: a failed or stalled extra layer never fails the area, which is saved with the packs that completed and a "partial" chip names what is missing.
- A stall watchdog ends a pack that reports no new resource for 45 s (`STALL_TIMEOUT_MS`); at 90 % or more (`STALL_ACCEPT_PERCENT`) the pack is accepted, below it fails. This answers the native downloader freeing a request slot only on a 404.
- Pack zooms are 13 to 17. The native downloader reads 256 px raster sources one level higher (tile zoom 14 to 18), clamped to the source's zoom range, hence the +1 covering zoom in the estimate (`mobile/src/map/offline-estimate.ts`).
- The percentage shown is weighted by the estimated bytes of each layer and never goes down. It shows in the compact download card's status and in the chip left of the round download button, so it remains visible when the sheet is closed.
- Android reads a pack style only from an http(s) URL (finding F-3 of Phase 26): the packs are created from `GET /v1/map-styles/{name}.json`, six fixed names (`map`, `satellite`, `etat-major`, `carte-1950`, `photos-1950`, `types-foret`), five of them raster styles built in the API from constants. An API that does not know a new name answers 404; since extra layers are best effort this cannot fail an area. iOS writes the Plan composite style to a local file and uses inline styles for the raster layers.
- Offline availability of a layer is read from the packs of the area that covers the view centre. The swipe cycle and the side tags skip the layers that are not downloaded and say so ("N fonds non téléchargés pour cette zone sont ignorés."); the Types de forêt switch reads "Indisponible hors connexion" when missing.
- Real size: in development builds each finished pack logs `offline.layer-size` (layer, `completedResourceSize`, outcome); the sum is written into the area's estimated bytes.

## 5. Offline cost

### Estimated

One 4 km by 4 km area (the 2 km radius of the survey prompt) at Fontainebleau, pack zooms 13 to 17. Tile counts come from the app's tile formulas, weights from curl on 14 random tiles per zoom (2026-10-11).

| Layer | Tile zooms in the pack | Tiles | Average bytes per tile | MB per area |
|-------|------------------------|-------|------------------------|-------------|
| Plan (vector) | 13 to 17 | 549 | 99, 73, 26, 7.7, 3.6 KB | 4.2 (plus about 4.3 shared fixed: style, sprite, glyphs) |
| Satellite | 14 to 18 | 2145 | 13 to 17 KB | 29.0 |
| Cadastre (in the Plan's pack) | 15 to 18 | 2136 | 5.6 to 18.5 KB | 15.5 |
| Carte d'état-major | 14 to 15 | 45 | 16.4, 13.5 KB | 0.6 |
| Carte de 1950 | 14 to 15 | 45 | 24.8, 17.9 KB | 0.9 |
| Types de forêt | 14 to 16 | 145 | 15.6, 8.0, 5.4 KB | 1.0 |
| Photos 1950, cap 18 (not used) | 14 to 18 | 2145 | 42 to 56 KB | 95.6 |
| Photos 1950, offline cap 17 (as built) | 14 to 17 | 545 | 51 to 56 KB | 28.4 |
| Photos 1950, cap 16 (not used) | 14 to 16 | 145 | 54 to 56 KB | 7.9 |

| Total for the area | MB |
|--------------------|----|
| Fonds de carte seulement | about 53 |
| Toutes les couches, Photos 1950 capped at 17 offline (as built) | about 84 |
| Toutes les couches, Photos 1950 at 18 (not used) | about 151 |

Reading: the three small additions together weigh about 2.5 MB; the 1950 photographs are the only heavy extra, so their offline source is capped at tile zoom 17 (the owner chose this cap, online stays 18; the map scales the last tile by one level offline). Weights vary by place (cadastre and orthophoto up to 3 times in a city, the photographs about 15 %), so the app says "environ N Mo". The estimate shown before a download and in the policy sheet is computed from this catalogue (it replaces the earlier one that assumed 20 KB a tile at zoom 13 to 17 and showed about 22 MB for what weighs about 53 MB).

### Measured

Measured on 2026-10-12 on the Android emulator (Pixel_8, API 36, development build of the Phase 28 branch, the Phase 28 API deployed so that all six `/v1/map-styles/<name>.json` answer), policy "Toutes les couches", reading the `offline.layer-size` lines (`completedResourceSize` of each layer's pack). Each run saved the visible screen of Explorer after two double-tap zooms from the 15 km view, about 4 km wide (the Explorer window is taller than wide, so the area is about 4 km by 9 km; the card announced "Environ 86 Mo" for run A only). The size shown in Paramètres, Cartes is the sum of the six layers in Mo of 10^6 bytes, to the digit (97.0, 107.6 and 86.1 Mo).

Three cold runs, on three different areas of the same size (an area already downloaded and deleted is not cold, see below). Tile counts are not logged (only bytes), so the Tiles column holds the estimate of the table above, not a measure.

| Layer | Tiles (estimate) | Bytes, mean of 3 (range) | Run A, Fontainebleau | Run B, Thomery and By | Run C, Vernou-la-Celle | Date | Device |
|-------|------------------|--------------------------|----------------------|-----------------------|------------------------|------|--------|
| Plan with cadastre (`map`) | 549 plus 2136 | 21.3 MB (18.6 to 25.7) | 19,607,446 | 25,687,165 | 18,581,094 | 2026-10-12 | Pixel_8 API 36 emulator |
| Satellite | 2145 | 44.1 MB (38.3 to 48.3) | 45,533,194 | 48,317,438 | 38,317,304 | 2026-10-12 | same |
| Carte d'état-major | 45 | 0.56 MB (0.52 to 0.58) | 571,397 | 581,712 | 515,705 | 2026-10-12 | same |
| Carte de 1950 | 45 | 0.76 MB (0.67 to 0.83) | 790,961 | 832,851 | 669,257 | 2026-10-12 | same |
| Types de forêt | 145 | 0.80 MB (0.69 to 0.86) | 855,625 | 855,322 | 694,434 | 2026-10-12 | same |
| Photos 1950 (cap 17) | 545 | 29.4 MB (27.4 to 31.3) | 29,636,940 | 31,312,198 | 27,371,707 | 2026-10-12 | same |
| Total of the area | | 96.9 MB (86.1 to 107.6) | 96,995,563 (97.0 Mo) | 107,586,686 (107.6 Mo) | 86,149,501 (86.1 Mo) | 2026-10-12 | same |

Reading:

- Against the estimate above (about 84 MB for the same layers over 4 km by 4 km, 86 Mo announced by the card for this window), the measured total of run A is 13% above the card (97.0 against 86 Mo); the card was not read for runs B and C. Satellite and the 1950 photographs are 90% of the weight; the three small additions (état-major, carte de 1950, types de forêt) weigh 2.1 MB together (estimate 2.5 MB), the Plan with cadastre 21 MB (estimate about 24).
- The area weighs differently by place (86 to 108 MB, plus or minus 11% around the mean), as the estimate said.
- A second and third download of the same area (deleted in between) is not a repeat measure: the packs share tiles by URL in MapLibre's database, and the same area downloaded again after a deletion reported 15.2 Mo and then 3.0 Mo (21:30 and 21:31) instead of 97.0 Mo. Only the first download of an area gives its real weight; do not average repeated downloads of one area.
- No layer stalled and none failed in these runs (no "not found" line). The chip percentage never went down (sampled every 2 to 5 s, with plateaus of up to 7 s, for example 38% then 40%, 66% held for about 15 s while the last layer finished); the first run showed 63% at the first sample on a warm cache.
- Not measured: the total on an iPhone (device check DL-06, owner). Before the API was deployed (the production API answered only `map` and `satellite`, 404 `unknown_map_style` for the four others), a first run saved only those two layers and the four others failed one after another after the 45 s watchdog each, ending on "Zone enregistrée, sauf certaines couches" (19,607,446 and 45,520,183 bytes for the two, 0 for the rest); this is the expected behaviour of the partial path, not a stall of a layer.

## 6. Changing and comparing bases, as built

This section describes the app after the owner's iPhone feedback rounds of 2026-10-11 and 2026-10-12. Tunables are named as in the code.

### Explorer at rest

- Top right, a capsule holds two buttons: the globe (enter the swipe mode) and the layers button (the overlay bubble). The round download button sits just under the capsule (when offline maps are on); the locate arrow is bottom right; bottom left the legend (i) button, with no survey count pill, only a bare spinner while surveys load.
- The overlay bubble opens beside the capsule: Types de forêt (switch, drawn legend, offline availability) and Parcelles (Toutes, Avec IBP, Aucune). The overlay and the parcels setting apply to both sides of a comparison.
- The Explorer opens on the user's last known position (a view of about 15 km) when location permission is already granted and nothing asks to focus elsewhere (`mobile/src/app/last-position.ts`, `useInitialLocationCentre`); it never prompts for the permission. Without it, the default view stays.

### Swipe mode

- Tap the globe. The map freezes and the map window recedes like a card, between two white zones, with rounded corners and a soft shadow (a thin ring in dark mode); every map button fades out and the carousel fades in.
- The receded window is fitted between a top zone (the carousel: the layer pill with its era and the five dots) and a bottom zone (first the hint bubble, then the notices). The fit is computed by `immersiveTarget` in `mobile/src/map/wipe-geometry.ts` with a non-uniform scale: the vertical scale is the free height share (clamped from 0.5 to `IMMERSIVE_MAX_SCALE` 0.94) and the horizontal scale is that stretched by `IMMERSIVE_ASPECT_STRETCH` (1.1), capped at 0.94. The notices zone is reserved only when a notice is already up as the mode starts, so the window never jumps while receded.
- While swiping, the stacked maps are bare basemaps: no cadastre lines, no forest overlay and no parcel polygons.
- There is no "Terminé" pill. A tap on the map leaves the mode, as do 8 s without a gesture (`IDLE_MS`) and a second tap on the globe; for VoiceOver and TalkBack the indicator offers the actions "Fond suivant", "Fond précédent", "Comparer avec le fond suivant" and "done" ("Terminé : libérer la carte"). Faded buttons are not reachable by the screen readers.
- The introduction hint ("Faites glisser votre doigt sur la carte pour changer de fond. Relâchez au milieu pour comparer.") stays until the first touch. While a finger is down the hint is the live zone hint.
- Zones in thirds of the revealed fraction: a release below `COMPARE_MIN` (1/3) springs back ("Lâchez pour revenir", no haptic); between `COMPARE_MIN` and `COMPARE_MAX` (2/3) it opens the comparison ("Lâchez pour comparer", a clear detent); above `COMPARE_MAX` it changes the base ("Lâchez pour changer de fond", a light tick). A zone changes only after the finger crossed a boundary by `ZONE_HYSTERESIS` (0.03), so the hint, the haptic and the outcome agree and a thumb resting on a boundary does not flutter. Haptics go through `ui/feedback.ts` and stay under Reduce Motion.
- Timings: `IMMERSIVE_IN_MS` 360 (entering), `IMMERSIVE_OUT_MS` 240 (leaving), `BUTTON_FADE_MS` 160 and `BUTTON_FADE_IN_DELAY_MS` 80 for the buttons, `SETTLE_MS` and `SPRINGBACK_MS` 240, `HINT_MS` 3000. A touch in the margin around the receded window counts as its nearest edge; a swipe started during the entrance already wipes under the finger.
- On Android the window transform needs the Explorer map as a texture view: `LEFT_MAP_ANDROID_VIEW` in `mobile/src/screens/public-map/map-stack-mode.ts` is `texture`. That value is the orchestrator's reasoned default from the emulator evidence of the spike (DL-01), not a choice of the owner, and remains to be decided on an Android phone.

### Single comparison mode

- A release in the middle third ends the swipe mode and starts the comparison: the window returns to full size, the line eases to the exact centre, the survey markers hide with no notice, and the map pans and zooms freely (rotation stays locked; a gesture that starts near the line takes no touch from the line). The swipe mode and the comparison never coexist; the globe is dimmed and disabled in a comparison.
- The line rests at the centre. The only grab point is the slim grabber (a white bar 4 pt wide and 36 pt tall with a graphite edge, 44 by 44 pt hit area) at the vertical centre. Dragging it moves the line under the finger; released in the middle part the line springs back to the centre. In the outer fifths (`EDGE_EXIT_FRACTION` 1/5, `edgeExitKeeps`) a selection tick plays and the hint "Lâchez pour quitter la comparaison" shows; a release there ends the comparison and keeps the layer opposite to that edge (left edge keeps the right layer, right edge the left layer). A drag back to the middle or an interrupted drag never ends the comparison.
- "Quitter la comparaison" is a pill at the bottom, above the tab bar; it keeps the left layer. The notices keep their own top place during a comparison.
- Side tags: a 44 pt glass pill on each side, level with the grabber and 24 pt from the line (`TAG_GAP`), showing the layer name with a back and a forward chevron. A tap on a chevron, or a horizontal swipe on the tag (`TAG_SWIPE_MIN` 44 pt of travel or `TAG_FLICK_VELOCITY` 500 pt/s), changes that side to the previous or next layer; the new layer wipes in within that half only (about 240 ms) with a selection tick; never the same layer on both sides; layers not downloaded are skipped offline; chevrons are dimmed when no other layer exists; a tag fades out when its side is narrower than 72 pt (`TAG_MIN_WIDTH`). VoiceOver: each tag is adjustable with "Fond suivant" and "Fond précédent". A side change never writes the saved basemap preference; only leaving the comparison does.

### Rendering order of the stacked maps

White flashes seen in the owner's frame-level screen recordings led to a readiness gate: a stacked map is never shown before it is rendered.

- A stacked map is hidden by its plain style while a new style is applied (the swap happens only after the map was hidden), aligned to the Explorer camera, then revealed. The reveal order is: ready (style loaded and rendered, or 1.5 s after the style load, `STACKED_READY_TIMEOUT_MS`), aligned camera, visible, cover released.
- A side step is double buffered: a third map is shown before any visible map changes layer, and the cover waits for the new layer to be rendered.
- The Explorer map's own cover is released only when its style has loaded and a "rendered fully" event came after it, 120 ms later (`COVER_PRESENT_MS`), never before the receded window is back, and at the latest 2.5 s after the style load (`COVER_RENDER_TIMEOUT_MS`).
- The swipe mode preloads the next layer.

### Tunables

All are constants in `mobile/src/map/swipe-machine.ts` and `mobile/src/map/wipe-geometry.ts`. Values in force on 2026-10-12, accepted by the owner (he asked for no change in the rounds on his iPhone 15 Pro):

| Constant | Value | Role |
|----------|-------|------|
| `COMPARE_MIN` | 1/3 | start of the comparison zone |
| `COMPARE_MAX` | 2/3 | start of the commit zone |
| `ZONE_HYSTERESIS` | 0.03 | boundary crossing needed to change zone |
| `EDGE_EXIT_FRACTION` | 1/5 | outer fifths that quit the comparison |
| `TAG_SWIPE_MIN` | 44 pt | tag swipe travel |
| `TAG_FLICK_VELOCITY` | 500 pt/s | tag flick |
| `IMMERSIVE_MAX_SCALE` | 0.94 | largest receded window |
| `IMMERSIVE_ASPECT_STRETCH` | 1.1 | horizontal stretch of the window |
| `IMMERSIVE_MIN_SCALE` | 0.5 | smallest receded window |
| `IMMERSIVE_IN_MS`, `IMMERSIVE_OUT_MS` | 360, 240 | window timings |
| `BUTTON_FADE_MS`, `BUTTON_FADE_IN_DELAY_MS` | 160, 80 | button fade |

Accepted does not mean felt-tuned: the Taptic Engine feel of the detent and the ticks has not been judged separately (device check DL-09), and nothing is "requested, not yet applied".

## 7. Sources

- Capabilities: `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetCapabilities` (2026-10-11): layer ids, formats, bounding boxes.
- GetTile requests on `data.geopf.fr` (curl, 2026-10-11): templates, status codes, byte sizes.
- CSW metadata records: `https://data.geopf.fr/csw?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&OUTPUTSCHEMA=http://standards.iso.org/iso/19115/-3/mdb/2.0&elementSetName=full&ID=<record>` for IGNF_PLAN-IGN, IGNF_BD-ORTHO, IGNF_SCAN-EM-40K, IGNF_SCAN-50-HISTO, IGNF_BD-ORTHO-HISTO, IGNF_BD-FORET and IGNF_BD-PARCELLAIRE.
- Géoplateforme terms of use (version of 15 October 2024): `https://cartes.gouv.fr/cgu/`.
- Usage limits (modified 7 August 2026): `https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/limites-d-usage/`.
- Licence Ouverte 2.0 (Etalab): `https://www.data.gouv.fr/pages/legal/licences/etalab-2.0` (read through summaries; the page redirected on direct fetch).
- MapLibre Native offline downloader (`offline_download.cpp`, `tile_cover.cpp`, `offline_database.cpp`), read 2026-10-11; the app pins native 13.6.1.
- Phase 28 working files: `28-RESEARCH.md` (facts and estimates), `28-02-SUMMARY.md` (verified records), `28-01-SUMMARY.md` (spike), `28-UI-SPEC.md`.
