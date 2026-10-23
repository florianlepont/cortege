---
phase: 30-route-choice-assistant-inserted-v1
plan: 23
subsystem: docs
tags: [docs, api-contract, data-contract, sync, claude-md, user-tests, route]
requires: [30-06, 30-09, 30-10, 30-14, 30-16, 30-19, 30-22]
provides:
  - "survey_route documented in the API, data and sync contracts, with the mandatory route of the new client and the deploy order"
  - "ibp-form-spec section 5.4, stories US-C13 and US-C14, CLAUDE.md and docs indexes up to date with Phase 30"
  - "docs/user-tests/route-choice-assistant.md: the protocol of the recorded unaided tester test, written before the session, with an empty report section"
affects: [30-24, 30-25]
key-files:
  created:
    - docs/user-tests/route-choice-assistant.md
  modified:
    - docs/technical/api-contract-v1.md
    - docs/technical/data-contract-v1.md
    - docs/technical/sync-conflict-resolution-v1.md
    - docs/specs/ibp-form-spec.md
    - docs/specs/epic-c-ibp-survey-data-entry.md
    - docs/specs/user-stories.md
    - docs/specs/README.md
    - docs/README.md
    - CLAUDE.md
decisions:
  - "Pass rule O-13 read per tester: every tester completes (a) unaided; at least two thirds of the testers (2 of 3, 3 of 4, 4 of 5) complete (b) or (c), counted as at least one of the two"
  - "Scenario (b) has two successful paths: subdivide (piece of 3 ha, easy to see, gives Parcours en plein 3 ha by R-11b then R-10) and partial (Parcours partiel par bande 2.4 ha by R-11b#choose-partial)"
  - "Scenario (c) is the offline one; the test parcel is opened online beforehand so its geometry is cached"
metrics:
  tasks: 3
  completed: 2026-10-14
status: complete
requirements-completed: [REQ-C-route-record, REQ-C-route-display, REQ-DOC-route-rules]
---

# Phase 30 Plan 23: Contracts, specs, project guide and tester protocol Summary

Documentation catch-up for Phase 30, written from the code as built (migration 025, `route-required.ts`, the package `route/` module, the route guide screens, the PDF block, the sync hold), plus the protocol of the recorded unaided tester test, fixed before any session. No code changed.

## What was done

**Task 1, contracts (commit 684e1eb6)**
- `api-contract-v1.md`: new section "Survey route (phase 30)": key table (every key of spec section 8, bounds named by their package constants, 4096 bytes), an example, the rules (absent or null keeps the stored route and a route is never deleted, 400 on REST and `invalid_sync_operation` on /sync, undeclared nested keys rejected on POST /surveys and stripped on /sync, read-only after submit with `survey_route` in `details.fields`, compared by value, same-version rule, no PATCH, never in the event journal), the reads (GET by id, changes feed, community detail per O-15), "Mandatory route (new client)" (header `X-Cortege-Features: survey_route`, 422 `route_required` on create and on submit, per operation on /sync, updates never checked, unchanged behaviour without the header) and "Deploy order". Also: status paragraph, entity coverage, read-only lists, same-version list, GET example note, submit note, /sync bullets, changes feed bullet and sample, community detail bullet, error code list, factor detail keys.
- `data-contract-v1.md`: the column, its two checks and migration 025, the shape, the local payload key (SQLite stays at 5), the hold of routeless drafts on the phone (P-1, the OA-18 model), the factor detail keys `strata_cover`, `dmh_counts` and F `surface_ha` (never scored, hidden not deleted), and the consistency rule.
- `sync-conflict-resolution-v1.md`: `survey_route` in the compared and read-only lists of case B, and a "Drafts without a route (Mobile, phase 30)" section (hold, recovery after `route_required`, submit refusal).

**Task 2, specs and guide (commit d5db8655)**
- `ibp-form-spec.md`: the vague "full/partial transect" scope line replaced by the parcours and mode de relevé; new section 5.4 (words of the method, mandatory, score independent, read-only, uncapped detail); B and F detail keys; `survey_route` in the payload fields (10.1) and the versioning rules (10.4); acceptance scenario 9; change log.
- `epic-c-ibp-survey-data-entry.md` and `user-stories.md`: US-C13 "Aide au choix du parcours" and US-C14 "Parcours utilisé" with acceptance criteria pointing to the spec; scope list in `user-stories.md`.
- `CLAUDE.md`: payload key (schema stays 5), hold of routeless drafts in the sync flow, the route step `surveyRouteGuide` and the chooser `surveyRouteChoose`, the Contexte card and summary label, the PDF block and data-driven identity row, the catalogue module and the method's words, the client marker in the HTTP client, the package `route/` module and `factor-details.ts` under "IBP validation" with the rule that route rules live only there and the score never depends on the route, `route-required.ts` in the surveys row, migration 025 and new key files, docs tree. No existing rule changed.
- `docs/README.md` and `docs/specs/README.md`: one line each for the spec and the tester protocol.

**Task 3, protocol (commits 4ba9eec3, 763f8700)**
- `docs/user-tests/route-choice-assistant.md` in French, in the case-table format: purpose, pre-check (three words a tester must fail to define), tester profile (3 to 5, one the owner's tester), materials and preparation (API deployed before the build), unaided rules, three scenario cards written without the method's words, each with expectations computed by running `recommendRoute` from the built package on the scenario's answers (not guessed), success measures, pass rule, result tables with the 🔲 legend, consent text, recording rules (outside the repository, only the anonymised report committed) and an empty "Rapport" section for plan 30-25.

| Scenario | Answers | Expected (from `recommendRoute`) | Rules |
|---|---|---|---|
| (a) 2 ha plantation, easy, wide | 2 ha, homogeneous, not difficult, not narrow | Parcours partiel par placette, Relevé plafonné, zone 1 ha, whole stand 2 ha | R-09, R-12b |
| (b) 12 ha mixed forest | 12 ha, heterogeneous | two options, subdivide pre-selected; subdivide (piece 3 ha, easy) gives Parcours en plein 3 ha; partial gives Parcours partiel par bande 2.4 ha | R-11b, R-10, R-11b#choose-partial |
| (c) 3 ha dense young stand, offline | 3 ha, homogeneous, difficult | Parcours partiel par bande, Relevé plafonné, zone 1 ha | R-08, R-12a |

## Verification

- Task verify commands: all three exit 0 (greps for `survey_route`, `route_required`, `X-Cortege-Features`, `_survey_route`, `dmh_counts`, `Deploy order`, `surveyRouteGuide`, `_survey_route.sql`, `Aide au choix du parcours`, `Parcours utilisé`, `Scénario`, `R-nn`, `## Rapport`, no em dash). `grep -c survey_route docs/technical/api-contract-v1.md` prints 26 (6 required).
- No U+2014 in any added line of the plan's commits (checked on the diff).
- `npm run lint` and `npm run typecheck`: exit 0. `npm run format:check`: only `.claude/settings.local.json` is flagged (not mine). Markdown is outside its glob; `npx prettier --check` on the changed Markdown flags `api-contract-v1.md`, `data-contract-v1.md` and `sync-conflict-resolution-v1.md`, but they already failed at `HEAD` (checked on the previous `api-contract-v1.md`), so they were left as they were; the new protocol file was formatted with Prettier and is clean.
- `git diff a6c5dd72 -- mobile/src/hooks/useSurveySync.ts` is empty. No code file touched. STATE.md, ROADMAP.md and REQUIREMENTS.md not modified.
- `npm run test:unit` was not run: docs only, and `api/test/check-env-parity.spec.ts` fails on this Mac (bash 3.2; CI runs bash 4).

## Deviations from Plan

**1. [Rule 1 - Stale doc] `docs/specs/README.md` route line updated**
- **Found during:** Task 2
- **Issue:** the index line still said "brouillon révisé le 2026-10-14, à relire et valider par le propriétaire" and used the old title "du comptage".
- **Fix:** one line, now "validées par le propriétaire le 2026-10-14", title "du relevé".
- **Files modified:** `docs/specs/README.md` (not in the plan's list)
- **Commit:** d5db8655

**2. [Interpretation] Pass rule of O-13**
- The spec and the plan say "chacun réussit seul le scénario (a) ; au moins deux sur trois réussissent (b) ou (c)", which does not scale to 3 to 5 testers. The protocol reads it per tester (at least one of (b) or (c)) and requires at least two thirds of the testers (2 of 3, 3 of 4, 4 of 5). The reading is written in the protocol (section 6.4) so the owner can change it before the session.

**3. [Plan wording] Scenario (b), subdivide path**
- The plan gave only "choosing it and giving the surface of one morceau" as a success. The expected result of that path depends on the piece, so the card fixes it (3 ha, easy to observe) and the expectation is computed (Parcours en plein, 3 ha, R-10 after R-11b). The partial path is as the plan says.

**4. [Addition] Facilitator rule for the steps before the route step**
- The first steps of a new survey (name, parcel) are not the object of the test. The protocol lets the facilitator show where to press there (logged "hors périmètre") and requires silence once "Choix du parcours" opens, so a stuck tester does not invalidate a scenario for an out-of-scope reason.

No rule of the validated spec was changed.

## Known Stubs

None. The "Rapport" section and the 🔲 cells of the protocol are intentionally empty: plan 30-25 fills them after the session.

## Threat Flags

None. T-30-51 (tester identity or recordings committed) is mitigated in the protocol: written consent, recordings and the code-to-person table kept outside the repository, anonymised report only. T-30-52 (new build against an older API) is mitigated by the "Deploy order" in the API contract, by CLAUDE.md (HTTP client and IBP validation lines) and by the protocol's preparation step (API deployed before the build).

## Notes for next plans

- Plan 30-24 must settle the French wording before the session: the protocol quotes the screen names ("Choix du parcours", "Choisir le parcours", "Utiliser ce parcours", "Découper en sous-peuplements", "Parcours partiel, sans découper", "Je connais déjà mon parcours") as they are in `mobile/src/i18n/fr/route-guide.ts` today. If a label changes, update the protocol.
- Plan 30-25 needs a build on a phone, the API deployed first, a test parcel opened online beforehand, and 3 to 5 testers passing the pre-check.
- If the decision table changes before the session, recompute the expectations (the protocol says how and where).

## Commits

- 684e1eb6: docs(30-23): survey_route in the API, data and sync contracts
- d5db8655: docs(30-23): form spec, epic C stories, CLAUDE.md and docs index for the route
- 4ba9eec3: docs(30-23): protocol of the recorded unaided tester test of the route choice
- 763f8700: docs(30-23): format the tester protocol tables with Prettier

## Self-Check: PASSED

Files verified present: `docs/user-tests/route-choice-assistant.md` and the nine modified docs and `CLAUDE.md`. Commits 684e1eb6, d5db8655, 4ba9eec3 and 763f8700 exist on the branch.
