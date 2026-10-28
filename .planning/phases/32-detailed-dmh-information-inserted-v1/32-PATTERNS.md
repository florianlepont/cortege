# Phase 32: Detailed DMH Information - Pattern Map

**Mapped:** 2026-10-23 (drawings rows revised 2026-10-24: vector data replaces bundled images and the paper tile; revised 2026-10-26, D-11 amended: the drawings are static, so the motion helper and the path geometry module are gone)
**Files analyzed:** 21 (new and modified, from UI-SPEC "Implementation notes", CONTEXT and RESEARCH)
**Analogs found:** 21 / 21 (paths relative to `mobile/src/`, except `mobile/scripts/`; the generated drawings module has only a role analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `i18n/fr/dmh-guide.ts` (+ register in `i18n/fr/index.ts`) | catalogue | static | `i18n/fr/route-guide.ts` (`routeGuideFr`, index.ts line 26/77) | exact |
| `i18n/fr/factor-detail.ts` (+ `dmhList`) | catalogue | static | same file, `countingMode` block (`dmhTitle`, `dmhHelper`) | exact |
| `app/dmh-guide/structure.ts` (forms to groups, types) | utility | transform | `app/factor-selections.ts` (`selectionOptionsFor`) | role |
| `app/dmh-guide/order.ts` (`orderDmhRows`) | utility | transform (pure) | `app/parcel-history.ts` / `route-display.ts` (pure, tested) | role |
| `app/dmh-guide/search.ts` | utility | transform | `app/search-text.ts` (`foldSearchText`, `normalizeSearchQuery`) | exact |
| `mobile/scripts/build-dmh-drawings.mjs` (SVG sources to TS module, style check, elements copied as they are) | script | batch | `mobile/scripts/remove-white-bg.mjs` (ESM asset script) | role |
| `app/dmh-guide/drawings.ts` (generated element data, 15 entries) | config | static | `app/contour-paths.ts` (SVG path strings rendered by react-native-svg; computed, not generated: see No Analog) | role |
| `__checks__/dmh-drawings.test.ts` (drawings gate) | test | file-I/O | `__checks__/icons.test.ts` (fs read, line 177), `structure.test.ts` (fixtures) | role |
| `hooks/useSurveyForm.ts` (+ `bumpDmhGroup`) | hook | CRUD (form state) | same file `setDmhCount` lines 510-518 | exact |
| `screens/factor-detail/DmhGroupList.tsx`, `DmhGroupRow.tsx` | component | request-response | `screens/factor-detail/DmhCountFields.tsx` | role |
| `screens/factor-detail/DmhCountFields.tsx` (modified: rows removed) | component | CRUD | itself | exact |
| `screens/factor-detail/renderFactorField.tsx` (extract) | component | transform | `screens/FactorDetailScreen.tsx` lines 275-345 | exact |
| `ui/DmhCounterStepper.tsx` | component | event-driven | `ui/FactorCounterInput.tsx` (hold-repeat engine) | exact |
| `ui/DmhDrawing.tsx` | component | static render | `ui/ContourLines.tsx` (Svg of path data in theme colours, its static frame) and `ContourLines.test.tsx` | role |
| `screens/dmh-guide/*` (Screen, Catalogue, GroupPage, SourcesPage, styles) | component | request-response | `screens/FactorHelpSheet.tsx` + `screens/route-guide/RouteChooseScreen.tsx` | role |
| `navigation/routes/DmhGuideRoute.tsx` | route | request-response | `navigation/routes/FactorHelpRoute.tsx`, `RouteGuideRoute.tsx` | exact |
| `navigation/stacks/stack-options.ts` (+ `dmhGuideScreenOptions`) | config | static | `finishSheetScreenOptions` lines 188-196 | exact |
| `navigation/stacks/SurveysStack.tsx` | config | static | `surveyRouteChoose` registration lines 249-255 | exact |
| `navigation/types.ts` | config | static | `surveyRouteChoose` line 88, alias line 197 | exact |
| `visual-tokens.test.ts` (drawing ink on the glass card) | test | static | the "success and danger text on the glass card" pair (line 291) | exact |
| `FactorDetailRoute.tsx` (prop `onOpenDmhGuide`) | route | request-response | line 101 `navigation.navigate("surveyFactorHelp", ...)` | exact |

## Pattern Assignments

### `hooks/useSurveyForm.ts` (`bumpDmhGroup`)
**Analog:** `setDmhCount`, lines 510-518. The store call returns the derived density, and `writeTreesPerHa` writes it.
```typescript
const writeTreesPerHa = (derived: number | null): void => {
  if (derived !== null) setFactorF((prev) => ({ ...prev, trees_per_ha: String(derived) }))
}
const setDmhCount = (code: DmhGroupCode, count: number): void => {
  writeTreesPerHa(storeDmhCount(code, count))
}
```
`bumpDmhGroup(code, delta)` must update `dmh_groups` (option order, as in `onChange: (next) => setFactorF(prev => ({...prev, dmh_groups: next}))`, line ~659) and `dmh_counts` in one batch, then `writeTreesPerHa`. Export it next to `setDmhCount` (return object ~line 787). Tests: copy the `setDmhCount("dmh_01", 3)` style of `useSurveyForm.test.ts` lines 925-1062. Group codes look like `dmh_01`. Payload for any action sequence must equal the old chips plus counters sequence (write an equivalence test).

### `screens/factor-detail/DmhGroupList.tsx` / `DmhGroupRow.tsx`
**Analog:** `DmhCountFields.tsx`. Imports (lines 1-13) and styles via `createStyles(theme)` + `useMemo`:
```typescript
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { selectionOptionsFor } from "../../app/factor-selections"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"
const t = fr.factorDetail.countingMode
```
Reuse rows source (lines 67-74): `selectionOptionsFor("F", methodVersion, selectedGroups)` gives labels (never retype labels). Keep `DmhCountFields` for the surface block only: lines 97-105 (`AppField` surface + `useRouteSurfacePrefill` + `FromRouteCaption`) stay; the `rows.map` with `FactorCounterInput` (lines 80-96) and `countFromText` move out. Read-only idiom: `pointerEvents={editable ? "auto" : "none"}` (line 80), but the spec requires the info glyph to stay active, so disable per control instead. Memoise rows with `React.memo` on (code, ticked, count, editable, mode). Sections: `ui/AppCollapsibleSection` (props `title`, `badge`, `defaultExpanded`, children; `defaultExpanded` is only the initial state, which suits order-at-mount). Info glyph: copy `AbbreviationInfo.tsx` lines 41-49 and 66-75 (Ionicons `information-circle-outline`, `ABBREVIATION_INFO_ICON_SIZE`, hitSlop `(brandInteraction.hitTarget.min - size) / 2`, `AppPressable ... disableScale`), but call `onOpenDmhGuide(code)` instead of opening an `InfoSheet`.

### `screens/factor-detail/renderFactorField.tsx` (extraction, do first)
**Analog:** `FactorDetailScreen.tsx` lines 275-345 (`renderCompanion`, `renderFactorField`, uses `COMPANION_LABELS`, `CHIP_COUNT_LABEL`, `ignoreSelectionChange`, `humanizeFieldLabel`, `legacyCountOf`). The file is at the 400-line cap (`__checks__/structure.test.ts` gate), so move these functions verbatim, then add the F branch: when `companion === "F"` (the dmh_groups companion) render `DmhGroupList` instead of `renderCompanion`'s `FactorChipsInput`. Keep `withCompanion` shape:
```typescript
const withCompanion = (input: ReactElement): ReactElement | ReactElement[] =>
  "companion" in current && current.companion
    ? [input, renderCompanion(current.companion, field, methodVersion, key)]
    : input
```

### `ui/DmhCounterStepper.tsx`
**Analog:** `ui/FactorCounterInput.tsx` (press-and-hold engine: step, 120 ms repeat, acceleration, bounds, "Terminé" accessory label). Read it in full when planning; copy its repeat logic, change only size (`DMH_STEPPER_SIZE = 48`), add `accessibilityRole="adjustable"` with `onAccessibilityAction`. Glyph colour `theme.colors.forest`, as in the analog. Keep Reanimated only (no RN `Animated`; `__checks__/motion.test.ts`).

### `app/dmh-guide/search.ts`
**Analog:** `app/search-text.ts` exports `foldSearchText(text)` and `normalizeSearchQuery(text)` (lines 48, 61). Fold the query and `label + keywords` with the same function; no debounce.

### `app/dmh-guide/order.ts`
**Analog:** pure, tested modules `app/parcel-history.ts`, `app/route-display.ts` (colocated `*.test.ts`). Signature suggestion: `orderDmhRows({ forms, ticked, counts }) => { sections: { form; codes; defaultExpanded }[] }`. Called once in a `useMemo`/`useState` initialiser keyed on mount only (pager mounts the active page only), never on tick changes.

### `app/dmh-guide/structure.ts`
**Analog:** `app/factor-selections.ts` (typed `DmhGroupCode` option tables). Use `Record<DmhGroupCode, ...>` so a missing group is a compile error; form ids partition the 15 groups (table in UI-SPEC S1.2).

### `i18n/fr/dmh-guide.ts`
**Analog:** `i18n/fr/route-guide.ts` (`routeGuideFr`, exported and wired in `i18n/fr/index.ts` as `routeGuide: routeGuideFr`, imports at line 26). Add `import { dmhGuideFr } from "./dmh-guide"` and `dmhGuide: dmhGuideFr` to the `fr` object. Skeleton is in UI-SPEC "Catalogue skeleton". Gates (no edit to POLICY): `__checks__/catalogue-dash.test.ts`, `abbreviations.test.ts` (no DMH, WSL, CNPF, INRAE; units cm, cm2, ha OK), `icons.test.ts` (outline glyphs; confirm `book-outline` exists in the installed glyph map), `structure.test.ts` (all literals under `src/i18n`).

### `navigation/stacks/stack-options.ts` (`dmhGuideScreenOptions`)
**Analog:** `finishSheetScreenOptions`, lines 188-196 (sheet, no header, 0.65 and 1 detents, exactly what UI-SPEC S2 asks):
```typescript
export function finishSheetScreenOptions(theme: BrandTheme): NativeStackNavigationOptions {
  return {
    headerShown: false,
    presentation: Platform.OS === "ios" ? "formSheet" : "modal",
    sheetAllowedDetents: [0.65, 1],
    sheetGrabberVisible: true,
    contentStyle: { backgroundColor: theme.semanticColors.backgroundCanvas },
  }
}
```
Copy as `dmhGuideScreenOptions` (a named function keeps the doc comment and a test hook; do not reuse `finishSheetScreenOptions` because its comment is finish specific).

### `navigation/stacks/SurveysStack.tsx` and `navigation/types.ts`
**Analog:** lines 249-255 of the stack and `types.ts` 88-96 / 197.
```tsx
<SurveysStack.Screen name="surveyRouteChoose" options={routeChooseScreenOptions(theme)} component={RouteChooseRoute} />
```
types: add `surveyDmhGuide: { group?: DmhGroupCode }` in `SurveysStackParamList` and `export type DmhGuideRouteProps = StackRouteProps<SurveysStackParamList, "surveyDmhGuide">` next to line 197. Register only in this stack (D-05). Extend `navigation/routes/routes.test.tsx` and `navigation/navigation.test.tsx` (navigation folder holds 100% statement coverage).

### `navigation/routes/DmhGuideRoute.tsx`
**Analog:** `FactorHelpRoute.tsx` (memo route component, imports a screen, passes `onClose`) plus context read from `RouteGuideRoute.tsx` line 5-9 (`useSurveyFormState` from `../../state/survey-form-context`). Pattern:
```tsx
export const DmhGuideRoute = memo(function DmhGuideRoute({ navigation, route }: DmhGuideRouteProps) {
  const { state } = useSurveyFormState()   // only ibpMethodVersion
  ...
})
```
Validate `route.params?.group` against the known codes; fall back to the catalogue.

### `screens/dmh-guide/DmhGuideScreen.tsx` and siblings
**Analog:** `screens/FactorHelpSheet.tsx` lines 20-50: one `ScrollView` with `contentInsetAdjustmentBehavior="never"`, the header row as first scroll item (finding: header outside the scroll view is drawn under text in the iOS form sheet), close button `AppPressable` + `Ionicons name="close-outline"` with `accessibilityLabel`. Styles via `createDetailStyles(theme)` pattern (`screens/factor-detail.styles`), so make a `dmh-guide.styles.ts` with `createDmhGuideStyles(theme)`. Local view state `catalogue | group | sources`, files under 400 lines each (`structure.test.ts`). Notice blocks: `AppNotice tone="info"`; cards: `AppCard variant="glass"`; grouped catalogue: `AppGroupedList` / `AppSectionHeader`.

### `ui/DmhDrawing.tsx` (static drawing)
**Analog:** `ui/ContourLines.tsx` with `animated={false}`: an `Svg` with a `viewBox`, `Path` children stroked in a theme colour from `useBrandTheme()`, and its test `ContourLines.test.tsx` (react-test-renderer, the svg mock of `mobile/test/react-native-svg.mock.ts`, which also exports `Ellipse` and `Circle`). Differences for the drawing: nothing animated at all (D-11 amended 2026-10-26: no Reanimated, no motion hook, no Reduce Motion branch); one shape per data element (`Path`, `Ellipse` with the transform string `rotate(angle cx cy)` when rotated, `Circle`), stroke `colors.textPrimary`, data from `drawingFor(code)`; the wrapper `View` is the single accessible image. No tile, no new token: the existing glass card is the background; add the ink pair to `visual-tokens.test.ts` beside the success and danger pair (line 291).

### `mobile/scripts/build-dmh-drawings.mjs`
**Analog:** `mobile/scripts/remove-white-bg.mjs` (ESM, paths from `import.meta.url`). Plain JavaScript with no TypeScript import; it checks the approved style of the sources and copies path, ellipse and circle elements into the module as they are (react-native-svg 15.15.4 renders relative path commands, several subpaths per path and string `rotate(angle cx cy)` transforms itself, so nothing is normalised or measured). Run by hand, not by CI; the gate checks its output.

### `__checks__/dmh-drawings.test.ts`
**Analog:** `__checks__/icons.test.ts` (fs reads, line 177) and the fixture style of `structure.test.ts`. Rules: 15 group codes and no other key, widths inside `DMH_DRAWING_STROKE_RANGE` (4 to 12), every element renders (well-formed path data, positive radii), 12 KiB of data per drawing, 120 KiB module (`fs.statSync(file).size`), no colour in the module; plan 32-12 adds an alt sentence per drawing.

## Shared Patterns

- **Catalogue only for text:** `import { fr } from "../../i18n"`; `const t = fr.dmhGuide...`. No literals in screens (structure gate), no em dash, no abbreviations (DMH never written).
- **Theme:** `useBrandTheme()` + `useMemo(() => createStyles(theme), [theme])` + `StyleSheet.create`; spacing from `brandSpacing4`, type from `brandTypeScale`/`brandTypography`; no hex or `rgba(` outside token files.
- **Pressables:** `AppPressable` with `accessibilityRole`, `accessibilityLabel`, `disableScale` for small icon targets (AbbreviationInfo lines 66-75).
- **Motion:** Reanimated with `ReduceMotion.System` (see `AppCollapsibleSection` imports `FadeIn, LinearTransition, ReduceMotion`); haptics only via `ui/feedback.ts`.
- **Tests:** colocated `*.test.tsx`; Reanimated mock `setReducedMotion(true)` for reduced-motion paths.
- **Scope limits:** do not touch `app/survey-pdf/`, map screens, or the payload (`F.dmh_groups`, `F.dmh_counts`, SQLite stays at version 5).

## No Analog Found

| File | Role | Reason |
|---|---|---|
| `app/dmh-guide/drawings.ts` | config | No generated vector data module exists (`app/contour-paths.ts` holds path strings but computes them). Shape in UI-SPEC S5 (`DMH_DRAWINGS` keyed by `DmhGroupCode`, elements `{ kind: "path", d, width }`, `{ kind: "ellipse", cx, cy, rx, ry, width, rotate? }`, `{ kind: "circle", cx, cy, r, width }`); written by the converter, never by hand. Keys must avoid `label`, `title`, `description` (the literal gate of `scripts/structure-report.js` reads them as user text). |

## Metadata

**Analog search scope:** `mobile/src/{screens,ui,hooks,navigation,i18n,app,__checks__}`
**Files read:** UI-SPEC, DmhCountFields, FactorDetailScreen (275-345), useSurveyForm (505-524), stack-options (165-224), AbbreviationInfo, FactorHelpSheet (1-50), AppCollapsibleSection (1-40), route/types excerpts. CONTEXT and RESEARCH were not re-read (UI-SPEC embeds their decisions).
**Pattern extraction date:** 2026-10-23
