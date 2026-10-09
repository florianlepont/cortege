# Phase 24: Survey History Split - Research

**Researched:** 2026-10-09
**Domain:** React Native (Expo 57, RN 0.86.3) presentation split of one page into two, plus one additive API field. No new capability, no new dependency.
**Confidence:** HIGH (everything below was read in the code or run in this session; the few `[ASSUMED]` items are listed in the Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Placement (sketch 011, winner C, owner 2026-10-09)**
- **D-01:** The summary page's third row "Historique" becomes **"Historique de la parcelle"**, value showing the first-to-latest total (e.g. `21 → 34`; first survey of a parcel: no arrow, see D-09). It opens the parcel history page.
- **D-02:** The change log is **"Journal du relevé"**, reached only from a **"…" menu in the survey detail header**, not from the row list. It is the technical one of the two.
- **D-03:** The "…" menu is on the owner's own survey page only. A survey from another member (read-only, OA-115) has **no menu and never shows the change log**; it keeps the "Historique de la parcelle" row (phase criterion 2).
- **D-04:** The change log stays available to every owner of a survey (no hidden "detailed mode"). It is only one level deeper.
- **D-05:** The sketch menu also lists "Exporter en PDF" and "Supprimer le relevé" as illustration. Where export and delete live today is for research to check; the phase must not move them unless the menu is built anyway and they fit without regressions (planner decides, flag in the plan).

**Parcel history page (sketch 012, winner B+C)**
- **D-06:** Top: a score card with the trend as a title ("+13 points depuis 2023") and a small curve of the total per year (react-native-svg, already in the app).
- **D-07:** Then a card "depuis <previous year>" with the per-factor A to J deltas (barre + écart `+2`, `=`, `-1`), reusing `computeFactorDeltas` / `computeIbpTotalDelta` from `mobile/src/app/ibp-scoring.ts`.
- **D-08:** Then the list of surveys (year, version, total /50), newest first, current survey marked "ce relevé", each opening its survey.
- **D-09:** First survey of a parcel: no trend, no curve, no deltas; a one-line notice (as `HistorySection` does today).
- **D-10:** Parcels with surveys of different method versions (v3.0 and v3.2): the curve is cut between the two methods (dashed link) with a one-line notice that totals are not strictly comparable. Per-factor deltas only between surveys of the same method version.

**Journal page**
- **D-11:** "Journal du relevé" is the current `EventsTab` content on its own page, with its pull to refresh (OA-122 removed the reload button, keep that). Same event labels and icons.

**Wording and catalogue**
- **D-12:** Labels fixed by the owner: "Journal du relevé" and "Historique de la parcelle". All texts in the French catalogue, no em dash, `StatusMessage` rules unchanged.

**Navigation**
- **D-13:** Two destinations in the one survey stack: `surveyHistory` becomes the parcel history, plus a new route for the change log (name for the planner, e.g. `surveyJournal`). Both read the selected survey from the surveys context, like the other sub-pages. Tab-bar hiding rules and the 400-line cap on `src/screens` and `src/navigation` apply.

### Claude's Discretion
- Exact curve geometry, tones (use `totalTone` / `bandTone`), spacing and entrance motion, within the visual layer rules (`useBrandTheme`, `brandMotion`, `useListEntrance`).
- Whether the "…" menu is a native iOS menu on the header (preferred, native first) or a JS fallback elsewhere.
- Test split and naming.

### Deferred Ideas (OUT OF SCOPE)
- None raised. (Global search is Phase 25; per-year seasonal "Ma saison" view stays with Epic F.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-C-history-split | The survey change log and the history of earlier surveys on the same parcel are two distinct entries, and another member's survey shows the parcel history only. | R1 (method field for D-10), R2 (routes), R3 (menu entry, D-02/D-05), R4 (pure model for D-01/D-06/D-07/D-09/D-10), R5 (catalogue), R6 (curve), R7 (multiline row), R8 (tests). Community side: R2.4 and R4.6 (criterion 2). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Directives that bind this phase (treated like locked decisions):

- French catalogue only: every user-facing string lives in `mobile/src/i18n/fr/`; `react/jsx-no-literals`, the `no-restricted-syntax` rules on `title|label|accessibilityLabel|...` JSX props (also template literals) and `src/__checks__/structure.test.ts` fail on literals.
- No em dash U+2014 anywhere under `mobile/src` (`__checks__/catalogue-dash.test.ts`). U+2192 (the arrow) is not blocked.
- Colours only through `useBrandTheme()`; hex and `rgba(` literals allowed only in `brand-tokens.ts`, `theme.ts`, `visual-tokens.ts`, `theme-visual.ts`, `forest-aurora-tokens.ts` (ESLint, every `.ts`/`.tsx` under `mobile/src`).
- Icons: Ionicons outline glyphs only (`__checks__/icons.test.ts`). SF Symbols only inside the native iOS header menu (precedent: `pencil`, `trash`, `ellipsis`).
- Motion: `brandMotion` + `ReduceMotion.System` on every `withTiming/withSpring/withDelay` (or a `useReducedMotion()` branch in the file), endless loops gated by `useScreenVisible()`, at most two animated hero layers per screen, RN `Animated` only in allowlisted files, haptics only via `ui/feedback.ts` (`__checks__/motion.test.ts`).
- `src/screens` and `src/navigation` files: 400-line cap (`structure.test.ts`, test files excluded); no unused `StyleSheet` keys (same gate).
- No `borderWidth` on a gradient view, no `borderCurve` (`__checks__/layers.test.ts`).
- Shared IBP rules live only in `@cortege/ibp-domain`; mobile and api use thin adapters. Never re-implement a rule, allowed set or factor-key list.
- Never call `useSurveySync` elsewhere; read state through the context hooks. Routes are memoised components in `navigation/routes/` that read only the contexts their screen shows.
- Before committing: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run format:check`.
- Prettier: double quotes, no semicolons, trailing commas, 100 columns.
- Memory: prod is test data (no two-step migrations, no care for installed old clients); the owner merges fast and confirms on the phone.

## Summary

The phase is a pure presentation split plus ONE additive nullable field (`ibp_method_version`) on two history payloads. Every data source already exists: `surveyEvents`/`loadSurveyEvents` in the surveys context (journal), `GET /parcels/:id/surveys/history` (own parcel history), and `detail.history[]` of `GET /public/community-surveys/:id` (other member). No migration is needed: `surveys.ibp_method_version` has existed since migration 016 (NULL = v3.0), and both history queries already `FROM surveys s`, so the change is one extra selected column per query, one extra mapped property, two type edits, two doc edits and a handful of test assertions.

On the mobile side the work is: 2 new routes in `SurveysStack` (`surveyJournal`, plus the rewritten `surveyHistory`) and 1 new route in both `SurveysStack` and `PublicMapStack` (`communityHistory`); one new "Journal du relevé" entry in the existing "…" header menu (iOS native menu items and the `AppActionSheet` fallback), a rewritten summary row, a new parcel-history page (forest trend card with an SVG curve, per-factor delta card, survey list) built on a presentational `ParcelHistoryView` shared with the community page, and a community page whose inline history list becomes a one-row entry. All business arithmetic (trailing same-method run, trend title, row value, delta against the survey just before the current one, latest 8 points, Y-domain) is pure and should live in two new modules under `mobile/src/app/` (`parcel-history.ts`, `trend-geometry.ts`) that import `resolveMethodVersion` from the package and `computeFactorDeltas`/`computeIbpTotalDelta` from `ibp-scoring.ts`; no IBP rule is re-implemented.

Several UI-SPEC statements need refinement against the code (see "UI-SPEC corrections and refinements"): the status chip is `AppChoiceChip variant="status"` (there is no `AppStatusChip` component); the catalogue test forces every catalogue function to return a plain string (the UI-SPEC `trend.title` strong/accent object return would fail `catalogue.test.ts`); `AppGroupedList` shows a chevron whenever `onPress` is set even if `disabled`; the summary row goes stale after "Terminer" unless the history hook gets a refresh key; `DebugTab` does not use `EventsTab`; `forest.sage` is already contrast-tested at 4.5; the navigation directory carries a 100% coverage floor in CI so every new route needs a `routes.test.tsx` case; and touching `packages/**` triggers the macOS native CI jobs.

**Primary recommendation:** Do the API/contract field first (smallest, unblocks D-10), then build `app/parcel-history.ts` + `app/trend-geometry.ts` with exhaustive unit tests, then split the pages (journal first, because it is a copy of today's screen), then the new history components, then the community entry; keep the clip-rect curve reveal behind a quick simulator spike with the documented `strokeDashoffset` fallback.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Method version on history items | API / Backend (SQL SELECT + mapping) | Shared contract package (type) | Column exists on `surveys`; both queries already read `surveys s`. Type lives in `@cortege/ibp-domain` contract |
| Trend, deltas, row value, run splitting, Y-domain | Browser / Client (pure TS in `mobile/src/app/`) | — | Display arithmetic on scores the package already computed; offline-first app, no server round trip |
| Method comparison (same/different, unsupported tag) | Shared package (`resolveMethodVersion`, `isSameMethodVersion`) | Mobile adapter | Rule lives once in the package (CLAUDE.md) |
| Change log (events) | Client state (surveys context `surveyEvents`) | API `GET /surveys/:id/events` via existing `loadSurveyEvents` | Unchanged; own surveys only |
| Parcel history data | API `GET /parcels/:id/surveys/history` | Mobile hook `useParcelSurveyHistory` | Unchanged endpoint, +1 field |
| Community history data | API `GET /public/community-surveys/:id` `history[]` | `useCommunitySurvey` | Already carried by the page's own payload |
| Curve drawing and reveal | Client (react-native-svg + Reanimated 4) | — | No native equivalent; app already uses both |
| Header "…" menu | Native iOS header items (`unstable_headerRightItems`) | JS `AppActionSheet` on Android/Expo Go | Native first (CONTEXT discretion), existing pattern |
| Tab-bar visibility | `navigation/tab-bar.ts` (`shouldHideTabBar`) | — | Rule is "never hide" (OA-28); nothing to add |

## Standard Stack

### Core (all already installed, no new dependency)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-svg | 15.15.4 [VERIFIED: mobile/package.json] | Curve, points, labels | Already used by `ScoreRing`, `GradientNumeral`, `ContourLines` |
| react-native-reanimated | 4.5.1 [VERIFIED: mobile/package.json] | Curve reveal, entrances | Existing motion system (`useFocusEntrance`, `ScoreRing`) |
| @react-navigation/native-stack | ^7.19.2 [VERIFIED: mobile/package.json] | New routes, `unstable_headerRightItems` menu | Existing stacks |
| @cortege/ibp-domain | workspace | `resolveMethodVersion`, `isSameMethodVersion`, `FACTOR_KEYS`, wire types | Single home of IBP rules |
| Jest 29 + ts-jest, react-test-renderer, `@testing-library/react-native/pure` | repo | Unit tests | Existing infra (see Validation Architecture) |

### Supporting (existing project primitives to reuse, verified in code)

`ForestCard variant="hero" motion={false}`, `AppCard variant="glass"`, `AppGroupedList`, `SurveyRowFrame` (+ `ScoreRing`), `AppChoiceChip variant="status"` (this is the real name of the "AppStatusChip"; `AppStatusChipTone` is its exported tone type), `AppNotice` (supports `action`, `icon`, `tone`), `AppSectionHeader`, `PageTitle`, `ScreenFrame`, `EntranceView`, `ListEntranceRow` + `useListEntrance`, `Skeleton`/`SkeletonRow`, `AppActionSheet`, `EventsTab`, `useSubPageContentStyle`, `createSummaryScreenStyles().subContent`, `useFrameInsetBehavior`/`useFrameLargeTitle`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-built SVG path | A chart library (victory-native, react-native-gifted-charts) | Would add a runtime dependency (UI-SPEC: zero new deps) for a 128 pt, 8-point polyline. Rejected |
| `useCommunitySurvey` unchanged for `communityHistory` | Passing `history` through route params | Params must stay small and serialisable; fetching by id matches the existing community pattern (OA-115). Use the hook with a `withPhotos` switch (R2.4) |

**Installation:** none. `npm view` was not needed: no package is added, removed or upgraded.

## Package Legitimacy Audit

No external package is installed by this phase. The only libraries involved (`react-native-svg`, `react-native-reanimated`, React Navigation, the workspace `@cortege/ibp-domain`) are already in `mobile/package.json`.

**Packages removed due to [SLOP] verdict:** none (nothing evaluated)
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Owner survey summary (SurveyDetailScreen, own survey, draft or finished)
  |  useSurveyDetailData -> parcelIds[0]
  |  useHistoryRow(apiUrl, token, parcelId, surveyId, status)   <- NEW hook
  |      useIsOffline + useParcelSurveyHistory(+ refreshKey)
  |      -> app/parcel-history.historyRowState(...)  (pure)
  |
  +-- row "Historique de la parcelle"  [value "21 -> 34" | "Premier relevé" | "n relevés" | "Indisponible" | "Aucune parcelle"]
  |        navigate("surveyHistory")
  |            v
  |     SurveyHistoryRoute -> SurveyHistoryScreen  (reads selectedSurvey + parcelIds from surveys context)
  |        useParcelSurveyHistory(...) --GET /parcels/:id/surveys/history--> API (+ ibp_method_version)
  |        app/parcel-history.buildParcelHistory(items, currentId) -> { trend, deltaCard, list }
  |        ParcelHistoryView:  TrendCard(TrendCurve <- app/trend-geometry) / FactorDeltasCard / HistoryList
  |                              row press -> push("communitySurvey", {surveyId})
  |
  +-- header "..." menu (iOS native items | Android AppActionSheet)
           [Renommer (iOS large title, editable)] [Journal du relevé] [Supprimer]
                 navigate("surveyJournal")
                     v
              SurveyJournalRoute -> SurveyJournalScreen
                 EventsTab(hideHeader) + RefreshControl -> onLoadSurveyEvents (surveys context)

Other member's survey (CommunitySurveyScreen, detail loaded by id)
  |  no header items, no menu, no journal route reachable
  +-- row "Historique de la parcelle" (only if detail.history.length > 1; value from detail.history)
           push("communityHistory", {surveyId})
               v
        CommunityHistoryRoute -> useCommunitySurvey(withPhotos=false) -> ParcelHistoryView (trend + list, no delta card)
              row press -> push("communitySurvey", {surveyId})
```

### Recommended Project Structure

```
mobile/src/
├── app/
│   ├── parcel-history.ts          # NEW pure: methodKeys, trailingRun, trendSummary, historyRowState,
│   │                              #   deltaCardState, buildHistoryEntries (own + community), list status
│   ├── parcel-history.test.ts     # NEW
│   ├── trend-geometry.ts          # NEW pure: drawn window, Y domain, points, run paths, dashed links, pathLength
│   └── trend-geometry.test.ts     # NEW
├── hooks/useParcelSurveyHistory.ts  # + reload(), + refreshKey
├── hooks/useCommunitySurvey.ts      # + withPhotos option (default true)
├── i18n/fr/{navigation,survey-detail,parcel-history,community-survey}.ts   # catalogue edits
├── navigation/
│   ├── types.ts                   # + surveyJournal, communityHistory, route prop types
│   ├── stacks/SurveysStack.tsx    # + surveyJournal, communityHistory screens
│   ├── stacks/PublicMapStack.tsx  # + communityHistory
│   └── routes/{SurveyJournalRoute,CommunityHistoryRoute}.tsx, SurveyHistoryRoute.tsx (rewritten)
├── screens/
│   ├── SurveyJournalScreen.tsx    # NEW (today's SurveyHistoryScreen minus HistorySection)
│   ├── SurveyHistoryScreen.tsx    # rewritten: parcel history page shell
│   ├── survey-detail/{ParcelHistoryView,TrendCard,TrendCurve,FactorDeltasCard,HistoryList,useHistoryRow}.tsx|ts   # NEW
│   ├── survey-detail/{HistorySection.tsx,HistorySection.test.tsx}   # DELETE
│   └── community-survey/CommunitySurveyScreen.tsx   # inline list -> one row
└── ui/AppGroupedList.tsx          # + multiline
```

The UI-SPEC inventory names `survey-detail/history-row.ts` and `parcel-history-model.ts`. This research recommends folding both into `app/parcel-history.ts`: it keeps the logic out of the 400-line-capped directories, sits next to `ibp-scoring.ts` (the "arithmetic only" adapter whose `computeFactorDeltas`/`computeIbpTotalDelta` it calls), and counts towards the `src/app` coverage floor. The planner may keep the UI-SPEC file names; the content is identical.

### Pattern 1: Additive nullable wire field (R1)
**What:** add `ibp_method_version` to the two SELECTs and map it through; type it optional on the wire (`?: string | null`) so old fixtures and older servers stay valid; mobile treats `undefined` (field absent) as "unknown, inherit the neighbour" and `null` as v3.0.
**When:** now; a one-line SQL change per query.

### Pattern 2: Page = memoised route + screen that takes props
Follow `SurveyContextRoute` / `SurveyHistoryRoute`: the route reads `useSession`, `useAccessToken`, `useSurveys` and renders `<ScreenFrame largeTitle={usesNativeLargeTitle()}><Screen .../></ScreenFrame>`; the screen calls `useSurveyDetailData` / `useSubPageContentStyle` / `useFrameInsetBehavior`. The journal route is the old history route verbatim.

### Pattern 3: Pure model + presentational view
`buildParcelHistory(entries, currentId)` returns plain data (trend summary, delta-card state, list rows with status data); `ParcelHistoryView` only renders it, so the own page (with factor results) and the community page (totals only) share one view and one tested model.

### Anti-Patterns to Avoid
- **Re-deriving "method" from `ibp_method_version === null` in the UI.** Use `resolveMethodVersion` from the package (null/undefined/"" = v3.0; unknown tag = `null`). Exception handled explicitly: `undefined` (field absent) must NOT be sent through `resolveMethodVersion`, because that maps it to v3.0 and would invent a "mixed" state against a v3.2 neighbour on an older server.
- **Trusting API numbers.** History `scores.ibp_total` comes from JSON: guard with `Number.isFinite` and fall back to 0 like the server does for the community payload (`toFiniteNumber(...) ?? 0`), so a malformed value never reaches SVG attributes.
- **Animating `width`/layout for the reveal.** UI-SPEC says transform, opacity and SVG props only.
- **Putting the journal behind any shared route.** `CommunityHistoryRoute` and `CommunitySurveyScreen` must not import `EventsTab`, `SurveyJournal*` or `surveyEvents` (criterion 2); enforce with a source-text test (pattern already used in `SurveyDetailScreen.test.tsx`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Method version equality / unsupported tags | `a === b` on raw strings | `resolveMethodVersion` / `isSameMethodVersion` from `@cortege/ibp-domain` | null, "" and the v3.0 tag are the same method; unknown tags never match anything |
| Per-factor and total deltas | New subtraction code | `computeFactorDeltas`, `computeIbpTotalDelta` (`app/ibp-scoring.ts`) | D-07; omission rule for missing factors already encoded |
| Tone of a total / factor bar | Band thresholds | `totalTone`, `factorTone`, `factorRatio`, `scoreRatio` (`app/ibp-display.ts`) | Display convention + package bands |
| Row with ring, selected frame, wave | New row component | `SurveyRowFrame` + `ScoreRing` | Same row as Mes Relevés and the Explorer panel |
| Section/row entrances | Custom animation | `EntranceView`, `ListEntranceRow`, `useListEntrance` | Replay on visibility, Reduce Motion handled |
| "..." menu | Custom popover | `unstable_headerRightItems` menu (iOS) + `AppActionSheet` | Existing, native glass |
| Contrast maths | Ad hoc | `app/contrast.ts` (`contrastRatio`, `compositeOver`) used by `visual-tokens.test.ts` | Existing gate |
| Date/number formatting | Template strings | existing catalogue + `formatShortDateTime`/`formatDay` | Keeps French catalogue gates green |

**Key insight:** every hard part (rules, tones, rows, motion, menu) already has a primitive; the new code is data shaping, one SVG polyline, and wiring.

## R1. Method version on the two history payloads (answer to question 1)

**Is a migration needed? No.** `api/migrations/016_ibp_method_version.sql` adds `surveys.ibp_method_version TEXT` (nullable, CHECK in the two known tags, NULL = v3.0). Both history queries select `FROM surveys s`. [VERIFIED: api/migrations/016_ibp_method_version.sql, api/src/surveys/parcels.service.ts:99-117, api/src/surveys/community-surveys.service.ts:99-124]

**Smallest safe change (5 touch points + docs + tests):**

| # | File | Change |
|---|------|--------|
| 1 | `api/src/surveys/parcels.service.ts` (`getParcelSurveyHistory`, lines 76-125) | Add `ibp_method_version: string \| null` to BOTH inline row types (return type and `db.query<...>` generic) and `s.ibp_method_version,` to the SELECT (after `s.factor_results`). `items: result.rows` already passes it through |
| 2 | `api/src/surveys/community-surveys.service.ts` | `HistoryDbRow` (line 36-44): add `ibp_method_version: string \| null`; SELECT (line 100-107): add `s.ibp_method_version,`; map (line 147-158): add `ibp_method_version: item.ibp_method_version,` |
| 3 | `packages/ibp-domain/src/contract/public-map.ts` (`CommunitySurveyHistoryItem`, line 48) | add `ibp_method_version?: string \| null` with a doc comment "absent on an older server; null = v3.0". Optional on purpose: it matches `CommunitySurveyItem.ibp_method_version?` (line 41) and does not break existing mobile fixtures (`CommunitySurveyScreen.test.tsx` builds history items inline) |
| 4 | `mobile/src/app/types.ts` (`ParcelSurveyHistoryItem`, lines 51-58) | add `ibp_method_version?: string \| null` (this type is local to mobile, not in the package) |
| 5 | docs | `docs/technical/api-contract-v1.md`: the `GET /parcels/{parcel_id}/surveys/history` example (around lines 1292-1330) gets `"ibp_method_version": null` / the v3.2 tag on its items plus one sentence; the `history` bullet of `GET /public/community-surveys/{survey_id}` (line ~1217) gets "each entry carries `ibp_method_version` (null = v3.0)". `data-contract-v1.md` needs no change (no column change) |

**Package consequence:** changing `packages/**` also triggers the `native-android`/`native-ios` CI jobs (path filter in `ci.yml`) and `image-check`/`build`; it is a CI cost, not a blocker. Keeping the type in the package is still correct (single wire contract).

**Existing tests that must change or be extended**

| Test | Change |
|------|--------|
| `api/test/parcels.service.spec.ts:361-374` | the `rows: [{ survey_id: "s1" }]` pass-through test stays green; add `expect(sqlOf(db)).toContain("s.ibp_method_version")` (helper `sqlOf` exists, line 22) and a row carrying the field |
| `api/test/community-surveys.service.spec.ts:59-68, 70-95` | add `ibp_method_version` to `historyRow` (one `null`, one the v3.2 tag) and to the `toEqual([...objectContaining(...)])` expectations; keep `db.query.mock.calls[1][1]` equal to `["s-2", 20]` |
| `api/test/parcel-history.e2e-spec.ts:104-120` | assert each item `toHaveProperty("ibp_method_version")` (null for these legacy-style surveys) |
| `api/test/community-survey-detail.e2e-spec.ts:138-150` | assert `history[0]` has the property |
| Mobile fixtures | none required (optional field). `view-model.test.ts`/`CommunitySurveyScreen.test.tsx` build history inline and keep compiling |

E2E needs a configured `api/.env.test` (see Environment Availability).

**Edge to document, not to fix:** `getParcelSurveyHistory` returns the OLDEST `limit` rows (`ORDER BY ... ASC LIMIT $2`, default 20, max 100, `normalizeParcelHistoryLimit`), and the community query is capped at `COMMUNITY_HISTORY_LIMIT = 20`. A parcel with more than 20 surveys would lose its newest ones, so "latest 8" and "first-to-latest" would be wrong. Not reachable in practice today (prod is test data); log it as an Open Question rather than widening the phase.

## R2. Navigation (answer to question 2)

**2.1 New and changed routes**

| Route | Stack(s) | Params | Header title key | Component |
|-------|----------|--------|------------------|-----------|
| `surveyHistory` (kept, rewritten) | SurveysStack | none | `headers.surveyHistory` -> "Historique de la parcelle" | `SurveyHistoryRoute` -> `SurveyHistoryScreen` (parcel history) |
| `surveyJournal` (new) | SurveysStack | none | `headers.surveyJournal` -> "Journal du relevé" | `SurveyJournalRoute` -> `SurveyJournalScreen` |
| `communityHistory` (new) | SurveysStack AND PublicMapStack | `{ surveyId: string }` | `headers.communityHistory` -> "Historique de la parcelle" | `CommunityHistoryRoute` |

Evidence: `SurveysStack.tsx` registers `communitySurvey` (line 112), `surveyScore` (131) and `surveyHistory` (140) with `title` + `...pageTitleOptions(theme)`; `PublicMapStack.tsx` registers `communitySurvey` at line 30 with `headerShown: true`. `pageTitleOptions` returns the native large title on the iOS native tab tree and the hidden native title elsewhere (`stack-options.ts:106`).

**2.2 Files to touch**
- `navigation/types.ts`: `SurveysStackParamList` + `surveyJournal: undefined`, `communityHistory: { surveyId: string }`; `PublicMapStackParamList` + `communityHistory: { surveyId: string }`; `SurveyJournalRouteProps = StackRouteProps<SurveysStackParamList, "surveyJournal">`; `CommunityHistoryRouteProps = { route: { params: { surveyId: string } } }` (same shape as `CommunitySurveyRouteProps`, line 85).
- `navigation/stacks/SurveysStack.tsx` (226 lines now) and `PublicMapStack.tsx` (57): add the screens. `communityHistory` in `PublicMapStack` needs `headerShown: true` like `communitySurvey`.
- `i18n/fr/navigation.ts`: `surveyHistory: "Historique de la parcelle"`, add `surveyJournal`, `communityHistory`.
- `navigation/tab-bar.ts`: NO change. `ROUTES_WITHOUT_TAB_BAR` is an empty set (OA-28); only add the two names to the `test.each` list in `tab-bar.test.ts` for documentation.
- iOS native tabs vs JS tabs: both trees mount the same `SurveysTabNavigator`/`PublicMapTabNavigator` (stacks), and no tab file enumerates survey routes (grep of `surveyScore`/`surveyContext` outside stacks, types and screens found nothing). So there is no per-tree work.
- `AppNavigation` leaf-name logic (`getFocusedLeafRouteName`) is generic.

**2.3 Route components**
- `SurveyJournalRoute`: copy of today's `SurveyHistoryRoute` (props: `apiUrl`, `accessToken` not needed; `selectedSurvey`, `surveyEvents`, `eventsLoadingSurveyId`, `onLoadSurveyEvents={actions.loadSurveyEvents}`), `if (!state.selectedSurvey) return null`.
- `SurveyHistoryRoute` (rewritten): passes `apiUrl`, `accessToken`, `selectedSurvey`, `surveyDetails`, `detailsLoadingSurveyId`, and `onOpenSurvey = useLatestCallback((id) => navigation.push("communitySurvey", { surveyId: id }))`. `SurveysStackParamList` already has `communitySurvey`, so `navigation.push` is typed. `SurveyHistoryScreenProps` (`screen-props.ts:61`) drops `surveyEvents`, `eventsLoadingSurveyId`, `onLoadSurveyEvents`.
- `SurveyDetailRoute` (75 lines): add `onOpenJournal = useLatestCallback(() => navigation.navigate("surveyJournal"))` and pass it; `SurveyDetailScreenProps` (`screen-props.ts`) gains `onOpenJournal: () => void`.
- `CommunityHistoryRoute`: `useNavigation<NativeStackNavigationProp<{ communitySurvey: {surveyId: string}; communityHistory: {surveyId: string} }>>()`, `useCommunitySurvey(apiUrl, accessToken, route.params.surveyId, { withPhotos: false })`, `onOpenSurvey -> navigation.push("communitySurvey", ...)`. The `CommunitySurveyRoute` must change its `useNavigation` generic the same way and pass `onOpenHistory = () => navigation.push("communityHistory", { surveyId: route.params.surveyId })`.

**2.4 `useCommunitySurvey` photo fetch (UI-SPEC gap).** The hook always fetches attachments and one download URL per image after the survey (hooks/useCommunitySurvey.ts:62-86). A history page that only needs `detail.history` should not do that. Recommended: add an options object `{ withPhotos?: boolean }` (default true) that skips the second `try` block; extend `useCommunitySurvey.test.ts` (it already has the `settle()` helper) with one case. Alternative (no hook change): accept the extra requests. Flag for the planner; the first option is 6 lines.

**2.5 400-line cap.** `SurveyDetailScreen.tsx` is 317 lines (verified by `wc -l`), `CommunitySurveyScreen.tsx` 329, `SurveysStack.tsx` 226. Estimated after the phase: `SurveyDetailScreen` about 335-345 (if the row logic lives in `useHistoryRow`, see R3), `CommunitySurveyScreen` about 265 (the inline list JSX, about 36 lines, and six `own.history*` style keys, about 40 lines, are removed), `SurveysStack` about 245. All under 400.

**2.6 Coverage floor.** `jest.unit.config.js` sets `./src/navigation/` to statements 100 / branches 98 / functions 100 / lines 100, and CI runs `npm run test:unit:coverage` for mobile (ci.yml `unit-mobile`). Every new route component and callback must be executed in `routes.test.tsx`.

**Existing navigation tests that must change**
- `navigation/navigation.test.tsx`: add `jest.mock("./routes/SurveyJournalRoute")` and `CommunityHistoryRoute` next to line 128; `SURVEY_SUB_PAGES` (line 480) + the `titles` map (line 536-542) + the "transparent halo header" page list (line 640-646) gain `surveyJournal` and `communityHistory`; `communityHistory` in `PublicMapStack` also needs a case like the existing `communitySurvey` one; `titles.surveyHistory` now reads "Historique de la parcelle" through the key (no literal), so it stays green.
- `navigation/routes/routes.test.tsx` (1889 lines, test files are exempt from the cap): add `SurveyJournalScreen` and `ParcelHistoryView` mocks near lines 126-128; replace the `SurveyHistoryRoute` test (line 1250-1266, asserts `onLoadSurveyEvents`) by one for the new props plus a `SurveyJournalRoute` test asserting `onLoadSurveyEvents`; assert `onOpenJournal` navigates to `"surveyJournal"` beside line 1107; add the new routes to `framedRoutes` (line 1772) and `largeTitleRoutes` (line 1849); add `CommunityHistoryRoute` cases modelled on `CommunitySurveyRoute` (lines 983-999: `mockCommunitySurveyArgs`, `mockSearchNavigation.push`).
- `state/render-counts.test.tsx` line 448: the fake stacks mount every screen, so add `jest.mock("../screens/SurveyJournalScreen", () => ({ SurveyJournalScreen: () => null }))` and a null mock for `ParcelHistoryView` (the real `CommunityHistoryRoute` would otherwise load SVG/Reanimated code in that suite).
- `navigation/tab-bar.test.ts`: optional documentation entries.

## R3. The "..." header menu (answer to question 3)

**Current construction** (`useSurveyDetailHeader.tsx`, 127 lines):
- iOS (`Platform.OS === "ios"`): `navigation.setOptions({ unstable_headerRightItems: () => [shareButton, { type: "menu", label, icon: sfSymbol "ellipsis", tintColor, accessibilityLabel, menu: { items: [...renameItems, deleteAction] } }] })`. `renameItems` is `[{ type: "action", label: menuText.rename, icon: {type:"sfSymbol", name:"pencil"}, onPress: onRename }]` only when `onRename` is passed (iOS native large title AND editable survey; `SurveyDetailScreen.tsx:156`). Delete is `{ type: "action", icon trash, destructive: true, onPress: onDelete }` (lines 76-94).
- Android and Expo Go: `headerRight` = two 44 x 44 `AppPressable`s (share, then `ellipsis-horizontal-outline` calling `onOpenMenu`), which sets `menuVisible` in `SurveyDetailScreen` and opens `AppActionSheet` with ONE option (`Supprimer`, destructive, lines 302-314).
- "Partager" is its own visible button (OA-48), not in the menu.

**D-05 answered by reading the code:** export (Partager button, `exportAndShareSurveyPdf`) and delete (menu, `confirmDeleteSurvey` native confirmation) already live in the header. Do not move or duplicate them. The phase adds exactly one entry.

**Change**
1. `useSurveyDetailHeader` params: add `onOpenJournal: () => void` (must be stable; the route's `useLatestCallback` makes it so). In the iOS menu items, insert between `...renameItems` and delete: `{ type: "action", label: menuText.journal, icon: { type: "sfSymbol", name: "clock.arrow.circlepath" }, onPress: onOpenJournal }`. The SF symbol exists in the typings [VERIFIED: grep of `node_modules/sf-symbols-typescript/dist/index.d.ts`]. Add `onOpenJournal` to the `useLayoutEffect` deps.
2. `SurveyDetailScreen.tsx` ~302-314: the sheet options become `[{ label: menuText.journal, onPress: onOpenJournal }, { label: menuText.delete, destructive: true, onPress: ... }]` (no icons in the sheet, as today). `AppActionSheet` closes the sheet before running an option, so no extra wiring.
3. Catalogue: `surveyDetail.menu.journal = "Journal du relevé"`. The comment above `menu` ("only holds the destructive action") becomes stale: update it.
4. Hook mock in `SurveyDetailScreen.test.tsx` (`jest.mock("./survey-detail/useSurveyDetailHeader", () => ({ useSurveyDetailHeader: jest.fn() }))`, line 77): assert `params.onOpenJournal` is passed and that the `AppActionSheet` host element receives the two options in order. `makeProps` needs `onOpenJournal: jest.fn()`.

**Test impact on `useSurveyDetailHeader.test.tsx`** (all `expect(labels).toEqual([...])` lines change):
- line 85: `[rename, delete]` -> `[rename, journal, delete]`; assert `menu.menu!.items[1].onPress()` calls `onOpenJournal`, and delete is index 2.
- line 96: finished survey `[delete]` -> `[journal, delete]`.
- line 105: Expo Go iOS `[delete]` -> `[journal, delete]`.
- `run()` callbacks object (line 53-57) gains `onOpenJournal: jest.fn()`.
- Android test (lines 108-126) unchanged (still two buttons); the journal entry is covered in the screen test through the sheet options.

**Visibility rule:** the menu exists only on the owner's `SurveyDetailScreen` (it is the only screen that calls `useSurveyDetailHeader`). `CommunitySurveyRoute` calls `navigation.setOptions` only for `title`. Nothing to add for D-03; add a source-level assertion that `CommunitySurveyScreen`/`CommunityHistoryRoute` do not import `useSurveyDetailHeader` or `EventsTab`.

## R4. Pure functions to unit test and where they live (answer to question 4)

Put them in `mobile/src/app/parcel-history.ts` (new) and `mobile/src/app/trend-geometry.ts` (new). `ibp-scoring.ts` stays the rule adapter and is NOT extended (the new code is display arithmetic, not IBP rules). They import `resolveMethodVersion` from `@cortege/ibp-domain` and `computeFactorDeltas`/`computeIbpTotalDelta` from `./ibp-scoring`. Both modules are pure: no React, no colour, no catalogue.

**4.1 Entry model** (unifies own and community):

```ts
// Sketch, mobile/src/app/parcel-history.ts
import { FACTOR_KEYS, resolveMethodVersion } from "@cortege/ibp-domain"
import { computeFactorDeltas, computeIbpTotalDelta } from "./ibp-scoring"
import type { FactorCanonical, IbpScores, ParcelSurveyHistoryItem } from "./types"

export type HistoryEntry = {
  surveyId: string
  year: number | null
  version: number | null
  total: number
  /** Raw wire value: undefined = field absent (older server), null = v3.0. */
  method: string | null | undefined
  scores?: IbpScores
  factors?: Record<string, FactorCanonical>
  author?: string | null
  isCurrent: boolean
}
export const DRAWN_POINTS = 8

/** One method key per entry. undefined inherits the previous known key (the first known one for a
 * leading gap); an unsupported tag is its own key. Never invents a mixed state. */
export function methodKeys(entries: readonly HistoryEntry[]): string[] {
  const raw = entries.map((e) =>
    e.method === undefined ? null : (resolveMethodVersion(e.method) ?? "unsupported"),
  )
  let last = raw.find((key) => key !== null) ?? "unknown"
  return raw.map((key) => {
    if (key !== null) last = key
    return last
  })
}
```

**4.2 Functions and their exact rules** (from UI-SPEC "Derived values", confirmed workable on the data):

| Function | Rule | Test cases to write |
|----------|------|---------------------|
| `methodKeys` | above | all null -> one key; null then v3.2 -> two keys; `undefined` between two v3.2 -> inherits; leading `undefined` takes the first known; all `undefined` -> one key; unsupported tag distinct from v3.0 |
| `trailingRunStart(keys)` | index where the maximal suffix sharing the last key begins | single item; all same; `[a,a,b]` -> 2; `[a,b,a]` -> 2 (only the final run counts) |
| `drawnWindow(entries)` | `entries.slice(-8)` (keys computed on the FULL list first, then sliced, so inheritance is not cut) | 0, 1, 7, 8, 9, 20 items |
| `trendSummary(entries)` | drawn = window; `< 2` -> `{kind:"none"}`; `run.length >= 2` -> `{kind:"change", delta: last.total - run[0].total, fromYear: run[0].year, sinceFirst: run[0].year === null \|\| run[0].year === last.year}`; `run.length === 1` after a method change -> `{kind:"newMethod", methodLabel:"v3.2", year: last.year}`; `mixed = run.length < drawn.length` | delta > 0, < 0, = 0; singular "+1 point" is a catalogue concern; null year; same-year; method change at latest; two method changes |
| `historyRowState(input, entries)` | table in UI-SPEC Surface 1, evaluated in this order: no parcel -> `no-parcel`; offline or error -> `unavailable`; loading with no items -> `loading`; `entries.length === 0` or `[the current one]` -> `first`; `length === 1` (not current) -> `count 1`; trailing run over ALL entries `>= 2` -> `range {first: run[0].total, latest: last.total}`; else `count n` | each row of the table; draft current (not in list); refresh with items present stays on `range` |
| `deltaCardState(entries, currentId)` | `i = entries.findIndex(isCurrent)`; `i < 1` -> `hidden`; previous = `entries[i-1]` (the survey JUST BEFORE the current one, fixing `HistorySection`'s "last other survey"); different key -> `{kind:"differentMethod"}`; no factors on either side (community) -> `hidden`; else `{kind:"card", previousYear, total:{delta,current,previous}, rows: FACTOR_KEYS.map(...)}` using `computeFactorDeltas`/`computeIbpTotalDelta` | current not newest (the regression of flag 4): history `[a(24), cur(28), c(31)]` compares with `a`, not `c`; first survey; draft current; mixed method previous; a missing factor on one side -> `n.d.` row |
| `listRows(entries)` | newest first (reverse of API order); each row: `{entry, total, deltaVsPrevious: number \| "unavailable" \| null, methodLabel?, isCurrent}`; delta against the item before it in API order; `"unavailable"` when that item has another method; `null` for the oldest; `methodLabel` only when the parcel is mixed | order; oldest row; mixed parcel labels |
| `buildEntriesFromOwn(items, currentId)` / `buildEntriesFromCommunity(history)` | map wire items to `HistoryEntry`; own: `total = scores.ibp_total`, factors from `factor_results`; community: `total = ibp_total`, `author = author_name`, `isCurrent = is_current`; coerce non-finite totals to 0 | missing/garbage total, null year |

**4.3 Geometry (`trend-geometry.ts`)** pure, no colour:
- `yDomain(totals)`: `lo = max(0, floor((min - 5) / 5) * 5)`, `hi = min(50, ceil((max + 5) / 5) * 5)`, widen to span >= 20 (raise `hi` up to 50 first, then lower `lo` down to 0). Hand-checked: min=max=34 -> [25, 45]; max=50 -> hi stays 50; all 50 -> [30, 50]; min=0 -> lo stays 0. Span can never be 0, so the Y division is safe.
- `buildTrend(drawn, keys, width)`: padding L/R 24, top 32, bottom 32, height 128; `x_i = 24 + i * (width - 48) / (n - 1)`; `y = 96 - (total - lo) / (hi - lo) * 64`; returns `points` (with `x`, `y`, `total`, `yearLabel` text input, `isCurrent`), `runs` (arrays of point indices split where the key changes), `runPaths` (`"M x y L x y ..."` per run; a run of one point has no segment), `links` (dashed segment between the last point of a run and the first of the next).
- `pathLength(points)`: sum of segment lengths, used only by the dash-offset fallback (react-native-svg has no `getTotalLength`).
- Tests: 2 points; 8 points; mixed with 1 and 2 cuts; flat series; `n === 2` width maths; determinism (same input, same output).

**4.4 Reuse boundary.** `parcel-history.ts` never decides what IBP rules say; it only compares method keys and subtracts. It must not import from `screens/` or `i18n/` (catalogue strings are applied in the view).

**4.5 Window divergence to record (Open Question 1).** The page title/curve use the latest 8 points; the summary row value uses ALL submitted items (UI-SPEC line 321). On a parcel with more than 8 surveys of one method they differ ("21 -> 34" on the summary, "+6 points depuis 2021" on the page). Recommended: keep the UI-SPEC rule and assert the divergence in a unit test so it is intentional.

**4.6 Community (criterion 2).** `buildEntriesFromCommunity(detail.history)` feeds `historyRowState` (row value) and `ParcelHistoryView` (trend + list, no delta card because `factors` is undefined). The community page never receives events and cannot reach `surveyJournal` (it is not registered in `PublicMapStack`; in `SurveysStack` it is reachable only from the owner summary menu).

## R5. i18n catalogue and checks (answer to question 5)

**Catalogue shape constraints from `i18n/catalogue.test.ts`** (these affect the UI-SPEC entries):
1. Every function leaf is called with a Proxy argument and must return a non-empty STRING with no id-like substring (`expectUserFacing`). The UI-SPEC entry `parcelHistory.page.trend.title({ delta, year })` that returns a strong part and an accent part would fail (`typeof` object). Split into string functions: `trend.titleStrong(delta)`, `trend.titleAccent(year)`, `trend.newMethodStrong(method)`, `trend.newMethodAccent(year)`.
2. A function that takes a LIST must be registered in `LIST_ARGUMENTS` in `catalogue.test.ts` (existing example: `components.factorBars.label`). `trend.a11y({ points, mixed })` takes a list: add `"parcelHistory.page.trend.a11y"` there, or have the component join the points. The Proxy gives `points` as a string and `.map` would throw.
3. `Object.keys(fr)` is asserted exactly: add new keys only under existing sections (`parcelHistory.page`, `surveyDetail.menu/rows/journal/a11y`, `navigation.headers`), no new top-level section.
4. Count-like keys (`count|total|synced|failed|n$`) receive the number 2; other keys receive a name string, so arithmetic on them yields NaN in the probe but must still stringify to a non-empty text.

**Entries** (use UI-SPEC "Changed or new catalogue entries" verbatim, with the string-only split above). Corrections to the UI-SPEC list:
- `surveyDetail.rows.historyEmpty` ("Voir les étapes") removed; `SurveyDetailScreen.tsx:202` is its only consumer.
- `surveyDetail.versionHistory.*` removed with `HistorySection` (its only consumer); update the comment in `survey-detail.ts` lines ~227-230.
- `surveyDetail.events.title` becomes "Journal du relevé"; if `EventsTab` always hides its header on the journal page the key is unused: either keep `hideHeader` default false (UI-SPEC) or delete the header and the keys. `DebugTab` does NOT use `EventsTab` (grep: only `SurveyHistoryScreen` and tests import it), so the UI-SPEC statement that `hideHeader` protects the "dev DebugTab" is moot. Recommendation: follow the UI-SPEC (`hideHeader` prop), one test line.
- `communitySurvey.history.{title,current,row,total,open}`: `title` and `open`/`total` become unused by the community screen (the row now says "Historique de la parcelle" via the new keys); `row` is reused by the list; remove the unused ones to keep the catalogue honest.
- `parcelHistory.entry`: harmonise to "{year} · version {n} · Dernier relevé" (UI-SPEC default on). Its only consumers are `ParcelHistoryCard` (Explorer) and the deleted `HistorySection`, and `PublicMapScreen.test.tsx` references `fr.parcelHistory.total/delta.total/title` only, so no literal in an Explorer test changes. The three `entry` unit tests inside `HistorySection.test.tsx` (lines 173-186) are the only coverage of its branches: move them to a new `i18n/fr/parcel-history.test.ts` (also covering the new functions' plural/sign branches; the `src/i18n` branch floor is 76%, so uncovered ternaries would erode it).

**Existing tests/checks that reference removed or changed strings** (grep-verified):

| Reference | Where | Action |
|-----------|-------|--------|
| `HistorySection`, `fr.surveyDetail.versionHistory.*`, `fr.parcelHistory.entry`/`delta.*` | `screens/survey-detail/HistorySection.test.tsx` (227 lines) | delete with the component; re-home the `entry` tests as above |
| `SurveyHistoryScreen`, order `["PageTitle","EventsTab","HistorySection"]`, `jest.mock("./survey-detail/EventsTab")`/`HistorySection` | `screens/SurveyHistoryScreen.test.tsx` | the file becomes the template for `SurveyJournalScreen.test.tsx` (order `["PageTitle","SubtitleText","EventsTab"]`, same padding/inset tests); write a new `SurveyHistoryScreen.test.tsx` for the parcel page |
| `EventsTab`, `fr.surveyDetail.events` | `screens/survey-detail/EventsTab.test.tsx` | add a `hideHeader` case (the `AppSectionHeader` mock exposes `title`) |
| `SurveyHistoryScreen` mock | `navigation/routes/routes.test.tsx:126`, `state/render-counts.test.tsx:448` | see R2 |
| `rows.historyEmpty` | `SurveyDetailScreen.tsx:202` | replaced by the row state value |
| `fr.surveyDetail.menu` | `useSurveyDetailHeader.test.tsx`, `SurveyDetailScreen.test.tsx` | see R3 |
| `communitySurvey.history.*`, testIDs `community-history-<id>` | `screens/community-survey/CommunitySurveyScreen.test.tsx:~250-307` | rewrite: the page shows the grouped-list row (hidden for 0 or 1 item), pressing it calls `onOpenHistory`; the old row-level `onOpenSurvey` assertions move to the `ParcelHistoryView`/`HistoryList` tests |
| `useParcelSurveyHistory` result `toEqual({ items: [], loading: false, error: false, offline: false })` | `hooks/useParcelSurveyHistory.test.ts:29, ~99` | adding `reload` to the returned object breaks these two `toEqual`s: use `toMatchObject` or `{ ..., reload: expect.any(Function) }` |
| `catalogue.test.ts` | functions return strings; list args | see above |
| `catalogue-dash.test.ts` | no U+2014 | the arrow is U+2192 and is allowed; write it as the escape `"→"` in the catalogue source so the intent stays visible in editors (the gate reads code tokens only, comments are stripped) |
| `summary.styles.ts` | `historyPanel`, `historyRow`, `historyRowTitle`, `historyRowMeta`, `historyDeltaRow`, `historyDeltaPill`, `historyDeltaPillText` (lines 32-72) | consumed only by `HistorySection`; the unused-style-key gate (`structure.test.ts`) fails if they stay: delete them (the file stays: `DetailActions.tsx` uses `createSummaryStyles`) |
| `CommunitySurveyScreen.tsx` own styles | `historyList`, `historyRow`, `historyRowCurrent`, `historyCopy`, `historyTitle`, `historyTotal` (lines ~290-330) and the `AppPressable` import | delete with the inline list (same gate) |

## R6. SVG curve and reveal animation (answer to question 6)

**Drawing.** One `Svg` of `width = measured inner width` x height 128 inside a wrapper `View` with `onLayout` (reserve `height: 128` before measuring). Elements: one `Path` per run (`stroke={forest.titleAccent}`, width 3, round caps/joins, `fill="none"`), `Path`s with `strokeDasharray="4 4"` for method links (`forest.sage`, width 2), `Circle`s for points (r 4, current r 6 with a ring), `SvgText` for values (Sora-SemiBold 12, `forest.title`) and years (Jost-SemiBold 12, `forest.body`) with `textAnchor="middle"`. `fontFamily` must be the PostScript names from `brandTypography.ringValue.fontFamily` / `.meta.fontFamily` (OA-05 gate `fonts.test.ts`). All colours come from `theme.visual.forest.*`. `react-native-svg` host elements are plain strings in the Jest mock (`test/react-native-svg.mock.ts` exports `Svg, Path, Circle, Rect, Text, ClipPath, Defs, G, ...`), so tests read `Path.d`, `Circle.cx`, `Rect.width` directly.

**Contrast** (computed in this session with the repo's `contrastRatio`/`compositeOver`, both schemes): `forest.title` 13.49 / 9.27 / 16.73, `titleAccent` 9.19 / 6.32 / 11.40, `body` 10.05 / 6.90 / 12.46, `sage` 7.33 / 5.03 / 9.09 on the three forest stops; `onSurface.success` on the glass card over canvas 8.47 (light) / 12.83 (dark), `onSurface.danger` 7.68 / 9.01. [VERIFIED: scratch script against `mobile/src/app/*`]. `visual-tokens.test.ts` ("forest %s on the three stops", line ~263) ALREADY tests `title`, `titleAccent`, `body` AND `sage` at 4.5, so no new sage pair is needed; only add the two `onSurface` pairs on `compositeOver(visual.glass.cardFill, colors.canvas)` for both schemes.

**Reveal.** Two options, in order:
1. **Preferred (UI-SPEC):** an SVG `ClipPath` containing a `Rect` whose `width` is driven by `useAnimatedProps` (`AnimatedRect = Animated.createAnimatedComponent(Rect)`), `withDelay(120, withTiming(W, { duration: brandMotion.durations.emphasis (500), easing: Easing.bezier(...brandMotion.easings.decelerate), reduceMotion: ReduceMotion.System }))`, started when `useScreenVisible()` and the width is measured, guarded by a `useRef` so it plays once per page mount; `useReducedMotion()` -> the rect starts at full width and no timing runs. The repo has no `ClipPath` precedent; the proven precedent is `strokeDashoffset` on an `AnimatedCircle` (`ui/ScoreRing.tsx`). [ASSUMED] that animating a `ClipPath` child's width updates the clipped group on both platforms. Make this the first task of the curve plan: a 30-minute simulator spike on iOS and (if available) Android.
2. **Fallback (no clip):** `strokeDashoffset` on each run path using the analytic `pathLength` (`strokeDasharray = [len, len]`, offset `len * (1 - progress)`), and fade the points/labels group in through an animated `opacity` on a `G`. Everything stays on proven SVG props.

**Constraints already enforced by `__checks__/motion.test.ts`:** any file that calls `useReducedMotion(` is exempt from the per-call `ReduceMotion.System` scan, but still pass `reduceMotion: ReduceMotion.System` on every timing (house style). No `withRepeat` is needed, so the loop gate is irrelevant. The hero-budget gate walks the files each `*Route.tsx` reaches under `screens/` and `navigation/` counting `<ForestCard>` without `motion={false}`, `<ForestAurora>`, and `<ContourLines>` without `animated={false}`; it ignores SVG and `ui/` internals. `TrendCard` must write exactly `<ForestCard variant="hero" motion={false}>` (the check is a substring match on `motion={false}`). `SurveyDetailRoute.tsx` must stay at exactly 1 layer (the test asserts `toMatchObject({ "SurveyDetailRoute.tsx": 1, ... })`): do not import `TrendCard` into the summary. New routes count 0 (trend card with `motion={false}`) and need no allowlist entry. The unused-style, layering (no `borderWidth` on gradient views, no `borderCurve`) and icons gates apply to the new files.

**Entrance.** `EntranceView index 0/1/2` for trend card, delta card/notice, list header (replays on each visibility, `useFocusEntrance`); `ListEntranceRow` with one `useListEntrance()` call at the top of the list for rows 0-7. Test pattern: `ScoreRing.test.tsx` mocks `@react-navigation/native` with a bare `NavigationContext`, then `createFakeNavigation` / `ScreenCoverContext` from `test/`; `setReducedMotion(true)` from `test/react-native-reanimated.mock.ts` exercises the reduced branch (reset in `afterEach`).

**Width on small phones.** Eight year labels of about 28 pt each at spacing `(W - 48) / 7`: 37.6 pt at 375, 35.4 at 360 (inner width 296): fine. Below 340 pt they would touch. The supported iOS 26 devices start at 375 pt; check an Android 360 dp device once.

**The arrow U+2192.** Verified: Sora-Medium (the `AppGroupedList` value font), Jost-Regular and Jost-SemiBold do not contain U+2192 (`fc-query` charset of the bundled `.ttf`; they do contain U+00B7 and U+2026). [VERIFIED: fc-query on mobile/assets/fonts]. The glyph therefore comes from the system fallback (San Francisco on iOS, Roboto/Noto on Android) [ASSUMED: renders without tofu]. Fallback string: `"21 à 34"` in `historyValue`, a one-line catalogue change.

## R7. `AppGroupedList` `multiline` flag (answer to question 7)

Current nav row (`ui/AppGroupedList.tsx`): `Text style={labelStyle} numberOfLines={1}` (line 143), trailing `value` `numberOfLines={1}` (line 149), `label` style `flexShrink: 1`, `rowTrailing` `flexShrink: 1`, `value` `flexShrink: 1`. At 375 pt the row content width is 375 - 2*16 (page) - 2*16 (row padding) = 311 pt; "Historique de la parcelle" (25 characters, Sora-SemiBold 16) is estimated at 200-230 pt, plus the 12 pt gap, the value and the 16 pt chevron: it does not fit in one line [ASSUMED estimate from UI-SPEC; owner device check]. Both label and value shrink, so without a change the label truncates ("Historique de la…").

Smallest change:
- `AppGroupedListNavRow` gets `multiline?: boolean` (default false).
- `numberOfLines={row.multiline ? 2 : 1}` on the label.
- For `multiline` rows also give the value `flexShrink: 0` (new `valueFixed` style key) so the value ("21 → 34", "Indisponible", "Aucune parcelle") never ellipsizes at large Dynamic Type and the label wraps first. Note both are `AppText` (caps 2.0 by default; consider `maxFontSizeMultiplier={brandFontScaleCaps.body}` on the label of this row only if the largest accessibility size breaks the row).
- Leave `ROW_MIN_HEIGHT = 48`; vertical padding is already `smd` so a two-line label grows the row.
- Only the summary row (and the community row) pass `multiline`; all other rows (`AccountScreen`, `SettingsScreen`, `ProfileRows`, `GenusTargetSheet`, `SurveyContextScreen`, `OfflineAreasScreen`) are unchanged by default.

Behaviours to know:
- The chevron renders whenever `row.onPress` is set, even with `disabled` (`row.onPress ? <Ionicons chevron>`, line 154). UI-SPEC wants no chevron for "Aucune parcelle": pass `onPress: undefined` for that state (role becomes `none`, row not interactive) instead of `disabled`.
- `accessibilityLabel` already overrides `row.label` (line 133), so the spoken "Historique de la parcelle. de 21 à 34 sur 50" needs no new prop.
- Tests: `AppGroupedList.test.tsx` mocks `react-native` per file and finds `Text` nodes; add one case asserting `numberOfLines` is 2 with `multiline` and 1 otherwise. Existing tests do not assert `numberOfLines`, so they stay green.

## R8. Test infrastructure and commands (answer to question 8)

See "Validation Architecture" below for the full map. Key facts verified this session:
- Baseline: `cd mobile && npx jest --runInBand --config jest.unit.config.js` = 255 suites / 3105 tests pass in about 42 s. A targeted run of 3 suites takes about 2.5 s. API unit: `cd api && npx jest --config jest.unit.config.js test/<file>` (about 1.2 s for two specs).
- Component tests in this repo use `react-test-renderer` with a hand-written `jest.mock("react-native", ...)` per file (View/Text/ScrollView/RefreshControl/Platform/StyleSheet as host strings) because the real RN cannot load in the node environment; hook tests use `@testing-library/react-native/pure` with `jest.mock("react-native", () => ({}))`. New component tests copy the closest sibling (`SurveyHistoryScreen.test.tsx` for the page shells, `EventsTab.test.tsx` for card styling, `ScoreRing.test.tsx` for SVG/animation, `routes.test.tsx` for routes).
- Mocks available in `mobile/test/`: `react-native-reanimated.mock.ts` (synchronous shared values, `useAnimatedProps` runs the factory, `setReducedMotion`), `react-native-svg.mock.ts`, `fake-navigation.ts`, `expo-network.mock.ts`, `vector-icons.mock.ts`.
- Coverage floors enforced in CI (`unit-mobile` runs `test:unit:coverage`): `src/navigation` 100/98/100/100, `src/app` 91/80/97/95, `src/hooks` 90/80/95/91, `src/screens` 56/45/49/55, `src/ui` 59/35/42/59, `src/i18n` 100/76/100/100. Deleting `HistorySection.test.tsx` removes tests but also its source, so net effect is neutral if the new files are tested.

## Common Pitfalls

### Pitfall 1: Catalogue functions that do not return a string
**What goes wrong:** `catalogue.test.ts` fails ("every function entry returns non-empty text") on a function returning `{ strong, accent }` or taking a list without a `LIST_ARGUMENTS` entry.
**How to avoid:** string-only functions; register list arguments (R5).
**Warning signs:** red `catalogue.test.ts` on the first catalogue commit.

### Pitfall 2: Stale summary row after "Terminer"
**What goes wrong:** `useParcelSurveyHistory` loads on `parcelId`/`accessToken`/`isOffline` changes only. After a draft is submitted, the survey joins the parcel history but the summary still shows "Premier relevé" / "1 relevé".
**How to avoid:** give the hook a `refreshKey` (the survey's `status`) in the effect deps, or call `reload()` from an effect when `selectedSurvey.status` changes. Items stay on screen during the refetch (the hook keeps `items` while `loading`). Test: rerender with a new key triggers a second fetch.

### Pitfall 3: `resolveMethodVersion(undefined)` is v3.0
**What goes wrong:** an older server (no field) next to v3.2 neighbours would be read as v3.0 and the page would invent a method change and cut the curve.
**How to avoid:** `methodKeys` treats `undefined` as "inherit" before calling the package (R4).

### Pitfall 4: Wrong comparison base
**What goes wrong:** copying `HistorySection`'s `previousItems[previousItems.length - 1]` compares the current survey with the last OTHER survey, which is wrong when the current one is not the newest.
**How to avoid:** `deltaCardState` uses `entries[i - 1]`; unit test with `[a, current, c]`.

### Pitfall 5: `disabled` grouped-list row still shows a chevron
See R7: use `onPress: undefined`.

### Pitfall 6: Two stacks, one route name
`communityHistory` must be registered in BOTH `SurveysStack` and `PublicMapStack`, and `useNavigation` generics must list both `communitySurvey` and `communityHistory`; `navigation.test.tsx` keeps one `mockScreens[name]` per name (the last registration wins), so assert both stacks through `mockNavigators`.

### Pitfall 7: Unused style keys and orphan catalogue keys
`HistorySection` deletion orphans seven `summary.styles.ts` keys and six `CommunitySurveyScreen` style keys; the structure gate fails on them (R5). Run `npx jest src/__checks__/structure.test.ts` after deleting.

### Pitfall 8: Coverage floor on `src/navigation`
Each new route function (`onOpenJournal`, `onOpenSurvey`, `onOpenHistory`) must be called in `routes.test.tsx`, or CI's coverage step fails even though every test passes.

### Pitfall 9: `useIsOffline` in screen tests
`useIsOffline` calls `expo-network` in an effect and sets state asynchronously; screen tests that render hooks using it should `jest.mock("../hooks/useIsOffline", ...)` (the `expo-network` mock exists, but async `setState` after `act` produces warnings).

### Pitfall 10: Limit semantics of the history API
Oldest-first with `LIMIT` (see R1): recorded as Open Question 2.

## Code Examples

### API: the two SELECT edits (R1)
```ts
// api/src/surveys/parcels.service.ts (inside getParcelSurveyHistory)
`SELECT
   s.id AS survey_id,
   s.observation_year,
   s.version_number,
   s.scores,
   s.factor_results,
   s.ibp_method_version,
   s.submitted_at::text
 FROM surveys s ...`
// api/src/surveys/community-surveys.service.ts: add `s.ibp_method_version,` to the history SELECT
// and `ibp_method_version: item.ibp_method_version,` to the CommunitySurveyHistoryItem mapping.
```

### iOS menu item and sheet option (R3)
```tsx
// useSurveyDetailHeader.tsx, in menu.items between renameItems and delete
{
  type: "action",
  label: menuText.journal,
  icon: { type: "sfSymbol", name: "clock.arrow.circlepath" },
  onPress: onOpenJournal,
},
// SurveyDetailScreen.tsx, AppActionSheet options
options={[
  { label: menuText.journal, onPress: onOpenJournal },
  { label: menuText.delete, destructive: true, onPress: () => onDeleteSurvey(selectedSurvey.id) },
]}
```

### `useHistoryRow` (keeps `SurveyDetailScreen` small and gives tests one seam)
```ts
// screens/survey-detail/useHistoryRow.ts (sketch)
export function useHistoryRow(apiUrl: string, accessToken: string | null, parcelId: string | null,
                              currentSurveyId: string, status: string) {
  const isOffline = useIsOffline()
  const { items, loading, error, offline } = useParcelSurveyHistory(apiUrl, accessToken, parcelId, isOffline, status)
  const state = historyRowState(
    { hasParcel: parcelId !== null, loading, error, offline: offline || isOffline },
    buildEntriesFromOwn(items, currentSurveyId),
  )
  return rowFromState(state) // { value?: string, onPressable: boolean, accessibilityLabel }
}
```

### Reveal with the proven prop (fallback path, R6)
```tsx
const AnimatedPath = Animated.createAnimatedComponent(Path)
const progress = useSharedValue(reduced ? 1 : 0)
const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }))
// start: progress.value = withDelay(120, withTiming(1, { duration: brandMotion.durations.emphasis,
//   easing: Easing.bezier(...brandMotion.easings.decelerate), reduceMotion: ReduceMotion.System }))
```
Source of the pattern: `mobile/src/ui/ScoreRing.tsx` (`useAnimatedProps`, `strokeDashoffset`, `Easing.bezier(EASE_X1...)`).

## UI-SPEC corrections and refinements (planner flags confirmed or refined)

| # | UI-SPEC statement | Finding | Action |
|---|-------------------|---------|--------|
| 1 | "AppStatusChip variant=status" | No such component. It is `AppChoiceChip` with `variant="status"` (`ui/AppChoiceChip.tsx:30-51`; tone type `AppStatusChipTone`) | use `AppChoiceChip variant="status" tone="success" label=...` |
| 2 | `trend.title({delta, year})` strong/accent | Violates `catalogue.test.ts` | split into string functions (R5) |
| 3 | `hideHeader` protects the dev `DebugTab` | `DebugTab` does not use `EventsTab` | keep prop, ignore the DebugTab rationale |
| 4 | New contrast pair for `forest.sage` | already tested at 4.5 on three stops | add only success/danger on glass |
| 5 | "No parcel linked: row disabled, no chevron" | `disabled` still shows the chevron | `onPress: undefined` |
| 6 | Flag 1: API change | confirmed, additive, no migration | R1 |
| 7 | Flag 4: delta base | confirmed; behaviour change + test | R4 |
| 8 | Community page states | UI-SPEC covers only the own page | on `communityHistory` reuse `fr.communitySurvey.loading` / `error` / `retry` (AppButton, `state.reload`) |
| 9 | "Summary and page each call the hook (two GETs)" | summary needs a refresh key after submit | Pitfall 2 |
| 10 | `useCommunitySurvey` for `communityHistory` | fetches photos too | `withPhotos` option (R2.4) |
| 11 | File names `history-row.ts`, `parcel-history-model.ts` | | fold into `app/parcel-history.ts` (R4), planner's call |
| 12 | `journal.loadFailed` reserved | `handleLoadSurveyEvents` swallows errors (`useSurveySync.ts:432-460`) and exposes no error state | do not add the string or any error UI |
| 13 | D-05 | answered: export and delete already in the header; add one entry only | R3 |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One "Historique" page stacking `EventsTab` + `HistorySection` | Journal behind the "…" menu, parcel history as a trend page | this phase (OA-124) | two routes, one new row |
| Compare with the last other survey | Compare with the survey just before the current one, same method only | this phase | behaviour correction, tested |
| Inline community history list | One row opening a shared history page | this phase | `CommunitySurveyScreen` shrinks |

**Deprecated/outdated:** `HistorySection`, `fr.surveyDetail.versionHistory`, `fr.surveyDetail.rows.historyEmpty`, the `historyPanel`/`historyRow*`/`historyDelta*` style recipes in `summary.styles.ts`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Animating the width of a `ClipPath` `Rect` through `useAnimatedProps` repaints the clipped content on iOS and Android with react-native-svg 15.15.4 and Reanimated 4.5.1 | R6 | The draw-in would not play or would flash; mitigation: spike first, fallback to `strokeDashoffset` (proven by `ScoreRing`) |
| A2 | U+2192 renders from the system font on iOS (SF) and Android (Roboto/Noto) with acceptable metrics | R6, R5 | Tofu or misaligned arrow; mitigation: `" à "` text fallback, owner device check |
| A3 | "Historique de la parcelle" at Sora-SemiBold 16 does not fit one line at 375 pt next to a value and a chevron (estimate 200-230 pt) | R7 | `multiline` is harmless if it does fit; owner checks the 375 pt label |
| A4 | Parcels with more than 20 surveys do not occur before the next milestone (history API cap) | R1 | Wrong "latest" on such a parcel; raise the limit or add DESC + reverse |
| A5 | Android small phones are 360 dp or wider so 8 year labels fit | R6 | Overlapping year labels; mitigation: draw every other label when spacing < 32 |

## Open Questions

1. **Window for the title versus the row value**
   - What we know: UI-SPEC computes the page title/curve on the latest 8 and the summary value on all items.
   - What's unclear: whether the owner expects the same number on both for long-running parcels.
   - Recommendation: keep the UI-SPEC rule (rare: more than 8 surveys on one parcel), pin it with a unit test, mention it in the plan so a reviewer does not "fix" it.

2. **History API ordering and cap**
   - What we know: oldest-first with `LIMIT` (default 20, max 100); community capped at 20.
   - What's unclear: whether any parcel will exceed 20 surveys.
   - Recommendation: do nothing in this phase; if wanted later, `ORDER BY ... DESC LIMIT n` then reverse in SQL/JS. Prod is test data.

3. **`communityHistory` photo fetching**
   - Recommendation: add `withPhotos` (R2.4). If the planner prefers zero hook change, the page works with the extra requests.

4. **Opening your own earlier survey from the list**
   - UI-SPEC default: read-only `communitySurvey` for every non-current row. Keep; the editable detail is a later upgrade.

5. **Animated reveal technique**
   - Resolved by a short spike (A1); the plan should list it as the first curve task with the fallback pre-decided.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | all | yes | v22.22.3 | — |
| Jest (mobile, api) | all tests | yes | 29 (repo) | — |
| ts-node | scratch checks only | yes | repo | — |
| PostgreSQL | API e2e (`parcel-history`, `community-survey-detail`) | accepting connections on `/tmp:5432` (pg_isready) | — | CI `e2e` job (postgres:16 service) |
| `api/.env.test` | API e2e | no (only `.env.test.example` exists) | — | copy the example (database must be `ibp_test`; globalSetup refuses any other name) or rely on CI |
| Docker | optional local DB | yes | 29.4.3 | — |
| iOS simulator / iPhone, Android device | owner visual checks, curve spike | not probed (owner workflow) | — | owner phone pass (ROADMAP criterion 3) |

**Missing dependencies with no fallback:** none for unit tests.
**Missing dependencies with fallback:** API e2e locally (use CI or create `api/.env.test`).

## Validation Architecture

Nyquist validation: `.planning/config.json` does not exist, so the key is absent and the section applies.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29 + ts-jest (mobile, api, ibp-domain); `react-test-renderer`, `@testing-library/react-native/pure` for hooks; Supertest for API e2e |
| Config file | `mobile/jest.unit.config.js`, `api/jest.unit.config.js`, `api/jest.config.js` (e2e) |
| Quick run command | `cd mobile && npx jest --config jest.unit.config.js <paths>` (about 2-5 s); API: `cd api && npx jest --config jest.unit.config.js test/<spec>` |
| Full suite command | `npm run test:unit` (domain + api + mobile; mobile alone about 42 s); with coverage floors: `npm run test:coverage:mobile` |
| Gates | `npm run lint`, `npm run typecheck`, `npm run format:check`, and the `src/__checks__/` suites (inside `test:unit`) |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-C-history-split (D-10) | parcel history items carry `ibp_method_version` | api unit | `cd api && npx jest --config jest.unit.config.js test/parcels.service.spec.ts` | extend |
| REQ-C-history-split (D-10) | community history items carry it | api unit | `... test/community-surveys.service.spec.ts` | extend |
| same | e2e payload has the property | api e2e | `npm run test:e2e` (needs DB) | extend `parcel-history.e2e-spec.ts`, `community-survey-detail.e2e-spec.ts` |
| D-01, D-06, D-09, D-10 | method keys, trailing run, trend title, row value, window | mobile unit | `cd mobile && npx jest --config jest.unit.config.js src/app/parcel-history.test.ts` | Wave 0 (new) |
| D-06, D-10 | Y domain, points, run paths, dashed links, path length | mobile unit | `... src/app/trend-geometry.test.ts` | Wave 0 (new) |
| D-07 | delta vs the survey just before the current one; mixed-method notice | mobile unit | `... src/app/parcel-history.test.ts` | Wave 0 |
| D-01 | summary row value/states, `multiline` row, three rows kept | screen | `... src/screens/SurveyDetailScreen.test.tsx src/screens/survey-detail/useHistoryRow.test.ts` | extend + new |
| D-01 | label wraps (2 lines) | ui | `... src/ui/AppGroupedList.test.tsx` | extend |
| D-02, D-05 | menu items order, journal action, sheet option, export/delete untouched | hook/screen | `... src/screens/survey-detail/useSurveyDetailHeader.test.tsx src/screens/SurveyDetailScreen.test.tsx` | extend |
| D-03 | other member: no menu, no journal route, no `EventsTab` | screen + source | `... src/screens/community-survey/CommunitySurveyScreen.test.tsx src/navigation/routes/routes.test.tsx` | extend |
| D-11 | journal page: events + pull to refresh, `hideHeader`, no reload button | screen | `... src/screens/SurveyJournalScreen.test.tsx src/screens/survey-detail/EventsTab.test.tsx` | new + extend |
| D-06..D-09 | history page states (loading, error, offline, first, mixed, draft), list newest first, "Ce relevé" row not pressable | screen | `... src/screens/SurveyHistoryScreen.test.tsx src/screens/survey-detail/ParcelHistoryView.test.tsx` | rewrite + new |
| D-06 | curve render, width via onLayout, reduced motion, reveal once | component | `... src/screens/survey-detail/TrendCurve.test.tsx` | new |
| D-07 | ten delta rows, signs/colours/a11y text | component | `... FactorDeltasCard.test.tsx HistoryList.test.tsx` | new |
| D-12 | catalogue strings, no em dash, string-only functions | catalogue + gate | `... src/i18n/catalogue.test.ts src/i18n/fr/parcel-history.test.ts src/__checks__/catalogue-dash.test.ts` | extend + new |
| D-13 | routes, headers in both stacks, tab bar stays | navigation | `... src/navigation/navigation.test.tsx src/navigation/routes/routes.test.tsx src/navigation/tab-bar.test.ts` | extend |
| hook | `reload()`, `refreshKey`, no `toEqual` break | hook | `... src/hooks/useParcelSurveyHistory.test.ts src/hooks/useCommunitySurvey.test.ts` | extend |
| quality gates | motion, icons, layers, structure (400 lines, unused styles, literals), contrast | gates | `... src/__checks__ src/app/visual-tokens.test.ts` | existing, extend contrast |
| render counts | new screens mocked in the fake stacks | state | `... src/state/render-counts.test.tsx` | extend |
| criterion 3 | owner confirms on the phone, light and dark | manual | see "Owner device checklist" | — |

### Sampling Rate
- **Per task commit:** targeted `npx jest --config jest.unit.config.js <files touched>` plus `cd mobile && npx tsc --noEmit` for TS-only tasks; API tasks: the two API unit specs.
- **Per wave merge:** `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`; for waves touching `src/navigation` or deleting tests also `npm run test:coverage:mobile` (floors).
- **Phase gate:** full `npm run test` where a DB is available (otherwise CI e2e) green, then the owner phone pass before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `mobile/src/app/parcel-history.test.ts` and `trend-geometry.test.ts` (new modules, written test-first)
- [ ] `mobile/src/i18n/fr/parcel-history.test.ts` (re-home `entry` tests, cover new function branches) and a `LIST_ARGUMENTS` entry in `i18n/catalogue.test.ts` if `trend.a11y` takes a list
- [ ] Shared test fixtures for history entries (own and community) so model, view and screen tests agree
- [ ] `jest.mock` entries for the new screens in `state/render-counts.test.tsx` and `navigation/navigation.test.tsx` / `routes.test.tsx`
- [ ] Framework install: none

### Owner device checklist (ROADMAP criterion 3, record in the plan's human-verify task)
1. Light and dark on iPhone (iOS 26): own survey (finished, draft, first on the parcel, mixed v3.0/v3.2 parcel), another member's survey, Journal page, "…" menu with 2 and 3 entries (finished: Journal + Supprimer; draft with large title: Renommer + Journal + Supprimer).
2. Reduce Motion on and off: curve draws left to right once when off, appears complete when on; no replay on return from a survey.
3. Row label "Historique de la parcelle" at 375 pt (iPhone SE/16e class) and at the largest Dynamic Type: wraps to two lines, value never truncated.
4. The arrow "→" on an iPhone and on an Android device (no tofu); otherwise switch to `" à "`.
5. Android/Expo Go: "…" opens the sheet with Journal du relevé and Supprimer; community page has no menu; Explorer parcel panel wording unchanged except "version N".
6. Curve reveal on both platforms (A1) and legibility of labels on the forest card in both schemes.

## Security Domain

`security_enforcement` is not set to false in config (no config file): included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no change | Existing Auth0 JWT (`AuthGuard`) on `/parcels/*` and `/public/community-surveys/*` |
| V3 Session Management | no | — |
| V4 Access Control | yes (unchanged, must stay) | Journal reads `surveyEvents` of the owner's own surveys only; community history is the existing member-visible payload. Do not register `surveyJournal` in `PublicMapStack`; assert no `EventsTab` import on the community path |
| V5 Input Validation | yes | History payload is untrusted JSON on the client: validate numbers (`Number.isFinite`), arrays (`Array.isArray`, as the hook does) and treat unknown method tags as `unsupported`; SQL has no new parameters |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Information disclosure of another member's change log | Information disclosure | Journal route reachable only from the owner's summary; no events in community payload |
| Malformed numbers/NaN reaching SVG attributes | Tampering / DoS (render crash) | Clamp/coerce totals before geometry (`buildEntriesFrom*`, `yDomain`) |
| New field leaking data | Information disclosure | `ibp_method_version` is a public survey attribute already exposed by `map-items` and community detail |

## Sources

### Primary (HIGH confidence)
- Repository code read in this session: `api/src/surveys/parcels.service.ts`, `community-surveys.service.ts`, `parcels.controller.ts`, `surveys-normalize.utils.ts`, `api/migrations/016_ibp_method_version.sql`, `packages/ibp-domain/src/contract/public-map.ts`, `method-version.ts`, `mobile/src/**` files cited inline (navigation stacks, routes, screens, hooks, ui primitives, i18n, `__checks__`, test mocks, `jest.unit.config.js`), `docs/technical/api-contract-v1.md`.
- Commands run: baseline mobile Jest (255 suites, 3105 tests, 42 s); targeted Jest on 3 mobile suites and 2 API specs; `fc-query` on the bundled fonts; a scratch contrast script using the repo's `contrast.ts`; `grep` of `sf-symbols-typescript`.
- Planning inputs: `24-CONTEXT.md`, `24-UI-SPEC.md`, `ROADMAP.md` Phase 24, `REQUIREMENTS.md`, `STATE.md`, `SEED-002`, `docs/user-tests/owner-acceptance.md` (OA-115, OA-122, OA-124), `CLAUDE.md`.

### Secondary (MEDIUM confidence)
- None used (no web or Context7 lookups: no new library is introduced; all APIs used are already exercised in the repo).

### Tertiary (LOW confidence)
- Behaviour of an animated `ClipPath` child on device (A1) and system-font arrow fallback (A2): flagged for a spike and the owner phone pass.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new dependency, everything verified in `mobile/package.json` and code.
- Architecture: HIGH, each touch point cited with file and line.
- Pitfalls: HIGH for catalogue/test/coverage gates (read from the gate sources); MEDIUM for the SVG reveal (A1) and arrow glyph (A2).

**Research date:** 2026-10-09
**Valid until:** 2026-11-08 (stable code base; re-check line numbers if Phase 23 follow-ups or Phase 25 touch the same files first)
