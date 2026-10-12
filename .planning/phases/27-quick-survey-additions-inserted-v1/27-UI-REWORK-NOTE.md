# Phase 27: summary rework after the owner's simulator check (2026-10-12)

Decisions D-32 to D-36 are in `27-CONTEXT.md`; the licence side of D-35 is in `27-LICENCE-NOTE.md`.
This note says what the summary and its pages look like now.

## Survey summary (draft)

1. Score card ("Score IBP du brouillon", unchanged).
2. Weather card: the weather line, then "Météo-France" in small grey text. Tapping the line opens
   Contexte at the weather. No date, no sentence.
3. Note card ("Note du relevé", 1000 characters): a field while the survey can be edited, plain text
   after submit, absent when empty after submit.
4. Photos, then the map card (framed on the parcels, chip "2 parcelles"); tapping it opens Parcelles.
5. Four rows: Contexte (`v3.2 · cas 1`), Parcelles (`2 parcelles`), Facteurs IBP (`0 sur 10`),
   Historique de la parcelle.

## Pages

- Contexte: method and cas, then "Météo" with the status line, the values and the full dated source
  sentence ("Source : Météo-France, mesure du 12/10/2026 à 12:00").
- Parcelles: large parcel map with the pencil, the offline map row, the list "Parcelles · 2".
- Facteurs IBP: the former "Score IBP" page (total, sub-scores, chart, ten factors).

## Code map

- Pure: `mobile/src/app/parcel-frame.ts` (framing), `weatherCardMention` in `mobile/src/app/weather.ts`.
- Screens: `SurveyContextScreen`, `SurveyParcelsScreen`, `survey-detail/conditions/SurveyNoteCard.tsx`,
  `ConditionsCard.tsx` (weather only), `ParcelMapCard.tsx` with `useLocalParcelGeometry.ts`.
- Navigation: route `surveyParcelsPage` (`SurveyParcelsPageRoute`), `SurveysStackParamList`.
- Catalogue: `fr.conditions.section`, `fr.conditions.summary.mention*`, `fr.surveyDetail.rows`,
  `fr.surveyDetail.parcelsScreen`, `fr.navigation.headers.surveyParcelsPage`.

## Left as is

- The PDF, the API and the package are untouched.
- A survey with parcels but no stored point, no cached geometry and no server position (an old draft
  chosen before plan 27-13, offline, outside every downloaded area) draws the contour placeholder
  instead of a map until the parcel request or the server answers.

# Second rework after the owner's simulator check (2026-10-12, D-37 to D-40)

Decisions D-37 to D-40 are in `27-CONTEXT.md`.

## Survey summary (draft), new order

1. Weather card (`WeatherCard`, D-40): big sky glyph, temperature numeral and unit, wind, rain over
   24 h and measurement time as wrapping columns, "Météo-France" in small grey text, chevron to
   Contexte. Empty: friendly invitation; offline: calm sentence; observer's sky alone: glyph and
   label only.
2. Score card ("Score IBP du brouillon"), photos, map card, the four rows, the survey actions.
3. Note card ("Note du relevé"), last (D-38), then the dev-only debug area.

## Contexte weather block (D-37)

- Status line (measurements only), the eight sky chips (the only editable value; the chosen chip
  again clears it), then temperature, wind, rain over 24 h and the observation time as read-only
  rows, then the dated source sentence ("Source : Météo-France, mesure du 12/10/2026 à 12:00", with
  ", ciel saisi par l'observateur" when the sky is theirs).
- Gone: the four editable fields, "Remplir à nouveau" and its alert, the field-focus scrolling.

## Code map

- Pure: `editWeatherSky`, `isObserverSky`, `weatherSourceLine`, `weatherCardMention`,
  `weatherRequestTime` in `mobile/src/app/weather.ts`; `stampWeatherRequest` in `storage/utils.ts`.
- Screens: `conditions/WeatherCard.tsx`, `conditions/WeatherBlock.tsx`, `conditions/weather-rows.ts`
  (rows shared by the block and the read-only twin).
- Prefill: `hooks/useWeatherPrefill.ts` (safety net), `storage/weather.ts` (`listWeatherCandidates`).
- Catalogue: `fr.conditions.weather.rows`, `fr.conditions.weather.sourceObserverSky*`,
  `fr.conditions.summary` (`stat`, `offlineBody`, `openWithLineSource`), `fr.surveyExport.conditions.sourceValue`.

## Left as is

- The API, the package and the provider code are untouched; the server still accepts any key in
  `weather.edited`.
- The owner's seeded July draft "Parcelle de la source" is older than 24 h: it gets no weather for
  July (never an invented time). Changing its parcels stamps it and looks up the weather of now.

# Third rework after the owner's iPhone check (2026-10-12, D-41)

Decision D-41 (amends D-40) is in `27-CONTEXT.md`. The big weather card was meant for Contexte.

## Survey summary (draft), order

1. Header and status line, then the score card ("Score IBP du brouillon").
2. Compact weather card (`WeatherCard`): one row of about 70 points, small sky glyph, temperature
   with its unit and the sky label, "vent ..., pluie ..." as small text, "Météo-France", chevron to
   Contexte. Empty draft and offline are one slim line; a submitted survey without weather shows
   nothing.
3. Photos, map card, the four rows, the survey actions, the note card, then the dev-only debug area.

## Contexte, order

1. One weather card (`WeatherBlock`) under the "Météo" section header: big read-out (`WeatherHero`:
   glyph tile, temperature numeral, sky label, wind / rain over 24 h / time columns), status line,
   the eight sky chips (folded behind a small "Modifier le ciel" button while Météo-France's values
   show, open with no button otherwise, D-43), the dated source sentence ("Source : Météo-France, mesure du 12/10/2026 à
   12:00", with ", ciel saisi par l'observateur" when the sky is theirs).
2. Then the IBP method and cas editor.
3. `section: "conditions"` no longer scrolls (the weather is at the top).

## Code map

- Shared: `conditions/weather-card-model.ts` (`SKY_GLYPHS`, `weatherCardModel`, `weatherDetailLine`,
  `areaAccessibilityLabel`).
- Components: `WeatherCard.tsx` (compact), `WeatherHero.tsx` (big read-out), `WeatherBlock.tsx`.
- Catalogue: `fr.conditions.summary.compactEmpty`, `compactOffline`, `compactTooOld`,
  `fr.conditions.weather.status.tooOld`, `fr.conditions.sky.edit` / `close`.
- A draft whose visit is older than 24 h gets an explanation instead of "Réessayer" (D-42,
  `weatherVisitTooOld`, the same window rule as the prefill hook).
- The weather is filled at the first selection of parcels only (D-44): a later parcel edit changes
  neither the weather nor the visit time, so an old draft without weather ends in that state.

## Left as is

- The read-only Contexte of a submitted survey keeps its grouped rows and source line.
- The API, the package, the PDF and the provider code are untouched.
