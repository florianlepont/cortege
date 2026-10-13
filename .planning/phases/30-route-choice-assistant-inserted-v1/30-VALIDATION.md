---
phase: 30
slug: route-choice-assistant-inserted-v1
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-13
---

# Phase 30 — Validation Strategy

> Per-phase validation contract. The full requirement-to-test map is in `30-RESEARCH.md`, section "Validation Architecture"; the planner copies task ids into the table below.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + ts-jest (package, api, mobile); Supertest for API e2e |
| **Config files** | `packages/ibp-domain/jest.config.js` (100 % thresholds), `api/jest.unit.config.js`, `api/jest.config.js` (e2e, `ibp_test`), `mobile/jest.unit.config.js` |
| **Quick run command** | `npm --workspace @cortege/ibp-domain run test` (package); `cd api && npx jest --runInBand -c jest.unit.config.js <file>`; `cd mobile && npx jest -c jest.unit.config.js <path> --coverage=false` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`, then `npm run test:e2e` (local Postgres) |
| **Estimated runtime** | ~300 seconds (unit), e2e extra |

## Sampling Rate

- **After every task commit:** the targeted test files of the touched workspace; any change under `packages/ibp-domain` also runs `npm run test:coverage:domain`
- **After every plan wave:** `npm run test:unit`, touched e2e files, `npm run typecheck`, `npm run format:check`
- **Before `/gsd-verify-work`:** full suite green plus mobile source gates (`src/__checks__`)
- **Max feedback latency:** 300 seconds

## Per-Task Verification Map

Filled by the planner (one row per task, ids `30-NN-MM`). Requirement ids proposed by research: `REQ-DOC-route-rules`, `REQ-C-route-guide`, `REQ-C-route-record`, `REQ-C-route-display`, `REQ-C-uncapped-entry`, `REQ-FT-route-test` (and `REQ-C-route-group` for Phase 30.1).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-XX-XX | — | — | — | — | — | — | — | ❌ W0 | ⬜ pending |

## Wave 0 Requirements

- [ ] `docs/specs/route-choice-rules-v1.md` and the dated owner validation line (owner)
- [ ] `packages/ibp-domain/src/route.test.ts`, `route-guide.test.ts`, `route-cases.ts` (fixture)
- [ ] `api/test/migration-024-survey-route.e2e-spec.ts`, `api/test/surveys-route.e2e-spec.ts`
- [ ] `mobile/src/map/parcel-area.test.ts`, `mobile/src/storage/surveys.route.sqlite.test.ts`, `mobile/src/screens/route-guide/*.test.tsx`
- [ ] `docs/user-tests/route-choice-assistant.md` (test plan then report)

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Written rules validated | REQ-DOC-route-rules | Owner decision, dated in the spec | Owner reads `route-choice-rules-v1.md`, resolves O-01..O-16, writes the date |
| Wording of every French sentence | REQ-C-route-guide | Plain-French quality | Owner review of reasons, questions, glossary |
| Unaided tester completes the choice, recorded | REQ-FT-route-test | Needs a real tester | Protocol in `docs/user-tests/route-choice-assistant.md` |
| Questionnaire layout and keyboard on a small phone; PDF look on both platforms | REQ-C-route-guide, REQ-C-route-display | Not unit testable | Owner or tester on device |

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
