# Phase 25: Global Search - Pattern Map

**Mapped:** 2026-10-09
**Files analyzed:** 30 new/modified (grouped)
**Analogs found:** 30 / 30 (two with partial match: Explorer place pin layer, `Skeleton` notices)

All paths are relative to the repo root. Line numbers refer to the worktree at commit 927e2659.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/ibp-domain/src/contract/search.ts` (+ `contract/index.ts`) | wire types | transform | `contract/public-map.ts` | exact |
| `api/migrations/022_unaccent_search.sql` | migration | batch | `api/migrations/021_*.sql` (header style); `016` for DDL | role-match |
| `api/test/migration-022-unaccent.e2e-spec.ts` | test | request-response | `api/test/migration-021-parcel-keys.e2e-spec.ts` | exact |
| `api/src/surveys/search.controller.ts` | controller | request-response | `api/src/surveys/public.controller.ts` + `sync.controller.ts` (`@Throttle`) | exact |
| `api/src/surveys/dtos/search-query.dto.ts` | DTO | request-response | `api/src/surveys/dtos/community-surveys-query.dto.ts` | exact |
| `api/src/surveys/search.service.ts` | service | CRUD (read) | `api/src/surveys/community-surveys.service.ts` | role-match |
| `api/src/surveys/search.queries.ts` | SQL builders | CRUD (read) | `api/src/surveys/public-map.queries.ts` (`buildCommunitySurveysQuery`, `escapeLikePattern`) | exact |
| `api/src/surveys/geocoder.service.ts` | service | request-response + cache | `api/src/surveys/cadastre-provider.service.ts` (`fetchJson`, `wfsTileCache`) | exact |
| `api/src/surveys/parcel-query.ts` | utility | transform | `api/src/surveys/surveys-normalize.utils.ts` (`parseParcelIdu`) | role-match |
| `api/src/surveys/cadastre-provider.service.ts` (modify: `lookupParcelByKey`, bbox) | service | request-response | itself (`lookupParcelById` L248-264) | exact |
| `api/src/common/rate-limit.config.ts` (modify: `search`) | config | n/a | itself (`UPLOAD_THROTTLE`) | exact |
| `api/src/config/env.schema.ts`, `app-config.ts`, env examples (`GEOCODING_IGN_SEARCH_URL`) | config | n/a | `CADASTRE_IGN_REVERSE_URL` in the same six places | exact |
| `api/src/surveys/surveys.module.ts` (modify) | module wiring | n/a | itself L18-32 | exact |
| `api/test/{geocoder.service,search.service,parcel-query}.spec.ts` | unit test | mocked `fetch` | `api/test/cadastre-provider.service.spec.ts` | exact |
| `api/test/search.e2e-spec.ts` | e2e test | request-response | `api/test/community-surveys.e2e-spec.ts` | exact |
| `api/test/rate-limit.config.spec.ts` (modify) | unit test | n/a | itself | exact |
| `mobile/src/app/search-text.ts`, `global-search.ts` (+ tests) | utility | transform | `mobile/src/app/survey-logic.ts` / `parcel-history.ts` (pure, tested) | role-match |
| `mobile/src/storage/search-recents.ts` (+ `.sqlite.test.ts`) | storage | CRUD (key/value) | `mobile/src/storage/onboarding-preference.ts`; test `map-preference.sqlite.test.ts` | exact |
| `mobile/src/storage/surveys.ts` (modify `clearLocalIbpData`) | storage | batch | itself L524-540 | exact |
| `mobile/src/api/ibp-api.ts` (3 new functions) | API client | request-response | `searchCommunitySurveys` L247-264 | exact |
| `mobile/src/hooks/useSearchGroup.ts`, `useGlobalSearch.ts` (+ tests) | hook | request-response, debounced | `mobile/src/hooks/useCommunitySurveys.ts` (+ `.test.ts`), `useIsOffline.ts` | exact |
| `mobile/src/i18n/fr/search.ts` (+ `index.ts`, `catalogue.test.ts`) | catalogue | n/a | `i18n/fr/survey-list.ts` (current `search` block L45+) | exact |
| `mobile/src/screens/global-search/*` | screens/components | event-driven UI | `mobile/src/screens/survey-search/SurveySearchScreen.tsx` + Accueil `RecentSurveysSection` | role-match |
| `mobile/src/navigation/routes/SearchHomeRoute.tsx`, `SearchGroupRoute.tsx` | route | request-response | `navigation/routes/SurveySearchRoute.tsx` | exact |
| `mobile/src/navigation/stacks/SearchStack.tsx`, `types.ts` (modify) | navigation | n/a | itself | exact |
| `mobile/src/navigation/tabs/JsRootTabs.tsx` (modify: 4th tab) | navigation | n/a | itself | exact |
| `PublicMapFocus` union: `navigation/types.ts`, `screens/PublicMapScreen.tsx`, `screens/survey-detail/SeeOnMapAction.tsx`, new `screens/public-map/useSearchFocus.ts` | hook/screen | event-driven | `PublicMapScreen.tsx` L36-45, L160-173, L263 | role-match |
| Navigation tests: `navigation.test.tsx`, `tabs.test.tsx`, `routes/routes.test.tsx`, `state/render-counts.test.tsx` | test | n/a | themselves | exact |

---

## Pattern Assignments

### `packages/ibp-domain/src/contract/search.ts` (wire types, transform)

**Analog:** `packages/ibp-domain/src/contract/public-map.ts` (type-only, doc comment above each type naming the endpoint) and the re-export block of `contract/index.ts` (alphabetised `export type { ... } from "./public-map"`).

Copy:
```typescript
// contract/public-map.ts: "One finished survey in the community search (`GET /public/community-surveys`) ..."
export type CommunitySurveyItem = { survey_id: string; site_name: string; author_name: string | null; ... }
```
New file exports `SearchMemberItem`, `SearchCommunityResponse` (reuses `CommunitySurveyItem`), `SearchPlaceKind`, `SearchPlaceItem`, `SearchPlacesResponse`, `SearchParcelItem`, `SearchParcelsResponse`. Add an `export type { ... } from "./search"` block in `contract/index.ts` and (check) the package `src/index.ts` re-export of `./contract`. Types only: the 100 percent coverage threshold is unaffected; there is no parity fixture for wire types (parity cases `src/parity/cases.ts` concern IBP rules only, so nothing to add there). API reads `dist`: run `npm run build:domain` before api tests.

---

### `api/migrations/022_unaccent_search.sql` (migration)

**Analog:** `api/migrations/021_parcel_keys_numbered_sections_arrondissements.sql` (header style: `-- Migration NNN: purpose (owner request date).` then a paragraph of why, then `-- Safe to run twice: ...`). Files are plain numbered SQL, run by `api/scripts/migrate.js`; no `CREATE INDEX CONCURRENTLY`.

```sql
-- Migration 022: accent-insensitive search (phase 25). ...
-- Safe to run twice: IF NOT EXISTS.
CREATE EXTENSION IF NOT EXISTS unaccent;
-- optional: CREATE INDEX IF NOT EXISTS idx_parcels_commune_section_number ON parcels (commune_code, section, number);
```
**Test analog:** `api/test/migration-021-parcel-keys.e2e-spec.ts` lines 1-30 (scratch schema, `jest.requireActual("../scripts/migrate")`, `resolveDbConfig` from `./e2e-env`, `MIGRATIONS_DIR`). For 022 a simpler spec is enough: `SELECT unaccent('Éléphant')` returns `Elephant` through the same `pg` `Client` + `resolveDbConfig(process.env)` (see `migration-019-no-submission-deadline.e2e-spec.ts` for the simple form). Fallback if the extension is missing: SQL `translate(lower(col), ...)` (RESEARCH Standard Stack).

---

### `api/src/surveys/search.controller.ts` (controller, request-response)

**Analog:** `api/src/surveys/public.controller.ts` L1-27 and `sync.controller.ts` L1-20.

Imports and guard (public.controller.ts L1-15):
```typescript
import { Controller, Get, Query, UseGuards } from "@nestjs/common"
import { AuthGuard } from "../auth/auth.guard"

@Controller("public")
@UseGuards(AuthGuard)
export class PublicController {
  constructor(private readonly publicMap: PublicMapService, ...) {}
  @Get("community-surveys")
  async searchCommunitySurveys(@Query() query: CommunitySurveysQueryDto) {
    return this.publicMap.searchCommunitySurveys(query)
  }
```
Throttle (sync.controller.ts L2, L16-17; same use in `users.controller.ts` L23, L56):
```typescript
import { Throttle } from "@nestjs/throttler"
import { SYNC_THROTTLE } from "../common/rate-limit.config"
@Post("sync") @HttpCode(200) @Throttle(SYNC_THROTTLE)
```
So: `@Controller("search") @UseGuards(AuthGuard)`, each of `community|places|parcels` carries `@Throttle(SEARCH_THROTTLE)`. Register in `surveys.module.ts` (`controllers: [SurveysController, SyncController, PublicController, ParcelsController]` L20, and add `SearchService`, `GeocoderService` to `providers` L21-30; `CadastreProviderService` is already a provider). Global prefix gives `/v1/search/...`.

### `api/src/surveys/dtos/search-query.dto.ts`

**Analog:** `api/src/surveys/dtos/community-surveys-query.dto.ts` (whole file, 17 lines):
```typescript
import { Type } from "class-transformer"
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"
export class CommunitySurveysQueryDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number
}
```
Add `@MinLength(2)` and non-optional `q!` per RESEARCH Pattern 1; keep decorators one per line (Prettier). Per-endpoint limit maxima differ (community 50, places/parcels 10): use separate DTO classes or validate in the service.

### `api/src/surveys/search.queries.ts` + `search.service.ts`

**Analog:** `api/src/surveys/public-map.queries.ts`: `PUBLIC_SURVEY_PREDICATE` L9 (`s.status = 'submitted' AND s.deleted_at IS NULL`), `escapeLikePattern` L237-239, `buildCommunitySurveysQuery` L247+:
```typescript
const conditions: string[] = [PUBLIC_SURVEY_PREDICATE, `s.submitted_at IS NOT NULL`]
const values: unknown[] = []
if (input.q) {
  values.push(`%${escapeLikePattern(input.q)}%`)
  conditions.push(`(s.site_name ILIKE $${values.length} OR u.display_name ILIKE $${values.length})`)
}
```
Evolve to `unaccent(col) ILIKE unaccent($n)`; the author is a LEFT JOIN (account deletion anonymises, migration 012). Return `{ text, values }` builders exactly like this function so the service stays a thin `db.query(text, values)`. Service shape: `api/src/surveys/community-surveys.service.ts` L1-60 (Injectable, `DatabaseService` injected, local `*DbRow` types, imports `PUBLIC_SURVEY_PREDICATE` from `./public-map.queries`, wire types from `@cortege/ibp-domain`). Parcel key helpers come from `surveys-normalize.utils.ts` (`parseParcelIdu`, `parseParcelIdentifier`, `normalizeParcelSection`, `arrondissementCity`, `apiCartoSection`, `buildParcelKey`): do not rewrite.

### `api/src/surveys/geocoder.service.ts` (IGN HTTP + cache)

**Analog:** `api/src/surveys/cadastre-provider.service.ts`.

Imports and config (L1-5, L138-155):
```typescript
import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { LRUCache } from "lru-cache"
import { appConfigOf } from "../config/app-config"
...
private readonly wfsTileCache = new LRUCache<string, CachedWfsFeature[]>({
  max: WFS_TILE_CACHE_MAX_ENTRIES, ttl: WFS_TILE_CACHE_TTL_MS, ... })
constructor(config: ConfigService) {
  const cadastre = appConfigOf(config).cadastre
  this.provider = cadastre.provider === "ign" ? "ign" : "synthetic"
  ...
}
```
HTTP call (L555-572), to copy or extract as a shared helper (do not make a second wrapper with a different timeout rule):
```typescript
const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" },
  signal: AbortSignal.timeout(this.timeoutMs) })
if (!response.ok) throw new Error(`cadastre provider returned HTTP ${response.status}`)
return await response.json()
```
Failure logging (L213-219): `this.logger.warn(\`IGN WFS failed: ${message}\`)` where `message` is `error instanceof Error ? error.message : String(error)`. Never put `q` in a log line. "Empty result is cached, failed result is not" (comment at L136-137) is the rule to keep. The new service adds in-flight `Map<string, Promise>` de-duplication and a concurrency cap; no existing analog for those (see No Analog). Provider switch: `provider !== "ign"` returns `[]`/null as `lookupParcelById` does at L252.

**Parcel by key:** extend the private `resolveGeometryFromApiCarto` (called at L254-258, error handling at L401-411 with `IGN API Carto parcel geometry lookup failed`) with a public `lookupParcelByKey(communeCode, section, number)` returning `{ idu, communeName, centroid, bbox }`; reuse exported `geometryCenter` (L34) and add a sibling bbox helper next to it (the existing `geometryBounds` is private).

### `api/src/common/rate-limit.config.ts` (throttle config)

**Analog:** itself. Add `search: 240` to `PRODUCTION_THROTTLE_LIMITS` (L12-17, `as const`, so `ThrottleKind` widens automatically) and, next to `UPLOAD_THROTTLE` (L66-69):
```typescript
export const UPLOAD_THROTTLE = {
  default: { ttl: THROTTLE_TTL_MS, limit: () => resolveThrottleLimit("upload") },
}
```
-> `SEARCH_THROTTLE` with `"search"`. **Test:** `api/test/rate-limit.config.spec.ts` L12-30 lists production values and the `kinds` array explicitly; add `expect(resolveThrottleLimit("search", "production")).toBe(240)` and `"search"` to `kinds`.

### API unit specs (mocked `fetch`)

**Analog:** `api/test/cadastre-provider.service.spec.ts`: `import { buildTestConfigService } from "./config-helper"`, `const originalFetch = global.fetch` (L81) restored in `afterEach` (L88), `const fetchMock = jest.fn()...; global.fetch = fetchMock as unknown as typeof global.fetch` (L146), assertions on `fetchMock.mock.calls[0][0]` as a URL (L171). Spec files sit in `api/test/*.spec.ts`; config `api/jest.unit.config.js`. Coverage ratchet for `./src/surveys/` is 84/71/84/84: new files need their own spec.

### `api/test/search.e2e-spec.ts`

**Analog:** `api/test/community-surveys.e2e-spec.ts` L1-60:
```typescript
import "dotenv/config"
import { INestApplication } from "@nestjs/common"
import request = require("supertest")
import { DatabaseService } from "../src/database/database.service"
import { createE2eApp, getNextVersionNumber, loginTestUser, resolveParcel,
  uniqueCoordSeed, uniqueId, validDirectFactors } from "./helpers/surveys-e2e"
...
beforeAll(async () => { const context = await createE2eApp(); app = context.app; db = context.db })
afterAll(async () => { if (app) await app.close() })
// createSurvey: POST /v1/surveys with Bearer token, then submit
```
Use `uniqueId`/`randomUUID` for every name so runs do not collide. Provider is synthetic in e2e: places and IGN parcel are unit-tested only.

### `api/src/config` env var (`GEOCODING_IGN_SEARCH_URL`)

**Analog:** every occurrence of `CADASTRE_IGN_REVERSE_URL` (grep in `api/src/config/env.schema.ts`, `app-config.ts` -> `cadastre.*`, `api/.env.example`, `api/.env.production.example`, `infra/.env.example`, `infra/vps/env.example`, `api/README.md`, CLAUDE.md table). Optional variable with a default: parity/config-check specs only cover required production variables.

---

### `mobile/src/storage/search-recents.ts` (storage, key/value)

**Analog:** `mobile/src/storage/onboarding-preference.ts` (whole file; best-effort, each function catches its own errors):
```typescript
import { getDb } from "./db"
export const ONBOARDING_SEEN_KEY = "onboarding_seen"
const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM local_meta WHERE key = ?`, [KEY])
await db.runAsync(
  `INSERT INTO local_meta (key, value, updated_at) VALUES (?, ?, ?)
   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  [KEY, value, new Date().toISOString()])
```
Store a JSON array (max 8, newest first, case-insensitive de-dup); parse defensively (corrupt value gives `[]`). No `PRAGMA user_version` migration.

**Test analog:** `mobile/src/storage/map-preference.sqlite.test.ts` L1-20:
```typescript
import { createNodeSqliteDb } from "../../test/node-sqlite-db"
const mockDb = createNodeSqliteDb()
jest.mock("expo-sqlite", () => ({ openDatabaseAsync: jest.fn(async () => mockDb) }))
import { initLocalDb } from "./db"
beforeAll(async () => { await initLocalDb() })
beforeEach(async () => { await mockDb.execAsync(`DELETE FROM local_meta;`) })
```
Corrupted-value test: insert a bad row straight into `local_meta` (same file, L33+).

**`clearLocalIbpData`** (`storage/surveys.ts` L524-538) deletes `downsync_cursor` and the two owner keys inside `runInTransaction`; extend the existing `DELETE FROM local_meta WHERE key IN (?, ?)` with `SEARCH_RECENTS_KEY` (add a third `?`), and add a storage test (see `local-owner.sqlite.test.ts` for a clear-then-assert shape).

### `mobile/src/api/ibp-api.ts` (three client functions)

**Analog:** `searchCommunitySurveys` L247-264:
```typescript
return apiRequest<{ items: CommunitySurveyItem[] }>({
  baseUrl: apiUrl, path: `/public/community-surveys${suffix}`, method: "GET", token: accessToken })
```
It builds the query by hand with `encodeURIComponent`; copy that. Types from `@cortege/ibp-domain`. Its only caller (`useCommunitySurveys`) is deleted; decide whether to keep the old function (the `/public/community-surveys` endpoint stays).

### `mobile/src/hooks/useSearchGroup.ts` (hook, debounced request-response)

**Analog:** `mobile/src/hooks/useCommunitySurveys.ts` (whole file, 54 lines):
```typescript
export const COMMUNITY_SEARCH_DELAY_MS = 350
const debouncedQuery = useDebouncedValue(query.trim(), COMMUNITY_SEARCH_DELAY_MS)
useEffect(() => {
  if (!active || !accessToken) return
  let cancelled = false
  setState((previous) => ({ items: previous.items, status: "loading" }))   // keep previous items
  searchCommunitySurveys(apiUrl, accessToken, { q: debouncedQuery })
    .then((response) => { if (!cancelled) setState({ items: response.items, status: "ready" }) })
    .catch((error: unknown) => { logStatusDetail("communitySearch", error)
      if (!cancelled) setState((previous) => ({ items: previous.items, status: "error" })) })
  return () => { cancelled = true }
}, [active, accessToken, apiUrl, debouncedQuery])
```
Add `offline` (from `useIsOffline`, `hooks/useIsOffline.ts`, which wraps `Network.getNetworkStateAsync` and `isOnlineNetworkState`) as an effect dependency and a `retry` nonce; map `ApiError` 429 to `rateLimited`. Imports: `useDebouncedValue` from `./useDebouncedValue`, `logStatusDetail` from `../i18n`.

**Test analog:** `hooks/useCommunitySurveys.test.ts` L1-50: `jest.mock("react-native", () => ({}))`, `jest.mock("../api/ibp-api", ...)` with `mockSearch`, `renderHook`/`act`/`cleanup` from `@testing-library/react-native/pure`, `jest.useFakeTimers()`, a `flush()` that advances `DELAY + 10` and awaits `Promise.resolve()`, `jest.spyOn(console, "log")` silenced. Mock `useIsOffline` the same way for offline cases.

### `mobile/src/i18n/fr/search.ts` (catalogue module)

**Analog:** the `search` block currently at `i18n/fr/survey-list.ts` L45+ and the module wiring pattern in `i18n/fr/index.ts` (L1-40: `import { xFr } from "./x"`, registered in the `fr = { ... }` object). Add `import { searchFr } from "./search"` and `search: searchFr`; **add `"search"` to the expected top-level key array in `i18n/catalogue.test.ts`**. Rules enforced by that test (L40-70): every leaf non-empty, no id-like text; functions are invoked with a Proxy argument (count-like keys give 2, others "Parcelle du Bois"), so prefer destructured named arguments and tolerate string-for-number. `LIST_ARGUMENTS` (L40-50) is where array arguments are special-cased. No em dash (U+2014); use U+00B7 and « ».

### `mobile/src/navigation/routes/SearchHomeRoute.tsx`, `SearchGroupRoute.tsx`

**Analog:** `navigation/routes/SurveySearchRoute.tsx` (whole file):
```typescript
export const SurveySearchRoute = memo(function SurveySearchRoute() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>()
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveys()
  ...
  const onOpenSurvey = useLatestCallback((surveyId: string) => {
    actions.openSurvey(surveyId)
    navigation.navigate("surveys", { screen: "surveyDetail", initial: false })
  })
  const onOpenCommunitySurvey = useLatestCallback((surveyId: string) => {
    navigation.navigate("surveys", { screen: "communitySurvey", params: { surveyId }, initial: false })
  })
  return (<ScreenFrame><SurveySearchScreen ... /></ScreenFrame>)
})
```
Imports: `useAccessToken, useSession` from `../../state/session-context`, `useSurveys` from `../../state/surveys-context`, `useLatestCallback` from `../../state/useLatestCallback`, `ScreenFrame` from `../../ui/ScreenFrame`. Differences: the query is `useState` inside the route (NOT `actions.setSurveyQuery`, Pitfall 6), and place/parcel taps navigate `navigation.navigate("publicMap", { screen: "publicMapHome", params: { focus } })` (as `SeeOnMapAction` does). Never call `useSurveySync`.

### Navigation wiring

- `navigation/stacks/SearchStack.tsx` (whole file, 20 lines): add `<SearchStack.Screen name="searchGroup" component={SearchGroupRoute} options={pageTitleOptions(theme)} />` next to `searchHome`; `pageTitleOptions` and the `communitySurvey` screen registration in `stacks/PublicMapStack.tsx` L30-40 (`title: fr.navigation.headers.communitySurvey`) are the registration analog. Note `screenOptions` sets `headerShown: false` for the whole stack, so the group screen needs a per-screen `headerShown: true` override as `PublicMapStack` does.
- `navigation/types.ts` L62-65: `SearchStackParamList` gains `searchGroup: { group: ...; query: string; memberName?: string }`.
- `navigation/tabs/JsRootTabs.tsx` L1-40: imports `PublicMapTabNavigator` from `../stacks/PublicMapStack`; add `SearchTabNavigator` import and the 4th `<JsTab.Screen name="search" ...>` after `publicMap`; fix the "Three tabs (OA-13)" comment (L23). Check `tab-config.ts` for `JS_TAB_ICONS.search`, `ANDROID_TAB_ICONS.search`, `TAB_TITLES`.
- Remove `surveySearch` (`SurveysStack`, `SurveysStackParamList`), `onOpenSearch`/`ListTitleBar` button in `SurveyListRoute`/`SurveyListScreen`.
- Tests with exact line anchors in RESEARCH "Tests to update": `navigation.test.tsx` (L135 mock, L351/358, L665), `tabs.test.tsx` (THREE_TABS, L152, L216, L138), `routes/routes.test.tsx` (mocks at L40, `describe("SurveySearchRoute")` L907-992, navigation mock block L22-30, route table L1930), `state/render-counts.test.tsx` L442. Coverage floor for `./src/navigation/` is 100/98/100/100: every new line needs a test.

### Explorer focus plumbing (`PublicMapFocus` union)

**Analog:** current code.
- Type (`navigation/types.ts` L46-54): `{ surveyId, lat, lng, parcelIds, nonce }` -> `kind: "survey" | "place" | "parcel"` union, each with `nonce`.
- Consumer (`screens/PublicMapScreen.tsx`): `focusRegion(focus)` L36-45 (`buildFocusedMapRegion(focus)`), `const initialRegion = useRef(focus ? focusRegion(focus) : undefined).current` L165, and the effect L166-173:
```typescript
const focusNonce = focus?.nonce
useEffect(() => {
  if (!focus) return
  setHighlightedId(focus.surveyId)
  focusTo(focusRegion(focus), 0)
  // The nonce identifies one request; the focus object itself is rebuilt by the navigation.
}, [focusNonce, focusTo])
```
  and `highlightedParcelIds={focus?.parcelIds}` L263. The file is 311 of 400 lines: move the new camera/pin logic into `screens/public-map/useSearchFocus.ts`.
- Producer (`screens/survey-detail/SeeOnMapAction.tsx` L27-31): `params: { focus: { surveyId, ...coordinates, parcelIds, nonce: Date.now() } }` becomes `kind: "survey"`.
- Parcel highlight draws via `map/maplibre/parcel-features.ts` and `brandMapTokens.parcelSelected`; a place pin is a new `ShapeSource` + `CircleLayer` in `MapCanvas` (no analog, see below). Tests: `PublicMapScreen.test.tsx`, the SeeOnMapAction test, plus a new hook test.

### Mobile pure modules (`app/search-text.ts`, `app/global-search.ts`)

**Analog:** pure, unit-tested modules in `mobile/src/app/` (`survey-logic.ts` `filterAndSortSurveys`, `parcel-history.ts`), co-located `*.test.ts`. The `./src/app/` coverage floor is 91/80/97/95. Include the shared accent fixture list (é è ê ë à â ç ï î ô ù û ü ÿ œ æ) used by both fold() tests and the SQL e2e. Note `filterAndSortSurveys` lowercases only and its haystack includes id and sync error; search uses its own name-only fold match.

---

## Shared Patterns

### Auth and per-request user
**Source:** `api/src/surveys/public.controller.ts` L10-11 (`@Controller("public") @UseGuards(AuthGuard)`). Apply to the search controller. Search needs no `@CurrentUser` (data is association-wide), unlike `sync.controller.ts` L4-5.

### Visibility predicate
**Source:** `api/src/surveys/public-map.queries.ts` L9 `PUBLIC_SURVEY_PREDICATE` + `s.submitted_at IS NOT NULL`. Apply to community surveys, members and the parcel survey count.

### Provider failure and logging
**Source:** `cadastre-provider.service.ts` L213-219 and L401-411 (`logger.warn(...)` with `error.message` only). Apply to geocoder and parcel lookup; never log `q`. Map to HTTP 503 `{ code: "search_provider_unavailable" }` (new; check `api/src/common/http-error-logging.filter.ts` for how codes are shaped).

### Single state assembler / context reads
**Source:** `SurveySearchRoute.tsx` imports. Apply to both new routes: read via `useSession`, `useAccessToken`, `useSurveys`; never call `useSurveySync`; use `useLatestCallback` for handlers.

### Offline
**Source:** `mobile/src/hooks/useIsOffline.ts`. One rule app-wide; do not add a second NetInfo subscription.

### Mobile gates for every new file
`src/__checks__`: no hex/`rgba(` (use `useBrandTheme()`), only `-outline` Ionicons, no U+2014, no hard-coded user-facing literals in props (all strings via `fr.search`), unused `StyleSheet` keys fail (`structure.test.ts`), 400-line cap on `src/screens` and `src/navigation`, motion only via `brandMotion`/`EntranceView`/`Skeleton`/`RipplePressable`. Prettier: double quotes, no semicolons, trailing commas, 100 columns.

---

## No Analog Found

| File / concern | Role | Data Flow | Reason |
|---|---|---|---|
| In-flight de-duplication (`Map<key, Promise>`) and outbound concurrency cap in `geocoder.service.ts` | service | request-response | `CadastreProviderService` has an LRU and a tile worker pool (`WFS_TILE_CONCURRENCY`, L195-212) but no promise de-dup; use RESEARCH "Outbound protection" |
| Explorer place pin layer (`ShapeSource` + `CircleLayer`) in `MapCanvas` | component | static overlay | Closest is the parcel highlight in `map/maplibre/parcel-features.ts`; no point-marker source exists. Prototype on device (RESEARCH confidence MEDIUM) |
| `parseParcelQuery` (free-text commune name + section + number) | utility | transform | `parseParcelIdu` / `parseParcelIdentifier` handle IDU and `77186AB0123` only; build on them using the forms table in RESEARCH "Accepted input forms" |
| Group notice lines (loading, offline, error with "Réessayer") | component | UI state | Reuse `Skeleton`, `AppCard variant="glass"`, `RipplePressable`; layout per `25-UI-SPEC.md`; `SurveySearchScreen` has loading/error text for the community scope to read first |

## Metadata

**Analog search scope:** `api/src/{surveys,common,config}`, `api/test`, `api/migrations`, `packages/ibp-domain/src/contract`, `mobile/src/{navigation,hooks,storage,api,i18n,screens}`.
**Pattern extraction date:** 2026-10-09
