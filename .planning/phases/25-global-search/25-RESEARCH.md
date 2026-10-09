# Phase 25: Global Search - Research

**Researched:** 2026-10-09
**Domain:** One search page over local surveys, community surveys and members (own Postgres), places (IGN Géoplateforme geocoder through our API) and cadastral parcels (IGN API Carto through our API), plus the mobile navigation, offline and Explorer-focus plumbing it needs.
**Confidence:** HIGH on the IGN facts (live calls made today, 2026-10-09) and on the repo facts (read in code); MEDIUM on three small items listed in the Assumptions Log.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (owner, 2026-10-09):** No header magnifier anywhere on iOS: the native iOS 26 search tab (already in the tab bar, `role: "search"`) is the only entry. On Android and the JS tab tree (Expo Go), the same search page is a fourth tab in the bottom navigation bar with a magnifier icon, so it is reachable from every tab in one tap, like on iOS. One search page, one stack (`SearchStack`). Sketch 013 variants A, B and C are not retained as drawn; the choice replaces them. No search field on Explorer.
- **D-02:** Results page = sketch 014 variant C (owner choice): a "Meilleur résultat" card on top (rule: a valid parcel number first, then the first place, then a survey; member name gives the member card), then the groups stacked (Mes relevés, Communauté, Lieux, Parcelles), three rows each with "Voir les N". Empty groups disappear.
- **D-02b:** States = sketch 015 variant A (owner choice): start page with recent searches (kept on the phone); no-result message; offline = one plain line per network group ("Connexion nécessaire ..."), local results always shown; one group failing shows its error and "Réessayer" inside that group only.
- **D-02c:** The Android bottom tab icon, its label and the iOS/Android parity of the page still go through a UI contract (`/gsd-ui-phase 25`); the Android tab needs a short sketch or board update only if the owner wants to see the bar before build.
- **D-03:** Own surveys by survey name (site name), from local data, offline.
- **D-04:** Community: surveys of other members by survey name AND by member (author display name). "User search" = finding members' surveys through their name; no member profile page is added (that would be a new capability). Server side, via the existing `GET /public/community-surveys?q=` (already searches site name and author name) or an evolution of it.
- **D-05:** Places and addresses: a typed place name or address resolves to a map position; tapping a result opens Explorer centred there.
- **D-06:** Parcels by cadastral parcel number (commune, section, number; the parser `parseParcelIdu` and the `parcels.controller` lookup already exist server side); tapping a result opens Explorer on that parcel.
- **D-07:** Not searched in this phase: IBP factors, genera, settings, screens (see Deferred).
- **D-08:** Place and address search uses the IGN geocoding service, the same provider family as the cadastre, called through our own API (rate limit and short cache, like `cadastre-provider.service.ts`), never directly from the phone. Expected cost: nothing recurring (no key, no paid plan), inside the ~EUR 346/yr budget. The researcher MUST confirm the current IGN usage terms, rate limits and endpoint before planning; if they changed, come back to the owner.
- **D-09:** A paid provider and the public OpenStreetMap service were rejected (recurring cost; usage policy).
- **D-10:** Offline, own surveys are shown immediately. The community, place and parcel groups stay visible with a plain line saying they need a connection; they are never hidden and never hide the local results.
- **D-11:** Results are grouped by type with a bounded count per group, debounced input, and empty, no-result and error states, all text from the French catalogue (`mobile/src/i18n/fr`, no em dash).

### Claude's Discretion

Debounce delay, per-group result limits, group order, the exact API shape (new `GET /v1/search` or per-group calls), caching details.

### Deferred Ideas (OUT OF SCOPE)

- Searching IBP factors, genera and settings/screens (SEED-003 mentioned them; owner did not select them 2026-10-09). Candidate for a later phase.
- A member profile page (needed only if "search by user" should open a profile rather than their surveys).

The approved UI contract (`25-UI-SPEC.md`, decisions U-01..U-16) is treated as binding too; the only places this research proposes a change to it are flagged "UI-SPEC adjustment" below.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-B-global-search | One search covers the whole app: own surveys, other members' surveys, places and parcels on the map, grouped results that lead straight to the item | IGN geocoder + API Carto verified live (sections "IGN geocoding" and "Parcel search"); per-group API design; mobile navigation, offline and Explorer-focus plumbing; validation map |
</phase_requirements>

## Summary

**D-08 stays valid as decided: cost 0, no key, inside the budget.** The IGN Géoplateforme geocoder is `https://data.geopf.fr/geocodage/search` (and `/reverse`, which the repo already calls). Today, 2026-10-09, a plain unauthenticated GET answered 200 in about 60 to 300 ms. The documented limit is 50 requests per second per source IP (cartes.gouv.fr guide and the data.gouv.fr dataservice page; the live response also carries `ratelimit-limit: 50`). All calls will come from the one VPS IP, so a short in-process cache plus our own per-user throttle keeps us orders of magnitude under it. No usage terms specific to the geocoder are published; the data.gouv.fr page only gives the generic Licence Ouverte 2.0 and "Ouvert" access. Nothing found forbids a server-side proxy (the repo already proxies IGN reverse, API Carto and WFS). The legacy `api-adresse.data.gouv.fr` host was retired in favour of this endpoint, and the repo does not use it. Nothing changed against the CONTEXT assumptions, so no return to the owner is needed for D-08.

**Four things in the live check change the plan and are flagged loudly:**
1. **Parcel by number must NOT go through the geocoder's `parcel` index.** Its free text `q` only accepts a complete 14-character IDU; "AB 0123", "77186 AB 0123" and "Fontainebleau AB 0123" return zero features. Its structured filters work but demand `departmentcode` AND `municipalitycode` split from the INSEE code (DOM codes such as 97411 fail), and `q`-less department-only queries answer 400. The repo already has the better tool: **IGN API Carto `/api/cadastre/parcelle?code_insee&section&numero`** (`resolveGeometryFromApiCarto` / `lookupParcelById` in `cadastre-provider.service.ts`) returns the polygon, the IDU and the commune name (`nom_com`) in one call. Use API Carto for the parcel; use the geocoder only to turn a typed commune name into an INSEE code (`type=municipality`).
2. **The geocoder `score` is not a confidence signal.** "marie" returns a commune at 0.97, "dupont" a street in Lavardac at 0.95, "rambouillet" 1.0. The UI-SPEC rule U-08 ("first place when score is at or above a threshold") would put a commune card above the member card for ordinary first names and surnames. See "UI-SPEC adjustment 1".
3. **The `poi` index is worth enabling** (forests, summits, lieux-dits such as "Forêt Domaniale de Rambouillet", "Mont Ventoux"), which is exactly what field ecologists type. Its feature shape differs from `address` (arrays, no `label`, no `type`). `index=address,poi` mixes both in one call.
4. **Geocoder input limits:** `q` must be 3 to 200 characters and start with a letter or digit, else HTTP 400; a 300-character `q` gave HTTP 500; `limit` is 1 to 50. The UI minimum is 2 characters, so the places group must be skipped (empty, no outbound call) for a 2-character query, and the server must pre-validate.

**Primary recommendation:** Per-group endpoints (`GET /v1/search/community`, `/places`, `/parcels`, one controller, one wire-type file in `@cortege/ibp-domain`), accent-insensitive matching through a migration-022 `CREATE EXTENSION unaccent`, API Carto for the parcel, geocoder `address,poi` for places, an LRU cache and a per-handler throttle in front of IGN; on mobile, a pure `global-search` module (best-result and parcel-query rules), one generic per-group hook, recents in `local_meta`, a 4th JS tab, and a union `PublicMapFocus` extended with place and parcel targets.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Own survey match by name | Browser/Client (SQLite-backed `state.surveys`) | none | Local-first: D-03, works offline; the list is already in the surveys context |
| Recent searches | Browser/Client (`local_meta`) | none | Convenience data, stays on the phone, cleared with the local data |
| Community survey + member match | API / Backend | Database | Other members' data is only on the server; accent-insensitive SQL over `surveys` joined to `users` |
| Place / address geocoding | API / Backend (IGN proxy) | external IGN | D-08: never from the phone; cache, timeout and throttle belong to the server |
| Parcel number to parcel | API / Backend | Database + external IGN | Parser and IGN lookups live server side; survey count comes from `survey_parcels` |
| Best result choice, group order, "looks like a parcel" gate | Browser/Client | none | Pure presentation rules over the four group states; unit-testable without network |
| Explorer camera / pin / parcel highlight | Browser/Client (MapLibre) | none | Existing `focus` mechanism of the Explorer |
| Tab bar entry (4th JS tab) | Browser/Client (navigation) | none | Shared `SearchTabNavigator` already used by the native tree |

## Standard Stack

No new runtime dependency is needed. Everything is already installed.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/*` 11, `class-validator` ^0.15.1 | installed | Controller, DTO validation | Repo convention (`CommunitySurveysQueryDto`) [VERIFIED: api/package.json] |
| `lru-cache` ^11.5.3 | installed | Short TTL cache + in-flight de-duplication in front of IGN | Already used by `CadastreProviderService` for WFS tiles [VERIFIED: api/package.json, cadastre-provider.service.ts] |
| `@nestjs/throttler` ^6.5.0 | installed | Per-handler rate limit (`@Throttle`) | Existing `SYNC_THROTTLE` / `UPLOAD_THROTTLE` pattern [VERIFIED: api/src/common/rate-limit.config.ts] |
| Global `fetch` (Node >= 22.5) with `AbortSignal.timeout` | runtime | IGN HTTP | Same as `CadastreProviderService.fetchJson` [VERIFIED: code] |
| `expo-network` via `useIsOffline` | installed | Online/offline detection and re-query on reconnection | Already the app's single rule (`isOnlineNetworkState`) [VERIFIED: mobile/src/hooks/useIsOffline.ts] |
| `expo-sqlite` `local_meta` | installed | Recent searches (key `search_recents`) | Key/value table, no SQLite migration needed [VERIFIED: mobile/src/storage/db.ts L306] |
| PostgreSQL `unaccent` (contrib) | PG 16 | Accent-insensitive `ILIKE` | Trusted extension: installable by the database owner [CITED: https://www.postgresql.org/docs/16/unaccent.html] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `unaccent` extension (migration 022) | SQL `translate(lower(col), 'àâä...', 'aaa...')` | No extension to enable, immutable, but a hand-kept character list. Use it only if `CREATE EXTENSION` fails on the VPS (contrib is part of the official `postgres:16` image used in `infra/` and CI [ASSUMED]; verify with `SELECT * FROM pg_available_extensions WHERE name='unaccent'`) |
| Geocoder `parcel` index | API Carto parcelle | Rejected: see Summary point 1 |
| One aggregated `GET /v1/search` | Per-group endpoints | Aggregated needs a partial-success envelope and makes community wait for the slowest IGN call (timeout 2.5 s). Per-group matches the UI-SPEC's per-group loading, error and "Réessayer" states and gives free per-group throttle/caching |

**Installation:** none. **Package Legitimacy Audit:** no external package is added by this phase, so there is nothing to audit (the `package-legitimacy` seam was not needed). Removed due to SLOP: none. Flagged SUS: none.

## Architecture Patterns

### System Architecture Diagram

```
Phone (offline-first)                                             API (NestJS, AuthGuard + throttle)                    External
---------------------                                             ----------------------------------                    --------
 search tab (iOS native tab | JS 4th tab)
        |
  field text ──trim──> < 2 chars ──> start page (recents from local_meta)
        |
        v  >= 2 chars
  ┌──────────────┐  every keystroke, no network
  │ Mes relevés  │<── state.surveys (SQLite-backed context), fold() match on site_name
  └──────────────┘
        |  350 ms debounce (useDebouncedValue), offline? -> "Connexion nécessaire" line, no call
        v
  ┌──────────────┐  GET /v1/search/community?q=        ┌────────────────────────────────┐
  │ Communauté   │────────────────────────────────────>│ SearchService.community        │──SQL unaccent ILIKE──> Postgres
  └──────────────┘  {members[], surveys[]}             └────────────────────────────────┘   (surveys JOIN users, PUBLIC predicate)
  ┌──────────────┐  GET /v1/search/places?q= (>=3 ch)  ┌────────────────────────────────┐
  │ Lieux        │────────────────────────────────────>│ GeocoderService (LRU 10 min,    │──GET /geocodage/search──> data.geopf.fr
  └──────────────┘  {items[] name/kind/lat/lng/score}  │ in-flight dedupe, timeout 2.5 s)│   index=address,poi, limit
  ┌──────────────┐  GET /v1/search/parcels?q= (only    ┌────────────────────────────────┐
  │ Parcelles    │  when looksLikeParcelQuery)         │ parseParcelQuery -> lookup by   │──municipality name──> geocoder (type=municipality)
  └──────────────┘────────────────────────────────────>│ key (API Carto) + survey count  │──code_insee/section/numero──> apicarto.ign.fr
        |            {items[] idu/commune/bbox/count}  └────────────────────────────────┘──count──> Postgres (parcels + survey_parcels)
        v
  pickBestResult(four group states) + group order  ──> best-result card + 4 group cards
        |
  tap ─> own survey: openSurvey + surveys/surveyDetail | community: surveys/communitySurvey |
         member: searchGroup(community, memberName) | place/parcel: publicMap/publicMapHome {focus: place|parcel}
```

### Recommended Project Structure

```
packages/ibp-domain/src/contract/search.ts         # wire types only (re-exported by contract/index.ts)
api/migrations/022_unaccent_search.sql             # CREATE EXTENSION IF NOT EXISTS unaccent (+ optional parcels key index)
api/src/surveys/search.controller.ts               # GET search/community|places|parcels, @UseGuards(AuthGuard), @Throttle(SEARCH_THROTTLE)
api/src/surveys/search.service.ts                  # orchestrates the three groups
api/src/surveys/geocoder.service.ts                # IGN /search client: cache, dedupe, timeout, mapping
api/src/surveys/parcel-query.ts                    # pure parseParcelQuery (+ tests)
api/src/surveys/search.queries.ts                  # SQL builders (community surveys, members, survey count)
api/src/surveys/dtos/search-query.dto.ts           # q (<=100), limit, author
mobile/src/app/search-text.ts                      # pure fold(): NFD strip + lowercase
mobile/src/app/global-search.ts                    # pure: matchOwnSurveys, looksLikeParcelQuery, pickBestResult, groupOrder, memberMatch
mobile/src/storage/search-recents.ts               # local_meta list, best-effort like onboarding-preference.ts
mobile/src/hooks/useSearchGroup.ts, useGlobalSearch.ts
mobile/src/screens/global-search/*                 # per the UI-SPEC implementation notes
mobile/src/i18n/fr/search.ts                       # catalogue module `search`
```

Placing the API code in `api/src/surveys/` follows CLAUDE.md (the `surveys` module owns the public/community endpoints and the cadastre provider) and its coverage ratchet (`./src/surveys/` 84/71/84/84).

### Pattern 1: Per-group endpoint with strict validation

**What:** Three read-only GETs behind `AuthGuard`, DTO with `@MaxLength(100)` on `q`, `limit` 1..50 (community) or 1..10 (places, parcels).
**When to use:** every search call.
**Example:**
```typescript
// Source: modelled on api/src/surveys/dtos/community-surveys-query.dto.ts and public.controller.ts (repo)
export class SearchQueryDto {
  @IsString() @MinLength(2) @MaxLength(100) q!: string
  @IsOptional() @IsString() @MaxLength(100) author?: string // exact display name, member list (community only)
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number
}
```

### Pattern 2: Accent- and case-insensitive match in SQL with the existing LIKE escape

**What:** Reuse `escapeLikePattern` (public-map.queries.ts) and fold both sides with `unaccent`.
```sql
-- Source: evolution of buildCommunitySurveysQuery (api/src/surveys/public-map.queries.ts)
WHERE s.status = 'submitted' AND s.deleted_at IS NULL AND s.submitted_at IS NOT NULL   -- PUBLIC_SURVEY_PREDICATE
  AND (unaccent(s.site_name) ILIKE unaccent($1) OR unaccent(u.display_name) ILIKE unaccent($1))
-- $1 = '%' + escapeLikePattern(q) + '%'  (unaccent leaves % _ \ untouched)

-- members (one row per author name, count of finished surveys)
SELECT u.display_name AS author_name, COUNT(*)::int AS survey_count
FROM surveys s JOIN users u ON u.id = s.user_id
WHERE <PUBLIC_SURVEY_PREDICATE> AND s.submitted_at IS NOT NULL
  AND u.display_name <> '' AND unaccent(u.display_name) ILIKE unaccent($1)
GROUP BY u.display_name ORDER BY survey_count DESC, u.display_name LIMIT $2
```
`users.display_name` has no unique constraint (migration 001: `TEXT NOT NULL DEFAULT 'Contributor'`), so two members with the same name are one "member" row. Accepted, documented risk (wire shape carries no user id by design, see Security).

### Pattern 3: Pure presentation rules on the phone

`pickBestResult({ query, parcels, members, places, mine, community })` returns `{ kind, ... } | null`; `groupOrder(parcelFirst)`; `looksLikeParcelQuery(q)`; all in `mobile/src/app/global-search.ts`, fully unit-tested (the mobile global coverage floor is 100 percent for files outside the per-directory entries, and `./src/app/` is at 91/80/97/95).

### Anti-Patterns to Avoid

- **Re-implementing the parcel IDU/section rules.** Reuse `parseParcelIdu`, `normalizeParcelSection`, `normalizeParcelPartToDigits`, `arrondissementCity`, `buildParcelKey`, `apiCartoSection` from `surveys-normalize.utils.ts`.
- **Setting `actions.setSurveyQuery` on every keystroke.** It lives in the shared surveys context; the search query must be local state of the search route (see Pitfall 6).
- **Calling the geocoder `parcel` index with free text** (Summary point 1).
- **Logging `q`.** The HTTP error filter already drops the query string; keep every new `Logger` call free of it.
- **Hex or `rgba(` literals, em dashes, new Ionicons that are not `-outline`** (gates in `src/__checks__`). All 13 glyphs the UI-SPEC names exist in the installed Ionicons glyph map [VERIFIED: node_modules/@expo/vector-icons glyphmap].

## IGN geocoding (D-08 verification, live, 2026-10-09)

| Question | Finding | Source |
|----------|---------|--------|
| Current endpoint | `https://data.geopf.fr/geocodage/search` (GET, also POST for CSV) and `/reverse`; capabilities at `/geocodage/getCapabilities`; OpenAPI/Swagger at `/geocodage/openapi` | [CITED: https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/geocodage/], [VERIFIED: live curl] |
| `/completion` | A legacy `/geocodage/completion/` still answers 200 but with another shape (`results[]` with `fulltext`, `x`,`y`). Not needed: `/search` has `autocomplete=true` by default, "meant for live user input" | [VERIFIED: live curl], [CITED: https://data.geopf.fr/geocodage/getCapabilities] |
| Key | None. The repo's three IGN calls already run unauthenticated in production (`CADASTRE_PROVIDER=ign` in `infra/vps/env.example`) | [VERIFIED: live curl, infra/vps/env.example] |
| Rate limit | "limité à 50 requêtes par seconde depuis une même adresse IP"; response header `ratelimit-limit: 50`. A header `x-ratelimit-limit-second: 1` is also sent and is unexplained (20 parallel calls all answered 200, so it is not a 1 per second cap). Treat any 429 as a provider error | [CITED: cartes.gouv.fr guide; https://www.data.gouv.fr/dataservices/api-geoplateforme-geocodage], [VERIFIED: live headers and a 20-call burst] |
| Usage terms / attribution | No geocoder-specific terms published. data.gouv.fr states "Ouvert" access and the generic Licence Ouverte 2.0. No clause against server-side proxying found. Address data is the BAN, POIs are BD TOPO, parcels are Parcellaire Express (PCI), all IGN/Etalab open data | [CITED: data.gouv.fr dataservice page, cartes.gouv.fr guide]. An attribution line is a courtesy, not a verified obligation: see Open Question 3 |
| Caching rule | None published. A 10 minute in-process cache is consistent with the repo's WFS tile cache (24 h) | [ASSUMED] no explicit prohibition |
| Filters | `index` = `address` (default) / `poi` / `parcel`, comma list allowed (`address,poi` works); `type` (housenumber, street, locality, municipality; address only), `limit` 1..50 (error message: "limit: must be an integer between 1 and 50"), `lat`/`lon` bias, `postcode`, `citycode`, `depcode`, `city`, `category` (poi), `returntruegeometry`, `autocomplete` | [VERIFIED: live curl + getCapabilities] |
| `q` rules | 3 to 200 characters, must start with a letter or digit, else 400 `q: must contain between 3 and 200 chars and start with a number or a letter`; empty `q` gives 400; a 300 character `q` gave HTTP 500 | [VERIFIED: live curl] |
| Latency | 45 to 310 ms across ~35 calls | [VERIFIED: live curl] |

### Response shape (GeoJSON `FeatureCollection`, geometry is always a Point `[lng, lat]`)

- **address feature** (`properties._type: "address"`): `label` ("Fontainebleau 33880 Saint-Caprais-de-Bordeaux"), `name`, `score` 0..1, `importance`, `type` (`municipality` | `locality` | `street` | `housenumber`), `city`, `postcode`, `citycode`, `depcode`, `context` ("77, Seine-et-Marne, Île-de-France"), `x`,`y` (Lambert 93, ignore), `id`, `banId`, `population` (municipality only).
- **poi feature** (`_type: "poi"`): **arrays**: `name[]`, `category[]` (e.g. `["bois","élément topographique ou forestier","lieu-dit non habité"]`, `["sommet", ...]`), `city[]`, `postcode[]`, `citycode[]`, `depcode[]`; plus `toponym` (string), `score`, `classification`, `extrafields.cleabs`. No `label`, no `type`, no `context`, no `importance`.
- **No bounding box and no true geometry for places.** The UI-SPEC's "fit the provider's bounding box when it gives one" never applies; use the kind-based zoom (municipality or locality 13, street or housenumber 17, poi 14 [ASSUMED values to tune on the phone]).
- POI duplicates exist (one "Forêt Domaniale de Rambouillet" per commune it crosses). De-duplicate on `name + citycode`, keep the highest score, cap at `limit`.

### Verified query recipe for the Lieux group

`GET https://data.geopf.fr/geocodage/search?q=<q>&index=address,poi&limit=10` (build with `URL.searchParams`, never string concatenation). Observed: "mont ventoux" gives the summit POI first (0.89), "12 rue de la paix paris" gives the exact housenumber (0.96), "foret de fontainebleau" gives streets before POIs (ranking is imperfect; acceptable, the owner sees 3 rows and "Voir les N").

## Parcel search (REQ detail for D-06)

### What exists today (read in code)

- `parseParcelIdu(id)`: 14-character IDU `^(\d{5})\d{3}([0-9A-Z]{2})(\d{4})$` to `{ communeCode, section, number }`; section through `normalizeParcelSection` ("0A" to "A", numbered Alsace-Moselle "09" kept); Paris/Lyon/Marseille keep the arrondissement code (75112) as commune.
- `parseParcelIdentifier` also reads the legacy short form `^(\d{5})([A-Z]{1,3})(\d{1,4})$` (`77186AB0123`).
- `CadastreProviderService.lookupParcelById(idu)` (provider must be `ign`): API Carto by `code_insee` (city code for arrondissements plus `code_arr`), `section` (`apiCartoSection`), `numero`, `source_ign=PCI`, `_limit=1`; returns `{ centroid, geometry }` or null. It uses the shared `fetchJson` (timeout `CADASTRE_PROVIDER_TIMEOUT_MS`, default 2500). **There is no controller endpoint that resolves a parcel by number today**: `parcels.controller.ts` only has `GET /parcels/resolve?lat&lng` and `GET /parcels/:id/surveys/history`. CONTEXT's "the parcels.controller lookup already exist" is therefore only half true: the building blocks exist, the lookup-by-number endpoint is new work.
- API Carto answer (live): `properties` carry `idu`, `section`, `numero`, `code_insee`, `code_arr`, `nom_com` (commune name), `contenance` (m2), and a MultiPolygon in EPSG:4326, ~0.65 s.

### Accepted input forms (proposal, settles UI-SPEC U-10 and Open Question "accepted forms")

Normalise first: trim, upper-case, collapse spaces, strip `-`, `.`, `,`, the words "PARCELLE" and "SECTION".

| Form | Example | Resolution | Needs IGN |
|------|---------|------------|-----------|
| Full IDU | `77186000AB0123`, `77186 000 AB 0123` | `parseParcelIdu` then API Carto | yes |
| INSEE code + section + number | `77186 AB 0123`, `77186AB123`, `67392 09 0001` | `parseParcelIdentifier`-style regex then API Carto (number left-padded to 4, section by `normalizeParcelSection`) | yes |
| Commune name + section + number (either order) | `Fontainebleau AB 123`, `AB 123 Fontainebleau` | commune name to INSEE code through the geocoder `index=address&type=municipality&limit=3` (keep candidates with score >= 0.8, at most 3), then API Carto for each | yes (2 calls) |
| Paris / Lyon / Marseille | `75112 BL 10` or the IDU | Only the arrondissement code form works; "Paris BL 10" is ambiguous (city code 75056 has no `code_arr`) and returns no parcel | yes |
| Department + section + number (sketch "77 AB 0123") | `77 AB 0123` | **Not resolvable** by the geocoder (400 without `municipalitycode`) nor API Carto without a commune | n/a |
| Section + number only | `AB 0123` | Fallback to the app's own `parcels` table (rows with that section and number, at most 10, newest studied first) so a studied parcel is still found; commune name unknown (null) | no |

Rule: when the query does not parse as a parcel key, the parcels endpoint answers `{ items: [] }` immediately with no outbound call, so the mobile may call it for any parcel-looking query at no cost. The phone only needs a coarse gate `looksLikeParcelQuery(q)`: at least one digit AND at least one letter token of 1 to 2 characters or an IDU-like run (over-inclusive is fine, the server decides). **"The query is a valid parcel number" for the best-result rule means "the parcels response returned an item", not a client-side parse**, so the rule exists once.

### Resolving a parcel and "1 relevé sur cette parcelle"

- Key: `(commune_code, section, number)` exactly as stored by the registration code (`parcels` columns, migrations 020/021) so IGN-registered, WFS-drawn and typed keys agree.
- Count (finished surveys of any member, same visibility as the map):
```sql
-- Source: PUBLIC_SURVEY_PREDICATE (public-map.queries.ts) + survey_parcels (migration 009)
SELECT COUNT(DISTINCT s.id)::int AS survey_count
FROM parcels p
JOIN survey_parcels sp ON sp.parcel_id = p.parcel_id
JOIN surveys s ON s.id = sp.survey_id
WHERE p.commune_code = $1 AND p.section = $2 AND p.number = $3
  AND s.status = 'submitted' AND s.deleted_at IS NULL AND s.submitted_at IS NOT NULL
```
  Legacy single-`surveys.parcel_id` rows are backfilled into `survey_parcels` by migration 009, as `getParcelSurveyHistory` already assumes. No index covers `parcels(commune_code, section, number)`; at this table size a scan is fine, an index can ride in migration 022 for free (optional).
- Offline of IGN: with `CADASTRE_PROVIDER=synthetic` (dev, CI) or an IGN failure, the parcels endpoint returns what the database knows (a registered parcel with a centroid) and nothing otherwise; it never invents a synthetic parcel. The existing `resolveSynthetic` is for coordinates and must not be used here.
- Wire item: `{ parcel_id (IDU), commune_code, commune_name: string | null, section, number, centroid: {lat,lng}, bbox: [minLng,minLat,maxLng,maxLat] | null, survey_count: number }`. The server reduces the polygon to a bbox (`geometryCenter` exists; add a sibling `geometryBbox`, `geometryBounds` is private in the provider) so the wire stays small. The UI-SPEC `parcelMeta` takes `commune: string`; with a null name show only `Commune {code}` (add one catalogue variant).

## API design

**Recommendation: three per-group endpoints, one controller, no aggregated `GET /v1/search`.**

| Endpoint | Query | Response | Cap | Notes |
|----------|-------|----------|-----|-------|
| `GET /v1/search/community` | `q` (2..100), optional `author` (exact display name, case and accent insensitive), `limit` 1..50 (default 30) | `{ members: SearchMemberItem[], surveys: CommunitySurveyItem[] }` | surveys 50, members 5 | Reuses `CommunitySurveyItem` unchanged. With `author`, `members` is empty and `surveys` are that author's. The old `GET /public/community-surveys` stays untouched (contract, e2e) but loses its only mobile caller; it also gains `unaccent` so both agree |
| `GET /v1/search/places` | `q` (3..100 effective), `limit` 1..10 (default 10) | `{ items: SearchPlaceItem[] }` | 10 | `q` shorter than 3 after trim: 200 with `[]`, no outbound call. Provider `synthetic`: 200 with `[]` |
| `GET /v1/search/parcels` | `q` (2..100) | `{ items: SearchParcelItem[] }` | 10 | Unparseable: 200 `[]`, no outbound call |

- **Wire types** go in `packages/ibp-domain/src/contract/search.ts`, re-exported from `contract/index.ts` (types only, so the package's 100 percent threshold is unaffected): `SearchMemberItem { author_name, survey_count }`, `SearchCommunityResponse`, `SearchPlaceKind = "municipality" | "locality" | "street" | "address" | "other"`, `SearchPlaceItem { id, name, kind, context: string | null, lat, lng, score }`, `SearchPlacesResponse`, `SearchParcelItem`, `SearchParcelsResponse`. `mobile/src/api/ibp-api.ts` gets three typed functions next to `searchCommunitySurveys`. Kind mapping: address `municipality`, `locality`, `street`, `housenumber` to `address`; every `poi` to `other` (the UI-SPEC catalogue has no POI kind; optional enrichment, not required).
- **Context string:** for address "Seine-et-Marne (77)" built from `context` ("77, Seine-et-Marne, Île-de-France" to department name and number); for poi `city[0]` plus `depcode[0]`. Build in the API so the phone stays dumb.
- **Auth and throttling:** `@UseGuards(AuthGuard)` like `PublicController`. Add `search: 240` to `PRODUCTION_THROTTLE_LIMITS` (~4/s, the debounced keystroke cadence of three groups) and a `SEARCH_THROTTLE` beside `UPLOAD_THROTTLE`; the per-handler bucket means the three groups are limited separately and never eat the 600/min default shared with sync. `api/test/rate-limit.config.spec.ts` asserts the production table and the list of kinds: it must be updated (listed in Validation).
- **Outbound protection:** LRU cache keyed by the normalised (folded, trimmed, lower-cased) query, TTL 10 min for places, 30 min for commune-name resolution, max ~500 entries; **in-flight de-duplication** (a `Map<key, Promise>`) so identical concurrent queries cost one IGN call; a global concurrency cap (for example 8 simultaneous outbound IGN calls, further callers wait or get 503); do not cache failures.
- **IGN failure behaviour:** provider timeout or non-2xx throws; the service answers **HTTP 503 `{ code: "search_provider_unavailable" }`** for that group only (logged as a warning without the query, like `IGN WFS failed: ...`). The phone shows that group's error line and "Réessayer". Our own throttler's 429 maps to the `error.rateLimited` copy. Fallback to synthetic data is NOT wanted here (it would show invented places).
- **Env:** add `GEOCODING_IGN_SEARCH_URL` (default `https://data.geopf.fr/geocodage/search`) to `env.schema.ts`, `app-config.ts` (`cadastre.searchUrl`), `api/.env.example`, `api/.env.production.example`, `infra/.env.example`, `infra/vps/env.example`, `api/README.md` and the CLAUDE.md env table (the same six places `CADASTRE_IGN_REVERSE_URL` appears [VERIFIED: grep]). Reuse `CADASTRE_PROVIDER` as the on/off switch and `CADASTRE_PROVIDER_TIMEOUT_MS` as the timeout; no second provider switch. `check-env-parity.spec.ts` and `check-config.ts` only cover required production variables, so an optional variable with a default does not break parity.
- **Docs:** extend `docs/technical/api-contract-v1.md` section 5 (after `GET /public/community-surveys/{survey_id}` or as new "5.1 Search"), and `data-contract-v1.md` only if the optional index is added.
- **Tests locations:** API unit specs in `api/test/*.spec.ts` (mock `global.fetch` like `cadastre-provider.service.spec.ts`; `buildTestConfigService` from `api/test/config-helper.ts`); e2e in `api/test/search.e2e-spec.ts` using `createE2eApp`, `loginTestUser`, `uniqueId`, `uniqueCoordSeed`, `resolveParcel`, `getNextVersionNumber`, `validDirectFactors` from `api/test/helpers/surveys-e2e.ts` (the pattern of `community-surveys.e2e-spec.ts`). The e2e DB runs with `CADASTRE_PROVIDER` synthetic, so places and parcels-by-IGN are covered by unit specs with mocked `fetch`; the e2e covers auth, validation, community/members SQL, accents, wildcards, limits and the parcel DB fallback.

## Mobile

### Current search stack (read in code)

- `SurveySearchRoute` (76 lines) reads the surveys context (`state.surveyQuery`, `visibleSurveys`, filters, `actions.setSurveyQuery`), `useCommunitySurveys` (350 ms debounce, `active` only for the community scope, stale answers dropped with a `cancelled` flag), and navigates with `navigation.navigate("surveys", { screen: "surveyDetail" | "communitySurvey", ..., initial: false })`. It is mounted twice: `SearchStack` (`searchHome`, native tab) and `SurveysStack` (`surveySearch`, pushed from `SurveyListRoute.onOpenSearch` via the `ListTitleBar` button on Android/JS).
- `SurveySearchScreen` (275 lines) is the page to replace; `CommunityRow` and `SurveyRow` are reusable; `SurveyRowFrame` has `density="compact"` (the Accueil `RecentSurveysSection` pattern, `RECENT_LAYOUT` in `screens/home/layout-budget.ts`: 52 pt rows, ring 32, hairlines).
- `filterAndSortSurveys` (`app/survey-logic.ts`) lowercases only (no accent folding) and its haystack is `site_name + id + last_sync_error`, so a query can match a survey id or a sync error text. D-03 says "by survey name": use a name-only, accent-folded match for the search; keep the status/attachment/sort chips by calling `filterAndSortSurveys` with a blank `surveyQuery` and filtering by name separately (or fold and restrict its haystack; either way `survey-logic.test.ts` changes).
- `PublicMapFocus` (`navigation/types.ts`) is `{ surveyId, lat, lng, parcelIds, nonce }`, consumed in `PublicMapScreen` (311 lines of the 400 cap): `focusRegion` (`buildFocusedMapRegion` +0.015 span, offset 22 percent), `focusTo(region, 0)` on `nonce`, `setHighlightedId(focus.surveyId)`, `highlightedParcelIds={focus.parcelIds}` handed to `ParcelMap` `selectedParcelIds`, drawn with `brandMapTokens.parcelSelected` / `parcelSelectedFill` (`map/maplibre/parcel-features.ts`). Highlight matches case-insensitively on the **polygon ids that the viewport load returns** (IGN WFS via `/public/parcels/status`), so a parcel focus can reuse `parcelIds: [IDU]` plus a zoom of about 17, and the polygon appears when the status load for that viewport lands. Fitting bounds uses `boundsFromRegion`. The one caller of the current focus is `SeeOnMapAction` (`navigation.navigate("publicMap", { screen: "publicMapHome", params: { focus } })`).
- **Explorer extension (UI-SPEC "Explorer focus"):** make `PublicMapFocus` a discriminated union (`kind: "survey" | "place" | "parcel"`, each with `nonce`); a place needs a new static pin layer in `MapCanvas` (MapLibre `ShapeSource` + `CircleLayer` with `brandMapTokens.parcelSelected` and a white 2 pt ring); a parcel supplies `bbox` and `parcelIds`. `PublicMapScreen.tsx` is 311 lines: put the new camera/pin logic in a hook under `screens/public-map/` (for example `useSearchFocus.ts`) to stay under 400. `SeeOnMapAction` and `PublicMapScreen.test.tsx` need the new `kind`. A pending focus is consumed once; the existing reload signal fires only on a tab press (`makePublicMapTabListeners`), not on `navigate`, so a `navigate` from search does not cancel it, but the first press on Explorer after arriving may reload items (it does not move the camera).

### Navigation changes

1. `SearchStackParamList`: add `searchGroup: { group: "mine" | "community" | "places" | "parcels"; query: string; memberName?: string }`; register in `SearchTabNavigator` with `pageTitleOptions(theme)` (large title on iOS native) like `PublicMapStack`'s `communitySurvey`; a `SearchGroupRoute` memoised route reads only the contexts it needs (project rule).
2. **JS tree 4th tab:** in `JsRootTabs.tsx` add `<JsTab.Screen name="search" options={{ headerShown: false, tabBarHideOnKeyboard: true }} component={SearchTabNavigator} />` after `publicMap`. `JS_TAB_ICONS.search = "search-outline"` and `fr.navigation.tabs.search = "Rechercher"` already exist. `ANDROID_TAB_ICONS.search` (a PNG) is only used by the native-tabs options on non-iOS, which D-08 never mounts on Android; just fix its comment ("Only the iOS tree has a search tab; Android's search is a button on Mes Relevés") and the "Three tabs (OA-13)" comment in `JsRootTabs`. The native tree is unchanged (`role: "search"`).
3. **Remove** `surveySearch` from `SurveysStackParamList` and `SurveysStack`, `onOpenSearch` + the `ListTitleBar` search button in `SurveyListScreen` / `SurveyListRoute`, `SurveySearchRoute`, `SurveySearchScreen` (+ test, `CommunityRow` is kept and reused), `search.styles.ts` (move/rename), `useCommunitySurveys` (replaced by the generic per-group hook; delete with its test), and the catalogue keys listed in UI-SPEC "Catalogue housekeeping".
4. `shouldHideTabBar`: no change (`ROUTES_WITHOUT_TAB_BAR` is empty by owner rule OA-28). `searchGroup` simply shows the bar.
5. **Single assembler:** the search route reads `useSession`/`useAccessToken`, `useSurveys` (state.surveys, surveyDetails, actions.openSurvey/confirmDeleteSurvey) and `useIsOffline`; it never calls `useSurveySync`. The query text lives in `useState` inside the route, so keystrokes do not touch any context (`state/render-counts.test.tsx` protects this; the current page's `setSurveyQuery` writes into the surveys context, which is exactly what to avoid). The now-unused `surveyQuery`/`setSurveyQuery` context fields can stay (dead but harmless) or be removed in the cleanup plan; removal touches `AppStateProvider`, `types.ts`, `useSurveyList` and their tests.
6. Focus on tab focus: `useIsFocused`-style listener in the route (`navigation.addListener("tabPress")` and `"focus"`), field `focus()` only when the query is empty (UI-SPEC). `ScreenFrame` with `headerShown: false` as today.

### Hooks, debounce, offline, cancellation

- Generic `useSearchGroup<T>({ key, enabled, offline, query, fetcher })` returns `{ items, status: "idle" | "loading" | "ready" | "error" | "offline", error: "rateLimited" | "failed" | null, retry }`. Debounce with `useDebouncedValue(query.trim(), COMMUNITY_SEARCH_DELAY_MS)` (350 ms constant exists in `useCommunitySurveys.ts`: move it to the new module and re-export for tests). Keep previous items while loading (UI-SPEC). Drop stale answers per group with the existing `cancelled` flag pattern; adding an optional `signal` to `apiRequest` (`api/client.ts` creates its own `AbortController` for the timeout, so an external signal must be chained) is an optional improvement, not needed for correctness.
- Offline: `useIsOffline()` (expo-network `getNetworkStateAsync` + listener, `isOnlineNetworkState` = connected and internet reachable). In the group effect, `offline === true` sets status `offline` and issues no request; the effect depends on `offline`, so the transition to online re-runs the fetch with the current debounced query ("re-query on reconnection" is free). The initial `offline=false` before the first async state resolves cannot fire a wrong request because the 350 ms debounce outlasts the state read. A server that is unreachable while the phone believes it is online produces a normal group error with "Réessayer" (an `ApiError` of any status, or a thrown fetch error).
- Recents: `mobile/src/storage/search-recents.ts` with `loadSearchRecents()`, `saveSearchRecent(q)`, `removeSearchRecent(q)`, `clearSearchRecents()`: JSON array of at most 8 strings in `local_meta` key `search_recents`, best-effort with try/catch like `onboarding-preference.ts`. **`local_meta` is `key TEXT PRIMARY KEY, value TEXT, updated_at TEXT`, so no `PRAGMA user_version` migration** (the schema stays at 5). **`clearLocalIbpData()` (`storage/surveys.ts` L524) deletes only `downsync_cursor` and the two owner keys from `local_meta`; add `search_recents` to its `DELETE ... WHERE key IN (...)`** or the UI-SPEC promise "cleared with the local data on sign-out / owner change" is false (it is called on logout purge and owner change in `useSurveySync` and `useLocalDataOwner`).
- Accent/case folding on the phone: `fold(s) = s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/gi, "oe").replace(/æ/gi, "ae").toLowerCase()`. Avoid `\p{M}` (Hermes support not verified here [ASSUMED]); the combining-range class is safe. Keep the SQL side (`unaccent`) and this function covered by the same fixture list (é è ê ë à â ç ï î ô ù û ü ÿ œ æ, upper and lower case).

### `src/__checks__` and structure gates the new files must pass

| Gate | Rule | Consequence |
|------|------|-------------|
| `structure.test.ts` (via `scripts/structure-report.js`) | 400-line cap on `src/screens` and `src/navigation`; **unused `StyleSheet.create` keys fail** (every key must be read); hard-coded user-facing literals outside `src/i18n` fail (props such as `title`, `label`, `placeholder`, `accessibilityLabel`, `accessibilityHint`, `message`, `description`) | Every string through `fr.search`; delete style keys of the removed page; split files near 350 lines |
| `catalogue-dash.test.ts` | no U+2014 in any string/template/JSX under `mobile/src` | Use the middle dot U+00B7 and « » as in the UI-SPEC |
| `icons.test.ts` | every Ionicons glyph ends in `-outline` | The 13 glyphs of the UI-SPEC all qualify and exist [VERIFIED] |
| `motion.test.ts` | RN `Animated` only in an allowlist; `ReduceMotion.System` on timings; loops gated by `useScreenVisible` | Use `Skeleton`, `EntranceView`, `RipplePressable` only |
| `layers.test.ts` | no `borderWidth` on a gradient view, no `borderCurve` | The glass cards use the existing `AppCard variant="glass"` |
| `fonts.test.ts` | fonts only via `brandTypography` | Use the roles named in the UI-SPEC |
| `i18n/catalogue.test.ts` | top-level key list is asserted exactly (**add `"search"` to the expected array**); every string/function leaf must be non-empty and id-free (no UUID-like text, `survey-\d+`, 8+ hex run); functions are called with a Proxy argument whose count-like keys (`count|total|synced|failed|n$`) return 2, all others return "Parcelle du Bois" | New functions must tolerate a Proxy argument (`surveys === null ? ... : ...` in `parcelMeta` gets a string for `surveys`; `capped ? "+" : ""` gets a truthy string; a bare `(count: number)` is converted through `toPrimitive` to the name). Prefer destructured named arguments, as the existing catalogue does |
| ESLint | hex / `rgba(` only in the five token files; unused vars error | Colours only through `useBrandTheme()` |
| Coverage floors (`mobile/jest.unit.config.js`) | `./src/navigation/` 100/98/100/100; `./src/screens/` 56/45/49/55; `./src/hooks/` 90/80/95/91; `./src/storage/` 92/81/91/94; `./src/app/` 91/80/97/95; `./src/i18n/` 100/76/100/100; global 100 for the rest | New navigation lines must be fully covered; run `npm run test:coverage:mobile` at every wave end |

### Tests to update or delete (named in the code)

- `navigation/navigation.test.tsx` (mocks `SurveySearchRoute` at L135; asserts `mockScreens.surveySearch.options.headerShown === false` at L665 and the search tab options at L351/L358; tab counts around L293-L303 and L714).
- `navigation/tabs.test.tsx` (`THREE_TABS`, `NATIVE_TABS = [...THREE_TABS, "search"]` L152; the JS tree test at L216 expects exactly `THREE_TABS` and must now expect four; mocks `SearchStack` at L138).
- `navigation/routes/routes.test.tsx` (mocks `SurveySearchScreen` at L40; `describe("SurveySearchRoute")` L907-L992; `navigation.navigate("surveySearch")` L849; the route table at L1930); `SurveyListRoute`/`SurveyListScreen` tests for the removed search button.
- `state/render-counts.test.tsx` (mocks `SurveySearchScreen` at L442: replace with the new screen mock; assert keystrokes do not re-render Home).
- `screens/survey-search/*` (tests and `search.styles.test.ts` move or go), `hooks/useCommunitySurveys.test.ts` (replaced), `tab-config.test.ts`, `app/survey-logic.test.ts` if the haystack changes, `i18n/catalogue.test.ts` (key list), `PublicMapScreen.test.tsx`, `SeeOnMapAction` tests (focus union), `storage` tests for `clearLocalIbpData`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parcel id / section / number rules | A new parser for sections, IDU or arrondissements | `parseParcelIdu`, `parseParcelIdentifier`, `normalizeParcelSection`, `normalizeParcelPartToDigits`, `arrondissementCity`, `apiCartoSection`, `buildParcelKey` | Owner-verified edge cases (Alsace-Moselle "09", Paris 75112 vs 75056) in migrations 020/021 |
| IGN HTTP, timeout, JSON | A second `fetch` wrapper | Extract/extend `CadastreProviderService.fetchJson` (AbortSignal.timeout over header+body) | Same timeout rule and tests |
| LIKE escaping | Manual `replace` | `escapeLikePattern` | Already tested for `%`, `_`, `\` |
| Public visibility rule | Re-writing the status/deleted conditions | `PUBLIC_SURVEY_PREDICATE` | One definition for map, community and detail |
| Geometry centre | New centroid maths | `geometryCenter` (exported) and a sibling bbox helper next to it | Same box-centre convention as the map |
| Debounce | `setTimeout` in the screen | `useDebouncedValue` + `COMMUNITY_SEARCH_DELAY_MS` | Tested hook |
| Offline status | A second NetInfo subscription rule | `useIsOffline` | "Online" means one thing app-wide |
| Rows, glass cards, pressables, skeleton | New row/card components | `SurveyRowFrame` (compact/regular), `CommunityRow`, `AppCard variant="glass"`, `AppSectionHeader`, `RipplePressable`, `Skeleton`, `ListEntranceRow`, `AppChoiceChip` | Already pass the visual gates and the owner's phone checks |
| Accent folding in SQL | A character table | `unaccent` | Handles the full Unicode set |

**Key insight:** this phase is mostly composition. The only genuinely new server logic is the parcel-query parser, the geocoder mapping and the aggregation SQL; the only genuinely new mobile logic is the best-result rule and the per-group state machine.

## Common Pitfalls

### Pitfall 1: Geocoder `score` read as confidence
**What goes wrong:** "Marie", "Dupont" or "Camille" produce a 0.93 to 0.97 commune/street; with the UI-SPEC rule, the place card wins over the matching member.
**How to avoid:** adopt "UI-SPEC adjustment 1" (member match before place; place only when score >= 0.85 and kind is municipality or poi).
**Warning signs:** the member named like a place never reaches the best-result card.

### Pitfall 2: Parcel typed as "AB 0123" or "77 AB 0123"
**What goes wrong:** the geocoder returns nothing and the owner thinks parcels are broken.
**How to avoid:** accepted forms table above; the start-page intro copy and the no-result copy already steer to a place or a parcel number; add a catalogue hint for the commune requirement only if the owner wants it (Open Question 2). DB fallback for `AB 0123`.

### Pitfall 3: POI features parsed like address features
**What goes wrong:** `properties.city` is an array for POIs, `label` is missing; `undefined` leaks into titles (`catalogue.test.ts` forbids id-like text but not "undefined").
**How to avoid:** a single `mapFeature` with `_type` switch and unit tests with recorded fixtures of both shapes (the live fixtures are in this document's sample queries).

### Pitfall 4: Geocoder 400/500 on short or odd input
**What goes wrong:** `q` of 2 characters, a leading `-`, an apostrophe or 300 characters return 400/500, turning ordinary typing into group errors.
**How to avoid:** server trims, collapses whitespace, strips leading non-alphanumerics, requires 3..100 characters, else returns `[]` without calling IGN. Characters such as `'` `%` `\` are passed through `URLSearchParams` (encoded).

### Pitfall 5: `unaccent` unavailable in an environment
**What goes wrong:** migration 022 fails and the stack does not start (the image runs migrations at startup; `update-stack.sh` keeps the previous API serving on config-check failure only).
**How to avoid:** the e2e `globalSetup` re-migrates `ibp_test` on every run and CI uses `postgres:16`, so a failure shows before deploy; add `migration-022-unaccent.e2e-spec.ts` asserting `unaccent('Éléphant') = 'Elephant'`. Fallback documented above (`translate`).

### Pitfall 6: Search query stored in the shared surveys context
**What goes wrong:** every keystroke re-renders every context consumer; `render-counts.test.tsx` guards Home. **How to avoid:** local state in the route; compute own matches with the pure function.

### Pitfall 7: Recents survive an owner change
**What goes wrong:** the next account sees the previous user's searches (privacy). **How to avoid:** extend `clearLocalIbpData` (see Mobile) and add a storage test.

### Pitfall 8: Focus object breaks existing consumers
**What goes wrong:** `PublicMapFocus.surveyId` is required today; place/parcel focuses have none, `SeeOnMapAction`, `PublicMapScreen.setHighlightedId(focus.surveyId)` and typed `navigate` calls fail to compile. **How to avoid:** discriminated union introduced in one plan together with all its call sites and tests.

### Pitfall 9: Stale answers and rapid typing
**What goes wrong:** an older, slower response overwrites a newer one. **How to avoid:** per-group `cancelled` flag keyed on the debounced query + retry nonce (pattern of `useCommunitySurveys`, with the same test shape: fake timers, `COMMUNITY_SEARCH_DELAY_MS`).

### Pitfall 10: Dev/CI cannot show places
**What goes wrong:** `CADASTRE_PROVIDER` defaults to `synthetic` outside production, so `places` and IGN-based `parcels` are empty locally and in e2e. **How to avoid:** say so in the API docs; cover the mapping by unit tests with mocked `fetch`; the owner's phone check runs against the VPS (provider `ign`).

## Runtime State Inventory

Not a rename/refactor phase. One related item: `local_meta.search_recents` is new runtime state on every phone (cleared by the extended `clearLocalIbpData`). No stored data, service config, OS registration or secret is renamed. Build artifacts: none (JS-only on mobile; no native module, no `app.json` change, so the native CI jobs stay skipped).

## Code Examples

### IGN places call (server)
```typescript
// Source: verified live 2026-10-09; pattern of CadastreProviderService.fetchJson (repo)
const url = new URL(this.searchUrl) // https://data.geopf.fr/geocodage/search
url.searchParams.set("q", normalised)         // 3..100 chars, starts with letter/digit
url.searchParams.set("index", "address,poi")
url.searchParams.set("limit", String(limit))
const payload = await this.fetchJson(url)     // AbortSignal.timeout(timeoutMs), throws on !ok
```

### API Carto parcel by key (server, existing building block)
```typescript
// Source: api/src/surveys/cadastre-provider.service.ts resolveGeometryFromApiCarto (private today)
const arr = arrondissementCity(communeCode)
url.searchParams.set("code_insee", arr?.city ?? communeCode)
if (arr) url.searchParams.set("code_arr", arr.codeArr)
url.searchParams.set("section", apiCartoSection(section))
url.searchParams.set("numero", number)            // 4 digits
url.searchParams.set("source_ign", "PCI")
url.searchParams.set("_limit", "1")
// feature.properties: idu, nom_com, section, numero, code_insee, code_arr; geometry: MultiPolygon
```
Add a public `lookupParcelByKey(communeCode, section, number)` returning `{ idu, communeName, centroid, bbox }` (extend the private method rather than duplicating it).

### Throttle kind
```typescript
// Source: api/src/common/rate-limit.config.ts (pattern of UPLOAD_THROTTLE)
export const PRODUCTION_THROTTLE_LIMITS = { default: 600, ipCeiling: 3000, sync: 60, upload: 240, search: 240 } as const
export const SEARCH_THROTTLE = { default: { ttl: THROTTLE_TTL_MS, limit: () => resolveThrottleLimit("search") } }
```

### Own-survey match (phone)
```typescript
// Source: new, mobile/src/app/global-search.ts; D-03 "by survey name"
export function matchOwnSurveys(surveys: readonly LocalSurvey[], query: string): LocalSurvey[] {
  const needle = fold(query.trim())
  if (needle.length < 2) return []
  return surveys.filter((s) => fold(s.site_name).includes(needle))
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `api-adresse.data.gouv.fr` (BAN API) | `data.geopf.fr/geocodage/search` (Géoplateforme) | Traffic moved by 30 June 2025, old host kept to January 2026 then redirected/retired | Repo already uses the new host; do not add the old one [CITED: https://www.data.gouv.fr/posts/lapi-adresse-de-la-base-adresse-nationale-est-transferee-a-lign-10] |
| Separate `/completion` autocomplete | `/search` with `autocomplete=true` default | Géoplateforme geocoder v1 | One endpoint, GeoJSON features [CITED: getCapabilities] |

**Deprecated/outdated:** `geoservices.ign.fr/documentation/.../geocodage` redirects (301) to the cartes.gouv.fr guide; use the latter as the doc reference. CONTEXT said "`/search` and `/completion`": only `/search` is used here.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The official `postgres:16` image (dev compose, VPS compose, CI) ships contrib so `CREATE EXTENSION unaccent` works for the DB user | Standard Stack, Pitfall 5 | Migration 022 fails; fall back to `translate()` SQL. Detected by CI e2e before deploy |
| A2 | API Carto has no stricter rate limit than the geocoder for our volume (no limit is published) | Parcel search | Parcel group returns 503 under bursts; mitigated by cache and the per-user throttle |
| A3 | A 10 minute server-side cache of geocoder answers is acceptable under IGN's open terms (no explicit rule found either way) | IGN geocoding | Low: shorten TTL or drop the cache; volume is far below 50 req/s |
| A4 | Hermes handles `String.prototype.normalize("NFD")` and the `[̀-ͯ]` class (the repo uses neither today) | Mobile | Accent folding degrades to case folding on the device; verify on the simulator in the first mobile plan |
| A5 | Zoom hints (municipality 13, street/address 17, poi 14) and the confidence threshold 0.85 are good defaults | IGN response shape, UI-SPEC adjustment 1 | Cosmetic; tune on the owner's phone |
| A6 | The host Caddy access log records query strings of GET requests (so search text lands in the VPS access log) | Security | Privacy note only; not read in this session |
| A7 | `unaccent.rules` folds œ/æ like the JS `fold()` | Pattern 2 | Rare mismatch for "œ"; covered by the shared fixture test |

## Open Questions

1. **UI-SPEC adjustment 1 (best-result order), needs the owner's yes or no, non-blocking.** The spec says: valid parcel, then confident place, then member, then surveys. Live scores make "confident" meaningless for personal names. Proposed rule: parcel (response has an item) > member whose display name equals the query or starts with it by whole word > place with `score >= 0.85` and kind `municipality` or POI > first own survey > first community survey. If the owner prefers the sketch order, ship the threshold at 0.9 and accept that a first name like "Marie" opens the commune card.
2. **Accepted parcel forms.** "77 AB 0123" (department only) cannot be resolved by any IGN service; the plan supports IDU, INSEE code, commune name, and (DB fallback) section plus number. The copy in the no-result block may mention "commune, section et numéro" if the owner wants a hint (new catalogue string).
3. **Attribution.** No attribution obligation was found for the geocoder; the Licence Ouverte 2.0 normally asks to cite the source. Suggest one line "Adresses : IGN, Base Adresse Nationale" in an existing Settings "À propos"-type area, not on the search page. Decision for the owner, not blocking.
4. **Members with identical display names** appear as one member row (no unique constraint, no id on the wire). Accept for now; the alternative is an opaque, stable member token in the wire type.
5. **`CADASTRE_PROVIDER=synthetic` in dev/CI** gives empty places/parcels. If the owner wants a demo list locally, add a tiny fixture behind a debug flag later; not planned.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | all | yes | v22.22.3 | n/a |
| IGN geocoder `data.geopf.fr` | places, commune name | yes (live 200) | v1.0.0 | group error + "Réessayer" |
| IGN API Carto `apicarto.ign.fr` | parcel by number | yes (live 200, ~0.65 s) | n/a | DB-known parcels only |
| Docker daemon / PostgreSQL | API e2e (`ibp_test`) | no (Docker not running in this session) | n/a | CI `e2e` job (`postgres:16` service); start Docker Desktop locally (CLAUDE.md local setup) |
| `api/.env.test` | local e2e | not checked (read of `.env*` files is denied in this session) | n/a | CI |
| Network egress from the VPS to both IGN hosts | production | yes (already used by cadastre) | n/a | n/a |

**Missing with no fallback:** none. **Missing with fallback:** local Postgres for e2e (CI covers it).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29 + ts-jest in `mobile`, `api`, `packages/ibp-domain`; `react-test-renderer` and `@testing-library/react-native/pure` on mobile; Supertest for API e2e (Postgres `ibp_test`) |
| Config files | `mobile/jest.unit.config.js`, `api/jest.unit.config.js`, `api/jest.config.js` (e2e), `packages/ibp-domain/jest.config.js` |
| Quick run command (mobile) | `cd mobile && npx jest --config jest.unit.config.js <paths>` (verified today: 4 suites, 30 tests, 4.5 s) |
| Quick run command (api unit) | `cd api && npx jest --config jest.unit.config.js test/<spec>` |
| API e2e | `cd api && npx jest --runInBand --config jest.config.js test/search.e2e-spec.ts` (needs Docker + `api/.env.test`, else CI) |
| Full suite | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`, plus `npm run test:coverage:mobile` after navigation/storage changes and `npm run test:coverage:api` after API changes |

### Phase Requirements to Test Map

| Req / Decision | Behavior | Test Type | Automated Command | File Exists? |
|----------------|----------|-----------|-------------------|--------------|
| REQ-B-global-search, D-03 | Own survey match by name, accent/case folded, name only | mobile unit | `npx jest --config jest.unit.config.js src/app/global-search.test.ts` | Wave 0 (new) |
| D-04 | Community + member SQL: accents, `%`/`_` literal, drafts/deleted excluded, `author` exact, limits | api e2e | `npx jest --runInBand --config jest.config.js test/search.e2e-spec.ts` | Wave 0 (new) |
| D-04 | Auth required (401), validation (400 on 1-char/101-char q, bad limit) | api e2e | same | Wave 0 |
| D-05, D-08 | Geocoder mapping (address + poi fixtures), de-dup, cache hit, in-flight dedupe, timeout, 400/500 guards, 503 on failure | api unit (mock `fetch`) | `npx jest --config jest.unit.config.js test/geocoder.service.spec.ts` | Wave 0 |
| D-06 | `parseParcelQuery` forms (IDU, INSEE+section+number, commune name, Paris arrondissement, numbered section, garbage) | api unit (pure) | `... test/parcel-query.spec.ts` | Wave 0 |
| D-06 | Parcel lookup + survey count + DB fallback (synthetic provider) | api unit + e2e | `... test/search.service.spec.ts`, e2e | Wave 0 |
| Throttle | `search` kind in production table and non-production ceiling | api unit | `... test/rate-limit.config.spec.ts` | extend |
| Migration | `unaccent` works | api e2e | `... test/migration-022-unaccent.e2e-spec.ts` | Wave 0 |
| D-02 | `pickBestResult` precedence, `groupOrder`, `looksLikeParcelQuery`, member prefix match | mobile unit | `src/app/global-search.test.ts` | Wave 0 |
| D-10, D-11 | Group state machine: debounce 350 ms, stale drop, offline line, re-query on reconnect, error + retry only that group, previous items kept | mobile hook unit | `src/hooks/useSearchGroup.test.ts`, `useGlobalSearch.test.ts` | Wave 0 |
| D-02b | Recents: 8 max, dedupe case-insensitive, newest first, clear/remove, cleared by `clearLocalIbpData` | mobile storage unit | `src/storage/search-recents.test.ts`, surveys storage test | Wave 0 / extend |
| D-01 | JS tree has 4 tabs, native tree unchanged; `searchGroup` registered; `surveySearch` and the title-bar button gone | mobile navigation | `src/navigation src/state/render-counts.test.tsx` then `npm run test:coverage:mobile` | extend |
| D-05, D-06 | Explorer focus union: place pin + zoom, parcel bounds + highlight, consumed once | mobile screen/hook unit | `src/screens/PublicMapScreen.test.tsx src/screens/public-map` | extend |
| D-11 | Catalogue `fr.search` complete, no dash, Proxy-safe functions | mobile | `src/i18n src/__checks__` | extend |
| UI contract | Screen states: start page, results, best result, no-result, offline, error, a11y labels, testIDs | mobile screen | `src/screens/global-search` | Wave 0 |
| Success criterion 5 | Owner phone check, light and dark, Reduce Motion on/off, iOS (native search tab) and Android (4th tab) | manual | blocking-human checkpoint | n/a |
| Contract docs | `api-contract-v1.md` section present | doc grep | `grep -q "/search/community" docs/technical/api-contract-v1.md` | Wave 0 |

### Sampling Rate

- **Per task commit:** the task's targeted Jest command (2 to 25 s).
- **Per wave merge:** `npm run lint && npm run typecheck && npm run test:unit && npm run format:check && npm run test:coverage:mobile` (+ `test:coverage:api` when the API changed).
- **Phase gate:** full suite green and API e2e green in CI before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `api/test/parcel-query.spec.ts`, `geocoder.service.spec.ts`, `search.service.spec.ts`, `search.e2e-spec.ts`, `migration-022-unaccent.e2e-spec.ts`; recorded IGN fixtures (address, poi, municipality, API Carto parcel) as inline JSON.
- [ ] `mobile/src/app/search-text.test.ts`, `global-search.test.ts`, `storage/search-recents.test.ts`, `hooks/useSearchGroup.test.ts`, `screens/global-search/*.test.tsx`.
- [ ] No framework install needed.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no change | Existing Auth0 RS256 `AuthGuard` on the controller |
| V3 Session Management | no | Bearer token as everywhere |
| V4 Access Control | yes | `@UseGuards(AuthGuard)`; same visibility as the map and community list (`PUBLIC_SURVEY_PREDICATE`); drafts never returned; `author` filter never widens visibility |
| V5 Input Validation | yes | `class-validator` DTO (length caps), server trimming and character guards, parameterised SQL only, `escapeLikePattern`, outbound URLs built with `URLSearchParams` from fixed config hosts |
| V6 Cryptography | no | none |
| V8 Data Protection / privacy | yes | Never log `q` (the error filter already strips the query string; keep new `Logger` messages query-free); wire carries `display_name` only (never email, first/last name or user id); recents local and cleared on owner change |
| V13 API | yes | Per-handler throttle; cache + concurrency cap in front of a third party; 503 not 500 for provider failure |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection through `q` | Tampering | Bound parameters only; `%`/`_`/`\` escaped |
| SSRF / parameter injection into the IGN URL | Tampering | Host fixed by config, `q` only as an encoded query value, no user-supplied URL or path |
| Third-party quota exhaustion (50 req/s/IP shared by all users) | Denial of service | Per-user throttle 240/min per handler, LRU cache, in-flight dedupe, concurrency cap, timeout 2.5 s |
| Enumeration of members through name search | Information disclosure | Same exposure as `author_name` in the existing community search; only finished surveys count; `members` capped at 5; no id/email |
| Personal data in logs (addresses typed by the user) | Information disclosure | No query logging; Caddy access log note (A6) |
| Stale recents after account switch | Information disclosure | `clearLocalIbpData` deletes `search_recents` |

## Sources

### Primary (HIGH confidence)
- Live calls to `https://data.geopf.fr/geocodage/search`, `/completion`, `/getCapabilities`, `/openapi` (2026-10-09): endpoint, no key, filters, response shapes, scores, input errors, latency, headers, burst of 20 calls.
- Live call to `https://apicarto.ign.fr/api/cadastre/parcelle` (2026-10-09): parcel by commune/section/number with polygon and `nom_com`.
- Repo code read in this session: `api/src/surveys/{cadastre-provider.service,parcels.service,parcels.controller,public.controller,public-map.queries,public-map.service,community-surveys.service,surveys-normalize.utils}.ts`, `api/src/config/{env.schema,app-config}.ts`, `api/src/common/rate-limit.config.ts`, `api/src/auth/throttler.guard.ts`, `api/src/common/http-error-logging.filter.ts`, `api/migrations/*`, mobile navigation, screens, hooks, storage, i18n and `__checks__`, `packages/ibp-domain/src/contract/*`.
- https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/geocodage/ (50 requêtes par seconde par IP, endpoints, indexes)
- https://data.geopf.fr/geocodage/getCapabilities (parameters, indexes, fields)
- https://www.data.gouv.fr/dataservices/api-geoplateforme-geocodage (50 req/s/IP, "Ouvert", Licence Ouverte 2.0 generic)
- https://www.postgresql.org/docs/16/unaccent.html (trusted extension)

### Secondary (MEDIUM confidence)
- https://www.data.gouv.fr/posts/lapi-adresse-de-la-base-adresse-nationale-est-transferee-a-lign-10 (API Adresse moved to the IGN Géoplateforme; old host retired)
- https://apicarto.ign.fr/api/doc/ (licence of the data sources kept; no rate limit stated)

### Tertiary (LOW confidence)
- Third-party directory claims about a 5 second block after a 429 and "2 simultaneous requests per IP" on the old API Adresse: not confirmed for data.geopf.fr (our 20 parallel calls passed). Not relied on.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new dependency, everything exists in the repo.
- IGN facts: HIGH for endpoint, key, shapes, limits (live, today); MEDIUM for terms (no specific terms published).
- Architecture: HIGH for API and navigation (read in code); MEDIUM for the Explorer pin (new MapLibre layer not prototyped).
- Pitfalls: HIGH (most are observed live or in code).

**Research date:** 2026-10-09
**Valid until:** 2026-11-08 (IGN endpoints are stable; re-check the rate-limit header and the `parcel` index behaviour if a call starts failing).

---

## Plan-shaping appendix

### Suggested plan and wave layout (Phase 24 style: `must_haves`, `depends_on`, a final blocking-human owner plan; the repo used 12 plans in 6 waves for Phase 24)

| Wave | Plan | Content | Depends on |
|------|------|---------|------------|
| 1 | 25-01 | `ibp-domain` search wire types; migration 022 (`unaccent` + optional parcels index); `search.queries.ts` SQL builders; community/members service + e2e (accents, wildcards, limits, auth) | none |
| 1 | 25-02 | `GeocoderService` (cache, dedupe, timeout, mapping, env var in the six files), `parseParcelQuery`, `lookupParcelByKey`, parcel service with DB fallback + unit specs | none |
| 1 | 25-03 | Mobile pure foundations: `search-text.ts`, `global-search.ts` (best result, group order, parcel gate, own match), `storage/search-recents.ts` + `clearLocalIbpData`, catalogue `fr/search.ts` (+ catalogue test key), all tested | none |
| 2 | 25-04 | `SearchController` + DTO + `SEARCH_THROTTLE` + module wiring + rate-limit spec + `api-contract-v1.md`; e2e for the three endpoints | 25-01, 25-02 |
| 2 | 25-05 | Mobile API client functions + `useSearchGroup` / `useGlobalSearch` hooks | 25-03 (types from 25-01) |
| 2 | 25-06 | Navigation: `searchGroup` route, JS 4th tab, remove `surveySearch` + title-bar button, `PublicMapFocus` union and all call sites, tests and coverage | none |
| 3 | 25-07 | `GlobalSearchScreen` + start page + best-result + group cards + notices + route (`SearchHomeRoute`) | 25-03, 25-05, 25-06 |
| 3 | 25-08 | `SearchGroupListScreen` (+ member variant, chips on "Mes relevés") + route | 25-05, 25-06 (can share 25-07 components) |
| 3 | 25-09 | Explorer: place pin layer + parcel focus (`useSearchFocus`), `MapCanvas`/`PublicMapScreen` changes under the 400-line cap | 25-06 |
| 4 | 25-10 | Cleanup (old screen, route, hook, catalogue keys, dead context fields decision), CLAUDE.md navigation/env notes, `docs/technical/api-contract-v1.md` check, full gates + coverage | 25-04, 25-07, 25-08, 25-09 |
| 5 | 25-11 | Owner phone check (blocking, `autonomous: false`): light and dark, Reduce Motion, iOS native search tab and the Android JS 4th tab (simulator evidence if no Android device), a place, a forest POI, a parcel by commune + section + number, a member, offline mode; then REQ-B-global-search ticked and an owner-acceptance row | all |

### Project Constraints (from CLAUDE.md)

- npm workspaces: `mobile`, `api`, `@cortege/ibp-domain`; no `prepare` script on the package; wire types go in `@cortege/ibp-domain` (api reads `dist`, Metro/Jest/tsc read `src`; `npm run build:domain` for the API runtime).
- Never call `useSurveySync` outside `AppStateProvider`; read state through context hooks; actions are stable.
- All user-facing text from the typed French catalogue; no em dash anywhere under `mobile/src`; status-line texts are `StatusMessage` values (not used here).
- Colours only through `useBrandTheme()`; hex/`rgba(` only in the five token files; Ionicons outline glyphs only; motion through `brandMotion` with `ReduceMotion.System`; haptics only via `ui/feedback.ts`; 400-line cap on `src/screens` and `src/navigation`.
- API: raw SQL via `pg`, no ORM; DTOs with `class-validator`, suffix `Dto`/`Body`; migrations are numbered SQL files (next is 022), no `CREATE INDEX CONCURRENTLY`; the API sends no email.
- Prettier: double quotes, no semicolons, trailing commas, 2 spaces, 100 columns. ESLint: unused vars error (prefix `_`), no `any`, no `require`.
- Before committing: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run format:check`.
- Memory notes: owner forbids the em dash in UI strings; prod is test data (no two-step migrations needed); verify a commit is in `origin/main` before claiming it merged; owner phone-build recipe (CocoaPods UTF-8, locked phone) for the final checkpoint, with the explicit-yes rule for building from the main checkout as in plan 24-12.
