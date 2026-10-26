# Phase 33: PDF Export, Exhaustive and Simplified - Research

**Researched:** 2026-10-23
**Domain:** on-device HTML to PDF (expo-print, WebKit on iOS, Chromium on Android), pure string builders, React Navigation sheets
**Confidence:** HIGH on the code facts and the page arithmetic (read and measured in this session); MEDIUM on how new visual primitives (SVG gradients, contour art) print on WebKit (not testable here); LOW on file-weight ratios of changed photo settings (extrapolated, must be measured on a device)

Provenance tags used below: `[VERIFIED: path:line]` read in the code this session, `[VERIFIED: local measurement]` produced by a throwaway harness outside the repo (jest + Chrome headless on this Mac, no repo file touched), `[CITED: file]` taken from a planning or docs file, `[ASSUMED]` not verified (listed in the Assumptions Log). No external package is proposed, so no registry lookup applies.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Nothing is missing in content: the owner finds everything they look for in the current PDF. The gap list is therefore about form, not data: "it is already great", but it lacks modernity and some optimisations.
- **D-02:** Modernity, as the owner means it: more worked graphics (score ring, bars and trend closer to the app), a cover page, better typography and colours (hierarchy of titles, large numerals, charter accents). Denser layouts are NOT among the complaints.
- **D-03:** Optimisations wanted: fewer pages, a lighter file, cleaner page breaks (less empty space at the bottom of a page, no cut block). Faster generation was not selected.
- **D-04:** Merge the cadastre rows of the identity block (owner remark, screenshot): "Commune (code officiel géographique)" and "Département" become one "Commune" row, since the département is the first digits of the commune code (watch overseas 3-digit and Corsica 2A/2B). Print "Nom (code)" if the app already stores the commune name, else "code (département XX)"; the research checks which. Drop the phrase "code officiel géographique" from the printed label.
- **D-05:** Tapping "Exporter en PDF" opens a choice sheet with two cards, "Complet" and "Résumé", each with one sentence and the approximate page count. No two menu entries, no remembered setting.
- **D-06:** Exhaustive version: same content as today (everything stored, including conditions, route, factor details, doubts and notes, map, trend, photos), restyled per D-02, with a cover page, fewer pages and a lighter file per D-03. Photo cap and compression are the planner's call, measured on a phone.
- **D-07:** Simplified version: one A4 page, for patrons, partners and funders. It must make three things readable at a glance: the score, the parcel, the evolution in time.
- **D-08:** Content of the page: survey date with the association logo (site name as the title), the score /50, the parcel map, the ten-factor chart, the trend over time. No photos, no factor-by-factor detail.
- **D-09:** The summary is reserved to submitted surveys: on a draft the "Résumé" card is disabled with one explanatory sentence; the exhaustive export stays possible on a draft with its banner, watermark and `-brouillon` name.
- **D-10:** Page composition must not freeze the section list: sections register through a small ordered list (a section = builder + CSS + which versions include it), so phase 31 can add its annotations and the route trace to the exhaustive version, and optionally to the summary, without editing the assembler's body.

### Claude's Discretion
- Cover page content and layout, graphics style, exact page count targets, photo cap and JPEG settings, how the summary behaves when the trend or the map basemap is unavailable offline (omit with a short note, as the trend does today).
- File name of the summary: keep the existing rule; whether a suffix tells the two apart is for the planner to propose to the owner.

### Deferred Ideas (OUT OF SCOPE)
None. Phase 31 annotations and phase 32 DMH details will plug into the extension point of D-10. Out of scope: map screens and the annotations of phase 31 (the PDF only gets an extension point), the DMH entry screens of phase 32, any factor entry screen. Not a new export channel, no API change, no SQLite migration expected.
</user_constraints>

<phase_requirements>
## Phase Requirements

The roadmap lists none for phase 33. Proposed IDs, same `REQ-{epic}-{slug}` shape as `REQ-C-pdf-export` ([CITED: .planning/REQUIREMENTS.md:62], epic C, last built in 19 and 25.1) and the phase 30 block ([CITED: .planning/REQUIREMENTS.md:240-246]). To add to REQUIREMENTS.md "V1" block and to the traceability table as `New | Phase 33 | Build`:

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-C-pdf-two-versions | At export time the member chooses between a complete PDF and a one-page summary through a choice sheet; nothing is remembered; the summary is disabled on a draft with one explanatory sentence | Sections 2, 3, 4 (sheet route, `mode` on `SurveyExportInput`, draft rule) |
| REQ-C-pdf-summary-page | The summary is one A4 page for patrons and partners: logo, site name as title, date, score /50, parcel map, ten-factor chart, trend; offline first, no photo, submitted surveys only | Section 3 (budget 740 units, fixed zones, fallbacks, light loader) |
| REQ-C-pdf-modern-layout | The complete PDF has a cover page, a title hierarchy, large numerals, worked graphics (ring, bars, trend) and charter colours, always light, zero network resource | Section 6 (static SVG/CSS designs, palette keys, charter rules) |
| REQ-C-pdf-lean-export | Fewer pages and cleaner breaks (map and trend share a page, no block cut, cover costs no extra page) and a lighter file, with constants re-measured on a device | Section 5 (page arithmetic, levers, measurements) |
| REQ-C-pdf-commune-row | The identity block prints one "Commune" row: code and département, no "code officiel géographique" | Section 4 |
| REQ-QA-pdf-sections-registry | Sections register through one ordered list with a per-section mode filter, so a later phase adds a section by appending one entry | Section 1 |

`REQ-C-pdf-export` stays the umbrella and gets "extended in Phase 33" in its note.
</phase_requirements>

## Summary

The export is a pure pipeline: `assembleSurveyExportData(input)` reads SQLite and the offline caches, `buildSurveyExportHtml(data)` builds one HTML string of fixed 595 x 840 page boxes, `printToFileAsync` prints it, the file is renamed and shared ([VERIFIED: mobile/src/app/survey-pdf/run-export.ts:159-183]). The one caller is the "Partager" button of the survey summary header (iOS native header item and Android icon) through `useSurveyPdfExport` ([VERIFIED: mobile/src/screens/survey-detail/useSurveyDetailHeader.tsx:70-78, 111-118; mobile/src/screens/SurveyDetailScreen.tsx:140-154, 187]). There is no "Exporter en PDF" label: the visible label is "Partager" and the a11y label "Partager le relevé X en PDF" ([VERIFIED: mobile/src/i18n/fr/survey-detail.ts:17, 311]). No community screen and no other screen exports.

All of D-01 to D-10 fit the existing architecture with small, additive changes. The registry is a `PdfSection[]` array filtered by a `mode` that travels as data on `SurveyExportInput` and therefore on `SurveyExportData` (the data type is `Omit<SurveyExportInput, ...>` so it inherits the field for free): `buildSurveyExportHtml(data)` keeps its one argument, stays pure, and the facade keeps the same three runtime exports (only a type is added). The choice sheet is a new stack route modelled on `surveyFinish`, but it should only choose and hand the mode back to the summary, which owns all the data and runs the export, so the OS share sheet is never presented over a closing form sheet.

The one-page summary fits, but not with today's blocks (map 412 + chart 204 + trend 331 + score 138 = 1085 against 740 available). It needs its own composition with fixed-height zones (about 729 units with a 210 high map frame), a lighter loader that skips photos, and its own map frame size. For the complete PDF, the measured page arithmetic shows the real waste: map (412, forced page break) and trend (331 to 350) each sit alone on a half-empty page because 412 + 331 = 743 > 681 usable. Cutting the map frame from 340 to about 250 units alone saves one page in every scenario measured; combined with folding the method card into the identity card, the commune merge, and moving the score tiles onto the cover, the cover costs no extra page (typical survey 6 pages today, 6 with cover). File weight is almost entirely photos (about 100 KB each on iOS); fonts are subset by both engines and are not a lever.

**Primary recommendation:** Add `mode: "complete" | "summary"` to `SurveyExportInput`, introduce `survey-pdf/sections.ts` holding the ordered `PdfSection[]`, add a `surveyExportChoice` sheet route that returns the mode to the summary via a nonce param (Phase 30 pattern), build the summary as one fixed-zone block, and spend the page budget on the map frame, the identity/method merge and the cover, re-measuring `MAP_FRAME_SIZE`, the block-height estimates and the photo settings on the iOS simulator, the Android emulator and the owner's iPhone.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Choice sheet (two cards, draft rule) | Mobile UI (stack route + screen) | Mobile navigation | A native form sheet / modal like `surveyFinish`; pure presentation, returns a mode |
| Running the export, once at a time | Mobile hook (`useSurveyPdfExport`) | Mobile summary screen | The summary owns `SurveyDetailData`; the hook already guards re-entry |
| Section registry, page composition | Mobile pure builders (`survey-pdf/`) | none | Pure string functions, deterministic, tested without a device |
| Data gathering per mode (skip photos for summary) | Mobile loader (`assemble-export-data.ts`) | SQLite / offline caches | Offline first; only the loader touches storage and the network |
| Printing, naming, sharing | Mobile native wrappers (`run-export.ts`) | OS (print, share sheet) | `expo-print` + `expo-sharing`, no server |
| Commune and département text | Mobile pure builder (`identity.ts`) | none | Derived from the 14-character parcel id, no lookup |
| API, database, sync | not touched | none | Context: "no API change, no SQLite migration" |

## Standard Stack

No new dependency. Everything needed is already in the repo.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-print | in `mobile/package.json` | HTML to PDF (`printToFileAsync`) | Already the export engine [VERIFIED: run-export.ts:1-3] |
| expo-sharing | same | OS share sheet | Already used |
| expo-asset + expo-file-system/legacy | same | Fonts and logo as base64 | `assets.ts` [VERIFIED: assets.ts:1-110] |
| expo-image-manipulator | same | Photo resize/JPEG, logo resize | `photo-prep.ts`, `assets.ts:73-84` |
| @maplibre/maplibre-react-native (StaticMapImageManager) | 11 | Basemap snapshot | `map-snapshot.ts` |
| @react-navigation/native-stack | in repo | `formSheet` (iOS) / `modal` (Android) | `finishSheetScreenOptions` [VERIFIED: navigation/stacks/stack-options.ts:188-196] |
| jest 29 + ts-jest | in repo | Unit tests | `mobile/jest.unit.config.js` |

### Supporting (existing internal modules to reuse)
| Module | Purpose | When to Use |
|--------|---------|-------------|
| `app/contour-paths.ts` (`CONTOUR_PATHS`, `CONTOUR_VIEWBOX`) | Deterministic pure SVG path strings of the app's contour art | Static contour lines on the cover [VERIFIED: contour-paths.ts:5-32] |
| `app/ibp-display.ts` (`factorTone`, `scoreRatio`, `totalTone`) | Display tones | Ring and bars colours |
| `app/visual-tokens.ts` (`forestStops`, `mixWithWhite`, `withAlpha`) and `theme.visual.forest` | Charter forest colours | New palette keys only (colour rule) |
| `app/trend-geometry.ts` (`buildTrend`, `TREND_HEIGHT` 128) | Curve geometry, takes a width | Summary trend at another width |
| `ui/RadioCard.tsx` | Selectable card with title and caption | Choice sheet [VERIFIED: ui/RadioCard.tsx:1-80] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Mode on `SurveyExportInput` | Second argument on every function | A second argument must be threaded through `exportAndShareSurveyPdf`, `assemble`, `buildSurveyExportHtml`, `RunExportDeps.assemble`; the data field changes nothing in signatures |
| Sheet that runs the export itself | Sheet returns the mode, summary runs it | Running inside the sheet means presenting the OS share sheet over a form sheet and keeping the hook alive after dismissal; rejected |
| Bundled commune-name table | Print the code | About 35,000 names, size and update burden; D-04 explicitly allows "code (département XX)" |

**Installation:** none.

## Package Legitimacy Audit

No external package is installed by this phase. Nothing to check; the gate does not apply.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Summary header "Partager"  --tap-->  navigate("surveyExportChoice", { surveyId })
                                              |
                      native form sheet (iOS) / modal (Android): two RadioCards
                      "Complet" (about N pages)   "Résumé" (1 page; disabled + sentence on a draft)
                                              |  confirm
                      navigate("surveyDetail", { exportRequest: { mode, nonce } })   (sheet pops)
                                              |
SurveyDetailScreen effect (one per nonce) -> useSurveyPdfExport.share(mode)
        builds SurveyExportInput { ..., mode }           (running ref: one export at a time)
                                              |
exportAndShareSurveyPdf(input)
   1 cleanStaleExports
   2 assembleSurveyExportData(input)
        always: draft parts, history cache, assets (fonts + logo, memoised)
        complete only: photos (prepare up to cap)          summary: NO photos
        map: cached polygons -> optional online fetch (4 s) -> basemap snapshot (12 s / 8 s)
               frame size by mode (complete 515 x H1, summary 515 x H2)
   3 buildSurveyExportHtml(data)                      pure, deterministic
        palette -> sections = SECTIONS.filter(mode) -> blocks = flatMap(build)
        css = base + sections.map(css) ; paginateBlocks(blocks, chrome)
          cover block (pageStyle "cover": no header) / content blocks / summary page block
   4 printToFileAsync (A4, zero margins)
   5 moveToExportName (name by mode + draft flag)  6 share sheet
```

### Recommended Project Structure
```
mobile/src/app/survey-pdf/
├── sections.ts            # NEW: PdfSection type, the ordered SECTIONS list, sectionsFor(mode)
├── cover-section.ts       # NEW: cover (complete only)
├── summary-section.ts     # NEW: the one-page summary (summary only), fixed zones
├── map-figure.ts          # NEW (extracted from map-section.ts): frame + overlay shared by map and summary
├── build-html.ts          # collectBlocks / collectCss become two flatMaps over sectionsFor(mode)
├── paginate.ts            # + PdfBlock.pageStyle ("cover" | "plain" default), per-page chrome
├── identity.ts            # commune row, method folded in
├── file-name.ts           # + mode suffix (owner decision, section 7)
└── (existing section files unchanged in shape)
mobile/src/screens/export-choice/   # NEW: ExportChoiceSheet.tsx, export-choice.styles.ts, useExportChoice.ts
mobile/src/navigation/routes/ExportChoiceRoute.tsx   # NEW
mobile/src/i18n/fr/survey-export-choice.ts           # NEW catalogue module (avoids editing survey-detail.ts that 31/32 touch)
```

### Pattern 1: The section registry (D-10)

**What:** one array, one filter, no assembler edit to add a section.

```ts
// survey-pdf/sections.ts  (sketch, not final code)
export type ExportMode = "complete" | "summary"          // exported from types.ts

export type PdfSection = {
  id: string                                  // stable, documented; tests pin ids, not heading text
  modes: readonly ExportMode[]                // which versions include it
  build: (data: SurveyExportData, palette: PdfPalette) => PdfBlock[]   // [] = prints nothing
  css: (palette: PdfPalette) => string
}

export const SECTIONS: readonly PdfSection[] = [
  { id: "font-warmup", modes: ["complete", "summary"], build: warmupBlocks, css: () => "" },
  { id: "cover",       modes: ["complete"], build: buildCoverBlocks,    css: coverCss },
  { id: "identity",    modes: ["complete"], build: buildIdentityBlocks, css: identityCss },
  { id: "conditions",  modes: ["complete"], build: wrapNull(buildConditionsBlock), css: conditionsSectionCss },
  { id: "route",       modes: ["complete"], build: wrapNull(buildRouteBlock),      css: routeSectionCss },
  { id: "score",       modes: ["complete"], build: one(buildScoreSummaryBlock),    css: scoreSectionCss }, // or folded on the cover
  { id: "factor-chart",modes: ["complete"], build: one(buildFactorChartBlock),     css: factorChartCss },
  { id: "factors",     modes: ["complete"], build: buildFactorBlocks,   css: factorSectionCss },
  { id: "map",         modes: ["complete"], build: one(buildMapBlock),  css: mapSectionCss },
  { id: "trend",       modes: ["complete"], build: one(buildTrendBlock),css: trendSectionCss },
  { id: "photos",      modes: ["complete"], build: buildPhotoBlocks,    css: photosSectionCss },
  { id: "summary",     modes: ["summary"],  build: buildSummaryBlocks,  css: summaryCss },
]

export const sectionsFor = (mode: ExportMode) => SECTIONS.filter((s) => s.modes.includes(mode))
```

`buildSurveyExportHtml` then does `const sections = sectionsFor(data.mode)`; `blocks = sections.flatMap((s) => s.build(data, palette))`; `css = [fontFaceCss, buildBaseCss, ...sections.map((s) => s.css(palette))].join("\n")`. Order is array order, so Phase 31 appends `{ id: "annotations", modes: ["complete"], ... }` after `"map"` and, optionally, adds `"summary"` to its modes later. [VERIFIED: build-html.ts:27-63 is exactly two hand-written lists that this replaces; the per-section builders already return `PdfBlock`, `PdfBlock | null` or `PdfBlock[]` and a `css(palette)` string, so the adapters `one` and `wrapNull` are the only glue.]

Purity and determinism are unchanged: `SECTIONS` is a module constant, filter and flatMap are deterministic, `data.mode` is data. Keep section ids unique (a test asserts it) and keep the section CSS class prefixes (`identity-`, `score-`, ...) so a new section cannot collide.

**Tests that pin order and must change** ([VERIFIED: build-html.test.ts:54-131, 173-220, 286-331]):
- `"follows the sheet: identity, method, scores, chart, factors, map, trend, photos"` uses `expectInOrder` on catalogue heading strings. It stays meaningful for the complete mode if the cover is inserted first and the method heading stays in the document (even folded into the identity card, keep `t.method.heading` printed as a sub-heading, or change the marker list). Add a registry test: `sectionsFor("complete").map(id)` equals the pinned list, ids unique, every `summary` entry contains no photo section.
- `"puts identity, method and the score summary on the first page"` and the two "chart gets the first page" tests encode today's page 1. They must be rewritten for the cover (page 1 = cover, page 2 starts the body). This is the main test churn.
- `"has one style element ..."` lists CSS markers (`.identity-heading`, `.score-`, ...): add `.cover-` and `.summary-` markers; the summary mode document should assert the complete-only CSS is absent.
- `"page budget of the maximal survey"` bounds `maximal.pageCount <= base.pageCount + 2`: keep, re-record the numbers in the test name.
- Every fixture typed `SurveyExportData` needs `mode: "complete"` (three fixtures in `mobile/test/survey-export-fixtures.ts`, plus `INPUT` in `survey-pdf-export.test.ts:17-30` and any spread test object). Make `mode` required, not optional: a forgotten mode must be a type error, not a silent default.

**Facade** ([VERIFIED: mobile/src/app/survey-pdf-export.ts:1-5]; test [VERIFIED: survey-pdf-export.test.ts:37-48]): the test asserts only the runtime key list (`buildSurveyExportHtml`, `exportAndShareSurveyPdf`, `shareSurveyExportPdf`). With `mode` carried by the input, no function changes signature. Add one line `export type { ExportMode, SurveyExportData, SurveyExportInput } from ...`: a type export is erased, the key-list test stays green. Update the test title to say "three functions and three types" for honesty. `SurveyExportInput` gains `mode: ExportMode`; `SurveyExportData` inherits it because it is `Omit<SurveyExportInput, "apiUrl" | "accessToken" | "displayLocation"> & {...}` [VERIFIED: types.ts:141-158]. `assembleSurveyExportData` copies fields one by one (to keep the token out), so it must add `mode: input.mode` [VERIFIED: assemble-export-data.ts:329-351].

### Pattern 2: Choice sheet returns the mode, the summary runs the export

**Where it plugs in.** The one entry is `onShare: () => void share()` passed to `useSurveyDetailHeader` ([VERIFIED: SurveyDetailScreen.tsx:187]). Change it to open the sheet (`navigation.navigate("surveyExportChoice", { surveyId })`); the header hook, the iOS native header button and the Android icon button stay untouched (they only call `onShare`). The label stays "Partager" unless the owner wants "Exporter en PDF" (open question 1).

**Route and params.** In `navigation/types.ts` ([VERIFIED: types.ts:48-100, 194]) add to `SurveysStackParamList`:
- `surveyExportChoice: { surveyId: string }`
- `surveyDetail: undefined` becomes `surveyDetail: { exportRequest?: { mode: ExportMode; nonce: number } } | undefined` (the Phase 30 pick pattern: `picked` + `pickNonce` on `surveyRouteGuide`, [VERIFIED: types.ts:73-86]).
Register next to `surveyFinish` in `SurveysStack.tsx:204-209` with `exportChoiceScreenOptions(theme)` in `stack-options.ts`, a copy of `finishSheetScreenOptions` (`headerShown: false`, `formSheet` on iOS, `modal` on Android, `sheetGrabberVisible`, detents about `[0.5, 1]`, to be adjusted on the iPhone like `0.65` was) [VERIFIED: stack-options.ts:188-196]. Add `ExportChoiceRouteProps` to `types.ts` and a case in `navigation.test.tsx` mirroring the finish-sheet registration test [VERIFIED: navigation.test.tsx:871-883]; `routes.test.tsx` mocks screens by name, add the mock.

**Draft rule.** `canEditSurvey = selectedSurvey.status !== "submitted"` is the definition used for `isDraft` in the export [VERIFIED: useSurveyDetailData.ts:59; useSurveyPdfExport.ts:68]. The route finds the survey in `useSurveys().state.surveys` by `surveyId` exactly like `FinishSheetRoute` [VERIFIED: FinishSheetRoute.tsx:37-41] and passes `isDraft = survey.status !== "submitted"` to the screen; the "Résumé" card gets `disabled` (RadioCard has `disabled`, which blocks the press without dimming) plus the explanatory sentence under it, and the selection falls back to "Complet" if the survey became a draft state. Do not read `isDraft` from the summary's data: the sheet must work from the route alone.

**Return path.** On confirm the sheet calls `navigation.navigate("surveyDetail", { exportRequest: { mode, nonce: Date.now() } })`, which pops the sheet and sets the param. `SurveyDetailRoute` gets `route` (it currently destructures only `navigation`, [VERIFIED: SurveyDetailRoute.tsx:25-28]) and forwards `exportRequest` to `SurveyDetailScreen`; a hook `useExportRequest(request, share)` in `screens/survey-detail/` runs `share(mode)` once per nonce (ref of the last handled nonce). This keeps the export in the one hook that owns `running`, `exporting` and the alerts [VERIFIED: useSurveyPdfExport.ts:97-120] and keeps the OS share sheet out of the form sheet lifecycle. `useSurveyPdfExport.share` becomes `share(mode: ExportMode)` and `buildSurveyExportInput(args)` takes the mode.

**Approximate page count on the "Complet" card (D-05).** The real count exists only after assembly. Use a pure estimate `estimateCompletePages({ photoCount })` = body pages (a constant measured after the re-layout, section 5) plus `ceil(min(photoCount, cap) / 6)`, written "environ N pages"; `photoCount` is `state.selectedSurveyAttachments.filter(isPhotoAttachment).length` ([VERIFIED: assemble-export-data.ts:165 uses `isPhotoAttachment`]). Validate the formula against the fixtures (table in section 5) in a unit test, so a later layout change that moves the count fails a test instead of lying on the card. The "Résumé" card says "1 page".

**400-line cap.** `SurveyDetailScreen.tsx` is 376 lines [VERIFIED: wc -l]; only a handful of lines may be added there. Everything else (effect, request type, mode plumbing) goes in `useExportRequest.ts` and `useSurveyPdfExport.ts`. `SurveysStack.tsx` is 275, `stack-options.ts` 224, `types.ts` 201, `SurveyDetailRoute.tsx` 95: fine. The cap applies to `src/screens` and `src/navigation` source files only, tests excluded [VERIFIED: structure.test.ts:96-106, scripts/structure-report.js header].

**All callers of the export:** exactly one, `SurveyDetailScreen` -> `useSurveyPdfExport` -> `exportAndShareSurveyPdf`; `shareSurveyExportPdf` and `buildSurveyExportHtml` are used only inside `run-export.ts` and tests [VERIFIED: grep over mobile/src and mobile/test]. Community survey routes and `DebugTab` do not export (the 25.1 spike was removed). The `survey-pdf/map-projection.ts` module is imported by map code (see "files to avoid").

### Pattern 3: Per-page chrome for the cover and the summary

`pageHtml` always draws header, optional banner, body, optional watermark, footer [VERIFIED: paginate.ts:96-112]. The cover needs no running header. Add `pageStyle?: "cover"` to `PdfBlock` ([VERIFIED: types.ts:94-101]); `packPages` treats such a block as `breakBefore` and forces a break after it; `pageHtml` omits the header (and the footer, or keeps a minimal one) for that page but keeps banner and watermark on a draft (the watermark stays on every page, D-09/25.1 D-10). Page numbers keep counting the cover ("Page 2 / 7" on the first body page) so `footerHtml(chrome, index, total)` stays unchanged. The summary can keep the standard header (logo + "Relevé IBP" + site name at the right) and footer; its own top zone carries the title block. Block `pageStyle` is additive: every existing test keeps passing.

### Anti-Patterns to Avoid
- **A second assembler body per mode:** one `collectBlocks`/`collectCss` over the registry only.
- **Reading `Platform`, storage or time inside a section builder:** keeps purity.
- **Estimating the summary's height from text length:** use fixed-height zones with `overflow: hidden`, so the page cannot overflow or silently clip because an estimate was low (the body is `overflow: hidden`, [VERIFIED: styles.ts:145], so an under-estimated flow block is cut without any error).
- **A new colour literal in a builder:** every colour comes from `PdfPalette` (ESLint `Literal[value=/^#.../]` rule applies to string literals; template literals are not caught, so the rule is by review and by `palette.test.ts`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML escaping | a new escape | `escapeHtml` in `survey-pdf/html.ts` | Only escape in `mobile/src`; every new text (site name on the cover, commune, card captions) goes through it |
| Number/date/SVG formatting | `Intl.NumberFormat`, raw `toFixed` | `formatDecimal`, `formatCoordinate`, `formatDateFr`, `svgNumber` | Hermes may lack `Intl` for numbers; deterministic output |
| Score bands and tones | thresholds | `totalBand`, `standBand`, `contextBand`, `bandTone` from `@cortege/ibp-domain`, `factorTone` from `ibp-display` | The package owns the bands; the /50 cuts are an app convention |
| Factor chart | a second chart | `buildFactorChartSvg(entries, palette, size)` is already exported and size-parametric | Summary reuses it at its own size [VERIFIED: factor-chart-svg.ts:56-94] |
| Trend curve | new geometry | `buildTrendSvg(model, palette)` and `buildTrend(points, width)` | Same data as the screen; width is a parameter, height is the constant 128 |
| Map frame + overlay | duplicate overlay code | extract `overlaySvg`/frame HTML from `map-section.ts` into `map-figure.ts` and reuse | Currently private functions [VERIFIED: map-section.ts:104-126, 188-198] |
| Parcel projection | own Mercator | `map-projection.ts` (`fitFrameToBounds`, `ringsToPathD`, ...) | Alignment with the snapshot measured in 25.1-07 |
| Contour art | new random art | `CONTOUR_PATHS` / `CONTOUR_VIEWBOX` | Deterministic, same signature as the app's forest card |
| Commune/département | a lookup | `inseeFromParcelId` | Already handles 2A/2B and 97x [VERIFIED: identity.ts:35-50] |
| Selectable cards | new card | `RadioCard` (+ `VisibilityPicker` as the model) | Shared with CasPicker and the finish sheet |
| File name | string concatenation | `buildExportFileName` | ASCII-only guarantee (`^[A-Za-z0-9-]+\.pdf$`) with tests |
| One export at a time | new lock | the `running` ref in `useSurveyPdfExport` | Android never sees two share sheets |
| Test-time colour contrast | eyeballing | `contrastRatio` in `app/contrast.ts` | Used by `palette.test.ts` |

**Key insight:** every piece of the summary already exists as an exported function; the work is composition, sizes and a few extractions, not new rendering code.

## Runtime State Inventory

Not a rename or migration phase. Only the stored cache is relevant to the new summary:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `local_meta` key `parcel_history:<PARCEL_ID>` feeds the trend; schema stays at version 5 | none; the summary reads it like the complete PDF |
| Live service config | None | none |
| OS-registered state | None | none |
| Secrets/env vars | None | none |
| Build artifacts | `<cache>/exports/*.pdf` older than one hour are removed at the next export [VERIFIED: run-export.ts:23, 78-103] | keep that behaviour; see file-name collision (section 7) |

## Section-by-section answers

### 3. One-page summary feasibility

**Current block heights (design units), measured through the real builders** [VERIFIED: local measurement, fixture v3.2 / worst case]:

| Block | Height | Notes |
|-------|-------:|-------|
| identity card | 244 (225 with a route, the "Mode de relevé" row drops) | 11 rows, rows are 19 each [VERIFIED: identity.ts:21-33, 68-71] |
| identity-method | 92 | |
| conditions | 111 (with weather + note) | |
| route | 181 (worst) | |
| score-summary (3 tiles) | 138 (158 with the draft "provisoire" line) | `TILE_HEIGHT` 84 [VERIFIED: score-section.ts:33-42] |
| factor-chart | 204 | card padding + heading 24 + svg 150 + margin [VERIFIED: factor-chart-svg.ts:35-41, 109] |
| factor cards | 103 to 156; A with 34 genera 310 | |
| map | 412 | heading 24 + frame 340 + legend 19 + source 19 + margin 10 |
| trend | 331 (3 points) to 350 (6 points) | curve `TREND_HEIGHT` 128 + summary 22 + deltas ~110 + cached line |
| photos page | 706 / 682 | 6 per page, cell 255 x 200 |

**Page capacity** [VERIFIED: export-settings.ts:21; styles.ts:51-57; paginate.ts:21, 58-65]: block 840, minus header 60, minus footer 40 = 740 (716 on a draft with the 24 banner). A shared page is filled to 0.92 x 740 = 681 (659 draft); one block alone on an empty page may use all 740. Note two different fill constants exist: `PAGE_FILL_FACTOR = 0.92` in paginate.ts (used) and `PDF_PAGE_FILL_FACTOR = 0.9` in export-settings.ts ("not measured", unused by the packer); remove or reconcile the dead one during the phase.

**Today's blocks do not fit:** map 412 + chart 204 + trend 331 + score 138 = 1085 > 740. So the summary is a dedicated composition, not four reused cards stacked.

**Proposed budget** (summary is submitted-only, so no banner: 740 units; fixed-height zones; `[ASSUMED]` that these sizes read well, to be judged on the phone):

| Zone | Content | Height |
|------|---------|-------:|
| Title band | logo >= 71 (25 mm, charter 5.2), site name as title (up to 2 lines, Sora 22), date and commune line | 84 |
| Score row (side by side) | left 200: ring + total numeral (Sora Light 56) + band name; right 305: ten-factor bars at about 305 x 150 | 160 |
| Map | heading 24 + frame 515 x 210 + one legend line 18 | 252 |
| Trend | heading 24 + one summary line 22 + curve 128 (width 515) | 174 |
| Gaps | 3 x 8 | 24 |
| Source/cached line (map source, "historique enregistré le") | 1 line each, 8 pt | 36 |
| **Total** | | **730** |

It fits with 10 units to spare, so nothing may grow: the title's second line, a long parcel id list, the cached-history line and the map source must be pre-allocated zones. The per-factor deltas table is dropped (D-08: no factor-by-factor detail). If the owner wants the map larger, the trend curve can narrow into the right half of a map|trend row (not recommended: six points cramp in 250 units).

**Fixed zones, not flow.** Each zone is a `div` with explicit `height`, `overflow: hidden` and absolute or block layout; the summary is ONE `PdfBlock` of `height` <= 740 so `packPages` puts it alone on a page. A test asserts `pageCount === 1` for the worst inputs: 64-character site name, three parcels (legend wraps), six history points, basemap present and absent, no history, one survey.

**Fallbacks (from the code):**
- *Trend not cached offline:* `buildTrendBlock` returns the note `t.unavailable` = "Historique de la parcelle non disponible sur cet appareil : ouvrez le relevé une fois connecté pour l'enregistrer." [VERIFIED: survey-export.ts trend.unavailable; trend-section.ts:193]. That sentence is an app instruction, wrong on a document for patrons. The summary needs its own quiet text in a new key, e.g. `summary.trendUnavailable`: "Évolution de la parcelle non disponible sur cet appareil." The zone keeps its 174 units (a pale panel with the sentence) so the page is not rebalanced.
- *Single survey (first on the parcel):* `model.isFirst` is true when the history is empty or holds only the current survey [VERIFIED: parcel-history.ts:272]; today's note is "Premier relevé de cette parcelle : pas encore d'évolution à montrer." It reads fine on the summary; reuse the same string (`t.trend.first`). A single point could also be drawn (buildTrend handles one point at `TREND_PAD_X`, [VERIFIED: trend-geometry.ts:85-86]); the note is simpler and honest.
- *Stale cache without the current survey:* `buildEntriesFromOwn(items, surveyId)` flags `isCurrent` only if the survey is in the cached list; when a history was cached before this survey was submitted, `isFirst` is false and no point is current, so the "+8 points depuis ..." line can be wrong. Same behaviour as the complete PDF today; the summary should treat "current survey absent from the cache" as unavailable. Add that case to the tests.
- *Basemap snapshot unavailable:* `buildMapBlock` already falls back to the parcel outline on a pale canvas (`palette.mapCanvas`) with scale bar and north arrow, plus the note `t.outlineOnly` [VERIFIED: map-section.ts:174-200]. The summary reuses the same figure; the note becomes one 8 pt line inside the pre-allocated legend zone. No geometry at all: `noGeometryBlock` text; zone keeps its height.

**Loader for the summary.** `assembleSurveyExportData` starts photos, map, history, draft parts and assets in parallel [VERIFIED: assemble-export-data.ts:319-327]. For the summary:
- Skip photos entirely: `loadPhotos` is the heavy part (prepares up to 24 JPEGs through the manipulator; 0.7 to 1.0 s warm on the simulator and emulator, 6.4 s on the first cold iOS export [CITED: 25.1-07-SUMMARY.md measurement table]). Branch on `input.mode`; return `NO_PHOTOS`.
- Keep history (one SQLite read), map (cache read, optional 4 s online fetch, basemap snapshot with its 12 s / 8 s timeouts) and assets.
- Fonts: all six families are in `EXPORT_FONT_FILES`; the summary uses the same six. Memoised per app run, no saving there.
- Draft parts (`rawFactors`, `conditions`, `route`) are cheap SQLite reads; keep them so `SurveyExportData` stays one shape (context requirement), the summary just does not read them.
- The map frame size must come from the mode: `loadMapPiece` uses `MAP_FRAME_SIZE` through `frameFor` [VERIFIED: assemble-export-data.ts:261-266, 305]; add `SUMMARY_MAP_FRAME_SIZE` (515 x 210) in `export-settings.ts` and pick by mode. `ExportMap.frameSize` is already data, so the outline fallback follows automatically. A changed snapshot ratio is a device alignment check (see section 5, re-measure list).

Expected summary time `[ASSUMED]`: dominated by the snapshot (0.15 to 1.6 s warm, up to the 12 s / 8 s timeout) plus print under a second; the 25.1-17 v3.0 draft with no photo and no map took 0.34 s total on both platforms [CITED: 25.1-17-SUMMARY.md]. Expected PDF size is about 150 KB or less (text, subset fonts, logo, vector, one map JPEG) from the local measurement below.

### 4. Commune name (D-04)

- **The app stores the commune code only, never the name.** `local_surveys` payload and `PublicParcelStatusItem` carry no commune field ([VERIFIED: packages/ibp-domain/src/contract/public-map.ts:26-34]: parcel_id, study_status, latest_*, geometry). The offline parcel cache stores those items. The only place a name exists is the online parcel search (`SearchParcelItem.commune_name`, set from the IGN API Carto property `nom_com`, and `null` for parcels already registered) [VERIFIED: api/src/surveys/parcel-search.service.ts:36-44, 134; cadastre-provider.service.ts:299; packages/ibp-domain/src/contract/search.ts:49]. A name in the PDF would need an API/schema change or a bundled table of about 35,000 communes: out of scope.
- **Recommended printed format (one row):** caption "Commune", value `77186 (département 77)`. This is D-04's own fallback format, with no new data.
- **Département rule.** The id is 14 characters: 5-character commune code, 3-character prefix, 2-letter section, 4-digit number (`77186000AB0001`). `inseeFromParcelId` matches `^((?:\d{2}|2[AB])\d{3})[0-9A-Z]{9}$` and takes the first 2 characters, or the first 3 when the code starts with `97` [VERIFIED: identity.ts:35-50]. So Corsica gives "2A"/"2B" (the regex only allows 2A/2B as 2-character prefixes) and the DOM give 971 to 976. Gap: codes starting with `98` (overseas collectivities such as 984 to 988) fall back to 2 characters and print "98"; extend the test `startsWith("97") || startsWith("98")` and add cases. The existing `identity.test.ts` covers 97x and 2A/2B; add 98x. [ASSUMED: that 98x parcels can occur in the cadastre the app serves; the rule is cheap and harmless.]
- **Catalogue change** (no em dash, "INSEE" never printed, abbreviations gate): `identity.commune: "Commune"`, remove `identity.department`, add `identity.communeValue: ({ code, department }) => \`${code} (département ${department})\``. The label "Commune (code officiel géographique)" is deleted [VERIFIED: survey-export.ts:46-47]. The rows drop from 11 to 10 (about 19 units saved on page 1).
- **A département-name table** (101 entries plus 2A/2B and five DOM) would print "77186 (Seine-et-Marne)"; about 3 KB of catalogue. D-04 does not ask for it: default no (open question 4).

### 5. Optimisations: fewer pages, lighter file, cleaner page breaks

**Page counts today** [VERIFIED: local measurement with the real builders; Chrome print of the same HTML gave the same page counts, 7 for the conditioned typical survey, 4 for v3.2 and the v3.0 draft]:

| Case | Pages | Per-page fill (of 740) |
|------|------:|------------------------|
| v3.2 submitted fixture (no map, no history, no photo) | 4 | 678, 648, 590, 138 |
| v3.0 draft fixture | 4 | 641, 601, 590, 106 (area 716) |
| Typical: v3.2 + 1 parcel with basemap + 3-point history + 6 photos | 6 | 678, 648, 590, 412, 331, 706 |
| Typical + conditions + full route | 7 | 609, 639, 583, 358, 412, 331, 706 |
| Worst case (34 genera, 3 parcels, 6 history points, 24 photos, full route) | 10 | 636, 655, 583, 358, 412, 350, 706, 682, 682, 682 |

(The 25.1-17 device counts, 5 / 4 / 10, match the same arithmetic [CITED: 25.1-17-SUMMARY.md].)

**Where whitespace is wasted** (greedy, atomic blocks, `breakBefore` on map and photos [VERIFIED: map-section.ts:149; photos-section.ts:97]):
1. **Map page and trend page** (412 and 331 to 350 on separate pages: 56 % and 45 to 47 % full). 412 + 331 = 743 > 681. This is the largest hole: one page in every scenario with a map.
2. **Page 1 of a conditioned survey**: identity 225 + method 92 + conditions 111 + route 181 = 609, then the 138 score card does not fit in the 72 left, so it starts page 2 and page 1 ends 18 % empty ([VERIFIED: local measurement, p1 fill 609]). Same for the 358-unit page that closes the factors before the forced map break.
3. **Factor A with many genera (310)** forces a whole-card move; small effect.
4. **Page 4 tail** of the short fixtures (138 of 740) is just the end of the document.

**Levers, with computed effect** (heights changed in the harness only; the packing is the real algorithm):

| Lever | What | Effect (pages) |
|-------|------|----------------|
| L1 map frame 340 to about 250 | `MAP_FRAME_SIZE` height; map block 412 to about 322; map + trend (322 + 331 = 653) share one page | typical 5 to 4 content pages, typical + photos 6 to 5, conditioned 7 to 6, worst 10 to 9 |
| L2 drop `breakBefore` on the map | lets the map follow the factors if it fits | alone: 0 pages in all five scenarios (nothing fits); useful only combined with L1 |
| L3 fold "Critères de diagnostic" into the identity card | removes a heading (24), padding (20) and margin (10): about 54 units | frees room on page 1 |
| L4 commune merge (D-04) | one row less: 19 units | same |
| L5 score tiles move onto the cover | removes the 138 card from the body | pays for the cover |
| L1 to L5 together, plus a cover page | | typical + photos 6 to 6, conditioned 7 to 7, worst 10 to 10, v3.0 draft 4 to 4: **the cover costs no extra page** (body 5/6/9/3 pages + cover) |

Targets to write as acceptance numbers (to be replaced by device counts after the layout is final): the page count of every fixture with the cover is not above today's count; map and trend share a page when the map frame is 515 x 250 and the history has up to six points; no content block is cut at a page bottom (guaranteed by atomic blocks; keep the 8-PDF-per-platform check of 25.1-17).

A packing change (best-fit, reordering independent blocks) was evaluated and rejected: the holes are 72 to 131 units, smaller than any block (minimum 103), so reordering gains nothing without shrinking blocks; it would also break the reading order the owner likes ("it is already great"). A two-column factor card was rejected (denser layouts are not wanted, D-02, and the observation column is 313 wide next to a 170 result column).

**Photos.** Settings today: cap 24, long edge 800 px, JPEG 0.65 [VERIFIED: export-settings.ts:43-47]. Measured: iOS 2.8 to 3.0 MB for 24 distinct photos (about 88 to 106 KB each), Android 1.7 to 1.8 MB (47 to 58 KB each), 7 pages, 24 of 24 present, about 282 ppi in the 255-unit cell [CITED: 25.1-07-SUMMARY.md]; photos are about 95 % of the file (v3.2 with 3 photos 0.58 MB, worst case 3.02 MB iOS [CITED: 25.1-17-SUMMARY.md]). Physical size: a 255-unit cell is 3.54 in wide, so 800 px gives 226 ppi on a landscape photo and 288 ppi on a portrait photo (200 units high); 640 px would still give 181 to 230 ppi. Proposed trial: long edge 640 and quality 0.6; expected file about 55 to 65 % of today (pixels scale as (640/800)^2 = 0.64, quality a further 10 to 15 %) [ASSUMED, extrapolation: must be measured]. Keep cap 24 and 6 per page (a contact sheet of 12 per page halves the pages and weight but is a denser layout and drops resolution; D-02 says density was not a complaint; present it as an owner option only).

**Fonts.** Six TrueType files, 57.9 to 61.7 KB each (355 KB, 473 KB base64 in the HTML once). Both print engines subset them (iOS TrueType subsets, Android Type 3 subsets, [CITED: 25.1-07-SUMMARY.md]), so the PDF weight is small: a local Chrome print of the 4-page v3.2 document is 321 KB of which 188 KB is the full-size logo I inlined for the test (stored once, shared by all pages, `pdfimages -list` shows one object), leaving about 130 KB for text, six font subsets and vector art [VERIFIED: local measurement; Chrome approximates iOS and Android]. Embedding fewer weights saves tens of KB at best: not a lever. The in-app logo is already resized to 240 px (21 KB, [VERIFIED: assets.ts:19, 73-84]); the data URI is repeated in every page header in the HTML (paginate.ts:86) but the PDF stores it once on both engines (measured 25.1-07).

**HTML weight is not PDF weight.** The HTML is transient; do not optimise it except to keep the WebView load short. The summary has no photos, so its HTML is about 0.6 MB.

**Constants that are device-measured and must be re-measured after any change** (method: the 25.1 harness that ran the real `exportAndShareSurveyPdf` on fixtures, then `pdfinfo` for pages and size, `pdffonts` for embedding, `pdfimages -list` for photos and logo, `pdftotext -bbox` for scale and the bottom of the last element per page, `pdftoppm` for pictures [CITED: 25.1-07-SUMMARY.md, 25.1-17-SUMMARY.md]):
- `PDF_PAGE_BLOCK_HEIGHT` 840 (842 spills 13 pages on iOS) and `PDF_LAYOUT_SCALE` (iOS 1.2487, Android 4/3): unchanged unless the page shell changes; one calibration page to confirm.
- `MAP_FRAME_SIZE` (515 x 340) and the new summary frame: overlay alignment with the snapshot on both platforms; the 512-px world convention is unchanged.
- Every height estimate and character width tied to the CSS: `VALUE_CHARS_PER_LINE` 80, `OBS_CHAR_WIDTH` 4.4, `OBS_WIDTH` 313, `CHARS_PER_LINE` 100, `TILE_HEIGHT` 84, row heights 13 and padding 6. **A typography restyle invalidates them**: after changing sizes or weights, compare builder `pageCount` and the last element bottom per page against `pdfinfo`/`pdftotext -bbox` on both platforms, as 25.1-17 did. On Android do not trust `numberOfPages` from `printToFileAsync` ([VERIFIED: run-export.ts:167-173]); use `pdfinfo`.
- `PHOTO_EXPORT_SETTINGS` and the 12 s / 8 s snapshot timeouts (cold iOS first export was slow, 6 to 19 s in the simulator; the phone will tell).
- The owner's iPhone gives the only real times and sizes (all earlier numbers are simulator and emulator on an Apple-silicon Mac).

### 6. Modern look (cover, graphics, typography, colours)

**What static print can and cannot carry.** Known from 25.1: iOS print ignores `column-count` and does not draw 1-px filled `div`s (borders and SVG strokes draw); fonts embed; JPEG kept; rgba text colour works but CSS `opacity` on text is unsafe; trend SVG renders without `xmlns`; page-level CSS is by explicit boxes [CITED: 25.1-07-SUMMARY.md findings; VERIFIED: map-section.ts:20-21 comment, photos-section.ts, trend-section.ts:95]. Unknown and to be settled by a one-page "design probe" on both engines (Wave 0, throwaway like the 25.1 harness): SVG `linearGradient` and `radialGradient` fills, `stroke-opacity` and `fill-opacity` on many paths (the contour art uses 0.55), CSS `linear-gradient` backgrounds, `box-shadow`, `filter`, `mix-blend-mode`, `background-clip: text`, `backdrop-filter`. Rules until the probe says otherwise: no `backdrop-filter`, no `filter`, no `box-shadow` (print engines may rasterise them and bloat the file), no gradient text; gradients only as SVG fills or full-bleed CSS backgrounds; a solid fallback for each. [ASSUMED: Quartz and Skia PDF output both keep SVG gradients as vector shadings; to be confirmed by the probe.] A local Chrome render is only an approximation of those two engines.

**Charter facts that bind the design** [CITED: docs/design/charte-graphique-etats-sauvages-spec.md 5.1-5.3, 13.3, 13.4; direction-visuelle-12-2.md]: the logo never goes below 25 mm in print (the running header logo is 26 units = 9 mm, [VERIFIED: paginate.ts:86]; the cover and the summary title band must carry it at 71 units wide or more, with a clear space of 1/6 of its width, no opacity, no distortion); Sora and Jost only, Sora Light (300) only for the score numeral; moss `#89A33A` is never a ring, bar or text on a light surface (the PDF uses the high tone from `visual.score.high`); terracotta only for alerts and the low band; forest is the main brand colour. The logo is a black disc with a green fern on a transparent square, so on a forest background it reads as a black disc: place it on a paper-coloured tile or on the white part of the cover.

**Cover (complete only).** Proposal: half-bleed. Top 42 % a forest panel (palette `forest`, optionally the `forestStops` gradient as an SVG rect) with the static contour art (`CONTOUR_PATHS.sage` at stroke-opacity 0.55 width 1, `.moss` at width 1.4, the exact `contourDrift` values of the app, [VERIFIED: visual-tokens.ts:414-424]) as `preserveAspectRatio="xMidYMid slice"` SVG, the logo (>= 71 units, on a paper disc or tile), `sheetTitle` "Relevé IBP" and `sheetSubtitle` "Indice de Biodiversité Potentielle" (exists in the catalogue and is currently unused, [VERIFIED: grep]), the site name as a large title (Sora SemiBold, 28 to 30), date. Lower part on paper: the total as a large Sora Light numeral with the ring and band name, the two sub-scores as small tiles (this absorbs `score-summary`, lever L5), and four quick facts (commune, year and version number, observer, method label). It does not duplicate page 2: the CNPF identity table with all its rows stays on page 2; the cover shows only the headline facts. A full dark cover was rejected as a printing cost for partners who print it; the half-bleed keeps the brand without a full-page ink load. A draft keeps banner and watermark on the cover.

**Primitives (all static SVG/CSS, no JS, no animation, no network):**
- *Score ring:* two `<circle>`s, track `bandTrack`, arc in the band colour with `stroke-dasharray`, `stroke-linecap="round"`, `transform="rotate(-90 cx cy)"`, thickness about 4 to 10 units at large size, the total centred in Sora Light. Ratio and tone from `scoreRatio`/`totalTone` (pure) [VERIFIED: ScoreRing.tsx:1-206 uses them]; do NOT import `ui/ScoreRing.tsx` (it pulls reanimated); the three-line circumference arithmetic is not a domain rule, so copying it is fine.
- *Factor bars:* keep `buildFactorChartSvg`; modernise inside it: rounder bars, a subtle top-to-bottom tint like the app's `factorBar` tones (`makeTone`: top = `mixWithWhite(base, 0.2)`), the 0-5 gridlines lighter, a value label above each bar, a faint band separation between A to G and H to J with the sub-score captions. Add palette keys for the tinted tops (computed with `mixWithWhite` in `palette.ts`, the only place allowed to).
- *Trend curve:* keep the geometry; add a soft area under the line in a light solid tint (`accentSoft`, no alpha), larger current point with its total in a Sora Light numeral, years in Jost SemiBold; dashed links across method changes stay.
- *Large numerals:* Sora Light 56 (cover, app card value) and 20 to 24 in tiles; solid forest ink on paper, the white-to-sage gradient only on the forest panel.
- *Title hierarchy:* today every section title is Sora SemiBold 11 (flat). Proposed scale: cover title 28 to 30; section title 14 with a short accent bar (a CSS border-left of the section heading, not a 1-px div); card title 11; labels 8.5 Jost SemiBold muted; body 9 Jost. Keep line-heights on the existing 13 grid so estimates stay close.
- *Accent use:* forest for titles and rings, high tone for good scores, ochre/terracotta only by band, `accentSoft` panels instead of the beige panel on summary cards.

**Palette changes** (`palette.ts` + `PdfPalette` in `types.ts`): add keys, each derived from tokens, never literals: `forest` (= `forestStops.b`), `forestDeep` (`forestStops.a`), `forestEnd` (`forestStops.c`), `onForest` (`visual.forest.title`), `onForestAccent` (`titleAccent`), `onForestBody` (`body`), `contourSage`, `contourMoss` (`visual.forest.*`), and the bar top tints. `palette.test.ts` asserts the exact key set (it must list the new keys) and has contrast checks as a pattern ([VERIFIED: palette.test.ts:15-39, 80-86]): add `contrastRatio(onForest, forest) >= 4.5`, `onForestBody` on `forest` >= 4.5, and for text on the contour art the worst-case rule of the app (`forest-aurora-tokens.test.ts` reasons that light text never sits under the halo core: keep text off the brightest part of the panel). Existing section tests build a fake palette by key name with `as PdfPalette` casts, so adding keys does not break them.

### 7. File naming

`buildExportFileName` yields `Cortege-IBP-<site slug, <=40>[-<year>][-brouillon].pdf`, ASCII only [VERIFIED: file-name.ts:54-66]. `moveToExportName` deletes any file of the target name before moving [VERIFIED: run-export.ts:132-133].

**Collision consequences.** Two exports of the same survey within one hour (complete then summary) produce the same name: (a) the second silently replaces the first on disk, and on Android the share target of the first may still be reading it (the code comments say cleanup happens at the START of the next export for that reason, [VERIFIED: run-export.ts:12-16], but this delete is not at the start of a different file); (b) recipients get two different PDFs with one name, indistinguishable in a mail or a drive.

**Options (do not decide; the planner puts it to the owner):**
- A. No suffix: collision and confusion as above; the "existing rules" literally.
- B. Suffix on the summary only: `Cortege-IBP-<site>-<year>-resume.pdf` (a summary is never a draft, D-09, so no `-brouillon` combination); the complete export keeps today's name exactly. Valid with the file-name regex, ASCII "resume" like the existing fallback word "releve". **Recommended.** Position: year, mode suffix, then `-brouillon`.
- C. Suffix on both (`-complet` and `-resume`): symmetric, but renames every existing export.
- D. Prefix variant (`Cortege-IBP-Resume-<site>...`): groups by kind in a file list but changes the prefix rule.
Whichever is chosen, `buildExportFileName` takes `mode`, and `file-name.test.ts` gets the cases (regex, length, accent stripping, draft + complete).

### 8. Gates and constraints that will bite

| Gate | Enforced by | What it means for this phase |
|------|-------------|------------------------------|
| No em dash (U+2014) in any string, template or JSX text under `mobile/src` | `src/__checks__/catalogue-dash.test.ts` (TypeScript parser, comments exempt, no file exempt) | All new French text, the cover, the choice sheet, comments in code are fine but strings are not; also in code that builds text |
| Abbreviations written out or allowlisted (units, OK, PDF, GPS, IBP, "ex.") | `src/__checks__/abbreviations.test.ts` | "INSEE", "COG", "DMH", "TGB" must not appear bare in new catalogue text; "IGN" and "WGS 84" are registered "written-out" (the long form must occur in the same catalogue file, as `map.source` does); card captions say "environ 6 pages" not "env." |
| 400-line cap on `src/screens` and `src/navigation` source | `scripts/structure-report.js` via `structure.test.ts` | `SurveyDetailScreen.tsx` has 24 lines of room; put logic in hooks/new files |
| No user-facing literals outside `src/i18n` (label/title/message/placeholder object properties, JSX text) | same script (`findUserFacingLiterals`) | Sheet strings in `fr.surveyExportChoice`; font names in `types.ts` constants for that reason |
| No unused style keys | same script | New sheet styles must all be read |
| Outline Ionicons only (`-outline`) | `src/__checks__/icons.test.ts` | Card icons (e.g. `document-text-outline`, `reader-outline`) |
| Motion rules | `src/__checks__/motion.test.ts` | The sheet needs no animation; if a press animation is added use `brandMotion` and `ReduceMotion.System`; RN `Animated` only in allowlisted files |
| Fonts named after their PostScript name | `src/__checks__/fonts.test.ts` | No new font file; Sora Light already ships |
| Map layers catalogue | `src/__checks__/layers.test.ts` | Not touched (the PDF snapshot uses `decideBasemap`) |
| Colours only through palette / tokens; hex and `rgba(` literals only in `brand-tokens.ts`, `theme.ts`, `visual-tokens.ts`, `theme-visual.ts`, `forest-aurora-tokens.ts` | ESLint `no-restricted-syntax` on `Literal` nodes (`.eslintrc.json:42-48`) | New palette keys derive from tokens in `palette.ts` (which already imports `visual-tokens`); SVG `stop-color` values come from the palette; the rule does not see template strings, so review it |
| `survey-pdf/html.ts` holds the only HTML escape | convention + tests (`html.test.ts`, escape cases in `build-html.test.ts:250-260, 385-430`) | New builders escape every dynamic text with `escapeHtml`; no `escape` copy |
| CSP `default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'` | `styles.ts:17-22`, tests in `styles.test.ts`/`build-html.test.ts:63-66` | Zero network resource, no `<script>`, no remote font/image; gradients and SVG are inline so allowed; `url(#id)` references inside inline SVG are same-document and fine |
| Package resolution | CLAUDE.md | Builders import `@cortege/ibp-domain` from source in jest; pure; no react-native import (palette.ts is the one place that pulls `theme.ts`, so tests that load it mock `react-native`) |
| Coverage ratchet | `jest.unit.config.js` (`./src/app/` 91/80/97/95, `./src/navigation/` 100/98/100/100, `./src/i18n/`, global 100 for the rest) | New navigation code needs tests to the 100 % floor; new `app/` code well above 91 % |
| Gates before commit | CLAUDE.md | `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run format:check` |

Additional notes: the catalogue test `mobile/src/i18n/fr/survey-export.test.ts` pins catalogue shapes (it references `t.footer`); update it when keys change. The `PDF` and `GPS` words are allowlisted.

### 9. Phase 31 and 32 seams

No `31-*` or `32-*` directory exists on this branch (`ls .planning/phases` ends at 30 and 33). From the roadmap [CITED: .planning/ROADMAP.md:1093-1121]:
- **Phase 31** (annotations, remarkable elements, route trace): "annotations work offline, sync, and appear in the survey detail and in the PDF"; points are named, with a photo and a note. Plausible PDF additions: (a) an "Éléments remarquables" section after the map (list of points with name, note, optional photo as a prepared JPEG data URI); (b) the route trace and the points drawn on the parcel map (a polyline and markers in the map overlay SVG, projected with the existing `MapFrame`); (c) optionally a mark on the summary map. Data seam, additive and optional so nothing changes before 31: `SurveyExportData.annotations: ExportAnnotation[]` (id, name, lat/lng, note, photo or null) and `ExportMap.trace?: Array<[number, number]>` (the map type is already a bag of polygons, basemap and frame size, [VERIFIED: types.ts:32-46]); loaded by a new reader in `assembleSurveyExportData`'s `Promise.all` (the loader pattern is "one `orFallback` piece per source", [VERIFIED: assemble-export-data.ts:315-327]). Registry: one new `PdfSection` entry after `"map"`; the overlay needs `map-figure.ts` to accept extra layers, which is why extracting the figure now is the useful seam. Do not write any of this in 33.
- **Phase 32** (DMH information): the owner clarified the card is about information during the survey, "not about changing the data" [CITED: ROADMAP.md:1109-1121]; the stored DMH details are already printed (`dmh_groups`, `dmh_counts` through `factor-fields.ts`). Expect at most a richer label for the F card through the existing factor observation lines; no registry entry. A shared catalogue/label table, if Phase 32 creates one, would be read by `factor-fields.ts` only.
- **Files to avoid in this phase** (owned by phases 31/32 or shared with the map and factor screens): `mobile/src/screens/public-map/*`, `mobile/src/map/*` (`layers.ts`, `own-surveys.ts`, `parcel-area.ts`), `ParcelSelectionRoute`, `RouteGuideRoute`/`route-guide/*`, `screens/survey-form/*`, `ui/Factor*Input.tsx`, `app/factor-selections.ts`, `packages/ibp-domain` (no rule change here), `api/`. **`survey-pdf/map-projection.ts` is imported by map code** (`app/parcel-frame.ts`, `map/parcel-area.ts`, `map/own-surveys.ts`, `screens/survey-detail/useLocalParcelGeometry.ts`, [VERIFIED: grep]): keep its exports and behaviour unchanged, additive only. Shared files edited by several phases (small additive edits, expect merge conflicts): `navigation/types.ts`, `SurveysStack.tsx`, `stack-options.ts`, `i18n/fr/index.ts`, `i18n/fr/survey-detail.ts` (avoid: put new strings in new modules), `SurveyDetailScreen.tsx`.

### 10. Verification on devices

1. **Unit tests** (`cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf` for the section; whole mobile suite `npm --workspace mobile run test:unit`). Fixtures in `mobile/test/survey-export-fixtures.ts` (v3.2 submitted, v3.0 draft, worst case) plus new: submitted with map, history of one, history of three, no history, draft (summary refused), summary worst case.
2. **Fast visual loop with Chrome headless** (worked in this session). A throwaway jest config outside the repo (`roots` = a scratch folder, `rootDir` = `mobile`, `modulePaths` for `node_modules`, `jest.mock("react-native", ..., { virtual: true })`, `ts-jest` with `isolatedModules`) runs a test that reads the six `.ttf` files from `mobile/assets/fonts` and `mobile/assets/logo-app.png` as base64, calls `buildSurveyExportHtml({ ...fixture, assets })` and writes the HTML; then
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf=out.pdf file://.../out.html`, `pdfinfo`, `pdftoppm -r 80 -png`. Chrome printed 594.96 x 841.92 pt pages and the same page counts as the estimates (4, 4, 7, 10) in this session [VERIFIED: local measurement]. It does not reproduce the iOS WebKit scale (0.8008 pt/px) or the Android scale, the `zoom` handling, or the embedded-font subsetting of the phones; treat it as a layout approximation. The harness used here is in the session scratchpad only (not committed).
3. **iOS simulator and Android emulator**, the 25.1 recipe: a throwaway harness (never committed) that polls a request file and runs the real `exportAndShareSurveyPdf` on the fixtures with real fonts, logo, photos and snapshot, share replaced by a recorder, then `pdfinfo`, `pdffonts`, `pdfimages -list`, `pdftotext -bbox`, `pdftoppm` ([CITED: 25.1-17-SUMMARY.md]). Project memory notes (iOS device build recipe, Android emulator `Pixel_8` and the signed-app pitfall, the dead-simulator `simctl erase` fix, local Postgres for e2e) are in `/Users/florian/.claude/projects/-Users-florian-Projects-cortege/memory/` and `MEMORY.md`: read them before building; use a clone AVD instead of `Pixel_8` when it holds a release app with another signature; check port 8081 for another session's Metro; the worktree needs `mobile/.env` copied (git-ignored).
4. **Owner's iPhone** (Release build; the owner signs in, never Claude): export both versions from a real submitted survey and a draft; review criteria from the success list.
5. **Only a real device can confirm:** real export times and the cold first export; the file sizes of real photos; WebKit rendering of the new SVG gradients and contour art and any CSS background in the actual `printToFileAsync` pipeline; the share sheet from the choice flow (no share-over-sheet race); the form-sheet detent height on the phone; the Android modal clearing the status bar; iOS offline snapshot behaviour (never measured, [CITED: 25.1-07-SUMMARY.md]); dark mode of the phone leaves the PDF light; Dynamic Type on the sheet; legibility of the one-page summary at arm's length and when printed. RC-05 (maximal fixture with a route, page count on a device) is still open and is naturally closed by this phase's final measurement [CITED: docs/user-tests/device-checks.md:45].

## Common Pitfalls

### Pitfall 1: A restyle silently invalidates the height estimates
**What goes wrong:** blocks are packed by hand-written estimates tied to the CSS (row 13, padding 6, 80 characters per line, 4.4 per character). Changing font size or weight leaves them stale: a block overflows its page and is clipped (`.page-body { overflow: hidden }`) or leaves large holes.
**Why:** the paginator cannot measure layout; only the print engine can.
**How to avoid:** change the estimate and the CSS in the same commit, keep line-heights on the 13 grid, and re-run the device comparison (builder `pageCount` vs `pdfinfo`, last-element bottom vs the body bottom) after the restyle. The summary uses fixed-height zones to opt out of this risk.
**Warning signs:** a last line missing at a page bottom; a block that starts a page with 40 % empty above it.

### Pitfall 2: The mode must not leak into the access token path
`assembleSurveyExportData` copies `SurveyExportInput` fields one by one so `apiUrl` and `accessToken` never reach builders [VERIFIED: assemble-export-data.ts:328-351]. Add `mode` to that list explicitly; do not switch to a spread.

### Pitfall 3: Presenting the OS share sheet from inside the form sheet
Running the export from the sheet means `Sharing.shareAsync` presents while the form sheet is on screen or dismissing (iOS "already presenting" race; Android back handling). The return-the-mode design avoids it. [ASSUMED: the race exists; the design does not depend on it.]

### Pitfall 4: Summary on a draft
D-09 forbids it. Enforce it in two places: the card is disabled, and `buildSurveyExportInput` coerces a requested "summary" to "complete" when `canEditSurvey` is true (and logs it), because a stale nonce param could still arrive. The builder itself stays mode-agnostic.

### Pitfall 5: Logo too small, or a black disc on forest
The charter's 25 mm print minimum is violated by the 9 mm header logo today. The cover and the summary title band must use 71 units or more; the logo is an opaque black disc, so give it a paper background on the forest panel.

### Pitfall 6: Gradient or opacity rendering differs between WebKit and Skia
Do not ship a design that only Chrome has seen. Probe both engines first (Wave 0), keep solid fallbacks, never rely on CSS opacity on text, no 1-px filled divs, no `column-count`.

### Pitfall 7: A changed map frame breaks the overlay alignment
The polygon overlay is projected with the snapshot's own frame; a new frame ratio changes the snapshot request. Re-verify alignment on both platforms (parcel polygon follows the cadastre lines) and keep `WORLD_SIZE_PX = 512` and the outline fallback zoom cap 19.

### Pitfall 8: Page count on the card lies after a layout change
The "environ N pages" estimate is a formula; pin it to the fixtures in a test.

### Pitfall 9: Same-name file deleted while a share target reads it
See section 7; choose a suffix or accept the risk knowingly.

### Pitfall 10: Dead fill-factor constant
`PDF_PAGE_FILL_FACTOR = 0.9` in `export-settings.ts` is unused; `PAGE_FILL_FACTOR = 0.92` is the live one [VERIFIED: paginate.ts:21; export-settings.ts:24]. A re-measure that adjusts the wrong one changes nothing.

## Code Examples

### Cover contour layer (static, from the app's own paths)
```ts
// Source: mobile/src/app/contour-paths.ts and ui/ContourLines.tsx (the app draws the same two paths)
import { CONTOUR_PATHS, CONTOUR_VIEWBOX } from "../contour-paths"
const art = `<svg class="cover-contours" viewBox="${CONTOUR_VIEWBOX}" preserveAspectRatio="xMidYMid slice" width="595" height="352" aria-hidden="true">
<path d="${CONTOUR_PATHS.sage}" fill="none" stroke="${escapeHtml(palette.contourSage)}" stroke-width="1" stroke-opacity="0.55"/>
<path d="${CONTOUR_PATHS.moss}" fill="none" stroke="${escapeHtml(palette.contourMoss)}" stroke-width="1.4"/>
</svg>`
```

### Score ring as static SVG
```ts
const r = (size - stroke) / 2, c = 2 * Math.PI * r
// track: <circle stroke=bandTrack/>, arc: stroke=band colour, stroke-dasharray="${svgNumber(c * ratio)} ${svgNumber(c)}",
// stroke-linecap="round", transform="rotate(-90 ${cx} ${cy})"
```

### Section filter in the assembler
```ts
const sections = sectionsFor(data.mode)
const blocks = sections.flatMap((section) => section.build(data, palette))
const css = [fontFaceCss(data.assets.fonts), buildBaseCss(palette, data.layout),
  ...sections.map((section) => section.css(palette))].join("\n")
```

### Catalogue strings (French, no em dash) proposed for `fr.surveyExportChoice`
```ts
title: "Quel PDF voulez-vous ?",
complete: { label: "Complet", caption: "Tout le relevé : identité, conditions, parcours, facteurs, carte, évolution et photos.",
            pages: ({ count }: { count: number }) => `Environ ${count} pages` },
summary: { label: "Résumé", caption: "Une page à montrer : score, parcelle, carte et évolution.", pages: "1 page" },
summaryDraft: "Le résumé est réservé aux relevés terminés. Terminez le relevé pour l'obtenir.",
confirm: "Exporter", cancel: "Annuler",
// survey-export.ts additions
identity: { commune: "Commune", communeValue: ({ code, department }: { code: string; department: string }) => `${code} (département ${department})` },
summary: { trendUnavailable: "Évolution de la parcelle non disponible sur cet appareil." },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-written section list in the assembler | Ordered `PdfSection[]` with a mode filter | Phase 33 | Phases 31/32 append one entry |
| One export | Complete and one-page summary, chosen in a sheet | Phase 33 | Mode on the input |
| Header logo 9 mm | Logo >= 25 mm on cover and summary | Phase 33 | Charter 5.2 respected where it is the brand page |

**Deprecated/outdated:** the identity row "Département" and the label "Commune (code officiel géographique)"; the unused `PDF_PAGE_FILL_FACTOR`; the sentence `trend.unavailable` as a patron-facing line (kept for the complete version only).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | File weight with photo settings 640 px / 0.6 is about 55 to 65 % of today's | 5 | The "lighter file" target is missed; measure on a device before fixing the numbers |
| A2 | SVG gradients and stroke-opacity print as vector on both WebKit and Skia | 6 | A gradient prints as a banded raster or a solid; use the solid fallback |
| A3 | The budget 730 / 740 reads well at those zone sizes | 3 | Owner finds the map or trend too small; trade map height against trend |
| A4 | Presenting the share sheet over a closing form sheet races on iOS | Pitfall 3 | Design is still fine; only the justification weakens |
| A5 | 98x parcel ids can occur | 4 | Harmless extra rule |
| A6 | Summary export time is dominated by the snapshot | 3 | None, informational |
| A7 | A half-bleed cover is preferred over a full dark cover | 6 | Owner wants full bleed; the CSS supports it, the print cost is the owner's call |

## Open Questions (for the owner; each with a recommended default)

1. **Button label.** The header button is "Partager" (share icon), not "Exporter en PDF". Keep "Partager" and the existing icon, with the sheet title making the PDF explicit? **Default: keep the label, title the sheet "Quel PDF voulez-vous ?".**
2. **Card tap behaviour.** Two `RadioCard`s plus an "Exporter" button (consistent with the finish sheet, correct radio semantics) or a one-tap card that exports immediately (needs a new non-radio card)? **Default: radio cards plus a button, "Complet" preselected.**
3. **File names (section 7).** **Default: option B, `-resume` on the summary only.**
4. **Département name.** Print "77186 (département 77)" as D-04 says, or add a 106-entry table for "77186 (Seine-et-Marne)"? **Default: D-04 literally, no table.**
5. **Photos.** Keep cap 24 at 6 per page and trial 640 px / 0.6 for weight, or accept a contact sheet (12 per page)? **Default: keep layout, trial the lighter encoding, decide the numbers after the device measurement.**
6. **Cover tone.** Half-bleed forest panel with contour lines (recommended) or full dark cover. **Default: half-bleed.**
7. **Map frame height of the complete PDF.** 515 x 250 (map and trend share a page, saves a page) versus keeping 340. **Default: 250, judged on the phone.**
8. **Summary when the trend is unavailable.** Quiet panel with "Évolution de la parcelle non disponible sur cet appareil." **Default: yes (page layout unchanged).**
9. **Summary on a submitted but unsynced survey.** `status === "submitted"` is the draft test used everywhere; the summary is allowed once the survey is finished on the phone even if not yet synced. **Default: yes, same rule as the export today.**

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node, npm, jest | unit tests | yes | repo toolchain | none needed |
| Google Chrome (headless) | local visual loop | yes | `/Applications/Google Chrome.app` | none |
| poppler (`pdfinfo`, `pdffonts`, `pdfimages`, `pdftotext`, `pdftoppm`) | PDF measurements | yes | `/opt/homebrew/bin` | none |
| iOS simulator, Android emulator, owner iPhone | device checks | not probed in this session (read-only research) | see memory notes | clone AVD when `Pixel_8` holds a release app |
| Docker / Postgres | none for this phase | not needed | | |

**Missing dependencies with no fallback:** none for planning. Device checks need the owner for the iPhone.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29 + ts-jest, `testEnvironment: node` |
| Config file | `mobile/jest.unit.config.js` (roots `src`, coverage ratchet) |
| Quick run command | `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/screens/survey-detail src/navigation src/__checks__ src/i18n` |
| Full suite command | `npm run test:unit` (mobile part: `npm --workspace mobile run test:unit`), plus `npm run lint`, `npm run typecheck`, `npm run format:check` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-QA-pdf-sections-registry | ids unique, order pinned, mode filter, summary omits photo/factor sections, CSS only of included sections | unit | `npx jest ... src/app/survey-pdf/sections.test.ts build-html.test.ts` | Wave 0 (new `sections.test.ts`; `build-html.test.ts` edited) |
| REQ-C-pdf-two-versions | `mode` flows input to data; facade keys unchanged; hook refuses summary on a draft; sheet disables the card; nonce handled once | unit | `... survey-pdf-export.test.ts useSurveyPdfExport.test.ts useExportRequest.test.ts ExportChoiceRoute.test.tsx navigation.test.tsx` | edit existing + Wave 0 new |
| REQ-C-pdf-summary-page | one page for worst inputs (long name, 3 parcels, 6 points); basemap present/absent; no history; one survey; stale cache; no photo read in the loader | unit | `... summary-section.test.ts assemble-export-data.test.ts` | Wave 0 |
| REQ-C-pdf-modern-layout | cover block (draft banner kept, no header), palette keys + contrast, ring/bars/trend SVG strings, no em dash, only `data:` URIs, no network attribute | unit | `... cover-section.test.ts palette.test.ts factor-chart-svg.test.ts trend-section.test.ts styles.test.ts` | Wave 0 + edits |
| REQ-C-pdf-lean-export | page counts of all fixtures not above today's; map and trend share a page; no block cut (each block html in exactly one page); estimate formula for the card | unit | `... build-html.test.ts paginate.test.ts` | edit |
| REQ-C-pdf-commune-row | one Commune row, "77186 (département 77)", 2A/2B, 971, 98x, malformed id prints unknown | unit | `... identity.test.ts` | edit |
| file naming | suffix by mode, regex, draft | unit | `... file-name.test.ts` | edit |
| gates | dash, abbreviations, structure, icons | unit | `... src/__checks__` | exists |
| device | counts, weight, alignment, gradients, share, times | manual on simulator/emulator/iPhone | recipe in section 10 | not automatable |

### Sampling Rate
- **Per task commit:** the quick run above (under 30 s).
- **Per wave merge:** `npm run test:unit`, `npm run lint`, `npm run typecheck`.
- **Phase gate:** full suite green, plus the device measurements recorded in the summary and RC-05 closed, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] Design probe on both engines (throwaway, not committed): SVG gradients, stroke-opacity contour art, CSS gradient background, a page with the new title hierarchy; outputs `pdfinfo`/`pdftoppm` pictures.
- [ ] `sections.test.ts`, `summary-section.test.ts`, `cover-section.test.ts`, `ExportChoiceRoute.test.tsx`, `useExportRequest.test.ts`, `survey-export-choice` catalogue test.
- [ ] Fixtures: `mode` on the three fixtures; new `exportFixtureSummary*` variants (with map, history of one/three, no history, stale cache).
- [ ] `palette.test.ts` key list and contrast pairs for the new keys.
- [ ] A reusable local render harness description (this research's scratch harness) in the plan, so every plan can look at Chrome output.

## Security Domain

`security_enforcement` is not disabled in `.planning/config.json`, so it applies.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | token stays in the loader, never in `SurveyExportData` |
| V3 Session Management | no | |
| V4 Access Control | yes (light) | the summary is refused on a draft in three places; export is only of the member's own survey (single caller) |
| V5 Input Validation | yes | `escapeHtml` for every user text (site name on the cover and the title band, parcel ids, notes); `svgNumber` for coordinates; data-URI regexes for images (`LOGO_DATA_URI`, `JPEG_DATA_URI`) |
| V6 Cryptography | no | |
| V12 Files / V14 Config | yes | the CSP blocks every load; file name through `buildExportFileName` (ASCII only); exports cleaned after an hour |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| HTML/script injection through the site name or a note in the new cover and summary | Tampering | `escapeHtml`; CSP `default-src 'none'` (no script can run); tests with `<b>` and event-handler strings as in `build-html.test.ts:385-430` |
| Remote resource load via a crafted image or font reference | Information disclosure | only `data:` URIs, CSP `img-src data:; font-src data:`; the logo and photo checks stay |
| Path traversal / odd characters in the exported file name | Tampering | slug to `[A-Za-z0-9-]`, mode suffix from a closed set |
| Token leakage into the HTML | Information disclosure | field-by-field copy in `assembleSurveyExportData`; test that the serialised data holds no token |
| Stale nonce param re-triggering an export | Denial of service | one handled nonce per mount, `running` ref |

## Sources

### Primary (HIGH confidence, read in this session)
- `mobile/src/app/survey-pdf/*.ts` (build-html, paginate, types, export-settings, styles, identity, score-section, factor-chart-svg, map-section, trend-section, factor-section, photos-section, conditions-section, route-section, palette, assets, run-export, assemble-export-data, file-name, html) and tests `build-html.test.ts`, `palette.test.ts`, `survey-pdf-export.test.ts`
- `mobile/src/screens/survey-detail/useSurveyPdfExport.ts`, `useSurveyDetailHeader.tsx`, `useSurveyDetailData.ts`; `SurveyDetailScreen.tsx`; `navigation/routes/FinishSheetRoute.tsx`, `SurveyDetailRoute.tsx`; `navigation/stacks/SurveysStack.tsx`, `stack-options.ts`; `navigation/types.ts`; `screens/FinishSheet.tsx`; `ui/RadioCard.tsx`, `VisibilityPicker.tsx`, `ScoreRing.tsx`, `FactorBarsChart.tsx`, `ContourLines.tsx`, `GradientNumeral.tsx`; `app/contour-paths.ts`, `trend-geometry.ts`, `parcel-history.ts`, `visual-tokens.ts`, `theme-visual.ts`
- `mobile/src/i18n/fr/survey-export.ts`, `survey-detail.ts`, `survey-finish.ts`; `mobile/src/__checks__/*`; `mobile/scripts/structure-report.js`; `mobile/.eslintrc.json`
- `packages/ibp-domain/src/contract/public-map.ts`, `search.ts`; `api/src/surveys/parcel-search.service.ts`, `cadastre-provider.service.ts`
- `mobile/test/survey-export-fixtures.ts`; `mobile/jest.unit.config.js`; `.planning/ROADMAP.md`, `REQUIREMENTS.md`, `33-CONTEXT.md`, `25.1-07-SUMMARY.md`, `25.1-17-SUMMARY.md`; `docs/user-tests/device-checks.md`; `docs/design/charte-graphique-etats-sauvages-spec.md`, `direction-visuelle-12-2.md`

### Secondary (MEDIUM confidence)
- Local measurements: real builders through a throwaway jest harness and Chrome headless print (page counts, fill per page, PDF sizes, embedded fonts, logo object sharing); approximates, not equals, the phone engines.

### Tertiary (LOW confidence)
- Photo-weight ratios, gradient rendering on WebKit, summary timing (Assumptions Log).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new dependency, every module read.
- Architecture (registry, mode, sheet): HIGH, follows existing patterns (Phase 30 nonce param, finish sheet).
- Page arithmetic: HIGH for the estimator, MEDIUM for the phones (Chrome matched the estimator, phones matched it in 25.1-17).
- Look and graphics: MEDIUM, needs the Wave 0 probe on both engines.
- File weight changes: LOW until measured.

**Research date:** 2026-10-23
**Valid until:** 2026-11-22 (stable code; invalidated earlier if Phases 31 or 32 land changes in `types.ts`, `SurveysStack.tsx` or `map-projection.ts`)

## Project Constraints (from CLAUDE.md)

- No em dash (U+2014) in any string, template or JSX text under `mobile/src`; French UI text only from the `fr` catalogue; abbreviations written out unless allowlisted; `survey-pdf/html.ts` holds the only HTML escape.
- The PDF is always light; every colour through the palette built from token files; hex and `rgba(` literals only in the five token files.
- Everything inlined as data URIs under a blocking CSP; no network resource required; offline first.
- Measured layout constants live only in `export-settings.ts`, each with its device measurement.
- `src/screens` and `src/navigation` files are capped at 400 lines.
- Never call `useSurveySync` elsewhere; read state through the context hooks; action objects are stable (`useLatestCallback`).
- Native sheets: form sheet on iOS, modal on Android, like the finish sheet; icons Ionicons outline only; motion through `brandMotion` with `ReduceMotion.System`.
- Never re-implement an IBP rule, band or score in `api` or `mobile`; the score never depends on the route.
- Before committing: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run format:check`.
- Memory notes: owner forbids the em dash in French UI strings; prod is test data (no migration care); verify the commit is in `origin/main` before saying it is merged; iOS device build recipe and Android emulator notes under the user's memory directory.
