# Data Contract V1

## Status
Accepted for V1 baseline (validated on 2026-03-08). V1.1 parcel/history extension proposed on 2026-03-10. Auth Session entity updated on 2026-04-06 to reflect Auth0 delegation. User entity updated with `auth0_sub`. Survey entity updated on 2026-09-26 (phase 01.8, migration 016) with the per-survey IBP method version and the v3.2 cas. Survey Factor A updated on 2026-09-27 (phase 5, migration 018) from a bare genus count to a genus list, with the count derived from it.

## Purpose
Define the shared data model between mobile app, backend API, and database for the V1 scope.

## Core Design Rules
- IDs are UUID v4.
- Timestamps are ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ssZ`).
- Backend is the source of truth for business validation.
- Sync operations must be idempotent.
- Cadastral parcel identifiers (`parcel_id`/`parcel_ids[]`) are canonicalized server-side.
- Survey and attachment ids are client- or server-chosen text that must match `^[A-Za-z0-9_-]{1,128}$` (UUIDs today, `survey-<ms>` in early mobile builds), because they become storage key segments.

## Entities

### 1) User
Represents an authenticated contributor or moderator.

Required fields:
- `id` (uuid)
- `auth0_sub` (string, unique) // Auth0 user identifier (e.g. `auth0|xxx`, `google-oauth2|xxx`)
- `email` (string, unique)
- `role` (enum: `contributor` | `moderator` | `admin`)
- `first_name` (string)
- `last_name` (string)
- `display_name` (string)
- `profile_picture_url` (string, nullable)
- `profile_picture_storage_key` (string, nullable) // object storage key for the uploaded picture (`profiles/{user_id}/avatar{ext}`), read and written through `StorageService` (MinIO/S3 bucket, or the local uploads directory in local mode)
- `profile_picture_mime_type` (string, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 2) Auth Session
> **Delegated to Auth0.** Session lifecycle (access tokens, refresh tokens, rotation, revocation) is fully managed by the Auth0 tenant. The backend does not store or manage sessions directly.
>
> The backend only validates the JWT access token on each request (RS256, JWKS). No `auth_sessions` table is maintained server-side in V1.

### 3) Survey
Main IBP form entity.

Required fields:
- `id` (uuid) // generated on mobile
- `user_id` (uuid)
- `site_name` (string)
- `parcel_id` (string, nullable compatibility field = primary parcel)
- `parcel_ids` (string[], nullable in early draft, required for submit)
- `status` (enum: `draft` | `submitted` | `synced` | `error`; `expired` was removed with the deadline, OA-41, migration 019)
- `visibility` (enum: `private` | `public`)
- `observation_year` (integer)
- `version_number` (integer, starts at 1 per parcel history context)
- `region_version` (enum: `ACA` | `M`) // v3.0 only (IBP Fr v3.0 regions); stored NULL for a v3.2 survey
- `vegetation_stage` (string enum, depends on `region_version`) // v3.0 only; stored NULL for a v3.2 survey
- `factors` (jsonb) // IBP factor inputs A..J (see "IBP method version and factor payloads" below)
- `scores` (jsonb) // subscores + total
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `submitted_at` (timestamp, nullable)
- `sync_version` (integer, incremented on each local update)

Optional fields:
- `previous_survey_id` (uuid, nullable) // link to previous version/year survey on same parcel
- `parcel_snapshot` (jsonb, nullable) // optional denormalized parcel metadata at submit time
- `last_sync_error` (string, nullable)
- `last_sync_error_code` (string, nullable)
- `last_sync_error_at` (timestamp, nullable)
- `sync_blocked` (boolean/integer flag, nullable) // local conflict guard
- `deleted_at` (timestamp, nullable) // soft delete
- `ibp_method_version` (text, nullable) // phase 01.8, migration 016. `cnpf_ibp_fr_v3_0_2023-03-23` (IBP Fr v3.0) or `cnpf_ibp_fr_v3_2_2026-02-02` (IBP FR v3.2); NULL = v3.0
- `ibp_cas` (smallint, nullable) // phase 01.8, migration 016. v3.2 station case 1-4; NULL for v3.0
- `ibp_cas3_scale` (boolean, nullable) // phase 01.8, migration 016. v3.2 only: cas-3 scale for A and G (cas 2 in a cas-3 zone; lapiaz, dune, peat-bog or *Juniperus thurifera* stand); NULL for v3.0, and NULL equals false

IBP method version and factor payloads (phase 01.8, ADR-003):
- Migration 016 (`api/migrations/016_ibp_method_version.sql`) adds the three columns, nullable and with no default, so existing rows stay NULL (= v3.0) and nothing is backfilled. Constraints: `chk_surveys_ibp_method_version` (`ibp_method_version IS NULL OR ibp_method_version IN ('cnpf_ibp_fr_v3_0_2023-03-23', 'cnpf_ibp_fr_v3_2_2026-02-02')`) and `chk_surveys_ibp_cas` (`ibp_cas IS NULL OR ibp_cas IN (1, 2, 3, 4)`). The migration is additive: an API without these columns keeps serving.
- NULL means v3.0. The tag is stored as sent: an untagged survey is never stamped, and an explicit v3.0 tag is stored as the tag but equals NULL in every comparison.
- One station model per survey: a v3.0 survey stores `region_version` and `vegetation_stage` and has `ibp_cas`/`ibp_cas3_scale` NULL; a v3.2 survey stores `ibp_cas`/`ibp_cas3_scale` and has `region_version`/`vegetation_stage` NULL. The server applies this on every write.
- The method version is chosen when the survey is created (v3.2 by default in the app, v3.0 available) and is fixed once the survey is submitted, together with `ibp_cas` and `ibp_cas3_scale`.
- Factor A carries the native cover used by the cap "A at most 2 when the native cover is below 50 %": `native_cover_percent` (0-100) or `native_cover_below_50` (boolean), next to the genus data (see "Factor A: genus list" below). It is required for v3.2 and optional for v3.0. Before phase 01.8 the cover was stored on B (`covered_autochthonous_percent` / `native_cover_percent`) and capped B (BUG-1); that legacy B cover is now read only for a v3.0 survey whose A records no cover, and B is scored from its strata count alone.
- Allowed factor scores, both versions: A-F 0, 1, 2 or 5; G, H, I and J 0, 2 or 5 (G and H accepted 1 before phase 01.8, BUG-2).
- Mobile: the three fields live in the schemaless `payload_json` of `local_surveys` and in the queue payload; there is no SQLite column and `SCHEMA_VERSION` stays 2.

Factor A: genus list (phase 5, ADR-002 D-15, ADR-003 CH-12):
- A survey records the native genera it observed as a **list**, not a bare number: `factors.A.genera` (array of genus codes, e.g. `["Fagus", "Quercus_deciduae"]`), drawn from the closed CNPF regional list of 34 classes (33 genera; `Quercus` is the one genus CNPF splits into two countable classes, `Quercus_deciduae` and `Quercus_sempervirens`, IBP FR v3.2 p. 6). The **count Factor A scores from is derived from the list** (its number of distinct valid codes), never sent or stored separately. The list is validated against the CNPF list by `@cortege/ibp-domain` (`genus.ts`); an unlisted code is a blocking `factor_a_genus_invalid` issue (see `api-contract-v1.md`).
- **No species entity.** Recognition and counting are genus-level only (ADR-002 D-01): there is no species table, field or code anywhere in the contract. Table 1 of the CNPF methodology lists species per genus only to define which genus a specimen belongs to; the app never records which species was observed.
- **Not stored:** the recognition photograph (D-13) and whether the ecologist accepted or corrected a suggestion (D-14) — both are deliberately absent from every entity in this document. Phase 6 (on-device recognition) only ever writes a confirmed genus code into `genera`, exactly as if the ecologist had picked it manually.
- **The CNPF list and its exclusions**, keyed by `ibp_cas` (v3.2) — see `@cortege/ibp-domain`'s `genus.ts` for the authoritative code list:
  - the **main list** (29 taxa, 28 genera) counts under every cas;
  - **5 supplementary genera** (Ceratonia, Cercis, Olea, Phillyrea, Pistacia) count only when `ibp_cas` is 2 or 4 (v3.2 p. 3); a survey with no cas (v3.0) never counts them;
  - **Ficus** is not a valid code at all: it appears in Table 1 (p. 10-11) but not in the p. 3 genus list, and p. 6 restricts counting to listed genera (A-6);
  - **Juniperus** is in the main list unconditionally, with no coastal gate: Table 1 restricts two of its three countable species to coastal stands while the third (*J. thurifera*) carries none, and the contract only ever records the genus, never the species, so it cannot distinguish which one was observed;
  - **Pistacia** counts as a supplementary genus, per p. 3's explicit listing (the CNPF answer that resolves the ADR-003 open question against Table 2, which lists its only native species as shrubs).
- A code in `genera` that is structurally valid but not allowed at the survey's cas (a supplementary genus recorded outside cas 2/4) is silently excluded from the derived count, exactly like a genus that was not observed — it is not an error.
- **Legacy shape, kept for surveys already recorded:** `factors.A.native_genus_count` (integer), a bare count with no named genera. Surveys recorded before this phase cannot be decomposed into named genera — there is no way to know, after the fact, which genera an observer counted to reach a stored number — so their stored score is unchanged and migration 018 does not touch, backfill or reinterpret any existing `factors` value. A survey whose `factors.A` has no `genera` key keeps scoring from `native_genus_count`.
- Migration 018 (`api/migrations/018_factor_a_genus_list.sql`) adds no column: the genus list lives inside the existing `factors` JSONB, exactly like the bare count did before it. It adds one structural CHECK constraint, `chk_surveys_factor_a_genera_is_array` (`factors -> 'A' -> 'genera' IS NULL OR jsonb_typeof(factors -> 'A' -> 'genera') = 'array'`), so a malformed shape is rejected at write time; which genus codes are valid is validated in the application layer (`@cortege/ibp-domain`), not by the database — the same split as `native_genus_count`, which the database never validated either.
- Mobile: the genus list lives in the schemaless `payload_json`, like every other factor input; there is no SQLite column and `SCHEMA_VERSION` stays 2. Phase 5 defines the contract; Phase 6 builds the mobile genus-entry UI.

Factor detail arrays (phase 25.1, D-12):
- Five optional arrays sit inside the existing factor objects of `factors`: `factors.B.strata`, `factors.F.dmh_groups`, `factors.H.evidence`, `factors.I.types` and `factors.J.types` (arrays of catalogue codes, e.g. `["dmh_01", "dmh_12"]`). They record what the observer selected, so the PDF export can print it; the scored keys (`strata_count`, `trees_per_ha`, `class_score`, `type_count`) are unchanged.
- No migration and no CHECK constraint: they live in the `factors` JSONB like any other factor field, and `factors` is stored and returned verbatim (`POST /v1/sync`, `GET /v1/sync/changes`, `GET /v1/surveys/:id`), proved by `api/test/surveys-factor-details.e2e-spec.ts`.
- A detail array is written only with its scored key. The server does not validate its codes (the app keeps only known codes of the catalogue when it reads them), and the arrays are never scored: the scores equal those of the same counts without the arrays.
- Mobile: the arrays live in `payload_json` and are copied by a pull (`storage/sync.ts` copies `factors`), so a survey pulled on another phone prints the same details; there is no SQLite column.

Local-only fields (mobile SQLite `local_surveys`, never sent to the server):
- `payload_completion` (integer 0-100, `NOT NULL DEFAULT 0`) // completion of the stored payload, computed when `payload_json` is written (draft create, draft update, and pull insert/update) and backfilled from `payload_json` by SQLite migration 2 (`PRAGMA user_version` 2); an unparsable payload stores 0. The "submitted = 100" rule is status-based and is applied at read time (`CASE WHEN status = 'submitted' THEN 100 ELSE payload_completion END`), so listing surveys never parses a payload.

### 4) Attachment
Photo or media file linked to a survey.

Required fields:
- `id` (uuid)
- `survey_id` (uuid)
- `storage_key` (string) // object storage key built by the server: `surveys/{survey_id}/{attachment_id}{ext}`
- `mime_type` (string)
- `size_bytes` (integer) // must equal the uploaded byte length; a mismatch at confirm is rejected (`422 attachment_size_mismatch`)
- `created_at` (timestamp)

Optional fields:
- `captured_at` (timestamp, nullable)
- `metadata` (jsonb, nullable) // EXIF or device metadata
- `uploaded_at` (timestamp, nullable) // set once upload target is consumed
- `last_sync_error_code` (string, nullable) // local diagnostic mirror
- `last_sync_error_at` (timestamp, nullable) // local diagnostic mirror
- `deleted_at` (timestamp, nullable) // soft delete

### 5) Survey Event (Audit Trail)
Minimal audit history for reliability and moderation.

Required fields:
- `id` (uuid)
- `survey_id` (uuid)
- `actor_id` (uuid, nullable for system events)
- `event_type` (enum: `created` | `updated` | `submitted` | `synced` | `sync_failed` | `expired` | `visibility_changed` | `deleted` | `reported` | `attachment_created` | `attachment_uploaded` | `attachment_deleted` | `backfilled`)
- `payload` (jsonb, nullable)
- `created_at` (timestamp)
- `seq` (bigint, identity) // insertion order; backfilled in `(created_at, id)` order by migration 014
- `xid8` (xid8, `DEFAULT pg_current_xact_id()`) // id of the transaction that wrote the event

Indexes:
- unique (`xid8`, `seq`) // changes-feed order
- (`actor_id`) where `actor_id IS NOT NULL` // `idx_survey_events_actor_id`, migration 015

Rules:
- `seq` and `xid8` always come from the column defaults; inserts never name them.
- `GET /v1/sync/changes` returns events with `xid8 < pg_snapshot_xmin(pg_current_snapshot())`, paged by (`xid8`, `seq`); see `sync-conflict-resolution-v1.md`, "Changes Feed Ordering".
- `backfilled` events (`actor_id` NULL, payload `{"reason":"migration_014"}`) were inserted once by migration 014 for owned surveys that had no event.
- `xid8` values belong to the cluster that wrote them: after a logical dump/restore, run `UPDATE survey_events SET xid8 = pg_current_xact_id();` before starting the API (see `sync-conflict-resolution-v1.md`, "Database restore").

### 6) Sync Operation (Mobile Queue)
Tracks local operations waiting for server acknowledgment.

Required fields:
- `id` (uuid)
- `entity_type` (enum: `survey` | `attachment` | `report`)
- `entity_id` (uuid)
- `operation` (enum: `upsert` | `delete` | `create` | `visibility_update`) // `create` for attachment creation, `delete` for survey/attachment delete, `visibility_update` for offline publication toggle
- `payload` (jsonb)
- `status` (enum: `pending` | `processing` | `failed`)
- `retry_count` (integer)
- `next_retry_at` (timestamp, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Optional fields:
- `terminal_at` (timestamp, nullable)
- `terminal_reason` (string, nullable)

### 7) Report
User report for suspicious survey content.

Required fields:
- `id` (uuid)
- `survey_id` (uuid)
- `reporter_user_id` (uuid)
- `reason` (string)
- `status` (enum: `open` | `reviewed`)
- `created_at` (timestamp)
- `reviewed_at` (timestamp, nullable)
- `reviewed_by` (uuid, nullable)

Indexes:
- (`status`, `created_at DESC`) // `idx_reports_status_created`, status-filtered list
- (`created_at DESC`, `id DESC`) // `idx_reports_created_id`, migration 015, unfiltered keyset list

### 8) Public Map Item (Read Model, Optional in V1)
Anonymized representation used by community map surfaces.

Required fields:
- `survey_id` (uuid)
- `display_location` (jsonb) // exact centre of the linked parcels, 6 decimals like the stored centroids, the same point as the community survey page (owner decision 2026-10-08; 2 decimals before)
- `survey_date` (date)
- `region_code` (string) // the survey's `region_version`, or `unknown` when it has none (every v3.2 survey)
- `ibp_total` (integer)
- `ibp_method_version` (string, nullable) // phase 01.8, always present; NULL = v3.0 (sent as null, never as the v3.0 tag)
- `ibp_cas` (integer, nullable) // phase 01.8, always present; the v3.2 cas, NULL otherwise

Rules:
- The `region` filter of `/v1/public/map-items` matches `region_version` exactly, so it only matches v3.0 surveys (tagged or untagged); a v3.2 survey stores no region (CH-9).

### 9) Parcel (V1.1 Addendum)
French cadastral parcel reference used for survey linkage and history.

Required fields:
- `id` (uuid)
- `parcel_id` (string, unique canonical cadastral identifier)
- `commune_code` (string)
- `section` (string)
- `number` (string)
- `geometry` (jsonb) // polygon/multipolygon in WGS84
- `centroid` (jsonb) // `{lat, lng}`
- `created_at` (timestamp)
- `updated_at` (timestamp)

Optional fields:
- `area_m2` (number, nullable)
- `source` (string, nullable) // cadastre provider name/version

Generated columns (migration 015, `GENERATED ALWAYS AS … STORED`, never written by the API):
- `centroid_lat` (double precision, nullable) // `centroid.lat` when it is a plain decimal (number or numeric string, no exponent, at most 3 integer digits) within -90..90
- `centroid_lng` (double precision, nullable) // `centroid.lng` when it is a plain decimal within -180..180
- Both are NULL when the centroid is missing, non-numeric or out of range; PostgreSQL recomputes them on every `centroid` update.

Indexes:
- btree (`centroid_lat`, `centroid_lng`) // `idx_parcels_centroid_lat_lng`, bbox lookups (no PostGIS)
- btree (`commune_code`, `section`, `number`) // `idx_parcels_commune_section_number` (migration 022), parcel search by key

Migration 022 also enables the PostgreSQL `unaccent` extension (public schema) so the global search
matches survey and member names without accents; no column changes.

Parcel key (commune, section, number), shared by the parcels the app registers and the IGN polygons
the Explorer draws (`parseParcelIdu`, `parseWfsParcelProperties`; repaired for older rows by
migrations 020 and 021):
- A parcel registered by its IGN identifier (IDU: commune 5 digits, absorbed-commune prefix 3,
  section 2, number 4, e.g. `94080000AB0012`) takes its key from the IDU.
- `commune_code` is the IDU's commune. In Paris, Lyon and Marseille this is the **arrondissement**
  code (75101 to 75120, 69381 to 69389, 13201 to 13216), not the city's code_insee (75056, 69123,
  13055): sections and numbers restart in every arrondissement, so the city code would make two
  parcels collide. The API asks API Carto with the city's code_insee and the arrondissement's
  `code_arr`.
- `section`: a section with a letter keeps its letters only (`0A` is stored `A`, `AB` stays `AB`);
  a numbered section (Alsace-Moselle, e.g. `09`) keeps its two digits. The two forms never collide.
  An IDU section `00` is not a section (the placeholder key `00000` / `AA` / `0000` is kept).
- `number` is on 4 digits.
- Known limit: parcels of two absorbed communes (prefix other than `000`) of one commune can share
  a section and number; the key has no prefix, so both would show the same study status.

### 10) Parcel Study Status (Read Model, V1.1 Addendum)
High-zoom map layer showing whether a parcel is already studied.

Required fields:
- `parcel_id` (string)
- `study_status` (enum: `studied` | `not_studied`)
- `latest_submitted_survey_id` (uuid, nullable)
- `latest_observation_year` (integer, nullable)
- `latest_ibp_total` (integer, nullable)
- `latest_ibp_method_version` (string, nullable) // phase 01.8: method tag of the same latest public submitted survey as `latest_ibp_total`; NULL = v3.0 or no survey

### 10.1) SurveyParcel Link (V1.2 Addendum)
Association table enabling multi-parcel surveys.

Required fields:
- `survey_id` (uuid/text)
- `parcel_id` (string)
- `created_at` (timestamp)

Rules:
- (`survey_id`, `parcel_id`) is unique.
- One survey can reference multiple parcels.
- `surveys.parcel_id` remains as optional compatibility pointer to primary parcel.
- Lookups by `survey_id` use the primary key (`survey_id`, `parcel_id`); lookups by `parcel_id` use `idx_survey_parcels_parcel_id`.

### 10.2) Index notes (migration 015)
- `idx_surveys_public_submitted` on `surveys (submitted_at DESC)` where `status = 'submitted' AND visibility = 'public' AND deleted_at IS NULL` serves the public community routes.
- Dropped as redundant: `idx_users_auth0_sub` (duplicate of the unique constraint `users_auth0_sub_key`), `idx_surveys_parcel_id` (prefix of `idx_surveys_parcel_year_version`) and `idx_survey_parcels_survey_id` (prefix of `survey_parcels_pkey`).
- `auth_sessions` is dropped again with `DROP TABLE IF EXISTS … CASCADE` as a safety net (migration 011 already removed it).

### 11) Analytics Region Snapshot (V2 Addendum, Out of MVP)
Aggregated IBP metrics by region and period for Explore insights.

Required fields:
- `region_code` (string)
- `year` (integer)
- `sample_size` (integer)
- `ibp_total_avg` (number)
- `ibp_total_median` (number)
- `ibp_pg_avg` (number)
- `ibp_context_avg` (number)
- `factor_avg` (jsonb) // map A..J -> average score
- `refreshed_at` (timestamp)

Optional fields:
- `ibp_total_stddev` (number, nullable)
- `confidence_note` (string, nullable)

## Survey State Transitions (V1)
- `draft -> submitted` (required fields complete)
- `submitted -> synced` (server accepted)
- `submitted -> error` (sync failed)
- `error -> submitted` (retry attempt)
- ~~`draft -> expired` (now > `expires_at`)~~ (removed, OA-41 2026-10-06: there is no submission deadline). A survey is never refused for its age. The `expired` status and the `expires_at` column were removed by migration 019.

## Consistency Rules
- ~~`expires_at = created_at + 7 days`~~ (removed, OA-41 2026-10-06: there is no submission deadline, the column is dropped by migration 019)
- `visibility` default is `private`
- at least one parcel is required for `submitted` surveys (`parcel_ids.length >= 1`)
- `observation_year` and `version_number` are required for `submitted` surveys
- the station of the survey's method is required for `submitted` surveys: `region_version` and `vegetation_stage` for v3.0, `ibp_cas` (1-4) for v3.2 (`ibp_cas_required`)
- `submitted` surveys are read-only for observation payload (`site_name`, parcel linkage, region/stage, `ibp_method_version`, `ibp_cas`, `ibp_cas3_scale`, factors, scores)
- `submitted` surveys may still change `visibility` (`private` <-> `public`)
- Only `public` surveys are eligible for community surfaces
- Switching `public -> private` must remove the survey from community surfaces
- Deleted surveys must be excluded from user list and community surfaces
- Server recomputes/validates scores before final accept, under the survey's method version (NULL = v3.0)
- Server validates that all selected parcels exist
- For a given parcel history context, `version_number` must be strictly increasing

## Idempotency Rules
- Primary key for survey upsert idempotency: (`id`, `sync_version`)
- Same payload replay must return success without duplication
- Older `sync_version` must be rejected with conflict (`409`)
- Parcel/version conflicts can return `409` with structured details (`parcel_id`, expected_version_number, client_version_number)

## Out of Scope for Data Contract V1
- Full event sourcing model
- Advanced anti-cheat scoring model
- Team/organization rankings data model
