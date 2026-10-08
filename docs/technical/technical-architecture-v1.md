# V1 Technical Architecture (Blocks and Responsibilities)

> **Partly superseded — 2026-09-22.** The `auth_sessions` table listed under core tables below was
> dropped by `api/migrations/011_auth0_migration.sql` when authentication moved to Auth0. For the
> structure as actually implemented, read `.planning/codebase/ARCHITECTURE.md`, generated from the
> code. This document remains the reference for *intent*: block responsibilities, the A–L technical
> flows, and the security baseline.

## Status
Aligned with accepted V1 data/API contracts (updated on 2026-03-08). V1.1 parcel/history extension proposed on 2026-03-10. Auth0 delegation and account deletion flow added on 2026-04-06. Shared IBP domain package and per-survey method version added on 2026-09-26 (phase 01.8, block 8 and flow M).

## Objective
Define a simple, scalable, and pragmatic architecture to deliver a reliable IBP MVP.

## Architecture Blocks
- Mobile app (iOS/Android)
- Backend API
- Relational database
- Object storage for photos and profile pictures
- External services (maps/geocoding, donation provider)
- Cadastral parcel service/layer (France)
- Optional public read model for map surfaces
- Optional analytics aggregation read model (V2)

## Responsibilities by Block

### 1) Mobile App
- Screens, IBP form UX, baseline client validation
- Local survey persistence (drafts and pending sync operations)
- Sync queue handling (retry and error state management)
- Photo capture and geolocation collection
- Parcel lookup/selection UX and parcel history visualization
- Profile management UI (`/me`)
- Auth flows via Auth0 SDK (login, sign-up, social providers, logout, token refresh — all delegated to Auth0)

### 2) Backend API
- JWT validation (Auth0 RS256/JWKS) and user auto-provisioning on first login
- Auth0 Management API calls (email update, password reset trigger, account deletion)
- User profile read/update/delete
- Survey CRUD and business workflow enforcement
- Server-side IBP validation and score verification, delegated to the shared IBP domain package (block 8)
- Parcel linkage validation (`parcel_id`) and versioning checks (`observation_year`, `version_number`)
- Final survey status transitions
- Minimal audit trail recording
- Attachment upload orchestration (record + signed upload URL)
- Reporting and moderation actions
- Public map read endpoint (anonymized data only)
- Parcel history read endpoints (scores and factors over years)

### 3) PostgreSQL
- Core tables: `users`, `auth_sessions`, `surveys`, `attachments`, `survey_events`, `reports`, `parcels`
- Status integrity constraints
- Query indexes for search (`site_name`, `status`, `date`)
- Query indexes for parcel workflows (`parcel_id`, `observation_year`, `version_number`)
- Role-based access for moderation endpoints

### 4) Object Storage
- Survey media files (photos) and user profile pictures
- One API service, `StorageService` (`api/src/storage/`), owns object storage: the single S3 client, the bucket (default `ibp-media`), key building, presigned PUT/GET, put, head, get and delete. MinIO/S3 in production (`OBJECT_STORAGE_MODE=minio`), the local uploads directory in development (`local`, with every resolved path contained under the upload root).
- Storage keys are built only from ids that match `^[A-Za-z0-9_-]{1,128}$` (checked at routes, DTOs and again in the key builder) and from an allow-listed MIME type.
- Attachments are served through short-lived presigned GET URLs; profile pictures are streamed by the API (`GET /me/profile-picture`, Bearer auth).

### 5) Optional Public Map Read Model
- Materialized/read table for public map payloads
- Reduced geographic precision
- Strict exclusion of private/deleted surveys

### 6) Cadastral Parcel Layer (V1.1 Addendum)
- Resolve parcel from point (`lat/lng`) and serve parcel geometry metadata.
- Provide high-zoom parcel status overlay (`studied` vs `not_studied`).
- Support mobile caching strategy for recently viewed parcel areas.

### 7) Analytics Aggregation Read Model (V2 Addendum)
- Build region/year/factor aggregates for Explore insights.
- Provide trend-oriented payloads without exposing personal data.
- Refresh with scheduled jobs or incremental updates from submitted surveys.

### 8) Shared IBP Domain Package (phase 01.8)
- `packages/ibp-domain` (`@cortege/ibp-domain`) is a third npm workspace: plain TypeScript, pure
  functions, no runtime dependencies. It holds the IBP rules once for both sides:
  - the factor keys and the allowed scores per factor;
  - the method version tags (IBP Fr v3.0 and IBP FR v3.2) and `resolveMethodVersion`;
  - scoring and draft/submit validation per version (`evaluateIbp`, `computeRetainedScores`,
    `computeTotals`), submit readiness and the v3.0 → v3.2 draft migration;
  - the v3.0 region/stage model and the v3.2 cas model (`ibp_cas`, `ibp_cas3_scale`);
  - the interpretation bands (`standBand`, `contextBand`, `totalBand`, `bandTone`, `IBP_MAX`);
  - the survey, sync and public-map wire types.
- Hybrid resolution. `main` points to `dist` (built by `tsc`, `npm run build:domain`), `types` and
  `react-native` point to `src`:
  - Metro, both Jest configs (a `moduleNameMapper`) and `tsc` read `src`, so the app bundles the
    package from source and needs no build step;
  - Node at runtime reads `dist`: the API Docker image builds the package in its builder stage and
    copies only its `dist`, and `npm run dev:api` builds it first.
  - The package has no `prepare` script on purpose: it would run even under
    `npm ci --ignore-scripts` and break the image's runtime stage. The api and mobile workspaces
    depend on it with the version `"*"`.
- Each side keeps a thin adapter and no rule code:
  - API: `IbpRulesService` (`api/src/surveys/ibp-rules.service.ts`), whose `validateDraft` and
    `validateSubmit` call `evaluateIbp`;
  - mobile: `mobile/src/app/ibp-scoring.ts`, which adds only the app's own `parcel_ids`
    readiness check.
- Parity fixture. `IBP_PARITY_CASES` (`packages/ibp-domain/src/parity/cases.ts`) is the executable
  form of [`ibp-validation-matrix-v2.md`](ibp-validation-matrix-v2.md): the same case ids, every
  factor under both versions, plus the dispatch cases. The package runs it, and the API
  (`api/test/ibp-parity.spec.ts`) and the app (`mobile/src/app/ibp-parity.test.ts`) run it again
  through their adapters, which proves both delegate to the package. The readiness and migration
  fixtures (`IBP_READINESS_CASES`, `IBP_MIGRATION_CASES`) run on the app side.

## Main Technical Flows

### A) Login
1. Mobile authenticates via Auth0 (Universal Login, social provider, or email/password)
2. Auth0 issues a signed JWT access token (RS256) and a refresh token
3. Mobile stores tokens in encrypted local storage
4. Mobile sends `Authorization: Bearer <token>` on every API request
5. Backend `AuthGuard` validates the JWT against Auth0's JWKS endpoint
6. On first login, backend auto-provisions a DB user record from Auth0's `/userinfo`; if a user with the same email already exists, the `auth0_sub` is linked to that record
7. Mobile refreshes the access token directly with Auth0 when it expires

### B) Save Draft Offline
1. User fills in the form
2. Mobile stores survey locally (SQLite)
3. Local status remains `draft`

### C) Synchronization
1. Connectivity is detected
2. Mobile sends queued operations (`pending`)
3. API validates and persists accepted payloads
4. Mobile updates local status to `synced` or `error`

### D) Profile Update
1. Mobile sends `PATCH /me` with editable fields
2. API validates and persists profile changes
3. Mobile updates local profile cache

### E) Attachment Upload
1. Mobile requests attachment creation (`POST /surveys/{id}/attachments`) with the file's exact `size_bytes`
2. API returns `attachment_id`, `storage_key`, and signed `upload_url`; in MinIO/S3 mode the presigned PUT signs `Content-Length = size_bytes`, so the store refuses a body of another length
3. Mobile uploads file to object storage
4. Mobile calls `confirm_url`; the API compares the stored size with `size_bytes` and answers `422 attachment_size_mismatch` (object deleted, attachment left unconfirmed) on a difference, otherwise sets `uploaded_at`
5. Survey references attachment in subsequent sync payloads

### F) Report and Moderation
1. User creates report (`POST /reports`)
2. Moderator lists open reports (`GET /reports?status=open`)
3. Moderator updates report state (`PATCH /reports/{id}`)

### G) Public Map Read
1. Client requests public items (`GET /public/map-items`), optionally limited to a viewport with `bbox=minLng,minLat,maxLng,maxLat`; without `bbox` the response is unchanged
2. API returns anonymized items from read model
3. Only surveys with `visibility=public` and not deleted are exposed
4. Mobile viewport loading (phase 01.9, D-05):
   - The map loads the items of the visible `bbox` once the region has settled for 400 ms (`useMapViewport`, `useDebouncedValue`). `usePublicMapExplorer` skips a request equal to the one in flight or the last completed one, and drops stale responses.
   - The camera fits the items only after the first load and after an explicit filter apply (which loads every matching item, without `bbox`). It never re-fits after a viewport load: moving the camera would change the `bbox` and trigger another load, in a loop.
   - The Explorer tab press forces a reload of the last viewport `bbox`.
   - The cadastre parcel layer is loaded on the same debounce, from zoom 15.
5. Mobile clustering: markers are grouped on the device with `supercluster` (radius 60 px, clusters up to zoom 16, `useMapClusters`). Survey and cluster markers are memoised and their presses pass ids. A cluster tap zooms to its expansion zoom; when the cluster cannot split (surveys of the same parcels share one exact point, and surveys close together stay merged at the last cluster zoom), it opens the list of its surveys instead.
6. No personal data: `display_location` is the exact centre of the survey's linked parcels (public cadastre information), no longer rounded to 2 decimals (owner decision 2026-10-08), so a survey's dot sits on its parcel. The map shows scores, dates and region codes, never survey ids.

### H) Parcel Resolution and Versioning
1. Mobile captures GPS or manual address
2. API/service resolves candidate cadastral parcel (`parcel_id`)
3. User confirms parcel linkage in create/update flow
4. API validates parcel existence and version sequencing at submit

### I) Parcel History Comparison
1. Mobile requests parcel survey history
2. API returns chronological submitted surveys with totals and factor results
3. Detail screen renders trend and deltas for comparison

### J) High Zoom Parcel Map Status
1. Client reaches high zoom threshold in create/update/detail/explore map
2. Mobile requests parcel status layer by bbox/zoom
3. API returns parcel statuses without personal data
4. Client renders parcel boundaries and `studied`/`not_studied` state

### K) Explore Analytics (V2)
1. Client requests analytics aggregates (regions/factors/trends)
2. API serves pre-aggregated read models
3. UI renders insights with confidence/sample indicators

### L) Account Deletion (US-A7)
1. User confirms deletion in the mobile app (explicit confirmation step)
2. Mobile calls `DELETE /me`
3. Backend calls Auth0 Management API (`DELETE /api/v2/users/{auth0_sub}`) using a M2M token with `delete:users` scope
4. Auth0 deletes the user and invalidates all active tokens
5. Backend deletes personal data from DB (name, email, profile picture file and DB fields)
6. Backend anonymises surveys (removes user reference, retains observation data)
7. API returns `204`; mobile clears local state and redirects to login screen

### M) IBP Method Version per Survey (phase 01.8)
1. The observer picks the method when creating a survey: IBP FR v3.2 by default, IBP Fr v3.0
   available. v3.2 surveys record `ibp_cas` (1-4) and `ibp_cas3_scale`; v3.0 surveys record
   `region_version` and `vegetation_stage`.
2. Storage:
   - API: migration `016_ibp_method_version.sql` adds nullable `surveys.ibp_method_version`,
     `ibp_cas` and `ibp_cas3_scale` columns, with CHECK constraints (the two known tags, cas 1-4)
     and no backfill. The upsert, PATCH and `/sync` DTOs accept the three fields; detail and
     `/sync/changes` return them.
   - Phone: the three fields live in the schemaless survey `payload_json` and the queued upsert
     payloads. There is no SQLite migration (`SCHEMA_VERSION` stays 2).
3. Dispatch rule: a missing version (`null`) is v3.0. Every survey recorded before phase 01.8 is
   untagged and is never stamped; the explicit v3.0 tag and `null` compare as the same method. An
   unknown tag is rejected (`400`, or `invalid_sync_operation` on `/sync`).
4. Each write is scored under the survey's effective version: the version sent, else the stored
   one. The v3.2 write clears region/stage, the v3.0 write clears the cas fields.
5. An unsubmitted v3.0 draft can be switched to v3.2 (`migrateDraftToV32`). After submit, the
   version, cas and flag are read-only (`409 survey_submitted_read_only` on replays, `422` on
   PATCH).
6. Public reads: map items carry `ibp_method_version` and `ibp_cas`; parcel statuses carry
   `latest_ibp_method_version`. The region filter matches v3.0 surveys only.
7. Totals are shown out of 50. The stand (/35) and context (/15) sub-scores use the CNPF bands.
   The /50 total bands (10/20/30/40) are an app convention under the owner's review.

## Security and Compliance Baseline (V1)
- TLS for all API communication
- Encrypted local storage for sensitive mobile data
- Anonymized/pseudonymized data for public surfaces
- Logging of critical actions
- `user_id` ownership enforced server-side from authenticated context

## Out of Scope for V1
- Advanced moderation workflows
- Advanced push notification workflows
- Full data warehouse architecture
- Full national cadastral offline mirror on device
- Explore advanced analytics dashboards (regional/global insights)
