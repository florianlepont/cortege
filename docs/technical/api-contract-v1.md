# V1 API Contract

## Status

Accepted for V1 baseline (validated on 2026-03-08, non-exhaustive by design). V1.1 parcel/history extension proposed on 2026-03-10. Auth section updated on 2026-04-06 to reflect Auth0 delegation. `/me` endpoints updated to match implementation. `DELETE /me` added (US-A7). Phase 01.8 (2026-09-26) adds the per-survey IBP method version
(`ibp_method_version`, `ibp_cas`, `ibp_cas3_scale`) to the survey bodies, the survey reads, the
sync feed and the public map reads; every change is additive. Phase 5 (2026-09-27) replaces Factor
A's bare `native_genus_count` with a genus list (`factors.A.genera`), validated against the CNPF
regional list; no new endpoint (recognition is on-device, Phase 6).

Base path: `/v1`

## Principles

- JSON request/response format
- Bearer token authentication for protected endpoints
- Idempotent survey upsert via (`id`, `sync_version`)
- UTC timestamps in ISO-8601 format

## Entity Coverage (Data Contract -> API)

- `User`: covered
- `Auth Session`: covered
- `Survey`: covered
- `Attachment`: covered
- `Survey Event`: covered
- `Sync Operation`: covered via `/sync` payload
- `Report`: covered
- `Public Map Item` (optional V1 read model): covered

## 1) Authentication

Authentication is fully delegated to **Auth0**. The backend does not expose login, register, refresh, or logout endpoints. All token issuance and session lifecycle (access token, refresh token, rotation, revocation) are handled by Auth0.

### How it works

1. The mobile app authenticates via Auth0 (Universal Login, social providers, or email/password).
2. Auth0 issues a signed JWT access token (RS256).
3. The mobile sends this token as `Authorization: Bearer <token>` on every API request.
4. The backend's `AuthGuard` validates the JWT against Auth0's JWKS endpoint (`/.well-known/jwks.json`).
5. On first login, the backend auto-provisions a DB user record from Auth0's `/userinfo` endpoint (race-free: concurrent first requests for the same `sub` all resolve to the same user).
   - If `/userinfo` reports `email_verified: true` and a user with the same email exists **and is not yet linked** to any Auth0 identity (`auth0_sub IS NULL`, e.g. a pre-Auth0 account), the Auth0 `sub` is linked to that record.
   - An account already linked to another `sub` is never re-pointed, and an unverified (or missing) email is never linked to an existing account. In both cases the request is refused with **403**, not 401 (the token is valid; this is a policy refusal):

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "code": "email_already_linked",
  "message": "This email address already belongs to another account"
}
```

Clients must match on `code`, must **not** refresh the token and retry on this 403, and should tell the user to sign in with the method used to create the account. Every other authentication failure (missing, expired or invalid token) remains **401**.

### Logout

Handled client-side: the mobile clears its local token storage. Token revocation (refresh token) is performed directly against Auth0.

### Social / SSO providers

Supported providers (Apple, Google, etc.) are configured in the Auth0 tenant. No backend changes are needed to add or remove providers.

## 1.1) User Profile

### GET /me

Get current authenticated user profile.

Response `200`:

```json
{
  "id": "0f5f57bb-4c0f-4adb-97b9-faf7a1e33b9a",
  "email": "user@example.com",
  "role": "contributor",
  "first_name": "Florian",
  "last_name": "Lepont",
  "display_name": "Florian",
  "profile_picture_url": "/me/profile-picture?v=1741525200",
  "updated_at": "2026-03-08T12:00:00Z"
}
```

- `profile_picture_url` is `null` when the user has no picture, and also when a picture is recorded but its stored object can no longer be found (the app then shows its initials fallback, with no error). If the object store cannot be reached, the stored URL is returned unchanged.

### PATCH /me

Partially update editable profile fields.
Editable fields in V1: `first_name`, `last_name`, `display_name`, `profile_picture_url`.

Notes:

- `email` is **not** editable via this endpoint. Use `PATCH /me/email` instead.
- Setting `profile_picture_url` to `null` removes the profile picture URL.

Request:

```json
{
  "first_name": "Florian",
  "last_name": "Lepont",
  "display_name": "Florian L.",
  "profile_picture_url": null
}
```

Response `200`:

```json
{
  "id": "0f5f57bb-4c0f-4adb-97b9-faf7a1e33b9a",
  "email": "user@example.com",
  "role": "contributor",
  "first_name": "Florian",
  "last_name": "Lepont",
  "display_name": "Florian L.",
  "profile_picture_url": null,
  "updated_at": "2026-03-08T12:10:00Z"
}
```

### PATCH /me/email

Change the authenticated user's email address.

Request:

```json
{
  "email": "florian@example.com"
}
```

Response `204`.

Rules:

- New email must differ from current email (`400` otherwise).
- Email is updated on Auth0 first (triggers a verification email), then in the DB.
- If the DB update fails with a uniqueness conflict, the Auth0 change is rolled back.
- Returns `400` with code `Email already in use` if the email is taken on Auth0.
- Returns `400` with code `Email already taken` if the email conflicts in the DB.

### POST /me/password-reset

Trigger a password reset email for the authenticated user (email/password accounts only).

Response `204`.

Notes:

- Sends a secure reset link to the user's current email via Auth0's password reset flow.
- No-op for users authenticated exclusively via social providers (no password set).

### PUT /me/profile-picture

Upload user profile picture (`multipart/form-data`, field name: `file`).

Rules:

- Max size 10MB. Accepted types: `image/jpeg`, `image/jpg`, `image/png`, `image/heic`, `image/webp`. Any other type (for example `image/gif`) gets `400 Unsupported profile picture type`, never a `500`.
- The picture is stored in object storage (the MinIO/S3 bucket in production, the local uploads directory in local mode) under the key `profiles/{user_id}/avatar{ext}`. Replacing a picture deletes the previous object after the database update.

Response `200`:

```json
{
  "profile_picture_url": "/me/profile-picture?v=1741525200",
  "user": {
    "id": "0f5f57bb-4c0f-4adb-97b9-faf7a1e33b9a",
    "email": "user@example.com",
    "role": "contributor",
    "first_name": "Florian",
    "last_name": "Lepont",
    "display_name": "Florian",
    "profile_picture_url": "/me/profile-picture?v=1741525200",
    "email_change_required": false,
    "email_change_pending_to": null,
    "updated_at": "2026-03-08T12:40:00Z"
  }
}
```

### GET /me/profile-picture

Download current authenticated user profile picture.

Response `200`: binary image stream, with the stored `Content-Type` and `Cache-Control: private, max-age=60`.

Rules:

- The API streams the bytes itself and requires `Authorization: Bearer <token>`; it never redirects to a presigned URL (installed apps send the Bearer header to this route).
- `404` when the user has no picture. `404` also when a picture is recorded but its stored object is missing: the server then clears the stale `profile_picture_*` columns, so the next `GET /me` returns `profile_picture_url: null`.

### DELETE /me/profile-picture

Remove current authenticated user profile picture.

Response `204`.

### DELETE /me

Permanently delete the authenticated user's account.

Response `204`.

Rules:

- Immediate and irreversible — no grace period.
- The user is deleted from Auth0 (`DELETE /api/v2/users/{auth0_sub}`). Requires M2M token with `delete:users` scope.
- All personal identity data (name, email, profile picture) is deleted from the DB.
- All surveys and observations previously submitted are anonymised (user reference removed), not deleted.
- Profile picture file is deleted from storage.
- If the Auth0 deletion fails, the DB is not modified (Auth0 first, then DB).
- After deletion, all tokens issued to the user become invalid (Auth0 handles token revocation on user delete).
- For users authenticated via social providers (Apple, Google), the Auth0 identity is deleted but the provider account itself is not revoked.

## 2) Surveys

### POST /surveys

Create or update one survey (idempotent upsert).

Request:

```json
{
  "id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
  "sync_version": 3,
  "site_name": "Foret de Rambouillet",
  "parcel_ids": ["75101AB0123", "75101AB0456"],
  "parcel_id": "75101AB0123",
  "observation_year": 2026,
  "version_number": 2,
  "previous_survey_id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172b",
  "status": "submitted",
  "visibility": "private",
  "region_version": "ACA",
  "vegetation_stage": "collineen",
  "factors": {},
  "scores": {
    "ibp_peuplement_gestion": 20,
    "ibp_contexte": 8,
    "ibp_total": 28
  },
  "expires_at": "2026-03-15T10:00:00Z"
}
```

`location` is no longer part of survey write payloads in V1.2.
Map centering metadata stays client-local. Server map display is derived from linked parcel centroids (`display_location`).

V1.1 addendum fields:

- `parcel_ids`: French cadastral parcel identifiers (at least one required at submit).
- `parcel_id`: compatibility primary parcel pointer.
- `observation_year`: integer year used for longitudinal history.
- `version_number`: integer (`>=1`) for parcel-level survey versioning.
- `previous_survey_id`: optional link to previous survey version on same parcel.

**IBP method version (phase 01.8, ADR-003):** every survey is scored and validated under one IBP
method version, chosen when the survey is created. Three optional fields on `POST /surveys`,
`PATCH /surveys/{id}` and `survey.upsert` payloads of `POST /sync`:

| Field | Values | Meaning |
|---|---|---|
| `ibp_method_version` | `cnpf_ibp_fr_v3_0_2023-03-23`, `cnpf_ibp_fr_v3_2_2026-02-02`, `null` or absent | The CNPF IBP method: IBP Fr v3.0 or IBP FR v3.2. `null` or absent means v3.0 |
| `ibp_cas` | integer `1`, `2`, `3` or `4`, or `null` | v3.2 only: the station case ("cas") of the v3.2 sheet |
| `ibp_cas3_scale` | boolean, or `null` | v3.2 only: use the cas-3 scale for factors A and G (a cas-2 stand in a cas-3 zone, or a lapiaz, dune, peat-bog or *Juniperus thurifera* stand) |

- **NULL means v3.0.** Every survey recorded before phase 01.8 has no version and stays v3.0; the
  server never stamps a tag on an untagged survey. The tag is stored as sent: an explicit v3.0 tag
  is stored as the tag, and is equivalent to `null` in every comparison.
- **Station fields per method.** A v3.0 survey uses `region_version` (`ACA` or `M`) and
  `vegetation_stage`; a v3.2 survey uses `ibp_cas` and `ibp_cas3_scale`. The server stores only
  the chosen method's fields: for v3.2 it stores `region_version` and `vegetation_stage` as `NULL`
  (even when the body sends them), and for v3.0 it stores `ibp_cas` and `ibp_cas3_scale` as
  `NULL`.
- **Effective version.** The version of a write is the body's `ibp_method_version`, else the
  stored one. A body field that is `null` or absent counts as absent: it keeps the stored value.
  An installed app that does not know these fields therefore keeps a v3.2 draft in v3.2. Switching
  a v3.2 draft back to v3.0 needs the explicit v3.0 tag.
- **Validation.** An unknown `ibp_method_version`, an `ibp_cas` outside 1-4 or a non-boolean
  `ibp_cas3_scale` is a `400` validation error on the REST routes, and a per-operation
  `fatal_error` `invalid_sync_operation` (`400`, `details.fields` naming the fields) on
  `POST /sync`. See [IBP factor validation](#ibp-factor-validation-phase-018) for the scoring
  rules and codes.
- **Fixed after submit.** The three fields are read-only once the survey is submitted, like
  `region_version` and `factors` (see below). They are compared after the storage rule above: the
  explicit v3.0 tag equals `null`, the cas fields are compared only for a v3.2 survey,
  `region_version`/`vegetation_stage` only for a v3.0 survey, and a missing `ibp_cas3_scale`
  equals `false`.

**`status` and `expires_at` (V1.2 hardening):** both fields are accepted for backward
compatibility with installed apps but are always ignored by the server. A survey is always
created with `status: "draft"`; status changes only through `POST /surveys/{id}/submit`
(`submitted`/`expired`). `expires_at` is set by the server at creation time (`created_at` + 7
days) and is never moved by an upsert.

**Submitted surveys are read-only by value (V1.2 hardening):** an upsert that changes the
*value* of `site_name`, `parcel_id`/`parcel_ids`, `observation_year`, `version_number`,
`previous_survey_id`, `region_version`, `vegetation_stage`, `factors`, `ibp_method_version`,
`ibp_cas` or `ibp_cas3_scale` (phase 01.8) on a survey whose
status is `submitted` is rejected with `409 survey_submitted_read_only` and
`details.fields` listing the changed field names. Resending identical values (including a
resync of a pulled survey) is accepted and only refreshes `visibility`/`sync_version`;
`scores` is excluded from this comparison (it is recomputed server-side).

**Same `sync_version` (phase 01.6):** an upsert that carries the `sync_version` the server
already stored is compared by value with the stored survey on the same read-only fields
(`site_name`, `parcel_id`/`parcel_ids`, `observation_year`, `version_number`,
`previous_survey_id`, `region_version`, `vegetation_stage`, `factors`, and since phase 01.8
`ibp_method_version`, `ibp_cas`, `ibp_cas3_scale`) plus `visibility`;
`scores`, `status` and `expires_at` are excluded. Identical values are an idempotent replay
(`synced`, nothing written). When only `visibility` differs, it is applied last-writer-wins
like `PATCH /surveys/{id}/visibility` (new `updated_at`, one `visibility_changed` event) and
the answer is `synced`. Any read-only difference is rejected with `409 sync_version_conflict`
("Same sync_version with different content", `details.server_sync_version` /
`client_sync_version`) and nothing is written. This check runs before the submitted-survey
rule above, so a same-version resend that changes a submitted survey also gets
`sync_version_conflict`. Of two concurrent upserts at the same new `sync_version` with
different content, one is `synced` and the other gets `409 sync_version_conflict`. A lower
`sync_version` than the stored one is always `409 sync_version_conflict` ("Older sync_version
received").

**Identifiers (phase 01.6):** survey ids (`id`, and the `{id}` path parameter of every
`/surveys/{id}` route) and attachment ids (`{attachment_id}` path parameters,
`attachment_id` in `/sync` payloads) must match `^[A-Za-z0-9_-]{1,128}$`. This accepts every
id format installed apps have generated (`survey-<ms>`, UUIDs). An unsafe path parameter
gets `400 Invalid identifier` (the rejected value is never echoed), an unsafe body `id` a
normal `400` validation error, and an unsafe id in `POST /sync` a per-operation
`fatal_error` `invalid_sync_operation` (`400`).

Response `200`:

```json
{
  "id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
  "server_status": "synced",
  "updated_at": "2026-03-08T12:00:00Z",
  "warnings": [],
  "factor_results": {}
}
```

### List pagination (`limit`, `cursor`)

`GET /surveys`, `GET /surveys/{id}/events` and `GET /reports` accept two optional query
parameters:

- `limit`: an integer from 1 to 100. Without it the list is not paginated: every row comes back,
  in the documented order, with `next_cursor: null`, exactly as before pagination existed.
- `cursor`: the opaque `next_cursor` of the previous page (`v1:` followed by base64url). Clients
  must send it back verbatim, never parse or build it. It is only valid for the same list and
  the same filters.

With `limit`, the response holds at most `limit` items. `next_cursor` is set when more rows
follow, and `null` on the last page. Walking the pages returns every row exactly once, in the
unpaginated order. Pages use keyset pagination: rows written after the first page with a newer
timestamp are not added to later pages.

A cursor never widens the caller's scope: a cursor replayed by another user still lists only that
user's rows (or answers `404` / `403`, as the route does without a cursor).

Errors (the rejected value is never echoed):

- `400 Invalid limit`: `limit` is not an integer from 1 to 100 (for example `0`, `101`, `abc`).
- `400 Invalid cursor`: `cursor` is malformed or was not issued by this list.

Unknown query parameters are ignored, as before.

### GET /surveys?status=&from=&to=&q=&limit=&cursor=

List current user surveys with filters, most recently updated first (`updated_at` descending,
then `id` descending). `limit` and `cursor` are optional; see
[List pagination](#list-pagination-limit-cursor). Without `limit`, `next_cursor` is always
`null`.

Response `200`:

```json
{
  "items": [
    {
      "id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
      "site_name": "Foret de Rambouillet",
      "parcel_id": "75101AB0123",
      "observation_year": 2026,
      "version_number": 2,
      "status": "draft",
      "visibility": "private",
      "updated_at": "2026-03-08T11:00:00Z"
    }
  ],
  "next_cursor": null
}
```

### GET /surveys/{id}

Get one survey with full payload.

Response `200`:

```json
{
  "id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
  "site_name": "Foret de Rambouillet",
  "parcel_ids": ["75101AB0123", "75101AB0456"],
  "parcel_id": "75101AB0123",
  "observation_year": 2026,
  "version_number": 2,
  "previous_survey_id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172b",
  "status": "draft",
  "visibility": "private",
  "region_version": null,
  "vegetation_stage": null,
  "ibp_method_version": "cnpf_ibp_fr_v3_2_2026-02-02",
  "ibp_cas": 2,
  "ibp_cas3_scale": false,
  "factors": {},
  "factor_results": {},
  "scores": {
    "ibp_peuplement_gestion": 20,
    "ibp_contexte": 8,
    "ibp_total": 28
  },
  "display_location": { "lat": 48.643, "lng": 1.829 },
  "created_at": "2026-03-08T11:00:00Z",
  "updated_at": "2026-03-08T12:00:00Z",
  "submitted_at": null,
  "expires_at": "2026-03-15T10:00:00Z",
  "sync_version": 3
}
```

The detail always carries `ibp_method_version`, `ibp_cas` and `ibp_cas3_scale` (phase 01.8):
`null` for a survey recorded before the method version existed (v3.0). The example is a v3.2
survey, so its `region_version` and `vegetation_stage` are `null`.

### PATCH /surveys/{id}

Partially update survey fields.

Lifecycle rule in V1:

- While `status=draft`, business fields are editable (`site_name`, parcel linkage, region/stage, factors, visibility).
- While `status=submitted`, observation payload is read-only.
- For `submitted`, only publication visibility changes are allowed (use dedicated endpoint below).

Request:

```json
{
  "site_name": "Foret de Rambouillet - Secteur Nord",
  "visibility": "public",
  "region_version": "ACA",
  "vegetation_stage": "collineen",
  "factors": {},
  "scores": {
    "ibp_peuplement_gestion": 20,
    "ibp_contexte": 8,
    "ibp_total": 28
  }
}
```

Response `200`:

```json
{
  "id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
  "updated_at": "2026-03-08T12:15:00Z"
}
```

For submitted surveys, patching non-publication fields must return `422`
with a business error (example: `submitted_read_only_fields`).

Phase 01.8: the body also accepts `ibp_method_version`, `ibp_cas` and `ibp_cas3_scale` (same
values and storage rule as `POST /surveys`). On a draft, a PATCH that changes the method version,
the cas or the region re-scores the stored factors under the new method, even without `factors`
in the body. On a submitted survey any of the three keys is rejected with
`422 submitted_read_only_fields` listing it (PATCH keeps its key-presence rule; the value-based
`409 survey_submitted_read_only` applies to `POST /surveys` and `POST /sync` replays).

### PATCH /surveys/{id}/visibility

Toggle publication visibility for a survey (`private` <-> `public`).

Request:

```json
{
  "visibility": "public"
}
```

Response `200`:

```json
{
  "id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
  "visibility": "public",
  "updated_at": "2026-03-09T16:20:00Z"
}
```

Rules:

- Allowed for survey owner (and moderators/admins where applicable by auth policy).
- Allowed in both `draft` and `submitted` states.
- Must write an audit event: `visibility_changed` with `{ from, to }`.
- No-op requests (same visibility) return `200` unchanged.
- Mobile offline mode may queue this as `survey.visibility_update` inside `POST /sync`.

### POST /surveys/{id}/submit

Attempt submission transition (`draft` -> `submitted`) with server-side checks.
Blocking checks include:

- all required IBP factors complete and valid
- ~~survey not expired~~ (removed, OA-41 2026-10-06: there is no submission deadline)
- parcel linkage complete and valid (`parcel_ids[]`, `observation_year`, `version_number`)
- the station of the survey's method (phase 01.8): `region_version` and `vegetation_stage` for
  v3.0, `ibp_cas` (1-4) for v3.2 (`ibp_cas_required`)

The survey is scored under its stored method version; see
[IBP factor validation](#ibp-factor-validation-phase-018).

Response `200`:

```json
{
  "id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
  "status": "submitted",
  "submitted_at": "2026-03-08T12:20:00Z",
  "scores": {
    "ibp_peuplement_gestion": 20,
    "ibp_contexte": 8,
    "ibp_total": 28
  },
  "warnings": []
}
```

If parcel linkage is missing/invalid, API returns `422` with error code `parcel_required` or `parcel_invalid`.

**Concurrent submits (V1.2 hardening):** submits on the same parcel are serialised by a
row lock; the loser of a race gets `409 parcel_version_conflict` with
`details.parcel_id`/`details.expected_version_number` instead of a duplicate version or a
`500`.

### IBP factor validation (phase 01.8)

The server scores and validates the factors A-J with the shared `@cortege/ibp-domain` package,
under the survey's effective method version (the same rules run on the phone). Upserts and PATCH
use draft mode; `POST /surveys/{id}/submit` uses submit mode. A blocking issue in draft mode is a
`422` (`message: "IBP factor validation failed"`); in submit mode a `422`
(`message: "Survey cannot be submitted"`). The `422` body lists the blocking messages in
`errors` and the non-blocking ones in `warnings`; a successful write returns the non-blocking
messages in `warnings`. The server never compares its recomputed scores with the client's
`scores`, so a replayed survey is never rejected for a score difference.

| Code | Blocking | When |
|---|---|---|
| `ibp_method_version_unsupported` | yes | The method version is not one of the two tags. The DTOs reject such a value first (`400`), so this code only guards stored or internal inputs |
| `ibp_cas_required` | yes, submit only | A v3.2 survey without `ibp_cas` in 1-4. Message: `ibp_cas is required and must be 1, 2, 3 or 4` |
| `region_version_required` | yes, submit only | A v3.0 survey without `region_version` `ACA` or `M` |
| `vegetation_stage_required` | yes, submit only | A v3.0 survey without `vegetation_stage` |
| ~~`expires_at_required`, `survey_expired`~~ | removed (OA-41) | There is no submission deadline: a survey is never refused for its age |
| `factor_required` | yes, submit only | A factor is missing, or is still incomplete at submit |
| `factor_incomplete` | no (draft) | A factor that cannot be scored yet: a v3.2 A or G without `ibp_cas`, a v3.2 A without its native cover, or an A (either version) that records its native cover but no genus count yet. The draft is saved and the factor is not scored |
| `factor_invalid_raw` | yes | A factor object that no rule can read |
| `factor_invalid_score` | yes | A direct score outside the factor's allowed set |
| `factor_a_genus_invalid` | yes | `factors.A.genera` (phase 5) has a non-array value, or an entry that is not one of the CNPF regional list's 34 classes. Message: `factor A genera must each be one of the CNPF regional list's classes` |
| `factor_f_group_capped` | no | F by microhabitat groups: a group count above 2 was capped at 2 |
| `consistency_a_b`, `consistency_e_f` | no | App heuristics (not CNPF rules) on two scored factors |

Allowed scores, both versions: A-F `{0, 1, 2, 5}`; G, H, I and J `{0, 2, 5}`. Before phase 01.8
the API accepted 1 for G and H; both CNPF versions allow only 0, 2 or 5 there (BUG-2), so a direct
`G: 1` or `H: 1` is now `factor_invalid_score`.

Native cover cap: the "score capped at 2 when the native cover is below 50 %" rule applies to
**Factor A** (native genera), not to B (BUG-1). The cover is sent on A as `native_cover_percent`
(0-100) or `native_cover_below_50` (boolean). For v3.2 it is required (A is incomplete without
it); for v3.0 it is optional, and a v3.0 survey without it reads the cover that pre-01.8 apps sent
on B (`B.covered_autochthonous_percent` / `B.native_cover_percent`). B is scored from its strata
count only.

Method differences (v3.2 against v3.0): C, D and E count the large and very large wood or trees
together for the 0/1 classes; the A and G scales follow the cas (cas 3, or `ibp_cas3_scale`)
instead of the v3.0 subalpine rule (`region_version = ACA` and `vegetation_stage = subalpin`). See
`docs/technical/ibp-validation-matrix-v2.md` for the cases.

### Factor A genus list (phase 5, ADR-002 D-15, ADR-003 CH-12)

Factor A carries its observed native genera as a list, `factors.A.genera` (`string[]`), instead of
a bare count. The count Factor A scores from is derived from the list (its number of distinct
valid codes); it is never sent as a separate field for a new survey. Each entry must be one of the
34 classes of the closed CNPF regional list (see `@cortege/ibp-domain`'s `genus.ts` for the
authoritative codes, e.g. `"Fagus"`, `"Quercus_deciduae"`, `"Quercus_sempervirens"`); an unlisted
entry (for example `"Ficus"`, not on the list — A-6) or a non-array value is a blocking
`factor_a_genus_invalid` (see the table above).

- **Supplementary genera** (Ceratonia, Cercis, Olea, Phillyrea, Pistacia) count only when the
  survey's `ibp_cas` is 2 or 4 (v3.2 p. 3). A structurally valid code that is not allowed at the
  survey's cas (a supplementary genus outside cas 2/4, or any supplementary genus on a v3.0
  survey, which has no cas) is **silently excluded** from the derived count — it is not an error,
  exactly as if that genus had not been observed.
- **No recognition endpoint.** There is no server route for genus recognition: inference runs
  entirely on-device (Phase 6, ADR-002 D-06). The server only ever receives a confirmed genus code
  inside `genera`, through the normal upsert/sync payload, indistinguishable from one the observer
  typed by hand.
- **No species-level data.** `genera` never carries a species; recognition and counting are
  genus-level only (ADR-002 D-01). The recognition photograph and whether the observer accepted or
  corrected a suggestion are never sent to the server (D-13, D-14).
- **Legacy shape, still accepted:** `factors.A.native_genus_count` (integer) — surveys already
  recorded this way keep their stored score unchanged; a survey whose A has no `genera` key falls
  back to it. A new survey should use `genera`, not `native_genus_count`.
- `POST /v1/sync` round-trips `genera` like any other factor field: an identical replay (same
  `sync_version`, same payload) is `synced` and writes nothing new — no duplicate survey or event.

Example, a v3.2 survey's Factor A:
```json
"A": { "genera": ["Fagus", "Quercus_deciduae", "Quercus_sempervirens"], "native_cover_percent": 60 }
```

### DELETE /surveys/{id}

Soft-delete a survey.

Response `204`.

Notes:

- Idempotent in V1: returns `204` even if survey was already deleted or not found.

### GET /surveys/{id}/events?limit=&cursor=

Get survey audit trail events, newest first (`created_at` descending, then the event's insertion
order). `limit` and `cursor` are optional; see [List pagination](#list-pagination-limit-cursor).
Without them every event is returned, as before.

The response now also carries `next_cursor` (`null` without `limit` and on the last page). The
item fields are unchanged.

Response `200`:

```json
{
  "items": [
    {
      "id": "7d95ec64-f5aa-4f28-8942-26dfdb6dce16",
      "event_type": "submitted",
      "created_at": "2026-03-08T12:20:00Z"
    }
  ],
  "next_cursor": null
}
```

## 2.1) Attachments

### POST /surveys/{id}/attachments

Create an attachment record and return an upload target URL.

Request:

```json
{
  "mime_type": "image/jpeg",
  "size_bytes": 2450000,
  "captured_at": "2026-03-09T09:10:00Z",
  "metadata": {
    "device": "ios",
    "orientation": "portrait"
  }
}
```

Response `201`:

```json
{
  "attachment_id": "6e0417dc-ecdb-4435-aadf-8e11b7f5f2f0",
  "storage_key": "surveys/2f3d8a59/photo-1.jpg",
  "upload_url": "https://minio.local/ibp-media/surveys/.../photo-1.jpg?X-Amz-...",
  "confirm_url": "/surveys/2f3d8a59-7c53-4fdf-8df4-8e2325b6172c/attachments/6e0417dc-ecdb-4435-aadf-8e11b7f5f2f0/upload?token=generated-token"
}
```

Rules:

- `size_bytes` must be a positive integer and <= 25MB in V1
- `size_bytes` must be the exact byte length of the file the client uploads.
- `upload_url` is the generated upload target for binary data
- In MinIO/S3 mode, `upload_url` is a presigned PUT (valid 15 minutes) that signs `Content-Type = mime_type` and `Content-Length = size_bytes`. Clients must send exactly `size_bytes` bytes; the store refuses a body of any other length (`403`).
- `confirm_url` must be called after upload to mark `uploaded_at`
- In local mode, `upload_url` can be the same API upload endpoint as `confirm_url`
- The storage key is built by the server as `surveys/{survey_id}/{attachment_id}{ext}` from validated ids only.

### GET /surveys/{id}/attachments

List non-deleted attachments for one survey.

Response `200`:

```json
{
  "items": [
    {
      "id": "6e0417dc-ecdb-4435-aadf-8e11b7f5f2f0",
      "survey_id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
      "storage_key": "surveys/2f3d8a59/photo-1.jpg",
      "mime_type": "image/jpeg",
      "size_bytes": 2450000,
      "created_at": "2026-03-09T09:10:00Z",
      "uploaded_at": "2026-03-09T09:12:00Z"
    }
  ]
}
```

### GET /surveys/{id}/attachments/{attachment_id}/download-url

Get a short-lived, mode-independent URL to fetch the attachment's stored bytes. Only the survey owner may call this.

Response `200`:

```json
{
  "url": "https://minio.local/ibp-media/surveys/.../photo-1.jpg?X-Amz-...",
  "expires_at": "2026-03-09T09:17:00Z",
  "requires_auth": false
}
```

Rules:

- The URL is valid for 5 minutes (`expires_at`).
- In MinIO/S3 mode, `url` is a presigned GET for the object and `requires_auth` is `false`. Clients must not send the bearer token to this URL — it is a plain, unauthenticated GET.
- In local storage mode, `url` is the relative path of `GET /surveys/{id}/attachments/{attachment_id}/content` and `requires_auth` is `true`. Clients must call it with `Authorization: Bearer <token>`.
- `404` if the survey does not exist, is not owned by the caller, is deleted, or the attachment does not exist or is deleted.
- `409` with `{ "code": "attachment_not_uploaded" }` if the attachment record exists but has not been uploaded yet.
- `401` if no bearer token is provided.

### GET /surveys/{id}/attachments/{attachment_id}/content

Stream the stored bytes of an uploaded attachment. Local storage mode only — this route always returns `404` when `OBJECT_STORAGE_MODE=minio`, since the presigned URL from `download-url` serves the bytes directly in that mode.

Response `200`: binary body with `Content-Type` set to the attachment's stored MIME type.

Rules:

- Requires `Authorization: Bearer <token>`; `401` with no token.
- Same ownership, deletion and upload-state rules as `download-url`: `404` for another user's survey, a deleted survey/attachment or an unknown id; `409` with `{ "code": "attachment_not_uploaded" }` if not yet uploaded.
- The server resolves `storage_key` against the local uploads directory and refuses to serve any path that escapes it: such a key, like a missing file, answers `404`.

### PUT /surveys/{id}/attachments/{attachment_id}/upload?token=

Consume the upload target with a real file upload and mark attachment as uploaded.

Request:

- Content type: `multipart/form-data`
- Field: `file` (binary image payload)

Response `200`:

```json
{
  "attachment_id": "6e0417dc-ecdb-4435-aadf-8e11b7f5f2f0",
  "uploaded_at": "2026-03-09T09:12:00Z"
}
```

Rules:

- In MinIO/S3 mode this call confirms the object already uploaded to the presigned `upload_url` (no file part is needed). `400 uploaded object not found in storage` if nothing was uploaded.
- The stored size is compared with the declared `size_bytes`, in both modes. On a mismatch the API answers `422` with `{ "code": "attachment_size_mismatch", "message": "Uploaded file size does not match declared size" }`: in MinIO/S3 mode the object is deleted, in local mode the file is never written. `uploaded_at` stays `null` and no `attachment_uploaded` event is recorded. The client must re-create the attachment with the real size.

### DELETE /surveys/{id}/attachments/{attachment_id}

Remove attachment link (and optionally underlying object).

Response `204`.

## 3) Sync (Batch, Recommended)

### POST /sync

Submit multiple operations in one request.

Request:

```json
{
  "operations": [
    {
      "client_ref": "queue-101",
      "entity": "survey",
      "action": "upsert",
      "payload": {
        "id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
        "sync_version": 3,
        "site_name": "Forest Plot 12"
      }
    },
    {
      "client_ref": "queue-102",
      "entity": "attachment",
      "action": "create",
      "survey_id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
      "payload": {
        "mime_type": "image/jpeg",
        "size_bytes": 2450000
      }
    },
    {
      "client_ref": "queue-103",
      "entity": "survey",
      "action": "delete",
      "survey_id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
      "payload": {
        "id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c"
      }
    }
  ]
}
```

Response `200`:

```json
{
  "results": [
    {
      "client_ref": "queue-101",
      "entity": "survey",
      "action": "upsert",
      "status": "synced",
      "data": {
        "id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
        "server_status": "synced",
        "updated_at": "2026-03-09T10:20:00Z"
      }
    },
    {
      "client_ref": "queue-102",
      "entity": "attachment",
      "action": "create",
      "status": "synced",
      "data": {
        "attachment_id": "6e0417dc-ecdb-4435-aadf-8e11b7f5f2f0",
        "storage_key": "surveys/2f3d8a59/photo-1.jpg",
        "upload_url": "https://minio.local/ibp-media/surveys/.../photo-1.jpg?X-Amz-...",
        "confirm_url": "/surveys/2f3d8a59-7c53-4fdf-8df4-8e2325b6172c/attachments/6e0417dc-ecdb-4435-aadf-8e11b7f5f2f0/upload?token=generated-token"
      }
    },
    {
      "client_ref": "queue-103",
      "entity": "survey",
      "action": "delete",
      "status": "synced",
      "data": {
        "id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
        "deleted_at": "2026-03-09T11:00:00Z",
        "already_deleted": false,
        "missing": false
      }
    },
    {
      "client_ref": "queue-104",
      "entity": "survey",
      "action": "upsert",
      "status": "fatal_error",
      "error": {
        "code": "http_400",
        "message": "site_name is required",
        "http_status": 400,
        "details": null
      }
    }
  ]
}
```

Rules:

- Batch size max in V1: `100` operations, minimum `1`. The whole request is rejected (`400`) if `operations` is empty, exceeds `100`, or the request body carries any field other than `operations`.
- Each operation's envelope (`entity`, `action`, `survey_id`, `client_ref`) and its `payload` are validated independently by a class DTO before the operation runs. A bad operation never aborts the batch: it yields its own `fatal_error` result with `error.code: "invalid_sync_operation"`, `error.http_status: 400` and `error.details.fields` listing the offending property names (never values or raw constraint text); every other operation in the batch is still processed.
- Unknown fields inside an operation's `payload` are silently stripped, never rejected — this keeps installed apps and older local-queue fixtures syncing across app updates. Type or format violations on fields the DTO does know about (e.g. `sync_version` sent as a string) are still fatal.
- Supported operation set in V1:
  - `survey.upsert`
  - `survey.delete`
  - `survey.visibility_update`
  - `attachment.create`
  - `attachment.delete`
- `status` can be:
  - `synced`
  - `retryable_error` (typically `429` or `5xx`)
  - `fatal_error` (typically `4xx` validation/business errors)
- `error.details` can include structured conflict metadata (example: `server_sync_version` / `client_sync_version`).
- Retryable code family:
  - `rate_limited`
  - `network_gateway_error`
  - `transient_upstream_error`
- Database data/constraint errors (PostgreSQL SQLSTATE classes `22` and `23`, e.g. a check-constraint or foreign-key violation) always return `fatal_error` with `error.code: "invalid_operation"` and a fixed generic message — never retried, and no SQL detail (constraint names, column values) ever reaches the client.
- `client_ref` is echoed back for local queue reconciliation.
- `attachment.delete` requires:
  - `survey_id` in operation envelope
  - `attachment_id` inside `payload`
- For idempotency in sync path, deleting a missing attachment can still return `synced` with `missing=true`.
- `parcel_ids` (on `survey.upsert` payloads, and on the REST `POST /surveys` / `PATCH /surveys/{id}` bodies) is bounded at `50` entries; each entry must match `^[0-9A-Z]{1,32}$` (case-insensitive) — the pattern accepts both synthetic cadastral IDs and the 14-character IGN `idu` values the server itself generates. A batch entry over the limit or containing a malformed ID is rejected the same way as any other invalid payload (`invalid_sync_operation`, `400`); on the REST routes it is a normal `400` validation error.
- `status` and `expires_at` on a `survey.upsert` payload are accepted for compatibility with installed apps and always ignored: status changes only through `POST /surveys/{id}/submit`, and `expires_at` is computed server-side at creation (`created_at` + 7 days), never moved by an upsert (D-03).
- `survey.upsert` payloads carry the method fields of `POST /surveys` (`ibp_method_version`, `ibp_cas`, `ibp_cas3_scale`, phase 01.8) with the same values, storage rule and effective-version rule. They are declared on the payload DTO, so they are kept, not stripped; an invalid value fails that operation with `invalid_sync_operation` and `details.fields` naming the fields (for example `["ibp_method_version","ibp_cas"]`), and nothing is stored.
- An upsert on a `submitted` survey that changes the value of `site_name`, `parcel_id`/`parcel_ids`, `observation_year`, `version_number`, `previous_survey_id`, `region_version`, `vegetation_stage`, `factors`, `ibp_method_version`, `ibp_cas` or `ibp_cas3_scale` returns `fatal_error` with `error.code: "survey_submitted_read_only"`, `error.http_status: 409` and `error.details.fields` listing the changed field names. Resending identical values (a pulled-survey replay) is `synced` and only refreshes `visibility`/`sync_version`; `scores` is excluded from the comparison since it is recomputed server-side (D-04, D-13). The method fields are compared as described under `POST /surveys`: an installed app that replays an untagged survey with the explicit v3.0 tag is an identical replay (`synced`), and the stored column stays `NULL`.
- An upsert with the same `sync_version` the server already stored follows the same-version rule of `POST /surveys`: identical read-only fields and visibility are `synced`; a visibility-only difference is applied last-writer-wins like `survey.visibility_update` and answered `synced`; any read-only difference returns `fatal_error` with `error.code: "sync_version_conflict"`, `error.http_status: 409`, `error.message: "Same sync_version with different content"` and `server_sync_version`/`client_sync_version` in `error.details`. The client keeps its local data (Case B in `sync-conflict-resolution-v1.md`).
- `survey_id`, the `survey.delete` payload `id`, the `survey.upsert` payload `id` and the `attachment.delete` payload `attachment_id` must match `^[A-Za-z0-9_-]{1,128}$`; otherwise that operation alone fails with `invalid_sync_operation` (`400`).
- `attachment.create` results carry the same presigned `upload_url` as the REST route: it signs `Content-Length = size_bytes`, and confirming an object of another size answers `422 attachment_size_mismatch`.

### GET /sync/changes?cursor=&limit=

Fetch user-scoped incremental changes for downsync (server -> mobile).

Query params:

- `cursor` (optional): opaque cursor from the previous response's `cursor_out`. Current format `v2:<xid8>:<seq>`. Clients must store it and send it back verbatim, never parse or build it.
- `limit` (optional): default `50`, max `200`

Rules:

- Events are returned only once their writing transaction has finished (`xid8 < pg_snapshot_xmin(pg_current_snapshot())`), ordered and paged by `(xid8, seq)`, so an event committed late is never skipped. A long-running writing transaction anywhere on the database cluster can delay new events; it never makes the feed skip one. See `sync-conflict-resolution-v1.md`, "Changes Feed Ordering".
- Legacy cursors issued before phase 01.6, in the form `<created_at>|<event or survey id>`, are still accepted: the server resumes after the user's last event at or before that point. When nothing new is available it answers with the equivalent `v2:` cursor, so installed apps switch format without an update.
- `cursor_out` is the cursor of the last returned event. With no new event it echoes the incoming cursor (or its `v2:` translation), and it is `null` when no cursor was sent.
- A malformed cursor, or a `v2:` cursor with out-of-range values, gets `400 Invalid sync cursor`. A `v2:` cursor ahead of the server's current transaction id (after a database restore) restarts the feed from the beginning.
- Surveys that never had an event are not re-sent on every poll any more; every survey has at least one event.
- `surveys` items carry `ibp_method_version`, `ibp_cas` and `ibp_cas3_scale` (phase 01.8; `null` for a survey without a version, which is v3.0). A client that rebuilds an upsert payload from a pulled survey must copy them, or it would show a pulled v3.2 survey as v3.0 (the server keeps such an untagged replay in v3.2, from the stored row).

Response `200`:

```json
{
  "cursor_in": "v2:48213:1057",
  "cursor_out": "v2:48297:1063",
  "has_more": false,
  "events": [
    {
      "id": "8ac4ff29-5f7d-4f3b-9f4f-040f5df516a6",
      "survey_id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
      "actor_id": "0b3127b6-021a-4805-a9de-b3e9f3eb2f6b",
      "event_type": "attachment_created",
      "payload": { "attachment_id": "6e0417dc-ecdb-4435-aadf-8e11b7f5f2f0" },
      "created_at": "2026-03-09T10:20:31.991+00"
    }
  ],
  "surveys": [
    {
      "id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
      "site_name": "Forest Plot 12",
      "status": "draft",
      "visibility": "private",
      "ibp_method_version": "cnpf_ibp_fr_v3_2_2026-02-02",
      "ibp_cas": 1,
      "ibp_cas3_scale": false,
      "sync_version": 3,
      "updated_at": "2026-03-09T10:20:00.002+00",
      "deleted_at": null
    }
  ],
  "attachments": [
    {
      "id": "6e0417dc-ecdb-4435-aadf-8e11b7f5f2f0",
      "survey_id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
      "storage_key": "surveys/2f3d8a59/photo-1.jpg",
      "mime_type": "image/jpeg",
      "size_bytes": 2450000,
      "created_at": "2026-03-09T10:20:31.991+00",
      "uploaded_at": null,
      "deleted_at": null
    }
  ]
}
```

## 4) Reports

### POST /reports

Report suspicious survey content.

Request:

```json
{
  "survey_id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
  "reason": "Suspicious values and duplicate photos"
}
```

Response `201`:

```json
{
  "id": "e81fbbab-06a8-49a0-87f8-e9b7f0c8dca5",
  "status": "open"
}
```

`reason` is required, trimmed, and at most 2000 characters (400 if longer). The survey owner's
`GET /surveys/{id}/events` feed shows a `reported` event without the reporter's identity or reason;
that data is kept only in the `reports` table, visible to moderators/admins.

### GET /reports?status=open&limit=&cursor=

List reports (moderator/admin), newest first (`created_at` descending, then `id` descending).
`status` (`open` or `reviewed`) is optional. `limit` and `cursor` are optional; see
[List pagination](#list-pagination-limit-cursor). Without `limit` every matching report is
returned with `next_cursor: null`, as before. The role check applies to every page (`403`
otherwise).

Response `200`:

```json
{
  "items": [
    {
      "id": "e81fbbab-06a8-49a0-87f8-e9b7f0c8dca5",
      "survey_id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
      "reporter_user_id": "0b1f7f0e-9d9c-4d2a-9a36-3b3a4c1f2e10",
      "reason": "Inappropriate photo",
      "status": "open",
      "created_at": "2026-03-08 12:30:00.123456+00",
      "reviewed_at": null,
      "reviewed_by": null
    }
  ],
  "next_cursor": "v1:eyJ0IjoiMjAyNi0wMy0wOCAxMjozMDowMC4xMjM0NTYrMDAiLCJpIjoiZTgxZmJiYWItMDZhOC00OWEwLTg3ZjgtZTliN2YwYzhkY2E1In0"
}
```

### PATCH /reports/{id}

Review a report (moderator/admin).

Request:

```json
{
  "status": "reviewed"
}
```

Response `200`:

```json
{
  "id": "e81fbbab-06a8-49a0-87f8-e9b7f0c8dca5",
  "status": "reviewed",
  "reviewed_at": "2026-03-08T13:00:00Z"
}
```

## 5) Public Map (Optional in V1)

### GET /public/map-items?from=&to=&region=&bbox=

Return anonymized public survey map items.

Inclusion rules in V1:

- `visibility = public`
- survey is not deleted
- survey is considered publishable (recommended policy: `status=submitted`)

Query + formatting rules in V1:

- `from` and `to` expect `YYYY-MM-DD`; invalid values are ignored (not rejected).
- `region` filters by exact `region_version` match. Since phase 01.8 (CH-9) a v3.2 survey
  stores no `region_version` (it uses `ibp_cas`), so `region` only ever matches v3.0 surveys,
  tagged or untagged; a v3.2 survey is never returned when `region` is set. There is no cas
  filter.
- `bbox` (optional, added in 01.9) is `minLng,minLat,maxLng,maxLat` in WGS84 degrees, for
  example `bbox=-5.2,41.3,9.6,51.1`. It keeps only the surveys with at least one linked parcel
  whose centroid lies inside the box (bounds included). It only narrows the public surveys:
  the inclusion rules above still apply.
  - A malformed `bbox` returns `400` with a fixed message that never echoes the input: not
    exactly 4 comma-separated values, a value that is not a finite number, or a min that is not
    below its max.
  - A `bbox` longer than 128 characters returns `400` from request validation.
  - An empty `bbox` is the same as no `bbox`.
  - Without `bbox` the response is the same as before 01.9, so older app versions are
    unaffected.
- Results are ordered by `submitted_at DESC` and capped to `500` items, with or without `bbox`.
- `display_location` is rounded to 2 decimals.
- Surveys missing parcel-centroid coordinates are excluded.
- `region_code` is the survey's `region_version`, or `"unknown"` when it has none (every v3.2
  survey).
- `ibp_method_version` and `ibp_cas` (phase 01.8, additive) are always present: the survey's
  method tag and v3.2 cas, each `null` when not stored. A `null` `ibp_method_version` means
  v3.0; the server sends it as `null`, never as the v3.0 tag. Clients that do not know the fields
  ignore them.

Response `200`:

```json
{
  "items": [
    {
      "survey_id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
      "display_location": { "lat": 48.64, "lng": 1.83 },
      "survey_date": "2026-03-08",
      "region_code": "ACA",
      "ibp_total": 28,
      "ibp_method_version": null,
      "ibp_cas": null
    },
    {
      "survey_id": "8b1e7c1a-2f0d-4a57-9d4c-1f2e3a4b5c6d",
      "display_location": { "lat": 45.12, "lng": 5.68 },
      "survey_date": "2026-09-30",
      "region_code": "unknown",
      "ibp_total": 31,
      "ibp_method_version": "cnpf_ibp_fr_v3_2_2026-02-02",
      "ibp_cas": 2
    }
  ]
}
```

### GET /public/community-surveys?q=&limit=

The community search of Mes Relevés (phase 12.1). Requires an authenticated member.

Rules:

- Returns the **submitted** surveys of every member, deleted ones excluded, newest `submitted_at`
  first. There is no private/public choice yet (association-only sharing): the `visibility` column
  is not read, like for the map.
- `q` (optional, at most 100 characters) keeps the surveys whose site name or author display name
  contains the text, ignoring case. `%`, `_` and `\` in `q` are literal characters.
- `limit` is 1 to 50 (default 30); a larger value is capped to 50, and the request validation
  rejects a non-integer or out-of-range one with `400`.
- Unlike the map, the answer carries the site name and the author's display name. `author_name`
  is `null` when the author deleted their account.

Response `200`:

```json
{
  "items": [
    {
      "survey_id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
      "site_name": "Forêt de Rambouillet",
      "author_name": "Camille D.",
      "submitted_at": "2026-09-28T09:41:00.000Z",
      "ibp_total": 34,
      "ibp_method_version": "cnpf_ibp_fr_v3_2_2026-02-02"
    }
  ]
}
```

### GET /public/community-surveys/{survey_id}

The page of a finished survey of any member, read-only (phase 12.1). Requires an authenticated member.

- Only a **submitted**, non-deleted survey answers; a draft, a deleted or an unknown id is `404`.
- `author_name` is the author's display name, `null` once they deleted their account.
- `parcel_ids` lists the linked parcels and `display_location` is their exact centre: **nothing is
  rounded**, unlike the public map. This is an owner decision for internal use by the association
  (2026-10-05); to revisit before the app opens to people outside it.
- `scores`, `factor_results` and the method fields (`ibp_method_version`, `ibp_cas`,
  `ibp_cas3_scale`, `region_version`, `vegetation_stage`) are those of the survey.
- `history` lists the submitted surveys that share at least one parcel with this one, this survey
  included (`is_current`), oldest first (year, then version), capped to 20. Versions are numbered
  per parcel across all authors.

### GET /public/community-surveys/{survey_id}/attachments

The uploaded files of that survey: `{ items: [{ id, mime_type, size_bytes, created_at }] }`. The
storage key is never returned. `404` for a survey that is not public.

### GET /public/community-surveys/{survey_id}/attachments/{attachment_id}/download-url

`{ url, expires_at, requires_auth }`, like the owner's route. With MinIO the URL is presigned and
`requires_auth` is `false`; in local storage mode it is
`/public/community-surveys/{survey_id}/attachments/{attachment_id}/content` and `requires_auth` is
`true`. `404` for an unknown attachment, `409` for one not uploaded yet.

### GET /public/community-surveys/{survey_id}/attachments/{attachment_id}/content

The file itself (local storage mode only, otherwise `404`), with its `Content-Type`.

### GET /public/parcels/status?bbox=&zoom=&year=

Return parcel study status for high zoom map rendering.

Rules:

- Endpoint is enabled only from configured zoom threshold (for example `zoom >= 15`).
- Output excludes personal data.
- `study_status` is derived from submitted surveys history.
- `latest_ibp_method_version` (phase 01.8, additive) is the method tag of the same latest public
  submitted survey that gives `latest_ibp_total` and `latest_observation_year`; `null` when that
  survey has no version (v3.0) or the parcel is `not_studied`. Readers that average totals over
  several parcels should say when the versions differ (ADR-003).

Response `200`:

```json
{
  "items": [
    {
      "parcel_id": "75101AB0123",
      "study_status": "studied",
      "latest_observation_year": 2026,
      "latest_ibp_total": 28,
      "latest_ibp_method_version": "cnpf_ibp_fr_v3_2_2026-02-02",
      "geometry": { "type": "MultiPolygon", "coordinates": [] }
    }
  ]
}
```

### GET /parcels/resolve?lat=&lng=

Resolve a cadastral parcel candidate from coordinates.

Response `200`:

```json
{
  "parcel": {
    "parcel_id": "75101AB0123",
    "commune_code": "75101",
    "section": "AB",
    "number": "0123",
    "centroid": { "lat": 48.8566, "lng": 2.3522 }
  }
}
```

### GET /parcels/{parcel_id}/surveys/history?limit=

Return longitudinal survey history for one parcel.

Response `200`:

```json
{
  "parcel_id": "75101AB0123",
  "items": [
    {
      "survey_id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172b",
      "observation_year": 2025,
      "version_number": 1,
      "scores": {
        "ibp_total": 24,
        "ibp_peuplement_gestion": 17,
        "ibp_contexte": 7
      },
      "factor_results": {},
      "submitted_at": "2025-06-10T09:00:00Z"
    },
    {
      "survey_id": "2f3d8a59-7c53-4fdf-8df4-8e2325b6172c",
      "observation_year": 2026,
      "version_number": 2,
      "scores": {
        "ibp_total": 28,
        "ibp_peuplement_gestion": 20,
        "ibp_contexte": 8
      },
      "factor_results": {},
      "submitted_at": "2026-06-12T09:00:00Z"
    }
  ]
}
```

## 6) Analytics (V2 Addendum, Out of MVP)

### GET /analytics/regions?year_from=&year_to=

Return aggregated IBP metrics by region.

Response `200`:

```json
{
  "items": [
    {
      "region_code": "ACA",
      "year_from": 2024,
      "year_to": 2026,
      "sample_size": 1834,
      "ibp_total_avg": 27.4,
      "ibp_total_median": 27.0,
      "ibp_pg_avg": 18.9,
      "ibp_context_avg": 8.5,
      "refreshed_at": "2026-03-10T12:00:00Z"
    }
  ]
}
```

### GET /analytics/factors/distribution?region=&year_from=&year_to=

Return factor distribution analytics (A..J) for selected scope.

Response `200`:

```json
{
  "region_code": "ACA",
  "year_from": 2024,
  "year_to": 2026,
  "sample_size": 1834,
  "factors": {
    "A": { "avg": 2.4, "median": 2.0 },
    "B": { "avg": 2.1, "median": 2.0 }
  },
  "refreshed_at": "2026-03-10T12:00:00Z"
}
```

### GET /analytics/parcels/trends?parcel_id=

Return score trend for one parcel over years/versions.

Response `200`:

```json
{
  "parcel_id": "75101AB0123",
  "items": [
    { "observation_year": 2025, "version_number": 1, "ibp_total": 24 },
    { "observation_year": 2026, "version_number": 2, "ibp_total": 28 }
  ]
}
```

## Standard Error Codes

- `400` validation error
- `401` unauthorized
- `403` forbidden
- `404` not found
- `429` rate limited
- `409` conflict/version mismatch
- `422` business rule violation
- `500` internal server error

Common business error codes (non-exhaustive):

- `parcel_required`
- `parcel_invalid`
- `parcel_version_conflict` — a submit lost a race against another submit on the same parcel; `error.details.parcel_id`/`expected_version_number` identify the conflict.
- `survey_submitted_read_only` — an upsert changed the value of a read-only field on a `submitted` survey; `error.details.fields` lists the changed field names (identical values and `scores` are always accepted).
- `survey_id_conflict` — an upsert's `id` already exists and is owned by another user.
- `invalid_sync_operation` — a `/v1/sync` operation's envelope or payload failed class DTO validation; `error.details.fields` lists the offending property names.
- `sync_version_conflict` (`409`) — an upsert carried an older `sync_version` than the stored one, or the same `sync_version` with different read-only content; `error.details` carries `survey_id`, `server_sync_version` and `client_sync_version`.
- `attachment_size_mismatch` (`422`) — the uploaded attachment's size differs from the declared `size_bytes`; the object is deleted (or never written) and the attachment stays unconfirmed.
- `invalid_operation` — a deterministic PostgreSQL data/constraint error (SQLSTATE class `22`/`23`) was raised while processing the request; the message is intentionally generic and carries no SQL detail.
- `submitted_read_only_fields` (`422`) — a `PATCH /surveys/{id}` on a submitted survey named a read-only field (since phase 01.8 including `ibp_method_version`, `ibp_cas` and `ibp_cas3_scale`).

IBP validation codes (phase 01.8; the `422` body carries their messages in `errors` and
`warnings`, see [IBP factor validation](#ibp-factor-validation-phase-018)):

- `ibp_cas_required` (blocking at submit) — a v3.2 survey has no `ibp_cas` in 1-4.
- `ibp_method_version_unsupported` (blocking) — the method version is not a known tag.
- `factor_incomplete` (non-blocking, draft) — a factor cannot be scored yet; it becomes `factor_required` at submit.
- `factor_required`, `factor_invalid_raw`, `factor_invalid_score`, `factor_a_genus_invalid`, `region_version_required`, `vegetation_stage_required` (blocking) and `factor_f_group_capped`, `consistency_a_b`, `consistency_e_f` (non-blocking).
