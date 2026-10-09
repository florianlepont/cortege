# Phase 25: Global Search - Context

**Gathered:** 2026-10-09
**Status:** Ready for sketches, then UI contract and planning

<domain>
## Phase Boundary

One search page, reachable from every main tab, finds: the member's own surveys (by survey name), other members' surveys (by survey name and by member), places and addresses (resolved to a map position), and cadastral parcels (by parcel number). Each result leads straight to its item (survey page, or Explorer centred on the place or parcel). Builds on the final Phase 24 survey screens. Does not include the PDF export (25.1) or the UX audit (26).

</domain>

<decisions>
## Implementation Decisions

### Entry point
- **D-01:** A magnifier button in the header of every main tab opens the one search page. On iOS the native search tab stays and opens the same page (`SurveySearchRoute`); on Android and the JS tabs the button pushes it. There is one search page, not one per tab.
- **D-02:** The exact placement of the button, the page layout and the grouped results are designed in sketches (013 and following) BEFORE any code (owner rule).

### What is searched (four result groups)
- **D-03:** Own surveys by survey name (site name), from local data, offline.
- **D-04:** Community: surveys of other members by survey name AND by member (author display name). "User search" = finding members' surveys through their name; no member profile page is added (that would be a new capability). Server side, via the existing `GET /public/community-surveys?q=` (already searches site name and author name) or an evolution of it.
- **D-05:** Places and addresses: a typed place name or address resolves to a map position; tapping a result opens Explorer centred there.
- **D-06:** Parcels by cadastral parcel number (commune, section, number; the parser `parseParcelIdu` and the `parcels.controller` lookup already exist server side); tapping a result opens Explorer on that parcel.
- **D-07:** Not searched in this phase: IBP factors, genera, settings, screens (see Deferred).

### Place provider and cost
- **D-08:** Place and address search uses the IGN geocoding service, the same provider family as the cadastre, called through our own API (rate limit and short cache, like `cadastre-provider.service.ts`), never directly from the phone. Expected cost: nothing recurring (no key, no paid plan), inside the ~EUR 346/yr budget. The researcher MUST confirm the current IGN usage terms, rate limits and endpoint before planning; if they changed, come back to the owner.
- **D-09:** A paid provider and the public OpenStreetMap service were rejected (recurring cost; usage policy).

### Offline and results display
- **D-10:** Offline, own surveys are shown immediately. The community, place and parcel groups stay visible with a plain line saying they need a connection; they are never hidden and never hide the local results.
- **D-11:** Results are grouped by type with a bounded count per group, debounced input, and empty, no-result and error states, all text from the French catalogue (`mobile/src/i18n/fr`, no em dash).

### Claude's Discretion
- Debounce delay, per-group result limits, group order, the exact API shape (new `GET /v1/search` or per-group calls), caching details.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning
- `.planning/ROADMAP.md` section "Phase 25" - goal and five success criteria
- `.planning/REQUIREMENTS.md` - REQ-B-global-search
- `.planning/seeds/SEED-003-recherche-globale.md` - original idea and breadcrumbs
- `.planning/PROJECT.md` - budget constraint (~EUR 346/yr)
- `.planning/sketches/011-history-placement/`, `012-parcel-history-form/` - style of the existing sketches

### Code
- `mobile/src/navigation/routes/SurveySearchRoute.tsx`, `navigation/stacks/SearchStack.tsx`, `navigation/stacks/SurveysStack.tsx` - current search entry
- `mobile/src/screens/survey-search/SurveySearchScreen.tsx` - current Mes relevés / Communauté page
- `mobile/src/hooks/useCommunitySurveys.ts` - community search state
- `api/src/surveys/public.controller.ts`, `community-surveys.service.ts`, `dtos/community-surveys-query.dto.ts` - community search endpoint
- `api/src/surveys/cadastre-provider.service.ts`, `parcels.controller.ts`, `surveys-normalize.utils.ts` - IGN provider, parcel lookup and parsing
- `mobile/src/hooks/usePublicMapExplorer.ts`, `mobile/src/screens/public-map/` - Explorer, target of place and parcel results
- `docs/technical/api-contract-v1.md` - API contract to extend
- `CLAUDE.md` - conventions (catalogue, no em dash, theme, single state assembler)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SurveySearchScreen` + `CommunityRow` + `SurveyRow`: result rows for own and community surveys
- `GET /public/community-surveys?q=&limit=` (limit max 50): already matches site name and author name
- IGN provider in the API (reverse, API Carto, WFS) with cache and fallback: pattern for a geocoding call
- `useDebouncedValue`, `ListEntranceRow`/`useListEntrance`, `AppChoiceChip`

### Established Patterns
- Text only from the French catalogue; colours via `useBrandTheme()`; screens/navigation files capped at 400 lines
- Navigation typed through `RootParamList`; tab-bar hiding via `shouldHideTabBar`
- Local-first: own surveys never need the network

### Integration Points
- Header of the three tab stacks (button), `SearchStack`, Explorer camera (centre on a position or parcel), API `surveys` module

</code_context>

<specifics>
## Specific Ideas

Owner's list of what to find: places, parcel number, user (member), survey name.

</specifics>

<deferred>
## Deferred Ideas

- Searching IBP factors, genera and settings/screens (SEED-003 mentioned them; owner did not select them 2026-10-09). Candidate for a later phase.
- A member profile page (needed only if "search by user" should open a profile rather than their surveys).

</deferred>
