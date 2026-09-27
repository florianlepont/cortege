---
phase: 2
slug: association-only-sharing-scope-trim
status: complete
created: 2026-09-27
---

# Phase 2 — Validation

> This phase was executed as five plans (02-01 through 02-05) rather than the granular per-task
> `/gsd:plan-phase` structure earlier phases in this repo used (no separate `PLAN.md` per task with
> `<automated>` command IDs). Each plan has its own `02-0N-SUMMARY.md` with the diff, the tests
> added, and the exact commands run. This file is the phase-level rollup: one row per ROADMAP
> success criterion, pointing at the plan(s) and evidence that satisfy it.

**PR**: https://github.com/florianlepont/cortege/pull/171 (draft; pushed incrementally, one commit per plan)

## Test infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Mobile: Jest 29 + ts-jest, `react-test-renderer`, `@testing-library/react-native/pure`. API: Jest 29 + ts-jest unit specs, Jest + Supertest E2E against PostgreSQL 16 |
| **Full local gate** | `npm run lint && npm run typecheck && npm --workspace mobile run test:unit && npm --workspace api run test:unit && npm run format:check` — run after every plan, all green |
| **E2E** | `npm run test:e2e` — run against a real PostgreSQL 16 instance this environment provisioned directly (no Docker daemon available in this sandbox; `docker compose` from `infra/` is the documented path for a normal dev machine). Run once, after plan 02-01 (the only plan touching the API); 33 suites, 208 tests, 3 skipped, all passing. Not re-run after plans 02-02 through 02-05 since none of them touch `api/` |
| **CI** | Not run by this session (no push-triggered CI observed locally); the draft PR's own GitHub Actions run is the CI record for this phase, watched via the PR subscription |

## Success criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `GET /public/map-items` and `GET /public/parcels/status` require authentication; Explorer shows any member's submitted surveys | ✅ Done | 02-01 (server: `AuthGuard` on `PublicController`, predicate drop, migration 017) + 02-02 (client: access token on `fetchPublicMapItems`/`fetchPublicParcelStatuses` and every caller) |
| 2 | Private/public visibility control removed from survey detail | ✅ Done | 02-03 (`DetailActions`/`DetailHeader` toggle and chip removed; column/endpoint untouched per D-01) |
| 3 | Report entry point removed from mobile app; `reports` API module untouched | ✅ Done | 02-02 (`SelectedSurveyCard`, `useSurveySyncNetwork`, `ibp-api.ts`; `api/src/reports/` not modified — confirmed by `git diff` scope of every commit in this phase) |
| 4 | Compte screen: account deletion with destructive confirmation, wired to `DELETE /me` | ✅ Done | 02-04 — the API path and most mobile plumbing (`handleDeleteAccount`/`performDeleteAccount`, correct copy) already existed; the actual defect (double confirmation dialog, one with contradictory copy) is fixed |
| 5 | Survey detail shows previous submitted surveys on the parcel + IBP total/factor deltas vs. the latest previous version | ✅ Done | 02-03 (`HistorySection.tsx`, `useParcelSurveyHistory`, `computeIbpTotalDelta`/`computeFactorDeltas`) |
| 6 | Explorer: tapping a studied parcel opens its latest survey detail or history | ✅ Done, scoped | 02-02 — opens **history** (`ParcelHistoryCard`), not a full survey-detail view: another member's survey has no local copy, and the owner-scoped `GET /surveys/:id` is out of this phase's stated API boundary (`api/src/surveys/`, `api/src/users/` per the task's own scope note — widening survey-detail access is a bigger change than a scope-trim phase should absorb without a separate decision). Recorded as a scope call in `02-CONTEXT.md` D-05 |
| 7 | Doc corrections: US-A4 retagged; `user-stories.md` §8 moderation/team-challenge filing fixed | ✅ Done | 02-05 |
| 8 | UX audit Lot 0: re-verify then fix BUG-03, BUG-05..08, DS-01/02/14 | ✅ Done except BUG-04 (deferred) | 02-04. BUG-01/BUG-02 re-verified already resolved by phase 01.8 (confirmed: `ibp-scoring.ts`/`IbpScoreBadge.tsx` already compute out of 50). BUG-04 (decimal comma) lives in `mobile/src/hooks/useSurveyForm.ts`, inside the parallel Phase 3 session's active territory (factor-entry ergonomics) — deferred per `02-CONTEXT.md` D-08 to avoid a merge collision, not forgotten |

## Deviations from the roadmap's literal wording, and why

- **Criterion 6** is satisfied by a history view, not a "survey detail" view, for the reason given in the table above. This is the one place this phase's delivered scope is narrower than the roadmap sentence's most literal reading; the alternative (loosening `GET /surveys/:id` ownership) is a real API-surface decision that belongs to a reviewer, not an autonomous call.
- **BUG-04** or a UX audit sub-item is the one Lot 0 item not closed in this phase, deferred to avoid touching `mobile/src/hooks/useSurveyForm.ts` while Phase 3 (Field-Entry Ergonomics) is actively restructuring factor entry in the same milestone.

## Final gate (run after plan 02-05, full branch state)

```
npm run lint                            # clean — api, mobile, ibp-domain
npm run typecheck                       # clean — ibp-domain, mobile, api build
npm --workspace mobile run test:unit    # 97 suites, 1279 tests passed
npm --workspace api run test:unit       # 32 suites, 745 tests passed
npm run test:e2e                        # 33 suites, 208 tests, 3 skipped (run after 02-01; unaffected since)
npm run format:check                    # clean
```
