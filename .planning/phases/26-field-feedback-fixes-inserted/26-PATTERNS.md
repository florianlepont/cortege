# Phase 26: Field-feedback fixes (INSERTED) - Pattern Map

**Mapped:** 2026-10-10
**Files analyzed:** 22 (12 new, 10 modified)
**Analogs found:** 22 / 22 (3 are partial matches)

Naming: "decision D-0x" = CONTEXT decision; "DC-D-0x" = device check of `docs/user-tests/device-checks.md`. Paths below are relative to `mobile/src/` unless prefixed.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `map/own-surveys.ts` (new; or extend `map/own-drafts.ts`) | utility (pure builder) | transform | `map/own-drafts.ts` | exact |
| `storage/surveys.ts` + `listLocalSurveyMapSources()` | storage reader | CRUD (read) | `listLocalSurveys` (`storage/surveys.ts:485-521`) | role-match |
| `storage/surveys.map-sources.sqlite.test.ts` (new) | test | CRUD | `storage/surveys.completion.sqlite.test.ts` | exact |
| `hooks/useOwnSurveyMapItems.ts` (new) | hook | request-response (local async) | `screens/survey-detail/useLocalDraftSummary.ts` | role-match |
| `navigation/routes/PublicMapRoute.tsx` (mod) | route | event-driven merge | itself (`:52-65`) | exact |
| `screens/PublicMapScreen.tsx` (mod, `draftIdSet` / `mapItems`) | component | transform | itself (`:120-125`) | exact |
| `hooks/usePublicMapExplorer.ts` (mod, optional offline early return) | hook | request-response | itself | exact |
| `ui/CenteredState.tsx` (new) | component | none | duplicated block in `CommunitySurveyScreen.tsx:111-127` | exact |
| `screens/community-survey/CommunitySurveyScreen.tsx`, `CommunityHistoryScreen.tsx` (mod) | component | request-response | each other | exact |
| `navigation/routes/CommunitySurveyRoute.tsx`, `CommunityHistoryRoute.tsx` (mod) | route | request-response | `PublicMapRoute.tsx` (`useIsOffline` use) | role-match |
| `i18n/fr/community-survey.ts` (mod) | config (catalogue) | n/a | same file | exact |
| `i18n/fr/abbreviations.ts` (new) + `fr/index.ts` + `i18n/catalogue.test.ts` | config (catalogue) | n/a | other `i18n/fr/*.ts` modules | role-match |
| `ui/AbbreviationInfo.tsx` (new) | component | event-driven | `screens/home/GenusTargetSheet.tsx` (Modal) + `screens/FactorHelpSheet.tsx` | role-match |
| `__checks__/abbreviations.test.ts` (new) | test (source gate) | batch/transform | `__checks__/catalogue-dash.test.ts` | exact |
| `app/genus-order.ts` (+ `.test.ts`) (new) | utility | transform | `app/search-text.ts` (`foldSearchText`) | partial |
| `ui/FactorGenusListInput.tsx` (mod) | component | transform | itself (`:57-66`) | exact |
| `app/survey-pdf/factor-fields.ts` (mod, sort at print) | utility | transform | itself (`:105-175`) | exact |
| `ui/GenusRecognitionModal.tsx` (mod, D-07 test + cleanup) | component | request-response | itself (`:83-91`) | exact |
| `recognition/temp-files.ts` (new) | utility | file-I/O | `storage/attachment-files.ts:76-85` | exact |
| `recognition/genusClassifierModel.ts` (mod: delete resized file, timings) | service | file-I/O | itself (`:92-111`) | exact |
| `screens/parcel-selection/layout-budget.ts` (+ test) (new) | utility | transform | `screens/home/layout-budget.ts` (+ test) | exact |
| `screens/parcel-selection/ParcelSelectionCard.tsx` (new, extracted) + `screens/SurveyParcelSelectionScreen.tsx` (mod) | component | request-response | `SurveyParcelSelectionScreen.tsx:293-323` | exact |

## Pattern Assignments

### `map/own-surveys.ts` (utility, transform) - decision D-01, D-09
**Analog:** `map/own-drafts.ts` (the whole file, lines 1-30).

Output type and field mapping to copy (`own-drafts.ts:19-27`):
```ts
items.push({
  survey_id: detail.id,
  display_location: { lat: lat as number, lng: lng as number },
  survey_date: (detail.created_at ?? "").slice(0, 10),
  region_code: detail.region_version ?? "",
  ibp_total: total as number,
  ibp_method_version: detail.ibp_method_version ?? null,
  ibp_cas: detail.ibp_cas ?? null,
})
```
Keep the skip rule (`!Number.isFinite(lat|lng|total)` then `continue`) and the `publishedIds.has(id)` dedup (`:14`). Replace the input: `surveyDetails` (API-fed memory) is NOT the source (research flag F-A); take local rows + a parcel lookup. Split output into drafts (status `draft`, dashed marker) and own non-draft (normal marker); treat every status other than `"draft"` as submitted-like.

**Score** (copy from `screens/survey-detail/useLocalDraftSummary.ts:76-100`): for submitted-and-pulled rows prefer `payload.scores.ibp_total`; otherwise
```ts
const context = {
  ibp_method_version: draft.ibp_method_version, ibp_cas: draft.ibp_cas,
  ibp_cas3_scale: draft.ibp_cas3_scale, region_version: draft.region_version,
  vegetation_stage: draft.vegetation_stage,
}
const retained = computeRetainedScoresFromRawFactors(factorsObject, context)
const totals = computeIbpTotalsFromRetainedScores(retained) // ibp_total
```
(imports from `../app/ibp-scoring`; never re-implement a rule).

**Position** (decision D-09, copy from `app/survey-pdf/assemble-export-data.ts:246-264`): `parcelPolygonsFrom(items, parcelIds)` then `boundsOfRings(polygons.flatMap(({ rings }) => rings))`, centre = `{ lat: (south+north)/2, lng: (west+east)/2 }` (`centreOf`, `assemble-export-data.ts:246-252`). Both helpers are exported from `app/survey-pdf/map-projection.ts` (`boundsOfRings :72`, `parcelPolygonsFrom :160`, which takes `PublicParcelStatusItem[]` and parcel ids). Survey with no cached parcel gets no item. `src/map` is under the global 100% coverage floor: test every branch.

**Test analog:** `map/own-drafts.test.ts` (fixture-factory `detail(overrides)` + `describe`). Extend with: no position, no score, published id, draft vs submitted grouping, pulled-total preference.

---

### `storage/surveys.ts` + `listLocalSurveyMapSources()` (storage, read)
**Analog:** `listLocalSurveys` (`storage/surveys.ts:485-521`): `const db = await getDb()` then `db.getAllAsync<T>(sql)`. The list reader deliberately never parses payloads; the new reader selects `id, status, created_at, updated_at, payload_json` and parses in JS once. Use `safeParseJson` style from `storage/offline-map.ts:189-206` (skip a row whose JSON is invalid):
```ts
const rows = await db.getAllAsync<{ payload_json: string }>(`SELECT ... FROM local_surveys`)
for (const row of rows) { const parsed = safeParseJson(row.payload_json); if (parsed !== null) ... }
```
No schema change (`SCHEMA_VERSION` stays 5, no `local_meta` key). Parcel lookup: `getCachedParcelById<T>(parcelId)` (`storage/offline-map.ts:208-217`) or `getCachedParcelsForBounds` (`:189`); reuse, do not add SQL against `offline_area_parcels` unless needed.

**Test analog:** `storage/surveys.completion.sqlite.test.ts` (real SQLite through `mobile/test/node-sqlite-db.ts`; imports `initLocalDb, getDb` from `./db`, `createLocalDraft`, `updateLocalDraft`, `pullRemoteChanges`; `changesResponse(...)` helper at `:28-41` builds a pull response). Needed because the reader depends on real SQL.

---

### `hooks/useOwnSurveyMapItems.ts` (hook, local async)
**Analog:** `screens/survey-detail/useLocalDraftSummary.ts` (async `run` inside `useEffect` with a `cancelled` flag, `EMPTY_SUMMARY` default):
```ts
useEffect(() => {
  let cancelled = false
  const run = async (): Promise<void> => { ... if (!cancelled) setSummary(...) }
  void run()
  return () => { cancelled = true }
}, [survey.id])
```
Re-run when `surveys.surveys` identity changes (from `useSurveys()`), not every render. Called ONLY from `PublicMapRoute`, never inside `useSurveySync` (single-assembler rule).

---

### `navigation/routes/PublicMapRoute.tsx` (route, merge)
**Analog:** itself, `:52-65`:
```ts
const draftItems = useMemo(
  () => ownDraftMapItems(surveys.surveyDetails, new Set(explorer.items.map((i) => i.survey_id))),
  [surveys.surveyDetails, explorer.items],
)
const handleOpenSurvey = useLatestCallback((surveyId: string) => {
  if (draftItems.some((item) => item.survey_id === surveyId)) {
    surveyActions.openSurvey(surveyId)
    navigation.navigate("surveys", { screen: "surveyDetail" })
    return
  }
  navigation.navigate("communitySurvey", { surveyId })
})
```
Change: two prop groups (`draftItems`, `ownItems`); the `some(...)` test must cover both groups. Existing `isOffline` is already in scope (`:41`). Pass `isOffline` into `usePublicMapExplorer` already done (`:45-50`); the optional hygiene is the early return inside the hook. Route tests: `navigation/routes/routes.test.tsx` PublicMapRoute block (`:1776-1880`).
`PublicMapScreen.tsx:120-125` builds `draftIdSet` and `mapItems = [...items, ...draftItems]`: add `ownItems` to `mapItems` only (no dashed styling).

---

### `ui/CenteredState.tsx` (component) - decision D-03
**Analog (to extract):** `screens/community-survey/CommunitySurveyScreen.tsx:111-127` (duplicated verbatim in `CommunityHistoryScreen.tsx:66-82`):
```tsx
if (status === "loading" || !detail) {
  return (
    <View style={[scrollStyle, own.centered]}>
      {status === "error" ? (
        <>
          <Text style={own.message}>{t.error}</Text>
          <AppButton label={t.retry} variant="secondary" onPress={state.reload} />
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={theme.colors.forest} />
          <Text style={own.message}>{t.loading}</Text>
        </>
      )}
    </View>
  )
}
```
Fix per research: render a `ScrollView` with `contentInsetAdjustmentBehavior={useFrameInsetBehavior()}` (import `useFrameInsetBehavior` from `../../ui/frame-large-title`, already used at `CommunitySurveyScreen.tsx:13,54,143`) and `contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding, gap }}`. Spacing from `brandSpacing4`; colours via `useBrandTheme()`; icons `cloud-offline-outline` / `alert-circle-outline` (outline only, `icons.test.ts`). Keep `AppButton` (tests find it by type: `CommunitySurveyScreen.test.tsx:136-146`, `CommunityHistoryScreen.test.tsx:139-146`). A11y live region precedent: `SearchGroupNotice.tsx:88`. `AppNotice` (`ui/AppNotice.tsx`) is an inline banner and does not fit. Offline copy chosen with `useIsOffline()` (`hooks/useIsOffline.ts:11`) at the route, never by error class. First plan task: reproduce on the iOS simulator (cause not reproduced, MEDIUM). Both screens are under the 400-line cap: extraction shrinks them.

Catalogue: add `offline` (and retry a11y) to `i18n/fr/community-survey.ts` next to `error`/`retry`/`loading`; no em dash.

---

### `ui/AbbreviationInfo.tsx` (component, event-driven) - decision D-04
**Analog:** `screens/home/GenusTargetSheet.tsx:41-61`:
```tsx
<Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
  <View style={styles.sheet}>
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">...</Text>
      <AppPressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t.close} hitSlop={10}>
```
Styles `createStyles(theme)` at `:96-110` (`sheet`, `header`, `title`, `close`, `content`, with `theme.colors.canvas`, `theme.semanticColors.textStrong/accent`, `brandTypography.sectionTitle/button`). Trigger: `AppPressable` with `information-circle-outline` (precedent `ScoreLegend.tsx:100`), 44 pt target via `hitSlopFor` (see `AppButton.tsx`) / `brandInteraction.hitTarget.min`. `animationType` `"none"` when `useReducedMotion()`. testID `abbreviation-info-<KEY>` (needed by the gate's "info" branch). Haptics only through `ui/feedback.ts`; no RN `Animated`.

---

### `i18n/fr/abbreviations.ts` (catalogue registry) - decisions D-04, D-05, D-11
**Analog:** any `i18n/fr/*.ts` module (e.g. `community-survey.ts`: `export const communitySurveyFr = {...} as const`), registered in `i18n/fr/index.ts`; add the key to the exact-key assertion in `i18n/catalogue.test.ts:78-` ("exposes every section"). Entries static strings: `{ long, explanation, treatment }` with treatment in `allowlist | proper-name | legal | dev-only | technical | written-out | info`. Allowlist per decision D-11: units (`ha cm m km % Mo Ko`), `OK`, `PDF`, `GPS`, `ex.`; `IBP` is `info` (defined once in onboarding, sign-in, PDF). Rewrite the leaked identifiers (`bmg_count`, `surface_ha`...) and "JSON" and `S0..S5` per the research inventory, and map `ClusterListSheet.tsx:19-24` raw `region_code` through `fr.labels.regions` (flag F-H). Run this package last: it edits catalogue files the other packages also touch.

---

### `__checks__/abbreviations.test.ts` (source gate) - decision D-05
**Analog:** `__checks__/catalogue-dash.test.ts` (copy the structure whole):
- `leaves(source)` AST walker skipping JSDoc (`:25-37`); `ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)` (`:43`).
- `SRC_ROOT/CHECKS_DIR/CATALOGUE_ROOT`, `sourceFiles(dir)` excluding `__checks__` and `*.test.ts(x)` (`:57-68`).
- `writeFixture` + `beforeEach`/`afterEach` temp dir (`:70-85`).
- Two blocks: `describe("findUnexplainedAbbreviations")` with fixture cases (flagged token, registered token, shouted eyebrow, comment ignored, allowlisted unit, written-out form) and `describe("... gate on mobile/src")` with sanity assertions `files.length > 30` and the real scan of `i18n/fr` (`:138-144`).
Candidate regex and pass rules: research "Operational gate (D-05)". Also fail on a registry key never used, and on snake_case identifiers in user strings.

---

### `app/genus-order.ts` (utility, transform) - decision D-06
**Analog:** `app/search-text.ts` (`foldSearchText`, `:41`; runtime-decompose guard `:38-39`). Helper (from research) folds first, `Intl.Collator("fr", { sensitivity: "base" })` second, plain comparison last; `sortGenusCodes` returns a copy. Never reorder `CNPF_FACTOR_A_GENUS_CODES`, the manifest labels or stored `factors.A.genera`. Tests: 34 codes strictly ascending, `Quercus_deciduae` before `Quercus_sempervirens`, `Ceratonia` between `Celtis` and `Cercis`, input not mutated. `src/app/` floor is 95% lines.

### `ui/FactorGenusListInput.tsx` (mod) - decisions D-06, D-10
Current (`:57-66`):
```tsx
{CNPF_FACTOR_A_GENUS_CODES.map((genus) => (
  <AppChoiceChip key={genus} label={fr.genus.displayName[genus]} active={selected.has(genus)} onPress={() => toggle(genus)} />
))}
```
Change to `sortGenusCodes(CNPF_FACTOR_A_GENUS_CODES).map(...)` and label = Latin name (`genus.replace(/_/g, " ")`, same transform as `factor-fields.ts:108-110`) per decision D-10. Catalogue text for any label wrapper goes in `fr.genus`.

### `app/survey-pdf/factor-fields.ts` (mod)
Sort the selected genera with `sortGenusCodes` at print time (`:105-175`, `genusName` prints "Sapin (Abies)"); selection order is unchanged in the payload.

### `ui/GenusRecognitionModal.tsx` (mod) - decision D-07, SC-7
Current `handlePhoto` (`:83-91`):
```ts
const handlePhoto = async (uri: string): Promise<void> => {
  setStep({ kind: "classifying" })
  const outcome = await classifyGenusPhoto(uri)
  if (outcome.status === "ok") setStep({ kind: "results", suggestions: outcome.suggestions })
  else setStep({ kind: "unavailable", message: t.unavailableMessage })
}
```
Wrap the classify call in `try { ... } finally { await deleteTempPhoto(uri) }` and add a "still current" token against stale `setStep` after close. D-07: do NOT sort suggestions (`rankGenusSuggestions`, `genusClassifierModel.ts:129-135`, is confidence order); add a test pinning the rendered order. Correct the wrong comments ("never saved", `GenusCameraView.tsx:24`, modal doc).

### `recognition/temp-files.ts` (utility, file-I/O) - SC-7
**Analog:** `storage/attachment-files.ts:76-85`:
```ts
export async function deleteAttachmentFile(uri: string): Promise<void> {
  if (!uri) return
  const resolved = resolveAttachmentUri(uri)
  if (!isInAttachmentsDir(resolved)) return
  await FileSystem.deleteAsync(resolved, { idempotent: true })
}
```
Use `import * as FileSystem from "expo-file-system/legacy"`. `deleteTempPhoto(uri)`: no-op unless `uri.startsWith(FileSystem.cacheDirectory)` and no `..`; swallow errors; never log the URI. Delete ONLY the two exact URIs (camera capture, resized JPEG); never sweep `cache/` (it holds the PR #272 model copy). Test with the mock `mobile/test/expo-file-system-legacy.mock.ts` (`__listMockFiles()` empty after success and failure).

### `recognition/genusClassifierModel.ts` (mod)
`preprocessPhoto` (`:92-111`): after `FileSystem.readAsStringAsync(saved.uri, ...)` delete `saved.uri` in a `finally`. Do not touch `loadModel` or the reset helper. Run `genusClassifierModel.test.ts` after. Timings: return `{ loadMs, preprocessMs, inferenceMs, totalMs }` with an injectable clock; optional build flag in the style of `feature-flags.ts`.

---

### `screens/parcel-selection/layout-budget.ts` (+ `.test.ts`) (utility) - decision D-08
**Analog:** `screens/home/layout-budget.ts`: tokens imported from `../../app/brand-tokens` (`brandComponentTokens, brandInteraction, brandSpacing4, brandTypeScale, brandTypography`, `:1-8`); constants with doc comments (`HOME_GAPS :19`); `BUDGET_DEVICES` list (`:108-111`: `{ name, width, height, safeTop }`); pure functions summing the same numbers the styles use (`resumeCardHeight :131-139`). Test analog `layout-budget.test.ts:1-50`: 4-grid assertions, `brandInteraction.hitTarget.min` floor, per-device assertions. Export `isCompactParcelCard(height, fontScale)` (compact when `height / max(1, fontScale) < 700`), `parcelCardHeight(compact, hasSelection)`, `PARCEL_BUDGET_DEVICES` (375x667, 360x640, 393x852); assert compact card + inset under 50% of height. Also read `fontScale` caps via `brandFontScaleCaps`.

### `screens/parcel-selection/ParcelSelectionCard.tsx` (extract) + `SurveyParcelSelectionScreen.tsx` (mod)
The screen is 392/400 lines (`structure.test.ts` cap): extract the card (JSX `:293-323` and styles `bottomTitle/bottomMeta/bottomHint/doneButton` from `createScreenStyles`, `:340-392`) into the new file, then add compact behaviour there. Current card:
```tsx
<AppCard glass surface={theme.visual.mapPanel} style={screenStyles.bottomSheet}>
  <Text style={screenStyles.bottomTitle}>{hasParcelSelection ? parcelSelectionLabel : t.noSelection}</Text>
  <Text style={screenStyles.bottomMeta}>{parcelHelperText}</Text>
  {!hasParcelSelection ? <AppNotice tone="danger" icon="alert-circle-outline" message={t.selectionRequired} /> : null}
  <Text style={screenStyles.bottomHint}>{t.tapHint}</Text>
  <AppButton ... size="lg" style={screenStyles.doneButton} />
</AppCard>
```
Compact: drop separate notice and hint, merge requirement into the meta line (new `fr.parcelSelection.compact.*` strings, `i18n/fr/parcel-selection.ts`), `brandTypeScale.headline` title, `brandComponentTokens.card.compactPadding`, `numberOfLines`. Keep the `onLayout` cardHeight (`:127,327`) and `controlsBottom = cardBottomInset + cardHeight + 12` contract; never switch on measured `cardHeight` (feedback loop). Use `useWindowDimensions` in the screen; test with a mocked height (667 vs 852).

## Shared Patterns

### Catalogue-only text, no em dash, outline icons, theme colours
**Source:** `__checks__/catalogue-dash.test.ts`, `structure.test.ts`, `icons.test.ts`; colours via `useBrandTheme()` (`GenusTargetSheet.tsx:38`, `createStyles(theme)` at `:96`). **Apply to:** every new component and catalogue key.

### Frame-aware scroll inset
**Source:** `screens/community-survey/CommunitySurveyScreen.tsx:53-54,139-144` (`useFrameInsetBehavior()` on the first `ScrollView`). **Apply to:** `CenteredState`.

### Offline flag
**Source:** `hooks/useIsOffline.ts:11` (expo-network, `isOnlineNetworkState`). **Apply to:** community routes (D-03), explorer hygiene.

### Pure budget asserted by test
**Source:** `screens/home/layout-budget.ts` + `.test.ts`. **Apply to:** D-08 only.

### Guarded file delete
**Source:** `storage/attachment-files.ts:76-85`. **Apply to:** `recognition/temp-files.ts`.

### Real-SQLite test
**Source:** `storage/surveys.completion.sqlite.test.ts`. **Apply to:** `listLocalSurveyMapSources`.

### Coverage floors
`src/map` global 100%, `src/app` 95% lines (per research); co-locate `*.test.ts(x)`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| (none missing) | | | Partial matches only: `app/genus-order.ts` (no existing sort helper; only bare `localeCompare` at `survey-logic.ts:163`), `ui/AbbreviationInfo.tsx` (no existing info-icon + sheet pairing; Modal precedent only), `hooks/useOwnSurveyMapItems.ts` (no hook joining SQLite rows and cached parcel geometry) |

## Metadata

**Analog search scope:** `mobile/src/{map,storage,hooks,ui,screens,navigation/routes,recognition,app,i18n,__checks__}`
**Files scanned:** about 30 read in part, plus the CONTEXT and RESEARCH of phase 26
**Pattern extraction date:** 2026-10-10
