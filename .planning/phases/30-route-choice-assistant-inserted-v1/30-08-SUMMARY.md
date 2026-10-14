---
phase: 30-route-choice-assistant-inserted-v1
plan: 08
subsystem: mobile
tags: [expo-sqlite, react-hooks, state-context, survey-route, offline-first]
requires:
  - phase: 30-02
    provides: validated route spec (sections 4 and 8)
  - phase: 30-03
    provides: "SurveyRoute, validateSurveyRoute, canonicalSurveyRoute and readSurveyRoute in @cortege/ibp-domain"
  - phase: 30-07
    provides: "survey_route on the sync wire types (SyncChangeSurvey) and the API storage contract"
provides:
  - "survey_route payload key on SurveyQueuePayload and the RoutePatch type (no SQLite column, schema stays at 5)"
  - "patchLocalSurveyRoute: draft-only, canonical, validator-checked, never clears"
  - "Pull copy of survey_route in buildSurveyPayloadFromRemote"
  - "handleUpdateSurveyRoute and the stable updateSurveyRoute action of the surveys context"
  - "useSurveyRoute(survey): reader hook with a loaded flag"
affects: [30-09, 30-14, 30-15, 30-16, 30-20, 30-21, 30-22]
tech-stack:
  added: []
  patterns: ["Phase 27 conditions twin reused: patchLocalSurveyConditions / updateSurveyNote / useSurveyConditions"]
key-files:
  created:
    - mobile/src/storage/surveys.route.sqlite.test.ts
    - mobile/src/hooks/useSurveyRoute.ts
    - mobile/src/hooks/useSurveyRoute.test.ts
  modified:
    - mobile/src/storage/types.ts
    - mobile/src/storage/surveys.ts
    - mobile/src/storage/sync.ts
    - mobile/src/storage/sync.pull.sqlite.test.ts
    - mobile/src/storage/surveys.completion.sqlite.test.ts
    - mobile/src/hooks/useSurveyDraftPatcher.ts
    - mobile/src/hooks/useSurveyDraftPatcher.test.ts
    - mobile/src/state/surveys-context.ts
    - mobile/src/state/AppStateProvider.tsx
    - mobile/src/state/contexts.test.tsx
key-decisions:
  - "patchLocalSurveyRoute validates the record with the package validator before opening the transaction and stores canonicalSurveyRoute(route); a refused record returns null and changes nothing"
  - "No clearing path: RoutePatch.survey_route is non-null, and a null passed anyway is refused by the validator (route_missing), so a stored route can only be replaced on a draft"
  - "useSurveyRoute tracks the survey id of each read, so while survey B loads it never returns survey A's route (it returns loaded: false)"
patterns-established:
  - "A route write goes through writeDraftPayload, so payload_completion and payload_factors_filled are recomputed in one place and do not move (a route is not a factor)"
requirements-completed: [REQ-C-route-record]
duration: 25min
completed: 2026-10-14
status: complete
---

# Phase 30 Plan 08: Route record on the phone Summary

**The recorded route now travels through the phone: a `survey_route` payload key written only to drafts in canonical form, copied on pull, saved through one stable silent `updateSurveyRoute` action and read through `useSurveyRoute`.**

## What was built

- `storage/types.ts`: `survey_route?: SurveyRoute | null` on `SurveyQueuePayload` (payload key, no SQLite column) and `RoutePatch = { survey_id; survey_route }` (non-null).
- `storage/surveys.ts`: `patchLocalSurveyRoute(input)` on the `patchLocalSurveyConditions` model: same transaction, status re-read inside it, `writeDraftPayload` (queued upsert rewritten, `sync_version` bumped). Returns null for a missing or non-draft survey (T-30-19) and for a record `validateSurveyRoute` refuses. Stores `canonicalSurveyRoute(route)`.
- `storage/sync.ts`: `buildSurveyPayloadFromRemote` copies `survey_route: survey.survey_route ?? undefined` (a null or missing remote value leaves the key absent; a local draft with pending work is still not overwritten by a pull).
- `useSurveyDraftPatcher.handleUpdateSurveyRoute(surveyId, route)`: silent, draft only, refreshes the local list, resolves false on a null write or an error (detail to `logStatusDetail("editing.surveyRoute")`).
- `surveys-context.ts` / `AppStateProvider.tsx`: `updateSurveyRoute: draftPatcher.handleUpdateSurveyRoute` in the one `useStableActions` object, so `useSurveys().actions` and `useSurveyActions()` expose it with a stable identity. `useSurveySync` is untouched.
- `hooks/useSurveyRoute.ts`: `useSurveyRoute(survey: LocalSurvey | null): SurveyRouteState = { route, loaded }`, reading `getLocalSurveyDraft` and `readSurveyRoute`, re-reading on `survey.id` / `survey.updated_at`, dropping an overtaken read.

## Tests

- `surveys.route.sqlite.test.ts` (new, real SQL): write bumps `sync_version` and leaves one queued upsert carrying the route; second write replaces it; canonical form stored (unknown key dropped); submitted, synced-submitted and unknown survey return null and write nothing; invalid record and `null` refused, stored route kept; row without payload rebuilt; autosave (`updateLocalDraft`) keeps the route in payload and queue; counters unchanged; `SCHEMA_VERSION` is 5.
- `sync.pull.sqlite.test.ts`: insert and update store the route, null or missing leaves the key absent, a local draft with pending work keeps its own route.
- `surveys.completion.sqlite.test.ts`: the completion and factor counters ignore `survey_route`, and a route write leaves the stored counters and returned row counters unchanged.
- `useSurveyDraftPatcher.test.ts`, `contexts.test.tsx`, `useSurveyRoute.test.ts` cover the handler, the stable action (wired to the patcher, same identity across every render and in the actions-only context) and the reader (not loaded, loaded, absent, damaged, failed read, null survey, re-read, no cross-survey route, overtaken read).

## Verification

- `npm run lint` and `npm run typecheck`: exit 0.
- Full mobile unit suite: 412 suites, 6030 tests, all passing.
- `npm run format:check`: only `.claude/settings.local.json` is flagged (not part of this plan, pre-existing).
- `git diff a6c5dd72 -- mobile/src/hooks/useSurveySync.ts` is empty.
- `SCHEMA_VERSION = 5` unchanged.

## Deviations from Plan

### Minor adjustments

**1. Acceptance check for `useSurveySync` uses the branch merge commit**
- The plan compares against `git merge-base HEAD origin/main`; that base now includes phase 29 changes to the file, so the check was done against `a6c5dd72` as instructed by the orchestrator. Result: unchanged.

**2. `useSurveyRoute` takes the survey id into account (beyond the Phase 27 twin)**
- The twin keeps the previous survey's value while a new one loads. The route reader tracks the id of each read and returns `{ route: null, loaded: false }` until the read for the current survey lands, so a screen can never show or save from another survey's route. Plan behavior ("starts with loaded: false", "re-reads when the row changes") is unchanged.

**3. Validation before the transaction**
- `patchLocalSurveyRoute` runs the pure package validator before opening the transaction (the status is still re-read inside it). Same outcome, no transaction for a record that cannot be stored.

None of these changes a rule of the validated spec.

## Known Stubs

None. Nothing yet sends the `X-Cortege-Features` header (`CLIENT_FEATURES_HEADER` is not used in `mobile/src`); that belongs to a later plan of the phase (the hold of drafts without a route, P-1, and the finish gate are plan 30-16).

## Threat Flags

None. T-30-19 (non-draft write), T-30-20 (loss by autosave or pull) and T-30-21 (damaged stored route) are mitigated and pinned by the tests above.

## Commits

- `1c04d963` feat(30-08): draft-only survey_route write and pull copy on the phone
- `7de28541` feat(30-08): updateSurveyRoute action and useSurveyRoute reader

## Self-Check: PASSED

- Created files exist: `surveys.route.sqlite.test.ts`, `useSurveyRoute.ts`, `useSurveyRoute.test.ts`.
- Commits `1c04d963` and `7de28541` exist on the branch.
- Acceptance greps: `patchLocalSurveyRoute`, `survey_route: survey.survey_route ?? undefined`, `updateSurveyRoute: draftPatcher.handleUpdateSurveyRoute`, `export function useSurveyRoute`, `SCHEMA_VERSION = 5` all present.
