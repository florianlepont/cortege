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

### FINAL UI DECISIONS (owner, 2026-10-11, sketches 016 to 022): they supersede every earlier entry, panel, basemap, comparison and download bullet in this file
Source of the look: `.planning/sketches/021-basemap-swipe` (tab D), `022-swipe-compare` (tab A), `019-basemap-chooser` (variant A, overlay bubble), `018-download-settings` (variant A) with the compact bottom card of `020-bottom-cards`, `017-curtain-compare` (variant A).
1. **Current Explorer design kept**: the capsule with the basemap (globe) button and the download button together, and the locate arrow at the bottom right, unchanged. No "Couches" pill, no big panel, no bottom card for the basemap.
2. **Overlay button**: a separate round glass button under the capsule opens a small bubble beside the capsule: "Types de forêt" (switch, with a compact legend when on) and "Parcelles" (three states Toutes / Avec IBP / Aucune, covering the app's parcel polygons AND the cadastre lines; Toutes = today's rendering). Session state; the button shows a dot when the overlay is on or Parcelles is not Toutes.
3. **Basemap change = swipe mode** (021 D): tapping the globe freezes the map; a pill at the top (level with the capsule) shows the basemap name, era and 5 dots; below it a "Terminé" pill; a one-line hint shows for about 3 s then fades. A horizontal swipe on the map wipes the neighbouring basemap in behind the finger; release beyond about a third (or beyond 80 % when a comparison release is possible) to commit, otherwise it springs back. Exit: "Terminé", tap on the map, tap on the globe, or 8 s idle. Order cycles Plan, Satellite, État-major, Carte 1950, Photos 1950; unavailable layers (offline) are skipped. Choosing Plan or Satellite writes the saved basemap preference; the old bases are session-only.
4. **Comparison = the same gesture** (022 A): in swipe mode, releasing a swipe between 20 % and 80 % of the way keeps both layers side by side and the line becomes the curtain; while swiping the hint says "Lâchez pour comparer" or "Lâchez pour changer de fond"; below 20 % it springs back, above 80 % the basemap changes. There is no "Comparer" button. In comparison (still in swipe mode, map frozen): a swipe on one side changes that side's basemap only (the neighbouring layer wipes in within that side, never the same layer on both sides); the line is dragged by hand; dragging the line to an edge (within 40 pt) quits the comparison keeping the visible layer; the round exit control at the top left also quits; "Terminé" frees the map but keeps the comparison; tapping the globe re-enters swipe mode. Top display kept minimal: the exit control and "Terminé" on one row, a transient 3 s hint, side tags with ‹ › chevrons while swiping. Survey markers are hidden during a comparison; overlays apply to both sides.
5. **Curtain look** (017 A): white 4 pt line, round glass knob at 32 % of the height, side tags 30 pt from the line (22 pt knob radius + 8). On the old bases the parcel fill is lightened (factor 0.6, tune on the phone).
6. **Download** (018 A, simplified, 020 style): the capsule download button opens a compact bottom card (title, estimate lines, "Télécharger"); after "Télécharger" the card closes and only the chip at the left of the download button shows the byte-weighted percentage then the result; tapping the chip: running nothing, failed reopens the compact card on "Réessayer", partial reopens it on the partial message, done disappears after 4 s. No running view, no "En cours" line, no big sheet. ROADMAP success criterion 5 is met by the chip (owner decision).
7. **Settings**: Paramètres > Cartes, row "Couches hors ligne" with the two-level policy (unchanged).
8. Kept from before: layer catalogue, licences, photos 1950 offline zoom 17, per-layer packs, policy default "all" in `local_meta`, over-zoom hints and offline/coverage notices (shown as the top notices column), dark mode treatments.
9. **Refinement (owner, after sketch 023)**: all the top-of-screen mode controls are CENTRED on the screen (not offset away from the capsule). One control per state, always LABELLED, no unlabelled X: (a) swipe mode, single or comparison: the pill (single) and the single "Terminé" pill, which frees the map and keeps what is shown (including a comparison); (b) comparison with the map free: one centred pill "Quitter la comparaison" (back to a single basemap, keeping side A... the visible layer), shown only while the map is free. The round X at the top left is removed. In swipe mode within a comparison, quitting is by dragging the line to an edge (hinted for 3 s) or "Terminé" then "Quitter la comparaison".
10. **Forest legend (owner, 2026-10-11, during execution)**: the official legend image is 300 x 835 (37 classes), too tall for the bubble and not bundled. The bubble shows a SIMPLIFIED legend drawn by the app: 5 colour groups (feuillus, conifères, forêts mélangées, peupleraies, landes et forêts ouvertes) with colours read from the official image at https://data.geopf.fr/annexes/ressources/legendes/LANDCOVER.FORESTINVENTORY.V2-legend.png; no image asset. Plan 28-09 (bubble) builds it; the legend key names are in fr.mapLayers.overlays (28-02).
11. **Swipe zones and haptics (owner, 2026-10-11, after seeing the spike)**: when swiping from one basemap to the next, the first third of the screen is a cancel zone (release springs back to the initial basemap), the middle third is the compare zone (release opens the comparison), beyond two thirds is the commit zone (release switches to the new basemap). Haptics make the zones felt, with a clear detent when entering the middle zone. This supersedes the 20 % / 80 % boundaries of items 4 and the UI-SPEC. Boundaries chosen: exactly 1/3 and 2/3 of the revealed fraction with a hysteresis of 0.03; two zones only (cancel below 1/3, commit above) when a comparison is not allowed (side wipes, or a comparison already exists). Haptics through ui/feedback.ts: entering the compare zone = medium impact (the detent); entering commit or cancel = light selection tick; release that opens the comparison = medium impact; release that commits = selection tick; release that cancels = nothing.
12. **Map control glass (owner, 2026-10-11)**: the buttons looked green over the satellite; the light map control glass is denser (0.92 opacity instead of 0.76, commit `bdba9653`) so it stays neutral over every basemap. The dark glass is unchanged.
13. **Owner feedback after the first working iPhone build (2026-10-12), they supersede earlier items where they differ**:
   a. **Top-right buttons**: the capsule holds the basemap (globe) button AND the overlay (layers) button together; the offline download button is a separate round button on its own, below the capsule (it was in the capsule with the globe; the overlay was a separate round button). The download chip stays to the left of the download button.
   b. **Comparison line (corrected by the owner the same day)**: at rest the line is at the exact centre: it moves during the swipe wipe, then eases to the centre when the comparison starts. It can still be dragged by hand ONLY as an exit gesture: it follows the finger, and on release it springs back to the centre unless the finger is in an edge exit zone (wider than the old 40 pt: the outer fifth of the width on each side, a selection haptic tick when entering that zone), in which case the comparison ends and the layer that covers the visible side is kept (dragging to the left edge keeps the right layer, to the right edge keeps the left layer). The round grab knob stays on the line as the affordance. "Quitter la comparaison" stays as the other exit. Side wipes (changing a side) stay confined to each half of the centre.
   c. **Immersive effect in swipe mode ONLY (not in the comparison)**: when the swipe mode is on, the map window recedes slightly (card-like: scale about 0.94 with rounded corners) with a soft shadow over the app background, and ALL the map buttons disappear: capsule, overlay and download buttons, the locate arrow, the legend button and its panel; only the top stack (pill, dots, "Terminé", hint) remains. It animates in and out (Reduce Motion: no animation, instant). In the comparison the map is back to full size and the buttons are visible.
   d. **One single mode in the comparison**: the owner wants to change the layers AND zoom/pan at the same time. The map is free (native pan, zoom; rotation stays locked); each side changes by the chevrons of its side tag: a tap on a chevron = previous or next layer for that side (never the same layer on both sides, unavailable layers skipped, haptic selection), and a horizontal swipe on the tag does the same. No "Terminé" in the comparison; the one top control is the centred pill "Quitter la comparaison". The globe is disabled (dimmed) while comparing. Tags are therefore tappable (44 pt targets).
   e. **Removed**: the "N relevés ici" count pill is removed from the Explorer entirely (it serves nothing) and the transient notice "Les relevés sont masqués pendant la comparaison" is removed (survey markers stay hidden while comparing, silently). The info (legend) button stays in the normal Explorer.
### Earlier entries (obsolete where they conflict with the above)
### SUPERSEDED in part by the owner on 2026-10-11 (after sketch 016): keep the CURRENT Explorer design: the capsule with the basemap button and the download button together, and the locate arrow at the BOTTOM RIGHT, unchanged. No "Couches" pill, no big panel. The basemap button opens a light chooser (thumbnails, form to pick among sketch 019 A/B/C), "Comparer" lives in that chooser, a separate button opens the overlay chooser (Types de forêt, Parcelles Toutes / Avec IBP / Aucune). The Parcelles three-state control, chip-only download and curtain A below stand. The entry and panel bullets below are obsolete; the final form is fixed after sketch 019.
### Basemap change (owner, 2026-10-11, sketch 021 B refined): tapping the basemap (globe) button of the CURRENT capsule enters a swipe mode with NO bottom window: the map freezes, a pill at the top (level with the capsule) shows the basemap name, its era and 5 dots, plus a one-line hint and a "Terminé" pill; a horizontal swipe on the map reveals the neighbouring basemap by wiping in behind the finger (release beyond about a third of the width to commit, otherwise it springs back). Exit: "Terminé", tap on the map, tap on the globe, or 7 s of idleness. The basemap order cycles Plan, Satellite, État-major, Carte 1950, Photos 1950, skipping unavailable layers. The bottom-card families (019, 020) are NOT retained for the basemap; the download keeps a compact bottom card (018 A with sketch 020 style) and the overlay keeps its bubble; the comparison is to be designed next with the same gesture. Anything below that conflicts is obsolete.
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
