# Phase 24: Survey History Split - Context

**Gathered:** 2026-10-09
**Status:** Ready for planning

<domain>
## Phase Boundary

The survey's change log and the parcel's history, mixed today on one "Historique" page, become two separate things. Presentation only: the data already exists on both sides (`useSurveyDetailData`, `survey_events`, `getParcelSurveyHistory`). No new capability, no API change expected. Delivered after Phase 23's screens, before the Phase 37 and 38 audits.

</domain>

<decisions>
## Implementation Decisions

### Placement (sketch 011, winner C, owner 2026-10-09)
- **D-01:** The summary page's third row "Historique" becomes **"Historique de la parcelle"**, value showing the first-to-latest total (e.g. `21 → 34`; first survey of a parcel: no arrow, see D-09). It opens the parcel history page.
- **D-02:** The change log is **"Journal du relevé"**, reached only from a **"…" menu in the survey detail header**, not from the row list. It is the technical one of the two.
- **D-03:** The "…" menu is on the owner's own survey page only. A survey from another member (read-only, OA-115) has **no menu and never shows the change log**; it keeps the "Historique de la parcelle" row (phase criterion 2).
- **D-04:** The change log stays available to every owner of a survey (no hidden "detailed mode"). It is only one level deeper.
- **D-05:** The sketch menu also lists "Exporter en PDF" and "Supprimer le relevé" as illustration. Where export and delete live today is for research to check; the phase must not move them unless the menu is built anyway and they fit without regressions (planner decides, flag in the plan).

### Parcel history page (sketch 012, winner B+C)
- **D-06:** Top: a score card with the trend as a title ("+13 points depuis 2023") and a small curve of the total per year (react-native-svg, already in the app).
- **D-07:** Then a card "depuis <previous year>" with the per-factor A to J deltas (barre + écart `+2`, `=`, `-1`), reusing `computeFactorDeltas` / `computeIbpTotalDelta` from `mobile/src/app/ibp-scoring.ts`.
- **D-08:** Then the list of surveys (year, version, total /50), newest first, current survey marked "ce relevé", each opening its survey.
- **D-09:** First survey of a parcel: no trend, no curve, no deltas; a one-line notice (as `HistorySection` does today).
- **D-10:** Parcels with surveys of different method versions (v3.0 and v3.2): the curve is cut between the two methods (dashed link) with a one-line notice that totals are not strictly comparable. Per-factor deltas only between surveys of the same method version.

### Journal page
- **D-11:** "Journal du relevé" is the current `EventsTab` content on its own page, with its pull to refresh (OA-122 removed the reload button, keep that). Same event labels and icons.

### Wording and catalogue
- **D-12:** Labels fixed by the owner: "Journal du relevé" and "Historique de la parcelle". All texts in the French catalogue, no em dash, `StatusMessage` rules unchanged.

### Navigation
- **D-13:** Two destinations in the one survey stack: `surveyHistory` becomes the parcel history, plus a new route for the change log (name for the planner, e.g. `surveyJournal`). Both read the selected survey from the surveys context, like the other sub-pages. Tab-bar hiding rules and the 400-line cap on `src/screens` and `src/navigation` apply.

### Claude's Discretion
- Exact curve geometry, tones (use `totalTone` / `bandTone`), spacing and entrance motion, within the visual layer rules (`useBrandTheme`, `brandMotion`, `useListEntrance`).
- Whether the "…" menu is a native iOS menu on the header (preferred, native first) or a JS fallback elsewhere.
- Test split and naming.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase inputs
- `.planning/seeds/SEED-002-journal-et-historique-des-parcelles.md` — the owner's request, questions, breadcrumbs
- `.planning/sketches/011-history-placement/index.html` — placement boards (winner C)
- `.planning/sketches/012-parcel-history-form/index.html` — parcel history boards (winner B+C)
- `docs/user-tests/owner-acceptance.md` — OA-112 (history dates), OA-115 (read-only other member page), OA-122 (reload button removed), OA-124 (this split)

### Design
- `docs/design/charte-graphique-etats-sauvages-spec.md` §13 — visual layer rules
- `docs/design/direction-visuelle-12-2.md` — direction text
- `CLAUDE.md` (Visual layer, Navigation, Text and i18n) — gates: colours via `useBrandTheme`, outline icons, no em dash, motion rules, 400-line cap

### Data
- `docs/technical/api-contract-v1.md` — parcel history and survey events endpoints
- `docs/technical/data-contract-v1.md` — `survey_events`, parcel survey history shape

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `mobile/src/screens/SurveyHistoryScreen.tsx`: today's page, stacks `EventsTab` then `HistorySection`; to be split
- `mobile/src/screens/survey-detail/EventsTab.tsx`, `event-icons.ts`, `event-labels.ts`: the change log, reused as is
- `mobile/src/screens/survey-detail/HistorySection.tsx` + `useParcelSurveyHistory` (`mobile/src/hooks/`): earlier surveys and deltas, base of the new page
- `mobile/src/app/ibp-scoring.ts` (`computeFactorDeltas`, `computeIbpTotalDelta`), `ScoreRing`, `FactorBarsChart`, `GlowBar`, `SurveyRowFrame`
- `useSurveyDetailData` loads both data sets already
- `mobile/src/screens/community-survey/CommunitySurveyScreen.tsx`: other-member page, already shows parcel history

### Established Patterns
- Sub-pages of the summary (`surveyContext`, `surveyScore`, `surveyHistory`) in `navigation/stacks/SurveysStack.tsx`, routes in `navigation/routes/SurveyDetailRoute.tsx` (`onOpenHistory`), headers in `i18n/fr/navigation.ts`
- Summary rows catalogue: `fr.surveyDetail.rows` (`history`, `historyEmpty`), events texts `fr.surveyDetail.events`, `fr.parcelHistory`
- Header actions through `useSurveyDetailHeader.tsx`

### Integration Points
- Header "…" menu in `useSurveyDetailHeader.tsx` (own surveys only)
- Row list in the summary screen (`summary-state.ts`, `SummaryHeader.tsx` neighbours)
- Explorer's parcel-history panel uses `fr.parcelHistory`: keep consistent wording

</code_context>

<specifics>
## Specific Ideas

- Row value on the summary: first-to-latest total (`21 → 34`).
- Curve and deltas follow the sketch 012 boards; light and dark must both read well.

</specifics>

<deferred>
## Deferred Ideas

- None raised. (Global search is Phase 25; per-year seasonal "Ma saison" view stays with Epic F.)

</deferred>

---

*Phase: 24-survey-history-split*
*Context gathered: 2026-10-09*
