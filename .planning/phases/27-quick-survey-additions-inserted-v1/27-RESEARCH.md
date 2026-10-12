# Phase 27: Quick survey additions (INSERTED, V1) - Research

**Researched:** 2026-10-11
**Domain:** NestJS + PostgreSQL survey contract extension (nullable columns, `factors` jsonb), offline-first React Native payload/sync/PDF extension, proxied external weather provider (Météo-France official API)
**Confidence:** MEDIUM overall. Code and contract analysis is HIGH (read line by line). The Météo-France API is MEDIUM at product level and LOW at field level: the official Confluence pages confirm what the observation API is and is not, but the response field names, units and the exact request parameters could not be read from an official page in this session and must be fixed by a real-key spike (Wave 0).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Storage and sync
- **D-01:** Dedicated API columns, nullable like migration 016: new migration `023` adds a survey note column (text) and a `weather` jsonb column. The per-factor doubt and per-factor note live in the `factors` payload (no column). Validated with `class-validator` in `SurveyUpsertDto`, documented in `data-contract-v1.md` and `api-contract-v1.md`.
- **D-02:** Mobile: the fields live in the local `payload_json`; SQLite stays at `user_version` 5 (no local migration).
- **D-03:** Everything is **read-only after submit**: survey note, weather, factor notes and doubts. No new sync operation, no new conflict case. The note was briefly planned as editable after submit and then reversed by the owner.
- **D-04:** Compatibility: optional fields, absent or `null` = no value. An absent or `null` field never counts as a change in the "same `sync_version`" comparison (existing rule). The new fields must be added to the compared read-only fields consistently with that rule (planner to check that a note or doubt change at the same version behaves as a content change, like `factors`). Prod is test data: no two-step migration.

#### Free notes
- **D-05:** Two notes: one per survey (max 1000 characters) and one per factor (max 300 characters, stored in the factor payload, `evidence.notes` of the form spec is the model; planner confirms the exact key against the current factor payload).
- **D-06:** Visible to the members who can read the survey (follows the survey's visibility), in the survey summary, the parcel history and the PDF.
- **D-07:** The survey note is searchable in the global search for **the user's own surveys only** (the local on-phone match in `mobile/src/app/global-search.ts`); the API community search is unchanged.

#### Weather
- **D-08:** Source: **Météo-France official API**, always called through a new Cortege API endpoint (key kept server-side, cache, de-duplication, clean `503` when the provider is down, own throttle, as for the IGN geocoder in phase 25). The app never calls the provider directly. Research must check access, key, quotas and licence, and whether the API gives the observed weather for the survey time (see Risks).
- **D-09:** Stored values: sky condition (code rendered in French by the catalogue), temperature in degrees C, wind in km/h, rain over the last 24 h in mm, and the observation time. Each value is editable.
- **D-10:** Trigger: automatically once the parcel is chosen and the network is there, using the **centre of the parcel** and the current time. Never overwrites a value the observer edited by hand.
- **D-11:** Offline: the section stays empty with **no error**. When the network returns, the draft fills in as long as the observer entered nothing; the weather is that of the survey time, not of the reconnection time.

#### Certainty
- **D-12:** One doubt flag per factor A to J (not per genus, not per survey). Scale: **Sûr / Douteux**, default Sûr; only "Douteux" is a state the observer sets.
- **D-13:** Shown wherever the factor is shown: survey detail (score page), the PDF, and to other members reading the survey. No effect on score, band, total or validation.
- **D-14:** Guard rail: the score code ignores the doubt. The type may be declared with the wire types of `@cortege/ibp-domain`, but `evaluateIbp` never reads it, and a parity case in `IBP_PARITY_CASES` proves the same survey with and without a doubt gives the same result in the package, the API adapter and the mobile adapter. No rule is reimplemented in `api` or `mobile`.

#### Entry ergonomics
- **D-15:** The survey note and the weather live in a **"Conditions" section of the survey context screen**, before the factors.
- **D-16:** Per factor, a **collapsed strip under the factor**: a "Douteux" switch and an "Ajouter une note" link, closed by default, so the ~40-interaction budget of phase 12 is kept.
- **D-17:** Display: survey summary shows one weather line and the folded survey note; the score page shows the "Douteux" badge and the factor note; the PDF has a "Conditions du relevé" block, with the badge and note under each factor, on the fixed A4 page blocks (`mobile/src/app/survey-pdf/`).
- **D-18:** All text through the typed `fr` catalogue, no em dash, abbreviations as in the phase 26 gates (units allowed).

### Claude's Discretion
Visual design of the strip and of the weather section (within the charter), the French labels of the sky conditions, cache durations and throttle of the weather endpoint, the exact payload key names.

### Deferred Ideas (OUT OF SCOPE)
- Doubt per genus of factor A, three-level certainty scale (not chosen).
- Editing the note after submit (reversed by the owner).
- Searching community surveys' notes through the API search (not chosen).
- A "reason" text on the doubt (the factor note covers it).
</user_constraints>

<phase_requirements>
## Phase Requirements

No requirement IDs are mapped yet (ROADMAP: "to be traced when the phase is planned"). Proposed IDs, following the `REQ-{epic}-{slug}` convention of `.planning/REQUIREMENTS.md` (epic C = survey data entry). The SVA-nn alias is given for the planner's convenience; use one scheme only when adding the rows to REQUIREMENTS.md traceability (all Phase 27, role Build, status New).

| ID | Alias | Description | Research Support |
|----|-------|-------------|------------------|
| REQ-C-survey-note | SVA-01 | The observer can add a free note (max 1000 characters) to a survey; it is stored locally, syncs, is read-only after submit, and is shown in the survey summary, the parcel history and the PDF; searchable among the observer's own surveys on the phone | Sections "Wire shape", "Sync semantics matrix", "Display surfaces", "Own-survey search" |
| REQ-C-factor-note | SVA-02 | The observer can add a free note (max 300 characters) to each factor A to J, without leaving the factor page; synced, read-only after submit, shown on the score page, community view and PDF | "Where the doubt and the factor note live" (container `factors.annotations`) |
| REQ-C-doubt-flag | SVA-03 | The observer can flag a doubt ("Douteux") on each factor A to J; it never changes a score, band, total or validation result (proved by a parity case in the package, the API adapter and the mobile adapter) | Parity section (`MAT-ANN-01@both`), Pitfall 1 |
| REQ-C-weather-provider | SVA-04 | A Cortege API endpoint answers the observed weather at a point and a past time from Météo-France, key server-side, cache, de-duplication, own throttle, clean 503, synthetic mode offline | "Météo-France provider findings", "Weather endpoint design" |
| REQ-C-weather-prefill | SVA-05 | Weather (sky, temperature, wind, rain over 24 h, observation time) is pre-filled once the parcel is chosen and the network is there, editable per value, never overwrites a hand edit, absent without error offline and filled in later for the survey time | "Weather prefill state machine", "Offline catch-up" |
| REQ-C-conditions-sync | SVA-06 | The new fields travel through upsert, `/sync`, `/sync/changes`, `GET /surveys/:id` and the community and history reads without false `409 sync_version_conflict` for installed apps | "Sync semantics matrix", Pitfalls 2, 3, 4, 9 |

</phase_requirements>

## Summary

Phase 27 adds three small data items to a survey (a free note per survey and per factor, a pre-filled weather block, a per-factor "Douteux" flag) and the screens that show them. The mechanical work is a nullable-columns migration, four SQL write sites, a DTO, the same-version comparison, the changes feed and community reads on the API, the same fields in the local `payload_json` and the pull builder on the phone, and five display surfaces plus the PDF. The two genuinely risky parts are (1) where the per-factor doubt and note are stored, because the obvious place (inside each factor entry) breaks drafts, and (2) the weather source, because the official Météo-France observation API is a per-station, 24-hour-retention product and cannot answer "weather at a point at a past time" as asked.

**Storage finding (changes the plan).** A factor entry that holds only `{ doubt: true }` is a record that no scorer can read, so `evaluateIbp` returns a blocking `factor_invalid_raw` and the draft upsert is rejected with 422 (`packages/ibp-domain/src/evaluate.ts:182-199`, `rules/common.ts:141-144`, `:190-205`). The mobile form already documents this trap for the phase 25.1 detail arrays (`mobile/src/hooks/useSurveyForm.ts:249-250`: "a factor object without [its scored key] is a blocking invalid input, even for a draft"). Putting meta keys in the entry also makes the local completion percentage move (`mobile/src/storage/utils.ts:19-30,154-165`: `isFilledValue` counts a lone boolean) and copies the note text into every reader's `factor_results[X].observed_value_raw` (`evaluate.ts:230-236`). The researched, recommended key is therefore a sibling container inside the `factors` jsonb that is not a factor key: **`factors.annotations`**, keyed by factor code, each entry `{ doubt?: true, note?: string }`. It satisfies D-01 (in the `factors` payload, no column), gets read-only-after-submit and the Case B comparison for free (`factors` is already deep-compared), is invisible to every scorer (they iterate `FACTOR_KEYS`), and makes D-14 literally true.

**Weather finding (an owner question, not a silent switch).** The official observation API (`DPObs`, "Données d'observation") returns raw station readings, hourly or every 6 minutes, with a 24-hour retention and no archive; a request older than 24 h silently returns the oldest data available, and there is no latitude/longitude query: the client must pick a station from `liste-stations` itself. The text shows no sky or 24-hour rain field for the hourly station product (not confirmed either way). So a point-and-time answer is "nearest active station within a distance cap, hourly reading closest to the requested time, only if that time is within the last 24 h", with sky often empty. This is workable and still Météo-France only, but it is a product decision for the owner (open questions O1 to O4). Free tier: account plus free subscription, OAuth2 bearer tokens that live one hour, quota 100 requests per minute per API per account during an experimental period from January 2026 (was 50), licence Etalab Open Licence 2.0 with the mention "Météo-France".

**Primary recommendation:** Store survey note and weather in two nullable columns (migration `023`), store doubts and factor notes in `factors.annotations`, treat the new fields exactly like `factors` for same-version comparison and submit read-only checks (absent or `null` never a change; `undefined` means keep on a higher-version write, explicit `null` clears), prove D-14 with one `MAT-ANN-01@both` parity pair, proxy Météo-France through a new `GET /v1/weather` endpoint built like the geocoder (cache, in-flight de-duplication, concurrency cap, 503) with a `WEATHER_PROVIDER` of `meteofrance | synthetic | off` where `synthetic` is refused in production, and run a Wave 0 provider spike with the owner's real key before any weather mapping code is written.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Survey note / factor note / doubt entry and local draft write | Browser / Client (RN app) | Database / Storage (SQLite `payload_json`) | Offline-first: every edit lands in the local payload and the sync queue first |
| Note, weather, annotation persistence and validation | API / Backend (`SurveyUpsertDto`, `surveys.service`, repository) | Database / Storage (PG `surveys.survey_note`, `surveys.weather`, `factors`) | The server validates lengths and shape and stores verbatim; clients never trust each other |
| Weather lookup (station choice, token, cache, quota protection) | API / Backend (new weather service) | Third party (Météo-France) | Key stays server-side (D-08); one cache shared by all members protects the provider quota |
| Weather prefill decision (when to ask, per-value merge, "edited" guard, catch-up) | Browser / Client | API (endpoint) | The guard against overwriting hand edits depends on local state and must work offline |
| Doubt never changes a score | Shared package `@cortege/ibp-domain` (parity fixture) | API adapter, mobile adapter | One rule source; the fixture proves both adapters ignore the flag |
| Display of weather, note, badge (summary, score page, community, history) | Browser / Client | API (community and history reads supply the fields) | Pure rendering from payload or wire types |
| PDF "Conditions du relevé", badge and note under factors | Browser / Client (pure builders in `app/survey-pdf`) | none | The PDF is built on the phone, offline, with fixed A4 page blocks |
| Own-survey note search | Browser / Client (on-phone match) | Database / Storage (SQLite read) | D-07: local only; API community search unchanged |
| Provider selection, key, throttle values, production safety rules | API / Backend config (`env.schema`, `app-config`, `production-rules`) | Infra (`infra/vps/env.example`, `check-env.sh`) | Same path as every other provider setting |

## Météo-France provider findings (D-08)

All statements carry a provenance tag. The `classify-confidence` seam rates the built-in web providers LOW unless a finding is cross-verified, so items confirmed on two official Météo-France pages are marked `[CITED]` (MEDIUM), single-page or inferred items `[ASSUMED]` (LOW, must be confirmed by the Wave 0 spike).

### Which product fits

| Product (portal name) | What it is | Fits "weather at a point at a past time"? |
|-----------------------|-----------|-------------------------------------------|
| **Données d'observation** (`DPObs`, base `https://public-api.meteofrance.fr/public/DPObs/`) | Raw real-time observations of active stations. Endpoints `liste-stations`, `station/horaire` (hourly, updated at round hour + 10 min), `station/infrahoraire-6m` (every 6 min), plus `synop` (every 3 h, ~1 h delay), buoys, ships. Retention 24 h, no archive, access granularity "1 station", 8-digit station ids (keep leading zeros). [CITED: confluence-meteofrance.atlassian.net/wiki/spaces/OpenDataMeteoFrance/pages/853934243 "API Ciblée Données d'Observation"] | Partly. Observed (good, matches the owner's wording), but per station, last 24 h only (SYNOP examples ask for the last 5 days), nearest station chosen by us. |
| Paquet Observations | Same data packaged for all stations (bulk) | Not needed; heavier than one point. [ASSUMED from the product name] |
| Données climatologiques (`DPClim`) | Qualified archive of all historical stations, asynchronous orders, hourly step "1h" available [CITED: confluence page above, "Climatology API gives access to the qualified archive of observations from all MF historical stations"; mfclim README via search] | Would answer a past time older than 24 h, but orders are asynchronous and the delivery delay was not found. Out of scope unless the owner wants a catch-up window beyond 24 h (O3). |
| AROME / AROME Prévision Immédiate / ARPEGE (WCS grids) | Model fields on a grid, point extraction through WCS `GetCoverage` with `lat`/`long`/time subsets; the run date cannot be more than 4 days in the past; output is grid data (GRIB2/GeoTIFF) [CITED: pypi.org/project/meteole, third-party client of the official API; EasyAcces on data.gouv.fr] | Answers any point and any time within ~4 days including total cloud cover (a sky source), but it is a model, not an observation, and needs a grid decoder. Not recommended as the default; a possible later fallback (O1). A 2026-09-03 news item reports an "anomaly in cumulative data for the AROME and ARPEGE models" [CITED: Confluence news index], which matters for a 24 h rain sum. |

**Recommendation:** DPObs, `station/horaire`, nearest active stations within a configured distance cap, the reading closest to the requested time, only when that time is within the last 24 hours. Add SYNOP only if the spike shows sky (`n`, `ww`) is wanted and available (see "Fields").

### Point and time queries

- **At a point:** no lat/lon parameter on the observation endpoints. The doc says stations are found by downloading `liste-stations` and picking the nearest one manually. [CITED: Confluence "API Ciblée Obs EN"]. The station list carries latitude, longitude and altitude columns per the client wrapper's station table [CITED: github.com/antoinetavant/meteofranceapi README]. The list refreshes hourly. So the server keeps the station list in memory (one call per hour), computes great-circle distance itself, and ranks. No PostGIS is needed (the repo avoids it: `REQ-AUD-db-tuning`).
- **At a past time:** `station/horaire` "returns the data available on the date closest to the date requested"; for a date older than the 24 h retention it "returns the oldest data available"; a future date is `400` ("The xxx parameter is a future date"). [CITED: same page]. **Consequence (Pitfall 6):** the server must compare the reading's own validity time with the requested time and reject a reading farther than a tolerance (suggest 90 minutes) instead of trusting the answer; otherwise a catch-up two days late would silently store the oldest reading of the last 24 h as "the weather of the survey".
- **Exact request parameters** (`id_station`, the date parameter name and format, `format=json|geojson|csv`) were only partly visible: `id_station` and `format` are confirmed, the date parameter name/format are not. [ASSUMED] until the spike.

### Authentication

- Account on `portail-api.meteofrance.fr` (email validated), then a free subscription per API ("Souscrire à l'API gratuitement"). [CITED: Confluence "Guide de démarrage rapide"]
- Requests carry `Authorization: Bearer <token>`; tokens are temporary, "1 hour as an example", an invalid or expired token is `401`. [CITED: same guide]
- Three ways exist in practice: a long-lived **API key**, a **token** (max 1 h), or an **application id** from which new tokens are requested dynamically (OAuth2 client credentials, token endpoint under `portail-api.meteofrance.fr/token`). The wrapper recommends the application id and says to keep it secret. [CITED: pypi/github wrapper READMEs, third party; token endpoint URL only from a search snippet of the `mfclim` README] The exact header name for the API-key option and whether DPObs offers it were not confirmed. **Server design:** accept one secret from config (an application id or an API key), cache the access token in memory until a margin before expiry, refresh once on `401`, never log the secret or the token. The subscription is valid for a period (a Home Assistant integration mentions 2 years). [ASSUMED]
- **Owner action (checkpoint):** create the portal account, subscribe to "Données d'observation", generate the credential, put it in `/home/ubuntu/cortege.env`. The researcher found and stores no key.

### Quotas and rate limits

- Quotas are per API and per account, shown under "Mes API"; beyond the quota the API answers `429`. [CITED: Confluence quota page, dated 2026-01-15, updated 2026-02-10, and the quick-start guide]
- From January 2026, as an experiment with no announced end date, APIs previously limited to 50 requests/minute get 100 requests/minute, "Données d'observations" and "Paquet Observations" among them. [CITED: Confluence page 1426423810]. The exact current quota for our account must be read on the dashboard.
- **Capacity reasoning:** one account is shared by all members. Cache the station list (1 h) and each (station, hour) reading (a past hour never changes, so cache for the 24 h retention window; the current hour about 10 minutes). Cold cost of one answer is 1 station-list call (shared) + up to 1 reading call + up to 24 calls if the 24 h rain must be summed from hourly `rr1` (O4). Add a small global concurrency cap like `MAX_CONCURRENT_IGN_CALLS = 8` (`geocoder.service.ts:19`) and map `429` and every failure to `503 weather_provider_unavailable`.

### Licence and attribution

- Data is public, free of charge, under the **Licence Ouverte d'Etalab 2.0**, source to be cited as "Météo-France". [CITED: donneespubliques.meteofrance.fr terms page names the licence; the "Source : Météo France" mention is stated by the data catalogue records found via search]. The exact obligations (source, date of last update, no implied endorsement) are the standard licence text. [ASSUMED: the licence PDF could not be read here]. The UI-SPEC's "Source : Météo-France" line plus the shown observation time cover the first two; do not write anything that suggests Météo-France endorses the app. Possible additional portal terms of use (CGU) on commercial use or redistribution were not found: the owner should read them when creating the account (O6).

### Response fields and mapping (the part to confirm)

From the official 6-minute example (GeoJSON, Point geometry, coordinates `[lon, lat]`): `geo_id_insee`, `reference_time`, `insert_time`, `validity_time` (UTC), `t`, `td`, `u`, `dd`, `ff`, `dxi10`/`fxi10` (gust, renamed `ddraf10`/`raf10` in v2), `rr_per`, soil temperatures, `vv`, `etat_sol`, `sss`, `insolh`, `ray_glo01`, `pres`, `pmer`; unavailable parameters are `null`. [CITED: Confluence "API Ciblée Obs EN"]. No units are stated on the page; the example `t` = 283.75 suggests **Kelvin** and `ff` m/s. [ASSUMED]

| App field (D-09) | Likely source | Status |
|------------------|---------------|--------|
| Temperature (°C) | `t` minus 273.15 | Unit [ASSUMED]; confirm with a real response |
| Wind (km/h) | `ff` (m/s) times 3.6 | Unit [ASSUMED] |
| Observation time | `validity_time` (UTC) | Name [CITED] |
| Rain over 24 h (mm) | Hourly product probably has `rr1` (1 h); a true `rr24` was not confirmed. Summing 24 hourly readings costs up to 24 calls. SYNOP is said to carry multi-hour precipitation [ASSUMED from training] | **Open (O4)** |
| Sky condition | Not visible in the 6-minute or hourly field lists. SYNOP (about 190 stations, every 3 h) carries total cloud cover and present weather [ASSUMED from training and the data.gouv.fr SYNOP description: "temps sensible, description des nuages"] | **Open (O2)**: expect sky empty for most points |

Rule from the UI-SPEC to keep: a provider code the map does not know leaves the sky empty, never a wrong label.

### Fallback strategy (needs the owner, flagged not decided)

1. Rank the nearest active stations (suggested cap 25 km, config) and merge per value across at most three of them: if the nearest has `t` but a `null` `rr1`, take the rain from the second. All Météo-France, still observations.
2. Beyond the cap or older than 24 h or no non-null value: answer `200` with `observation: null` and a reason (`too_old`, `no_station`, `no_data`), so the client can tell "nothing exists" (do not retry soon) from `503` (provider down, retry).
3. Not done without the owner's say: a model fallback (AROME point extraction) for sky and for points far from a station; DPClim for times older than 24 h; any non-Météo-France provider (the owner chose Météo-France).

## Standard Stack

No new runtime dependency is required. Everything below is already in the repo.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS (`@nestjs/common`, `@nestjs/config`, `@nestjs/throttler`) | 11.1.x [VERIFIED: api/package.json] | Weather controller/service, config, throttle | Already the API framework |
| `lru-cache` | in `api` deps (used by `geocoder.service.ts:3`) | Station list and reading cache with TTL | Same cache as the geocoder and cadastre tile cache |
| `class-validator` / `class-transformer` | 0.15.x / 0.5.x [VERIFIED: api/package.json] | `SurveyUpsertDto` fields, nested `weather` DTO (`@ValidateNested` + `@Type`) | Project rule: DTO validation |
| Node global `fetch` + `AbortSignal.timeout` | Node >= 22.5 [VERIFIED: engines] | Provider HTTP (pattern of `ign-http.ts`) | No HTTP client dependency |
| `pg` raw SQL | existing | Migration `023`, write sites | No ORM |
| `@cortege/ibp-domain` | workspace | Wire types, limits constants, parity case | Single source of rules and contract |
| Jest 29 + ts-jest, Supertest | existing | All tests | Existing harness |
| RN `Switch`, `Alert`, `TextInput` via `AppField`, Reanimated, Ionicons | existing (Expo 57 / RN 0.86) | Strip, fields, reveal | UI-SPEC: no new dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-entry `doubt`/`note` keys | `factors.annotations` container (recommended) | In-entry needs the domain to treat meta-only records as missing, which means `evaluateIbp` reads the keys (D-14 violated) |
| New jsonb column for annotations | `factors.annotations` | Contradicts D-01 ("no column") and needs a seventh write-site column |
| `geotiff` / GRIB decoder for AROME | DPObs stations | Adds a dependency and modelled data; not needed for the default path |
| Extracting a shared cache helper | Copy `shared()` from the geocoder | A third use of the same 20 lines justifies a small `common/` helper; either is acceptable, planner's call |

**Installation:** none.

**Version verification:** no package is added, so no registry check applies. Current versions were read from `api/package.json` and the lockfile resolution (`node_modules/@nestjs/platform-express` 11.1.21, `body-parser` 2.3.0) in this session. [VERIFIED: local files]

## Package Legitimacy Audit

No external package is installed by this phase (HTTP through global `fetch`, cache through the existing `lru-cache`). Packages mentioned only as research sources (`meteofrance-publicapi`, `meteole`, `mfclim`, `geotiff`) are third-party clients of the official API; they are **not** recommended and not to be installed. Tagged `[ASSUMED]`, disposition: not used.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | - | - | - | - | - | No install in this phase |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 Observer (field, maybe offline)                          Cortege API (NestJS)                       Third party
 ─────────────────────────────                            ───────────────────                        ───────────
 [Parcel chosen] ──(online?)──yes──► GET /v1/weather?lat&lng&at ──► AuthGuard ► SEARCH-like throttle ► WeatherService
      │ no                                                              │ cache hit (station,hour)?  ─► answer
      │                                                                 │ miss ► in-flight de-dup ► concurrency cap
      │                                                                 ▼
      │                                                      WeatherProvider (config WEATHER_PROVIDER)
      │                                                       ├─ meteofrance: liste-stations (1 h cache)
      │                                                       │     nearest N within cap ► station/horaire
      │                                                       │     ► validity_time within tolerance? ► map ──► Météo-France
      │                                                       ├─ synthetic: deterministic offline answer
      │                                                       └─ off: observation null
      │                                                                 ▼ 200 {observation|null} | 503 weather_provider_unavailable
      ▼ (empty, no error)                                               │
 weather catch-up (network returns) ◄────────────────────────────────────┘
      │ per-value merge, skip values in weather.edited, skip submitted drafts
      ▼
 local payload_json  { survey_note, weather, factors{ A..J, annotations{} } }  ── updateLocalDraft ──► SQLite (+ completion unchanged)
      │ enqueue survey_upsert (sync_version + 1)
      ▼
 POST /v1/sync ► validateSyncDto(SurveyUpsertDto: survey_note, weather(nested), factors) ► SurveysService.upsertForUser
      │                        same version? ─ classifySameVersionContent (+survey_note, weather) ─► identical | 409
      │                        higher version ► fast CTE (create/update) or locked path ► surveys.survey_note, surveys.weather, factors
      │                        submitted ► read-only check lists survey_note, weather (+ factors incl. annotations)
      ▼
 reads: GET /surveys/:id, /sync/changes, community detail, community history, parcel history ──► fields added
      ▼
 mobile display: ConditionsCard (summary), Conditions section (context), FactorsList rows (badge + note), CommunitySurvey, HistoryList, global search (own), PDF block
```

### Where the doubt and the factor note live (confirmation asked by D-05)

D-05 asks the planner to "confirm the exact key against the current factor payload". The form spec's `evidence.notes` (docs/specs/ibp-form-spec.md:556,579) belongs to the **canonical factor result** (§10.2, the server-built `factor_results` entry: `factor_id`, `observed_value_raw`, `selected_class`, `score_points`, `warnings`, no `evidence` today), not to the input `factors` payload. The current input payload is: `factors.A = { genera, native_cover_percent }`, `B = { strata_count, strata? }`, `C/D = { bmg_count, bmm_count, surface_ha }`, `E = { tgb_count, gb_count, surface_ha }`, `F = { trees_per_ha, dmh_groups? }`, `G = { open_flowering_percent }`, `H = { class_score, evidence? }`, `I/J = { type_count, types? }` (`mobile/src/hooks/useSurveyForm.ts:235-307`). A factor key exists only when the form has its scored value, because "a factor object without it is a blocking invalid input, even for a draft" (`useSurveyForm.ts:249-250`).

**Confirmed key: `factors.annotations`**, an object keyed by factor code:

```json
"factors": {
  "A": { "genera": ["Fagus"], "native_cover_percent": 60 },
  "annotations": { "A": { "doubt": true, "note": "Chêne sessile ou pédonculé ?" }, "F": { "note": "Zone dense au nord" } }
}
```

Canonical form (prevents false conflicts and spurious autosaves): include an entry only when it has content; `doubt` is present only as `true` (never `false`); `note` present only when non-empty after trim; `annotations` itself is absent when empty; keys only A to J. Reasons it beats in-entry keys: see Pitfall 1.

### Wire shape of the new survey fields (proposed names, Claude's discretion)

```json
{
  "survey_note": "Matinée fraîche, sol détrempé.",
  "weather": {
    "sky": "overcast",
    "temperature_c": 8.5,
    "wind_kmh": 12,
    "rain_24h_mm": 2.4,
    "observed_at": "2026-10-11T08:00:00Z",
    "requested_at": "2026-10-11T08:12:41Z",
    "source": "meteo_france",
    "edited": ["sky"]
  }
}
```

- `sky` in `clear | partly_cloudy | cloudy | overcast | fog | rain | thunderstorm | snow` (UI-SPEC U-09, catalogue keys). Numeric bounds as in the UI-SPEC: temperature -40..55, wind 0..350, rain 0..1000; the same bounds go in the DTO and as constants exported by `@cortege/ibp-domain`.
- `observed_at` is stored as an ISO string inside the jsonb, never as a timestamp column, so equality is by string and cannot drift.
- `requested_at` is the survey time the lookup is for (set when the parcel is first chosen, before any answer). It is required because the catch-up must ask for "the weather of the survey time, not of the reconnection time" (D-11) and `observed_at` is only known after an answer (the provider's reading time differs from the requested time by up to an hour). Persisted and synced like `edited`.
- `source`: `meteo_france` or `manual`. `edited`: the value keys the observer touched (persisted and synced: the overwrite guard must survive a restart and a late answer, UI-SPEC "Implementation notes").
- Absent or `null` `weather` = nothing; a `weather` with all values `null` and a `requested_at` is valid (parcel chosen, no answer yet). The "has weather" test for display and the PDF must check values, not the object's presence.
- Domain types: add `survey_note?: string | null` and `weather?: SurveyWeather | null` to `SurveyUpsertPayload`, `SurveyDetail`, `SyncChangeSurvey` and, on read, `CommunitySurveyDetail` (plus `factor_annotations`), `CommunitySurveyHistoryItem` and the parcel history item (`survey_note`) (`packages/ibp-domain/src/contract/survey.ts:38-92`, `sync.ts:55-75`, `public-map.ts:48-85`). `SurveyPatchPayload` is deliberately left unchanged (Pitfall 8).

### Sync semantics matrix (D-04, the research question of priority 3)

Read from `api/src/surveys/surveys.service.ts` (upsert 115-217, locked 319-564, patch 698-841, same-version resolution 920-952) and `surveys-normalize.utils.ts` (read-only fields 173-290, classification 311-323).

| Situation | Today's rule | Rule for `survey_note` / `weather` / `factors.annotations` |
|-----------|--------------|-------------------------------------------------------------|
| Same `sync_version`, body field absent/`undefined`/`null` | Skipped in `getChangedSubmittedReadOnlyFields` (`:197-200`) | Same: add `survey_note` and `weather` to `readonlyFields` (`:178-188`) and a `case` each; absent or `null` is never a change |
| Same `sync_version`, field present and different | `jsonDeepEqual` for `factors` (`:258-262`), strict equality for strings | `survey_note`: strict string equality; `weather`: `jsonDeepEqual` (key order and numeric scale safe, parsed values compared); `factors.annotations` is covered by the existing `factors` deep-equal. A difference is `conflict` (409 `sync_version_conflict`), like `factors` |
| Same `sync_version`, identical | `identical`, nothing written | Same |
| Higher version, draft | Row rewritten with `body.factors ?? existing.factors` (`:202,529`) | `survey_note`: `body.survey_note === undefined ? existing : body.survey_note` (so an older installed app that never sends the key does not wipe a note; explicit `null` clears). Same for `weather`. The mobile app always sends both keys (value or `null`) |
| Higher version, submitted | `getChangedSubmittedReadOnlyFields`: a real change is `409 survey_submitted_read_only` with `fields` (`:437-445`); identical resends accepted and only visibility/`sync_version` touched (`:447-479`) | Same through the extended `readonlyFields`; the restricted UPDATE needs no change (the new columns are not written) |
| `PATCH /surveys/:id` | Key-presence check on submitted (`getSubmittedReadOnlyFields`) | Do not add the fields to `SurveyPatchDto` (forbidNonWhitelisted rejects them, documented). The mobile app writes only through upsert/sync |
| Old installed app (no new keys) | n/a | Body has no key: no conflict, no wipe. `/v1/sync` strips undeclared fields (`sync-operation-validation.ts:23-28`), so an app **ahead** of the API would lose the note silently: deploy the API first (the pull-based deploy does this naturally) |
| `POST /v1/surveys` (ValidationPipe `forbidNonWhitelisted`) | Unknown keys are 400 (`app.setup.ts` global pipe) | Declare the fields in `SurveyUpsertDto` |

False-409 hazards specific to this phase (Pitfall 4): server-side normalisation of the note (trim, CRLF) would make a replayed body differ from the stored text. Normalise **on the phone before the payload is written** (trim, CRLF to LF, empty to `null`), store the server copy verbatim, compare strictly.

Event journal: do **not** put note text in event payloads (`upsertEventPayload`, `surveys.service.ts:305-311`); the journal and `/sync/changes` events stay as they are.

### Weather endpoint design (D-08)

- Route `GET /v1/weather?lat=&lng=&at=` in `api/src/surveys/` (CONTEXT canonical path): `weather.controller.ts` (`@UseGuards(AuthGuard)`, `@Throttle(WEATHER_THROTTLE)`), `weather.service.ts` (cache, in-flight, cap, station ranking, merge), `meteofrance-http.ts` (token + `fetch`, copy of `ign-http.ts` rules: whole-exchange `AbortSignal.timeout`, error text without URL or secret), a `WeatherQueryDto` (`lat` -90..90, `lng` -180..180 via `@Type(() => Number)`, `at` ISO string, default now). Response and error types go in a new `packages/ibp-domain/src/contract/weather.ts` (precedent: `search.ts`, `public-map.ts`).
- Response `200 { observation: { sky, temperature_c, wind_kmh, rain_24h_mm, observed_at, source: "meteo_france", station: { id, name, distance_km } } | null, reason?: "too_old" | "no_station" | "no_data" | "disabled" }`. `503 { code: "weather_provider_unavailable" }` for any provider failure, 429 included (mirrors `search_provider_unavailable`, `geocoder.service.ts:172-177`). `at` in the future is clamped to now; `at` older than 24 h is `observation: null, reason: "too_old"` **without a provider call**.
- Cache: station list 1 h; reading per (station id, UTC hour) 24 h for past hours, 10 min for the current hour; failures never cached; empty answers cached briefly. Key by station and hour, not by coordinates, so nearby surveys share an entry. In-flight de-duplication and a concurrency cap as in `geocoder.service.ts:238-257,263-284`. Cache bounded (`max` entries).
- Throttle: add `weather` to `PRODUCTION_THROTTLE_LIMITS` (suggest 30 per minute per client; one call per survey plus retries) and export `WEATHER_THROTTLE` (`rate-limit.config.ts:10-24,66-69`); update `api/test/rate-limit.config.spec.ts`.
- Logging: provider failures logged by status only (`this.logger.warn`), never coordinates of a user at 7 decimals plus time, never the key or token.
- Coordinates privacy: the client sends the parcel centre rounded to 4 decimals (about 10 m); the cache key does not need them.

### Configuration and production rules (priority 2)

Pattern read from `env.schema.ts`, `app-config.ts`, `config.types.ts`, `production-rules.ts`, `check-config.ts`, `infra/vps/*`:

- Add to `EnvironmentVariables` (all `@IsOptional() @IsString()`): `WEATHER_PROVIDER`, `METEOFRANCE_API_KEY` (or the application id; neutral name decided in the spike), `METEOFRANCE_OBS_URL`, `WEATHER_TIMEOUT_MS`, `WEATHER_MAX_STATION_DISTANCE_KM`. Parse in `loadAppConfig` into a typed `AppConfig.weather` block with `positiveInteger` defaults (like `cadastre`, `app-config.ts:117-129`). Only `app-config.ts` reads the env.
- Modes: `synthetic` (deterministic, no network: local dev and every test; set `process.env.WEATHER_PROVIDER = "synthetic"` in `api/test/setup-env.js` next to `CADASTRE_PROVIDER`), `meteofrance`, `off` (answers `observation: null`, `reason: "disabled"`).
- **Default and production safety:** `CADASTRE_PROVIDER` defaults to `synthetic` everywhere (`app-config.ts:118`). Copying that default would let an unset production value store invented weather labelled "Préremplie d'après Météo-France". Recommended: the default is `off`; `.env.example` and the local setup set `synthetic`; production is **refused** when `WEATHER_PROVIDER=synthetic` (a `findProductionProblems` entry); `meteofrance` with a blank or `CHANGE_ME` key is a **warning** (`findProductionWarnings`, like the Auth0 management credentials: weather never blocks anything, and a hard error would hold back every deploy because `update-stack.sh` runs the check and keeps the previous API on failure).
- Parity: every production rule and warning must exist in both `production-rules.ts`/`check-config.ts` and `infra/vps/check-env.sh`, proved by `api/test/check-env-parity.spec.ts` (fixtures list at `:30-44` and `:136+`); add fixtures for the new rule. Add the variables to `infra/vps/env.example` (`WEATHER_PROVIDER=meteofrance`, `METEOFRANCE_API_KEY=CHANGE_ME`) and to the env table of `CLAUDE.md`.
- `api/test/env.schema.spec.ts`, `api/test/check-config.spec.ts` and the `./src/config/` coverage ratchet (96/94/96/96, `jest.unit.config.js`) need matching cases.

### Weather prefill state machine and catch-up (mobile)

States and copy are fixed by the UI-SPEC (no parcel, loading, prefilled, edited, manual only, offline, unavailable). Research findings that constrain the implementation:

- **Where the lookup lives.** A screen-mounted hook only fills when the survey is open; D-11 says the draft fills when the network returns. Recommend a small app-level catch-up called once by `useAppController` (alongside `useNearbyParcels`; not inside or next to `useSurveySync`, per CLAUDE.md the single-sync rule only forbids a second `useSurveySync`) that scans local drafts that have parcels, `weather.requested_at`, no provider values and no hand edits, and asks the endpoint when online. A screen hook only reads and displays state. Decision left to the planner; an owner-visible consequence either way: a survey submitted offline before any answer can no longer receive weather (read-only after submit, D-03).
- **Parcel centre (D-10).** On the selection screen the app holds the tapped parcels' geometry; `cachedParcelCentre(parcels, parcelIds)` already returns the bounding-box centre (`mobile/src/map/own-surveys.ts:38-45`), with the server `display_location` of a loaded detail as second source. A parcel registered by id only (offline) has neither: the lookup waits.
- **Writes.** Route every write (`requested_at` at first parcel choice, answer merge, hand edit, "Remplir à nouveau") through the existing draft write path so `sync_version` bumps and the upsert is enqueued: extend `UpdateDraftInput`/`updateLocalDraft` (`mobile/src/storage/surveys.ts:370-483`) with optional `survey_note` and `weather` (`undefined` keeps, `null` clears), and add them to the draft patcher's `DirectDraftPatchInput` (`useSurveyDraftPatcher.ts:28-37,139-146`). `updateLocalDraft` already spreads `basePayload` (`:412`), so the form autosave (which never carries these keys) cannot erase them.
- **Per-value merge.** A late answer fills only values not in `weather.edited` and still empty; a cleared value counts as edited (UI-SPEC U-02). Numbers rounded to one decimal before storage so replays compare equal.
- **Refuse in-flight overwrites on submit.** The merge must re-read the stored draft inside the write and skip when the survey is `submitted` (`patchSurveyDraftDirectly` already refuses submitted surveys, `useSurveyDraftPatcher.ts:121-124`).
- **Retry.** On network change and app foreground (`useIsOffline`, existing); no timers while the screen is hidden.

### Mobile touch points (priority 4)

Line counts read in this session. The 400-line cap applies to `src/screens` and `src/navigation` (`structure.test.ts`).

| File | Lines | Change | Note |
|------|-------|--------|------|
| `mobile/src/screens/FactorDetailScreen.tsx` | 298 | + props and `<DoubtNoteStrip>` (~12 lines) | Strip must be its own file (UI-SPEC) |
| `mobile/src/screens/survey-form/FactorPager.tsx` | 315 | + annotations prop, keyboard hide of bar and finish row (~30) | Stays under 400; if not, extract `usePagerKeyboard.ts` |
| `mobile/src/screens/SurveyContextScreen.tsx` | 115 | + `<ConditionsSection>`, scroll to section param | |
| `mobile/src/screens/SurveyDetailScreen.tsx` | 327 | + `<ConditionsCard>` after `ScoreCard` (`:246`) | 73 lines of headroom; do not add logic here |
| `mobile/src/screens/SurveyScoreScreen.tsx` | 62 | none (rows are in `survey-detail/FactorsList.tsx`) | |
| `mobile/src/screens/survey-detail/FactorsList.tsx` | 112 | badge + clamped note per row, a11y labels | ~160 after |
| `mobile/src/screens/survey-detail/useLocalDraftSummary.ts` | 150 | `DisplayedFactorResult` gains `doubt`, `note`; read from `draft.factors.annotations` | Also used by the PDF input and the community view-model |
| `mobile/src/screens/survey-detail/useSurveyDetailData.ts` | ~150 | submitted surveys: `canonicalFactorEntries` come from `detail.factor_results` (`:57-62`); merge the annotations from the local payload | |
| `mobile/src/screens/community-survey/CommunitySurveyScreen.tsx` | 289 | Conditions block between parcels and score | |
| `mobile/src/screens/community-survey/view-model.ts` | 80 | `toFactorEntries` adds doubt/note from `detail.factor_annotations` | |
| `mobile/src/screens/survey-detail/HistoryList.tsx` | 123 | one note meta line | `HistoryListRow` entries in `app/parcel-history.ts` (276) gain `note` |
| `mobile/src/hooks/useSurveyForm.ts` | 706 | annotations state; `buildFactorsPayload` appends `annotations` when non-empty; `applyDraftToForm` reads it; reset clears | No cap on hooks, but extract `useFactorAnnotations.ts` to keep it from growing |
| `mobile/src/hooks/useEditingDraft.ts` | 371 | `storedDraftSignature` already hashes `factors` as stored (`:48-67`): no change if the canonical form round-trips | Verify with a test |
| `mobile/src/hooks/useSurveyDraftPatcher.ts` | 270 | note/weather mutators | |
| `mobile/src/storage/surveys.ts` | 703 | `updateLocalDraft` input, new `listLocalSurveyNotes()` reader | |
| `mobile/src/storage/utils.ts` | ~270 | `SurveyQueuePayload` gets the fields; completion untouched | See below |
| `mobile/src/storage/types.ts` | 196 | `SurveyQueuePayload`, `UpdateDraftInput` | |
| `mobile/src/storage/sync.ts` | 1458 | `buildSurveyPayloadFromRemote` (`:440-463`) copies `survey_note`, `weather` | Without this a pulled survey loses them and a later local edit would send `null` |
| `mobile/src/app/survey-pdf/*` | see PDF | new `conditions-section.ts`; `factor-section.ts` (209), `build-html.ts` (88), `types.ts` (149), `palette.ts` (50), `assemble-export-data.ts` (323) | |
| `mobile/src/api/ibp-api.ts` | 400 | do not grow it: new `api/weather-api.ts` | |
| `mobile/src/app/global-search.ts` | 174 | `matchOwnSurveys` gains a note source and a "matched in note only" helper | Three callers: `useGlobalSearch.ts:78`, `SearchGroupRoute.tsx:96,101` |
| `mobile/src/i18n/fr/` | index 84 | new `conditions.ts`; additions to `factor-detail.ts` (36), `survey-detail.ts` (242), `survey-export.ts` (187), `parcel-history.ts` (123), `search.ts` (109) | |
| New: `mobile/src/ui/NoteField.tsx`, `screens/factor-detail/DoubtNoteStrip.tsx`, `screens/survey-detail/conditions/*`, `app/weather.ts` (pure: sky map, formatting, merge, time parsing), `hooks/useWeatherPrefill.ts`, `api/weather-api.ts` | each well under 400 | | |

**Completion counters must not move.** `payload_completion` counts 14 slots and iterates only `FACTOR_KEYS` (`storage/utils.ts:133-168`); `payload_factors_filled` is `countFilledFactors` (`app/ibp-scoring.ts:75-78`), which goes through the package readiness over `FACTOR_KEYS`. With `factors.annotations` and the two top-level keys neither counter can change. Lock this with a regression test per write site. The four payload-write sites that recompute both counters are: `createLocalDraft` (`surveys.ts:33`), `updateLocalDraft` (`:370`), the pull insert and the pull update in `applyRemoteChanges` (`sync.ts:290-345`). `cacheSurveyCanonicalFields` (`:336`) and the visibility rewrite (`sync.ts:~764`) write the payload without recomputing; they must keep ignoring the new fields.

**Own-survey search without a SQLite migration.** `listLocalSurveys` never parses payloads (01.9 D-03) and the schema stays at 5 (D-02). `matchOwnSurveys` takes the list rows. Recommended: a dedicated reader `listLocalSurveyNotes(): { id, note }[]` run only while the search is active, kept in the search hook, returning rows that have a note (`json_extract(payload_json, '$.survey_note')` in SQL as the list already does for `scores.ibp_total`, `surveys.ts:499-502`), then match in JS with the existing `foldSearchText` (SQLite `lower()` does not fold accents). Alternative: add `survey_note` to the list SELECT for every row; simpler, but it parses every payload on every list refresh. Planner decides; the first respects 01.9 D-03.

### API touch points (priority 3 and 5)

| File | Lines | Change |
|------|-------|--------|
| `api/migrations/023_survey_note_weather.sql` | new | `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS survey_note TEXT, ADD COLUMN IF NOT EXISTS weather JSONB` plus `NOT VALID` then `VALIDATE` CHECKs as in 016 (`survey_note` length <= 1000; `weather` is NULL or a jsonb object). Metadata-only add, no default, no backfill |
| `api/src/surveys/dtos/survey-upsert.dto.ts` | 99 | `survey_note` (`@IsOptional @IsString @MaxLength`), `weather` (`@ValidateNested @Type(() => SurveyWeatherDto)`), custom constraint on `factors.annotations` |
| `api/src/surveys/surveys.types.ts` | 109 | `SurveyRow` gains the two fields |
| `api/src/surveys/surveys.repository.ts` | 464 | `SurveyFastWriteInput`, `fastWriteValues` (`:207-237`), `CREATE_SURVEY_ATOMIC_SQL` (`:249`), `UPDATE_SURVEY_IF_UNCHANGED_SQL` (`:294`). New parameters become `$26`, `$27`; the CAS token moves from `$26` to `$28` |
| `api/src/surveys/surveys.service.ts` | 1255 | `upsertForUser` (create `:125-146`, update `:185-210`), `upsertLocked` insert (`:346-384`) and update (`:497-541`); `getSurveyById` pick list (`:954-1013`) |
| `api/src/surveys/surveys-normalize.utils.ts` | 709 | `getChangedSubmittedReadOnlyFields` |
| `api/src/surveys/surveys-sync.service.ts` | 418 | `loadSyncChangeSurveys` SELECT list (`:329-361`) |
| `api/src/surveys/community-surveys.service.ts` | 256 | `getDetail` SELECT and result (`:69-162`): `survey_note`, `weather`, `factor_annotations` (`s.factors->'annotations'`); history rows: `survey_note` |
| `api/src/surveys/parcels.service.ts` | 413 | `getParcelSurveyHistory` SELECT (`:76-137`): `survey_note` |
| `api/src/surveys/weather.*` , `meteofrance-http.ts`, `surveys.module.ts` (49) | new / +2 | controller, service, providers registration |
| `api/src/config/*`, `api/src/common/rate-limit.config.ts` | see above | |
| `packages/ibp-domain/src/contract/{survey,sync,public-map,weather,index}.ts`, `src/parity/cases.ts` (710) | | wire types, limits constants (`SURVEY_NOTE_MAX_LENGTH = 1000`, `FACTOR_NOTE_MAX_LENGTH = 300`, `WEATHER_SKY_CODES`, numeric ranges), the parity pair |

Tests that pin SQL parameter numbers and must be updated with the CAS move: `api/test/surveys-upsert-fast-path.spec.ts:473-477` (`"ibp_cas3_scale = $25::boolean"`, column list string), `surveys.repository.spec.ts`.

The community and history reads that return the survey for **other** members only select `submitted` surveys (`PUBLIC_SURVEY_PREDICATE = status = 'submitted' AND deleted_at IS NULL`, `public-map.queries.ts:12`), so a draft's note is never exposed. Today every submitted survey is visible to every member (migration 017); Phase 29 will add the private/public choice at the same predicates, and the new fields follow them with no extra work.

### Recommended Project Structure
```
api/src/surveys/
├── weather.controller.ts       # GET /v1/weather, AuthGuard + WEATHER_THROTTLE
├── weather.service.ts          # cache, in-flight, cap, station ranking, merge, tolerance check
├── weather-provider.ts         # provider interface + synthetic + off
├── meteofrance-http.ts         # token + GET JSON, ign-http.ts rules
└── dtos/weather-query.dto.ts
api/migrations/023_survey_note_weather.sql
packages/ibp-domain/src/contract/weather.ts        # wire types
mobile/src/
├── app/weather.ts              # pure: sky code table, parse/format, per-value merge, time parsing
├── api/weather-api.ts          # getWeather()
├── hooks/useWeatherPrefill.ts  # state for display + catch-up trigger
├── ui/NoteField.tsx
├── screens/factor-detail/DoubtNoteStrip.tsx
├── screens/survey-detail/conditions/   # ConditionsSection, WeatherBlock, SkyChips, WeatherFields, ConditionsReadOnly, ConditionsCard
├── app/survey-pdf/conditions-section.ts
└── i18n/fr/conditions.ts
```

### Pattern 1: Provider proxy with cache, de-duplication and 503 (copy the geocoder)
**What:** one service owns the outbound call; success-only cache; shared in-flight promise per key; a counter of running calls with a cap; every failure logged without user text and rethrown as one `ServiceUnavailableException` with a business code.
**When to use:** the weather service.
**Example:** `api/src/surveys/geocoder.service.ts:184-284` (`shared()` at `:238`, `callProvider()` at `:263`, `unavailable()` at `:172`), `ign-http.ts:14-28`.

### Pattern 2: Nullable additive migration with NOT VALID then VALIDATE
**What:** `ADD COLUMN IF NOT EXISTS`, guarded `DO $$` constraint creation, `VALIDATE CONSTRAINT`; the runner wraps the file in a transaction; no `CONCURRENTLY`. The previous API keeps serving because its explicit column lists ignore the new columns.
**Example:** `api/migrations/016_ibp_method_version.sql`; rules in `api/migrations/README.md:51-60`. Test pattern: `api/test/migration-016-ibp-method-version.e2e-spec.ts` (scratch schema with 001..022 applied, seeded rows, runner applies 023 only, columns nullable, existing rows NULL, constraints validated and rejecting bad data, runner and raw second execution are no-ops).

### Pattern 3: Fixture-driven proof for "does not change the score"
Add `MAT-ANN-01@both` as two entries (same method pair as `bothVersions` in `cases.ts:75-80`): a complete direct-score set (`COMPLETE_DIRECT`, `cases.ts:51-52`) with and without `factors.annotations`, identical `expect`. The three runners iterate `IBP_PARITY_CASES` automatically (`packages/ibp-domain/src/parity.test.ts`, `api/test/ibp-parity.spec.ts`, `mobile/src/app/ibp-parity.test.ts`), so **no runner changes**; add the rows to `docs/technical/ibp-validation-matrix-v2.md` and keep the id shape `MAT-[A-Z]+-\d{2}@both` (`parity.test.ts` regex). Also add a case where a factor has a scored value **and** an annotation for that same factor, and one where annotations reference a factor with no input (must not become an issue).

### Anti-Patterns to Avoid
- **Meta keys inside a factor entry** (`{ doubt, note }` next to `{ strata_count }`): breaks drafts that have only a flag (Pitfall 1).
- **Reading `doubt` in `evaluateIbp`, the API adapter or the mobile scoring adapter** to "skip" a flagged factor: violates D-14.
- **Normalising the note on the server before storing** and comparing the raw body: false `sync_version_conflict`.
- **A default `WEATHER_PROVIDER=synthetic` in production.**
- **Calling Météo-France from the phone** or exposing the key in `EXPO_PUBLIC_*`.
- **Putting note text in `survey_events` payloads or logs.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Outbound provider call with timeout and 503 | A new HTTP wrapper | The `fetchIgnJson` rules (rename or copy as `fetchProviderJson`) | Whole-exchange timeout, no URL in errors already solved and tested (`api/test/ign-http.spec.ts`) |
| Cache + in-flight de-duplication | Ad-hoc `Map` with timers | `lru-cache` with `ttl` and the `shared()` pattern | Bounded memory, TTL, no timer leaks |
| Throttle | A counter in the service | `@Throttle(WEATHER_THROTTLE)` through `rate-limit.config.ts` | Per-client tracker and non-production lift already handled |
| Score independence from the flag | A filter in an adapter | Annotations outside the factor keys + one parity pair | Nothing to forget, nothing to reimplement |
| Same-version comparison | A hash of the payload | `jsonDeepEqual` / strict equality inside `getChangedSubmittedReadOnlyFields` | JSONB reorders keys; the existing rule already encodes this |
| Number parsing from text with comma | A regex | `parseFiniteNumberInput` (`mobile/src/app/number-utils.ts`) and `toFiniteNumberInRange` | Used by every factor field |
| HTML escaping in the PDF | `replace` calls | `escapeHtml` in `survey-pdf/html.ts` (the only escape in `mobile/src`) | Tested; the CSP blocks every load anyway |
| Accent-insensitive local match | `toLowerCase().includes` | `foldSearchText` / `normalizeSearchQuery` (`app/search-text.ts`) | Same folding as the rest of the search |
| Nearest station | A spatial database | In-memory haversine over the cached station list (a few thousand rows) | No PostGIS in the project |

**Key insight:** every hard part of this phase already has an in-repo answer (geocoder proxy, migration 016, parity fixture, factor detail arrays). The risk is deviating from them, not missing a library.

## Common Pitfalls

### Pitfall 1: A doubt stored in the factor entry blocks the draft
**What goes wrong:** a factor with a doubt and no scored input becomes `{ doubt: true }`; `evaluateIbp` reads it as a record, the scorer returns `INVALID`, the upsert gets 422 `IBP factor validation failed`, the survey stops syncing.
**Why it happens:** `isMissing` only treats `undefined`, `null`, `""` as missing (`evaluate.ts:81-83`); any other value goes to the scorer, and every `scoreFactor*` returns `INVALID` when its scored keys are absent (`rules/common.ts:141-144`, `:190-205`, `v3-2.ts:68-82`).
**How to avoid:** `factors.annotations`; never write a factor entry only to carry a flag.
**Warning signs:** 422 on `POST /sync` for a draft that only got a doubt; `factor_invalid_raw` in a draft-mode test with annotation-only entries.

### Pitfall 2: `forbidUnknownValues` rejects a nested `weather` without `@Type`
**What goes wrong:** `validateSyncDto` validates with `forbidUnknownValues: true` (`sync-operation-validation.ts:24-28`); a nested plain object that was not turned into a DTO instance is "unknown", so the whole operation is `400 invalid_sync_operation` with `fields: ["weather"]`, which is fatal and blocks the survey.
**How to avoid:** `@ValidateNested()` plus `@Type(() => SurveyWeatherDto)`; add an e2e that sends a weather through `POST /v1/sync` (not only `POST /v1/surveys`). No nested-DTO precedent exists in the repo today (`@ValidateNested` is unused), so test both entry points.

### Pitfall 3: Undeclared nested keys are silently stripped
`whitelist: true` removes properties not declared on the nested DTO on `/sync` (and rejects them on `POST /surveys`). `weather.edited` and `weather.requested_at` (needed by the overwrite guard) must be declared, or the guard silently stops working after the first sync round trip.

### Pitfall 4: False `409 sync_version_conflict` from normalisation or rounding
Server trimming, CRLF handling, number reformatting or converting `observed_at` to a timestamp column all make a replayed body differ from the stored copy. Normalise on the phone, store verbatim, compare strictly, keep `observed_at` a string, round numbers to one decimal before they enter the payload. Add an e2e that replays an identical body with note, weather and annotations at the same version (expect `synced`, no write, no new event) and one with a changed note (expect 409), alongside `surveys-same-version.e2e-spec.ts` and `sync-installed-app-compat.e2e-spec.ts`.

### Pitfall 5: The form autosave or the pull erases the new fields
`updateLocalDraft` replaces `factors` wholesale (`surveys.ts:422`) and the pull rebuilds the payload from the server row (`sync.ts:440-463`). If `factors.annotations` is not part of the form state, the first factor edit after a doubt wipes it; if `buildSurveyPayloadFromRemote` does not copy `survey_note` and `weather`, a reinstall or second device loses them. Test: type a doubt, edit another factor, autosave, reload the draft; pull a server survey that has the fields and open it.

### Pitfall 6: The provider answers for the wrong time without saying so
Older than 24 h: "returns the oldest data available" (CITED). Station list lag, a station that stopped reporting, or an hourly reading hours old would all be accepted. Always compare `validity_time` with the requested time (tolerance 90 min suggested) and the reading's age; return `observation: null` otherwise. Test with a fixture whose `validity_time` is 20 h before the request.

### Pitfall 7: Request body above 100 kB
Express JSON parsing defaults to 100 kB (`body-parser` 2.3.0 `lib/utils.js:62`; `ExpressAdapter` passes no limit, `get-body-parser-options.util.js`; `configureApp` sets none). A sync batch may carry up to 100 operations (`SYNC_BATCH_SIZE = 100`, `mobile/src/storage/db.ts:23`). A survey with a maximal note, ten maximal factor notes and weather adds up to about 4.5 kB, so around 22 such pending surveys exceed the limit; the answer is 413, which the phone classifies as "unknown" (`sync-classification.test.ts:44`) and retries. Raise the JSON limit in `configureApp` (for example 1 MB) with a test, or document why it is unnecessary.

### Pitfall 8: PATCH and the submitted read-only list drift
`getSubmittedReadOnlyFields` is typed on `keyof SurveyPatchBody` (`surveys-normalize.utils.ts:28-46`). Adding the new fields to `SurveyPatchPayload` would force PATCH support the phase does not want. Keep PATCH unchanged and extend only the upsert list `getChangedSubmittedReadOnlyFields` (typed `Exclude<keyof SurveyPatchBody, "scores">`, `:178`), which means loosening that type to a local string union.

### Pitfall 9: SQL parameter renumbering
`fastWriteValues` and the two CTE statements use positional `$n` up to `$26` (the CAS token). Inserting two columns before the token changes it to `$28`; the pinned assertions in `surveys-upsert-fast-path.spec.ts:473-477` and the call site `casToken === null ? [] : [casToken]` (`surveys.repository.ts:236`) must change together. Also the two non-CTE statements in `upsertLocked` use `$1..$22` and `$1..$19` (`surveys.service.ts:346-384,497-541`) and a restricted UPDATE for submitted surveys that must **not** gain the columns.

### Pitfall 10: Completion counters shift
Putting anything under a factor key makes `isFilledValue` count it (a lone boolean is "filled", `storage/utils.ts:24`) and moves `payload_completion`; the Accueil resume card and list ring would show a factor as started. Keep annotations out of `FACTOR_KEYS` entries and add a regression test that a payload with annotations only has completion and factors-filled identical to the same payload without.

### Pitfall 11: A catch-up fills a submitted or hand-edited survey
Three guards are needed: skip `status === "submitted"` (re-read inside the write), skip values listed in `weather.edited`, skip a draft whose `requested_at` is older than the provider window (`too_old`, answered by the endpoint). A cleared value is "edited". Test each.

### Pitfall 12: Keyboard hides the note or the bottom bar rides on the keyboard
The pager's bar and finish row are absolutely positioned (`FactorPager.tsx`, styles `bar`, `finishRow`). UI-SPEC section 2.4 hides them while the keyboard is up and adds `keyboardShouldPersistTaps="handled"`, `keyboardDismissMode="on-drag"` and `automaticallyAdjustKeyboardInsets` on each page `ScrollView`. This cannot be unit-tested for real; device pass at 320 x 568 and 360 x 640 is a required manual check.

### Pitfall 13: PDF page budget with maximal text
Block heights are estimates (`paginate.ts` `PAGE_FILL_FACTOR = 0.92`; note height is paragraph-wise `ceil(chars / charsPerLine)`). Capacity of a page body is `(840 - 60 - 40) x 0.92 = 680.8` design px (`export-settings.ts:15`, `styles.ts:51-57`; 659 for a draft with the banner). A 1000-character note is about 13 lines of 13 px plus chrome, about 230 to 260 px in one unsplittable block; ten 300-character factor notes add about 40 px each. The packer never splits a block, and the greedy packing means an under-estimate overflows a page and an over-estimate wastes white space. Verify on both platforms (manual check below) and record the measured page counts next to the other constants in `export-settings.ts`, as phase 25.1 did.

### Pitfall 14: Free text and account deletion
Account deletion anonymises retained submitted surveys by nulling `user_id` only (`users.service.ts:286-296`); a free-text note could name people. See open question O7.

## Code Examples

Only shapes and snippets that are load-bearing for the plan. No implementation.

### Migration 023 skeleton (pattern of 016)
```sql
-- Source: api/migrations/016_ibp_method_version.sql (pattern)
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS survey_note TEXT,
  ADD COLUMN IF NOT EXISTS weather JSONB;
-- guarded DO $$ ... ADD CONSTRAINT ... CHECK (...) NOT VALID; then VALIDATE CONSTRAINT (idempotent)
```

### Parity pair (shape)
```ts
// Source: packages/ibp-domain/src/parity/cases.ts (bothVersions helper, COMPLETE_DIRECT)
// MAT-ANN-01@both: factors = COMPLETE_DIRECT, and COMPLETE_DIRECT + { annotations: { A: { doubt: true, note: "x" } } }
// same expect: ok true, same scores, same totals, same issueCodes
```

### Weather mapping unit test input (fixture to capture in Wave 0)
```text
One real station/horaire response and one real liste-stations excerpt, saved under api/test/fixtures/,
with the units written next to them (K or °C, m/s), used by weather.service.spec.ts. The Confluence
example is only a 6-minute GeoJSON snippet with no units.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DPObs v1 (`/public/DPObs/v1/`, gust fields `fxi`, `dxi`, `fxi10`, `dxi10`) | v2 (`/public/DPObs/v2/`; gusts `raf`, `ddraf`, `raf10`, `ddraf10`, m/s) | v2 deployed 2026-06-08, v1 gust fields empty from 2026-06-16, **v1 discontinued 2026-12-01** [CITED: Confluence page 1688633417] | Build on `v2` from the start; the base URL must be a config value |
| Observation quota 50 requests/minute | 100 requests/minute per API per account, experimental, no end date | January 2026 [CITED: Confluence page 1426423810] | Do not size the cache on 100; read the dashboard value |
| "Observations arrive faster on the APIs" | news item dated 2026-09-02 [CITED: Confluence news index] | 2026-09 | Details not read; cache TTL for the current hour should be confirmed in the spike |

**Deprecated/outdated:** the donneespubliques.meteofrance.fr product description PDF (404 at the old path) and the old public-data portal; use the API portal and the Confluence space.

## Runtime State Inventory

Not a rename/refactor/migration-of-existing-data phase (additive nullable columns, no backfill). Omitted by rule. Stated explicitly for the planner: nothing stored under a renamed key; existing local payloads and server rows simply lack the new fields (absent = no value); no SQLite migration (D-02); no OS-registered state; no new secret in git (the Météo-France credential is runtime-only in `/home/ubuntu/cortege.env`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DPObs hourly/6-minute `t` is in Kelvin and `ff` in m/s | Fields | Wrong conversion stored as real data; fixed by the Wave 0 spike. Spike 2026-10: confirmed (`t` in Kelvin, `ff` in m/s, `rr1` in mm; real captures in `api/test/fixtures/meteofrance/README.md`) |
| A2 | The hourly station product has no sky or 24 h rain field; SYNOP has cloud cover, present weather and multi-hour precipitation | Fields | Sky/rain design changes (O2, O4); spike decides. Spike 2026-10: confirmed (the hourly product has `rr1` only and a sky field `n` that was `null` in 4 of 4 readings; SYNOP carries `n`, `ww` and `rr24`, see `api/test/fixtures/meteofrance/README.md`) |
| A3 | API-key and application-id credentials both work for DPObs; the token endpoint is under `portail-api.meteofrance.fr/token` and tokens last 1 h | Authentication | Token code differs; spike. Spike 2026-10: wrong, see api/test/fixtures/meteofrance/README.md (the portal credential was a 1 hour bearer token and the `apikey` header was refused; the application-id flow, D-27, is still unverified against the real portal) |
| A4 | The date request parameter of `station/horaire` is ISO-8601 and accepts the instants we send | Point and time | Endpoint cannot select a time; spike. Spike 2026-10: confirmed (`date`, ISO 8601 UTC; the API also answered 30 hours and, reported, 96 hours back, see `api/test/fixtures/meteofrance/README.md`) |
| A5 | Licence Ouverte 2.0 obligations are: cite the source and (if possible) the date of last update, no implied endorsement; no extra portal CGU limits apply | Licence | A restriction on redistribution/commercial use could block shipping weather values to the PDF; O6. Spike 2026-10: not verified, the owner has not reported the portal terms yet (O6), see `api/test/fixtures/meteofrance/README.md` |
| A6 | A 25 km station-distance cap and a 90 minute time tolerance are acceptable | Fallback | Too tight gives mostly empty weather, too loose gives misleading values; tune with the owner. Spike 2026-10: wrong, see api/test/fixtures/meteofrance/README.md (25 km leaves the Landes test point empty by 0.13 km, 30 km is proposed; the 90 minute tolerance was not exercised by the spike) |
| A7 | Express 100 kB JSON default applies to the deployed API (no reverse proxy override) | Pitfall 7 | If Caddy or another layer already lifts it, only the first limit matters; `body-parser` default is verified, deployment config not read |
| A8 | `WEATHER_THROTTLE` of 30 per minute per client is enough | Endpoint design | Too low produces 429 on busy mornings; adjust |
| A9 | Subscription validity of about 2 years | Authentication | A silent expiry would turn weather off; add a calendar reminder or a log warning. Spike 2026-10: not verified, the subscription validity was not reported by the owner, see `api/test/fixtures/meteofrance/README.md` |
| A10 | Mapping of SYNOP present-weather codes to the 8 app sky values follows WMO table 4677 groups (fog 40-49, rain/drizzle 50-69 and 80-84, snow 70-79 and 85-86, thunderstorm 95-99) | Fields | A wrong group mislabels the sky; tested against fixtures. Spike 2026-10: not verified, `ww` was only seen as 0 or `null` in the sample, see `api/test/fixtures/meteofrance/README.md` |

## Open Questions

Owner questions (product decisions, flagged not decided):

1. **O1 Point accuracy.** Observations are per station: "weather at the parcel" becomes "weather of the nearest Météo-France station within N km". Accept, or also allow a model (AROME) fallback for far points? Recommendation: accept stations only; show nothing beyond the cap.
2. **O2 Sky condition.** The hourly station product probably has no sky field; only SYNOP stations (about 190) do. Recommendation: fill sky only when a nearby SYNOP station within the cap reports it, otherwise leave it empty (the observer taps a chip). Confirm in the spike before promising it in the UI copy ("Préremplie").
3. **O3 Catch-up window.** The observation API keeps 24 h. A survey whose connection returns after 24 h gets no weather (stays empty, no error) unless the climatology archive is used (asynchronous orders). Recommendation: accept 24 h for V1.
4. **O4 Rain over 24 h.** Either sum 24 hourly readings (up to 24 provider calls per cold station-hour, heavily cached), use SYNOP multi-hour precipitation where present, or relabel the value to what the station really gives (for example rain over the last hour). Recommendation: decide after the spike shows the real fields; the UI-SPEC labels say "Pluie sur 24 h".
5. **O5 Account and key.** The owner creates the portal account, subscribes to "Données d'observation", and places the credential in `/home/ubuntu/cortege.env`. Needed before Wave 0 can finish.
6. **O6 Portal terms (CLOSED 2026-10-12, D-31: the owner read the licence; free reuse including commercial, source and date of the data mandatory, 24 h retention, no availability guarantee).** Read the portal's terms of use for any limit on storing the values in survey records and PDFs shared with partners (Phase 33 shares the PDF with patrons).
7. **O7 Free text and erasure.** Account deletion keeps submitted surveys and, with them, the notes. Accept, or null the notes of a deleted account.

Planner-level questions:

8. **Where does the catch-up run** (app-level in `useAppController` vs screen-level)? Recommendation above: app-level.
9. **Own-survey note search source**: dedicated reader vs extra list column. Recommendation: dedicated reader.
10. **Bar and finish-row hiding on keyboard** may push `FactorPager.tsx` toward 400 lines; extract a hook if so.
11. **Single write path for instant doubt toggle.** The UI-SPEC wants an immediate write; the form autosave is debounced at 900 ms (`useEditingDraft.ts:177`). Use the existing `handleFlushDraft` (D-26, `:336-360`) on toggle, or accept the debounce (the draft is local, the risk is only an app kill within 900 ms).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All workspaces | yes | v22.22.3 | - |
| npm | All | yes | 10.9.8 | - |
| Docker | Compose for local DB | yes | 29.4.3 | - |
| PostgreSQL (local, port 5432) | API e2e on `ibp_test`, migration test | yes (`pg_isready`: accepting connections) | 16 expected | `docker compose -f infra/docker-compose.yml up -d` |
| Xcode tools (`xcrun`) | iOS simulator checks | yes | - | - |
| Android SDK platform-tools (`adb`) | Android emulator checks (AVD Pixel_8 per memory) | yes | - | - |
| Météo-France portal account + subscription + credential | Real weather path, Wave 0 spike | no (owner action, O5) | - | `WEATHER_PROVIDER=synthetic` for all development and tests; the spike and the VPS value wait on the owner |
| Outbound internet from the VPS to `public-api.meteofrance.fr` | Production weather | not verified | - | `off` mode answers `observation: null` |

**Missing dependencies with no fallback:** none for building and testing (synthetic mode). The real-provider verification needs the owner's credential.
**Missing dependencies with fallback:** Météo-France credential (synthetic for dev/tests).

## Validation Architecture

`.planning/config.json` has no `workflow.nyquist_validation` key (only `_auto_chain_active: false`), so this section is enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29 + ts-jest in every workspace; Supertest for API e2e |
| Config files | `packages/ibp-domain/jest.config.js` (coverage thresholds 100%), `api/jest.unit.config.js` (ratchets per directory), `api/jest.config.js` (e2e, database `ibp_test`, drops and re-migrates before each run), `mobile/jest.unit.config.js` |
| Quick run (per task) | `npm --workspace @cortege/ibp-domain run test`; `npm --workspace api run test:unit -- --testPathPattern <name>`; `npm --workspace mobile run test:unit -- <name>` |
| Full suite | `npm run test:unit` and `npm run test:e2e` (requires running Postgres), then `npm run lint`, `npm run typecheck`, `npm run format:check` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-C-doubt-flag | Same survey with/without annotations gives identical scores, totals, issue codes in package, API adapter, mobile adapter | unit (parity) | `npm run test:unit` (runs `parity.test.ts`, `ibp-parity.spec.ts`, `ibp-parity.test.ts`) | cases to add in `packages/ibp-domain/src/parity/cases.ts`; runners exist |
| REQ-C-doubt-flag | Annotation-only factor entry never produces `factor_invalid_raw` in draft mode | unit | `npm --workspace @cortege/ibp-domain run test` | Wave 0 (add to `evaluate.test.ts` / parity) |
| REQ-C-conditions-sync | Migration 023: columns nullable, existing rows NULL, constraints reject over-long note and non-object weather, runner and second execution are no-ops | e2e | `npm --workspace api run test:e2e -- --testPathPattern migration-023` | Wave 0: `api/test/migration-023-survey-note-weather.e2e-spec.ts` |
| REQ-C-conditions-sync | Upsert/sync round trip of `survey_note`, `weather`, `factors.annotations`; read back by `GET /surveys/:id` and `/sync/changes` | e2e | `... --testPathPattern surveys-note-weather` | Wave 0: new `api/test/surveys-note-weather.e2e-spec.ts` |
| REQ-C-conditions-sync | Same-version: identical replay synced no write; changed note/weather/annotation 409; absent keys no conflict; installed-app payload unchanged | e2e | `... --testPathPattern "surveys-same-version\|sync-installed-app-compat"` | exist; extend |
| REQ-C-conditions-sync | Submitted: changed note/weather/annotation `survey_submitted_read_only` with `fields`; identical resend accepted | e2e | `... --testPathPattern surveys-submit` | exists; extend |
| REQ-C-conditions-sync | Nested `weather` through `/v1/sync` accepted; over-length note, bad sky, out-of-range number rejected 400 (`invalid_sync_operation`) | e2e / unit | `... --testPathPattern sync-validation` | exists; extend |
| REQ-C-conditions-sync | Fast-path SQL parameter numbering with the new columns | unit | `npm --workspace api run test:unit -- --testPathPattern "surveys-upsert-fast-path\|surveys.repository"` | exist; update pinned strings |
| REQ-C-survey-note, REQ-C-factor-note | Community detail and both history reads return note, weather, annotations for submitted surveys only | e2e | `... --testPathPattern "community-survey-detail\|parcel-history"` | exist; extend |
| REQ-C-weather-provider | Station ranking, distance cap, time tolerance, `too_old` without provider call, per-value merge, cache hit, de-duplication, concurrency cap, 503, token refresh on 401, no secret in logs | unit | `... --testPathPattern weather` | Wave 0: `api/test/weather.service.spec.ts`, `meteofrance-http.spec.ts` (fetch mocked as in `geocoder.service.spec.ts:230-241`) |
| REQ-C-weather-provider | Controller: auth required, DTO bounds, throttle metadata, synthetic answer deterministic | unit + e2e | `... --testPathPattern "weather.controller\|weather"` | Wave 0 |
| REQ-C-weather-provider | Config: env schema, defaults, `synthetic` refused in production, warning when key blank, parity with `check-env.sh` | unit | `... --testPathPattern "env.schema\|check-config\|check-env-parity"` | exist; extend |
| REQ-C-weather-provider | Throttle kind `weather` | unit | `... --testPathPattern rate-limit.config` | exists; extend |
| REQ-C-factor-note, REQ-C-doubt-flag | Canonical annotations round trip: form state to `factors.annotations`, load back, no autosave on unchanged open; completion and factors-filled unchanged by annotations at all four write sites | unit (sqlite) | `npm --workspace mobile run test:unit -- "useSurveyForm\|useEditingDraft\|surveys.completion"` | exist; extend |
| REQ-C-weather-prefill | Pure merge and state machine (no parcel, loading, prefilled, edited, manual, offline, unavailable), `edited` persistence, refill, catch-up uses `requested_at`, skips submitted and edited | unit | `... mobile ... weather` | Wave 0: `app/weather.test.ts`, `hooks/useWeatherPrefill.test.ts` |
| REQ-C-conditions-sync | Pull builder copies `survey_note`, `weather`; pull never overwrites pending local work (unchanged) | unit (sqlite) | `... sync.pull` | exists; extend |
| REQ-C-survey-note | Own-survey search matches the note, folds accents, reports "matched in note only"; community search unchanged | unit | `... "global-search\|useGlobalSearch\|SearchGroupRoute"` | exist; extend |
| UI (all) | Conditions section (edit/read-only), strip states, `NoteField` counter and maxLength, `ConditionsCard`, factor rows badge and clamped note, community block, history note line, a11y labels | component | `... "Conditions\|DoubtNoteStrip\|NoteField\|FactorsList\|CommunitySurvey\|HistoryList\|FactorPager"` | Wave 0 for the new ones; `FactorPager.test.tsx` (582 lines) extends |
| D-18 | No em dash, abbreviation gate, user-facing literal gate, 400-line cap, motion and icon gates | source gates | `npm --workspace mobile run test:unit -- __checks__` | exist |
| Contrast | `colors.ochre` switch track vs glass fill and `warningSoft` in both schemes (3:1); PDF `warning`/`warningSoft` against `paper` | unit | `... "visual-tokens\|palette"` | exist; extend |
| REQ-C-survey-note, REQ-C-factor-note, REQ-C-doubt-flag | PDF: conditions block omitted when empty, escaping of `<`, `&`, quotes, line breaks kept, clamps (1000/300), height estimate at the maximal fixture, badge in factor head | unit | `... "conditions-section\|factor-section\|build-html\|paginate\|palette"` | Wave 0 for `conditions-section.test.ts`; others extend |

### Manual (device) checks, required and not automatable
1. **PDF page budget.** Fixture survey: 1000-character note (include line breaks), ten 300-character factor notes, ten doubts, weather. Export on the iOS simulator and the Android emulator, for a submitted survey and a draft: at most one page more than the same survey without them, no text cut at a footer, no overlap. Record page counts and a page image per platform beside the constants in `mobile/src/app/survey-pdf/export-settings.ts`.
2. **Keyboard.** Factor note field and counter fully visible above the keyboard at 320 x 568 (iPhone SE class) and 360 x 640 (Android); bottom bar and finish row hidden while typing and back after; number pads dismissed by drag on iOS; Conditions fields on the context page scroll into view.
3. **Offline weather catch-up.** Airplane mode, choose the parcel, confirm the weather section is empty and calm, leave the app, return online hours later (within 24 h): the draft fills with the weather of the survey time, not of the reconnection time, and a value edited by hand before is untouched. Then submit offline first and confirm no late fill.
4. **Real provider from the VPS** (owner credential): one real answer end to end; confirm units and the attribution line.
5. **Interaction budget.** Entering a full survey without touching the strip costs the same taps and swipes as before (phase 12 budget, about 40).
6. **Screen reader and Dynamic Type** at the largest size on the strip row, weather fields and score rows (UI-SPEC accessibility contract).

### Sampling Rate
- **Per task commit:** the targeted test file(s) of the touched workspace plus `npm run lint` on that workspace; domain changes always run `npm --workspace @cortege/ibp-domain run test:coverage` (100% thresholds).
- **Per wave merge:** `npm run test:unit`, the e2e files touched in the wave, `npm run typecheck`, `npm run format:check`.
- **Phase gate:** full `npm run test` (unit + e2e), lint, typecheck, format, mobile source gates, the six manual checks, then `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] Provider spike with the owner's credential: capture real `liste-stations` and `station/horaire` (and, if useful, SYNOP) responses as fixtures; record units, field names, token flow, the date parameter, real quota; update this research and the UI copy ("Préremplie" claims) accordingly.
- [ ] `api/test/migration-023-survey-note-weather.e2e-spec.ts` (pattern of migration 016/022).
- [ ] `api/test/surveys-note-weather.e2e-spec.ts` (round trip, same version, submitted, sync entry).
- [ ] `api/test/weather.service.spec.ts`, `meteofrance-http.spec.ts`, `weather.controller.spec.ts` and `WEATHER_PROVIDER=synthetic` in `api/test/setup-env.js`.
- [ ] `MAT-ANN-01@both` pair in `parity/cases.ts` and the matrix v2 doc rows.
- [ ] Mobile: `app/weather.test.ts`, `useWeatherPrefill.test.ts`, strip/section/card component tests, PDF `conditions-section.test.ts`.
- [ ] Contrast test additions in `visual-tokens.test.ts` and `palette.test.ts`.

## Security Domain

`security_enforcement` is not set in `.planning/config.json` (absent = enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no change | Existing Auth0 RS256 `AuthGuard`; the weather route requires it |
| V3 Session Management | no | - |
| V4 Access Control | yes | Notes/weather of other members are returned only by the existing submitted-survey predicates (`PUBLIC_SURVEY_PREDICATE`); a draft's note is never in a community or history read; owner reads use `user_id = $2` |
| V5 Input Validation | yes | `class-validator` in `SurveyUpsertDto` (length caps 1000/300, sky `@IsIn`, numeric ranges, ISO `observed_at`, `edited` enum array, annotation keys A to J only, entry shape), `WeatherQueryDto` (`lat`, `lng`, `at`); jsonb CHECK constraints as defence in depth; PDF text through `escapeHtml` and the print CSP |
| V6 Cryptography | no new | The provider credential is a secret held in env only; never hand-roll token handling beyond the OAuth2 call |
| V8 Data Protection | yes | Free text may contain personal data (O7); no note text in events, logs or error messages; the credential and tokens never logged |
| V12 Files / V13 API | yes | Outbound URL comes only from config (no user-supplied host or path: SSRF); coordinates validated numerically; fixed timeout; response parsed defensively (`asRecord`-style, as `geocoder.service.ts:34-67`) and no raw provider object forwarded |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection through note or weather | Tampering | Parameterized queries only (`$n` binds, jsonb via `JSON.stringify` + `::jsonb`); the repo's ESLint rule `sql-no-unsafe-interpolation` stays on |
| Stored HTML/script in a note rendered in the PDF | Tampering / Elevation | Every dynamic string through `escapeHtml`; CSP meta blocks every load; `white-space: pre-wrap`, `overflow-wrap: anywhere` |
| Oversized note or weather object (storage, memory, 413) | DoS | `maxLength` on the field, DTO `@MaxLength`, jsonb/size CHECK, body size limit decision (Pitfall 7) |
| Provider quota exhaustion by one noisy client | DoS | Per-client `weather` throttle, shared cache by (station, hour), concurrency cap, 503 not retry storm |
| Provider outage or slow response blocking sync | DoS | Weather is a separate endpoint and never on the sync path; timeout; phone treats failure as a calm empty state |
| Secret leakage (key, token) in logs, errors, git, mobile bundle | Information disclosure | Env-only, redacted errors (status only), `check-env.sh` reports blank/placeholder, nothing under `EXPO_PUBLIC_*` |
| Stale or wrong-time data stored as truth | Tampering (integrity) | Time-tolerance check, `source`/`edited` provenance, "Source : Météo-France" shown only for provider values |
| Cross-member exposure of private notes | Information disclosure | Community/history reads stay limited to `submitted`; revisit with Phase 29 |

## Project Constraints (from CLAUDE.md)

- IBP rules live once in `@cortege/ibp-domain`; never reimplement a rule, allowed score set or factor-key list in `api` or `mobile`. The doubt must not be read by `evaluateIbp` or either adapter (D-14).
- All user-facing text from the typed French catalogue `fr` (`mobile/src/i18n/fr/`, one module per area); no em dash (U+2014) anywhere under `mobile/src` (`catalogue-dash.test.ts`); abbreviations only units, OK, PDF, GPS, "ex." (`abbreviations.test.ts`); literals in `src/i18n` only (`structure.test.ts`).
- 400-line cap on `src/screens` and `src/navigation`; hex/`rgba(` only in the five token files; colours only through `useBrandTheme()`; Ionicons outline glyphs only; motion through `brandMotion` with `ReduceMotion.System`; haptics only through `ui/feedback.ts`.
- `useSurveySync` is called exactly once, by `AppStateProvider`; read state through context hooks; action objects stable.
- SQLite `user_version` stays 5 (D-02). Mobile payload writes recompute `payload_completion` and `payload_factors_filled` at the four sites.
- API: raw SQL via `pg`, no ORM; DTOs use `class-validator`; migrations are numbered files in `api/migrations/`, never edit a shipped one; config only through `app-config.ts`; `process.env` is read nowhere else.
- Docs to update with the change: `docs/technical/api-contract-v1.md`, `data-contract-v1.md`, `sync-conflict-resolution-v1.md` (Case B field list, line 27), `ibp-validation-matrix-v2.md`, `ibp-form-spec.md` section 10, `CLAUDE.md` (env table, module table, key files), `infra/vps/env.example` and the VPS README.
- Before committing: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run format:check`.
- Prod is test data (memory): no two-step migration, no care for installed clients beyond the existing compatibility tests; deploy API before the app.
- The API sends no email; do not add SMTP or `EmailService`.
- No secrets in git; the weather credential is a runtime value on the VPS only.

## Documents to update (priority 5)

| Document | Section |
|----------|---------|
| `docs/technical/data-contract-v1.md` | Section 3 Survey: optional fields `survey_note`, `weather` (migration 023), the `factors.annotations` container, consistency rules (line 309 read-only list) |
| `docs/technical/api-contract-v1.md` | `POST /surveys` request and field notes (`:259-380`); new "Factor annotations (phase 27)" subsection next to "Factor detail arrays" (`:662`); `GET /surveys/{id}` (`:438`); `GET /sync/changes` (`:970`); community detail and history (`:1224`, `:1458`); a new `GET /weather` section and `weather_provider_unavailable` in Standard Error Codes (`:1563`) |
| `docs/technical/sync-conflict-resolution-v1.md` | Case B compared field list (line 27) and the submitted read-only sentence (line 38) |
| `docs/technical/ibp-validation-matrix-v2.md` | New `MAT-ANN-01@both` rows; the fixture header comment |
| `docs/specs/ibp-form-spec.md` | Section 10.1/10.2: `survey_note`, `weather`, annotations (the `evidence.notes` entry stays the canonical-result shape) |
| `docs/specs/epic-c-ibp-survey-data-entry.md`, `user-stories.md` | One story each for note, weather, doubt |
| `api/migrations/README.md` | Nothing to change (rules unchanged); migration number is 023 (last file is 022) |
| `CLAUDE.md`, `infra/vps/env.example`, `infra/vps/README.md` | Env vars, module table, deploy note about adding the credential |

## Sources

### Primary (HIGH confidence, read in this session)
- Repository code and docs: `api/src/surveys/{surveys.service,surveys.repository,surveys-normalize.utils,surveys-sync.service,community-surveys.service,parcels.service,geocoder.service,ign-http,search.controller,sync-operation-validation}.ts`, `api/src/surveys/dtos/survey-upsert.dto.ts`, `api/src/config/*`, `api/src/common/rate-limit.config.ts`, `api/src/app.setup.ts`, `api/src/users/users.service.ts`, `api/migrations/{016,017,022,README}`, `api/test/{migration-016,check-env-parity,setup-env.js,jest configs}`, `infra/vps/{env.example,check-env.sh}`, `infra/docker-compose.vps.yml`, `packages/ibp-domain/src/{evaluate,readiness}.ts`, `rules/{common,v3-0,v3-2}.ts`, `contract/*`, `parity/cases.ts`, `mobile/src/{hooks/useSurveyForm,useEditingDraft,useSurveyDraftPatcher}.ts`, `storage/{surveys,sync,utils,types}.ts`, `screens/*`, `app/survey-pdf/*`, `app/global-search.ts`, `docs/technical/{sync-conflict-resolution-v1,api-contract-v1,data-contract-v1}.md`, `docs/specs/ibp-form-spec.md`
- `node_modules/body-parser` 2.3.0 (`lib/utils.js:62`, 100 kB default) and `node_modules/@nestjs/platform-express` 11.1.21 (`express-adapter.js`, `get-body-parser-options.util.js`)

### Secondary (MEDIUM confidence, official Météo-France pages fetched)
- [API Ciblée Données d'Observation (EN)](https://confluence-meteofrance.atlassian.net/wiki/spaces/OpenDataMeteoFrance/pages/853934243/API+Cibl+e+Obs+EN) - endpoints, 24 h retention, closest-date behaviour, station ids, 6-minute field list, formats, OAuth2 bearer
- [Doublement des quotas d'utilisation pour de nombreuses APIs](https://confluence-meteofrance.atlassian.net/wiki/spaces/OpenDataMeteoFrance/pages/1426423810) - 50 to 100 requests/minute from January 2026, listed APIs, 429
- [Guide de démarrage rapide](https://confluence-meteofrance.atlassian.net/wiki/spaces/OpenDataMeteoFrance/pages/1447788546/Guide+de+d+marrage+rapide+d+couvrir+les+APIs+de+M+t+o-France) - account, free subscription, bearer token 1 h, 401/429
- [Gust nomenclature change, Observations API v2](https://confluence-meteofrance.atlassian.net/wiki/spaces/OpenDataMeteoFrance/pages/1688633417) - v2 path, field renames, v1 end 2026-12-01
- [Open data space overview](https://confluence-meteofrance.atlassian.net/wiki/spaces/OpenDataMeteoFrance/overview) - news items (observations faster 2026-09-02, AROME cumulative anomaly 2026-09-03)
- [Données Publiques de Météo-France, textes officiels](https://donneespubliques.meteofrance.fr/?fond=dossier&id_dossier=1) - Licence Ouverte d'Etalab named

### Tertiary (LOW confidence, third-party or search snippets, to confirm in the spike)
- Client wrappers: [meteofrance-publicapi](https://pypi.org/project/meteofrance-publicapi), [github.com/antoinetavant/meteofranceapi](https://github.com/antoinetavant/meteofranceapi) (credential options, station table columns), [meteole](https://pypi.org/project/meteole/) (AROME point extraction, 4-day run limit), `mfclim` README via search (token endpoint, DPClim steps)
- Search results on SYNOP content (data.gouv.fr datasets), Etalab licence summaries (licence PDF unreadable here), Home Assistant integration (subscription validity)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependency; everything read in the repo
- Architecture and sync/contract analysis: HIGH - read line by line, every rule traced to code
- Storage decision (`factors.annotations`): HIGH - the failure of the alternative is demonstrable from `evaluate.ts` and `useSurveyForm.ts`
- Météo-France product fit and limits: MEDIUM - confirmed on official Confluence pages
- Météo-France response fields, units, parameters, auth details: LOW - not visible in fetched text; spike required
- Pitfalls: HIGH for code-derived ones (1, 2, 3, 5, 7, 9, 10), MEDIUM for provider-derived ones (6, 11 provider side)

**Research date:** 2026-10-11
**Valid until:** 2026-11-10 for the code analysis (stable, but re-check after Phase 28/29 touch survey reads); Météo-France API details 14 days (v1 shutdown 2026-12-01, quota experiment, news items in flux).
