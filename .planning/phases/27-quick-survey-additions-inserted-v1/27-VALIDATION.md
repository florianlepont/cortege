---
phase: 27
slug: quick-survey-additions-inserted-v1
status: planned
nyquist_compliant: true
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

### Per task (filled at planning, 2026-10-11)

Commands are the `<automated>` of each task, shortened: `domain` = `npm --workspace @cortege/ibp-domain run`, `api-unit` = `cd api && npx jest --runInBand -c jest.unit.config.js`, `api-e2e` = `cd api && npx jest --runInBand -c jest.config.js` (Docker Postgres), `mob` = `cd mobile && npx jest -c jest.unit.config.js ... --coverage=false`.

| Task | Requirement | What it proves | Automated command | Status |
|------|-------------|----------------|-------------------|--------|
| 27-01-T1 | SVA-04 | Spike script refuses to run without a credential, never prints it | `env -u METEOFRANCE_API_KEY node api/scripts/meteofrance-spike.mjs` exits 1; `node --check` | ⬜ |
| 27-01-T2 | SVA-04 | Owner capture (human-action); fixtures parse and pass prettier | `node -e` JSON parse of the fixtures; `npx prettier --check api/test/fixtures/meteofrance` | ⬜ |
| 27-01-T3 | SVA-04 | Spike findings, distance cap, D-21 decisions recorded | grep of the README headings; 6 "Spike 2026-10" rows | ⬜ |
| 27-02-T1 | SVA-02, SVA-03 | Limits, sky codes, annotations reader/canonicaliser/validator, 100 % covered | `domain test -- conditions && domain test:coverage` | ⬜ |
| 27-02-T2 | SVA-06 | Wire types compile in package, api and mobile | `domain typecheck && npm run typecheck` | ⬜ |
| 27-02-T3 | SVA-03 | MAT-ANN-01..03@both: same result with and without annotations in package, API and mobile adapters | `domain test:coverage`; `api-unit test/ibp-parity.spec.ts`; `mob src/app/ibp-parity.test.ts` | ⬜ |
| 27-03-T1 | SVA-01, SVA-05 | fr.conditions copy, gates (dash, abbreviations, structure) | `mob src/i18n/fr/conditions.test.ts src/__checks__` | ⬜ |
| 27-03-T2 | SVA-01..03 | Strip, score rows, PDF, history, search strings | `mob src/i18n src/__checks__` | ⬜ |
| 27-03-T3 | SVA-01, SVA-02 | NoteField counter, maxLength, blur commit; ochre contrast both schemes | `mob src/ui/NoteField.test.tsx src/app/visual-tokens.test.ts` | ⬜ |
| 27-04-T1 | SVA-04 | Weather config defaults, synthetic refused in production, blank key warned | `api-unit test/env.schema.spec.ts test/check-config.spec.ts` | ⬜ |
| 27-04-T2 | SVA-04 | check-env.sh parity, examples, test env synthetic | `api-unit test/check-env-parity.spec.ts test/vps-deploy-guard.spec.ts`; `bash -n` | ⬜ |
| 27-05-T1 | SVA-06 | Migration 023 nullable, checks validated, idempotent | `api-e2e test/migration-023-survey-note-weather.e2e-spec.ts` | ⬜ |
| 27-05-T2 | SVA-01, SVA-02, SVA-06 | DTO: note 1000, nested weather on /sync and POST, annotations validator | `api-unit test/survey-upsert.dto.spec.ts` | ⬜ |
| 27-05-T3 | SVA-06 | Same-version and submitted compare of note and weather; 2 MB body | `api-unit test/surveys-normalize.utils.spec.ts test/app-setup.spec.ts` | ⬜ |
| 27-06-T1 | SVA-04 | Station ranking, tolerance, merge, synthetic provider | `api-unit test/weather-stations.spec.ts test/weather-provider.spec.ts` | ⬜ |
| 27-06-T2 | SVA-04 | too_old without call, cache, de-dup, cap, 503, no coordinates in logs | `api-unit test/weather.service.spec.ts` | ⬜ |
| 27-06-T3 | SVA-04 | Route auth, DTO bounds, throttle, synthetic e2e | `api-unit test/weather.controller.spec.ts test/rate-limit.config.spec.ts`; `api-e2e test/weather.e2e-spec.ts` | ⬜ |
| 27-07-T1 | SVA-06, SVA-05 | requested_at stamp, guarded conditions write, counters unchanged at the write sites | `mob src/storage/surveys.conditions.sqlite.test.ts src/storage/surveys.completion.sqlite.test.ts ...` | ⬜ |
| 27-07-T2 | SVA-06, SVA-01 | Pull copies note and weather; own-note reader | `mob src/storage/sync.pull.sqlite.test.ts src/storage/surveys.conditions.sqlite.test.ts` | ⬜ |
| 27-07-T3 | SVA-05 | Weather point store, candidates, clearLocalIbpData | `mob src/storage/weather.sqlite.test.ts` | ⬜ |
| 27-08-T1 | SVA-02, SVA-03 | Form annotations canonical under factors.annotations, load and reset | `mob src/hooks/useFactorAnnotations.test.ts src/hooks/useSurveyForm.test.ts` | ⬜ |
| 27-08-T2 | SVA-02, SVA-03 | Context exposure, no spurious autosave, render counts | `mob src/hooks/useEditingDraft.autosave.test.ts src/state src/navigation/routes/routes.test.tsx` | ⬜ |
| 27-09-T1 | SVA-05 | Merge, edit guard, refill, 24 h window, seven states, attribution | `mob src/app/weather.test.ts` | ⬜ |
| 27-09-T2 | SVA-05 | API client query and errors | `mob src/api/weather-api.test.ts` | ⬜ |
| 27-10-T1 | SVA-02, SVA-03 | doubt and note on draft, submitted and community entries | `mob src/app/factor-annotations.test.ts src/screens/community-survey src/screens/survey-detail` | ⬜ |
| 27-10-T2 | SVA-02, SVA-03 | Chip, clamped note, a11y labels, points unchanged | `mob src/screens/survey-detail/FactorsList.test.tsx src/__checks__` | ⬜ |
| 27-11-T1 | SVA-06 | Fast-path $26/$27, CAS $28 | `api-unit test/surveys-upsert-fast-path.spec.ts test/surveys.repository.spec.ts` | ⬜ |
| 27-11-T2 | SVA-06 | Write sites with undefined-keeps rule; owner read | `npm run build`; `api-unit` fast-path, normalize, controller specs | ⬜ |
| 27-11-T3 | SVA-06, SVA-01, SVA-02 | Round trip on both entry points, same version, submitted, validation, no note in events | `api-e2e test/surveys-note-weather.e2e-spec.ts test/surveys-same-version.e2e-spec.ts ...` | ⬜ |
| 27-12-T1 | SVA-04 | Authenticated helper, token refresh, redacted errors | `api-unit test/meteofrance-http.spec.ts` | ⬜ |
| 27-12-T2 | SVA-04 | Mapping on real fixtures, D-21 sky and rain, factory, spike cap | `api-unit test/meteofrance-provider.spec.ts test/weather-provider.spec.ts test/weather.service.spec.ts test/env.schema.spec.ts` | ⬜ |
| 27-13-T1 | SVA-01, SVA-05 | Silent guarded note and weather writes | `mob src/hooks/useSurveyDraftPatcher.test.ts src/state src/navigation/routes/routes.test.tsx` | ⬜ |
| 27-13-T2 | SVA-05 | Lookup at parcel choice, catch-up for requested_at, settled and unavailable, single run | `mob src/hooks/useWeatherPrefill.test.ts src/state` | ⬜ |
| 27-13-T3 | SVA-05 | Parcel centre handed to the hook | `mob src/navigation/routes/routes.test.tsx src/__checks__` | ⬜ |
| 27-14-T1 | SVA-02, SVA-03 | Strip states, switch row a11y, debounce, Reduce Motion | `mob src/screens/factor-detail src/screens/FactorDetailScreen.test.tsx src/__checks__` | ⬜ |
| 27-14-T2 | SVA-02 | Pager hides chrome on keyboard, dismiss on page change, route wiring | `mob src/screens/survey-form src/navigation/routes/FactorDetailRoute.test.tsx` | ⬜ |
| 27-15-T1 | SVA-01 | Note line in history rows | `mob src/app/parcel-history.test.ts src/screens/survey-detail/HistoryList.test.tsx` | ⬜ |
| 27-15-T2 | SVA-01 | Own match on note, "Trouvé dans la note" | `mob src/app/global-search.test.ts src/screens/global-search` | ⬜ |
| 27-15-T3 | SVA-01 | Notes loaded while searching | `mob src/hooks/useOwnSurveyNotes.test.ts src/hooks/useGlobalSearch.test.ts src/navigation/routes/SearchGroupRoute.test.tsx` | ⬜ |
| 27-16-T1 | SVA-01, SVA-05 | Export data and palette entries | `mob src/app/survey-pdf/palette.test.ts src/app/survey-pdf/assemble-export-data.test.ts` | ⬜ |
| 27-16-T2 | SVA-01, SVA-05 | Conditions block: omitted when empty, escaping, clamps, heights | `mob src/app/survey-pdf/conditions-section.test.ts` | ⬜ |
| 27-16-T3 | SVA-02, SVA-03 | Badge, factor note, block order, maximal fixture pagination | `mob src/app/survey-pdf` | ⬜ |
| 27-17-T1 | SVA-06 | Changes feed and community reads carry the fields | `api-unit test/surveys-sync.service.spec.ts test/community-surveys.service.spec.ts` | ⬜ |
| 27-17-T2 | SVA-01, SVA-02, SVA-06 | Parcel history field; member visibility; drafts hidden; D-24 retention | `api-unit test/parcels.service.spec.ts`; `api-e2e` note-weather, community detail, parcel history | ⬜ |
| 27-18-T1 | SVA-05 | Conditions data hook, sky chips, fields with ranges | `mob src/screens/survey-detail/conditions` | ⬜ |
| 27-18-T2 | SVA-01, SVA-05 | Seven states, refill confirm, attribution, note card, read-only twin | `mob src/screens/survey-detail/conditions src/__checks__` | ⬜ |
| 27-18-T3 | SVA-01, SVA-05 | Context page wiring, section param, scrolling | `mob src/screens/SurveyContextScreen.test.tsx src/navigation src/__checks__` | ⬜ |
| 27-19-T1 | SVA-01, SVA-05 | Summary card line, attribution, folded note, empty and loading | `mob src/screens/survey-detail/conditions/ConditionsCard.test.tsx src/__checks__` | ⬜ |
| 27-19-T2 | SVA-01 | Summary wiring, navigation with section | `mob src/screens/SurveyDetailScreen.test.tsx src/navigation/routes/routes.test.tsx src/state/render-counts.test.tsx` | ⬜ |
| 27-19-T3 | SVA-01 | Community Conditions section | `mob src/screens/community-survey src/__checks__` | ⬜ |
| 27-20-T1 | all | Technical contracts updated | greps on the three docs | ⬜ |
| 27-20-T2 | all | Form spec and stories | greps on the specs | ⬜ |
| 27-20-T3 | all | CLAUDE.md and VPS README | greps | ⬜ |
| 27-21-T1 | all | Full gates green, six protocol rows | `npm run lint && npm run typecheck && npm run test:unit && npm run test:e2e && npm run format:check`; grep rows | ⬜ |
| 27-21-T2 | SVA-01..03, SVA-05 | Device checks DC-27-01..05 (human-verify) | grep of the rows; owner approval | ⬜ |
| 27-21-T3 | SVA-04 | Real Météo-France answer, local then VPS (human-verify) | grep of DC-27-06; owner approval | ⬜ |

No three consecutive tasks lack an automated command; the two human checkpoints of 27-21 and the human-action of 27-01 each carry an automated grep of their recorded outcome.

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (planning, 2026-10-11)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (spike: plan 27-01; migration, weather, parity, mobile weather, strip, section, card and PDF test files are created by the tasks that build them, test first)
- [x] No watch-mode flags
- [x] Feedback latency < 120s (targeted files per task; e2e only where the task changes SQL or routes)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
