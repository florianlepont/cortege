---
phase: 27
slug: quick-survey-additions-inserted-v1
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-11
---

# Phase 27 - Validation Strategy

> Per-phase validation contract. The full requirement-to-test map, the Wave 0 gaps and the six device checks are in `27-RESEARCH.md` section "Validation Architecture"; this file is the contract the plans and the verifier cite. The planner fills the per-task map once the plans exist.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + ts-jest in every workspace; Supertest for API e2e |
| **Config files** | `packages/ibp-domain/jest.config.js` (100% thresholds), `api/jest.unit.config.js`, `api/jest.config.js` (e2e, `ibp_test`), `mobile/jest.unit.config.js` |
| **Quick run command** | `npm --workspace @cortege/ibp-domain run test`; `npm --workspace api run test:unit -- --testPathPattern <name>`; `npm --workspace mobile run test:unit -- <name>` |
| **Full suite command** | `npm run test:unit && npm run test:e2e && npm run lint && npm run typecheck && npm run format:check` |
| **Estimated runtime** | quick ~30 s per file set; full several minutes (e2e needs the Docker Postgres) |

---

## Sampling Rate

- **After every task commit:** the targeted test file(s) of the touched workspace plus lint on it; any change under `packages/ibp-domain` also runs `npm run test:coverage:domain` (100%)
- **After every plan wave:** `npm run test:unit`, the e2e files touched in the wave, `npm run typecheck`, `npm run format:check`
- **Before `/gsd-verify-work`:** full `npm run test`, lint, typecheck, format, mobile source gates (`__checks__`), then the device checks
- **Max feedback latency:** 120 seconds for the quick run

---

## Per-Task Verification Map

Filled by the planner (one row per task, citing the plan's `<automated>` command). Requirement-level skeleton:

| Requirement | Behavior | Test Type | Automated Command | Status |
|-------------|----------|-----------|-------------------|--------|
| REQ-C-doubt-flag (SVA-03) | Same survey with and without `factors.annotations` gives identical score, bands, issues in package, API adapter and mobile adapter (`MAT-ANN-01@both`) | unit (parity) | `npm run test:unit` | ⬜ pending |
| REQ-C-conditions-sync (SVA-06) | Migration 023, upsert/sync round trip, same-version compare, submitted read-only, nested `weather` validation, fast-path SQL numbering | e2e + unit | `npm run test:e2e` (migration-023, surveys-note-weather, surveys-same-version, surveys-submit, sync-validation) | ⬜ pending |
| REQ-C-survey-note (SVA-01), REQ-C-factor-note (SVA-02) | Limits 1000/300, visibility on community and history reads, own-survey note search, PDF block and escaping | unit + e2e | see RESEARCH map | ⬜ pending |
| REQ-C-weather-provider (SVA-04) | Station ranking, distance cap, `too_old`, cache, de-duplication, 503, token refresh, no secret in logs, config rules | unit | `npm --workspace api run test:unit -- --testPathPattern weather` | ⬜ pending |
| REQ-C-weather-prefill (SVA-05) | State machine, per-value edit protection persisted, offline catch-up within 24 h, no overwrite | unit | `npm --workspace mobile run test:unit -- weather` | ⬜ pending |
| D-18 and UI-SPEC | No em dash, abbreviation gate, 400-line cap, motion/icon gates, contrast pairs | source gates | `npm --workspace mobile run test:unit -- __checks__ visual-tokens palette` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Provider spike with the owner's Météo-France credential (human checkpoint): real station list and hourly responses captured as fixtures; units, field names, token flow, date parameter, distance cap, sky and 24 h rain availability recorded
- [ ] `api/test/migration-023-survey-note-weather.e2e-spec.ts`
- [ ] `api/test/surveys-note-weather.e2e-spec.ts`
- [ ] `api/test/weather.service.spec.ts`, `meteofrance-http.spec.ts`, `weather.controller.spec.ts`, `WEATHER_PROVIDER=synthetic` in `api/test/setup-env.js`
- [ ] `MAT-ANN-01@both` in `packages/ibp-domain/src/parity/cases.ts` and the matrix v2 rows
- [ ] Mobile: `app/weather.test.ts`, `useWeatherPrefill.test.ts`, strip, section and card component tests; PDF `conditions-section.test.ts`
- [ ] Contrast additions in `visual-tokens.test.ts` and `palette.test.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF page budget (1000-character note, ten 300-character notes, ten doubts, weather) | SVA-01, SVA-02, SVA-03 | Layout measured on real engines | Export on iOS simulator and Android emulator, draft and submitted: at most one extra page, no cut text; record page counts beside `export-settings.ts` |
| Keyboard behaviour (note field, counter, bottom bar hidden while typing) | SVA-02 | Keyboard geometry | 320x568 iOS and 360x640 Android |
| Offline weather catch-up | SVA-05 | Needs airplane mode and time | Choose the parcel offline, return online within 24 h: weather of the survey time, hand edits untouched; submit offline first: no late fill |
| Real provider call from the VPS | SVA-04 | Owner credential | One real answer end to end, units and attribution line |
| Interaction budget (phase 12, about 40) | UI-SPEC | Human counting | Full survey without touching the strip costs the same taps |
| Screen reader and largest Dynamic Type | UI-SPEC | Assistive tech | Strip row, weather fields, score rows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
