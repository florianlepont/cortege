# Publication Visibility & Post-Submit Management (V1)

> **Superseded for the post-submit rule by Phase 29 (2026-10): visibility is chosen before submit
> (shared with the association pre-selected) and is read-only after submit.** The rules below that
> allowed a visibility change on a submitted survey are struck through. The current behaviour is in
> `api-contract-v1.md` ("Survey visibility (Phase 29)", the per-channel error table under
> "Lifecycle rule in V1", `PATCH /surveys/{id}/visibility`) and in `data-contract-v1.md`. The
> earlier deferral of 2026-09-22 (publication left the milestone) is over: Phase 29 returned the
> private or shared choice.

## Status
Superseded (2026-10) for the post-submit rule by Phase 29; the rest of this document is historical
context. Originally a draft for implementation planning (2026-03-09).

## Goal
Make survey publication operational without reopening scientific observations after submit.

## Scope
- Private/public toggle as a first-class API operation.
- Post-submit edit policy (what remains editable vs read-only).
- Audit and public-surface consistency expectations.
- Test matrix for backend and mobile flows.

## Business Rules (V1)
1. ~~Default visibility is `private`.~~ Phase 29: the database default stays `private` (a create that sends no value is fail-closed), but the app pre-selects "shared with the association" for a new draft.
2. `draft` surveys may edit observation fields and visibility.
3. `submitted` surveys are read-only:
   - not editable: `site_name`, `parcel_ids`, `region_version`, `vegetation_stage`, `factors`, `scores`, and since Phase 29 `visibility`.
   - ~~editable: `visibility` only.~~ Nothing is editable after submit.
4. Any visibility change on a draft must produce a `visibility_changed` event with `{ from, to }`.
5. Public surfaces must never expose:
   - `private` surveys,
   - deleted surveys.
6. Recommended publishability gate for map/read models: include only `submitted` + `public`.

## API Contract Delta (V1)
- Dedicated endpoint: `PATCH /surveys/{id}/visibility`
  - request: `{ "visibility": "private" | "public" }`
  - response: `{ id, visibility, updated_at }`
- Existing endpoint `PATCH /surveys/{id}` remains for generic updates in `draft`.
- For `submitted`, a generic patch of any field, `visibility` included (Phase 29), must return `422` (`submitted_read_only_fields`). The dedicated visibility endpoint is for drafts only. Per-channel codes: see `api-contract-v1.md`.

## Error Policy
- `401` not authenticated
- `403` not owner / unauthorized role
- `404` survey not found
- `422` invalid business transition / forbidden post-submit field edit

## Audit Events
- `visibility_changed`
  - payload: `{ "from": "private", "to": "public" }`
  - actor: authenticated user id
  - timestamp: server generated

## Test Matrix

### Backend (API/e2e)
1. Draft survey: `PATCH /surveys/{id}/visibility` `private -> public` returns `200`.
2. ~~Submitted survey: `PATCH /surveys/{id}/visibility` `private -> public` returns `200`.~~ Phase 29: it returns `422` (`submitted_read_only_fields`); the stored value sent again is a `200` no-op.
3. Submitted survey: `PATCH /surveys/{id}` with `factors` returns `422` (`submitted_read_only_fields`).
4. Visibility toggle writes `visibility_changed` event in `/surveys/{id}/events`.
5. Public map list includes `submitted+public` and excludes `submitted+private`.
6. `public -> private` on a draft changes nothing on the map (a draft is never listed); once submitted the value cannot change (Phase 29).
7. Phase 29: a private submitted survey is absent for every other member on every read route (`api/test/private-visibility.e2e-spec.ts`, `api/test/survey-read-paths.spec.ts`).

### Mobile (functional)
1. ~~Draft survey detail shows visibility control and applies immediately.~~ Phase 29: the choice is made in the submission step (`surveyFinish` sheet) and stored on the draft; the summary shows a read-only line.
2. ~~Submitted survey detail still shows visibility control.~~ Phase 29: the submitted summary shows the visibility as a read-only line, no control.
3. Submitted survey detail keeps observation actions disabled (edit factors/parcels).
4. Visibility state survives sync round-trip (local -> server -> local pull).

## Implementation Notes
- Keep compatibility with the direct endpoint (`PATCH /surveys/{id}/visibility`) for online calls.
- For offline-first mobile behavior, V1 also supports queued `survey.visibility_update` in `POST /sync`.
