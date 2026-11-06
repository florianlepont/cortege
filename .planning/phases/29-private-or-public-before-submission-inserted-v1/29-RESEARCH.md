# Phase 29: Private or Public Before Submission - Research

**Researched:** 2026-10-13
**Domain:** brownfield access-control change (NestJS + raw SQL `pg`, Expo offline-first client, shared wire types)
**Confidence:** HIGH (every claim below is read from this repository at the cited file:line; no external library or web source is involved, so nothing is `[ASSUMED]` unless tagged)

Provenance tags used here: `[VERIFIED: codebase]` = read in this session at the cited location; `[VERIFIED: psql]` / `[VERIFIED: git]` = command run in this session; `[CITED: file]` = taken from a planning or docs file; `[ASSUMED]` = judgement not confirmed by the owner.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Dependency (resolved at the start of the discussion)
- **D-01:** The ROADMAP line "Depends on: Phases 11 and 38 (closed accounts)" is wrong. Phase 11 (D-02) already defined "association member = any authenticated user"; private vs shared only decides whether a survey is visible to the owner alone or to every authenticated user, which is independent of who may hold an account. Phase 38 only narrows who can authenticate. So Phase 29 does **not** depend on 36: the dependency becomes "Phase 11". The ROADMAP is corrected at the end of the phase (STATE.md and ROADMAP.md are touched last, to avoid tracking conflicts with other sessions). No question for the owner is needed.

#### Meaning and wording
- **D-02:** Two values, the existing `private | public` column and wire type (`SurveyVisibility` in `@cortege/ibp-domain` contract). "public" in code means "shared with the association", never the open internet; the UI never says "public". Labels (catalogue `fr`, no em dash): "Privé" and "Partagé avec l'association", each with one explanatory line (who sees what). Exact strings are the planner's, validated with the owner at the UI gate.
- **D-03:** The mobile and API names stay `visibility`; do not rename the column.

#### Default and placement (owner, 2026-10-13)
- **D-04:** The selector sits **in the submission step** (the screen or confirmation that precedes the send), with **"Partagé avec l'association" pre-selected** (matches today's behaviour). The observer can switch to "Privé" before sending. Changing it is possible until submit, frozen after.
- **D-05:** A draft stores its current choice (default shared) so an interrupted submit keeps it; draft rows keep working offline and the choice rides on the normal upsert and the existing `visibility_update` queue kind until submit.

#### Existing data (resolved here, derived from the owner's "existing surveys keep their current visibility")
- **D-06:** Every survey created so far has `visibility = 'private'` in the database (the mobile client and the server both defaulted to it) while Phase 11 made all submitted surveys visible to everyone. Keeping their *current visibility* therefore means **backfilling every submitted survey to `public`** in a new migration (next number after the current last), so nothing disappears from the map or search on deploy. Drafts keep their value; the migration also drops/recreates any index whose predicate changes. Prod holds test data only, so no counting or two-step migration.

#### Read-only after submit
- **D-07:** After submit, `visibility` can no longer change: `PATCH /surveys/:id/visibility`, the `visibility_update` sync action, and an upsert carrying a different visibility on a submitted survey are refused (422 `submitted_read_only_fields`, matching the existing error policy; sync answers a per-operation blocked result). `docs/technical/publication-visibility-post-submit-v1.md` allowed editing after submit; this phase **supersedes** that rule (the document is updated and marked superseded in its status).
- **D-08:** `visibility_changed` events keep being written for draft changes if the code already does so; no new event type.

#### Server enforcement (the core guarantee)
- **D-09:** One shared predicate is the single source: `PUBLIC_SURVEY_PREDICATE` in `api/src/surveys/public-map.queries.ts` gains `AND s.visibility = 'public'` (used by map items, parcel statuses, community list and detail, search community, parcel search, community attachments). Nothing else may re-derive "visible to others" by hand.
- **D-10:** Parcel history (`parcels.service.ts`) shows the caller their own submitted surveys of the parcel regardless of visibility, plus other members' `public` ones; a private survey of someone else never appears.
- **D-11:** **A private survey is totally invisible to others** (owner, 2026-10-13): a parcel with only private surveys shows as not studied to other members, in every count and status. The **next version number stays computed over all submitted surveys, private included** (`parcels.service.ts` next-version queries), so the author's numbering stays coherent; only the number leaks, never content. The planner documents this in the API contract.
- **D-12:** Guarantee tests (API, e2e on `ibp_test`): for each read path, a private survey of user A is absent for user B and present for A where an owner view exists; shared appears for both; a survey flipped is impossible after submit (D-07); direct id access by B to A's private survey (community detail, attachments, download URL, content) answers 404, not 403. A test enumerates the routes reading surveys so a future route cannot skip the predicate.
- **D-13:** Account deletion keeps retaining submitted surveys (Phase 11/27 D-24); a retained private survey stays private (author nulled, still hidden). Retained shared ones behave as today.

#### Sync and mobile
- **D-14:** Sync wire contract unchanged in shape (`visibility` already on upsert and `visibility_update`); the pull (`GET /v1/sync/changes`) keeps returning the owner's own surveys with their visibility. Installed-app compatibility is not a constraint (prod is test data). The local SQLite `visibility` column and payload field already exist, so **no SQLite migration**.
- **D-15:** Survey detail shows the visibility as a read-only line/badge for the owner's own surveys (after submit, not editable), and the list filter `visibilityFilter` (already in `survey-logic.ts`) is reviewed: kept only if it has a UI home; otherwise removed as dead code (planner decides, flag in the plan).
- **D-16:** Community search and the Explorer need no mobile change beyond what the server returns; the mobile offline search over own surveys is unaffected (own surveys always visible to their owner).
- **D-17:** PDF export of one's own private survey keeps working; the "private" state is not printed unless the planner finds an obvious place for it (discretion).

### Claude's Discretion
- The exact component and layout of the selector (follow the visual layer rules in CLAUDE.md: `useBrandTheme`, outline icons, `brandMotion`, glass only where allowed), the migration number, and the test file split.
- Whether the guarantee test enumerating routes is a spec or an e2e.

### Deferred Ideas (OUT OF SCOPE)
- Changing visibility after submit (owner decision: read-only).
- Sharing with named members or groups; a "shared with a structure" level (V3).
- Showing others that "a private survey exists" on a parcel (rejected, D-11).
</user_constraints>

<phase_requirements>
## Phase Requirements

ROADMAP.md (Phase 29 block, around line 1036) says `Requirements: none new yet`; the only ID that must be traced is **REQ-C-privacy-choice** (`.planning/REQUIREMENTS.md:212`, V1, Phase 29; also restores the toggle removed from `REQ-B-manage-published` at `:49`, and ends the `REQ-X-visibility` override at `:182`).

REQ-C-privacy-choice has no sub-claim list of its own. It is the union of the one-line requirement, ROADMAP success criteria SC1-SC3, and the old story US-C7 (`docs/specs/epic-c-ibp-survey-data-entry.md:132-146`). The plans must cover these sub-claims (the plan-checker should verify each against a task):

| ID | Sub-claim | Source | Enabled by (this research) |
|----|-----------|--------|----------------------------|
| C1 | The observer chooses private or shared with the association before submitting | SC1, US-C7 AC1, D-04 | Mobile section M2 (finish sheet + picker) |
| C2 | The choice is stored on the draft (default shared), synced, and survives an interrupted submit | SC1, D-05 | M3 (defaults, no stale overwrite), W1/W5 (server write) |
| C3 | The choice is read-only after submit, on every write channel | SC1, D-07 | Writes W1-W6, error codes table |
| C4 | A private survey never reaches another member on any read path, enforced on the server, with API tests | SC2, D-09..D-12 | Reads R1-R12, test plan V |
| C5 | Existing submitted surveys keep their current visibility (backfill to public), no index regression | SC3, D-06 | Migration section |
| C6 | The removed toggle is restored with the right wording ("Privé", "Partagé avec l'association", never "public") | SC3, D-02 | M2, M4 (catalogue) |
| C7 | The owner sees the choice afterwards, read-only | D-15 | M5 |
| C8 | Retained private surveys stay hidden after account deletion | D-13 | R17 |

Spec text that contradicts the locked decisions and must be amended in this phase (US-C7 says default `private`, "change later from survey detail", moderators/admins can read private; US-B3 says switch visibility from survey detail): listed in Docs section.
</phase_requirements>

## Summary

The server already has the whole visibility plumbing (column + CHECK `chk_surveys_visibility`, DTO enums, PATCH endpoint, sync action, `visibility_changed` events), and Phase 11 removed the read-side filter in exactly two places: it dropped `visibility = 'public'` from `PUBLIC_SURVEY_PREDICATE` (`api/src/surveys/public-map.queries.ts:12`) and it dropped `(visibility = 'public' OR user_id = $2)` from the parcel history query (`api/src/surveys/parcels.service.ts:116-125`, per `11-01-SUMMARY.md:10-12`). Re-adding the predicate is a one-line change that automatically covers 9 of the 12 other-member read paths because they all interpolate the constant. The three that do NOT go through it, or that need caller identity, are: **parcel history** (hand-written WHERE, no caller param, `parcels.controller.ts:15-18` has no `@CurrentUser`), **reports** (`reports.service.ts:181-199`, reads `visibility` itself and answers 403 instead of 404), and the owner-aware behaviour of the community routes (no caller identity at all).

The write side is where the real design work is: nothing currently stops a visibility change after submit. Three code paths write `visibility` on a submitted row today (`PATCH /surveys/:id/visibility` via `applyVisibilityChange`, the locked-upsert "restricted update" at `surveys.service.ts:460-474`, and the same-version "visibility_only" fast path at `:170-176` / `:958-967`), plus `PATCH /surveys/:id` accepts `visibility` post-submit because it is missing from the read-only key list (`surveys-normalize.utils.ts:28-46`). Two of them have a TOCTOU window against `POST /submit` (no row lock, no `status` guard in the UPDATE). The existing error policy is NOT "422 everywhere": PATCH channels answer `422 submitted_read_only_fields`, while upsert/sync replays answer `409 survey_submitted_read_only` (same version: `409 sync_version_conflict`) (`api-contract-v1.md:593-594`). Recommendation below follows the existing policy per channel; D-07's blanket "422" is the one point to confirm.

On mobile the Phase 11 removal was UI-only, so most of the plumbing exists (`updateSurveyVisibility`, `queueSurveyVisibilityChange`, `survey_visibility_update` queue kind, `actions.toggleVisibility`), but there is **no submission step to host the selector**: "Terminer le relevé" is a single tap (summary `FinishBar` and the factor pager pill) that goes straight to `finishSurvey`. The recommended seam is a new native form-sheet route (same pattern as `surveyFactorHelp`) opened by both finish entry points, hosting a `CasPicker`-style radio-card picker. Four client defects found on the way must be fixed in the same phase or the feature loses data silently: stale `visibility` is re-written by every autosave (`useEditingDraft.ts:125,174,361`), new drafts default to `private`, the history list opens the owner's own surveys on the community page (404 for a private one), and owners' local rows will still say `private` after the backfill unless the migration also writes pull events.

**Primary recommendation:** (1) migration `024` that backfills submitted to `public`, writes one `backfilled` event per owned backfilled survey (so the owners' phones pull the new value) and recreates `idx_surveys_public_submitted` with `visibility = 'public'` in its predicate; (2) add `AND s.visibility = 'public'` to `PUBLIC_SURVEY_PREDICATE` and give parcel history a caller-aware variant defined next to it; (3) enforce D-07 in one helper per channel with the existing codes, with a row lock and an SQL status guard; (4) mobile: finish sheet + picker, drafts default to `public`, drafts stop carrying `visibility` through autosave, own-survey taps never go to the community page; (5) rewrite the ~12 e2e fixtures that publish through `PATCH /visibility` after submit or rely on "private is visible to all".

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| "Who may read a survey" (visibility predicate) | API / Backend (SQL) | Database (partial index) | Only the server can guarantee it; the client never filters others' data |
| Read-only after submit | API / Backend (service layer, row lock) | Database (optional guard) | Must hold for every channel (REST, sync) and under concurrency with submit |
| Visibility choice UI + pre-submit storage | Browser / Client (React Native) | Local SQLite | Offline-first: choice stored on the draft before any network |
| Visibility transport | Client sync queue | API `POST /sync` | Existing `upsert` payload field and `visibility_update` op |
| Backfill of existing surveys | Database (migration) | Client (pull of `backfilled` events) | Owners' phones must learn the new value |
| Owner's view of own private surveys on the map | Client (local overlay `map/own-surveys.ts`) | - | Server map routes are not caller-aware (D-09) |
| Wire types | `@cortege/ibp-domain` contract | - | Doc-comment change only, no IBP rule |

## Standard Stack

No new library. Everything is built from what the repo already uses. [VERIFIED: codebase]

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 11 | API controllers/services | existing |
| `pg` (raw SQL via `DatabaseService`) | existing | all queries | no ORM (CLAUDE.md) |
| `class-validator` DTOs | existing | `visibility` enum validation (`dtos/survey-upsert.dto.ts:44`, `survey-patch.dto.ts:23`, `survey-visibility-patch.dto.ts`, `sync-payloads.dto.ts`) | unchanged |
| Expo SQLite | existing | local `visibility` column (schema stays at version 5, D-14) | unchanged |
| React Navigation native-stack | existing | form-sheet route for the finish step (pattern: `surveyFactorHelp`) | `stack-options.ts:143-151` |
| Jest 29 + ts-jest, Supertest | existing | tests | existing suites |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Form-sheet route hosting a radio-card picker | `Alert.alert` with 3 buttons (like `confirmDeleteSurvey`, `useSurveySyncSurveyOperations.ts:436-`) | Zero new screen, but no selector and no explanation line (D-04 asks for a selector with one line each). Acceptable fallback only if the owner drops the explanation. |
| Server `visibility` on `POST /surveys/:id/submit` (atomic) | current "visibility first, submit second" | Removes the submit race entirely but changes the wire shape (D-14 says unchanged). Not recommended. |
| DB trigger forbidding `visibility` change on submitted rows | service-level guard + SQL `status <> 'submitted'` | Trigger is belt and braces and also protects scripts; costs a migration function. Optional hardening, not required by D-07. |

**Installation:** none. **Version verification:** not applicable (no package added).

## Package Legitimacy Audit

No external package is installed or upgraded in this phase. Table intentionally empty: **Packages removed due to SLOP: none. Packages flagged SUS: none.**

## Architecture Patterns

### System Architecture Diagram

```
 MOBILE (offline-first)                                   API                                    POSTGRES
 ----------------------                                   ---                                    --------
 wizard creates draft  --createLocalDraft--> local_surveys.visibility = 'public' (NEW default)
        |                                         |
 factor pager / summary                           | autosave: must NOT carry visibility (M3)
        |                                         v
 "Terminer le relevé" tap --> NEW surveyFinish form sheet (VisibilityPicker, default = stored choice)
        |   confirm
        |-- 1. flushDraft() (pager only)
        |-- 2. queueSurveyVisibilityChange(id, choice)  [skips if status='submitted']
        |        -> rewrites pending upsert OR queues survey_visibility_update
        |-- 3. submitSurvey(id) = finishSurvey():
        |        sendPendingChangesBeforeFinish -> POST /v1/sync  ---------------------------> upsertForUser / patchSurveyVisibility
        |                                                          draft rows: write visibility (+ visibility_changed event)
        |                                                          submitted rows: REFUSE (W1..W6)
        |        POST /v1/surveys/:id/submit (no body) ------------------------------------> submitSurvey: FOR UPDATE, status='submitted', visibility untouched
        v
 survey detail (owner): read-only "Visibilité" row  <-- GET /sync/changes (owner only: s.user_id = $1) <-- survey_events

 OTHER MEMBER (reader) ---> /public/map-items, /public/parcels/status, /public/community-surveys[/:id[/attachments...]],
                            /search/community, /search/parcels, /parcels/:id/surveys/history
                              |                                          |
                              +-- every SQL: PUBLIC_SURVEY_PREDICATE (+ s.visibility = 'public')  --> idx_surveys_public_submitted
                                  history: PUBLIC predicate OR (user_id = caller)  [one shared constant]
                              direct id of a private/draft/deleted survey -> 404 (same message as unknown id)
```

### Recommended Project Structure (touched areas only)
```
api/migrations/024_private_or_public_visibility.sql           NEW
api/src/surveys/public-map.queries.ts                         predicate + caller-aware history predicate
api/src/surveys/parcels.service.ts / parcels.controller.ts    history takes the caller
api/src/surveys/surveys.service.ts / surveys-normalize.utils.ts   D-07 enforcement
api/src/reports/reports.service.ts                            404 instead of 403 / drafts
api/test/                                                     rewrites + new suites (section V)
packages/ibp-domain/src/contract/survey.ts, public-map.ts     doc comments only
mobile/src/ui/VisibilityPicker.tsx                            NEW (model: ui/CasPicker.tsx)
mobile/src/navigation/routes/FinishSheetRoute.tsx             NEW (model: FactorHelpRoute.tsx)
mobile/src/screens/FinishSheet.tsx (or survey-detail/)        NEW
mobile/src/i18n/fr/survey-detail.ts (or a new module)         strings
```

### Pattern 1: one predicate, two shapes
**What:** keep `PUBLIC_SURVEY_PREDICATE` as the only definition of "other members may see this", and add its caller-aware sibling in the same file for the history route, so "nothing else re-derives it by hand" (D-09) stays true.
**Example:**
```ts
// api/src/surveys/public-map.queries.ts (shape to implement)
export const PUBLIC_SURVEY_PREDICATE =
  `s.status = 'submitted' AND s.deleted_at IS NULL AND s.visibility = 'public'`
/** Parcel history (D-10): the caller's own submitted surveys, plus the shared ones of the others. */
export const submittedVisibleToCallerSql = (callerParam: string) =>
  `s.status = 'submitted' AND s.deleted_at IS NULL AND (s.visibility = 'public' OR s.user_id = ${callerParam}::uuid)`
```
(Phase 11 had exactly this OR clause with `$2 = user.id`; see `11-01-SUMMARY.md:11`.) The existing unit specs assert `toContain(PUBLIC_SURVEY_PREDICATE)` (`search.queries.spec.ts:33,96`, `community-surveys.service.spec.ts:182`), so they keep working unchanged and automatically pin the new text.

### Pattern 2: radio-card picker + form-sheet route
`ui/CasPicker.tsx` (full file read) is the model: `AppPressable` cards with `accessibilityRole="radio"`, `accessibilityState={{selected}}`, `fr.surveyForm.wizard.optionA11y({label, caption})`, an outline checkmark in a filled radio, `theme.semanticColors.ctaPrimary` border when selected, and a "Why custom" header comment (`CasPicker.tsx:1`). `AppChoiceChip` radio variant is a pill (no room for a caption); `FactorSegmentedInput` has no caption. The host is a native form sheet exactly like `surveyFactorHelp`: `SurveysStack.tsx:193-197`, `stack-options.ts:143-151` (`presentation: iOS "formSheet" / Android "modal"`, `sheetAllowedDetents`, grabber), route component pattern `navigation/routes/FactorHelpRoute.tsx`, param type in `navigation/types.ts:40,143`.

### Anti-Patterns to Avoid
- **Filtering client-side or in the response mapper.** The guarantee is SQL-level; never "select all then drop private rows".
- **A second hand-written visibility WHERE** (what the history route is today). The route-enumeration test (V.3) must fail on it.
- **Letting the draft write path carry `visibility`** from React state (stale overwrite, M3).
- **403 for a hidden survey.** Always the same 404 as an unknown id.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "visible to others" rule | per-route `visibility = 'public'` strings | `PUBLIC_SURVEY_PREDICATE` / the caller-aware sibling | D-09; Phase 11 showed the cost of scattering it |
| Ownership lookup + 404 | new `WHERE user_id` queries | `SurveysRepository.findOwned[OrThrow]` (`surveys.repository.ts:362-392`) | already 404 for non-owners |
| Per-operation sync failure mapping | custom result shape | `mapSyncError` (`sync-error.utils.ts:27-62`): 4xx (not 429) = `fatal_error`, code from the response `code`, details from `details` | mobile already understands both read-only codes (`i18n/fr/sync-errors.ts:35-36`) |
| Radio cards | new card styling | `ui/CasPicker.tsx` structure | a11y roles, contrast tests, theme tokens already solved |
| Sheet navigation | custom modal | `surveyFactorHelp` form-sheet pattern | detents, Android fallback |
| Scratch-schema migration test | ad-hoc | `api/test/migration-023-survey-note-weather.e2e-spec.ts` (real runner `scripts/migrate.js`, scratch schema, pre-migration seed) | same harness |
| Query-plan regression check | manual EXPLAIN | `api/test/public-routes-explain.e2e-spec.ts` + `api/scripts/explain-public-routes.js` | already seeds 10 000 surveys, 20 % public+submitted |

## Section R: Read-path inventory (item 1)

"Shared?" = goes through `PUBLIC_SURVEY_PREDICATE`. Lines are in the current tree. [VERIFIED: codebase]

| # | Route / code path | file:line | Predicate today | Shared? | Required change |
|---|-------------------|-----------|-----------------|---------|-----------------|
| R1 | `GET /public/map-items` | `public.controller.ts:19-22` -> `public-map.service.ts:87-110` -> `buildPublicMapItemsQuery` `public-map.queries.ts:79-132` (conditions `:83`) | `status='submitted' AND deleted_at IS NULL` + `submitted_at IS NOT NULL` | yes | none beyond the constant |
| R2 | `GET /public/community-surveys` | `public.controller.ts:24-27` -> `public-map.service.ts:113-124` -> `buildCommunitySurveysQuery` `public-map.queries.ts:273-300` (`:277`) | same | yes | none beyond the constant; fix the stale comment at `:268-272` |
| R3 | `GET /public/community-surveys/:id` (detail + parcel history inside) | `community-surveys.service.ts:75-178`: main SELECT `:96-101` (predicate `:100`); history subquery `:120-135` (predicate `:123`) | same | yes | none beyond the constant. Note: no caller identity, so the history list here never contains the viewer's own private surveys (acceptable: "what the others see") |
| R4 | `GET .../:id/attachments` | `public.controller.ts:34-37` -> `community-surveys.service.ts:180-197`; guard `assertPublicSurvey` `:240-248` (predicate `:242`) | same | yes | none. The attachments SELECTs at `:182-188` and `:254-259` filter by `survey_id` only and are safe only because `assertPublicSurvey` runs first: keep that order (pin with a test) |
| R5 | `GET .../attachments/:attachmentId/download-url` | `community-surveys.service.ts:199-218` (assert at `:203`) | same | yes | none. Presigned URLs (minio) are issued only after the assert; because visibility can no longer flip after submit (D-07) there is no "revoked URL" problem |
| R6 | `GET .../attachments/:attachmentId/content` (local storage mode) | `public.controller.ts:47-57` -> `community-surveys.service.ts:220-238` (assert `:224`) | same | yes | none |
| R7 | `GET /public/parcels/status`, DB path | `public-map.service.ts:147-155` -> `PUBLIC_PARCEL_STATUSES_BBOX_SQL` `public-map.queries.ts:180-195`, `PUBLIC_PARCEL_STATUSES_SQL` `:199-212`, both via `LATEST_PUBLIC_SURVEY_OF_PARCEL` `:144-157` (predicate `:153`) | same | yes | none. Semantics: "latest" becomes the latest *shared* survey (an older shared one may show when the newest is private); no content leak |
| R8 | `GET /public/parcels/status`, IGN path (zoom >= 15) | `public-map.service.ts:139-145`, `withStudyStatus` `:200-242` -> `PUBLIC_STUDIED_BY_COMMUNES_SQL` `public-map.queries.ts:219-232` (lateral `:229`) | same | yes | none |
| R9 | `GET /search/community` surveys | `search.controller.ts:32-36` -> `search.service.ts:34-71` -> `buildSearchCommunitySurveysQuery` `search.queries.ts:24-59` (predicate `:31`; caller excluded `:42-43`) | same | yes | none |
| R10 | `GET /search/community` members + `author` filter | `search.queries.ts:67-88` (predicate `:79`) | same | yes | none. Consequence: `survey_count` counts shared only; a member whose every survey is private does not appear (inner join, `:76-83`). Consistent with D-11 |
| R11 | `GET /search/parcels` | `parcel-search.service.ts:173-200` -> `buildParcelSurveyCountQuery` `parcel-search.queries.ts:57-86` (predicate `:75`) and `buildParcelsBySectionNumberQuery` (ordering "studied last", lateral at `:119`) | same | yes | none. The ordering at `:119` would otherwise leak recency of private surveys; the constant fixes it |
| **R12** | `GET /parcels/:parcelId/surveys/history` | `parcels.controller.ts:15-18` (**no `@CurrentUser`**) -> `parcels.service.ts:76-134`, SQL `:108-125` (`deleted_at IS NULL :121`, `status='submitted' :122`, `submitted_at IS NOT NULL :123`) | hand-written, no visibility, no caller | **NO** | add `@CurrentUser()` + pass `user.id`; replace the three hand-written lines with the caller-aware sibling constant (Pattern 1); `ORDER BY`/`LIMIT` unchanged. Also covers the mobile PDF trend cache `parcel_history:` (it stores whatever this route returns) |
| R13 | next version (single) | `parcels.service.ts:279-297` (`FROM surveys s :286`, `status :291`) | all submitted, any author | no (by design) | **keep unchanged** (D-11). Add a unit assertion that it does NOT contain `visibility` |
| R14 | next version (submit validation) | `parcels.service.ts:336-347` (`LEFT JOIN surveys s :339`, status `:342`) and the fast-path SQL `surveys.repository.ts:182-190` | all submitted | no (by design) | keep (D-11). Three places compute it; pin all three in one spec so they cannot drift apart. The global unique index `idx_surveys_submitted_parcel_version_unique` (`008_parcels_and_versioning.sql:54-60`, never dropped) means a hidden private survey also blocks another member's identical (parcel, year, version) with `parcel_version_conflict` (`surveys.service.ts:1108-1117`, `:1183-1188`): the accepted "number leaks" of D-11, but the client message (`sync-errors.ts:33`) will look unexplained to the other member |
| R15 | Owner reads: `GET /surveys`, `GET /surveys/:id`, attachments (list/download-url/content), `GET /surveys/:id/events` | `surveys.controller.ts:45-59,66-69,110-138,169-179`; `surveys.repository.ts:93` (`user_id = $1`), `:373-375` (`WHERE id = $1 AND user_id = $2`); attachments via `findOwnedOrThrow` (`surveys-attachments.service.ts:296,371,395`); events `survey-events.service.ts` (ownership first, then `survey_id = $1`) | ownership | n/a | none. All answer 404 to a non-owner. Pin with tests (D-12 "404, not 403") |
| R16 | Sync pull | `surveys-sync.service.ts:208-219` (events, `s.user_id = $1`), legacy cursor `:282-290`, `loadSyncChangeSurveys :322-364` (`WHERE s.user_id = $1 :360`), attachments `:390-396` | ownership | n/a | none; the pull is the channel that tells owners' phones about the backfill (see Migration) |
| R17 | Account deletion | `users.service.ts:254-310`: retained set `:257-262`, `UPDATE surveys SET user_id = NULL :292-297`, drafts deleted `:299-310`; visibility never touched | n/a | n/a | none; add the D-13 test (private retained survey stays hidden, shared one stays visible with `author_name` null) |
| R18 | Reports | `reports.service.ts:181-199`: `findSurveyForReport` selects `visibility` but not `status`; `canReportSurvey :191-199` returns `survey.visibility === "public"` for non-owners, else `ForbiddenException` (`:101-103`) | own rule | **NO** | non-moderator reading a non-visible survey must get **404** (same as unknown id), not 403 (existence oracle by id); require `status = 'submitted'` too, because drafts will default to `public` and today a member can report (and thereby confirm) another member's *draft* by id. Existing test `epic-e-search-reports.e2e-spec.ts:252-256,334-339` expects 403 for private: rewrite |
| R19 | Debug resets | `debug/debug.service.ts:28-35,59-66` | delete all | n/a | none (dev-only gate) |
| R20 | Scripts | `api/scripts/seed-demo-community.js:292` (community surveys `public`), `scripts/lib/demo-history.js:99-332` (owner plan mixes private/public), `explain-public-routes.js:65,137,204-210` (legacy SQL keeps `visibility = 'public'`; seed: 30 % public) | n/a | n/a | seeds already carry both values; after the phase the demo owner's private surveys are hidden from other demo members (intended). `explain-public-routes.js` needs no change |
| R21 | Not survey data | `weather.controller.ts`, `geocoder.service.ts`, `map-styles.controller.ts` | - | - | none |

Pre-existing, unchanged: `POST /surveys` with another user's survey id answers `409 survey_id_conflict` (`surveys.service.ts:600-605`), an existence oracle by (random) id for any survey. Out of scope; mention in the contract's threat notes.

## Section W: Write-path inventory (item 2)

What the installed mobile client sends today [VERIFIED: codebase]:
- every `survey.upsert` payload carries `visibility` (`storage/types.ts:116,203`; set at `storage/surveys.ts:48,477-480`; rebuilt from the pulled row at `storage/sync.ts:446`);
- `survey.visibility_update` only from `queueSurveyVisibilityChange` (`sync.ts:681-797`), sent as `entity survey, action visibility_update, survey_id, payload {visibility}` (`sync.ts:997-1010`), after the upserts (`sync.ts:1019-1027` sorts upserts first);
- `POST /surveys/:id/submit` with **no body** (`sync.ts:1329-1335`), so submit never resends visibility; the finish drains pending changes first (`useSurveySyncSurveyOperations.ts:238-254`) and only submits when the queue is clean;
- the app never calls `PATCH /surveys/*` (only `PATCH /me`, `/me/email`: `api/ibp-api.ts:55-80`).
So no legitimate draft flow depends on a post-submit visibility write. The only post-submit upsert the client can emit is an identical replay of a pulled survey (visibility equal to the stored value): that must stay `synced`.

| # | Channel / path | file:line | Today | Required |
|---|----------------|-----------|-------|----------|
| W1 | `POST /surveys` upsert, **submitted** row, higher `sync_version` | `surveys.service.ts:184-187` -> `upsertLocked :450-493`; restricted UPDATE writes `visibility = $3` at `:460-470` | applies `body.visibility` | Add `visibility` to `getChangedSubmittedReadOnlyFields` (`surveys-normalize.utils.ts:183-315`), only when `existing.status === 'submitted'` and `body.visibility` defined and different. Result: `409 survey_submitted_read_only`, `details.fields` includes `"visibility"` (existing throw `:451-458`). Equal value stays the identical replay. The restricted UPDATE should then write `existing.visibility` (no change) |
| W2 | upsert, submitted row, **same** `sync_version` ("Case B2") | fast path `:170-176` (visibility_only -> `upsertLocked`), locked `:432-441`, `resolveSameVersionUpsert :938-970` (applies via `applyVisibilityChange :958-967`), `settleMissedLockedWrite :621-632`; classifier `classifySameVersionContent :337-349` | `visibility_only` -> applied last-writer-wins | Same helper change as W1 makes the classifier return `conflict` for submitted rows, so the answer is `409 sync_version_conflict` with nothing written (matches the doc rule "this check runs before the submitted read-only check", `sync-conflict-resolution-v1.md:38`). `visibility_only` then only occurs on drafts: keep that code for drafts. Case B2 doc text must say "draft only" |
| W3 | upsert, draft row (fast + locked) | create `:126-159` (default `body.visibility ?? "private"` `:134`, locked `:376`), update fast `:192-228` (`:198`, SQL guard `status <> 'submitted'` `repository.ts:326`, xmin CAS `:325`), locked `:495-581` (`:537`) | free | unchanged. Server default for an *absent* `visibility` stays `private` (fail-closed); the mobile always sends it. Defaults at `:134,198,376,470,537` need no edit |
| W4 | `PATCH /surveys/:id` | `surveys.controller.ts:71-78` -> `patchSurvey surveys.service.ts:716-859`; key-presence list `getSubmittedReadOnlyFields surveys-normalize.utils.ts:28-46` (no `visibility`); check `:726-734` | accepted post-submit (`COALESCE($4, visibility)` `:794`, event `:850-855`) | add `"visibility"` to that list -> `422 submitted_read_only_fields` with `forbidden_fields: ["visibility"]` (existing throw `:729-733`). Key-presence rule: refuse even an equal value (consistent with the other keys). Lookup `:722` has no `forUpdate` and the UPDATE `:792-810` has no status guard: use `forUpdate: true` |
| W5 | `PATCH /surveys/:id/visibility` | `surveys.controller.ts:80-87` -> `patchSurveyVisibility :861-888` -> `applyVisibilityChange :896-927` (UPDATE `:908-914`) | works on submitted | after the equal-value no-op (`:878-884`, keep: idempotent replay returns 200), if `existing.status === 'submitted'` throw `422 submitted_read_only_fields` (`forbidden_fields: ["visibility"]`). Use `forUpdate: true` on the lookup AND add `AND status <> 'submitted'` to the UPDATE (`:908-914`); on 0 rows re-read and answer 422 (submitted in between) or 404 |
| W6 | sync `survey.upsert` / `survey.visibility_update` | `surveys-sync.service.ts:71-82`, `:104-121` (-> W1/W2, W5) | - | per-op result `fatal_error`: `mapSyncError` keeps `code` and `details` only (`sync-error.utils.ts:64-104`, `details` at `:89-94`), so **W5's 422 must also carry `details: { survey_id, fields: ["visibility"] }`** or the sync result loses the field name (PATCH's `forbidden_fields` is dropped). `http_status` is 422 for visibility_update, 409 for upsert |
| W7 | `POST /surveys/:id/submit` | `surveys.controller.ts:89-92` -> `submitSurvey :1038-1192`; row lock `FOR UPDATE :1063-1067`; UPDATE `:1136-1143` | does not read or write visibility | no change. The lock makes submit and W1/W2 (locked upsert, `findOwned forUpdate :339-343`) serialise; W4/W5 must take the same lock (above) |
| W8 | Column default | `001_init.sql:19` (`DEFAULT 'private'`), CHECK `:33` | - | unchanged (D-03) |
| W9 | DTOs | `survey-upsert.dto.ts:44`, `survey-patch.dto.ts:23`, `survey-visibility-patch.dto.ts`, `sync-payloads.dto.ts` (`IsIn`) | enum | unchanged |

**Error code table to put in the contract (per channel):**

| Channel | Submitted row, different value | Same value |
|---------|--------------------------------|------------|
| `PATCH /surveys/:id` | 422 `submitted_read_only_fields` (key presence) | 422 (key present) |
| `PATCH /surveys/:id/visibility` | 422 `submitted_read_only_fields`, `forbidden_fields:["visibility"]`, `details.fields` | 200 no-op |
| `POST /surveys` / sync upsert, higher version | 409 `survey_submitted_read_only`, `details.fields` has `visibility` | synced (identical replay) |
| upsert, same version | 409 `sync_version_conflict` | synced |
| sync `visibility_update` | per-op `fatal_error`, `http_status 422`, `code submitted_read_only_fields`, `details.fields` | synced no-op |

**Flag for owner attention (small):** D-07 says "422 `submitted_read_only_fields`" for all three channels. The documented policy (`api-contract-v1.md:593-594`, `:1071`) keeps 409 for upsert replays and the mobile already maps both codes (`i18n/fr/sync-errors.ts:35-36`, `app/formatters.test.ts:58-59`, `sync.retry.sqlite.test.ts:377`). Following the existing policy changes no client code. Tests assert the table above.

**Race analysis.** Submit (W7) locks the row (`FOR UPDATE`). Safe today: fast-path update (status guard + xmin CAS), locked upserts (FOR UPDATE). Unsafe today and fixed above: W4 (`:722` no lock, UPDATE `:792` no status guard) and W5 (`:874`, `:908`). With the fix, "visibility change vs submit" has exactly two outcomes: change committed first (submit then publishes with the new value) or submit first (change refused 422). A deterministic test: open a transaction that holds `SELECT ... FOR UPDATE` on the row, fire the PATCH, then submit; or run submit and PATCH with `Promise.all` and assert `visibility` equals the PATCH value iff the PATCH answered 200.

## Section G: Migration (item 3)

Facts [VERIFIED: codebase]:
- Column: `visibility TEXT NOT NULL DEFAULT 'private'`, `CHECK (visibility IN ('private','public'))` (`001_init.sql:19,33`). Server default for absent value: `private` (`surveys.service.ts:134,376`). Mobile default: `private` (`storage/surveys.ts:48,68,95`, `storage/db.ts:84,262`, pull fallback `sync.ts:300,337,446`).
- Last migration: `023_survey_note_weather.sql`; next is **`024_<name>.sql`**. Runner `api/scripts/migrate.js`: lexical order, one `BEGIN; <file>; INSERT schema_migrations; COMMIT` per file, advisory lock key 7017015; no own BEGIN/COMMIT, no `CREATE INDEX CONCURRENTLY`, prefer `IF [NOT] EXISTS` (`api/migrations/README.md`). Never edit shipped files.
- Index history: 015 created `idx_surveys_public_submitted ON surveys (submitted_at DESC) WHERE status = 'submitted' AND visibility = 'public' AND deleted_at IS NULL`; 017 recreated it **without** the visibility clause for Phase 11. The new predicate adds `s.visibility = 'public'`; for the planner to use a partial index the index predicate must imply the query predicate, so the index must include `visibility = 'public'` again (a predicate-less index would still be usable for the old shape but the `visibility` filter would then be a heap filter on every candidate row, and the partial index on `status/deleted_at` would also be used by queries that no longer exist).
- Event table: `survey_events(id, survey_id, actor_id, event_type, payload, created_at)` plus `seq` (identity default) and `xid8` (default `pg_current_xact_id()`) from migration 014; events are inserted naming only `id, survey_id, actor_id, event_type, payload` (`survey-events.sql.ts`); no CHECK on `event_type` (comment in `019_no_submission_deadline.sql`). Precedent for data-fix events in a migration: 014's synthetic `backfilled` events.

**Recommended SQL shape** (`api/migrations/024_private_or_public_visibility.sql`):
```sql
-- Migration 024: private or public before submission (Phase 29, D-06).
-- Every survey submitted so far was visible to every member (Phase 11). Keep that: backfill them
-- to 'public'. Drafts keep their value. One 'backfilled' event per owned survey so the owner's
-- phone pulls the new value (GET /sync/changes returns the survey row for any event type).
-- Safe to run twice: the second run matches no row.
WITH backfilled AS (
  UPDATE surveys SET visibility = 'public'
  WHERE status = 'submitted' AND visibility <> 'public'
  RETURNING id, user_id
)
INSERT INTO survey_events (id, survey_id, actor_id, event_type, payload)
SELECT gen_random_uuid()::text, b.id, NULL, 'backfilled',
       jsonb_build_object('reason', 'migration_024', 'visibility', 'public')
FROM backfilled b
WHERE b.user_id IS NOT NULL;

-- The public read paths now filter on visibility again (reverts the 017 shape, same as 015).
DROP INDEX IF EXISTS idx_surveys_public_submitted;
CREATE INDEX IF NOT EXISTS idx_surveys_public_submitted
  ON surveys (submitted_at DESC)
  WHERE status = 'submitted' AND visibility = 'public' AND deleted_at IS NULL;
```
Notes: do not touch `updated_at` (the owner's list orders by it, `repository.ts` list query). Use `status = 'submitted'` (not `OR submitted_at IS NOT NULL`) because that is what the predicate reads; legacy `synced` rows never matched it. The event type is `backfilled` ("Données complétées" in the journal, `i18n/fr/survey-detail.ts:207`), not `visibility_changed`, because the owner did not make the change. Without the events the owners' phones keep `private` for already-submitted surveys (the pull applies a survey only when an event for it is newer than the cursor, `surveys-sync.service.ts:208-249`), so the new read-only line (M5) would say "Privé" for a survey everyone can see.

Tests for the migration: `api/test/migration-024-visibility-backfill.e2e-spec.ts`, copy the structure of `migration-023-survey-note-weather.e2e-spec.ts` (scratch schema `mig024_scratch`, apply 001-023, seed users/surveys: submitted private owned, submitted private anonymised (`user_id NULL`), submitted public, draft private, draft public, soft-deleted submitted; run the real runner for 024 only). Assert: submitted -> `public` (including anonymised), drafts untouched, one `backfilled` event for the owned ones only (none for `user_id NULL`), `pg_indexes.indexdef` for `idx_surveys_public_submitted` contains `visibility = 'public'` and `submitted_at DESC`, second run is a no-op (no extra events). Also update `migration-018-*.e2e-spec.ts` only if it hard-codes "last migration" (it pins 017 as the last *pre*-018 file at `:84`, unaffected).

**Explain harness.** `api/test/public-routes-explain.e2e-spec.ts` strips the clause from the legacy references with `dropVisibilityPredicate` (`:27-28`, used at `:88`, `:328`, `:358`, `:384`) because Phase 11 removed it. Remove those calls so the parity checks compare the legacy `visibility = 'public'` SQL (still in `explain-public-routes.js:65,137`) with the current queries again; the seed already marks 30 % of 10 000 surveys public (`explain-public-routes.js:195-212`, 2 000 public+submitted, asserted at `public-routes-explain.e2e-spec.ts:250-262`). The plan assertions `indexesUsed(plan)` containing `idx_surveys_public_submitted` (`:285`) and `seqScansOn(plan) == []` are the regression guard for the index recreation; run them (they are slow, `SLOW_TIMEOUT_MS`). `scripts/explain-public-routes.js` itself needs no change.

## Section M: Mobile (items 4 and 5)

### M1. Where visibility lives today
- Local column `local_surveys.visibility TEXT NOT NULL DEFAULT 'private'` (`storage/db.ts:83-87,262`) and `payload_json.visibility`; type `LocalSurvey.visibility` (`storage/types.ts:16`), payload field (`:116`), `UpdateDraftInput.visibility` (`:203`), queue kind `SurveyVisibilityQueuePayload` (`:149-153`), guard `isSurveyVisibilityQueuePayload` (`storage/utils.ts:240-251`), op type label `survey_visibility` (`:484`).
- Writers: `createLocalDraft` (`storage/surveys.ts:48,68,95`, always `private`); `updateLocalDraft` (`:477-480`: `input.visibility ?? basePayload.visibility ?? "private"`, and it forces `status: "draft"` at `:476`); `queueSurveyVisibilityChange` (`sync.ts:681-797`: **no status guard**, rewrites pending upserts' visibility in place without a version bump `:726-739`, else queues one `survey_visibility_update` `:754-766`, deletes stale visibility ops `:750-752`); `updateSurveyVisibility` (`:1405-1462`, empty token = queue only); pull apply (`sync.ts:294-346`, falls back to `private`; never overwrites a row with a pending queue or `sync_blocked`, `:316`).
- Hooks: `handleToggleVisibility` (`hooks/survey-sync/useSurveySyncSurveyOperations.ts:370-422`, exposed as `actions.toggleVisibility`, `state/surveys-context.ts:65`, `AppStateProvider.tsx:248`) is **dead UI plumbing** (only tests call it). Its messages say "public" (`i18n/fr/status/survey-ops.ts:12-15,98-118`): that contradicts D-02 and must be reworded or deleted.

### M2. Where the submission step is, and the seam to add
There is no confirmation. Two entry points call the same finish with one tap:
1. Summary: `FinishBar` (`screens/survey-detail/FinishBar.tsx:29-57`) -> `SurveyDetailScreen.tsx:343-349` `onFinish={() => onSubmitSurvey(id)}` -> `SurveyDetailRoute.tsx:70` `onSubmitSurvey={actions.submitSurvey}`.
2. Factor pager pill: `FactorDetailRoute.tsx:89-109` -> `usePagerFinish.ts:51-92` (`flushDraft()` then `submitSurvey`).
Both end in `handleSubmitSurvey` (`useSurveySyncSurveyOperations.ts:327-338`) -> `finishSurvey` (`:~190-322`: name check, readiness, `submitPostponed` when offline `:232-235`, `sendPendingChangesBeforeFinish :238`, then `submitSurvey :275`).

**Recommended seam:** a new stack screen `surveyFinish` (native form sheet iOS / modal Android) registered next to `surveyFactorHelp` (`SurveysStack.tsx:193-197`, route type in `navigation/types.ts`, options helper beside `factorHelpScreenOptions`, `stack-options.ts:143-151`). Both entry points `navigate("surveyFinish")` instead of finishing directly. The sheet shows the title, `VisibilityPicker` (initial value = the survey's stored `visibility` from `useSurveys`, D-05), the one-line consequence ("Ce choix ne pourra plus être modifié une fois le relevé terminé"), and a confirm `GlassButton`/`AppButton`. Confirm does, in order: (a) `flushDraft()` when a pager edit is active (`useSurveyFormState().actions.flushDraft` returns `true` when nothing is being edited, `useEditingDraft.ts:344-348`), (b) a **queue-only** visibility write (`updateSurveyVisibility(apiUrl, "", id, choice)`, no sync, no status noise) skipped when equal, (c) `actions.submitSurvey(id)` (which drains the queue, then submits), (d) closes itself; success is still "status becomes submitted" (`useSubmitSuccessPulse.ts`, `usePagerFinish.ts:67-71`). The pager's `onFinished` (`popTo("surveyDetail")`) keeps working because it keys on status.
Offline: `finishSurvey` answers `submitPostponed` (`:232-235`) and does not submit; the choice is already stored on the draft (D-05), the sheet reopens with it on the next "Terminer".
Cap: `SurveyDetailScreen.tsx` is 367 lines (cap 400, `__checks__/structure.test.ts`): net change there must be <= 33 lines; put new code in new files. `SurveysStack.tsx` 250, `navigation/types.ts` 148.

### M3. Defects that must be fixed in the same phase (or the choice is lost)
1. **Stale visibility overwrite.** Every draft write passes `visibility` from React state: autosave `useEditingDraft.ts:125,171-174,185,358-362` (`editingSurveyVisibility`, derived in `AppStateProvider.tsx:77-83` with `?? "private"`), `handleCreateDraft :252`, `handleSaveSurveyEdits :321`, `useSurveyDraftPatcher.ts:153`. `updateLocalDraft` writes it (`storage/surveys.ts:477-480`). A pending 900 ms autosave captured before the sheet's choice would write the old value back. Fix: stop passing `visibility` from all five call sites (and delete `editingSurveyVisibility`, the `PendingAutosaveRequest.visibility` field, and `UpdateDraftInput.visibility`); `updateLocalDraft` then keeps the stored value (`input.visibility ?? basePayload.visibility`, already how it behaves when absent). Only the sheet and `queueSurveyVisibilityChange` own the field.
2. **Default.** `createLocalDraft` (`:48,68,95`) -> `"public"`; keep the coercion fallbacks that read a row (`:334,460,509,564,602`, `sync.ts:300,337,446`) fail-closed to `private` for unknown values. The SQLite column default may stay (inserts always name the column); no schema bump (D-14).
3. **Post-submit queueing.** `queueSurveyVisibilityChange` must return `{changed:false}` (or throw) when the local row's `status === 'submitted'`; today it would queue an op the server now refuses. A refusal on the client path: `handleSurveySyncFailure` deletes the queue row and marks the survey `sync_blocked = 1` with the error code while keeping `status = 'submitted'` (`sync.ts:524-575`), and a blocked row is never refreshed by the pull (`:316`). Defence in depth: treat `submitted_read_only_fields` / `survey_submitted_read_only` on a `survey_visibility` op as benign (drop the op, clear the flag, schedule a canonical detail load). Optional; the guard above prevents the case.
4. **History taps.** `SurveyHistoryRoute.tsx:20-23` always `navigate("communitySurvey")`; with D-10 the owner's own *private* surveys appear in that list and the community detail 404s for them. Route ids the phone holds to the owner's detail exactly as `PublicMapRoute.tsx:85-95` does (`localIds` -> `openSurvey` + `navigate("surveys", {screen:"surveyDetail"})`).
5. **Pre-existing local drafts.** Drafts created before this phase hold `private` locally and server-side; the sheet would pre-select "Privé" for them, contradicting D-04's "pre-selected shared". Options in Open Questions (Q2).

### M4. Catalogue (`mobile/src/i18n/fr/`)
Modules are one file per area, composed in `i18n/fr/index.ts`; texts must be in the catalogue (structure gate `findUserFacingLiterals`), no U+2014 anywhere under `mobile/src` (`__checks__/catalogue-dash.test.ts`), abbreviations limited to units/OK/PDF/GPS/IBP/"ex." (`__checks__/abbreviations.test.ts`), Ionicons outline glyphs only (`__checks__/icons.test.ts`; e.g. `lock-closed-outline`, `people-outline`). Existing reusable keys: `fr.surveyForm.wizard.optionA11y` (`survey-form.ts:10`), `fr.surveyDetail.cta.finish` ("Terminer le relevé", `survey-detail.ts:58-59`), `a11y.finishSurvey` (`:246`). Suggested new strings (planner finalises, owner validates at the UI gate; no em dash, no "public"):
- labels: `private: "Privé"`, `shared: "Partagé avec l'association"`
- captions (one line each): shared "Les membres de l'association peuvent le consulter."; private "Vous seul le voyez. Les autres membres ne savent pas qu'il existe."
- sheet: title "Qui peut voir ce relevé ?", footnote "Ce choix ne pourra plus être modifié une fois le relevé terminé."
- owner read-only row: label "Visibilité", values as the labels.
Replace/delete the dead status words `surveyOps.visibility` ("privé"/"public", `survey-ops.ts:12-15`) and the `visibility*` messages (`:98-118`) if `handleToggleVisibility` is removed, otherwise reword to "partagé avec l'association".

### M5. How the owner sees it afterwards (D-15) and what else needs nothing (D-16, D-17)
- Add a non-pressable first row "Visibilité" to the summary rows (`screens/survey-detail/summary-rows.ts:18-69`, `AppGroupedList` section, value from `selectedSurvey.visibility` of the local row, so it works offline). Alternative: append to the status line (`summary-state.ts:23-37`). A draft may show the same row (it tells the observer the default). `DebugTab` already reads `selectedSurvey.visibility` (`SurveyDetailScreen.tsx:335-337`).
- List rows (`screens/survey-list/`): nothing required.
- `visibilityFilter` (`app/types.ts:89,124`, `app/survey-logic.ts:146`, `hooks/useSurveyList.ts:59,91,104,128,159-160`, `state/surveys-context.ts:33,53`, `AppStateProvider.tsx:236,278,296,319`): no screen reads or sets it since the list rewrite (`e880728d`, and `19-VALIDATION.md:29`); there is no UI home (Mes Relevés has two sections). **Recommend removing it** (type, state, context fields, filter line, and the tests in `survey-logic.test.ts`, `useSurveyList.test.ts`, `routes.test.tsx`, `useSurveySync.test.ts`). The other dead filters in `filterAndSortSurveys` are out of scope.
- Explorer/search: no change. The Explorer already draws the author's own local surveys (draft or submitted) from `local_surveys` (`map/own-surveys.ts` header, `hooks/useLocalSurveyMapData.ts`), skipping ids the API already returned, so an owner's private survey keeps its marker on their own map. Server-coloured parcel polygons ("studied"), parcel selection and nearby-parcel statuses come from `/public/parcels/status` and will show the owner's private-only parcels as not studied (see Q1).
- PDF export (D-17): `app/survey-pdf/*` has no visibility reference; the trend reads the cached `GET /parcels/:id/surveys/history`. Nothing to do; do not print the state.
- `Contexte`/other pages: nothing.

## Section D: Docs to change (item 7)
Do not edit now; the plan lists these.
- `docs/technical/publication-visibility-post-submit-v1.md`: header banner (`:3-6` "Deferred") -> "Superseded for the post-submit rule by Phase 29"; rules `:21-26` (default `private`, "editable: visibility only" after submit), `:33-37`, `:54-65` (acceptance 2, 6, UI 2).
- `docs/technical/api-contract-v1.md`: `:300,487,511,565` examples; `:380-384` ("Visibility" bullet: others read a note only on a *shared* submitted survey); `:400-412` (resend refreshes `visibility`, B2 text) and `:1071-1072`; `:556-558` lifecycle ("only publication visibility changes are allowed" -> none); `:592-594` error policy; `:596-624` `PATCH /surveys/{id}/visibility` (draft only, 422 after submit, equal value 200); `:1048`; `:1226-1232` map inclusion rules (already say `visibility = public`, now true again); `:1307-1308` community list ("There is no private/public choice yet" -> shared only); parcel history route section (own + shared); add D-11 note (next version counts private surveys; the number leaks, no content); error codes `:1807-1813`.
- `docs/technical/data-contract-v1.md`: `:51`, `:284` (index definition, true again after 024), `:315` (default), `:322-324` (rules 322 "may still change visibility" and 324 "Switching public -> private removes it" are replaced by read-only after submit).
- `docs/technical/sync-conflict-resolution-v1.md`: `:27` (visibility compared separately), `:31-33` Case B2 (draft only; submitted -> `sync_version_conflict`), `:38` and the submitted rule (visibility joins the read-only fields, `survey_submitted_read_only`).
- `docs/technical/technical-architecture-v1.md:151` ("Only surveys with `visibility=public`..." true again; add the history/owner exception), `:208`.
- `docs/specs/epic-c-ibp-survey-data-entry.md:132-146` (US-C7: default `private` -> shared pre-selected; "change later from survey detail" -> frozen at submit; "authorized moderators/admins" -> no moderator read path exists, defer to V3), `docs/specs/epic-b-survey-preparation.md:55-61` (US-B3), `docs/specs/user-stories.md:37,79`, `docs/specs/ibp-form-spec.md:85-90,483-489,546,581,658`.
- `.planning/REQUIREMENTS.md`: `:49` (REQ-B-manage-published scope note), `:182` (REQ-X-visibility override row), `:212`, `:235`; ROADMAP Phase 29 block (`Depends on`, `Requirements`, `Plans`) and the "no per-user private/public choice" sentence at `:18` and `:624` (done last, with STATE.md).
- `CLAUDE.md`: **there is no line saying "no private/public state this milestone"** [VERIFIED: grep]. The stale statements are in code comments and docs: `api/src/surveys/public-map.queries.ts:4-8,268-272`, `community-surveys.service.ts:62-66`, `packages/ibp-domain/src/contract/public-map.ts:37`, `contract/survey.ts:10` ("on the public map"), and the test file headers listed in section V. CLAUDE.md should gain: a "Survey visibility" bullet in the API section next to `:252` (predicate is the only definition, history is caller-aware, version numbers count private surveys), a mobile line in the Survey-detail/finish description (`:203`), the new suites in `:351`, and `024_...` in the migrations row `:321`.
- `packages/ibp-domain/src/contract/survey.ts:10-11`, `public-map.ts:37`: doc comments only. No type change (the union already exists), no IBP rule, no new export. Coverage thresholds (100 %) are unaffected by comments.

## Common Pitfalls

### Pitfall 1: Fixtures that submit as `private` and expect other members to read them
**What goes wrong:** after the predicate change the suites that create with `visibility: "private"` (the helper default everywhere) then read as another user fail, and the ones that "publish" with `PATCH /visibility` after submit now get 422.
**How to avoid:** list in section V. Fixtures that need cross-member visibility create with `visibility: "public"` in the upsert before submit. Add a default-public helper in `api/test/helpers/surveys-e2e.ts` rather than editing every literal.
**Warning signs:** `community-surveys`, `community-survey-detail`, `search`, `public-map-*` suites red.

### Pitfall 2: Stale visibility re-written by autosave (M3.1) / owner's phone still "Privé" after backfill (Migration)
Detect with the sqlite tests in V.5.

### Pitfall 3: 403 vs 404 and counts as oracles
Reports (R18) answer 403 for a private survey of another member and 404 for an unknown id. Search member counts and parcel survey counts count shared surveys only (R10, R11). `next_version` and `parcel_version_conflict.expected_version_number` still reveal "a survey exists" by number (accepted, D-11). Community detail/attachments answer the identical `404 "Survey not found"` for private, draft, deleted and unknown ids (R3-R6): keep it identical (test compares bodies).

### Pitfall 4: The idempotent replay must not become an error
A queued `visibility_update` or an upsert replay whose value equals the stored one must stay `synced` (W3/W5 equal-value rule), or a lost response turns into `sync_blocked` on the phone.

### Pitfall 5: Index regression
If the migration forgets to recreate the index, the new filter silently becomes a heap filter; the explain spec is the guard (Migration).

### Pitfall 6: Account deletion
Retained surveys keep `visibility` (`users.service.ts:292-297`). A retained private survey has `user_id NULL` and `visibility 'private'`: hidden for everyone, including from the history owner clause (no caller matches NULL, and `s.user_id = $caller` with a NULL column is not true). Make sure the history SQL uses `=`, never `IS NOT DISTINCT FROM`.

## Code Examples

### D-07 helper (service layer)
```ts
// surveys.service.ts (shape): one place that throws, used by W4 and W5
private assertVisibilityWritable(existing: Pick<SurveyRow, "status" | "id">): void {
  if (existing.status === "submitted") {
    throw new UnprocessableEntityException({
      code: "submitted_read_only_fields",
      message: "submitted survey visibility is read-only",
      forbidden_fields: ["visibility"],
      details: { survey_id: existing.id, fields: ["visibility"] }, // survives mapSyncError
    })
  }
}
```
W1/W2 reuse `getChangedSubmittedReadOnlyFields` (add after the loop, `surveys-normalize.utils.ts:294`):
```ts
if (existing.status === "submitted" && body.visibility !== undefined && body.visibility !== null
    && body.visibility !== existing.visibility) {
  changed.push("visibility")
}
```

### Guarantee test skeleton (two users, one parcel)
```ts
// api/test/private-visibility.e2e-spec.ts (shape). Helper: createSubmitted(token, {visibility}) =
// resolveParcel + POST /v1/surveys {visibility} + POST /submit (see community-surveys.e2e-spec.ts:42-70)
for (const route of READ_ROUTES) {           // map-items, parcels/status, community list/detail/attachments(3),
  it(`${route.name}: A's private survey is absent for B, A's shared one is present`, ...)
}                                             // search community/members, search parcels, parcel history
```

## State of the Art

| Old approach (this repo) | Current approach | When | Impact |
|--------------------------|------------------|------|--------|
| Spec 2026-03: default `private`, editable after submit, moderators see private | Shared by default, read-only after submit, no moderator read path | Phase 29 (D-04, D-07) | Specs and `publication-visibility-post-submit-v1.md` superseded |
| Phase 11: "every submitted survey visible to every member", index 017 without visibility | Predicate with `visibility = 'public'`, index 015 shape again (024) | Phase 29 | tests encoding "private is visible" are rewritten |

## Runtime State Inventory

Not a rename phase, but the backfill touches stored state; explicit answers:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Postgres `surveys.visibility = 'private'` on every submitted survey; SQLite `local_surveys.visibility` and `payload_json.visibility` on every phone (`private` default) | server: migration 024 (data migration); phone: pulled via `backfilled` events (no SQLite migration) |
| Live service config | None (no external service stores visibility) | none - verified by grep of `api/src` and `infra/` |
| OS-registered state | None | none |
| Secrets/env vars | None | none |
| Build artifacts | `packages/ibp-domain/dist` is rebuilt by `npm run build:domain` (Node runtime only); doc-comment edit needs no rebuild for tests (Jest/Metro/tsc read `src`) | none |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Prod/dev data is test data only, so backfilling without counting and two-step deploy is acceptable | Migration | none beyond D-06 (owner stated it) |
| A2 | A native form sheet is an acceptable "submission step" for the owner (vs inline block on the summary) | M2 | UI gate rework; the data flow is identical |
| A3 | Owner accepts that his own private-only parcels show "not studied" in server-coloured parcel layers, parcel selection and nearby statuses | Q1 | D-09/D-11 would need caller-aware variants for those routes |
| A4 | No moderator/admin read path to private surveys is needed now (none exists: `GET /reports` returns report rows only) | Docs | US-C7 wording stays inconsistent |
| A5 | Absent `visibility` on an API create stays `private` (fail-closed) | W3 | a non-mobile client that omits it creates hidden surveys |

## Open Questions

1. **Q1 - Owner's own private survey on server-driven layers.** D-09/D-11 make `/public/map-items` and `/public/parcels/status` caller-blind, so the owner's private-only parcels look "not studied" in the polygon coloring, parcel selection and nearby statuses; only the markers survive through the local overlay. Recommendation: accept (consistent with D-11 "in every count and status"). Otherwise a caller-aware variant is needed on 3 routes and in the explain harness.
2. **Q2 - Pre-existing drafts.** They hold `private` locally and on the server and will open the sheet on "Privé", against D-04's "pre-selected shared". Options: accept (test data), or a one-off local `UPDATE local_surveys SET visibility='public' WHERE status<>'submitted'` guarded by a `local_meta` key (no schema bump, but touches D-14's "no SQLite migration" spirit) plus the same on the server in 024. Recommendation: accept; mention in the UI gate checklist.
3. **Q3 - Error codes.** Confirm "existing policy per channel" (table in section W) rather than a blanket 422.
4. **Q4 - Reports.** Confirm 404 (not 403) for a non-visible survey and the `status='submitted'` requirement (changes an existing e2e expectation).
5. **Q5 - `visibilityFilter`.** Confirm removal (recommended).
6. **Q6 - Sheet vs summary.** Whether the observer should also see the current choice on the draft summary (read-only row on drafts); recommended, optional.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | all tests | yes | v22.22.3 [VERIFIED: node --version] | - |
| PostgreSQL | API e2e, migration test, explain harness | yes, running locally (Homebrew), role `ibp`, databases `ibp` and `ibp_test` present [VERIFIED: psql -l] | 16.13 | Docker Compose (`infra/docker-compose.yml`) may not start on this Mac (memory note); Homebrew path above works |
| `node_modules` in this worktree | all | yes | - | `npm install` |
| Docker | optional | not probed | - | not required |
| Device (owner iPhone) | UI gate | n/a here | - | manual, section V |

Do not run the e2e suites concurrently from two sessions: the e2e `globalSetup` drops and re-migrates `ibp_test` before each run and refuses any other database name (CLAUDE.md, Testing). I did not run any test in this session.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| API unit | Jest 29 + ts-jest, `api/jest.unit.config.js`, `*.spec.ts`, ignores `*.e2e-spec.ts` |
| API e2e | Jest 29 + Supertest, `api/jest.config.js`, `*.e2e-spec.ts`, `globalSetup` migrates `ibp_test` (env `api/.env.test.example`) |
| Mobile | Jest 29 + ts-jest, `mobile/jest.unit.config.js`, `*.test.ts(x)`, mocks in `mobile/test/` (`expo-sqlite.mock.ts` + `node-sqlite-db.ts` for `*.sqlite.test.ts`) |
| Shared package | `packages/ibp-domain/jest.config.js` (100 % thresholds); doc-comment change only |
| Quick run | `npm --workspace api run test:unit -- <pattern>`; `npm --workspace api run test:e2e -- <file>`; `npm --workspace mobile run test:unit -- <pattern>` |
| Full suite | `npm run lint && npm run typecheck && npm run test:unit && npm run test:e2e && npm run format:check` |

### Phase Requirements -> Test Map

| Req / Decision | Behavior | Layer | Automated command | File | Exists? |
|----------------|----------|-------|-------------------|------|---------|
| SC1 / C1,C2 / D-04,D-05 | picker shows both options, default shared, selection stored, survives reopen; finish calls visibility then submit in order | mobile unit | `npm --workspace mobile run test:unit -- VisibilityPicker FinishSheet useSurveySyncSurveyOperations` | `ui/VisibilityPicker.test.tsx` (model `CasPicker.test.tsx`), `screens/FinishSheet.test.tsx`, `useSurveySyncSurveyOperations.test.ts` | Wave 0 |
| D-05 | new draft defaults `public`; autosave never rewrites visibility; sheet choice survives a pending autosave | mobile sqlite/hook | `npm --workspace mobile run test:unit -- surveys.transactions useEditingDraft` | `storage/surveys.*.sqlite.test.ts`, `hooks/useEditingDraft.test.ts`, `useEditingDraft.autosave.test.ts` | rewrite/extend |
| SC1 / C3 / D-07 | PATCH /visibility on submitted -> 422 `submitted_read_only_fields`; equal value 200; draft change 200 + event | API e2e | `npm --workspace api run test:e2e -- surveys-visibility` | `surveys-visibility.e2e-spec.ts` | rewrite (`:34-98` currently asserts the opposite) |
| D-07 | PATCH /surveys/:id with `visibility` on submitted -> 422 | API e2e | `... -- surveys-submit` | `surveys-submit.e2e-spec.ts` (`:181`) | extend |
| D-07 | upsert higher version -> 409 `survey_submitted_read_only` fields `visibility`; same version -> 409 `sync_version_conflict`; identical replay synced; draft same-version visibility_only still applied | API e2e | `... -- surveys-same-version surveys-idempotency sync-installed-app-compat` | same files | extend (`surveys-same-version` cases 3/3b/3c/3d stay for drafts) |
| D-07 | sync `visibility_update` after submit -> per-op `fatal_error` 422 with `details.fields` | API e2e + unit | `... -- sync-installed-app-compat`; `test:unit -- surveys-sync.service` | `sync-installed-app-compat.e2e-spec.ts`, `surveys-sync.service.spec.ts` | extend |
| D-07 | submit vs PATCH race: outcome is consistent | API e2e | `... -- surveys-transactions` or new | new case | Wave 0 |
| D-07 | helper/classifier units: `getSubmittedReadOnlyFields`, `getChangedSubmittedReadOnlyFields`, `classifySameVersionContent` | API unit | `npm --workspace api run test:unit -- surveys-normalize` | `surveys-normalize.utils.spec.ts` (`:696-715` use a *submitted* `makeRow`, will flip to `conflict`; keep a draft row case for `visibility_only`) | rewrite |
| SC2 / C4 / D-09 | predicate text contains `visibility = 'public'`; every query builder embeds it | API unit | `... test:unit -- search.queries public-map.service community-surveys.service` | existing specs assert `toContain(PUBLIC_SURVEY_PREDICATE)` | extend (assert the literal too) |
| SC2 / D-10 | history: own private visible to owner, others' private hidden, others' shared visible; unauthenticated 401 | API e2e + unit | `... -- parcel-history`; `test:unit -- parcels.service` | `parcel-history.e2e-spec.ts` (single user today), `parcels.service.spec.ts` | extend |
| SC2 / D-11 | parcel with only private surveys is `not_studied` for B; B's `next_version` still counts it; counts in search | API e2e | new suite | `private-visibility.e2e-spec.ts` | Wave 0 |
| D-12 | per-route matrix R1-R11: A private absent for B, present for A where an owner view exists, shared present for both; direct id/attachment/download-url/content by B -> 404 with the same body as unknown id; owner routes 404 for B | API e2e | `npm --workspace api run test:e2e -- private-visibility` | new | Wave 0 |
| D-12 | route enumeration: snapshot of controller routes in `public`, `search`, `parcels`, `surveys`, `sync`, `reports` + scan of `api/src/**/*.ts` for `(FROM|JOIN) surveys` requiring either `PUBLIC_SURVEY_PREDICATE`, the caller-aware sibling, or an allowlisted owner-scoped file with a reason (stale allowlist entries fail) | API unit (no DB) | `npm --workspace api run test:unit -- survey-read-paths` | `api/test/survey-read-paths.spec.ts` | Wave 0 (a spec, not e2e: runs in CI `unit-api` without a DB) |
| D-13 | account deletion keeps a private survey hidden, shared one visible with `author_name` null | API e2e | `... -- community-survey-detail` (existing deletion case `:288-326`) | extend | extend |
| SC3 / C5 / D-06 | backfill, events, index definition, idempotence | API e2e | `... -- migration-024` | `migration-024-visibility-backfill.e2e-spec.ts` | Wave 0 |
| D-06 | index used, no seq scan, same rows as legacy `visibility = 'public'` queries | API e2e (slow) | `... -- public-routes-explain` | `public-routes-explain.e2e-spec.ts` | edit (drop `dropVisibilityPredicate`) |
| existing-test rewrites | create with `visibility: "public"` or stop publishing via PATCH | API e2e | `... -- public-map-items public-map-bbox public-map-method-version community-surveys community-survey-detail search epic-e-search-reports` | those files | rewrite (list below) |
| R18 | report on non-visible survey -> 404; draft -> 404 | API e2e | `... -- epic-e-search-reports` | `epic-e-search-reports.e2e-spec.ts:252-256,334-339` | rewrite |
| C6 / D-02 | catalogue strings pinned, no "public", no em dash, no abbreviation | mobile unit + gates | `npm --workspace mobile run test:unit -- catalogue-dash abbreviations catalogue-additions-29` | `__checks__/*`, new `i18n/fr/catalogue-additions-29.test.ts` | Wave 0 (gates exist) |
| C7 / D-15 | read-only "Visibilité" row for a submitted survey, both values | mobile unit | `... -- summary-rows SurveyDetailScreen` | `screens/survey-detail/summary-rows` test (new), `SurveyDetailScreen.test.tsx` | extend |
| M3.4 | tap on an own survey in the parcel history opens the owner detail | mobile route test | `... -- routes` | `navigation/routes/routes.test.tsx` (2 523 lines; add a small new file instead) | Wave 0 |
| D-14 | `queueSurveyVisibilityChange` refuses a submitted row; pull applies a `backfilled` event's visibility; read-only code on a visibility op does not leave `sync_blocked` (if implemented) | mobile sqlite | `... -- sync.engine sync.pull sync.retry` | `storage/sync.*.sqlite.test.ts` | extend |
| structure | 400-line cap (`src/screens`, `src/navigation`), icons outline, motion rules | source gates | `npm --workspace mobile run test:unit -- structure icons motion` | `__checks__/` | exists |
| D-16/D-17 | search/Explorer/PDF unchanged | existing suites | `npm run test:unit` | `global-search`, `survey-pdf` tests | green, no edit |

**Existing tests that currently encode "private is visible to all" or "publish after submit" and must be rewritten** (all [VERIFIED: grep]):
- `public-map-items.e2e-spec.ts` (`:45-160` "exposes every submitted survey ... regardless of visibility"; the `PATCH /visibility` at `:94` after submit; `:161-205` private parcel is "studied")
- `public-map-method-version.e2e-spec.ts` (`:98-114` publishes through PATCH after submit; `:187-190`, `:222`, `:256-261` expect the private survey/parcel visible)
- `public-map-bbox.e2e-spec.ts` (`:154-214` inserts `private` and expects it inside the box)
- `community-surveys.e2e-spec.ts` (`:56`), `community-survey-detail.e2e-spec.ts` (`:50`, `:185`), `search.e2e-spec.ts` (`:103`): the fixture helpers create `private`; make them create `public` and add explicit private cases
- `epic-e-search-reports.e2e-spec.ts` (`:252-256`, `:334-339` expect 403)
- `surveys-visibility.e2e-spec.ts` (`:34-98`)
- `surveys-normalize.utils.spec.ts` (`:696-715`)
- `public-routes-explain.e2e-spec.ts` (`dropVisibilityPredicate`)
- comments/headers to fix: `public-map-items.e2e-spec.ts:18-19`, `public-map-bbox.e2e-spec.ts:23-24`, `community-surveys.e2e-spec.ts:16`, `community-survey-detail.e2e-spec.ts:16`
Unaffected (verified): `attachments-download` (owner-only 404 already asserted `:141`), `parcel-history` (single user), `surveys-same-version` 3/3b/3c/3d (drafts), `sync-changes-ordering`, `sync-query-budget`, `list-pagination`, `safe-ids`, `surveys-idempotency` drafts.

### Sampling Rate
- **Per task commit:** the targeted `-- <pattern>` command of that task (API unit < 30 s; one e2e file ~ 10-60 s; mobile pattern ~ 10-40 s).
- **Per wave merge:** `npm run lint && npm run typecheck && npm run test:unit` plus the e2e files touched.
- **Phase gate:** full `npm run test` (unit + e2e on `ibp_test`), `npm run format:check`, then manual checks.

### Wave 0 Gaps
- [ ] `api/test/private-visibility.e2e-spec.ts` (guarantee matrix, D-11, D-12, D-13)
- [ ] `api/test/survey-read-paths.spec.ts` (route enumeration + SQL scan)
- [ ] `api/test/migration-024-visibility-backfill.e2e-spec.ts`
- [ ] helper `createSharedSurvey`/`visibility` option in `api/test/helpers/surveys-e2e.ts`
- [ ] `mobile/src/ui/VisibilityPicker.test.tsx`, `FinishSheet` test, `catalogue-additions-29.test.ts`, route test for the own-survey history tap
- Framework install: none.

### Manual / device checks (cannot be automated)
1. Owner iPhone: open "Terminer le relevé" from the summary and from the factor pager; the form sheet detents and grabber, both options readable in light and dark, VoiceOver reads "Privé. Vous seul le voyez..." as a radio group, default is "Partagé avec l'association"; confirm submits; the summary shows the read-only row. Wording validated by the owner (D-02 "exact strings validated at the UI gate").
2. Airplane mode: choose "Privé", tap finish -> postponed message; reopen the sheet -> still "Privé"; back online finish -> survey is hidden from a second account (use the second account on the simulator/another device).
3. After deploying 024 to a dev backend: an old submitted survey shows "Partagé avec l'association" on the phone after one pull.
4. A second user cannot find the private survey in Explorer, search, parcel history, community page (smoke of the e2e matrix on real data).
Record in `docs/user-tests/device-checks.md` (existing file per ROADMAP Phase 28).

## Security Domain

Applicable: `security_enforcement` not disabled in `.planning/config.json` (only `_auto_chain_active` present). [VERIFIED: codebase]

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no change | Auth0 JWT `AuthGuard` already on all controllers |
| V3 Session Management | no | - |
| V4 Access Control | **yes (core)** | SQL predicate on every cross-member read; ownership lookup `findOwned` for owner routes; row lock for state change |
| V5 Input Validation | yes | existing enum DTOs; no new input |
| V6 Cryptography | no | presigned URLs unchanged |
| V8 Data Protection | yes | private surveys never serialised to other users; `Cache-Control: private` already on content routes |
| V13 API | yes | uniform 404 for hidden resources; per-op sync error carries code and fields only |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on survey/attachment ids (community routes) | Information disclosure | `assertPublicSurvey` + predicate, identical 404 body for hidden/unknown/draft/deleted |
| Existence oracle (403 vs 404, counts, `next_version`, `expected_version_number`, search member counts, parcel ordering) | Information disclosure | reports -> 404; counts/ordering via the predicate; the version number is the single accepted leak (D-11), documented |
| TOCTOU between submit and a visibility write | Tampering | `FOR UPDATE` on the lookup + `AND status <> 'submitted'` in the UPDATE (W4, W5) |
| Mass assignment of `visibility` through `PATCH /surveys/:id` | Tampering | add to the read-only key list |
| Presigned URL outliving a privatisation | Information disclosure | not possible: visibility is frozen at submit and URLs are only issued for shared surveys |
| Retained anonymised survey re-exposed | Information disclosure | account deletion leaves `visibility`; backfill only touches `status = 'submitted'` rows that were already visible (D-06 rationale) |
| Drafts reportable/enumerable by id | Information disclosure | require `status = 'submitted'` for non-moderators in reports |

## Suggested plan decomposition (for the planner; sizes are guidance)

1. **API core (wave 1):** migration 024 + migration test; predicate constant + caller-aware sibling; history route takes the caller; reports 404; contract doc comments; rewrite the 8 API suites; explain harness edit.
2. **API write enforcement (wave 1, parallel with 1 after the predicate lands or in the same plan):** W1-W6 helper changes, lock/guard, error table, unit + e2e (incl. race), sync per-op details.
3. **Guarantee suite (wave 2):** `private-visibility.e2e-spec.ts` + `survey-read-paths.spec.ts` + account-deletion case.
4. **Mobile data layer (wave 1, independent of API):** drafts default `public`, remove `visibility` from the draft write path, post-submit guard in `queueSurveyVisibilityChange`, optional benign-drop, remove `visibilityFilter`, history tap routing, status words.
5. **Mobile UI (wave 2, after 4):** `VisibilityPicker`, `surveyFinish` sheet route, both entry points, catalogue, read-only row, tests, structure gates.
6. **Docs + device gate (last):** docs list above, CLAUDE.md additions, REQUIREMENTS rows, then ROADMAP/STATE (D-01 correction) as the very last commit.

## Sources

### Primary (HIGH confidence, this repository)
- `api/src/surveys/*.ts`, `api/src/reports/reports.service.ts`, `api/src/users/users.service.ts`, `api/migrations/001,008,014,015,017,019`, `api/scripts/*`, `api/test/*` (cited inline)
- `mobile/src/storage/*`, `hooks/*`, `navigation/*`, `screens/*`, `ui/*`, `i18n/fr/*`, `map/own-surveys.ts`, `__checks__/*` (cited inline)
- `packages/ibp-domain/src/contract/{survey,sync,public-map}.ts`
- `.planning/phases/11-association-only-sharing-scope-trim/11-01-SUMMARY.md`, `11-03-SUMMARY.md`, `11-CONTEXT.md`; `git show aff524f6` (Phase 11 removal of the toggle: `DetailActions` button with `lock-closed-outline`/`globe-outline`, header chip, `onToggleVisibility` prop)
- `docs/technical/*`, `docs/specs/*` (cited inline), `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`

### Secondary / Tertiary
- none (no web source used; not needed for a brownfield change)

## Metadata

**Confidence breakdown:**
- Read-path inventory: HIGH - every query site found by grepping `FROM|JOIN surveys` across `api/src` and read.
- Write paths and error codes: HIGH - read in full; the race analysis is by code inspection, to be proven by the planned test.
- Migration SQL: HIGH for shape, MEDIUM until run against `ibp_test` (not executed in this session).
- Mobile seam (finish sheet): MEDIUM - recommended design, depends on owner UI approval (A2).
- Docs list: HIGH.

**Research date:** 2026-10-13
**Valid until:** until Phase 29 plans are written, or any change to `public-map.queries.ts`, `surveys.service.ts` or the finish flow lands first (check `git log` on those files).
