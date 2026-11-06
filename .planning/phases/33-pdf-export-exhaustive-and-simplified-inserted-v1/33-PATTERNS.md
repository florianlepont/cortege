# Phase 33: PDF Export, Exhaustive and Simplified - Pattern Map

**Mapped:** 2026-10-23
**Files analyzed:** 27 (new and modified)
**Analogs found:** 26 / 27 (all paths relative to `mobile/src/` unless noted)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/survey-pdf/sections.ts` (new, registry D-10) | utility (registry) | transform | `app/survey-pdf/build-html.ts` `collectBlocks`/`collectCss` (lines 20-62) | exact (it is the code being extracted) |
| `app/survey-pdf/cover-section.ts` (new) | pure builder | transform | `app/survey-pdf/score-section.ts` + `identity.ts` (block + CSS pair) | role-match |
| `app/survey-pdf/summary-section.ts` (new, `pageStyle: "summary"`) | pure builder | transform | `app/survey-pdf/map-section.ts`, `trend-section.ts`, `factor-chart-svg.ts` (recomposed at summary size) | role-match |
| `app/survey-pdf/map-figure.ts` (new, extraction) | pure builder | transform | `app/survey-pdf/map-section.ts` | exact (extract) |
| `app/survey-pdf/build-html.ts` (modify: mode, registry) | pure assembler | transform | itself | exact |
| `app/survey-pdf/paginate.ts`, `styles.ts` (modify: `pageStyle`, per-kind chrome) | pure paginator | transform | itself | exact |
| `app/survey-pdf/types.ts` (modify: `PdfPalette` keys, `PdfBlock.pageStyle`, `mode` on input/data) | types | n/a | itself | exact |
| `app/survey-pdf/palette.ts` + `palette.test.ts` (modify: new keys, contrast pairs) | utility | transform | itself | exact |
| `app/survey-pdf/identity.ts` (modify: merged "Commune" row) | pure builder | transform | itself lines 56-107 | exact |
| `app/survey-pdf/file-name.ts` + test (modify: `-resume` suffix) | utility | transform | itself | exact |
| `app/survey-pdf/export-settings.ts` (modify: `MAP_FRAME_SIZE`, `SUMMARY_MAP_FRAME_SIZE`, photo settings) | config | n/a | itself | exact |
| `app/survey-pdf/assemble-export-data.ts` (modify: mode skips photos) | service (loader) | file-I/O | itself lines 158-183, 315-352 | exact |
| `app/survey-pdf/run-export.ts` (modify: mode argument, name) | service | file-I/O | itself lines 159-183 | exact |
| `app/survey-pdf-export.ts` (facade) | facade | n/a | itself (pinned by a test, update the test) | exact |
| `i18n/fr/survey-export-choice.ts` (new) + `index.ts` registration + test | catalogue | n/a | `i18n/fr/survey-finish.ts`, `survey-export.test.ts` | exact |
| `i18n/fr/survey-export.ts` (modify: cover, summary, file suffix, commune label) | catalogue | n/a | itself | exact |
| `navigation/types.ts` (modify: `surveyExportChoice`, `surveyDetail` params, route props type) | types | n/a | `surveyFinish` (line 61) + `FinishSheetRouteProps` (line 194); nonce pattern lines 80-82 | exact |
| `navigation/stacks/stack-options.ts` (`exportChoiceScreenOptions`) | config | n/a | `finishSheetScreenOptions` lines 188-196 | exact |
| `navigation/stacks/SurveysStack.tsx` (register screen) | config | n/a | `surveyFinish` registration lines 205-208 | exact |
| `navigation/routes/ExportChoiceRoute.tsx` (new) | route component | request-response | `navigation/routes/FinishSheetRoute.tsx` | exact |
| `screens/ExportChoiceSheet.tsx` + `screens/export-choice/export-choice.styles.ts` (new) | component | request-response | `screens/FinishSheet.tsx`, `screens/finish-sheet/finish-sheet.styles.ts` | exact |
| `screens/export-choice/ExportModePicker.tsx` (new) | component | request-response | `ui/VisibilityPicker.tsx` | exact |
| `screens/export-choice/useExportChoice.ts` (new) | hook | event-driven | `screens/finish-sheet/useFinishSheet.ts` | role-match |
| `screens/survey-detail/useExportRequest.ts` (new, one export per nonce) | hook | event-driven | nonce handling in `navigation/routes/RouteGuideRoute.tsx` lines 68-86 | role-match |
| `screens/survey-detail/useSurveyPdfExport.ts` (modify: mode arg) | hook | request-response | itself | exact |
| `screens/SurveyDetailScreen.tsx` / `useSurveyDetailHeader.tsx` (modify: `onShare` opens sheet) | component | event-driven | itself lines 140-187 | exact |
| `test/survey-export-fixtures.ts` (modify: `mode`, cover/summary cases) | test fixture | n/a | itself (`exportFixtureV32Submitted` line 78, `...V30Draft`, `...WorstCase`) | exact |
| Tests: `navigation.test.tsx`, `routes.test.tsx`, `*-section.test.ts` | test | n/a | `navigation.test.tsx:142,875`, `routes.test.tsx:1218`, `file-name.test.ts` | exact |

No analog (use RESEARCH/UI-SPEC): static contour SVG on the cover (reuse `app/contour-paths.ts` `CONTOUR_PATHS`, no PDF consumer yet), the ring helper for print (no print ring exists; geometry from `app/ibp-display.ts` `scoreRatio`), `estimateCompletePages` (new).

## Pattern Assignments

### `app/survey-pdf/sections.ts` (registry, transform)

**Analog:** `app/survey-pdf/build-html.ts` (the fixed list to turn into data). Today:

```typescript
function collectBlocks(data: SurveyExportData, palette: PdfPalette): PdfBlock[] {
  const blocks: PdfBlock[] = []
  const warmup = fontWarmupHtml(data.assets.fonts)
  if (warmup !== "") blocks.push({ id: "font-warmup", html: warmup, height: 0 })
  const conditions = buildConditionsBlock(data, palette)
  const route = buildRouteBlock(data, palette)
  blocks.push(
    ...buildIdentityBlocks(data, palette),
    ...(conditions === null ? [] : [conditions]),
    ...(route === null ? [] : [route]),
    buildScoreSummaryBlock(data, palette), buildFactorChartBlock(data, palette),
    ...buildFactorBlocks(data, palette), buildMapBlock(data, palette),
    buildTrendBlock(data, palette), ...buildPhotoBlocks(data, palette),
  )
  return blocks
}
function collectCss(data, palette) { return [fontFaceCss(...), buildBaseCss(palette, data.layout), identityCss(palette), /* one *Css per section */ ].join("\n") }
```

Shape to copy: `type PdfSection = { id; modes: ReadonlyArray<"complete" | "summary">; build(data, palette): PdfBlock[]; css(palette): string }`, an ordered `PDF_SECTIONS` array (UI-SPEC B.8 order: cover, identity, conditions, route, factor-chart, factors, map, trend, photos; score card block deleted). Builders already return `PdfBlock` or `PdfBlock[]` and `null` for absent (conditions, route): normalise to arrays in the registry. `collectBlocks`/`collectCss` become `sections.filter(mode).flatMap(...)`. Font-warmup and `fontFaceCss`/`buildBaseCss` stay outside the registry (always first). Keep each builder escaping its own text.

### `app/survey-pdf/cover-section.ts`, `summary-section.ts`, `map-figure.ts` (pure builders)

**Analog:** the existing builder pair convention, e.g. `identity.ts`: `export function buildXBlock(data, _palette): PdfBlock` plus `export function xCss(palette): string` with every class prefixed (`identity-`, use `cover-`, `summary-`), fonts from `PDF_FONT_FAMILIES`, colours only from `PdfPalette`, text from `fr.surveyExport.*`, `escapeHtml` on every user string (`import { escapeHtml, formatCoordinate, formatDateFr } from "./html"`).

```typescript
export function identityCss(palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  return `
.identity-card { display: block; box-sizing: border-box; margin: 0 0 ${CARD_MARGIN}px; ... background: ${palette.panel}; }
.identity-heading { font-family: ${font.heading}; font-size: 11px; color: ${palette.ink}; }
`
}
```

Cover and summary are fixed-height blocks (no estimate): `{ id: "summary", pageStyle: "summary", height: 764 }`, absolute zones with explicit `height`, `overflow: hidden` (UI-SPEC B.10). Reuse `buildFactorChartBlock`/`buildTrendBlock` internals by extracting width-parameterised helpers (`trend-geometry.ts` `buildTrend` takes a width). Extract `map-figure.ts` from `map-section.ts` so complete (515x250) and summary (515x228, `SUMMARY_MAP_FRAME_SIZE`) share the projection/SVG overlay. Summary on a trend or basemap that is unavailable: quiet panel with one sentence, layout unchanged (D-18), mirroring how `trend-section.ts` returns an omitted-with-note block offline.

### `app/survey-pdf/types.ts` + `palette.ts` (modify)

**Palette pattern** (palette.ts): every value derives from `buildTheme("light")`, `brandColors`, `mixWithWhite`, `withAlpha`; no hex literal (ESLint). Add UI-SPEC keys `forest`, `forestDeep`, `onForest`, `onForestAccent`, `onForestBody`, `contourSage` (`compositeOver` from `app/contrast.ts`), `contourMoss` to `PdfPalette` in `types.ts` AND to the `KEYS` array of `palette.test.ts` (it asserts the exact key set), plus the contrast pairs of the UI-SPEC Color table using the existing `contrastRatio` import. Probe-gated keys (`forestEnd`, `bandLowTop`, ...) only if the Wave 0 probe passes. `PdfBlock` gains `pageStyle?: "summary" | "cover"`.

### `app/survey-pdf/identity.ts` (commune row, D-04/D-16)

**Current code** (lines 56-70, 100-103) to change:

```typescript
export function inseeFromParcelId(id: string): Insee | null { ... department: commune.startsWith("97") ? commune.slice(0, 3) : commune.slice(0, 2) }
...
if (insee) {
  rows.push(textRow(t.identity.commune, insee.commune))
  rows.push(textRow(t.identity.department, insee.department))
}
```

Replace by one row `textRow(t.identity.commune, t.identity.communeValue({ code, department }))` printing "77186 (département 77)"; keep `inseeFromParcelId` (2A/2B and 97x already handled, keep its tests); drop `t.identity.department` and the "code officiel géographique" wording from the label in `i18n/fr/survey-export.ts`. Update `ROW` count (one row less) in height estimate; use `nowrap` ids per B.9.

### `app/survey-pdf/file-name.ts` (D-13)

**Analog:** itself. Add `mode: "complete" | "summary"` to the input of `buildExportFileName`; push `t.summarySuffix` ("resume") instead of the draft suffix when mode is summary (a summary is never a draft):

```typescript
if (input.isDraft) parts.push(t.draftSuffix)   // existing
return `${parts.join("-")}.pdf`                  // regex ^[A-Za-z0-9-]+\.pdf$ must still hold
```

Catalogue `fr.surveyExport.file` (`prefix`, `draftSuffix`, `fallbackSite`) gets `summarySuffix: "resume"`. Test pattern: `file-name.test.ts` `nameOf(overrides)` helper + `SAFE_NAME` regex.

### `app/survey-pdf/assemble-export-data.ts` and `run-export.ts` (mode)

**Analog:** themselves. `assembleSurveyExportData` runs `Promise.all([draftParts, photos, mapPiece, history, assets])` with `orFallback("photos", NO_PHOTOS, () => loadPhotos(input.surveyId, deps))` (lines 319-321). For `mode === "summary"` pass `NO_PHOTOS` instead of calling `loadPhotos` (no photo prep cost); keep the rest; choose the map frame by mode. `SurveyExportData` stays one shape (add `mode`). In `exportAndShareSurveyPdf(input, deps)` (run-export.ts:159) thread `input.mode` into `buildSurveyExportHtml(data)` and `buildExportFileName({... , mode})`; keep the iOS page-count log. Facade `app/survey-pdf-export.ts` exports are pinned by a test (three functions, two types): change only types, update the pin test deliberately.

### `navigation/types.ts`, `stack-options.ts`, `SurveysStack.tsx`

**Types analog** (`types.ts:60-61`, `194`, nonce lines 80-82):

```typescript
// Phase 29, D-04: the submission step ...
surveyFinish: { surveyId: string }
export type FinishSheetRouteProps = StackRouteProps<SurveysStackParamList, "surveyFinish">
/** The chooser's pick, applied once per `pickNonce`. */  picked?: RoutePick;  pickNonce?: number
```

Add `surveyExportChoice: { surveyId: string }`, `ExportChoiceRouteProps`, and change `surveyDetail: undefined` (line 49) to `{ exportRequest?: { mode: "complete" | "summary"; nonce: number } } | undefined` (check `SurveyDetailRoute` prop typing and existing `navigate("surveyDetail")` callers still compile).

**Options analog** (`stack-options.ts:188-196`): copy `finishSheetScreenOptions` as `exportChoiceScreenOptions(theme)` verbatim (headerShown false, formSheet/modal, `sheetAllowedDetents: [0.65, 1]`, grabber, canvas `contentStyle`).

**Registration analog** (`SurveysStack.tsx:205-208`):

```tsx
name="surveyFinish"
options={finishSheetScreenOptions(theme)}
component={FinishSheetRoute}
```

### `navigation/routes/ExportChoiceRoute.tsx` (route, request-response)

**Analog:** `navigation/routes/FinishSheetRoute.tsx`. Copy: `memo(function ...({ navigation, route }))`, survey lookup `useMemo(() => state.surveys.find(...) ?? null)` from `useSurveys()`, `handleClose` with `if (navigation.isFocused()) navigation.goBack()`, close-on-missing effect (put in the hook, as `useFinishSheet` does with `useLatestCallback`). Differences: no `BackHandler`/`gestureEnabled` lock (nothing runs in the sheet). Confirm returns the choice: `navigation.popTo("surveyDetail", { exportRequest: { mode, nonce: Date.now() } }, { merge: true })`-style call, exactly as `RouteChooseRoute.tsx:122` does:

```typescript
navigation.popTo("surveyRouteGuide", { picked, pickNonce: Date.now() } as GuideParams, { ... })
```

(read lines 118-126 of that file for the options object before writing). `isDraft = survey.status !== "submitted"`.

### `screens/ExportChoiceSheet.tsx`, `export-choice.styles.ts`, `ExportModePicker.tsx`

**Sheet analog:** `screens/FinishSheet.tsx` lines 1-70: `ScrollView style={styles.sheet} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="never"`, `Text accessibilityRole="header"` title, picker in a `View style={styles.picker}`, `GlassButton` confirm + cancel, `AppNotice`; `const theme = useBrandTheme(); const insets = useSafeAreaInsets(); const styles = useMemo(() => createXStyles(theme, insets), [theme, insets])`.
**Styles analog:** `screens/finish-sheet/finish-sheet.styles.ts`: `SHEET_PADDING_X = 20`, `paddingTop: brandSpacing4.md + (Platform.OS === "android" ? insets.top : 0)`, `paddingBottom: brandSpacing4.lg + insets.bottom`, title `...brandTypography.screenTitle`, colours via `theme.semanticColors`. Every style key must be read (structure gate).
**Picker analog:** `ui/VisibilityPicker.tsx` (do not reuse it, its gap is off-grid and strings are visibility ones; use gap `brandSpacing4.smd`):

```tsx
<View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={fr.surveyFinish.groupA11y}>
  <RadioCard selected={option === value} disabled={disabled}
    onPress={() => { if (disabled || option === value) return; feedback.selection(); onChange(option) }}
    title={label} caption={caption} icon={...} accessibilityLabel={fr.surveyForm.wizard.optionA11y({ label, caption })}
    testID={`visibility-option-${key}`} />
```

Use testIDs `export-option-complete`, `export-option-summary`, `export-choice-confirm`, `export-choice-cancel`; icons `documents-outline`, `document-text-outline`; draft: wrap Résumé card in `opacity: 0.55` View plus the lock sentence in a polite live region.

### `screens/export-choice/useExportChoice.ts` (hook)

**Analog:** `screens/finish-sheet/useFinishSheet.ts` lines 47-90: `useState` for choice (preselect "complete"), `useLatestCallback` for `select`/`confirm`, a close-on-missing-survey effect, an injected `onClose`/`announce` for testing. Add the draft fallback: if `isDraft` and choice is "summary", force "complete". Test pattern: `useFinishSheet.test.ts`.

### `screens/survey-detail/useExportRequest.ts` and header wiring

**Analog:** nonce guard in `RouteGuideRoute.tsx:68-86`:

```typescript
const appliedNonce = useRef<number | null>(null)
useEffect(() => {
  if (picked === undefined) return
  const nonce = pickNonce ?? 0
  if (appliedNonce.current === nonce) return
  appliedNonce.current = nonce
  ...
}, [picked, pickNonce, actions])
```

Same shape: read `route.params?.exportRequest`, skip when nonce already handled, then call `share(mode)`. `useSurveyPdfExport` (`share` is `useLatestCallback(async () => {...})` with a `running` ref and `Alert` on failure) takes `mode` and puts `mode` into `buildSurveyExportInput`'s result. In `SurveyDetailScreen.tsx` (lines 140-154, 187) change `onShare: () => void share()` to `navigation.navigate("surveyExportChoice", { surveyId })`, ignored while `exporting`. File is near the 400-line cap (24 lines of room): put logic in the hook.

### `i18n/fr/survey-export-choice.ts` (catalogue)

**Analog:** `i18n/fr/survey-finish.ts` (`export const surveyFinishFr = {...} as const`, `commonFr.actions.cancel`, a11y functions, registered in `index.ts` at the import (line 32) and the `fr` object (line 53)). Keys: `title` "Quel PDF voulez-vous ?", `groupA11y`, `options.complete/summary` (label, caption with approximate pages), `draftSentence`, `confirm` "Exporter le PDF", `cancel`. Rules: no U+2014, abbreviations allowlist (`PDF` allowed; `__checks__/catalogue-dash.test.ts`, `abbreviations.test.ts`). Test analog: `catalogue-additions-29.test.ts`, `survey-export.test.ts`.

## Shared Patterns

### Pure builders, escape, determinism
**Source:** `app/survey-pdf/html.ts` (only HTML escape in `mobile/src`), `identity.ts`. Every builder escapes its own text, same input gives same output, no read of storage or `react-native` (types-only imports).

### Measured constants
**Source:** `app/survey-pdf/export-settings.ts`. Constants (`MAP_FRAME_SIZE` 515x340 to 515x250, new `SUMMARY_MAP_FRAME_SIZE`, `PHOTO_EXPORT_SETTINGS` cap/longEdgePx/jpegQuality) live only here, each with a measurement comment; pure, no react-native.

### Block/CSS contract and pagination
**Source:** `PdfBlock` (`types.ts`: `id, html, height, breakBefore?, keepWithNext?`), `paginate.ts` (`PAGE_FILL_FACTOR` 0.92, header/footer/banner/watermark per page, `PDF_PAGE_BLOCK_HEIGHT` 840). Cover/summary pages need chrome variants (`pageStyle`) handled in `pageHtml`/`headerHtml`; draft banner and watermark still apply to the complete version.

### Sheet screens
**Source:** `finishSheetScreenOptions` + `FinishSheetRoute` + `FinishSheet` + `finish-sheet.styles.ts`. Colours only via `useBrandTheme()`; `AppText`; haptics only through `ui/feedback.ts`; no em dash; 400-line cap on `src/screens` and `src/navigation` (`__checks__/structure.test.ts`); outline icons only (`__checks__/icons.test.ts`).

### Fixtures and test conventions
**Source:** `mobile/test/survey-export-fixtures.ts` (`SurveyExportData` literals: `exportFixtureV32Submitted`, `exportFixtureV30Draft`, `exportFixtureWorstCase`; add `mode`). Section tests are co-located `*-section.test.ts`; palette tests mock `react-native` with `jest.mock("react-native", () => ({ useColorScheme: () => "dark" }))`. Navigation tests: mock the route like `navigation.test.tsx:142` (`jest.mock("./routes/FinishSheetRoute", ...)`) and assert options like line 875; route tests assert `navigation.navigate` calls like `routes.test.tsx:1218`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Print score ring helper (cover/summary) | builder | transform | No SVG ring in the PDF today; take geometry from `app/ibp-display.ts` (`scoreRatio`, `totalTone`) and the app's `ScoreRing` for look |
| Cover contour art | builder | transform | Reuse `app/contour-paths.ts` (`CONTOUR_PATHS`, `CONTOUR_VIEWBOX`) as static SVG; first print use |
| `estimateCompletePages` | utility | transform | New; pin against the three fixtures |

## Metadata

**Analog search scope:** `mobile/src/app/survey-pdf/`, `mobile/src/screens/finish-sheet/`, `mobile/src/navigation/{routes,stacks}`, `mobile/src/ui/`, `mobile/src/i18n/fr/`, `mobile/test/`
**Files scanned:** about 30 read in whole or part
**Pattern extraction date:** 2026-10-23
