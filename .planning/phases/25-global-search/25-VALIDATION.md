---
phase: 25
slug: global-search
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-09
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `25-RESEARCH.md` section "Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + ts-jest (mobile, api, `packages/ibp-domain`); `@testing-library/react-native/pure` on mobile; Supertest for API e2e (Postgres `ibp_test`) |
| **Config file** | `mobile/jest.unit.config.js`, `api/jest.unit.config.js`, `api/jest.config.js` (e2e), `packages/ibp-domain/jest.config.js` |
| **Quick run command** | mobile: `cd mobile && npx jest --config jest.unit.config.js <paths>`; api unit: `cd api && npx jest --config jest.unit.config.js test/<spec>` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check` (+ `npm run test:coverage:mobile` after navigation/storage changes, `npm run test:coverage:api` after API changes) |
| **Estimated runtime** | quick 2 to 25 s per task; full suite several minutes; API e2e needs Docker (else CI) |

---

## Sampling Rate

- **After every task commit:** the task's targeted Jest command
- **After every plan wave:** the full suite command above
- **Before `/gsd-verify-work`:** full suite green and API e2e green in CI
- **Max feedback latency:** 30 seconds per task

---

## Per-Task Verification Map

Filled by the planner from the table in `25-RESEARCH.md` ("Phase Requirements to Test Map"): each task points at one row (own-survey match, community and member SQL, geocoder mapping and cache, parcel query forms, throttle kind, unaccent migration, best-result precedence, group state machine, recents, navigation, Explorer focus, catalogue, screen states, contract doc).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | REQ-B-global-search (D-15) | T-25-01 | member wire type has no id/email | type check | `npm --workspace @cortege/ibp-domain run test:coverage && npm run typecheck` | ❌ W0 | ⬜ pending |
| 25-01-02 | 01 | 1 | D-16 | T-25-02 | n/a | mobile unit | `cd mobile && npx jest --config jest.unit.config.js src/app/search-text.test.ts` | ❌ W0 | ⬜ pending |
| 25-01-03 | 01 | 1 | D-02, D-03, D-13, D-14 | T-25-02 | n/a | mobile unit | `cd mobile && npx jest --config jest.unit.config.js src/app/global-search.test.ts` | ❌ W0 | ⬜ pending |
| 25-02-01 | 02 | 1 | D-11 | n/a | n/a | mobile unit | `cd mobile && npx jest --config jest.unit.config.js src/i18n src/__checks__/catalogue-dash.test.ts` | ❌ W0 | ⬜ pending |
| 25-02-02 | 02 | 1 | D-02b, D-16 | T-25-03, T-25-04 | recents cleared on owner change | mobile storage | `cd mobile && npx jest --config jest.unit.config.js src/storage/search-recents.sqlite.test.ts` | ❌ W0 | ⬜ pending |
| 25-03-01 | 03 | 1 | D-01 | n/a | n/a | mobile navigation | `cd mobile && npx jest --config jest.unit.config.js src/navigation/tabs.test.tsx src/navigation/navigation.test.tsx` | ✅ extend | ⬜ pending |
| 25-03-02 | 03 | 1 | D-01 | T-25-06 | n/a | mobile navigation | `cd mobile && npx jest --config jest.unit.config.js src/navigation src/screens/SurveyListScreen.test.tsx` | ✅ extend | ⬜ pending |
| 25-04-01..03 | 04 | 1 | D-02 (rows) | T-25-07 | plain text rendering | mobile component | `cd mobile && npx jest --config jest.unit.config.js src/screens/survey-list src/screens/community-survey src/screens/global-search/SearchResultRow.test.tsx src/__checks__` | ❌ W0 | ⬜ pending |
| 25-05-01 | 05 | 2 | D-16 | T-25-12 | idempotent migration | api e2e (CI) | `cd api && npx jest --runInBand --config jest.config.js test/migration-022-unaccent.e2e-spec.ts` | ❌ W0 | ⬜ pending |
| 25-05-02..03 | 05 | 2 | D-04, D-17 | T-25-08..11 | bound params, `%`/`_` literal, no drafts, no query log | api unit | `cd api && npx jest --config jest.unit.config.js test/search.queries.spec.ts test/search.service.spec.ts test/public-map.service.spec.ts` | ❌ W0 | ⬜ pending |
| 25-06-01 | 06 | 2 | D-08, D-12 | n/a | n/a | api unit | `cd api && npx jest --config jest.unit.config.js test/env.schema.spec.ts` | ✅ extend | ⬜ pending |
| 25-06-02..03 | 06 | 2 | D-05, D-08, D-09, D-12, D-13, D-15 | T-25-13..17 | URL from config, encoded q, cache, cap, 503, no query log | api unit (mocked fetch) | `cd api && npx jest --config jest.unit.config.js test/ign-http.spec.ts test/geocoder.service.spec.ts` | ❌ W0 | ⬜ pending |
| 25-07-01..03 | 07 | 2 | D-10, D-11, D-15, D-02b | T-25-18..20 | encoded params, no console log | mobile hook unit | `cd mobile && npx jest --config jest.unit.config.js src/api/ibp-api.test.ts src/hooks/useSearchGroup.test.ts src/hooks/useGlobalSearch.test.ts src/hooks/useSearchRecents.test.ts` | ❌ W0 | ⬜ pending |
| 25-08-01..02 | 08 | 2 | D-05, D-06 | T-25-21, T-25-22 | one-shot focus | mobile screen/hook unit | `cd mobile && npx jest --config jest.unit.config.js src/screens/public-map src/map/maplibre src/screens/survey-detail/SeeOnMapAction.test.tsx` | ✅ extend | ⬜ pending |
| 25-09-01..03 | 09 | 2 | D-02, D-02b, D-10 | T-25-23, T-25-29 | catalogue sentences only | mobile component | `cd mobile && npx jest --config jest.unit.config.js src/screens/global-search src/__checks__` | ❌ W0 | ⬜ pending |
| 25-10-01..03 | 10 | 3 | D-06, D-13 | T-25-24..28 | parsed values bound, API Carto only, no query log | api unit (mocked fetch) | `cd api && npx jest --config jest.unit.config.js test/parcel-query.spec.ts test/cadastre-provider.service.spec.ts test/parcel-search.service.spec.ts` | ❌ W0 | ⬜ pending |
| 25-11-01..03 | 11 | 3 | D-02, D-02b, D-10, D-11 | T-25-30..32 | query kept out of contexts, maxLength 100 | mobile screen/route | `cd mobile && npx jest --config jest.unit.config.js src/screens/global-search src/navigation/routes/SearchHomeRoute.test.tsx` | ❌ W0 | ⬜ pending |
| 25-12-01..02 | 12 | 3 | D-02, D-04, D-10 | T-25-33, T-25-34 | author filter only narrows | mobile screen/route | `cd mobile && npx jest --config jest.unit.config.js src/screens/global-search src/navigation/routes/SearchGroupRoute.test.tsx` | ❌ W0 | ⬜ pending |
| 25-13-01 | 13 | 4 | D-15 | T-25-35..37 | AuthGuard, per-handler throttle, DTO caps | api unit | `cd api && npx jest --config jest.unit.config.js test/rate-limit.config.spec.ts test/search.controller.spec.ts` | ✅ extend | ⬜ pending |
| 25-13-02 | 13 | 4 | D-04, D-06, D-13, D-16 | T-25-38 | 401, 400, no drafts/deleted/own, no ids | api e2e (CI) | `cd api && npx jest --runInBand --config jest.config.js test/search.e2e-spec.ts` | ❌ W0 | ⬜ pending |
| 25-13-03 | 13 | 4 | D-15 (contract doc) | n/a | n/a | doc grep | `grep -q "/search/community" docs/technical/api-contract-v1.md` | ✅ extend | ⬜ pending |
| 25-14-01..03 | 14 | 4 | D-01 (cutover), Pitfall 6 | T-25-40, T-25-41 | keystrokes re-render nothing else | mobile navigation + full suite | `npm run test:coverage:mobile && npm run test:unit` | ✅ extend | ⬜ pending |
| 25-15-01..03 | 15 | 5 | ROADMAP criterion 5 | T-25-42..45 | owner consent before build or merge | manual (blocking-human) + doc grep | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/test/parcel-query.spec.ts`, `geocoder.service.spec.ts`, `search.service.spec.ts`, `search.e2e-spec.ts`, `migration-022-unaccent.e2e-spec.ts` with recorded IGN fixtures (address, poi, municipality, API Carto parcel)
- [ ] `mobile/src/app/search-text.test.ts`, `global-search.test.ts`, `storage/search-recents.test.ts`, `hooks/useSearchGroup.test.ts`, `screens/global-search/*.test.tsx`
- [ ] No framework install needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Search on the owner's phone, light and dark, Reduce Motion on and off | REQ-B-global-search (criterion 5) | Visual and real IGN network | iOS native search tab and Android 4th tab: a place, a forest, a parcel by commune + section + number, a member, offline mode |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
