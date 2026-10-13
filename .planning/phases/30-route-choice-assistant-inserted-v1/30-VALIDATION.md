---
phase: 30
slug: route-choice-assistant-inserted-v1
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-13
planned: 2026-10-13
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

Filled by the planner on 2026-10-13: one row per task of plans 30-01 to 30-23 (52 tasks), ids `30-NN-MM` (plan NN, task MM). Requirement ids proposed by research: `REQ-DOC-route-rules`, `REQ-C-route-guide`, `REQ-C-route-record`, `REQ-C-route-display`, `REQ-C-uncapped-entry`, `REQ-FT-route-test` (and `REQ-C-route-group` for Phase 30.1); the orchestrator adds them to REQUIREMENTS.md at the end of planning. Commands longer than 150 characters are cut with "..."; the full command is the `<verify>` of the task in its PLAN.md. "❌ W0" means the task creates or extends its test or checked file; "manual" marks the four owner or tester checkpoints (30-02-01, 30-22-02, 30-23-01, 30-23-02), each followed or preceded by an automated check of what it records.

Hard ordering: 30-01 (spec) then 30-02 (owner gate) come first; every code or screen plan (30-03 to 30-20) reaches 30-02 through `depends_on`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | REQ-DOC-route-rules | T-30-01, T-30-02 | Reference entry for the CNPF methods document, spec sections 1 to 4 (scope, sources, glossary, questionnaire) | doc check | `grep -q "3954746756b770f338055310973ada871ea5bdd768cb6be1ce60581a7a87d7f2" docs/references/README.md && grep -q "IBP_met_fr_250909.pdf" docs/refere...` | ❌ W0 | ⬜ pending |
| 30-01-02 | 01 | 1 | REQ-DOC-route-rules | T-30-01, T-30-02 | Spec sections 5 to 9 (rule table with test cases, counting, déplafonné entry, recorded data, display) | doc check | `test $(grep -c "^\| R-[0-9][0-9]" docs/specs/route-choice-rules-v1.md) -ge 21 && test $(awk '/^\\| R-[0-9][0-9]/ && !/p\. [0-9]/' docs/specs/route-ch...` | ❌ W0 | ⬜ pending |
| 30-01-03 | 01 | 1 | REQ-DOC-route-rules | T-30-01, T-30-02 | Spec sections 10 to 13 (group model and D-04, owner decisions, requirements, validation block) and the specs index | doc check | `for i in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16; do grep -q "\| O-$i \|" docs/specs/route-choice-rules-v1.md \|\| exit 1; done; for i in 1 2 3...` | ❌ W0 | ⬜ pending |
| 30-02-01 | 02 | 2 | REQ-DOC-route-rules | T-30-03, T-30-04 | Owner reads the spec, resolves the decisions, validates in writing, confirms or overrides D-04 | owner decision | `test -f docs/specs/route-choice-rules-v1.md` | manual | ⬜ pending |
| 30-02-02 | 02 | 2 | REQ-DOC-route-rules | T-30-03, T-30-04 | Record the owner's validation, the decisions and the D-04 outcome; classify deviations; stop on a structural change | doc check | `grep -q "Validé par le propriétaire le 20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]" docs/specs/route-choice-rules-v1.md && grep -q "Statut : validée par le ...` | ❌ W0 | ⬜ pending |
| 30-03-01 | 03 | 3 | REQ-C-route-record | T-30-05, T-30-06, T-30-07 | Route constants, derived unions and the wire types | unit | `npm --workspace @cortege/ibp-domain run test -- route && npm --workspace @cortege/ibp-domain run typecheck` | ❌ W0 | ⬜ pending |
| 30-03-02 | 03 | 3 | REQ-C-route-record | T-30-05, T-30-06, T-30-07 | Canonical form, validator and tolerant reader of the recorded route | unit | `npm --workspace @cortege/ibp-domain run test:coverage && npm --workspace @cortege/ibp-domain run lint && npm --workspace @cortege/ibp-domain run ty...` | ❌ W0 | ⬜ pending |
| 30-04-01 | 04 | 3 | REQ-C-route-guide | T-30-08, T-30-09 | Geodesic area of the selected parcels | unit | `cd mobile && npx jest -c jest.unit.config.js src/map/parcel-area.test.ts --coverage --collectCoverageFrom=src/map/parcel-area.ts --coverageThreshol...` | ❌ W0 | ⬜ pending |
| 30-04-02 | 04 | 3 | REQ-C-route-guide | T-30-08, T-30-09 | The parcel step passes the surface to onSave | unit | `cd mobile && npx jest -c jest.unit.config.js src/screens/SurveyParcelSelectionScreen.test.tsx src/navigation src/__checks__ --coverage=false && npx...` | ❌ W0 | ⬜ pending |
| 30-05-01 | 05 | 4 | REQ-C-route-guide, REQ-DOC-route-rules | T-30-10, T-30-11 | Thresholds, code lists, default counting, presets, zone checks and duration estimate | unit | `npm --workspace @cortege/ibp-domain run test -- route && npm --workspace @cortege/ibp-domain run typecheck` | ❌ W0 | ⬜ pending |
| 30-05-02 | 05 | 4 | REQ-C-route-guide, REQ-DOC-route-rules | T-30-10, T-30-11 | routeQuestionsFor, recommendRoute, the decision table as data, and the spec consistency check | unit | `npm --workspace @cortege/ibp-domain run test:coverage && cd api && npx jest --runInBand -c jest.unit.config.js test/route-rules-spec.spec.ts` | ❌ W0 | ⬜ pending |
| 30-06-01 | 06 | 4 | REQ-C-uncapped-entry | T-30-12, T-30-13 | Stratum and dendromicrohabitat codes, readers and derivation helpers | unit | `npm --workspace @cortege/ibp-domain run test -- factor-details && npm --workspace @cortege/ibp-domain run typecheck` | ❌ W0 | ⬜ pending |
| 30-06-02 | 06 | 4 | REQ-C-uncapped-entry | T-30-12, T-30-13 | Parity cases and matrix rows proving the detail keys never move a score | unit (parity x3) | `npm --workspace @cortege/ibp-domain run test:coverage && cd api && npx jest --runInBand -c jest.unit.config.js test/ibp-parity.spec.ts && cd ../mob...` | ❌ W0 | ⬜ pending |
| 30-07-01 | 07 | 4 | REQ-C-route-record | T-30-14, T-30-15, T-30-16, T-30-17, T-30-18 | Migration 024, survey_route column with checks, and its e2e test | e2e | `cd api && npx jest --runInBand -c jest.config.js test/migration-024-survey-route.e2e-spec.ts` | ❌ W0 | ⬜ pending |
| 30-07-02 | 07 | 4 | REQ-C-route-record | T-30-14, T-30-15, T-30-16, T-30-17, T-30-18 | Nested route DTOs, the package-backed constraint and the upsert field | unit | `cd api && npx jest --runInBand -c jest.unit.config.js test/survey-upsert.dto.spec.ts && npm run build` | ❌ W0 | ⬜ pending |
| 30-07-03 | 07 | 4 | REQ-C-route-record | T-30-14, T-30-15, T-30-16, T-30-17, T-30-18 | Row type, read-only after submit and same-version comparison | unit | `cd api && npx jest --runInBand -c jest.unit.config.js test/surveys-normalize.utils.spec.ts && npm run build` | ❌ W0 | ⬜ pending |
| 30-08-01 | 08 | 4 | REQ-C-route-record | T-30-19, T-30-20, T-30-21 | Payload type, draft-only route write and the pull copy | unit (sqlite) | `cd mobile && npx jest -c jest.unit.config.js src/storage/surveys.route.sqlite.test.ts src/storage/sync.pull.sqlite.test.ts src/storage/surveys.comp...` | ❌ W0 | ⬜ pending |
| 30-08-02 | 08 | 4 | REQ-C-route-record | T-30-19, T-30-20, T-30-21 | updateSurveyRoute action and the useSurveyRoute reader | unit | `cd mobile && npx jest -c jest.unit.config.js src/hooks/useSurveyDraftPatcher.test.ts src/hooks/useSurveyRoute.test.ts src/state --coverage=false &&...` | ❌ W0 | ⬜ pending |
| 30-09-01 | 09 | 5 | REQ-C-route-record, REQ-C-route-display | T-30-22, T-30-23, T-30-24, T-30-25, T-30-26 | Write sites, GET by id, changes feed and community read | unit | `cd api && npx jest --runInBand -c jest.unit.config.js test/surveys-upsert-fast-path.spec.ts test/surveys-sync.service.spec.ts test/community-survey...` | ❌ W0 | ⬜ pending |
| 30-09-02 | 09 | 5 | REQ-C-route-record, REQ-C-route-display | T-30-22, T-30-23, T-30-24, T-30-25, T-30-26 | End-to-end contract on both entry points, replay, conflict and installed-app compatibility | e2e | `cd api && npx jest --runInBand -c jest.config.js test/surveys-route.e2e-spec.ts test/sync-installed-app-compat.e2e-spec.ts test/community-survey-de...` | ❌ W0 | ⬜ pending |
| 30-10-01 | 10 | 5 | REQ-C-route-guide, REQ-C-route-display | T-30-27, T-30-28 | The fr.routeGuide module and its catalogue test | unit (gates) | `cd mobile && npx jest -c jest.unit.config.js src/i18n src/__checks__/catalogue-dash.test.ts src/__checks__/abbreviations.test.ts --coverage=false` | ❌ W0 | ⬜ pending |
| 30-10-02 | 10 | 5 | REQ-C-route-guide, REQ-C-route-display | T-30-27, T-30-28 | Captions of Contexte, PDF, factor screens, errors and the F hint | unit (gates) | `cd mobile && npx jest -c jest.unit.config.js src/i18n src/__checks__ src/app/survey-pdf --coverage=false` | ❌ W0 | ⬜ pending |
| 30-10-03 | 10 | 5 | REQ-C-route-guide, REQ-C-route-display | T-30-27, T-30-28 | Code-to-text maps, formatters and the shared display rows | unit | `cd mobile && npx jest -c jest.unit.config.js src/app/route-text.test.ts src/app/route-display.test.ts --coverage --collectCoverageFrom=src/app/rout...` | ❌ W0 | ⬜ pending |
| 30-11-01 | 11 | 5 | REQ-C-uncapped-entry | T-30-29, T-30-30 | useUncappedEntry, the detail sub-state with package-derived scored values | unit | `cd mobile && npx jest -c jest.unit.config.js src/hooks/useUncappedEntry.test.ts src/app/factor-selections.test.ts --coverage=false` | ❌ W0 | ⬜ pending |
| 30-11-02 | 11 | 5 | REQ-C-uncapped-entry | T-30-29, T-30-30 | Wire the detail inputs into the form payload, the draft load and the form context | unit | `cd mobile && npx jest -c jest.unit.config.js src/hooks/useSurveyForm.test.ts src/storage/surveys.completion.sqlite.test.ts src/state src/navigation...` | ❌ W0 | ⬜ pending |
| 30-12-01 | 12 | 6 | REQ-C-route-guide | T-30-31 | ChoiceCard | unit | `cd mobile && npx jest -c jest.unit.config.js src/ui/ChoiceCard.test.tsx src/__checks__ --coverage=false` | ❌ W0 | ⬜ pending |
| 30-12-02 | 12 | 6 | REQ-C-route-guide | T-30-31 | InfoSheet extracted from AbbreviationInfo, and GlossaryInfo | unit | `cd mobile && npx jest -c jest.unit.config.js src/ui/InfoSheet.test.tsx src/ui/AbbreviationInfo.test.tsx src/ui/GlossaryInfo.test.tsx src/__checks__...` | ❌ W0 | ⬜ pending |
| 30-13-01 | 13 | 6 | REQ-C-route-display | T-30-32, T-30-33, T-30-34 | The route block and the export data | unit | `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf/route-section.test.ts src/app/survey-pdf/assemble-export-data.test.ts --coverage=false` | ❌ W0 | ⬜ pending |
| 30-13-02 | 13 | 6 | REQ-C-route-display | T-30-32, T-30-33, T-30-34 | Block order, CSS, data-driven identity row and the maximal fixture | unit | `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/__checks__ --coverage=false && npm --workspace mobile run typecheck` | ❌ W0 | ⬜ pending |
| 30-14-01 | 14 | 6 | REQ-C-uncapped-entry | T-30-35, T-30-36 | Chip, caption and the C, D, E surface prefill | unit | `cd mobile && npx jest -c jest.unit.config.js src/screens/factor-detail src/__checks__ --coverage=false` | ❌ W0 | ⬜ pending |
| 30-14-02 | 14 | 6 | REQ-C-uncapped-entry | T-30-35, T-30-36 | Read the route in the factor route and show the signals in the pager, the page and the list | unit | `cd mobile && npx jest -c jest.unit.config.js src/navigation/routes/FactorDetailRoute.test.tsx src/screens/survey-form src/screens/FactorDetailScree...` | ❌ W0 | ⬜ pending |
| 30-15-01 | 15 | 7 | REQ-C-route-guide | T-30-37, T-30-38 | Pure guide model and its React hook | unit | `cd mobile && npx jest -c jest.unit.config.js src/screens/route-guide/route-guide-model.test.ts src/screens/route-guide/useRouteGuideState.test.ts -...` | ❌ W0 | ⬜ pending |
| 30-15-02 | 15 | 7 | REQ-C-route-guide | T-30-37, T-30-38 | Question cards, answered rows and the accordion | unit | `cd mobile && npx jest -c jest.unit.config.js src/screens/route-guide src/__checks__ --coverage=false && npm --workspace mobile run typecheck` | ❌ W0 | ⬜ pending |
| 30-16-01 | 16 | 7 | REQ-C-route-guide | T-30-39, T-30-40 | Suggestion card, alternatives, reasons and notices | unit (contrast) | `cd mobile && npx jest -c jest.unit.config.js src/screens/route-guide src/app/forest-aurora-tokens.test.ts src/__checks__ --coverage=false` | ❌ W0 | ⬜ pending |
| 30-16-02 | 16 | 7 | REQ-C-route-guide | T-30-39, T-30-40 | Details card and the glossary section | unit | `cd mobile && npx jest -c jest.unit.config.js src/screens/route-guide src/__checks__ --coverage=false && npm --workspace mobile run typecheck` | ❌ W0 | ⬜ pending |
| 30-17-01 | 17 | 7 | REQ-C-uncapped-entry, REQ-C-route-display | T-30-41, T-30-42 | B and F detail fields on the factor pages | unit | `cd mobile && npx jest -c jest.unit.config.js src/screens/factor-detail src/screens/FactorDetailScreen.test.tsx src/screens/survey-form src/navigati...` | ❌ W0 | ⬜ pending |
| 30-17-02 | 17 | 7 | REQ-C-uncapped-entry, REQ-C-route-display | T-30-41, T-30-42 | B and F detail lines on the PDF factor cards | unit | `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/i18n src/__checks__ --coverage=false` | ❌ W0 | ⬜ pending |
| 30-18-01 | 18 | 8 | REQ-C-route-guide, REQ-C-route-record | T-30-43, T-30-44, T-30-45 | The guide screen | unit | `cd mobile && npx jest -c jest.unit.config.js src/screens/route-guide src/__checks__ --coverage=false` | ❌ W0 | ⬜ pending |
| 30-18-02 | 18 | 8 | REQ-C-route-guide, REQ-C-route-record | T-30-43, T-30-44, T-30-45 | Route, stack registration and the creation flow | unit (real navigation core) | `cd mobile && npx jest -c jest.unit.config.js src/navigation src/screens/route-guide src/__checks__ --coverage=false && npm --workspace mobile run t...` | ❌ W0 | ⬜ pending |
| 30-19-01 | 19 | 9 | REQ-C-route-guide, REQ-C-route-record | T-30-46, T-30-47 | Chooser model and the counting picker | unit | `cd mobile && npx jest -c jest.unit.config.js src/screens/route-guide/route-choose-model.test.ts src/screens/route-guide/CountingPicker.test.tsx src...` | ❌ W0 | ⬜ pending |
| 30-19-02 | 19 | 9 | REQ-C-route-guide, REQ-C-route-record | T-30-46, T-30-47 | Chooser screen and route, form-sheet registration, F-page link | unit | `cd mobile && npx jest -c jest.unit.config.js src/screens/route-guide src/navigation src/__checks__ --coverage=false && npm --workspace mobile run t...` | ❌ W0 | ⬜ pending |
| 30-20-01 | 20 | 10 | REQ-C-route-display | T-30-48, T-30-49, T-30-50 | The Parcours utilisé card on the Contexte page | unit | `cd mobile && npx jest -c jest.unit.config.js src/screens/survey-detail/route src/screens/SurveyContextScreen.test.tsx src/app/route-display.test.ts...` | ❌ W0 | ⬜ pending |
| 30-20-02 | 20 | 10 | REQ-C-route-display | T-30-48, T-30-49, T-30-50 | Route label on the summary row and the read-only card on another member's survey | unit | `cd mobile && npx jest -c jest.unit.config.js src/screens/survey-detail src/screens/SurveyDetailScreen.test.tsx src/screens/community-survey src/i18...` | ❌ W0 | ⬜ pending |
| 30-21-01 | 21 | 11 | REQ-C-route-record, REQ-C-route-display, REQ-DOC-route-rules, REQ-FT-route-test | T-30-51, T-30-52 | API, data and sync contracts | doc check | `grep -q "survey_route" docs/technical/api-contract-v1.md && grep -q "024_survey_route" docs/technical/data-contract-v1.md && grep -q "survey_route"...` | ❌ W0 | ⬜ pending |
| 30-21-02 | 21 | 11 | REQ-C-route-record, REQ-C-route-display, REQ-DOC-route-rules, REQ-FT-route-test | T-30-51, T-30-52 | Form spec, epic C, user stories, CLAUDE.md and the docs index | doc check | `grep -q "surveyRouteGuide" CLAUDE.md && grep -q "survey_route" CLAUDE.md && grep -q "route-choice-rules-v1.md" docs/specs/ibp-form-spec.md && grep ...` | ❌ W0 | ⬜ pending |
| 30-21-03 | 21 | 11 | REQ-C-route-record, REQ-C-route-display, REQ-DOC-route-rules, REQ-FT-route-test | T-30-51, T-30-52 | Protocol of the recorded unaided tester test | doc check | `grep -q "Scénario" docs/user-tests/route-choice-assistant.md && grep -Eq "R-[0-9]{2}" docs/user-tests/route-choice-assistant.md && grep -q "## Rapp...` | ❌ W0 | ⬜ pending |
| 30-22-01 | 22 | 12 | REQ-C-route-guide, REQ-C-route-display | T-30-53, T-30-54 | Device checks on simulator and emulator, PDF page count, review sheet | device check | `grep -q "RC-01" docs/user-tests/device-checks.md && grep -q "RC-05" docs/user-tests/device-checks.md && grep -q "Phase 30" mobile/src/app/survey-pd...` | ❌ W0 | ⬜ pending |
| 30-22-02 | 22 | 12 | REQ-C-route-guide, REQ-C-route-display | T-30-53, T-30-54 | Owner review of every French sentence of the phase | owner decision | `test -f mobile/src/i18n/fr/route-guide.ts` | manual | ⬜ pending |
| 30-22-03 | 22 | 12 | REQ-C-route-guide, REQ-C-route-display | T-30-53, T-30-54 | Apply the owner's wording, re-run the gates, record the approval | unit (gates) | `cd mobile && npx jest -c jest.unit.config.js src/i18n src/__checks__ src/screens src/app --coverage=false && cd .. && npm run lint && npm run typec...` | ❌ W0 | ⬜ pending |
| 30-23-01 | 23 | 13 | REQ-FT-route-test, REQ-DOC-route-rules | T-30-55, T-30-56 | D-04 close-out and approval of the tester protocol | owner decision | `test -f docs/user-tests/route-choice-assistant.md` | manual | ⬜ pending |
| 30-23-02 | 23 | 13 | REQ-FT-route-test, REQ-DOC-route-rules | T-30-55, T-30-56 | Recorded unaided tester session, then the anonymised report | owner and tester session | `grep -q "## Rapport" docs/user-tests/route-choice-assistant.md && grep -Eq "Scission confirmée à la clôture le 20\|Conservé dans la phase 30 le 20" ...` | manual | ⬜ pending |
| 30-23-03 | 23 | 13 | REQ-FT-route-test, REQ-DOC-route-rules | T-30-55, T-30-56 | Bookkeeping for the orchestrator (no edit of STATE, ROADMAP or REQUIREMENTS) | doc check | `grep -q "Bookkeeping for the orchestrator" .planning/phases/30-route-choice-assistant-inserted-v1/30-23-SUMMARY.md && git diff --quiet -- .planning...` | ❌ W0 | ⬜ pending |

## Wave 0 Requirements

- [ ] `docs/specs/route-choice-rules-v1.md` (30-01) and the dated owner validation line (30-02, owner)
- [ ] `packages/ibp-domain/src/route/record.test.ts` (30-03), `route/guide.test.ts`, `route/cases.ts` (fixture) and `api/test/route-rules-spec.spec.ts` (30-05), `factor-details.test.ts` (30-06)
- [ ] `api/test/migration-024-survey-route.e2e-spec.ts` (30-07), `api/test/surveys-route.e2e-spec.ts` (30-09)
- [ ] `mobile/src/map/parcel-area.test.ts` (30-04), `mobile/src/storage/surveys.route.sqlite.test.ts` and `mobile/src/hooks/useSurveyRoute.test.ts` (30-08), `mobile/src/hooks/useUncappedEntry.test.ts` (30-11), `mobile/src/i18n/fr/route-guide.test.ts`, `mobile/src/app/route-text.test.ts`, `route-display.test.ts` (30-10)
- [ ] `mobile/src/ui/ChoiceCard.test.tsx`, `InfoSheet.test.tsx`, `GlossaryInfo.test.tsx` (30-12), `mobile/src/app/survey-pdf/route-section.test.ts` (30-13), `mobile/src/screens/factor-detail/*.test.tsx` (30-14, 30-17), `mobile/src/screens/route-guide/*.test.ts(x)` (30-15, 30-16, 30-18, 30-19), `mobile/src/screens/survey-detail/route/RouteSection.test.tsx` and `summary-rows.test.ts` (30-20)
- [ ] `docs/user-tests/route-choice-assistant.md` (protocol in 30-21, report in 30-23)

Each test file is created by the task that needs it (test first), so no separate Wave 0 plan exists; the spec and the owner gate are the true Wave 0 of this phase.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Written rules validated, D-04 first decision | REQ-DOC-route-rules | Owner decision, dated in the spec | 30-02: owner reads `route-choice-rules-v1.md`, resolves O-01..O-16 and U-O1..U-O15, writes the date, confirms or overrides D-04 |
| Wording of every French sentence | REQ-C-route-guide | Plain-French quality | 30-22 Task 2: owner review of the review sheet (questions, reasons, glossary, captions); approval dated in `docs/user-tests/owner-acceptance.md` |
| Questionnaire layout and keyboard on a small phone; dark mode, large text, Reduce Motion; PDF page count on both platforms | REQ-C-route-guide, REQ-C-route-display | Not unit testable | 30-22 Task 1 on simulator and emulator, rows RC-01 to RC-06 in `docs/user-tests/device-checks.md` |
| D-04 close-out with the built app | REQ-DOC-route-rules | Owner decision | 30-23 Task 1, dated in spec section 10 |
| Unaided tester completes the choice, recorded | REQ-FT-route-test | Needs a real tester | 30-23 Task 2, protocol and report in `docs/user-tests/route-choice-assistant.md` |

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (52 of 52; the four checkpoints carry a file check and are followed by a task whose verify checks what they record)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (each test file is created by its task, test first)
- [x] No watch-mode flags
- [ ] Feedback latency < 300s (API e2e tasks 30-07-01 and 30-09-02 need local PostgreSQL and may exceed it; they run per task, not per commit)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned 2026-10-13; pending execution
