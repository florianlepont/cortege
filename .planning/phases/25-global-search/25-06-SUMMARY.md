---
phase: 25-global-search
plan: 06
subsystem: api
tags: [search, ign, geocoder, cache, config]
requires:
  - "25-01 (SearchPlaceItem, SearchPlacesResponse wire types)"
provides:
  - "GEOCODING_IGN_SEARCH_URL setting -> appConfigOf(config).cadastre.searchUrl (default https://data.geopf.fr/geocodage/search)"
  - "fetchIgnJson(url, { timeoutMs, label }) in api/src/surveys/ign-http.ts (the shared IGN HTTP rule)"
  - "GeocoderService.searchPlaces(q, limit) and GeocoderService.resolveCommunes(name) in api/src/surveys/geocoder.service.ts, not yet registered in a module"
  - "mapGeocoderFeature(feature), MAX_CONCURRENT_IGN_CALLS = 8, PLACES_CACHE_TTL_MS, COMMUNES_CACHE_TTL_MS, GeocoderCommune type"
  - "HTTP 503 { code: 'search_provider_unavailable' } thrown as ServiceUnavailableException on any provider failure"
affects: [25-10, 25-13, 25-15]
tech-stack:
  added: []
  patterns: ["LRU cache + in-flight Map + running-call counter in front of a third-party host", "warn log with the failure message only, never the query"]
key-files:
  created:
    - api/src/surveys/ign-http.ts
    - api/test/ign-http.spec.ts
    - api/src/surveys/geocoder.service.ts
    - api/test/geocoder.service.spec.ts
  modified:
    - api/src/config/env.schema.ts
    - api/src/config/config.types.ts
    - api/src/config/app-config.ts
    - api/test/env.schema.spec.ts
    - api/.env.example
    - api/.env.production.example
    - infra/.env.example
    - infra/vps/env.example
    - api/README.md
key-decisions:
  - "A POI is de-duplicated on name plus first city code, replacing the earlier entry in place when a later duplicate scores higher (provider order kept)"
  - "Non-municipality address features get the city first in their context ('Fontainebleau, Seine-et-Marne (77)'); a municipality gets only the department label"
  - "The concurrency cap is checked only on a real outbound call, so a cache hit or a shared in-flight call is never refused at the cap"
  - "The cap-reached 503 is logged as 'IGN geocoder failed: concurrent call cap reached' (no query)"
  - "Cache key = kind | limit | folded query for places, kind | folded query for communes; one LRUCache (500 entries) with a per-entry ttl"
requirements-completed: [REQ-B-global-search]
metrics:
  tasks: 3
  files: 13
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 06: IGN place search Summary

The API can now resolve places and addresses through the IGN Geoplateforme geocoder (`index=address,poi`) behind a 10 minute cache, in-flight de-duplication, an 8-call cap and the 2.5 s timeout, and resolve commune names to INSEE codes for the parcel search of plan 25-10.

## Tasks

| Task | Commit | Result |
|------|--------|--------|
| 1. `GEOCODING_IGN_SEARCH_URL` setting and env docs | e05671f3 | optional variable, `cadastre.searchUrl` default, default and override asserted in `env.schema.spec.ts`; documented in the four env examples and `api/README.md` |
| 2. Shared IGN HTTP helper and the place search mapping | c9523abd | `fetchIgnJson`, `mapGeocoderFeature`, `searchPlaces` (query normalisation, address and POI shapes, POI de-duplication, 503 on failure, no query in logs) |
| 3. Cache, de-duplication, cap, commune resolution | 323f12d9 | `LRUCache` (500 entries, 10 min places, 30 min communes), in-flight map, `MAX_CONCURRENT_IGN_CALLS = 8`, `resolveCommunes` (score >= 0.8, at most 3) |

## Verification

- `env.schema.spec.ts`, `ign-http.spec.ts`, `geocoder.service.spec.ts`: all pass (43 tests in the last two).
- `npm run test:coverage:api`: 41 of 42 suites pass; the only failure is `check-env-parity.spec.ts` (macOS bash 3.2 `declare -A`, known and unrelated). `geocoder.service.ts` 100% statements/lines/functions, 95.7% branches; `ign-http.ts` 100%.
- `npm run lint`, `npm run typecheck` exit 0. `npm run format:check` flags only `.claude/settings.local.json` (a git-ignored local tooling file, not part of this plan); every file of this plan is Prettier-clean.
- Greps: `export async function fetchIgnJson`, `export function mapGeocoderFeature`, `address,poi`, `search_provider_unavailable`, `MAX_CONCURRENT_IGN_CALLS = 8`, `LRUCache`, `async resolveCommunes` all present; `grep -cE "https?://" api/src/surveys/geocoder.service.ts` prints 0.
- `git grep -l GEOCODING_IGN_SEARCH_URL -- api infra` lists `env.schema.ts`, `app-config.ts`, `api/README.md`, `infra/vps/env.example`, `api/.env.example`, `api/.env.production.example`, `infra/.env.example`. All four env example files could be edited here, so the owner has nothing to add by hand.
- The e2e suites were not run (Docker is off); this plan adds none.

## Deviations from Plan

None in scope. Two notes on implementation choices:

- The TTL specs read the clock through `performance.now` (lru-cache's clock, which jest fake timers do not move) and wait 5 ms of real time after each advance, because lru-cache holds a cached "now" for 1 ms. This is test-only.
- `check-env-parity.spec.ts` fails locally for the known bash 3.2 reason; the new optional variable has a default so it does not affect required-variable parity in CI.

## Notes for the next plans

- 25-13 (endpoint): register `GeocoderService` in the surveys module providers; map nothing, it already throws `ServiceUnavailableException({ code: "search_provider_unavailable" })`; `searchPlaces` returns `{ items: [] }` for a query under 3 characters after normalisation, over 100, or for `CADASTRE_PROVIDER=synthetic`. The controller should still validate `limit` (1..10); the service clamps to 1..50.
- 25-10 (parcels): `resolveCommunes(name)` returns `[{ code, name }]` (at most 3, best first) or throws the same 503; it returns `[]` with no call for synthetic or a name under 3 characters. `CadastreProviderService` has not been switched to `fetchIgnJson` yet (planned in 25-10).
- 25-15 (docs): add `GEOCODING_IGN_SEARCH_URL` to the CLAUDE.md env table and document the 503 `search_provider_unavailable` shape in `api-contract-v1.md`.
- Place `id` is the BAN id for addresses, the BD TOPO `cleabs` for POIs, else `name:citycode`; ids are only stable keys for list rendering, not for lookup.

## Known Stubs

None.

## Threat Flags

None. The only outbound host is the configured URL (T-25-13, T-25-17), the query is one encoded `q` value, no log carries the text (T-25-15), and every provider field is validated (T-25-16).

## Self-Check: PASSED

- Files exist: `api/src/surveys/ign-http.ts`, `api/src/surveys/geocoder.service.ts`, `api/test/ign-http.spec.ts`, `api/test/geocoder.service.spec.ts`, this SUMMARY.
- Commits exist: e05671f3, c9523abd, 323f12d9.
