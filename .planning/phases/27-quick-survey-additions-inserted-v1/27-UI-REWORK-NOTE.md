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
