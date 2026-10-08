# 12.2-19 Fixes

## Explorer: direct open, download panel, edge pulse

Owner's iPhone check of batch 4 (build d619a38):

- Point 3 (screenshot of the "Relevé · IBP 23/50" sheet, with a "Voir le relevé" button): "Je comprends pas à quoi sert cet écran intermédiaire. Pourquoi un clic n'ouvre pas direct le relevé ? La touche retour fait revenir à la carte."
- Point 6 (offline download): "je trouve le bouton téléchargement un peu trop fin + on peut scroller dans la fenêtre donc c'est bizarre + je pense qu'en mode téléchargement, pour comprendre que c'est la zone qui est affichée qui va être téléchargée, il faudrait une animation où le bord de l'écran (et donc de la carte) s'illumine en vert, avec un pulse."

Three code commits: 4ad6111 (direct open), 01fd896 (download panel), 44472d2 (edge pulse). The map, the markers, the clustering and the zoom were not touched (`MapCanvas`, `SurveyMarker`, `ClusterMarker`, `useMapClusters`, `src/map` unchanged).

### 1. A survey marker opens the survey directly (4ad6111)

**Found.** `PublicMapScreen` kept a `selectedItem`. A marker tap set it, and the sheet showed `SelectedSurveyCard` (title, place and date, method, ring, "Voir le relevé"). Only that button called `onOpenSurvey`, which the route maps to `navigation.navigate("communitySurvey", { surveyId })` (a draft goes to its own `surveyDetail` instead). A cluster row also went through the card: `ClusterListSheet` `onSelect` was `handleSelectSurvey`, which swapped the list for the card. Parcel history rows already called `onOpenSurvey` directly.

**Changed.**

- One guarded handler, `openSurvey(id)`: it marks the survey's marker as selected and calls `onOpenSurvey(id)`. A marker tap closes an open cluster list or parcel history (they belong to another place) and calls it. A cluster row and a parcel history row call it too, and leave their panel open, so back returns to the list or the history with its other surveys.
- Double tap: a second call within 800 ms (`OPEN_SURVEY_GUARD_MS`) does nothing, so a quick double tap, or a tap during the push, cannot push two pages. React Navigation 7 would update the params of a `communitySurvey` already on top, but the guard does not depend on that.
- Back: unchanged. `communitySurvey` is pushed on the Explorer stack, which keeps `PublicMapScreen` mounted with its viewport. The panels that were open (cluster list, parcel history, download panel) are still there.
- Marker highlight: `selectedId` on `MapCanvas` is now `highlightedId`, the survey last opened from the map or shown from its page. On return the marker of the survey just seen is drawn selected. It stays until another survey is opened or focused.
- "Voir sur la carte" (OA-59 focus): it still centres the camera and now only highlights the survey's marker. There is no card and no automatic open. The `pendingFocusId` effect that waited for the item to load is gone: the highlight is an id, so the marker is drawn selected as soon as it arrives.
- Removed as dead: `SelectedSurveyCard.tsx` and its test; the card styles (`selectedSummary`, `selectedText`, `selectedPlace`, `ringColumn`, `SELECTED_OUTLINE_WIDTH`); the catalogue entries `publicMap.selected.*`, `publicMap.draft.*`, `publicMap.method.*` and `a11y.closeSelection`; the screen's `ownSurveyIds` prop (only the card's "C'est votre propre relevé" notice used it). `surveyPlaceLabel` ("Cas N" or the region) moved into `ClusterListSheet`, its last user. The method label (IBP v3.0 or v3.2) is still shown on the survey page.

**Tests.** `PublicMapScreen.test.tsx`:
- A marker tap calls `onOpenSurvey` once with the id. No sheet and no glass button are drawn, and the marker is drawn selected.
- A double tap within 300 ms opens the survey once, and a tap 2 s later opens it again.
- A draft marker opens directly.
- A focus centres the map and highlights the marker, without a panel and without opening anything.
- A cluster row opens the survey directly and the list stays open.

The tests for the old card were removed. `markers.test.tsx` gained a v3.0 survey row that carries a cas and shows its region. `routes.test.tsx` checks the screen no longer receives `ownSurveyIds`.

### 2. Download panel: bigger button, no scroll when it fits (01fd896)

**Found.** `OfflineAreasSheet` drew its `GlassButton` at `size="md"` (44 pt). The panel lives in the Explorer sheet's `ScrollView`. On iOS a vertical `ScrollView` bounces by default even when its content fits (`alwaysBounceVertical` defaults to true), so the short download panel moved under the finger.

**Changed.**
- The button is `size="lg"` (50 pt, the 44 pt hit area kept), stretched across the panel (`alignSelf: "stretch"`, also for the native iOS 26 host). Its label is clearer: "Télécharger la zone affichée". The loading ("Téléchargement…") and disabled states are unchanged.
- The subtitle points at the new frame: "La zone affichée, encadrée en vert, sera disponible sans réseau."
- `ExplorerSheet`'s `ScrollView` takes `alwaysBounceVertical={false}`. Why this instead of removing the scroll view for this panel: a panel that fits no longer moves at all, while a panel taller than the sheet still scrolls and bounces. A long cluster list needs that, and so does the download panel when the keyboard (the area name field) squeezes the sheet on a small phone. `scrollEnabled={false}` would cut the button off in that case. Android only shows its overscroll glow when the content overflows, so nothing changes there. The downloaded-areas list is no longer in this panel (it is in Paramètres since OA-123), so no list scrolls here.

**Tests.** `PublicMapScreen.test.tsx`: the download button is `lg`, stretched and enabled. `ExplorerSheet.test.tsx`: the scroll view has `alwaysBounceVertical` false and keeps scrolling enabled.

### 3. Green pulsing edge in download mode (44472d2)

**Found.** "Download mode" is the open download panel (`showOfflineAreas` in `PublicMapScreen`). The download takes `viewport.region`, the whole map view, including the part behind the sheet.

**Changed.**
- New `screens/public-map/EdgePulse.tsx`: an absolutely filled `Animated.View` over the map, after `MapCanvas` and before the controls and the sheet. It is `pointerEvents="none"` and hidden from screen readers (the subtitle says the same in words). Its look is one `boxShadow`, `theme.visual.edgeGlow`: a 2 pt inset ring and a 28 pt inset halo in bright moss (`downloadEdgeGlow` in `visual-tokens.ts`, light `rgba(137, 163, 58, …)`, dark a little lighter `rgba(155, 194, 106, …)`). No border, no gradient, no `borderCurve`, so the 12.2-17 layer rules hold. The bottom edge sits behind the blurred sheet, which shows it softly.
- Motion: only the opacity animates, from 0.35 to 1 and back, 800 ms each way (1.6 s cycle, `edgePulseMotion`), with `withRepeat` and `ReduceMotion.System` on the UI thread. The loop runs only while the screen can be seen (`useScreenVisible`: focused and not under an app overlay). It is cancelled when a survey page is pushed over the map. Under Reduce Motion the glow stays still at 0.85, with no loop.
- Visible while the download panel is open and no download has started (`choosingArea`). It goes when the download starts and stays gone after it finishes. A refused or failed download (too large, network) brings it back, so the user can move the map and try again. Closing the panel ends the mode, and reopening it starts a new choice. A download still running from before also keeps it off.

**Tests.**
- `EdgePulse.test.tsx`: inset glow token, no touch and hidden from assistive tech, no border or `borderCurve`. The loop is `withRepeat(-1, reverse)` with `ReduceMotion.System` and an 800 ms half cycle. It runs focused, never under Reduce Motion (fixed opacity 0.85), and never unfocused or covered.
- `PublicMapScreen.test.tsx`: the glow appears only when the panel opens, goes when the download starts and stays gone after it succeeds. It is back on reopen, gone on close, back after a refused download, and off while another download runs. There is no glow with a cluster list open.
- `motion.test.ts` and `layers.test.ts` stay green.

### Device-only checks

- Tap a survey marker: the community survey page opens at once. Back returns to the map at the same place, and that marker is drawn selected. A fast double tap pushes one page only.
- Tap an own draft marker: its own survey page opens.
- Tap a cluster that cannot split, then a row: the survey opens, and back returns to the list.
- "Voir sur la carte" from a survey page: the map centres and the marker is selected, with no panel.
- Download panel: the button is as tall as the other big buttons and as wide as the panel. The panel does not move when dragged inside. With the keyboard open on a small phone, it scrolls only if the button would be hidden.
- Download mode: a green glow around the screen edge, pulsing gently. It does not block map gestures (pan and zoom through it). It is readable over both the plan and the satellite basemaps, in light and dark. It stops when the download starts. With Reduce Motion on, the glow is still. Android: check that the inset `boxShadow` draws (new architecture), since only iOS has been reasoned about.

## Parcel layer and the real map zoom: not changed (finding)

The coordinator asked for the parcel layer to follow MapLibre's real zoom (owner's option C). The reason given was that `computeRegionZoom` reads about 0.4 *below* the real zoom, so the polygons appear too late. The code and MapLibre's geometry show the opposite, so no commit was made. This needs a decision first.

- `computeRegionZoom(region) = round(log2(360 / longitudeDelta))`, with `longitudeDelta` taken from the bounds MapLibre reports (`regionFromViewChange`).
- MapLibre Native draws the world 512 pt wide at zoom 0 (`mbgl::util::tileSize_D = 512`). A map view W pt wide at real zoom z therefore spans `360 · W / (512 · 2^z)` degrees, and the unrounded derived value is `z + log2(512 / W)`: about 0.38 *above* the real zoom on a 393 pt wide iPhone.
- `PARCEL_MIN_ZOOM = 15` against the rounded value means the switch fires when the unrounded value reaches 14.5. At that point the real zoom is about 14.1 (393 pt wide: 14.12; 402 pt: 14.15; 430 pt: 14.25; 440 pt: 14.28).
- So the layer already switches at real zoom 14.1 to 14.3. Switching at "real zoom 15" would show the polygons, and hide the pills, about 0.7 to 0.9 zoom levels *later*: the map would need about 1.7 times more zoom. That is the opposite of the owner's complaint.
- The `ViewStateChangeEvent` of `onRegionDidChange` does carry `zoom`, so the plumbing is easy once the threshold is chosen.
- The API refuses parcel statuses below zoom 15 (`MIN_PARCEL_STATUS_ZOOM` in `api/src/surveys/public-map.service.ts`, checked against the rounded zoom the mobile sends). Any real threshold under 15 needs the API constant lowered too, with bboxes up to about 4 times larger at real zoom 14.

To decide:
- (a) Real zoom with an earlier threshold, for example real 14, with the API constant at 14.
- (b) Keep the derived zoom, which already shows the polygons about 0.9 earlier than real 15.
- (c) Check whether "too late" is really the gap between the switch and the arrival of the parcel statuses. The pills vanish at once, on the live zoom, while the polygons wait for the 400 ms debounce and the network, so for a moment neither is drawn. Keeping the pills until the statuses arrive would close that gap without moving the threshold.

## Parcel colours

Owner feedback: the Explorer polygons are green by default, as if every score were good. Then, from a zoom recording near Vincennes: an ochre survey dot shows up to about zoom 15, and at the switch to parcels the dot disappears and only pale green polygons are drawn ("quand je zoome, je perds l'information de la parcelle avec un IBP").

### 1. Warm grey for parcels without a score (c76d176)

- In `byScore` mode (the Explorer only), a parcel without a usable total is now the warm grey `brandMapTokens.parcelUnscored` `#8C847A`, filled with `parcelUnscoredFill` (`rgba(140, 132, 122, 0.22)`). That covers parcels never studied and studied parcels without a total. It used to be sage (never studied) or moss (studied, no total), so green also meant "no score". Green now only means a high score.
- The map tokens are not scheme aware: the basemaps are the same plan and orthophoto in light and dark. So one pair is used, and the outline is checked at 3:1 or more against white, the IGN plan beige `#F2EFE9` and a dark forest orthophoto `#2E3A24` (3.69, 3.21, 3.26).
- A selected parcel still outranks everything: a scored one keeps its band fill with the heavy dark outline, and an unscored one keeps the terracotta selected paint.
- The parcel picker (`SurveyParcelSelectionScreen`, not `byScore`) keeps its sage/moss status colours and its legend. `brandMapTokens.parcelStudied*` and `parcelNeutral*` are unchanged.
- The Explorer legend gains a grey row "Parcelle sans score" (`fr.publicMap.legend.unscored`).
- Tests: `parcel-features.test.ts` covers the grey for null, NaN, undefined and never studied, the selected precedence, "not green and not a score colour", the 3:1 outline on both basemaps, and the picker unchanged. `ScoreLegend.test.tsx` checks the fifth swatch.

### 2. Root cause: a parcel registered by its IGN id lost its commune, section and number (e7537b5)

**Answer: yes, a parcel that has a public survey could arrive without its score. It was a real bug, not a data matter.** The polygon actually came back `not_studied` (no survey id, no total), and since that rendered sage green it looked like a pale green parcel.

- The app registers a parcel picked on the map by the `parcel_id` of the IGN WFS feature, which is its IDU: commune 5 digits, prefix 3, section 2, number 4 (`94080000AB0012`).
- `ensureParcelIds` (`parcels.service.ts`) and the sync fast path (`surveys.repository.ts`) fill `commune_code / section / number` with `parseParcelIdentifier`. That only knew the short form `^(\d{5})([A-Z]{1,3})(\d{1,4})$`, so every IDU got the placeholder `00000 / AA / 0000`. The old unit test even asserted the placeholder for IDUs.
- In production (`CADASTRE_PROVIDER=ign`) the Explorer's parcel statuses take the WFS path: `withStudyStatus` asks `PUBLIC_STUDIED_BY_COMMUNES_SQL` for the studied parcels of the features' communes (`p.commune_code = ANY($2)`), and matches them by the key `commune|section|number`. A parcel stored as `00000` is never in those communes, so its polygon was always "not studied".
- The survey dot was correct because map items locate a survey through `survey_parcels -> parcels` by `parcel_id` (the centroid that `lookupParcelById` backfills), never by commune code. The database path of the parcel statuses (no WFS) also joins by `parcel_id`, which is why the tests never caught it.
- Fix: `parseParcelIdentifier` reads the IDU and keys it as `parseWfsFeatures` keys the IGN features (section letters only, so `0A` becomes `A`; number on 4 digits). Migration `020_parcel_idu_fields.sql` repairs the rows already written: only IDU rows that still carry the exact placeholder and have a lettered section. It is safe to run twice.
- Tests: `surveys-normalize.utils.spec.ts` (IDU parsing, the IDU key equals the WFS feature key, the short form and unknown ids unchanged) and `parcels.service.spec.ts` (the real fields are now inserted). `migration-020-parcel-idu-fields.e2e-spec.ts` is new. `migration-019...e2e-spec.ts` now checks the 018 -> 019 order instead of "019 is last". **The two e2e specs were not run locally (no Postgres container on this machine); CI's `e2e` job runs them.**

The other paths were checked and nothing else drops the score:
- SQL: `latest_ibp_total` is `(lp.scores ->> 'ibp_total')::integer` of the latest public survey of the parcel (`LATERAL`, ranked by observation year, version, then submission time). Public means `s.status = 'submitted' AND s.deleted_at IS NULL`, with the observation year at most the current year. Drafts, including your own, never count: a parcel with only drafts is "not studied". Every submit writes `scores` with `ibp_total` (`SurveysService` submit, and `seed-demo-community.js`). So a studied parcel lacks its total only if a submitted row has a `scores` without `ibp_total`, which only the `'{}'` default from migration 001 could leave on a very old row.
- Mobile: `fetchPublicParcelStatuses` returns the items untouched; `PublicParcelStatusItem` keeps `latest_ibp_total`; `saveOfflineAreaParcels` stores the whole item as JSON and `getCachedParcelsForBounds` returns it as is. The offline cache is a snapshot taken at download time, so a survey submitted later is missing from it until the area is downloaded again. Two overlapping areas can also return the same parcel twice (`SELECT DISTINCT payload_json`). Neither drops a score that was there.
- Left as is: Corsican IDUs (`2A004...`). The WFS parser keeps digits only (`normalizeParcelPartToDigits(code_insee)`), so `2A004` becomes `00204` on that side, and `lookupParcelById` only reads digit communes. They stay unmatched, as before.

### 3. A scored survey keeps its marker until a scored parcel shows it (058f9ec, ecbef55)

From zoom 15, `MapCanvas` used to hide every public survey marker and cluster, and relied on the polygons alone. A survey whose parcel arrives without a score therefore disappeared. Now `markerItemsAtParcelZoom` (`mobile/src/map/maplibre/parcel-coverage.ts`) chooses which markers are clustered and drawn at that zoom. A survey loses its marker only when a drawn, scored parcel shows it:
- the scored parcel's `latest_submitted_survey_id` is that survey, or
- a scored polygon contains its display position (even-odd test, holes excluded, multipolygons by part). This covers a newer survey of the same parcel.

Every other survey keeps its marker (and its cluster), whatever the cause: parcels not loaded yet, an offline snapshot older than the survey, a parcel the statuses do not match. The author's own drafts keep their marker as before.

This was chosen over colouring the parcel under the dot by the survey's score, because that would show a score the server does not attribute to the parcel. It also keeps the clusters' tap behaviour.

It also helps with option (c) of the zoom finding above: the markers now stay until the parcel statuses arrive, so the map is never empty in that gap. Tests: `parcel-coverage.test.ts` (7 cases).

### Device-only checks

- Explorer above zoom 15 near the owner's Vincennes survey: once the API carries e7537b5 and migration 020 (pull-based deploy), the parcel of that survey is drawn ochre at the switch and its dot goes. Before the deploy, or for any parcel still unmatched, the ochre dot stays over the grey parcel instead of disappearing.
- Parcels without a survey are warm grey and read on both the plan and the satellite basemap, in light and dark. No pale green polygon is left on the Explorer.
- The legend's last row is the grey "Parcelle sans score".
- The parcel picker of a new survey still shows sage (not studied) and moss (already studied).
- Offline area downloaded before a survey was submitted: its dot stays visible at parcel zoom.

## Dark legibility and stronger edge pulse

The owner sent two dark mode iPhone screenshots: "En dark mode les boutons de explorer sont difficiles à voir" and "Je trouve que l'effet pulsé en téléchargement n'est pas assez intense encore". The same screenshot also showed the "Zones hors connexion" sheet with near invisible text.

**What causes it:** the basemaps (the plan and the orthophoto) do not follow the app scheme. In dark mode the glass was drawn for a dark backdrop, but it sat over a light plan. The 38% dark glass turned into a muddy grey there. On it, the moss glyph #9BC26A was at about 1.3:1, which a test now records. The sheet's dark blur gave the same mid grey under the grey secondary text.

### 1. Map controls (d2ada59)

- New token `mapControlGlass` (`visual-tokens.ts`), published as `theme.visual.mapControl`: `glass` (`tint`, `fill`, `android`), `hairline`, `icon`, `text`, `textMuted`.
  - Dark: a near opaque forest graphite `rgba(16, 24, 14, 0.84)` (0.94 flat on Android) with a light hairline `rgba(255, 255, 255, 0.28)`. Glyphs are light moss `#D2E8A8`, labels `#F2F3F1`, muted labels `#C9CED3`.
  - Light: the forest glyph and the divider outline are unchanged. The glass is denser frosted paper (0.76). Modelled over a dark orthophoto, the old 38% light glass left the forest glyph under 3:1.
- `GlassSurface` takes a new `surface` prop. On iOS 26 it sets the Liquid Glass `tintColor`, so the real refraction and the system rim stay (D-04, D-12). On older iOS it is the fill over the real blur, and on Android the flat fill (D-17). Without the prop nothing changes.
- Every overlay floating on a map uses it:
  - the top capsule (globe/map and download)
  - the locate button
  - the count pill "N relevés ici" / "Aucun relevé ici"
  - the legend (i) button and its panel
  - `MapInfoPill` / `MapActionPill`: the still maps of the survey pages, and the parcel picker, which shares `MapLegend`
- Glyphs are 24 pt (`mapControlIconSize`, was 22). Hit areas are unchanged: the capsule buttons are 50 pt, the 40 pt pills keep their 44 pt hit slop.
- On iOS 26 the outline is still the system's own rim. A caller's border is still stripped there (12.2-17).
- Tests: `visual-tokens.test.ts` checks glyphs at 3:1 and labels and muted labels at 4.5:1 on each of `tint`, `fill` and `android`. The backdrops are white plan, paper plan, an orthophoto mid field, dark canopy and black, in both schemes. It also checks that the glass stays translucent, that in dark it is near opaque with light ink and a visible hairline, and that the light glyph and outline are unchanged. New tests: `GlassSurface.test.tsx` (fallback fills), the Liquid Glass tint case, `MapControls.test.tsx`, plus updates to `MapChips` and `ScoreLegend`.

### 2. Explorer sheets (3b9e22c)

- `ExplorerSheet` now lays a fill over its blur (`theme.visual.sheet.fill`): `rgba(17, 18, 20, 0.88)` in dark and `rgba(247, 246, 240, 0.88)` in light. The text stays on the theme's own tokens: the title in `textStrong`, the subtitle and the estimate line in `textSecondary`. All of them are now at 4.5:1 over every basemap sample (the secondary text is 5.1:1 over the white plan in dark).
- The size warning ("Zone trop grande...") moved from the brand terracotta to `theme.onSurface.danger`. On the dark sheet the terracotta was about 3.2:1.
- `SheetCloseButton` is now a 44 pt glass circle (`theme.visual.sheet.close`, with a hairline in the fallback). Its X is 20 pt in `textPrimary`. It is at 4.5:1 or better on the circle over every sample.
- The drag handle gets its own token: the dark divider `#212226` was invisible.
- All three panels share `ExplorerSheet` and `SheetCloseButton`, so the cluster list and the parcel history get the same fix. Their rows are glass cards with their own fill, and their notices are opaque, so nothing else changed.
- Tests: sheet contrast pairs in `visual-tokens.test.ts`. New `SheetCloseButton.test.tsx` covers the circle, plus the `OfflineAreasSheet` text tokens and warning. `ExplorerSheet` and `ClusterListSheet` tests were updated.

### 3. Edge pulse (e951c33)

- `downloadEdgeGlow` is now built by `buildEdgeGlow()` from `edgeGlowGreens` and `edgeGlowGeometry`. It has three inset layers:
  - a 3 pt line `#4E9620`
  - a tight band, 16 pt blur and 6 pt spread, `#6DB52E` at 0.9
  - a wide halo, 36 pt blur and 10 pt spread (about 46 pt deep), `#7BC234` at 0.6
- These greens are more saturated than the brand moss, and the halo is brighter. The line keeps 3:1 against the white plan, the paper plan, the dark canopy and black.
- Both schemes now draw the same glow, because the basemap does not follow the scheme.
- `edgePulseMotion` was `{ 800, 0.35, 0.85 }` and is now `{ halfCycleMs: 700, minOpacity: 0.55, stillOpacity: 1 }`: a 1.4 s cycle between 0.55 and full. Under Reduce Motion the glow is still, at full strength.
- Unchanged: the UI thread loop, the focus and cover gating, `pointerEvents="none"`, the a11y hiding and the download-mode-only mount. `motion.test.ts` and `layers.test.ts` stay green.
- Tests: `EdgePulse.test.tsx` (three layers, starts at 0.55, a 1.4 s cycle, still at 1). `visual-tokens.test.ts` covers the layer list, the 36 to 48 pt depth, the line contrast, the saturation and brightness, and the motion values.

Map layers, markers and clustering are untouched.

### Device-only checks

- Dark mode, Explorer on the plan: the top capsule, the locate button, the count pill and the (i) button read as dark forest discs with a light rim and light moss glyphs. On iOS 26, check that the tinted Liquid Glass looks near opaque, not grey. If it is still too see-through, raise `mapControlGlass.dark.tint`.
- Dark mode on the satellite map, and light mode on both maps: the controls still read. In light, the glass is a little more frosted than before.
- Legend panel in dark: the title, rows and attribution are light on dark.
- "Zones hors connexion" in dark: the subtitle, the "tuiles · Mo" line and the X circle read clearly. The X circle is 44 pt and closes the panel. The same goes for the cluster list and the parcel history.
- Download mode: the green edge is clearly visible on the plan and on the satellite map, about 40 to 46 pt deep, and pulses visibly. With Reduce Motion on, it is still and strong.
- Survey detail still maps and the parcel picker: the pills and the legend look the same as the Explorer's.

## Accueil: new survey action

The owner: "C'est pas un peu bizarre ce bouton nouveau relevé intégré dans le héros de reprise ?" The "+ Nouveau relevé" strip at the bottom of the forest resume card looked like an action of the draft, mixed two unrelated actions and did not read as a button. On the proposal (the hero only resumes, "Nouveau relevé" becomes its own big action under it), the owner agreed but feared "qu'un simple bouton ne fasse pas très intégré à cette belle interface". So the new action is a glass card of variant I, not a plain button.

### 1. The resume card only resumes, a glass card starts a survey (5695eee)

- `ResumeCard` lost its footer (the rule, the band and the 44 pt link). With a draft it shows the title, "n/10 facteurs remplis.", the ten segments and "Reprendre". Without a draft it is still the "Nouveau relevé IBP" / "Démarrer un relevé" call to action. Its compact two-line layout and its entrance are unchanged.
- New `screens/home/NewSurveyCard.tsx`. `HomeScreen` draws it 12 pt under the resume card, in the same entrance slot, and only when there is a draft to resume. Without a draft the hero starts the survey itself, so the action never shows twice. Both call the same `onCreateSurvey`.
- The look is a full-width `AppCard` glass card: radius 22, translucent fill and hairline, no gradient and no `borderCurve`. Inside it:
  - a 40 pt moss disc with the "+" outline icon (`add-outline`, 24 pt). The disc is the variant I pill moss, and the icon its dark ink at 5.9:1. The disc does not follow the scheme.
  - "Nouveau relevé" in the Sora button face (`textStrong`)
  - the helper "Nom du site, méthode et parcelles." in `meta` / `textSecondary`. The wizard really asks the site's name first, then the method (and cas), then the parcels on the map, so "Choisir une parcelle" would have been wrong.
  - a chevron, like the "Outils" row
- The whole card is one `RipplePressable`. It shows the green wave, clipped to the card's inner curve (21 pt). It is at least 56 pt tall (a 40 pt disc with 8 pt above and below it). It has the role button, the accessible name "Nouveau relevé" and the helper as its hint.
- Behind the text there is a faint static copy of the contour lines (`ContourLines animated={false}`), clipped to the card. Its opacity comes from a new token, `glassContourOpacity`: 0.3 in light and 0.2 in dark. It is not animated, so the screen's motion budget is untouched.
- Catalogue: `fr.home.hero.newSurveyButton` is replaced by `fr.home.newSurvey` (`label`, `helper`), with no dash.

### 2. Layout budget

- `RESUME_LAYOUT` loses `footerPaddingY` and `footerRule`. The new `NEW_SURVEY_LAYOUT` holds the gap (12), the 56 pt minimum height, the 8 pt padding, the 40 pt disc, the icon and chevron sizes and the 1 pt hairline. `newSurveyCardHeight` adds the card to `homeMapVisible` only with a draft.
- With a draft, the resume card is 114 pt (it was 159 with the footer), and the new card with its gap is 70 pt. The page grows by 25 pt, and "Autour de vous" starts at 526 pt instead of 501.
- With a draft, a one-line title and three recent surveys, the "Autour de vous" section still shows at launch:
  - 393 x 852: 133 pt of it (target 96)
  - 375 x 812: 102 pt (target 96)
- The real overflow, with a draft whose name wraps to two lines:
  - 393 x 852: still 105 pt
  - 375 x 812: 74 pt (its 26 pt header and 48 pt of map), under the 96 pt target
  - The test records this case instead of hiding it. Without a draft nothing changes, because the hero is the only card.
- Tests: `NewSurveyCard.test.tsx` (new) covers the role, name and hint, the 56 pt target, the ripple radius, the AppCard glass props, the disc and icons, the static clipped texture in both schemes, and AA for the label and helper over the glass, plus the "+" on the disc in light and dark. `ResumeCard.test.tsx` now checks that a draft card holds the body alone with one button. `HomeScreen.test.tsx` checks that the card shows only beside a draft and calls `onCreateSurvey`. `layout-budget.test.ts` has the new heights and the 74 pt case. `catalogue.test.ts` checks the new group.

Gates: lint, typecheck, `test:coverage:mobile` (245 suites, 2836 tests), the ibp-domain suite (230 tests) and format check all pass. Format check flags only the untracked `.claude/settings.local.json`. No dependency changed.

### Device-only checks

- Accueil with a draft touched in the last 48 h: the forest card shows only the resume content. Under it, a glass card with a moss "+" disc, "Nouveau relevé", "Nom du site, méthode et parcelles." and a chevron. It reads as a separate, tappable action of the same family as the "Outils" row.
- Tapping the glass card draws the green wave from the touch point, clipped to the rounded corners, then opens the wizard on the site name step. "Reprendre" still opens the draft.
- Without a recent draft: only the forest "Démarrer un relevé" card, and no glass card.
- The contour texture is barely visible and never competes with the text, in light and in dark. If it is invisible in light or too strong in dark, adjust `glassContourOpacity`.
- On a small phone (375 x 812 class) with a long draft name on two lines, the top of "Autour de vous" is a thin slice at launch. Tell us if that is acceptable.
- VoiceOver: the card reads "Nouveau relevé, bouton" followed by the helper hint.

## Perimeter glow and animated hero

After the batch 4c iPhone check, the owner sent two notes. On the Explorer in download mode, the green glow ran only along the map's edges and the white "Zones hors connexion" panel cut it off: "L'effet est pas incroyable, et je m'attendais à avoir un truc qui fasse tout le tour de l'écran… mais ça s'intègre peut-être pas bien avec la fenêtre de téléchargement." On Accueil: "La carte forêt : en vrai je m'attendais à un truc un peu dynamique comme les vagues sur l'écran de connexion. À voir ce que ça donnerait."

### 1. The download glow goes round the whole screen (2ba0677)

- **Where it is mounted.** It is now in the navigation layer: `DownloadEdgeGlowHost` (`navigation/download-edge-glow.tsx`) wraps the `NavigationContainer` in `AppNavigation` and draws `EdgePulse` as its last child. That puts it above the tab trees, the Explorer panel and the tab bar, and under the app overlays (sign-in, onboarding). Mounting it inside the screen could not work for two reasons. On iOS the native tab bar (`react-native-bottom-tabs`) is drawn above every screen's views, and on Android the JS tab bar is a sibling of the screens. A screen-level overlay could cover the panel but never the bar.
- **How the screen asks for it.** `PublicMapScreen` renders `DownloadEdgeGlow` (which draws nothing) where it used to render `EdgePulse`, under the same rule: the panel is open and no download has started. The request holds only while the Explorer can be seen (`useScreenVisible`: focused and not under an overlay). So the glow never shows over another tab, a pushed survey page or the sign-in, and it unmounts, with its loops, as soon as the request goes. The host counts requests, so a remount never makes it flicker.
- **The glow.** `EdgePulse` now covers the window. The halo layer uses `borderRadius: edgeGlowGeometry.corner` (52 pt, close to the iPhone display radius of about 47 to 55 pt), so the inset glow follows the screen's rounded corners. The three inset layers stay: a 3 pt line, a band and a halo. The band (12 pt blur, 4 spread, 0.85 alpha) and the halo (28 blur, 8 spread, 0.45 alpha, 36 pt deep, within the 36 to 48 pt rule) are a little lighter and shallower than before. The glow now lies over the white panel, whose text and big download button start 16 pt in from the edge. The line keeps 3:1 on white and on the dark orthophoto. The halo pulses more gently: 0.7 to full over 2.2 s (it was 0.55 over 1.4 s).
- **The travelling light.** An SVG over the halo holds two `Rect` strokes on the screen's rounded outline: a 14 pt soft stroke (halo green, 0.55) and a 4 pt core in a new, brighter `edgeGlowGreens.light` (#9BEA3E). Each is one dash, 14 % of its outline long. Its `strokeDashoffset` runs from 0 to minus the perimeter, one lap in 3.2 s, linear and clockwise from the top left (`useAnimatedProps`, on the UI thread, no per-frame JS). Each stroke runs its own outline in one lap, so the core stays inside its glow. A masked conic sweep would have needed a new dependency, so it was not used.
- **Guards.** `pointerEvents="none"`, hidden from accessibility, `ReduceMotion.System` on both loops. Under Reduce Motion the halo is still at full strength and no light is drawn. There are no borders and no `borderCurve` (layer gates pass), and the colours come from tokens only (`edgeGlowGreens`, `edgeGlowGeometry`, `edgePulseMotion`, new `edgeLightMotion`).
- **Tests.**
  - `EdgePulse.test.tsx` covers the full-screen rounded halo, the gentle pulse, the 3.2 s non-reversing lap, the light's geometry (`lightPath`, `roundedRectPerimeter`), Reduce Motion with no light, and the focus and cover gates.
  - New `download-edge-glow.test.tsx`: the host draws the glow after the tree and only while asked. One glow for any number of requests. No glow when the screen is unfocused or covered. Nothing happens without a host.
  - `PublicMapScreen.test.tsx` now counts `DownloadEdgeGlow` requests under the same download-mode rules.
  - `visual-tokens.test.ts` has the new layers, the corner range, the lighter-over-panel limits, the pulse, and the light being the brightest green.

### 2. The forest card flows with waves (2d35a96)

- **What the sign-in "vagues" are.** `auth-gate/HeroSection.tsx` has three organic blobs behind the logo, each with different corner radii and a different rotation. Each one spreads (scale 0.3 to 14) and fades over a 10 s linear cycle, a third of a cycle after the previous one, in the legacy `Animated` API. They are not a shared component, and the spreading ripple is tied to the logo. So the card keeps the same motion language rather than the same component: slow, linear, a 10 s cycle, three elements a third apart.
- **New `ui/ForestWaves.tsx`.**
  - Three sage wave lines (`forest.contourSage`) drawn as **one SVG path** of quadratic arcs, in the card's lower half (baselines at 56, 72 and 88 % of its height), a third of a wavelength apart, each a little flatter than the one above.
  - The layer is one wavelength wider than the card. It drifts one wavelength in 12 s (linear) and loops with no seam. It breathes on a sine over 10 s, the sign-in's cycle: ±3 pt up and down and ±14 % vertical swell. Both are 8 to 14 s cycles.
  - Only transforms are animated, on the UI thread. The path is built once per card size from `onLayout`, with no per-frame JS.
  - Both loops are phases read modulo 1, so leaving Accueil and coming back carries on from the same frame without a jump.
  - The loops run only while Accueil is visible (`useScreenVisible`). Reduce Motion draws the still first frame. `ReduceMotion.System` is set on every loop.
- **Card.** `ForestCard` has a new `waves` prop. The waves are drawn inside the clipped view, so the card's rounded rectangle clips them, over the contours. With `waves`, the contours are drawn **still**: the waves **replace** the contour drift as the card's one animated layer, so Accueil's budget stays at one animated instance (the "Nouveau relevé" glass card's contours were already still). `ResumeCard` turns it on for both forms, "Reprendre" and the no-draft "Démarrer un relevé". The survey detail score card and the Mes Relevés summary card keep their contour drift.
- **Readability.** The line opacity is 0.2 at 1.8 pt. At 0.32 the body text "n/10 facteurs remplis." dropped to 3.8:1 where a line crosses the gradient's mid stop. At 0.2 it keeps 4.5:1 over every gradient stop, and the white title keeps 6.4:1 or better. The colour is the same in both schemes (the forest card does not follow the scheme), and a test checks it.
- **Tests.**
  - New `ForestWaves.test.tsx`: the path geometry (three lines, lower half, a wavelength before and past the sliding layer), one faint sage path, decoration-only props, the two endless linear loops at 12 s and 10 s with `ReduceMotion.System`, a layer one wavelength wider, Reduce Motion still, and the focus and cover gates.
  - `ForestCard.test.tsx`: no waves by default; with `waves`, still contours and the waves inside the clip.
  - `ResumeCard.test.tsx`: both forms carry the waves.
  - `visual-tokens.test.ts`: AA over the waves, cycle lengths, a gentle swell.

Gates: lint, typecheck, `test:coverage:mobile` (247 suites, 2862 tests), the ibp-domain suite (230 tests) and format check all pass. Format check flags only the untracked `.claude/settings.local.json`. No dependency changed.

### Device-only checks

- Explorer, download button: a green line with a halo runs all round the screen, including over the white panel and the tab bar (and the iOS 26 search button), and follows the rounded corners of the display. If the corners sit visibly inside or outside the glass, retune `edgeGlowGeometry.corner`.
- A brighter light circles the edge clockwise, about one lap every 3 s, over a halo that breathes gently. It should read as a moving light on the white panel as well as on the map or satellite view.
- The panel's text, name field and "Télécharger cette zone" button stay as easy to read and tap as before. Taps anywhere, including on the tab bar through the glow, still work.
- Starting a download, closing the panel, switching tab or opening a survey from the map makes the glow disappear at once. Coming back to the Explorer with the panel still open brings it back.
- Reduce Motion on: the glow is still and at full strength, and no light travels.
- Accueil: the forest card (with a draft, and the "Démarrer un relevé" card without one) shows faint sage waves in its lower half, drifting slowly sideways and gently rising and falling. The title, "n/10 facteurs remplis." and "Reprendre" read as before. The waves stop when Accueil is left and pick up again without a jump. Under Reduce Motion they are still.
- Smoothness: the waves (and the glow) keep the scroll and transitions at full frame rate, on an older iPhone too.

## Download progress, pulse only, ripple hero

After the batch 4d iPhone check, the owner sent four notes: "Pas de barre de progression du téléchargement"; on the "Télécharger la zone affichée" button, "Bouton trop grand" (it had been "un peu trop fin" at the md size); on the download glow, "L'animation est bof de la zone à télécharger. J'aurais préféré juste un pulse plus fort, pas le truc qui tourne"; and on Accueil, "La carte forêt : ce n'est pas l'animation de l'écran de connexion … et les lignes vert clair rendent le tout illisible."

### 1. A progress bar in the download panel (c257d4e, 57e262f)

- **What existed.** The progress was already computed but never shown. `downloadAreaPacks` (`map/offline-packs.ts`) reports the native pack status (`percentage` = completed over required resources, averaged over the two basemaps, and `completedTileCount`) through `onProgress`. `useOfflineAreas` turned that percentage into tiles against the estimate and wrote it to SQLite (`updateOfflineAreaProgress`), then reloaded the area list on every report. The panel only received `downloadingAreaId`, so all it could show was a spinner on its button ("Téléchargement…"), and a failure was an alert.
- **Hook.** `useOfflineAreas` now publishes `downloadStatus`: `running` (area name, percentage, tiles done, total tiles), then `done` or `failed`, plus `clearDownloadStatus`. The status is set to running at 0 before the first storage write, so the panel switches at once. The percentage never goes back (a basemap starting late would pull the average down). A late native report never takes the panel back from its outcome. A storage failure before the download, or a failure to record the failure, also ends as `failed` and frees the panel. The SQLite progress writes are kept, for Paramètres.
- **Panel.** `OfflineAreasSheet` lays `DownloadStatusView` over its form once a download has started. The form stays laid out but hidden (opacity 0, no touches, hidden from screen readers), so the panel keeps the same height in every state and nothing under the header moves. The keyboard of the name field is dismissed on download.
  - Running: the area name, a 10 pt rounded bar, "Téléchargement : 42 %" and "78 sur 186 tuiles". The fill is a full-width bar slid in from the left (`translateX` on the UI thread, inside the clipped track, so its rounded end stays round), hidden until the track is measured, and it eases over 400 ms to each report so a coarse native step still reads as a flow. Reduce Motion shows each value at once. The bar is a `progressbar` with min 0, max 100, now and a text value; each 25 % step is announced once, never backwards.
  - Done: "Zone disponible hors connexion", "<nom> est enregistrée sur ce téléphone." and a 46 pt "Terminé" that closes the panel (no auto-close).
  - Failed: "Le téléchargement a échoué" in the danger colour, "Vérifiez votre connexion, puis réessayez." and a 46 pt "Réessayer", which downloads the area shown under the same name.
  - Colours: new `downloadBarColors` tokens through `theme.visual.downloadBar`. The brand moss is only 2.7:1 on the light sheet, so the light fill is a deeper moss (#5E7A1F on #DDE3CF); the dark fill is the dark accent green (#9BC26A on #2C2F34). Tested at 3:1 against the sheet (over the white and the black map) and against the track, in both schemes.
- **Screens.** The Explorer and the parcel selection share one `useAreaDownloadAction`: a failure is shown in the open panel, and an alert is kept only when the panel was closed in the meantime; a refused area (too large) keeps its alert. Opening or closing the panel drops a finished outcome; a running download keeps its bar when the panel is reopened. The glow rule is unchanged (it comes back on a failure, since the retry takes the area shown).
- **Tests.** `useOfflineAreas.test.ts` (running from 0, real percentage and tiles, held percentage, clear keeps a running status, done, late report ignored, failed, storage failure, refused area). New `DownloadStatusView.test.tsx` (texts, progressbar values, bar geometry and theme colours, fill hidden before layout then slid, timing with `ReduceMotion.System`, 25 % announcements, done and failed with their 46 pt buttons). New `OfflineAreasSheet.test.tsx` (form visible, hidden but laid out under every status, same form in every state, keyboard dismissed, retry with the name, close button). `PublicMapScreen.test.tsx` (running then done, Terminé closes and clears, retry, alert only when closed). `visual-tokens.test.ts` (bar colours).

### 2. A 46 pt download button (59398d6)

- New size token `brandComponentTokens.button.minHeightPanel` (46 pt), between md 44 and lg 50. `GlassButton` takes an optional `minHeight` that replaces its size's own, on the native iOS 26 host and in the fallback alike. The panel's button is the regular control drawn at 46 pt, full width, same label; every other lg button keeps 50 pt. The "Terminé" and "Réessayer" buttons use the same height.

### 3. The glow is a strong pulse only (deb5105)

- The travelling light is gone: the SVG dash strokes, `lightPath`, `roundedRectPerimeter`, `edgeLightMotion`, the `edgeGlowGreens.light` green and their tests.
- `EdgePulse` keeps the full-screen rounded halo drawn by `DownloadEdgeGlowHost`, with the same request, focus gate and stop conditions. The halo now beats between 0.35 and full strength on a 1.5 s cycle (it was 0.7 over 2.2 s). A second layer, `theme.visual.edgeGlowDeep` (38 pt blur, 14 spread, 52 pt deep, saturated halo green at 0.22), swells in from nothing at the low point to full at the top of each beat (`deepHaloOpacity`, opacity only, UI thread). Under Reduce Motion both layers are still at full strength. `pointerEvents="none"`, hidden from accessibility.
- Readability: a new test models each inset shadow as a Gaussian and checks that the panel's text (starting 16 pt in) keeps 4.5:1 under the whole glow at the top of the beat, on the light and the dark sheet. At 0.3 the deep halo took the dark sheet's grey text to 4.35:1, so it is 0.22 (4.6:1 or better).

### 4. The forest card ripples like the sign-in screen (75595d0)

- **Re-read of the sign-in.** `HeroSection` has three blobs behind the logo; each scales 0.3 to 1.6 by 15 % of a 10 s linear cycle and on to 14, fades in by 6 % and is nearly gone by 70 %, a third of a cycle after the previous one: concentric ripples from one point.
- **New `ui/ForestRipples.tsx`.** Three discs spread from behind the card's button ("Reprendre", or "Démarrer un relevé" without a draft) to the card's farthest corner and fade out, with the sign-in's keyframes and stagger. `ResumeCard` measures its button (a wrapper's `onLayout`, offset by the card padding) and passes the centre through `ForestCard`'s new `ripples` and `rippleOrigin` props; the card clips them. One shared phase drives the three (opacity and scale only, UI thread), carried on from where it stopped, running only while Accueil is seen. There are no rings under Reduce Motion. The contours are still under them, so Accueil keeps one animated layer.
- **Calm.** The discs are #557343, a green only slightly lighter than the card gradient (at most 1.2:1 against any stop at the peak), at most 0.14 opaque. Tests: the title and "n/10 facteurs remplis." keep 4.5:1 on every gradient stop under all three discs stacked at their worst moment (about 0.24 together, at the button); the filled segments keep 3:1 under one disc at its peak, and the empty segments' track reads as before.
- **Removed.** `ForestWaves.tsx`, its tests, the `forestWaves` tokens and the `waves` prop: no light green lines anywhere.
- **Note on the segment targets.** The brief asked for the segments at 4.5:1. The filled segment (#89A33A) is 3.25:1 on the gradient's mid stop with no ripple at all, so 4.5:1 cannot hold without restyling the segments; the test uses the non-text 3:1 instead. The empty segment's track (white 0.14) is about 1.5:1 against the card by design, before and after; the test checks the ripples do not reduce it.

### 5. The download button covered the estimate line (3b84499)

Owner, on ce5960f: "Bug d'affichage du bouton". In "Zones hors connexion" the "Télécharger la zone affichée" button covered the estimate line ("3974 tuiles · ~79.5 Mo" cut in half by the button's top edge), with empty space under the button.

- **Root cause (most likely; Jest cannot show native drawing).** The form itself is one flex column (field, estimate, button, 12 pt gap) with nothing absolute in it; the status overlay of round 1 only exists once a download has started, so it was not involved. What changed for the form was the button: the md control at a 46 pt minimum instead of the lg control at 50. The native button's `Host` used `matchContents` (vertical). In `@expo/ui` 57 that is `.fixedSize(vertical: true)` on the SwiftUI content plus a height reported back to React Native (`HostView.swift`). So the capsule kept the regular control's own ideal height and position, whatever the 46 pt box React Native laid out, and it was drawn over the line above. The lg control's ideal height is close to 50, so the old size never showed the gap.
- **Fix.** `GlassButton` with an explicit `minHeight` now gives the native host an exact `height` and no `matchContents`. SwiftUI is offered the whole box and the label row (`frame(maxWidth/maxHeight: FILL)`) fills it, so the capsule is the box. The label is kept to one line and may shrink to 0.75 so it never outgrows the box at large text sizes. Buttons without a given height keep the self-sizing host. The Android and pre-iOS 26 fallback was already a plain flex child.
- **Same height across states, measured.** The panel no longer only relies on the hidden form. Unseen, silent copies of the running, done and failed statuses (widest figures, the area's name, announcements off) are laid out under the form at the panel's width and text size. The tallest one becomes the body's `minHeight`, and the form stays in the flow, so the body is the tallest of the four states. It can grow, for example with large text or a two-line size warning, but nothing can overlap. The keyboard (the sheet's `KeyboardAvoidingView`) and small screens only change the room around this column.
- **Tests.** `OfflineAreasSheet.test.tsx` checks, for the estimate and for the size warning, that the line and the button are consecutive children of one column with a gap, and that nothing from them up to the panel body is absolute, has a fixed or maximum height, or has a negative margin or offset. It also checks the measuring layer (unseen, untouchable, unread, three silent copies) and the body floor following the tallest measured status. `GlassButton.liquid.test.tsx` checks the exact-height host (height 46, no `matchContents`, label row filling it, one line, 0.75 scale), and that the self-sizing host is unchanged without a given height. `DownloadStatusView.test.tsx` checks that the measuring copies never speak.

Gates after this fix: lint, typecheck, `test:coverage:mobile` (249 suites, 2903 tests), the ibp-domain suite (230 tests) and format check all pass (only the untracked `.claude/settings.local.json` is flagged).

Gates: lint, typecheck, `test:coverage:mobile` (249 suites, 2896 tests), the ibp-domain suite (230 tests) and format check all pass. Format check flags only the untracked `.claude/settings.local.json`. No dependency changed.

### Device-only checks

- Explorer, download: starting a download turns the panel into the bar at once, with no jump in height. The bar fills smoothly with the real progress, the percentage and the tiles follow, and it ends on "Zone disponible hors connexion" with "Terminé". With the network cut mid-download, the panel shows the failure and "Réessayer" works. Closing the panel mid-download and reopening it shows the bar still running; a failure while it is closed is an alert.
- VoiceOver: the bar reads as a progress indicator with its percentage, and 25, 50, 75 and 100 % are announced once each.
- The bar's moss fill and pale track read clearly on the light and the dark sheet.
- The download button is 46 pt: neither thin nor heavy. Compare with the 50 pt buttons elsewhere.
- Overlap fix: in "Zones hors connexion" the estimate line, or for a big area the size warning, sits whole above the button, which is a full 46 pt capsule in its own box. Check on a small phone (375 x 667 class), a large one, with the name field's keyboard open and with a large text size (the label shrinks a little rather than spilling). The panel keeps one height from the form to the bar, "Terminé" and "Réessayer".
- The download glow only pulses (no light going round), clearly stronger, with a deeper halo at the top of each beat, still readable over the white panel; still and strong under Reduce Motion. Its corners still follow the display.
- Accueil: faint rings spread from behind "Reprendre" (and "Démarrer un relevé") and fade, like the sign-in screen, never crossing the title or the factors line at a visible contrast; no green lines. If they are too faint to notice, raise `forestRipples.peakOpacity` towards 0.16. They stop when Accueil is left and pick up again without a jump; none under Reduce Motion.
- Smoothness of the rings and the glow on an older iPhone.

### 6. Forest card: aurora and tracing contours (86fe30b)

Owner, on the ripples: "Je suis toujours pas fan de l'animation qu'il y a sur la carte forêt", and the contour lines drawn over the whole card hurt the reading. Sketch 010 (`.planning/sketches/010-forest-card-motion/index.html`, 9342e1d) showed seven directions; the owner chose "un mélange de A et F": A "Aurore" (soft colour patches drifting) and F "Relief qui se dessine" (contours tracing themselves, right side only).

- **New `ui/ForestAurora.tsx`, in place of `ForestRipples`.** Three layers inside the card's clip, under the content:
  - **Aurora.** Three discs, moss (#54902A at 0.44), teal (#2C8062 at 0.40) and a faint ochre (#A2843A at 0.30), each a react-native-svg `RadialGradient` drawn once that fades to nothing at its rim (no runtime blur, no blend mode). They rest past the top left, the bottom right and the top right corners and drift across the card and back, 14, 17 and 20 s each way (translate and scale only, eased, on the UI thread). Each phase runs on by a full there-and-back from where it stopped, so a pause never makes a disc jump.
  - **Shield.** A left to right darkening in the card's darkest green: 0.55 at the left, 0.30 at 55 %, 0 at 82 % (`forestShieldImage`, an `experimental_backgroundImage`), over the discs and under the text.
  - **Tracing contours.** Four thin lines (1 pt, at most 0.3 opaque, two greens) drawn only right of the text column: `ResumeCard` measures its button and passes where the text column ends (`padding + button x - row gap`); until that is known there are no lines. Inside that area they fade in from the left (a stroke gradient over the first 45 % of the drawing), are drawn once with a dash reveal (each line 2.4 s, 0.45 s after the one before, animated `strokeDashoffset`), then breathe slowly (opacity down to 0.55 of itself over 9 s and back, starting only once the tracing has ended).
- **Budget and gating.** The aurora and the contours are Accueil's one animated layer, on both the "Reprendre" card and the "Démarrer un relevé" card. Everything runs only while Accueil can be seen (`useScreenVisible`, so not under an overlay or on another tab), stops where it is when hidden and goes on from there. Under Reduce Motion the discs stay at rest and the lines are fully drawn and still. All timings carry `ReduceMotion.System`. No per-frame JS: the poses, offsets and opacity are worklets.
- **The contour layer of this card is gone** (`contours={false}`), so no line ever sits behind the title or the factors line. `ForestCard` traded its `ripples` and `rippleOrigin` props for a generic `backdrop` slot (drawn inside the clip, over the gradient, under the content). The survey detail score card and the Mes Relevés summary card did not use the ripple props and keep their contour drift as before; `NewSurveyCard` keeps its still contours.
- **Readability (tests in `visual-tokens.test.ts`).** Worst case: all three discs at their peak over one another, over each stop of the card gradient. With the shield at every point of the text column (up to 64 % of the width, more than the column reaches on the widest phone), the title and "n/10 facteurs remplis." keep 4.5:1 (about 6.4:1 and 4.8:1 at the weakest point). With no shield and a contour line at full strength on top, the filled segments keep 3:1 (about 3.1:1). That is why the filled segments changed from moss #89A33A to the pale forest green #C8DDA0 (`forestAurora.progressDone`): the moss is only 3.25:1 on the bare card, so any visible glow under it would drop it below 3:1. The CTA is an opaque pill, so its label keeps its contrast whatever is behind it (tested in both schemes).
- **Removed.** `ForestRipples.tsx`, its tests, the `forestRipples` token, `theme.visual.forest.ripple` and the ripple props.
- **Geometry** lives in `app/forest-aurora-shape.ts` (disc sizes, anchors, drift, the four cubic paths, timings), colours in `visual-tokens.ts` (`forestAurora`, same values in both schemes). A test checks each line's control polygon is shorter than the dash, so a line is wholly hidden before it is traced.

Gates after this fix: lint, typecheck, `test:coverage:mobile` (249 suites, 2911 tests), the ibp-domain suite (230 tests) and format check all pass (only the untracked `.claude/settings.local.json` is flagged). No dependency changed.

Device-only checks for this fix (they replace the "faint rings" check above):

- Accueil: soft green, teal and warm patches drift slowly across the forest card, on both forms of the card; the left side stays darker and the title and factors line read clearly at every moment. If the aurora is too faint, the discs' `peak` can go to 0.45 only together with a retest of the contrast suite.
- On arriving on Accueil, four faint contour lines draw themselves one after the other right of the text (around and below the button), then breathe very slowly. No line ever runs behind the title or the factors line, also with a long survey name on two lines and on a small phone.
- The filled progress segments are now pale green: check they still read as progress next to the empty ones, over the brightest moment of the aurora.
- Leave Accueil (another tab, the survey, an overlay) and come back: the patches go on from where they were, without a jump; the lines are not traced again.
- Reduce Motion on: the card is still, patches at rest and lines fully drawn.
- Smoothness on an older iPhone and on Android (three SVG gradients and four animated paths on the UI thread).

## Forest cards: continuous motion, stronger colour, every card

Owner, on 201eb87: "J'ai toujours un problème avec l'animation, elle est vraiment très belle, par contre elle se lance une fois et après elle s'arrête. Alors que pour moi elle devrait se jouer un peu en continu en mode random quoi et les [halos] de couleur sont vraiment trop light pour être perceptibles et je m'attendais à ce que ces animations soient aussi intégrées dans toutes les autres cartes forêt de l'application donc dans mes relevés et dans le détail des relevés."

Commits: 0b135fb (motion, colour, shield, `ForestCard` default), 70074b7 (score card and Mes Relevés card), 4346813 (motion budget gate).

### 1. It never stops, and does not repeat

- **Why it read as stopped.** The contours drew once and then only breathed slowly. The discs went there and back on one straight line each (14, 17 and 20 s), which reads as a predictable cycle.
- **Discs.** Each disc now follows a closed random path (`app/forest-motion.ts`): 7, 5 and 4 waypoints with legs of 9, 13 and 17 s. That makes 63, 65 and 68 s per loop, so the three never line up the same way for a very long time. The waypoints (position across and down the clear zone, scale 0.85 to 1.2, opacity 0.60 to 0.92 of the peak) are drawn once per mount from a small seeded generator (mulberry32). Each disc also starts at a random point of its path. The path is a closed Catmull-Rom curve through the waypoints, so the disc never stops at a waypoint and the loop has no seam. Once per loop, at its rightmost waypoint (away from the text), a disc blooms to its full peak and 12 % larger for about 2 s, so a bloom happens roughly every 20 s across the three, at irregular times.
- **Contours.** An endless relay of strokes. Each stroke draws a line or erases it from its start (2.2 to 3.2 s to draw, 1.8 to 2.6 s to erase). The next stroke always starts 35 to 85 % into the current one, so at every moment a line is moving, and some lines draw while others erase. An erase is never allowed to leave the card without a drawn or drawing line. The relay leans towards erasing when three are drawn and towards drawing when one is. The holds between a line's strokes come out at random. After 72 s the relay steers back to the lines it started with, so it loops without a jump (tested over 40 seeds: always one line moving, never all hidden, never all held, start equals end).
- **Threading.** The plans are plain arrays drawn on the JS thread at mount. Every frame is a worklet that only reads them (`discPoseAt`, `traceLineOffset`): no per-frame JS, no restart. Each phase is a linear `withRepeat` from where it stopped, so leaving the screen and coming back goes on without a jump. Gating is unchanged: it runs only while the screen can be seen (`useScreenVisible`). Under Reduce Motion the discs rest at their starting pose, the lines are fully drawn and still, and nothing fades in. Every timing carries `ReduceMotion.System`. The aurora fades in over 0.7 s once its zone is known, so it never pops in.

### 2. Stronger colour, text still readable

- **Discs** are about 1.3 times larger (312, 286 and 220 pt), more saturated and more opaque at the peak: moss #5FA82C at 0.70, teal #1F9A78 at 0.65, a warm ochre #C8913A at 0.45. Each has a slightly lighter heart (its colour mixed 15 % with white at the centre) and a softer falloff (1, 0.8 at 35 %, 0.3 at 70 %, 0 at the rim). On its own at its peak, a disc now lifts the card by 2.6:1 (moss), 2.2:1 (teal) and 1.9:1 (ochre) against the bare gradient, where it was 1.5, 1.3 and 1.3:1.
- **Contours** are a little lighter (#7FA347 and #64873A, at most 0.34), still 1 pt and drawn only in the clear zone.
- **Shield, per card.** The single left-to-right gradient is replaced by readable zones. Each card gives a clear zone (`AuroraZone`: right of `left`, above `bottom`), measured around its own text. The shield is a solid layer of the card's darkest green over the text column, and over a bottom band when the card has one. Each fades to nothing into the clear zone (56 pt for the column, 28 pt for the band), so no text ever sits on a fade. The discs roam the clear zone only: their centres stay from 15 % of its width to just past the card's right edge, so the text column only gets their rims. Two strengths: `standard` (column 0.55, band 0.55) for Accueil and Mes Relevés, and `score` (column 0.64, band 0.80) for the survey's score card. The score card needs more because of its sage units and its glass tiles.
- **Worst case tested** (`forest-aurora-tokens.test.ts`): all three discs at their full peak with their lighter heart, stacked on one point, on each stop of the card gradient, under the card's shield. Lowest ratios:
  - Accueil, column: title 7.4:1, "n/10 facteurs remplis." 5.5:1. Band: filled segments 5.0:1 (3:1 needed), the empty track still darker.
  - Mes Relevés, column: figures 7.4:1, accent figure 5.0:1, labels 5.5:1.
  - Score card, column: caption 6.6:1, numeral end 6.0:1, "/50" unit 4.8:1. Band: tile labels 6.7:1, tile values 9.1:1, tile units "/35" 4.9:1, hint 8.9:1. The "/35" units were 3.9:1 on the bare mid stop before this round; the band shield lifts them over 4.5:1.
  - Without a shield the same worst case puts the body text under 4.5:1, so the shield is required (also tested). Accueil's button is opaque, so its label keeps its contrast.
- **Tokens.** `visual-tokens.ts` was at 396 lines, so the forest aurora tokens moved to their own module, `app/forest-aurora-tokens.ts`: colours, falloff, shield strengths and the built layers. The colour lint rule allows that file. `visual-tokens.ts` is now 352 lines; `theme.visual` is unchanged.

### 3. Every forest card has it

- **`ForestCard` draws `ForestAurora` by default** (`motion` prop, on by default; `zone`, `shield`). It replaces the old drifting contour layer, so each card keeps one contour system. The `contours`, `animatedContours` and `backdrop` props are gone. A card that passes `zone={null}` draws nothing until it has measured its text. A card that passes no zone gets a column up to 64 % of its width (`textReach`).
- **Accueil** (`ResumeCard`). The clear zone is right of the text column (the button is measured, as before). With a draft, a band starts half the 24 pt gap above the progress segments, so they sit under the shield.
- **Mes Relevés** (`ListSummaryCard`). The clear zone starts 16 pt right of the two figures (measured), over the whole height.
- **Survey detail** (`ScoreCard`). The caption (now its own width), the numeral and the block under them are measured. The clear zone is right of the wider of caption and numeral, plus 12 pt, and above the glow bar. The bar, the tiles and the hint sit in the band, under the darker `score` shield.
- **Left out, and why:**
  - The survey form's running total (`FactorPager` total chip): a 36 pt forest pill beside the form, not a card. Motion behind a figure the observer reads while entering data would distract.
  - `NewSurveyCard`: glass, keeps its still contours.
  - `ParcelMapCard`'s placeholder: still contours under a live map (D-13: no motion over a map).
  - `GlowBar`, `GradientNumeral`, `HaloPulse`: parts of the score card, not cards.
  - Compte, profile and settings: no forest surface.
- **Budget, enforced** (`__checks__/motion.test.ts`, "hero motion budget"). For every route, the gate walks the files it reaches through relative imports inside `src/screens` and `src/navigation`. It counts the animated hero layers: `ForestCard` unless `motion={false}`, `ForestAurora`, and `ContourLines` unless `animated={false}`. It fails above two. Today: Accueil 1, Mes Relevés 1, survey detail 1, every other route 0 (the search page and the score page have none).

### Tests

- `forest-motion.test.ts` covers the generator and plans (deterministic per seed), the waypoints in range, the curve through every waypoint with no seam, a pose that never stops, one bloom per loop of under 2 s at full peak, and the relay invariants over 40 seeds (loop of 72 s or more, one stroke at a time per line alternating draw and erase, always one line moving, never all hidden or all held, varied holds, draw and erase overlapping, start equal to end).
- `ForestAurora.test.tsx` covers: nothing before layout or while measuring; the default zone and clamping; discs with their lighter heart placed at their path's start in the clear zone, opacity and transforms only; the column, band and fades; layer order; contours in the clear zone; four endless loops plus the fade-in on the UI thread under `ReduceMotion.System`; nothing while hidden or covered, and going on when shown; under Reduce Motion, lines drawn, discs at rest and no fade.
- The other suites:
  - `ForestCard.test.tsx`: the aurora by default, zone and shield passed through, `motion={false}`.
  - `ResumeCard.test.tsx`: the zone of both forms, and the band only once the segments are measured.
  - `ScoreCard.test.tsx`: the score shield and the measured zone, with the bar, tiles and hint in the band.
  - `ListSummaryCard.test.tsx`: the measured zone.
  - `forest-aurora-tokens.test.ts`: the contrast per card.
  - The motion gate: the budget, with fixtures.

Gates: lint, typecheck, `test:coverage:mobile` (251 suites, 2937 tests), the ibp-domain suite (230 tests) and format check all pass. Format check flags only the untracked `.claude/settings.local.json`. No dependency changed.

### Device-only checks

- Accueil, Mes Relevés and a survey's detail: the colour patches are clearly visible (green, teal, a warm ochre) and keep drifting on their own; there is no visible cycle within a minute, and now and then one patch swells brighter for about two seconds, on the right side.
- The contour lines keep drawing and erasing themselves in turn, right of the text (and above the score card's bar), never all gone and never all still. They are faint, and no line ever crosses text.
- Text reads at every moment. On Accueil: the title and the factors line, with the segments in their darker band. On Mes Relevés: the two figures. On the score card: the numeral, "/50", the tiles' "/35" and "/15", and the hint, also with a long caption ("Score IBP du brouillon"). If the left side looks too dark, the `standard` column can go down to about 0.50 only with a retest of `forest-aurora-tokens.test.ts`.
- Leave a screen (another tab, a sub-page of the survey, an overlay) and come back: everything goes on from where it was, without a jump or a restart.
- Reduce Motion on: still patches and fully drawn lines on all three cards.
- Smoothness on an older iPhone and on Android: three SVG gradients and four animated paths per card, one card per screen.

## Forest cards: owner-tuned mist and flowing contours

Owner, on a835424: "Ça ne va toujours pas parce que l'effet s'arrête à un certain moment, notamment au niveau de la part de progression, où le fond devient uni en vert. En plus de ça l'effet [vert] est trop intense et il est [immobile]." His screenshots showed three problems. The solid band shields cut the mist with a hard horizontal edge and left a flat dark green below it. The discs were large saturated blobs. The movement could not be seen. He then tuned a replacement live in sketch 010 `round4.html` and chose `spd=2 fogA=1.6 size=0.7 flowSpd=1 flowA=1`.

Commits: 2441195 (tile units), 7b52a01 (mist, flowing contours, feathered shield).

### 1. The owner's look, as tuned

- **Mist** (`MIST_DISCS`, `forestAurora`).
  - Three radial discs of 294 pt (the sketch's 420 times 0.7), each fading from its centre to nothing at its rim: moss #6EBE3C at 0.672, teal #1EAA8C at 0.608, ochre #DCAA3C at 0.416 (the sketch's 0.42, 0.38 and 0.26 times 1.6).
  - Placed as in the sketch: moss from the top left, teal from the right, ochre from below.
  - Each drifts there and back, eased in and out: about 210 pt, scaling to 1.2, 0.85 and 1.25.
  - Legs of 7, 9 and 11.5 s (14, 18 and 23 s divided by 2).
  - Per mount, each leg is drawn within 6 % of its value and each disc starts at a random point of its there-and-back, so the three never fall into step.
  - The phase runs linearly and the pose is eased (`pingPong`), so leaving the screen and coming back goes on without a jump and without losing amplitude.
- **Flowing contours** (`FLOW_PATHS`, `flowMotion`).
  - Three faint lines (#8CB950 at 0.18, 1.2 pt) in the card's clear zone.
  - Along each, a 20 pt dash of light (#D7F096, full strength) with a soft glow under it (#C8EC78 at 0.3, 4 pt wide) flows endlessly, one pass every 7, 10 and 13 s, also jittered per mount.
  - The glow replaces the sketch's CSS `drop-shadow`, which react-native-svg has no reliable equivalent for.
  - The dash and its gap are longer than any line, so one dash runs at a time.
- **Veil.** The sketch's mask: the card's first green at 0.9 at the left edge, gone at 60 % of the width, over the mist and the lines.
- **Threading.** Only transforms and dash offsets are animated, by worklets on the UI thread.
  - It runs only while the screen can be seen and fades in over 0.7 s once its zone is known.
  - Under Reduce Motion the discs rest and the lines are drawn without their flowing light (the light paths are not rendered at all).
- **Removed.** The draw and erase relay, the random waypoint paths, the bloom, the lighter disc centre, the solid shield panels and their tokens.

### 2. No flat zone, no hard edge

- **No solid shield.** There is no solid shield layer any more, and no layer of the card carries a flat fill (tested).
- **Across the card.** The shield is one horizontal gradient of the darkest green. It goes from `start` at the left edge to `end` where the card's text column ends, then down to nothing over 90 pt.
- **Bottom band** (Accueil's segments, the score card's bar, tiles and hint). A gradient rises from nothing over 48 pt to `band` where that text starts, and keeps rising gently to `bandEnd` at the bottom edge, so it is never flat.
- **Edge tests** (`forest-aurora-tokens.test.ts`):
  - Every gradient starts or ends at alpha 0 on its open side.
  - The band is strictly increasing.
  - No stop changes alpha faster than 0.6 over 40 pt.
- **Final values:**
  - `standard` (Accueil, Mes Relevés): start 0.50, end 0.44, band 0.24, bandEnd 0.34.
  - `score`: start 0.50, end 0.50, band 0.54, bandEnd 0.62.
  - The sketch's own shield (0.50 at the left to 0 at 85 %) was too light for the right end of the text columns and the tiles. I raised only the stops these needed.

### 3. Contrast at the mist's worst, where the discs can really go

The test models each card on a 375 and a 393 pt phone (343 and 361 pt wide), laid out from the layout tokens.

- **Cards modelled:**
  - Accueil: both forms, title on one or two lines.
  - Mes Relevés: figures up to 200 pt wide.
  - Score card: the draft caption, about 165 pt.
- **Worst case.** At every point of each text region (every 4 pt, on every gradient stop), each disc takes the most it ever puts there over its whole drift (centre and radius along the path), all three stacked. Then the veil, the shield and the band are applied in their order.
- **Lowest ratios:**

| Card | Text | Lowest ratio |
|---|---|---|
| Accueil, draft | title | 7.4:1 |
| Accueil, draft | "n/10 facteurs remplis." | 5.5:1 |
| Accueil, draft | filled segments (3:1 needed) | 3.2:1 |
| Accueil, start | title | 6.5:1 |
| Accueil, start | body | 4.85:1 |
| Mes Relevés | figures | 6.8:1 |
| Mes Relevés | accent figure | 4.65:1 |
| Mes Relevés | labels | 5.1:1 |
| Score card | caption | 6.4:1 |
| Score card | numeral end | 5.9:1 |
| Score card | "/50" | 4.7:1 |
| Score card | tile labels and units | 4.66:1 |
| Score card | tile values | 6.3:1 |
| Score card | hint | 8.8:1 |

- **Shield required.** Without the shield, the body text at the column's end falls under 4.5:1 (tested).
- **Tile units** (2441195). The tiles' "/35" and "/15" now use the body tint instead of the sage. The sage was 3.9:1 on the glass tile over the card's mid green even before any mist, and would have needed a band near 0.8.
- **Not modelled** (as before): the card gradient's own halo at the top right, where the cards keep no text.

### 4. Every forest card

- **Same look on all three.** The Accueil hero, the Mes Relevés summary and the survey detail score card all get it through `ForestCard`'s default backdrop, with the clear zones and measuring of the previous round.
- **Budget gate** unchanged: one animated hero layer on each of these screens, none elsewhere.

Gates: lint, typecheck, `test:coverage:mobile` (251 suites, 2947 tests), the ibp-domain suite (230 tests) and format check all pass. Format check flags only the untracked `.claude/settings.local.json`. No dependency changed.

### Device-only checks

- **Motion.** On Accueil, Mes Relevés and a survey's detail, the soft green, teal and warm mist visibly drifts across the card all the time, about as fast as in `round4.html`. It is calmer and less saturated than a835424. Short dashes of light keep running along the faint lines on the right.
- **No edges.** Nowhere does the mist stop at a line. Under Accueil's segments and the score card's tiles the card darkens gradually, never into flat green.
- **Readability.** Text reads at every moment: the title and factors line, the two figures, the numeral, "/50", the tiles and the hint.
- **Leaving and returning.** After leaving a screen and coming back, the mist and the light go on without a jump.
- **Reduce Motion.** Still mist, faint lines, no flowing light.
- **Performance.** Smoothness on an older iPhone and on Android: three SVG gradients and six animated paths per card.
- **Glow fallback.** The dash's glow is a wider faint path, not a blur. If it looks hard on the device, lower `forestAurora.lines.glowOpacity`.

## Forest cards: the mist and the flowing contours over the whole card

Owner, on 1a5496c (score card screenshot): "mais pourquoi l'animation est limitée en haut à droite". The lines only showed in the clear zone, right of the caption and the numeral and above the bar. The mist was muted elsewhere by the left veil and by the shield's column and band, so the rest of the card looked static and flat. The same held on the other cards.

Commit: fe6bc47.

### 1. The whole card moves

- **Mist** (`MIST_DISCS`). The owner's settings are kept: 294 pt discs, moss 0.672, teal 0.608, ochre 0.416, legs of 7, 9 and 11.5 s with per-mount jitter, eased there and back. Each disc's path is now given in shares of the card, so it crosses the whole card whatever its size:
  - moss from the top left (10 %, 15 %) to the bottom right (75 %, 95 %), growing to 1.2;
  - teal from the top right (95 %, 20 %) to the bottom left (15 %, 85 %), shrinking to 0.85;
  - ochre from below the middle (35 %, 105 %) to the top right (90 %, 0 %), growing to 1.25.
- **Mist coverage, tested.** On every modelled card (Accueil's two forms with one or two title lines, Mes Relevés, the score card, at 343 and 361 pt wide), every point gets at least a quarter of some disc's peak at some moment of its drift.
- **Lines** (`FLOW_LINES`). Three lines run across the full width, a little past both edges, at the top, the middle and the bottom of the card, waving over about a fifth of its height. They are laid on the measured card in points (`layLine`), so the dash of light keeps its 20 pt length. The dash runs each line's whole length: its pattern is the line's control polygon plus the dash plus a 40 pt rest.
- **Line coverage, tested.** The lines span the full width, every point of the card lies within about a third of its height of a line, and the pattern outlasts each line.
- **The veil is gone.** The sketch's left veil darkened the left 60 % of every card, so the left side now moves as much as the right.

### 2. Soft shields around each block of text, and the lines fading behind it

- **Blocks instead of a zone.** Each card measures its blocks of text and passes them to `ForestCard` (`blocks`, which replaces `zone`):
  - Accueil: the title and its line, and with a draft the segments;
  - Mes Relevés: the two figures;
  - score card: the caption with the numeral, and the bar, tiles and hint under them (an empty lower part is no block).
- **Shield** (`buildTextShield`). Around each block lies a radial ellipse of the card's darkest green, an `experimental_backgroundImage` on a view the size of the ellipse.
  - The ellipse passes through the block's corners (radii: the sides over √2), scaled so the feather is at least 44 pt in both directions.
  - It has `core` alpha at the centre and `edge` at the block's corners, falling to nothing at the rim. It never sits flat, has no edge, and has no solid fill (tested: no view in the backdrop carries a background colour).
  - Final values: `standard` core 0.60, edge 0.54; `score` core 0.70, edge 0.66.
- **Lines behind text.** The three lines sit in an SVG `Mask`: a white rectangle, with a soft black radial ellipse over each block (the same ellipse as the shield). Behind text only 12 % of the lines shows (`lines.floor`), feathered out to full strength around the block. The glass tiles are translucent, so a faint line still passes behind them.

### 3. Contrast with the effect anywhere

The worst case at every point of each block (every 4 pt, on every gradient stop):
- the three discs at their full peak stacked on it (they can reach any point);
- the dash of light and its glow passing right behind it, at what the mask lets through there;
- then the shields of all the card's blocks, as drawn.

Lowest ratios:

| Card | Text | Lowest ratio |
|---|---|---|
| Accueil | title | 6.7:1 |
| Accueil | "n/10 facteurs remplis." | 5.0:1 |
| Accueil | filled segments (3:1 needed) | 4.56:1 |
| Mes Relevés | figures | 6.7:1 |
| Mes Relevés | accent figure | 4.56:1 |
| Mes Relevés | labels | 5.0:1 |
| Score card | caption | 6.4:1 |
| Score card | numeral end | 5.9:1 |
| Score card | "/50" | 4.67:1 |
| Score card | tile labels and units | 5.05:1 |
| Score card | tile values | 6.8:1 |
| Score card | hint | 6.4:1 |

Without a shield the body text falls under 4.5:1 (tested).

Gates: lint, typecheck, `test:coverage:mobile` (251 suites, 2968 tests), the ibp-domain suite (230 tests) and format check all pass. Format check flags only the untracked `.claude/settings.local.json`. No dependency changed.

### Device-only checks

- On all three cards the mist drifts over the whole card, including the left side, around and under the numeral, behind the tiles and the hint. The lines and their light cross the whole width at the top, middle and bottom.
- Around each block of text the card darkens softly, with no edge, no patch and no flat green. Behind text the lines fade to a faint trace, and a faint line shows through the glass tiles.
- Text reads at every moment, also when a dash of light passes behind it.
- **Mask rendering.** Check that the lines' SVG mask draws on iOS and Android with react-native-svg 15. If a line shows at full strength behind text, the mask is not applied: report it.
- **Gradient size.** Check that the shield's radial gradient (`radial-gradient(50% 50% at 50% 50%, ...)`) is elliptical over its view, the same syntax the card's halo already uses.
- Reduce Motion: still mist, faint lines, no flowing light. Leaving a screen and coming back goes on without a jump.
- Smoothness on an older iPhone and on Android: three SVG gradients, six animated paths through a mask, and two or three radial gradient views per card.

### Diagonal lines and round5 (dfb05af)

- **Diagonal again.** Owner on 2188c10: "l'orientation des lignes est passée de globalement diagonale à horizontale". The lines are now the four S curves of sketch 010 `round5.html`, which the owner validated ("c'est parfait, je veux exactement ça"). They are laid in points on the measured card: the sketch's 340 pt across, its height shares down, but never flatter than the sketch hero's proportion (158 over 340), centred. Each S climbs at 20 to 55 degrees through its middle (tested) and together they span the card. The light keeps the sketch's timing: dash 26, gap 300, passes of 7, 10, 13 and 10 s, each 2.3 s ahead of the one before, base lines at 0.18. The mist is back at the sketch's anchors and drifts.
- **Less behind the text, no mask.** The SVG mask behind text is dropped as a device risk, so the lines are softened by the shields alone. The shields hug each block (ellipse through its corners, 40 pt feather) at the lightest alpha the worst case allows. The worst case now has the dash at full strength right behind the text and the mist bounded by its drifts.
  - Shield alphas (centre to the block's corners): `standard` 0.72 to 0.69, `score` 0.79 to 0.76, and a new `graphic` 0.60 to 0.57 for Accueil's segments (3:1).
  - Lowest ratios: segments 3.2:1; Mes Relevés accent figure 4.59:1; score "/50" 4.59:1; tile labels and units 4.97:1; body text 5.0:1; numeral end 5.8:1; caption and hint 6.3:1; tile values 6.7:1; titles and figures 6.7:1.
  - Trade-off: with the mask (12 % of the lines behind text) the text shields could stay near 0.54 and 0.66. Without it they are darker, and the segments' band is lighter than before.
- Gates: lint, typecheck, `test:coverage:mobile` (251 suites, 2968 tests), the ibp-domain suite (230 tests) and format check pass. Format check flags only the untracked `.claude/settings.local.json`.
- Device checks: the S curves read as diagonal on all three cards, including Mes Relevés' short card. The halo behind the text is soft and edgeless. The dash passing behind a title stays readable.
- **Mask restored, lighter shields (95f5ed5).** The owner wants less darkening behind the text, so the SVG mask is back.
  - Mask: the lines keep 12 % behind each block, in a soft radial hole the size of the block's ellipse that fades to nothing at its rim.
  - Shields, re-derived with round5's diagonal geometry and the 40 pt feather, at the lowest alphas the worst case allows (centre to the block's corners):
    - `standard` 0.53 to 0.50 (was 0.72 to 0.69);
    - `score` 0.62 to 0.60 (was 0.79 to 0.76);
    - `graphic` 0.35 to 0.32 (was 0.60 to 0.57).
  - Lowest ratios:

    | Card | Text | Lowest ratio |
    |---|---|---|
    | Accueil | segments (3:1 needed) | 3.03:1 |
    | Accueil | factors line | 4.81:1 |
    | Accueil | title | 6.45:1 |
    | Mes Relevés | accent figure | 4.56:1 |
    | Mes Relevés | labels | 4.98:1 |
    | Mes Relevés | figures | 6.69:1 |
    | Score card | "/50" | 4.57:1 |
    | Score card | tile labels and units | 4.69:1 |
    | Score card | numeral end | 5.73:1 |
    | Score card | caption | 6.26:1 |
    | Score card | tile values | 6.30:1 |
    | Score card | hint | 6.42:1 |

  - Device check: the mask must render on iOS and Android. If a line shows at full strength behind text, the mask is not applied.
  - Gates pass: lint, typecheck, `test:coverage:mobile` (251 suites, 2968 tests), ibp-domain (230 tests), format check.
