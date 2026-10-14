---
phase: 30-route-choice-assistant-inserted-v1
plan: 05
subsystem: ibp-domain
tags: [route-choice, pure-rules, decision-table, spec-parity, ibp-domain]
requires: [30-02, 30-03]
provides:
  - "recommendRoute and routeQuestionsFor: the 20 validated rules R-01 to R-21 as pure functions returning codes (needs_surface, incomplete, options, route)"
  - "routeZoneIssues, routeAdviceFor, suggestedZoneHa, sumPlotSurfacesHa, defaultCountingFor, uncappedFactorsForPreset, isUncappedSelectionValid and UNCAPPED_PRESETS: the helpers the chooser and the details card need"
  - "ROUTE_RULE_CASES: the decision table as data, 20 rule cases and 23 boundary cases"
  - "api/test/route-rules-spec.spec.ts: spec ids and fixture ids proved equal"
affects: [30-06, 30-11, 30-20, 30-21]
key-files:
  created:
    - packages/ibp-domain/src/route/guide.ts
    - packages/ibp-domain/src/route/guide.test.ts
    - packages/ibp-domain/src/route/cases.ts
    - api/test/route-rules-spec.spec.ts
  modified:
    - packages/ibp-domain/src/route/index.ts
decisions:
  - "One internal walk of the questions produces both the question list and the proposal, so routeQuestionsFor and recommendRoute cannot disagree"
  - "routeQuestionsFor returns the questions to display (answered ones included while they are needed), the refine section last; recommendRoute's incomplete status adds the open ones as missing"
  - "ROUTE_WARNING_CODES holds small_stand and partial_over_half only; partial_below_minimum is a zone-check code, since a proposed partial zone is never under 1 ha"
  - "Answers that are not needed are ignored, including a stale difficulty for the duration range"
  - "applied_rules lists the rule ids that produced a proposal (R-18 is never applied: the guide never proposes uncapped)"
metrics:
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 05: Route-choice rules in the shared package Summary

The owner-validated route-choice rules (spec sections 4 to 6, validated 2026-10-14) are now pure, text-free functions in `@cortege/ibp-domain`, with the decision table as executable data checked against the spec's id list. Only the stand chooses the parcours; experience and available time produce advice codes only.

## What was built

- `packages/ibp-domain/src/route/guide.ts`
  - Constants with their pages: `ROUTE_TINY_STAND_HA` 0.5, `ROUTE_SMALL_STAND_HA` 1, `ROUTE_FULL_MAX_HA` 5, `ROUTE_SUBDIVIDE_HETEROGENEOUS_HA` 10, `ROUTE_SUBDIVIDE_HOMOGENEOUS_HA` 20, `PARTIAL_SAMPLE_MIN_HA` 1, the 10 % and 20 % shares, `PARTIAL_OVER_HALF_SHARE` 0.5, `ROUTE_NARROW_WIDTH_M` 100, the two minutes-per-hectare ranges (15 to 20, 25 to 30).
  - Code lists with derived unions: questions (5), reasons (10), warnings (2), advice (4), surface errors (2), large-stand options (2), zone issues (6, with `ROUTE_ZONE_ISSUE_SEVERITY`), presets (5), rule ids (`ROUTE_RULE_IDS`, 20).
  - `defaultCountingFor` (capped for the three parcours, R-16), `UNCAPPED_PRESETS` / `uncappedFactorsForPreset` / `isUncappedSelectionValid` (R-17), `suggestedZoneHa` (R-13), `sumPlotSurfacesHa` (R-15), `routeZoneIssues`, `routeAdviceFor` (R-18 to R-21, the method, counting and zone are never changed).
  - `routeQuestionsFor(answers, choice?)` and `recommendRoute(answers, choice?)` returning the discriminated `RouteRecommendation`: `needs_surface` (R-01), `incomplete` (questions, missing), `options` (R-11b: subdivide pre-selected, partial; no parcours), `route` (method, counting, empty `uncapped_factors`, zone, complement for a partial parcours, at most four reasons, warnings, advice, estimated minutes, applied rules).
- `packages/ibp-domain/src/route/cases.ts`: `RouteRuleCase` / `RouteRuleExample` / `ROUTE_RULE_CASES`, 20 rule cases (R-01, R-02, R-03, R-07 to R-21 with R-11b, R-12a, R-12b) and 23 boundary cases, 43 in all, each with its page and the examples of the spec's test column; expectations worked out by hand from the spec rows.
- `packages/ibp-domain/src/route/index.ts` exports `guide` and `cases` (and so the package root).
- `api/test/route-rules-spec.spec.ts` reads the spec's section 5 rule rows and its "Cas limites" table, finds 20 and 23 ids, and asserts they equal the case ids (each once, none extra, retired R-04 to R-06 absent, a page cited in every case).

## Validated decisions applied

O-02 (10 ha heterogeneous, 20 ha homogeneous), O-03 (subdivide pre-selected, only two options), O-04 (experience and hours are information: R-21#no-effect is proved over six variants plus a loop), O-05 (5 ha), O-10 (no linear-stand code), O-11 (warning under 0.5 ha, 0.5 ha itself not warned), O-14 (two parcours, no typological or systematic value anywhere), O-18 (no objective question), O-20 and R-15 (placettes summed on one sheet), U-O11 (5000 ha bound: 5000 accepted, 5000.01 refused). No constant was changed at the gate; the 30-02 gate recorded no deviation.

## Verification

- `npm --workspace @cortege/ibp-domain run test`: 433 tests pass (164 in the route folder).
- `npm run test:coverage:domain`: 100 % statements, branches, functions and lines, thresholds untouched (`packages/ibp-domain/jest.config.js` unchanged).
- `cd api && npx jest --runInBand -c jest.unit.config.js test/route-rules-spec.spec.ts`: 6 tests pass.
- `npm run lint` and `npm run typecheck` exit 0. `npm --workspace mobile run test:unit`: 410 suites, 5985 tests pass. `npm --workspace api run test:unit`: 56 of 57 suites pass; the one failure is `check-env-parity.spec.ts`, which always fails on this Mac (bash 3.2) and runs under bash 4 in CI.
- `npm run format:check` flags only `.claude/settings.local.json`, which is not part of this plan.
- `mobile/src/hooks/useSurveySync.ts` untouched; `.planning/STATE.md`, `ROADMAP.md` and `REQUIREMENTS.md` not edited (the orchestrator updates them).
- TDD gates: `test(30-05)` commits 3e69f3cd and 42099e9f (RED, failing on missing exports), then `feat(30-05)` commits 7625f32e and 44f84875 (GREEN).

## Deviations from Plan

**1. [Rule 2 - Correctness] A stand that rounds to zero**
- **Found during:** Task 1
- **Issue:** the spec accepts any surface above 0, but a surface such as 0.004 ha rounds to a zone of 0, which the recorded route would refuse (`route_zone_invalid`).
- **Fix:** the zone of a full parcours is never below 0.01 ha (one unit of the two-decimal record). No rule, constant or threshold of the spec changes; every spec case is unaffected. Tested in `suggestedZoneHa` and `recommendRoute`.
- **Files modified:** `packages/ibp-domain/src/route/guide.ts`, `guide.test.ts`

**2. Shape of the fixture (interpretation, not a rule change)**
- The plan describes `RouteRuleCase` as a union by `kind`. Cases with mixed examples (R-13 has a proposal and a zone check, R-20 an advice and a proposal) cannot carry one kind, so the `kind` sits on each example (`recommend`, `zone`, `advice`, `preset`) and a case holds a list of examples. One case per rule id and per boundary id is kept.

**3. Additions beyond the plan's export list (no spec change)**
- `ROUTE_RULE_IDS` / `RouteRuleId`, `RouteChoice`, `RouteAdvice`, `RouteAdviceInput`, `RouteZoneInput` and `missing` on the `incomplete` status, for the screens and the fixture types.
- `ROUTE_WARNING_CODES` is `small_stand` and `partial_over_half`; `partial_below_minimum` stays in `ROUTE_ZONE_ISSUE_CODES` only (a proposed partial zone is never under 1 ha), which keeps both lists to codes the spec uses for that purpose.

**Hand-worked expectation that goes beyond a spec example:** R-08#just-above-1ha (`surface_ha` 1.01, zone 1) also expects `partial_over_half`, as R-13 and the R-13#above-half case require (1 is more than half of 1.01). The spec's example text gives only the parcours and the zone.

## Known Stubs

None.

## Threat model

T-30-10 mitigated: `recommendRoute` returns `needs_surface` for an absent, non-numeric, non-finite, non-positive or too large surface; `routeZoneIssues` flags out-of-range zones; tests cover NaN, Infinity, negative, zero, 5000 and 5000.01. T-30-11 mitigated: `api/test/route-rules-spec.spec.ts` fails when a spec id has no case or a case has no spec id; every branch of `walk` cites its R-id and page.

## Self-Check: PASSED

- Files present: `packages/ibp-domain/src/route/guide.ts`, `guide.test.ts`, `cases.ts`, `index.ts`, `api/test/route-rules-spec.spec.ts`.
- Commits present: 3e69f3cd, 7625f32e, 42099e9f, 44f84875.
