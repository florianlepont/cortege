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
| 25-xx-xx | tbd | tbd | REQ-B-global-search | queries not logged; `%`/`_` literal; limits | see RESEARCH Security Domain | unit / e2e | per task | ❌ W0 | ⬜ pending |

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
