# Phase 29: Private or Public Before Submission - Context

**Gathered:** 2026-10-13
**Status:** Ready for planning

<domain>
## Phase Boundary

The observer chooses, before submitting, whether a survey is **private** (only them) or **shared with the association** (every authenticated member). The choice is stored, synced, and read-only after submit. A private survey never reaches another member through any read path (map, parcel statuses, parcel history, community search, community lists and detail, attachments), enforced on the server with API tests. The toggle removed in Phase 11 returns with the right wording. Closes `REQ-C-privacy-choice`.

Not in scope: invitations or closed sign-up (Phase 36), moderation, sharing with named people, changing visibility after submit.

</domain>

<decisions>
## Implementation Decisions

### Dependency (resolved at the start of the discussion)
- **D-01:** The ROADMAP line "Depends on: Phases 11 and 36 (closed accounts)" is wrong. Phase 11 (D-02) already defined "association member = any authenticated user"; private vs shared only decides whether a survey is visible to the owner alone or to every authenticated user, which is independent of who may hold an account. Phase 36 only narrows who can authenticate. So Phase 29 does **not** depend on 36: the dependency becomes "Phase 11". The ROADMAP is corrected at the end of the phase (STATE.md and ROADMAP.md are touched last, to avoid tracking conflicts with other sessions). No question for the owner is needed.

### Meaning and wording
- **D-02:** Two values, the existing `private | public` column and wire type (`SurveyVisibility` in `@cortege/ibp-domain` contract). "public" in code means "shared with the association", never the open internet; the UI never says "public". Labels (catalogue `fr`, no em dash): "Privé" and "Partagé avec l'association", each with one explanatory line (who sees what). Exact strings are the planner's, validated with the owner at the UI gate.
- **D-03:** The mobile and API names stay `visibility`; do not rename the column.

### Default and placement (owner, 2026-10-13)
- **D-04:** The selector sits **in the submission step** (the screen or confirmation that precedes the send), with **"Partagé avec l'association" pre-selected** (matches today's behaviour). The observer can switch to "Privé" before sending. Changing it is possible until submit, frozen after.
- **D-05:** A draft stores its current choice (default shared) so an interrupted submit keeps it; draft rows keep working offline and the choice rides on the normal upsert and the existing `visibility_update` queue kind until submit.

### Existing data (resolved here, derived from the owner's "existing surveys keep their current visibility")
- **D-06:** Every survey created so far has `visibility = 'private'` in the database (the mobile client and the server both defaulted to it) while Phase 11 made all submitted surveys visible to everyone. Keeping their *current visibility* therefore means **backfilling every submitted survey to `public`** in a new migration (next number after the current last), so nothing disappears from the map or search on deploy. Drafts keep their value; the migration also drops/recreates any index whose predicate changes. Prod holds test data only, so no counting or two-step migration.

### Read-only after submit
- **D-07:** After submit, `visibility` can no longer change: `PATCH /surveys/:id/visibility`, the `visibility_update` sync action, and an upsert carrying a different visibility on a submitted survey are refused (422 `submitted_read_only_fields`, matching the existing error policy; sync answers a per-operation blocked result). `docs/technical/publication-visibility-post-submit-v1.md` allowed editing after submit; this phase **supersedes** that rule (the document is updated and marked superseded in its status).
- **D-08:** `visibility_changed` events keep being written for draft changes if the code already does so; no new event type.

### Server enforcement (the core guarantee)
- **D-09:** One shared predicate is the single source: `PUBLIC_SURVEY_PREDICATE` in `api/src/surveys/public-map.queries.ts` gains `AND s.visibility = 'public'` (used by map items, parcel statuses, community list and detail, search community, parcel search, community attachments). Nothing else may re-derive "visible to others" by hand.
- **D-10:** Parcel history (`parcels.service.ts`) shows the caller their own submitted surveys of the parcel regardless of visibility, plus other members' `public` ones; a private survey of someone else never appears.
- **D-11:** **A private survey is totally invisible to others** (owner, 2026-10-13): a parcel with only private surveys shows as not studied to other members, in every count and status. The **next version number stays computed over all submitted surveys, private included** (`parcels.service.ts` next-version queries), so the author's numbering stays coherent; only the number leaks, never content. The planner documents this in the API contract.
- **D-12:** Guarantee tests (API, e2e on `ibp_test`): for each read path, a private survey of user A is absent for user B and present for A where an owner view exists; shared appears for both; a survey flipped is impossible after submit (D-07); direct id access by B to A's private survey (community detail, attachments, download URL, content) answers 404, not 403. A test enumerates the routes reading surveys so a future route cannot skip the predicate.
- **D-13:** Account deletion keeps retaining submitted surveys (Phase 11/27 D-24); a retained private survey stays private (author nulled, still hidden). Retained shared ones behave as today.

### Sync and mobile
- **D-14:** Sync wire contract unchanged in shape (`visibility` already on upsert and `visibility_update`); the pull (`GET /v1/sync/changes`) keeps returning the owner's own surveys with their visibility. Installed-app compatibility is not a constraint (prod is test data). The local SQLite `visibility` column and payload field already exist, so **no SQLite migration**.
- **D-15:** Survey detail shows the visibility as a read-only line/badge for the owner's own surveys (after submit, not editable), and the list filter `visibilityFilter` (already in `survey-logic.ts`) is reviewed: kept only if it has a UI home; otherwise removed as dead code (planner decides, flag in the plan).
- **D-16:** Community search and the Explorer need no mobile change beyond what the server returns; the mobile offline search over own surveys is unaffected (own surveys always visible to their owner).
- **D-17:** PDF export of one's own private survey keeps working; the "private" state is not printed unless the planner finds an obvious place for it (discretion).

### Claude's Discretion
- The exact component and layout of the selector (follow the visual layer rules in CLAUDE.md: `useBrandTheme`, outline icons, `brandMotion`, glass only where allowed), the migration number, and the test file split.
- Whether the guarantee test enumerating routes is a spec or an e2e.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/REQUIREMENTS.md` (`REQ-C-privacy-choice`, `REQ-X-visibility` override, `REQ-B-manage-published`)
- `.planning/phases/11-association-only-sharing-scope-trim/11-CONTEXT.md` (D-01 to D-04: the column stays, "member" = authenticated user, index 017, parcel history)
- `.planning/phases/24-survey-history-split/24-CONTEXT.md` (history pages and their data)
- `.planning/phases/27-quick-survey-additions-inserted-v1/27-CONTEXT.md` (D-24, retained notes)
- `docs/technical/publication-visibility-post-submit-v1.md` (to be superseded on the post-submit rule)
- `docs/specs/epic-g-ibp-information-association-visibility-and-donation.md`
- `docs/technical/api-contract-v1.md`, `data-contract-v1.md`, `sync-conflict-resolution-v1.md` (Case B2 visibility-only difference must change for submitted surveys)
- `api/migrations/001_init.sql`, `015_public_indexes_centroid_columns.sql`, `017_association_only_visibility.sql`
- Code: `api/src/surveys/public-map.queries.ts`, `parcels.service.ts`, `community-surveys.service.ts`, `search.queries.ts`, `parcel-search.queries.ts`, `surveys.service.ts` (`patchSurveyVisibility`, `applyVisibilityChange`), `surveys-sync.service.ts`, `public.controller.ts`; `packages/ibp-domain/src/contract/{survey,sync}.ts`; `mobile/src/storage/surveys.ts`, `mobile/src/app/survey-logic.ts`, `mobile/src/i18n/fr/`
- `CLAUDE.md` (Text and i18n, Visual layer, IBP rules stay in `@cortege/ibp-domain`)

</canonical_refs>

<deferred>
## Deferred Ideas

- Changing visibility after submit (owner decision: read-only).
- Sharing with named members or groups; a "shared with a structure" level (V3).
- Showing others that "a private survey exists" on a parcel (rejected, D-11).

</deferred>
