# Phase 33: PDF Export, Exhaustive and Simplified - Context

**Gathered:** 2026-10-23
**Status:** Ready for planning

<domain>
## Phase Boundary

The survey PDF (phase 25.1, extended by 27 and 30) becomes two exports chosen at export time: an exhaustive one (everything the app stores about the survey) and a simplified one-page summary usable with patrons, partners and funders. Both stay generated on the phone, offline first, to the charter, named `Cortege-IBP-<site>-<year>[-brouillon].pdf`. Not a new export channel, no API change, no SQLite migration expected.

Out of scope: map screens and the annotations of phase 31 (the PDF only gets an extension point for them), the DMH entry screens of phase 32, any factor entry screen.

</domain>

<decisions>
## Implementation Decisions

### Owner review of the current PDF (criterion 2)
- **D-01:** Nothing is missing in content: the owner finds everything they look for in the current PDF. The gap list is therefore about form, not data: "it is already great", but it lacks modernity and some optimisations.
- **D-02:** Modernity, as the owner means it: more worked graphics (score ring, bars and trend closer to the app), a cover page, better typography and colours (hierarchy of titles, large numerals, charter accents). Denser layouts are NOT among the complaints.
- **D-03:** Optimisations wanted: fewer pages, a lighter file, cleaner page breaks (less empty space at the bottom of a page, no cut block). Faster generation was not selected.
- **D-04:** Merge the cadastre rows of the identity block (owner remark, screenshot): "Commune (code officiel géographique)" and "Département" become one "Commune" row, since the département is the first digits of the commune code (watch overseas 3-digit and Corsica 2A/2B). Print "Nom (code)" if the app already stores the commune name, else "code (département XX)"; the research checks which. Drop the phrase "code officiel géographique" from the printed label.

### Choice at export time
- **D-05:** Tapping "Exporter en PDF" opens a choice sheet with two cards, "Complet" and "Résumé", each with one sentence and the approximate page count. No two menu entries, no remembered setting.

### Exhaustive version
- **D-06:** Same content as today (everything stored, including conditions, route, factor details, doubts and notes, map, trend, photos), restyled per D-02, with a cover page, fewer pages and a lighter file per D-03. Photo cap and compression are the planner's call, measured on a phone.

### Simplified version
- **D-07:** One A4 page, for patrons, partners and funders. It must make three things readable at a glance: the score, the parcel, the evolution in time.
- **D-08:** Content of the page: survey date with the association logo (site name as the title), the score /50, the parcel map, the ten-factor chart, the trend over time. No photos, no factor-by-factor detail.
- **D-09:** The summary is reserved to submitted surveys: on a draft the "Résumé" card is disabled with one explanatory sentence; the exhaustive export stays possible on a draft with its banner, watermark and `-brouillon` name.

### Extension point (phase 31)
- **D-10:** Page composition must not freeze the section list: sections register through a small ordered list (a section = builder + CSS + which versions include it), so phase 31 can add its annotations and the route trace to the exhaustive version, and optionally to the summary, without editing the assembler's body.

### Decisions taken after the research (owner, 2026-10-23)
- **D-11:** Cover page of the exhaustive version: a half-bleed forest panel (top half forest green with static contour lines, logo, site name, large score), the rest of the page light. Not a full dark cover, not omitted. The cover must cost no extra page (the research shows it fits).
- **D-12:** The map frame of the exhaustive version drops from 340 to about 250 design units so that the map and the trend share a page (saves a page in every scenario with a map). To be judged on the phone.
- **D-13:** File names: `Cortege-IBP-<site>-<year>[-brouillon].pdf` stays for the exhaustive version; the summary gets the suffix `-resume` (`Cortege-IBP-<site>-<year>-resume.pdf`; a summary is never a draft).
- **D-14:** Choice sheet: two radio cards ("Complet" preselected, "Résumé") and an "Exporter" button, like the finish sheet. A new `surveyExportChoice` form sheet (iOS) or modal (Android) returns the mode to the summary screen, which owns the data and runs the export.

### Defaults taken from the research, not yet reviewed by the owner (revisit at the phone review)
- **D-15:** The header button keeps its "Partager" label and share icon; the sheet title makes the PDF explicit ("Quel PDF voulez-vous ?").
- **D-16:** The commune prints as "77186 (département 77)"; no table of département names (the app stores only the code).
- **D-17:** Photos: keep the cap of 24 and 6 per page; trial a lighter encoding (about 640 px, quality 0.6) and fix the numbers after the device measurement.
- **D-18:** Summary when the trend is unavailable offline: a quiet panel with one short sentence, the page layout unchanged. A submitted survey not yet synced may still produce the summary (same rule as the export today).

### Owner review on the iPhone, 2026-10-26 (build bece9af1; verdicts and new decisions)
- **D-19 (verdict):** the owner validated everything else: the gaps of D-01 to D-04 are closed, the size of the maps, D-15 to D-18, U-01, the summary sizes, the cover white space, the page estimate, and the file sizes ("Taille ok", including the Android summary above 200 KB). The remarks below are the only changes asked.
- **D-20 (sheet, spacing):** the title "Quel PDF voulez-vous ?" sits too close to the edges of the sheet: give it more top and side room.
- **D-21 (sheet, close):** no "Annuler" button; closing the sheet (swipe on iOS) or a close cross is enough. Add a small close cross (outline glyph) in the corner so the Android modal, which has no swipe, closes too; the "Exporter le PDF" button stays.
- **D-22 (sheet, height):** the sheet is too tall for its content: make it fit its content (iOS detent fitted to the content or a smaller fixed detent, never the 0.65 that leaves a large empty area).
- **D-23 (parcels in full):** the complete PDF prints the full list of cadastral parcels, never a truncation with "…". The identity card wraps the list on as many lines as needed and its height estimate follows. (The summary keeps its short meta line.)
- **D-24 (location on the first page):** the parcel map ("localisation") goes on the first page of the complete PDF, the cover. Decision: the cover's light lower half carries the map figure (the same `buildMapFigure`, offline outline fallback) and the six cover facts leave the cover, since the identity card holds the same facts; the map block leaves the body, which saves a page. The cover keeps the forest panel, the score and the two sub-score tiles. The cover must still cost no extra page and keep the draft banner and watermark.
- **D-25 (date and year doublon):** the date and the observation year say the same thing: print the year row of the identity card only when it differs from the year of the survey date; no year anywhere on the cover.
- **D-26 (chart, stand and context):** the factor chart must make the two groups plain: the stand and management factors A to G (out of 35) and the context factors H to J (out of 15), in the complete chart and in the summary chart (which has no captions today): solid-fill group panels or labelled brackets with the sub-score of each group, with the same colours rule (palette keys only, no opacity, no gradient).

- **D-27 (second iPhone review, 2026-10-26, build 4f0e319a):** the owner validated the whole second build ("je valide l'ensemble") with one remark: the PDF's factor charts should come closer to the two charts of the CNPF method (the "IBP contexte vs IBP peuplement et gestion" plane with its five coloured vertical bands and three context levels, and the ten-axis "rose" with rings 0, 2, 5; reference image supplied by the owner, `/private/tmp/claude-501/-Users-florian-Projects-cortege--claude-worktrees-fake-community-data-script-92be1b/8b4a7053-5bad-4316-893d-1daa0b73bb30/images/3.png`, from the CNPF/INRAE Dynafor survey sheet v3.0, 03/03/22). We redraw our own versions as static SVG; we never embed or copy the CNPF image or its logo; a source line cites the method.
- **D-28 (chart placement, owner choice):** the complete PDF replaces the grouped bars by the rose and the plane side by side in the factor-chart block; the summary replaces its ten bars by the plane (the rose is too small for its labels on a one-page summary). This amends D-26: the groups stand/context of D-26 are carried by the plane (axes stand /35 and context /15) and by the colours of the rose labels (stand green, context brown). Band cut points come only from `@cortege/ibp-domain` (`standBand` ticks 7, 14, 21, 28; `contextBand` ticks 5, 10; `bandTone`), never re-implemented.
- **D-29 (timing):** done inside phase 33 as the last gap plan (33-19), before closing the phase; the owner then re-checks only these pages on the iPhone.

### Claude's Discretion
- Cover page content and layout, graphics style, exact page count targets, photo cap and JPEG settings, how the summary behaves when the trend or the map basemap is unavailable offline (omit with a short note, as the trend does today).
- File name of the summary: keep the existing rule; whether a suffix tells the two apart is for the planner to propose to the owner.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing export
- `mobile/src/app/survey-pdf/` (`build-html.ts`, `paginate.ts`, `export-settings.ts`, `assemble-export-data.ts`, `run-export.ts`, `types.ts`, `identity.ts`) — pure builders, paginator, measured constants, loader, runner
- `mobile/src/app/survey-pdf-export.ts` — facade pinned by a test (three functions, two types)
- `mobile/src/screens/survey-detail/useSurveyPdfExport.ts` — screen hook that builds `SurveyExportInput`; where the choice sheet plugs in
- `mobile/test/survey-export-fixtures.ts` — fixtures (v3.2 submitted, v3.0 draft, worst case)
- `mobile/src/i18n/fr/survey-export.ts` — catalogue (no U+2014, abbreviations rule)
- `.planning/phases/25.1-pdf-export-improvement/25.1-CONTEXT.md`, `25.1-07-SUMMARY.md` (measured constants), `25.1-VERIFICATION.md`
- `.planning/phases/27-quick-survey-additions-inserted-v1/27-CONTEXT.md` (conditions block, doubt badge, factor notes)
- `.planning/phases/30-route-choice-assistant-inserted-v1/` (route block); `docs/user-tests/device-checks.md` RC-05 (maximal fixture with route not printed on a device yet)

### Brand
- `docs/design/charte-graphique-etats-sauvages-spec.md` (section 13), `docs/design/direction-visuelle-12-2.md`
- `mobile/src/app/survey-pdf/palette.ts`, `visual-tokens.ts` — allowed colour places; print is always light

### Constraints (CLAUDE.md)
- Everything inlined as data URIs under a blocking CSP, no network resource; `survey-pdf/html.ts` holds the only HTML escape; no em dash in strings; 400-line cap on `src/screens` and `src/navigation`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `collectBlocks` / `collectCss` in `build-html.ts`: the fixed section list to turn into a registry (D-10)
- `buildScoreSummaryBlock`, `buildFactorChartBlock`, `buildMapBlock`, `buildTrendBlock`, `buildIdentityBlocks`: candidates for the one-page summary, to be recomposed at summary size
- `paginateBlocks`: block heights are estimates; fixed A4 pages with per-page header and footer

### Established Patterns
- Pure builders escape their own text; paginator escapes the chrome; same input gives same output
- Measured layout constants live only in `export-settings.ts`, each with a device measurement

### Integration Points
- `useSurveyPdfExport` and the summary screen's "Exporter" action: add the choice sheet there (native form sheet on iOS, modal on Android, like the finish sheet)
- `exportAndShareSurveyPdf` gets a mode argument; `SurveyExportData` stays one shape

</code_context>

<specifics>
## Specific Ideas

- Owner's review of both versions happens on their phone at the end of the phase (criterion 2), against the baseline PDFs generated 2026-10-23 (Chrome render of the fixtures, approximate).
- "Franchement c'est déjà super": keep what works, no redesign from scratch.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Phase 31 annotations and phase 32 DMH details will plug into the extension point of D-10.)

</deferred>

---

*Phase: 33-pdf-export-exhaustive-and-simplified*
*Context gathered: 2026-10-23*
