# Phase 27: Quick survey additions - Pattern Map

**Mapped:** 2026-10-11
**Files analyzed:** 30 (new and modified, grouped)
**Analogs found:** 28 / 30 (Meteo-France token cache and the weather prefill catch-up have no exact analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `api/src/surveys/weather.controller.ts` | controller | request-response | `api/src/surveys/search.controller.ts` | exact |
| `api/src/surveys/weather.service.ts` | service | request-response (proxy, cache) | `api/src/surveys/geocoder.service.ts` | exact |
| `api/src/surveys/meteofrance-http.ts` | utility | request-response | `api/src/surveys/ign-http.ts` | role-match (adds bearer token) |
| `api/src/surveys/weather-provider.ts` (synthetic/off) | service | transform | `geocoder.service.ts` `enabled` switch + `CADASTRE_PROVIDER=synthetic` | partial |
| `api/src/surveys/dtos/weather-query.dto.ts` | DTO | request-response | `api/src/surveys/dtos/search-query.dto.ts` | exact |
| `api/src/common/rate-limit.config.ts` (+`WEATHER_THROTTLE`) | config | n/a | same file, `SEARCH_THROTTLE` | exact |
| `api/src/config/{env.schema,app-config,config.types,production-rules}.ts`, `infra/vps/check-env.sh`, `env.example` | config | n/a | the `cadastre` block, `CADASTRE_PROVIDER` rules | exact |
| `api/migrations/023_survey_note_weather.sql` | migration | batch | `api/migrations/016_ibp_method_version.sql` | exact |
| `api/test/migration-023-*.e2e-spec.ts` | test | batch | `api/test/migration-016-ibp-method-version.e2e-spec.ts` | exact |
| `api/test/weather.service.spec.ts` | test | request-response | `api/test/geocoder.service.spec.ts` | exact |
| `api/src/surveys/dtos/survey-upsert.dto.ts` | DTO | request-response | same file (016 fields) | exact |
| `api/src/surveys/surveys-normalize.utils.ts` | utility | transform | same file, `getChangedSubmittedReadOnlyFields` | exact |
| `api/src/surveys/surveys.repository.ts`, `surveys.service.ts` | repository/service | CRUD | same files (`$23..$25` method columns) | exact |
| `api/src/surveys/{surveys-sync,community-surveys,parcels}.service.ts` | service | CRUD (reads) | same files, SELECT lists | exact |
| `packages/ibp-domain/src/contract/{survey,sync,public-map,weather}.ts` | model (wire types) | n/a | `contract/search.ts`, `contract/survey.ts` | exact |
| `packages/ibp-domain/src/parity/cases.ts` (+`MAT-ANN-01@both`) | test fixture | transform | `bothVersions()` helper, `COMPLETE_DIRECT` | exact |
| `mobile/src/app/weather.ts` | utility (pure) | transform | `mobile/src/app/parcel-history.ts` style, `global-search.ts` | role-match |
| `mobile/src/api/weather-api.ts` | service | request-response | `mobile/src/api/ibp-api.ts` (search functions) | role-match |
| `mobile/src/hooks/useWeatherPrefill.ts` + app-level catch-up | hook | event-driven | `useNearbyParcels` / `useSurveyDraftPatcher` | partial |
| `mobile/src/screens/survey-detail/conditions/*` + `SurveyContextScreen.tsx` | component | CRUD (local draft) | `SurveyContextScreen.tsx` + `ScoringContextEditor` | exact |
| `mobile/src/screens/factor-detail/DoubtNoteStrip.tsx` + `FactorDetailScreen.tsx`, `FactorPager.tsx` | component | CRUD | `FactorDetailScreen.tsx` | role-match |
| `mobile/src/ui/NoteField.tsx` | component | request-response | `mobile/src/ui/AppField.tsx` | exact |
| `mobile/src/storage/{surveys,types,utils,sync}.ts` | storage | CRUD | same files (`updateLocalDraft`, `buildSurveyPayloadFromRemote`) | exact |
| `mobile/src/hooks/useSurveyForm.ts`, `useSurveyDraftPatcher.ts` | hook | CRUD | same files | exact |
| `mobile/src/app/survey-pdf/conditions-section.ts` (+`factor-section.ts`, `build-html.ts`) | utility (pure builder) | transform | `survey-pdf/trend-section.ts`, `factor-section.ts` | exact |
| `mobile/src/app/global-search.ts` (+ note source) | utility | transform | same file `matchOwnSurveys` | exact |
| `mobile/src/i18n/fr/conditions.ts` + additions | config (catalogue) | n/a | `mobile/src/i18n/fr/factor-detail.ts` | exact |
| Tests (mobile gates, storage regression, PDF) | test | n/a | co-located `*.test.ts`, `src/__checks__/` | role-match |

## Pattern Assignments

### `api/src/surveys/weather.controller.ts` (controller, request-response)

**Analog:** `api/src/surveys/search.controller.ts` lines 1-48.

```typescript
import { Controller, Get, Query, UseGuards } from "@nestjs/common"
import { Throttle } from "@nestjs/throttler"
import { AuthGuard } from "../auth/auth.guard"
import { SEARCH_THROTTLE } from "../common/rate-limit.config"

@Controller("search")
@UseGuards(AuthGuard)
export class SearchController {
  constructor(private readonly geocoder: GeocoderService) {}

  @Get("places")
  @Throttle(SEARCH_THROTTLE)
  async places(@Query() query: SearchPlacesQueryDto) {
    return this.geocoder.searchPlaces(query.q, query.limit ?? PLACES_DEFAULT_LIMIT)
  }
}
```
Use `@Controller("weather")`, `@Throttle(WEATHER_THROTTLE)`; handlers only delegate. Register controller and service in `surveys.module.ts` (+2 lines).

### `api/src/common/rate-limit.config.ts`

Add `weather: 30` to `PRODUCTION_THROTTLE_LIMITS` (lines 10-17) and mirror `SEARCH_THROTTLE` (lines ~66-69):
```typescript
export const SEARCH_THROTTLE = {
  default: { ttl: THROTTLE_TTL_MS, limit: () => resolveThrottleLimit("search") },
}
```
Update `api/test/rate-limit.config.spec.ts`.

### `api/src/surveys/weather.service.ts` (service, proxy + cache)

**Analog:** `api/src/surveys/geocoder.service.ts`.

**Imports and constants** (lines 1-19): `Injectable, Logger, ServiceUnavailableException`, `ConfigService`, `LRUCache` from `lru-cache`, `appConfigOf` from `../config/app-config`; exported constants `*_CACHE_TTL_MS`, `*_CACHE_MAX_ENTRIES = 500`, `MAX_CONCURRENT_* = 8`.

**Unavailable (503 with business code)** (lines 172-177):
```typescript
function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: "search_provider_unavailable",
    message: "Place search provider unavailable",
  })
}
```
Use `code: "weather_provider_unavailable"`.

**Config + enabled switch** (lines 184-201): read `appConfigOf(config).weather` in the constructor; `off` returns `{ observation: null, reason: "disabled" }`.

**Cache + in-flight de-duplication** (lines 237-257), copy `shared()` verbatim (or extract to `common/` as a third use):
```typescript
private shared<T extends object>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const cached = this.cache.get(key)
  if (cached !== undefined) return Promise.resolve(cached as T)
  const running = this.inFlight.get(key)
  if (running) return running as Promise<T>
  const call = load()
    .then((value) => { this.cache.set(key, value, { ttl: ttlMs }); return value })
    .finally(() => { this.inFlight.delete(key) })
  this.inFlight.set(key, call)
  return call
}
```
Cache key by (station id, UTC hour), never by coordinates. Station list key with 1 h TTL.

**Concurrency cap + failure to 503** (lines 263-284):
```typescript
if (this.running >= MAX_CONCURRENT_IGN_CALLS) {
  this.logger.warn("IGN geocoder failed: concurrent call cap reached")
  throw unavailable()
}
this.running += 1
try { return await fetchIgnJson(url, { timeoutMs: this.timeoutMs, label: "geocoder" }) }
catch (error) {
  const detail = error instanceof Error ? error.message : String(error)
  this.logger.warn(`IGN geocoder failed: ${detail}`)
  throw unavailable()
} finally { this.running -= 1 }
```
Log status only, never coordinates, key or token.

**Defensive mapping** (lines 34-67): copy `asRecord`, `asString`, finite-number checks; drop invalid features, never forward raw provider objects. `coordinatesOf` already handles `[lon, lat]` GeoJSON order.

### `api/src/surveys/meteofrance-http.ts` (utility, request-response)

**Analog:** `api/src/surveys/ign-http.ts` lines 1-28. Same rules: whole-exchange `AbortSignal.timeout`, body awaited before returning, error text is label plus status, never the URL.
```typescript
const response = await fetch(url, {
  method: "GET",
  headers: { Accept: "application/json" },
  signal: AbortSignal.timeout(options.timeoutMs),
})
if (!response.ok) throw new Error(`${options.label} returned HTTP ${response.status}`)
return await response.json()
```
Add `Authorization: Bearer <token>`; keep the token in memory with an expiry margin, refresh once on 401. No analog exists for the token cache (see No Analog Found).

### `api/src/surveys/dtos/weather-query.dto.ts`

**Analog:** `api/src/surveys/dtos/search-query.dto.ts` (not read; same dir as the controller imports). Use `@Type(() => Number)` plus `@IsNumber @Min @Max` for `lat`/`lng`, `@IsOptional @IsISO8601` for `at`.

### `api/src/config/*`, `infra/vps/*`

**Analog:** the `cadastre` block (`app-config.ts:117-129`, `CADASTRE_PROVIDER` default `synthetic`) and `findProductionProblems` / `findProductionWarnings`. Deviation required by research: `WEATHER_PROVIDER` default is `off`; `synthetic` refused in production (problem); `meteofrance` with blank or `CHANGE_ME` key is a warning. Mirror every rule in `infra/vps/check-env.sh`, prove in `api/test/check-env-parity.spec.ts` (fixtures `:30-44`, `:136+`). Add `process.env.WEATHER_PROVIDER = "synthetic"` to `api/test/setup-env.js` beside `CADASTRE_PROVIDER`. Extend `env.schema.spec.ts`, `check-config.spec.ts`.

### `api/migrations/023_survey_note_weather.sql` (migration)

**Analog:** `api/migrations/016_ibp_method_version.sql` lines 14-46.
```sql
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS ibp_method_version TEXT,
  ADD COLUMN IF NOT EXISTS ibp_cas SMALLINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_surveys_ibp_cas' AND conrelid = 'surveys'::regclass
  ) THEN
    ALTER TABLE surveys ADD CONSTRAINT chk_surveys_ibp_cas
      CHECK (ibp_cas IS NULL OR ibp_cas IN (1, 2, 3, 4)) NOT VALID;
  END IF;
END
$$;
ALTER TABLE surveys VALIDATE CONSTRAINT chk_surveys_ibp_cas;
```
For 023: `survey_note TEXT`, `weather JSONB`; CHECKs `char_length(survey_note) <= 1000` and `weather IS NULL OR jsonb_typeof(weather) = 'object'`. Keep the header comment style (idempotent, previous API keeps serving). Follow `api/migrations/README.md:51-60`.

### `api/test/migration-023-survey-note-weather.e2e-spec.ts`

**Analog:** `api/test/migration-016-ibp-method-version.e2e-spec.ts` lines 1-70: `runMigrations` and `resolveDbConfig` via `jest.requireActual`, scratch schema `mig023_scratch` with migrations 001-022 recorded, seeded users/surveys, runner applies 023 only, assert nullable columns, existing rows NULL, CHECK rejects bad data, runner and raw second execution are no-ops. Copy `insertSurvey` (it already handles the dropped `expires_at` column from migration 019) and `scratchRunnerConfig` (`options: -c search_path=...`).

### `api/src/surveys/dtos/survey-upsert.dto.ts` (DTO)

**Analog:** same file lines 71-100. New fields follow the 016 pattern (comment explains `/v1/sync` strips undeclared fields):
```typescript
@IsOptional()
@IsBoolean()
ibp_cas3_scale?: boolean | null

@IsOptional()
@IsObject()
factors?: Record<string, unknown>
```
Add `@IsOptional() @IsString() @MaxLength(SURVEY_NOTE_MAX_LENGTH) survey_note?: string | null` and `@IsOptional() @ValidateNested() @Type(() => SurveyWeatherDto) weather?: SurveyWeatherDto | null` (ranges from constants exported by `@cortege/ibp-domain`, as `IBP_CAS_VALUES` is imported at line 14). Add a custom constraint for `factors.annotations` (A-J keys, note <= 300, `doubt` only `true`).

### `api/src/surveys/surveys-normalize.utils.ts`

**Analog:** same file lines 173-262.
```typescript
const readonlyFields: Array<Exclude<keyof SurveyPatchBody, "scores">> = [ "site_name", ..., "factors" ]
...
if (bodyValue === undefined || bodyValue === null) continue
switch (field) {
  case "factors": {
    if (!jsonDeepEqual(bodyValue, existing.factors ?? {})) changed.push(field)
    break
  }
```
Add `survey_note` (strict string equality) and `weather` (`jsonDeepEqual`) to the list and cases. The array type excludes keys of `SurveyPatchBody`; the new fields are deliberately not in `SurveyPatchDto`, so widen the element type (e.g. `keyof SurveyUpsertBody`). `factors.annotations` is covered by the existing `factors` case.

### `api/src/surveys/surveys.repository.ts` / `surveys.service.ts`

**Analog:** `fastWriteValues` (repository lines 207-237): append `input.surveyNote`, `JSON.stringify(input.weather)` (null-safe) after `input.ibpCas3Scale` so they become `$26`, `$27`, and the CAS token moves to `$28` (`...(casToken === null ? [] : [casToken])`). Update `CREATE_SURVEY_ATOMIC_SQL` (`:249`), `UPDATE_SURVEY_IF_UNCHANGED_SQL` (`:294`), the header comment, and the pinning tests `api/test/surveys-upsert-fast-path.spec.ts:473-477`, `surveys.repository.spec.ts`. In the service use `body.survey_note === undefined ? existing.survey_note : body.survey_note` (same idea as `body.factors ?? existing.factors` at `:202,529`), for create (`:125-146`), update (`:185-210`), locked insert (`:346-384`) and update (`:497-541`). Do not put note text in `upsertEventPayload` (`:305-311`).

### Read paths (`surveys-sync.service.ts:329-361`, `community-surveys.service.ts:69-162`, `parcels.service.ts:76-137`, `getSurveyById:954-1013`)

Analog: the existing SELECT lists and result mapping in the same functions. Add `survey_note`, `weather` (community detail also `s.factors->'annotations' AS factor_annotations`; history rows only `survey_note`). Predicate `PUBLIC_SURVEY_PREDICATE` (`public-map.queries.ts:12`) already limits other members to submitted surveys.

### `packages/ibp-domain/src/contract/*`

Analog: `contract/search.ts` for the new `weather.ts` (wire types and error code), `contract/survey.ts:38-92`, `sync.ts:55-75`, `public-map.ts:48-85` for the optional fields (`survey_note?: string | null`, `weather?: SurveyWeather | null`). Export `SURVEY_NOTE_MAX_LENGTH = 1000`, `FACTOR_NOTE_MAX_LENGTH = 300`, `WEATHER_SKY_CODES`, numeric ranges through `contract/index.ts`. `evaluateIbp` must not read annotations. Package coverage threshold is 100%.

### `packages/ibp-domain/src/parity/cases.ts` (`MAT-ANN-01@both`)

**Analog:** lines 51-80: `COMPLETE_DIRECT`, `bothVersions(build)`.
```typescript
function bothVersions(
  build: (suffix: "v3.0" | "v3.2") => Omit<IbpParityCase, "method">,
): IbpParityCase[] {
  return [{ ...build("v3.0"), method: null }, { ...build("v3.2"), method: IBP_METHOD_V3_2 }]
}
```
Add entries with ids matching `MAT-[A-Z]+-\d{2}@both`: same `COMPLETE_DIRECT` with and without `annotations`, plus annotation on a scored factor, plus annotation for a factor with no input (no issue). The three runners (`parity.test.ts`, `api/test/ibp-parity.spec.ts`, `mobile/src/app/ibp-parity.test.ts`) iterate the array: no runner change. Update `docs/technical/ibp-validation-matrix-v2.md`.

### `mobile/src/screens/survey-detail/conditions/*` and `SurveyContextScreen.tsx`

**Analog:** `mobile/src/screens/SurveyContextScreen.tsx`. Imports (lines 1-17): `useBrandTheme`, `fr`, `AppGroupedList`, `AppText as Text`, `TitledScrollView`, local `survey-detail/*` helpers. Pattern lines 29-44, 78-113: component receives callbacks from `SurveyContextScreenProps` (`onUpdateRegionVersion`, ...), reads `useSurveyDetailData`, `canEditSurvey`; styles via `useMemo(() => createSummaryScreenStyles(theme), [theme])`; inside `TitledScrollView`, insert `<ConditionsSection ...>` after `ScoringContextEditor`/before factors per UI-SPEC, gated by `canEditSurvey` (read-only variant otherwise). File is 115 lines; keep logic in `conditions/`. Text: `const t = fr.surveyDetail.contextScreen` style, new `fr.conditions`. 400-line cap enforced by `structure.test.ts`. Add props to `screen-props.ts` and the route in `navigation/routes/`.

### `mobile/src/screens/factor-detail/DoubtNoteStrip.tsx` and `FactorDetailScreen.tsx` / `FactorPager.tsx`

**Analog:** `mobile/src/screens/FactorDetailScreen.tsx` lines 1-80: imports (`AppText as Text`, `Ionicons`, `useBrandTheme`, `AppCard`, `AppField`, `AppPressable`, `fr`), `const t = fr.factorDetail`, styles from `./factor-detail.styles`. Strip is its own file, receives `{ doubt, note, onChangeDoubt, onChangeNote }`, rendered at the end of the factor card. Keep the `FactorPager` change small (annotations prop passthrough). Icons Ionicons `-outline` only; motion through `brandMotion`/`EntranceView`; haptics via `ui/feedback.ts`; no hex colours.

### `mobile/src/ui/NoteField.tsx`

**Analog:** `mobile/src/ui/AppField.tsx` lines 20-60: wraps `TextInput` with `label`, `error`, `inputRef`, `containerStyle`, `testID`, focused/error styles from `useBrandTheme()`. Compose `AppField` with `multiline`, `maxLength`, a character counter, canonical trim on blur (trim, CRLF to LF, empty to `null`) before the value reaches the payload.

### `mobile/src/storage/surveys.ts`, `sync.ts`, `types.ts`, `utils.ts`

**Analog `buildSurveyPayloadFromRemote`** (`sync.ts:440-463`), add two lines in the same style:
```typescript
ibp_cas3_scale: survey.ibp_cas3_scale ?? undefined,
survey_note: survey.survey_note ?? undefined,
weather: survey.weather ?? undefined,
```
**Analog `updateLocalDraft`** (`surveys.ts:370-420`): reads `basePayload` from `payload_json`, spreads it (`...basePayload`) so fields the form never carries survive; bumps `nextSyncVersion`; wrapped in `runInTransaction`. Add optional `survey_note`/`weather` to `UpdateDraftInput` (`undefined` keeps, `null` clears). `listLocalSurveyNotes()` uses `json_extract(payload_json, '$.survey_note')` as the list already does for scores (`surveys.ts:499-502`). `payload_completion` / `payload_factors_filled` writers (`utils.ts:133-168`) must stay untouched; add a regression test per write site (`createLocalDraft`, `updateLocalDraft`, pull insert, pull update).

### `mobile/src/hooks/useSurveyForm.ts`, `useSurveyDraftPatcher.ts`

`buildFactorsPayload` (`useSurveyForm.ts:~235-307`) appends `annotations` only when non-empty and canonical; extract `useFactorAnnotations.ts`. Draft patcher: extend `DirectDraftPatchInput` (`:28-37,139-146`) and reuse the submitted-refusal at `:121-124` for in-flight weather merges.

### `mobile/src/app/survey-pdf/conditions-section.ts` (pure builder)

**Analog:** `survey-pdf/trend-section.ts` and `factor-section.ts`. Header comment style, `const t = fr.surveyExport...`, `escapeHtml` from `./html` (the only escape), `PdfBlock` `{ id, html, height }` with an explicit height estimate (constants such as `HEADING_HEIGHT`, `OBS_LINE_HEIGHT`, `wrappedRows(chars, charWidth, width)` from `factor-section.ts:30-60`), a `...SectionCss(palette)` export. Shape of the builder (`trend-section.ts:191-216`):
```typescript
export function buildTrendBlock(data: SurveyExportData, palette: PdfPalette): PdfBlock {
  if (data.parcelIds.length === 0) return noteBlock(t.noParcel)
  ...
  const sections = [ headingHtml(), ... ].filter((section) => section !== "")
  const height = HEADING_HEIGHT + ... 
```
Register in `build-html.ts`: add to `collectBlocks` (lines 24-37, after `buildScoreSummaryBlock`/identity per UI-SPEC) and `collectCss` (lines 40-50). In `factor-section.ts` add the doubt badge and note, increasing the card height estimate (`FACTOR_CARD_BASE_HEIGHT`, `OBS_NOTE_HEIGHT`). Add data to `types.ts` `SurveyExportData` and `assemble-export-data.ts`. A 1000-character note and ten 300-character notes must split across blocks (use width-based wrapped-row count); no CSS columns, no 1 px filled div. Colours only from `PdfPalette`.

### `mobile/src/app/global-search.ts`

**Analog:** `matchOwnSurveys` lines 36-42:
```typescript
export function matchOwnSurveys(surveys: readonly LocalSurvey[], query: string): LocalSurvey[] {
  const normalized = normalizeSearchQuery(query)
  if (normalized.length < SEARCH_MIN_LENGTH) return []
  const needle = foldSearchText(normalized)
  return surveys.filter((survey) => foldSearchText(survey.site_name).includes(needle))
}
```
Add an optional `notesById: ReadonlyMap<string, string>` argument (default empty so the three callers `useGlobalSearch.ts:78`, `SearchGroupRoute.tsx:96,101` still compile) matching `foldSearchText(note)`, and a helper `matchedInNoteOnly`. The docstring says "Only the survey name is compared": update it (note text is now compared, never id/status).

### `mobile/src/i18n/fr/conditions.ts`

**Analog:** `mobile/src/i18n/fr/factor-detail.ts`: `export const xFr = { ... } as const`, functions taking an object parameter for interpolation (`fieldsProgress: ({ filledCount, totalCount }: {...}) => ...`). Register in `fr/index.ts` (84 lines). No em dash (U+2014), abbreviations only from the allowlist (units, OK, PDF, GPS, "ex."); gates `catalogue-dash.test.ts`, `abbreviations.test.ts`. Sky labels keyed by `WEATHER_SKY_CODES`.

### `mobile/src/api/weather-api.ts`

Analog: the search endpoint functions in `mobile/src/api/ibp-api.ts` over `mobile/src/api/client.ts` (Bearer injection, 15 s timeout, typed `ApiError`). Do not grow `ibp-api.ts` (400 lines). Distinguish `200 observation:null` (stop) from 503 (retry later).

## Shared Patterns

### Read-only after submit, absent or null is never a change
**Source:** `api/src/surveys/surveys-normalize.utils.ts:173-262`. Apply to `survey_note`, `weather`, `factors.annotations`.

### Provider proxy (cache, in-flight, cap, 503, no user text in logs)
**Source:** `api/src/surveys/geocoder.service.ts:172-284`. Apply to `weather.service.ts`.

### Nullable additive migration plus scratch-schema e2e
**Source:** `api/migrations/016_ibp_method_version.sql`, `api/test/migration-016-ibp-method-version.e2e-spec.ts`.

### Declare new fields in DTO because `/v1/sync` strips undeclared fields
**Source:** comment at `survey-upsert.dto.ts:~66-69` (016 fields). Apply to `survey_note`, `weather`.

### Typed French catalogue, no em dash, theme colours only
**Source:** `mobile/src/i18n/fr/*`, `useBrandTheme()`. Apply to all new mobile UI and PDF text.

### Never re-implement rules in api or mobile
Doubt and notes are stored and displayed only; `evaluateIbp` and both adapters ignore `factors.annotations` (D-14, proved by `MAT-ANN-01@both`).

### Completion counters unchanged
**Source:** `mobile/src/storage/utils.ts:133-168` iterates `FACTOR_KEYS` only; new keys sit outside it.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Meteo-France OAuth token cache in `meteofrance-http.ts` | utility | request-response | `ign-http.ts` sends no credentials; use RESEARCH "Authentication" (in-memory token, margin before expiry, refresh once on 401) after the Wave 0 spike |
| App-level weather catch-up scan (called once by `useAppController`) | hook | event-driven | No existing hook scans local drafts when the network returns; nearest structure is `useNearbyParcels` (called once by `useAppController`) plus `useIsOffline` for the network trigger, and `useSurveyDraftPatcher` for the guarded write |
| Station ranking by great-circle distance | utility | transform | No geodesic helper in `api`; check `mobile/src/map/own-surveys.ts` (`cachedParcelCentre`) for the centre input and write a small pure haversine in the weather service |

## Metadata

**Analog search scope:** `api/src/surveys`, `api/src/common`, `api/migrations`, `api/test`, `packages/ibp-domain/src`, `mobile/src/{screens,ui,app,storage,i18n}`
**Files read:** ~14 (plus RESEARCH/CONTEXT)
**Pattern extraction date:** 2026-10-11
