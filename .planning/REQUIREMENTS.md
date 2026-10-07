# Requirements: Cortege — IBP

**Defined:** 2026-09-22
**Milestone:** MVP — internal-only, field-test ready
**Core Value:** An ecologist can complete a full IBP survey offline on a real parcel and have it reach the server intact on reconnection — no data loss, no duplicates.

**ID convention:** `REQ-{epic}-{slug}`, carried over from `.planning/intel/requirements.md`. Slug IDs
are used instead of the original `US-*` IDs because Epic D reuses three story IDs for six stories
(see `REQ-DOC-epicd-ids` below). New IDs introduced by this milestone use the same shape with the
prefixes `ML` (species recognition groundwork), `INF` (infrastructure), `QA` (quality and defects),
`DOC` (documentation accuracy) and `FT` (field tests).

**Build status legend:**

| Status | Meaning |
|--------|---------|
| Built | Implemented and working; this milestone verifies it in the field |
| Partial | Implemented but its scope changes in this milestone |
| New | Not built |

> **Scope note.** The release labels in `.planning/intel/requirements.md` are the original ones and
> are partly obsolete. This document is authoritative. The app is internal-only for this milestone;
> the entire community/social dimension is deferred.

---

## MVP Requirements

### A — Access and Security

Five of six are Built and field-tested (`docs/user-tests/epic-a-access-and-security.md`, 28 cases);
two of those five carry open defects, fixed in Phase 28. Account deletion is Partial: the API path
is built and untested-by-necessity (no mobile entry point existed to test), fixed in Phase 11.
Social login was found unbuilt on 2026-09-27 (no code anywhere in `mobile/src`, despite this
document previously marking it "Built") and is moved to **Deferred — Next Milestone** below —
`docs/specs/epic-a-access-and-security.md`'s own test plan already treats it that way.

- [x] **REQ-A-login** — Contributor logs in with credentials; session survives app restarts. *(Built)*
- [x] **REQ-A-logout** — Contributor logs out from the profile menu and returns to login. *(Built)*
- [ ] **REQ-A-signup** — Contributor creates an account with email + password, with validation, verification and actionable errors. *(Built — `BUG-A3-4` open: duplicate email shows a generic Auth0 error)*
- [x] **REQ-A-profile** — Contributor views and edits first name, last name, display name and profile picture (camera or gallery). *(Built)*
- [ ] **REQ-A-forgot-password** — Contributor requests a reset link, single-use and expiring after 24 h. *(Built — `BUG-A6-2` open: reset email lands in spam, an Auth0 tenant setting)*
- [x] **REQ-A-delete-account** — Contributor deletes the account irreversibly; personal data erased, submitted surveys anonymised and retained. *(Partial — API (`DELETE /me`) built and correct; no mobile entry point exists. Corrected 2026-09-27, was wrongly marked "Built". Build in Phase 11)*

### B — Survey Preparation

- [x] **REQ-B-survey-list** — Contributor sees their surveys with parcel ids, name, last update, version, status and completion rate; filterable by status and date; visible offline. *(Built)*
- [x] **REQ-B-survey-detail** — Contributor sees survey detail with submission deadline, completion rate, previous surveys on the same parcel, and IBP total + factor-level deltas against previous versions. *(Partial — the parcel-history API (`GET /parcels/:parcelId/surveys/history`) exists but no mobile screen calls it. Corrected 2026-09-27, was wrongly marked "Built". Build in Phase 11)*
- [x] **REQ-B-manage-published** — Contributor deletes their **own** survey with a confirmation step; the deleted survey leaves their list. **Scope reduced: the private/public visibility toggle is removed for this milestone — every submitted survey is visible by default to every authenticated association member.** *(Built — Phase 19 verified the delete/confirmation flow was already complete; corrected from "Partial", which described the Phase 11 visibility-toggle removal, not this flow)*
- [x] **REQ-B-own-surveys-map** — The map screen requires authentication and shows the surveys submitted by any association member — not an anonymous public set, and not only the contributor's own. `PublicMapScreen` and its navigation are kept; only the data source and the auth requirement change. `GET /public/map-items` and `GET /public/parcels/status` require authentication instead of staying open. *(New — redefined 2026-09-27 from "own surveys" to "members' surveys"; created by this milestone)*

### C — IBP Survey Data Entry

- [x] **REQ-C-guided-entry** — Contributor completes all ten IBP factors (A–J) in a guided form with required-field marking, appropriate field types and per-field validation errors. *(Built)*
- [x] **REQ-C-save-draft** — Draft saves automatically while editing, is available offline, shows its last-modified date, and warns under 24 h before expiry. *(Built)*
- [x] **REQ-C-photos** — Contributor adds up to 10 photos per survey, previews and removes them before submission; photos stay linked after sync. *(Built)*
- [x] **REQ-C-parcel-linkage** — Contributor taps parcel polygons to select or deselect them; a survey references one or many parcels (`parcel_ids[]`); the map can centre on current location; submission is blocked when linkage is missing or invalid. *(Built)*
- [x] **REQ-C-submit** — Submission is blocked until all ten factors are scoreable and parcel linkage metadata is present, blocked past 7 days, states the explicit reason when blocked, and transitions to `submitted` + read-only with automatic sync. *(Built)*
- [x] **REQ-C-help** — Each complex field exposes on-demand pedagogical help that does not lose form progress. *(Built)*
- [ ] **REQ-C-versioning** — A survey carries an explicit version number and observation year; the app proposes the next version on an already-studied parcel and shows previous scores. *(Partial — `version_number`/`observation_year` are recorded (`api/migrations/008_parcels_and_versioning.sql`), but no next-version suggestion or previous-scores UI exists. Corrected 2026-09-27, was wrongly marked "Built". Originally labelled V1; promoted to MVP because parcel history is in scope. Build in Phase 11)*
- [x] **REQ-C-species-recognition** — From the Factor A section, the contributor photographs a single subject and the app suggests the most likely tree **genus** with its alternatives, each carrying a per-genus calibrated plain-words confidence indicator; all 34 CNPF genera are suggested; the contributor confirms each suggestion and the accepted genus is saved in Factor A's genus list; recognition runs on-device with the model bundled in the app, and works in airplane mode. *(New — US-C9. Revised 2026-09-26 to match ADR-002. Gated behind `REQ-ML-adr` (satisfied) and `REQ-ML-contracts` (satisfied); Built in Phase 15, closed 2026-09-27 — the real MD5-verified `genus_classifier.tflite` and its labels are in place (PR #176 then #178), preprocessing confirmed by inspecting the source SavedModel rather than assumed. Two verifications explicitly deferred to Phase 28's field validation, by owner decision: a real Android device latency/accuracy run (closing Phase 1's own accepted deviation), and real-device recognition accuracy against actual tree photographs. See `.planning/phases/15-genus-recognition-factor-a/`)*
- [x] **REQ-C-pdf-export** — Contributor exports a survey as a PDF generated **on device** (expo-print) and delivers it through the OS share sheet (expo-sharing) to any installed target — Google Drive, Wimi, mail, AirDrop. Must work offline. No API endpoint, no direct Drive OAuth integration. *(Built — Phase 19)*

### D — Offline and Synchronization

- [x] **REQ-D-offline-work** — Contributor views loaded surveys and edits drafts offline; actions are queued; parcel linkage metadata and recent cadastral context are available offline. *(Built)*
- [x] **REQ-D-auto-sync** — On reconnection, pending surveys are sent automatically with no manual trigger; status becomes `synced`, or `error` with an actionable message; downsync includes parcel history. *(Built)*
- [x] **REQ-D-conflict-resolution** — A server-rejected parcel/version conflict is stored as a clear blocking error explaining expected vs local state; the contributor retries after correction or discards. *(Built)*
- [x] **REQ-D-offline-map** — A clear offline indicator is shown; the map renders a basemap and locally available parcels; GPS position displays and can be followed; zoom, pan and parcel selection work with no connectivity. *(New — Built, closed Phase 17: `OfflineIndicatorBadge`, `OfflineBasemapTile` switching to local tiles, `ParcelOverlayPolygons` fed from the offline parcel-status cache; GPS follow and zoom/pan/selection were already device-local and untouched. Not checked on a real device in airplane mode — see `17-CONTEXT.md`/ROADMAP Phase 17 status note.)*
- [x] **REQ-D-area-download** — Contributor selects an area, sees estimated size and download progress, lists and deletes downloaded areas, and the area survives an app restart. *(New — Built, closed Phase 17: `OfflineAreasSheet` + `useOfflineAreas`, tiles and parcel cache persisted under the document directory and a new SQLite migration, so a relaunch reopens the same downloaded state. The actual force-quit/relaunch has not been run on a device in this cloud session.)*
- [x] **REQ-D-offline-parcel-warning** — When an expected parcel is not cached, a clear message explains it and a quick action starts the download once the network returns; no infinite spinners. *(New — Built, closed Phase 17: `ParcelHistoryCard`'s offline state plus the `offline_pending_parcels` queue drained by `useOfflinePendingParcelDrain` on reconnect.)*
- [x] **REQ-D-basemap-switch** — A basemap selector toggles at least "Satellite" and "Map"; the selection persists while navigating; the default is configurable. *(New — Built, closed Phase 17: `BasemapToggle` + `useBasemapPreference`, persisted to `local_meta`. "The default is configurable" is satisfied as a code-level constant (`DEFAULT_BASEMAP` in `storage/map-preference.ts`), not a user-facing settings toggle — no such settings surface exists elsewhere in the app either.)*

### ML — Species Recognition Groundwork

Blocking prerequisites for `REQ-C-species-recognition`. Both exist because US-C9 is invisible to
every binding contract (conflict-report warning 5).

- [x] **REQ-ML-adr** — An accepted ADR records the on-device ML approach: inference runtime, model and licence, on-device model size, measured latency and accuracy on real iOS and Android devices, offline-vs-online behaviour, and an explicit go/no-go for US-C9 in this milestone with a stated fallback. *(New — satisfied 2026-09-26 by ADR-002 (Accepted), **with one accepted deviation**: no real Android device was measured, by user decision; see `01-VERIFICATION.md` override. The Android latency run and accuracy spot-check must close before Phase 15 ships.)*
- [x] **REQ-ML-contracts** — `docs/technical/data-contract-v1.md` redefines Factor A as a list of observed native genera from the CNPF regional list, with the count derived from it (ADR-002, D-15); `docs/technical/api-contract-v1.md` documents that shape in the survey payload under `/v1`; a migration implements it and preserves the scores of surveys already recorded as a bare count. The genus list round-trips through `POST /surveys/sync` idempotently. No species entity, no recognition endpoint, no stored suggestion outcome (D-01, D-06, D-14). *(New — revised 2026-09-26 to match ADR-002; Built — closed Phase 14)*

### INF — Infrastructure

- [x] **REQ-INF-hosting-adr** — A new ADR ratifies the **current VPS** as the hosting target: Docker + Caddy + GHCR + systemd timer + MinIO on `cortege.algernon.ovh`. Supersedes the unratified alwaysdata + Cloudflare R2 note. Closes conflict-report warning 7. Not a hosting migration. *(New — closed Phase 20: `docs/technical/adr-004-hosting-and-infrastructure-v1.md`)*
- [x] **REQ-INF-backups** — PostgreSQL leaves PoC status: a scheduled backup runs unattended and a restore into a clean database has been performed and recorded at least once. *(New — closed Phase 20: `infra/vps/backup-postgres.sh`/`restore-postgres.sh`/`cortege-backup.timer`, rehearsed locally)*
- [x] **REQ-INF-migrations** — Migrations run reliably on deploy: a fresh database and the production database reach the same schema version through a documented path, and a failed migration does not leave the schema half-applied. *(New — closed Phase 20: `api/migrations/README.md`, verified with a deliberately broken migration)*
- [x] **REQ-INF-deadcode** — `api/src/users/email.service.ts` (orphaned since the Auth0 migration — imported nowhere, registered in no module) and the vestigial `SMTP_*` env vars are removed from the repo, `api/.env.example` and the deployment env. *(New — already true since phase 01.9, verified in Phase 20)*

### QA — Quality and Defects

- [x] **REQ-QA-ibp-version** — The IBP method version the app implements is established and ratified. The repo cites IBP Fr v3.0 (PDFs dated 2023-03-23); the CNPF's current publication is FR v3.2 (dated 2026-02-02). All ten factors are compared, every divergence is recorded against `ibp-rules.service.ts`, `ibp-scoring.ts` and the 17-case validation matrix, and a documented decision either migrates to v3.2 or stays on v3.0 for stated reasons. *(New — surfaced by Phase 1 research)*
- [x] **REQ-QA-sql-injection** — A lint rule rejects interpolating values into SQL strings. *(Re-scoped 2026-09-23: account deletion in `api/src/users/users.service.ts` interpolates only constant subqueries and binds the user id as `$1`, so there is no injection today; the requirement now prevents one from appearing — closed Phase 20: `api/eslint-local-rules/sql-no-unsafe-interpolation.js`)*
- [x] **REQ-QA-indexes** — `survey_events(actor_id)` is indexed, and the redundant `idx_users_auth0_sub` (duplicates the UNIQUE constraint), `idx_survey_parcels_survey_id` (duplicates the primary-key prefix) and `idx_surveys_parcel_id` are dropped. *(Re-scoped 2026-09-23: the three indexes originally listed already exist — migrations 003, 009 and 011 — closed Phase 20: index work already done by migration 015, `EXPLAIN` evidence recorded in `.planning/phases/20-durable-backend/evidence/`)*
- [ ] **REQ-QA-screen-tests** — The survey list, survey detail, survey form and map screens have tests covering sync-status, filter and error states. 9 of 12 screens have no coverage today. *(New)*
- [ ] **REQ-QA-bug-a3-4** — Sign-up with an already-registered email shows a specific message inviting the user to log in, not a generic Auth0 error. *(New — `BUG-A3-4`, medium)*
- [ ] **REQ-QA-bug-a6-2** — Password-reset email deliverability is closed as an **Auth0 tenant configuration** item (sender domain / DKIM), with the tenant change recorded. Explicitly **not** an SMTP fix. *(New — `BUG-A6-2`, re-scoped)*
- [ ] **REQ-QA-visual-modernisation** — The interface is visibly more pleasant, modern and dynamic: a written visual direction approved by the owner, applied to the main screens in light and dark mode, with consistent Reanimated motion that respects reduced-motion, and no regression on field ergonomics or accessibility. *(New — owner decision 2026-10-06, Phase 23)*
- [ ] **REQ-B-nearby-parcels-home** — The Home lists the parcels near the user and starts a survey on the chosen one, with clear empty, offline and location-refused states. *(New — owner decision 2026-10-07, SEED-004; built within Phase 23, to be checked off when Phase 23 closes)*
- [ ] **REQ-C-history-split** — The survey change log and the history of earlier surveys on the same parcel are two distinct entries, and another member's survey shows the parcel history only. *(New — owner decision 2026-10-07, SEED-002 / OA-124, Phase 24)*
- [ ] **REQ-B-global-search** — One search covers the whole app: the member's own surveys, the other members' surveys, places and parcels on the map, and the other items the app exposes, with grouped results that lead straight to the item. *(New — owner decision 2026-10-07, SEED-003, Phase 25)*
- [ ] **REQ-QA-ux-audit** — A documented UX/UI audit of every screen (light and dark) checks global coherence, accessibility and visual bugs, the design system and charter are updated to match Phase 23, and every *blocker before field tests* finding is fixed and confirmed by the owner. *(New — owner decision 2026-10-07, Phase 26)*
- [ ] **REQ-QA-deep-audit** — A documented in-depth audit of code quality, test coverage, architecture and security exists in `docs/audits/`, re-checks the 2026-09 audit's findings, triages every finding, and every *blocker before field tests* is fixed and verified. *(New — owner decision 2026-10-06, Phase 27)*

### DOC — Documentation Accuracy

- [x] **REQ-DOC-form-spec** — `docs/specs/ibp-form-spec.md` §4 is corrected to "one or many cadastral parcels (`parcel_ids[]`)" and §10.1 to the shipped status enum `draft | submitted | synced | error | expired` with `submitted_at` and `deleted_at`, no `deleted` value and no `published_at`. Closes conflict-report warnings 1 and 2. *(New — Built, closed Phase 14)*
- [ ] **REQ-DOC-taxonomy** — The three-phase taxonomy (MVP / V1 / V2) is adopted and `docs/specs/user-stories.md` §4 — currently titled "Scope (V1)" for the whole first release — is retitled accordingly. Closes conflict-report warning 3. *(New)*
- [ ] **REQ-DOC-epicd-ids** — The duplicate `US-D1` / `US-D2` / `US-D3` IDs in `docs/specs/epic-d-offline-and-synchronization.md` are renumbered so the six stories have six distinct IDs. Closes conflict-report warning 4. *(New)*

### FT — Field Tests

- [ ] **REQ-FT-field-tests** — Field-test reports exist for Epics B, C and D in the form of `docs/user-tests/epic-a-access-and-security.md`, each case with a recorded outcome, including at least one full offline-survey-to-sync run on a real parcel verified for completeness and absence of duplicates. *(New — this is the milestone's success metric)*

---

### AUD — Code Audit Remediation (2026-09)

Source: `docs/audits/audit-2026-09-code-complet.md` (findings) and `docs/audits/plan-remediation-2026-09.md`
(lots L1–L20). All twenty lots are in this milestone: the lots that threaten the core value — no data
loss, no duplicates — or that expose accounts run first (Phases 3–6), the rest right after (Phases 7–10).

- [x] **REQ-AUD-session-data-loss** — A token-refresh failure caused by the network, a timeout or an unknown error never deletes local surveys, photos or the sync queue; only an explicit refresh-token rejection ends the session, the queue survives re-login with the same account, and logout with unsynced work purges only after a confirmation that counts it. The 401 retry forces a token refresh. The pre-Auth0 session stubs are removed. *(Audit M-C1 — critical. Lot L1)*
- [x] **REQ-AUD-rate-limit** — Rate limiting keys on the real client behind Caddy (`trust proxy` loopback, per-user tracker) with production limits that one syncing device cannot exhaust for everyone. *(Audit A-C1 — critical. Lot L2)*
- [x] **REQ-AUD-debug-surface** — `DebugModule` and the HS256 test-token path are not loaded in production. *(Audit A-H4. Lot L2)*
- [x] **REQ-AUD-identity** — Email-based account linking requires `email_verified === true`; first-login provisioning is race-free; a report does not expose the reporter to the reported surveyor; report reasons are length-bounded. *(Audit A-H1, A-M6. Lot L3)*
- [x] **REQ-AUD-mobile-quick-fixes** — Developer tools are absent from production builds; the nearby-parcels bbox uses `minLng,minLat,maxLng,maxLat`. *(Audit M-H5, M-H3. Lot L4)*
- [x] **REQ-AUD-ci-pipeline** — CI runs typecheck, path-filtered jobs, least-privilege permissions, timeouts, SHA-pinned actions, coverage with ratcheting thresholds, a dependency audit at `high` and a mobile build check (`expo-doctor`, `expo export`). *(Audit CI-1, CI-3–CI-6, T1. Lot L5)*
- [x] **REQ-AUD-reproducible-image** — The API image installs from the root lockfile with `npm ci`, runs as non-root with a healthcheck, is tagged by commit SHA, and is pushed only from `main` under a deploy concurrency group. *(Audit CI-2. Lot L6)*
- [x] **REQ-AUD-test-infra** — Mobile tests run real SQL on in-memory SQLite and test hooks with `renderHook`; `*.test.tsx` is collected; the E2E database is reset before each run. *(Audit T3–T5. Core of lot L7)*
- [x] **REQ-AUD-sync-validation** — Sync operation payloads are validated by class DTOs; upsert ignores client `status`/`expires_at` and cannot overwrite a submitted survey; `parcel_ids` is bounded; deterministic database errors are fatal with generic messages. *(Audit A-H2, A-M2, A-M5. Lot L8)*
- [x] **REQ-AUD-transactions** — Every multi-statement API write runs in one transaction with its event, the upsert is guarded on `sync_version`, concurrent submits on a parcel resolve to one success and one 409, and account deletion commits in the database before deleting the Auth0 user. *(Audit ARCH-3, A-M1, A-M7, A-M9. Lot L9)*
- [x] **REQ-AUD-sync-engine** — The mobile queue drains single-flight, in batches of at most 100, marks a survey synced only when its queue is empty, honours the documented retry cap without counting network/5xx errors, times out every request, and never lets a pull overwrite pending or blocked local changes; autosave reschedules instead of skipping; new IDs are UUIDs. *(Audit M-H1, M-H4 and the mobile medium findings. Lot L11a)*
- [x] **REQ-AUD-local-storage** — Multi-statement SQLite writes are transactional, the local schema is versioned with `PRAGMA user_version`, queue rows carry an explicit operation type, and the queue is indexed. *(Audit ARCH-3 mobile, ARCH-5. Lot L11b)*
- [x] **REQ-AUD-photos** — Photos are resized and persisted in the document directory at capture, uploaded by streaming, network errors do not consume the retry cap, and a missing local file is surfaced instead of silently dropped. Attachments pulled from the server are displayable, and thumbnails render through `expo-image` from downsized sources. *(Audit M-H2 and the remote-attachment and image findings. Lot L12)*

- [x] **REQ-AUD-offline-start** — A cold start with no network and valid stored credentials opens the signed-in app with the last known profile (cached locally) instead of the login overlay; the profile refreshes from `/me` when the API is reachable. *(Found while planning Phase 3: `isAuthenticated` depends on a successful `/me` call)*
- [x] **REQ-AUD-changes-feed** — `/sync/changes` pages on a monotonic sequence and still accepts the old cursor; same-version replays with different content are conflicts; the per-poll re-send of event-less surveys is gone. *(Audit ARCH-6. Lot L10)*
- [x] **REQ-AUD-object-storage** — One `StorageService` for surveys, attachments and users; profile pictures in object storage; storage keys contained; upload size enforced; MIME allow-list checked by own property. *(Audit A-H3, A-M3, A-M4. Lot L13)*
- [x] **REQ-AUD-config** — Validated configuration schema, bounded `pg` pool with an error listener, strict CORS in production, Nest `Logger` everywhere, dead token secrets removed. *(Audit A-M8. Lot L14)*
- [x] **REQ-AUD-surveys-split** — `SurveysService` split into repository, survey, events, parcels and public-map services; batched parcel writes; column-scoped ownership checks; cursor pagination; cached, fully timed-out IGN fetch. *(Audit ARCH-2 and API efficiency findings. Lot L15)*
- [x] **REQ-AUD-db-tuning** — Public-surveys partial index, generated centroid columns with a btree index (no PostGIS), migration advisory lock, dead `auth_sessions` tables dropped. *(Audit efficiency findings, ARCH-7. Remainder of lot L16)*
- [x] **REQ-AUD-ibp-domain** — A shared `ibp-domain` workspace package holds the IBP rules and sync contract types used by both API and mobile, verified by one parity fixture. *(Audit ARCH-1, T6. Lot L17)*
- [x] **REQ-AUD-test-infra-rest** — The RS256 path of `AuthGuard` is tested against a local JWKS; the catch-all E2E suite is split by feature and uses random UUIDs. *(Audit T2, T5. Remainder of lot L7)*
- [x] **REQ-AUD-mobile-state** — Memoised contexts replace the prop funnel; the survey list is virtualised; completion is precomputed; screens are split under 400 lines; unused styles are removed; navigation is typed; the map requests by bbox and clusters markers. *(Audit ARCH-4 and mobile efficiency findings. Lot L18)*
- [x] **REQ-AUD-i18n-a11y** — Every user-facing string comes from a French i18n catalogue, status messages are user-facing, and interactive elements carry accessibility roles and labels. *(Audit i18n and accessibility findings. Lot L19)*
- [x] **REQ-AUD-hygiene** — Root package, tsconfig and unused dependencies cleaned up; `CLAUDE.md` and technical docs match the code; the audit links each finding to its closing PR. *(Audit ARCH-7, ARCH-8. Remainder of lot L20)*

## Cross-Cutting Business Rules

Carried from `.planning/intel/requirements.md`. These are rules that constrain the requirements
above rather than deliverables in their own right, so they are not exclusively phase-mapped; they
are verified within the phases that touch them and in the Phase 28 field tests.

| Rule | Status this milestone |
|------|----------------------|
| `REQ-X-single-site` — a survey is linked to a single site or checkpoint | Active |
| `REQ-X-parcel-required` — a survey must be linked to **one** cadastral parcel | **Overridden** — multi-parcel wins (`survey_parcels`); see `REQ-DOC-form-spec` |
| `REQ-X-gps-not-identifier` — GPS/manual address positions but does not identify | Active |
| `REQ-X-conditional-mandatory` — some fields are mandatory depending on survey type | Active |
| `REQ-X-submit-gate` — submission allowed only when required fields are complete and cadastral linkage is valid | Active |
| `REQ-X-longitudinal` — surveys on a parcel are tracked by observation year and version, with historical comparison | Active |
| `REQ-X-explore-parcel-first` — Explore is a parcel intelligence surface | Deferred with `REQ-B-explore-analysis` |
| `REQ-X-visibility` — each submitted survey has `private`\|`public` | **Overridden** — no private/public state this milestone; every submitted survey is visible by default to every authenticated association member. Restored with `REQ-C-privacy-choice` |
| `REQ-X-pedagogy-on-demand` — pedagogical content on demand without interrupting entry | Active |
| `REQ-X-draft-expiry` — a draft expires 7 days after creation | Active |
| `REQ-X-public-anonymized` — public map data is anonymized | Deferred — no public surface this milestone |
| `REQ-X-parcel-layer-highzoom` — cadastral parcels and `studied`/`not_studied` status at high zoom | Partially deferred: parcel rendering is Active (offline map); public `studied` status is deferred with `REQ-B-parcel-status-map` |
| `REQ-X-points-valid-only` — points only for valid submitted surveys | Deferred with Epic F |
| `REQ-X-anticheat` — anti-cheat rules | Deferred with Epic F |
| `REQ-X-donation-nonblocking` — donation prompts stay non-blocking | Deferred with Epic G |

## Non-Functional Requirements

Active for this milestone; verified in Phase 28 alongside the field tests.

| ID | Requirement |
|----|-------------|
| `REQ-NFR-platforms` | iOS 17 minimum; Android 12 (API 31) minimum |
| `REQ-NFR-launch-time` | App launch under 3 seconds on target devices |
| `REQ-NFR-offline-reliability` | No draft data loss on forced app closure |
| `REQ-NFR-security` | Encrypted local storage for sensitive data; API traffic over TLS |
| `REQ-NFR-gdpr` | Data minimization and a defined retention policy |
| `REQ-NFR-privacy-by-design` | Public map and leaderboard data anonymized — **dormant** this milestone (no public surface), reactivates with the community milestone |

---

## Deferred — Next Milestone (Community / Social)

Recorded, not dropped. The code already exists for several of these.

| Requirement | Note |
|-------------|------|
| `REQ-A-social-login` | Sign in with Apple/Google — found unbuilt 2026-09-27 (no code anywhere in `mobile/src`, despite this document previously marking it "Built"); `docs/specs/epic-a-access-and-security.md`'s own test plan already treats it as out of this milestone |
| `REQ-F-france-map` | Nationwide public map of `public` surveys, open to anyone unauthenticated — built, becomes unused when the map repoints to authenticated members' surveys (`REQ-B-own-surveys-map`, Phase 11) |
| `REQ-B-parcel-status-map` | Public parcel `studied`/`not_studied` statuses |
| `REQ-B-explore-analysis` | Explore as a parcel analysis surface |
| `REQ-C-privacy-choice` | Private/public visibility before submission; also restores the toggle removed from `REQ-B-manage-published` |
| `REQ-E-audit-trail`, `REQ-E-search`, `REQ-E-report` | Epic E — data quality and trust |
| `REQ-F-points`, `REQ-F-leaderboard`, `REQ-F-badges`, `REQ-F-rare-species-points` | Epic F — gamification. `REQ-F-rare-species-points` depends on `REQ-C-species-recognition` shipping this milestone |
| `REQ-G-ibp-info`, `REQ-G-association`, `REQ-G-donation` | Epic G — information, association visibility, donation |
| `REQ-I-calendar`, `REQ-I-event-detail`, `REQ-I-register`, `REQ-I-my-registrations`, `REQ-I-events-on-map` | Epic I — workshops and training; uncontracted, HelloAsso dependency |

**Prerequisite for the next milestone:** a back-office / CMS surface. `REQ-E-audit-trail` requires a
moderation interface outside the mobile app; `REQ-G-ibp-info` and `REQ-G-association` require content
updatable without an app release. No SPEC or architecture document defines this surface — it needs
its own ADR, architecture block and contract before Epics E and G can be planned
(conflict-report warning 6, moot for this milestone).

## Deferred — V2

| Requirement | Note |
|-------------|------|
| `REQ-H-regional-overview`, `REQ-H-parcel-trends`, `REQ-H-factor-distribution`, `REQ-H-analytics-trust` | Epic H — forest insights and analytics |

## Out of Scope

| Feature | Reason |
|---------|--------|
| Hosting migration | The current VPS is ratified by ADR, not replaced. Internal-only removes the scale pressure |
| alwaysdata + Cloudflare R2 | Named only in a stakeholder presentation, motivated by public-scale cost that no longer applies |
| PDF export API endpoint | Export must work offline; on-device generation is the only way |
| Direct Google Drive OAuth | The OS share sheet reaches Drive, Wimi, mail and AirDrop without integrating any of them |
| Private/public visibility toggle | Meaningless with no community surfaces; returns with `REQ-C-privacy-choice` |
| Back-office / CMS | Deferred with Epics E and G; a second application is out of reach for a solo milestone |
| SMTP email sending | Auth0 owns every auth email (DEC-005); `EmailService` and `SMTP_*` are being deleted, not fixed |

---

## Traceability

Every MVP requirement maps to exactly one phase. **Build** = the phase delivers new work;
**Verify** = the requirement is already built and the phase confirms it in the field.

| Requirement | Status | Phase | Role |
|-------------|--------|-------|------|
| REQ-ML-adr | New | Phase 1 | Build |
| REQ-AUD-session-data-loss | New | Phase 3 | Build |
| REQ-AUD-rate-limit | New | Phase 3 | Build |
| REQ-AUD-debug-surface | New | Phase 3 | Build |
| REQ-AUD-identity | New | Phase 3 | Build |
| REQ-AUD-mobile-quick-fixes | New | Phase 3 | Build |
| REQ-AUD-ci-pipeline | New | Phase 4 | Build |
| REQ-AUD-reproducible-image | New | Phase 4 | Build |
| REQ-AUD-test-infra | New | Phase 4 | Build |
| REQ-AUD-sync-validation | New | Phase 5 | Build |
| REQ-AUD-transactions | New | Phase 5 | Build |
| REQ-AUD-sync-engine | New | Phase 6 | Build |
| REQ-AUD-local-storage | New | Phase 6 | Build |
| REQ-AUD-photos | New | Phase 6 | Build |
| REQ-AUD-offline-start | New | Phase 6 | Build |
| REQ-AUD-changes-feed | New | Phase 7 | Build |
| REQ-AUD-object-storage | New | Phase 7 | Build |
| REQ-AUD-config | New | Phase 8 | Build |
| REQ-AUD-surveys-split | New | Phase 8 | Build |
| REQ-AUD-db-tuning | New | Phase 8 | Build |
| REQ-AUD-ibp-domain | New | Phase 9 | Build |
| REQ-AUD-test-infra-rest | New | Phase 9 | Build |
| REQ-AUD-mobile-state | New | Phase 10 | Build |
| REQ-AUD-i18n-a11y | New | Phase 10 | Build |
| REQ-AUD-hygiene | New | Phase 10 | Build |
| REQ-ML-contracts | New | Phase 14 | Build |
| REQ-DOC-form-spec | New | Phase 14 | Build |
| REQ-C-species-recognition | New | Phase 15 | Build |
| REQ-B-own-surveys-map | New | Phase 11 | Build |
| REQ-B-survey-detail | Partial | Phase 11 | Build |
| REQ-C-versioning | Partial | Phase 11 | Build |
| REQ-A-delete-account | Partial | Phase 11 | Build |
| REQ-D-offline-map | New | Phase 17 | Built |
| REQ-D-area-download | New | Phase 17 | Built |
| REQ-D-offline-parcel-warning | New | Phase 17 | Built |
| REQ-D-basemap-switch | New | Phase 17 | Built |
| REQ-C-pdf-export | New | Phase 19 | Build |
| REQ-B-manage-published | Partial | Phase 19 | Build |
| REQ-INF-hosting-adr | New | Phase 20 | Build |
| REQ-INF-backups | New | Phase 20 | Build |
| REQ-INF-migrations | New | Phase 20 | Build |
| REQ-INF-deadcode | New | Phase 20 | Build |
| REQ-QA-ibp-version | New | Phase 2 | Build |
| REQ-QA-sql-injection | New | Phase 20 | Build |
| REQ-QA-indexes | New | Phase 20 | Build |
| REQ-DOC-taxonomy | New | Phase 28 | Build |
| REQ-DOC-epicd-ids | New | Phase 28 | Build |
| REQ-QA-bug-a3-4 | New | Phase 28 | Build |
| REQ-QA-bug-a6-2 | New | Phase 28 | Build |
| REQ-QA-screen-tests | New | Phase 28 | Build |
| REQ-QA-visual-modernisation | New | Phase 23 | Build |
| REQ-B-nearby-parcels-home | New | Phase 23 | Build |
| REQ-C-history-split | New | Phase 24 | Build |
| REQ-B-global-search | New | Phase 25 | Build |
| REQ-QA-ux-audit | New | Phase 26 | Build |
| REQ-QA-deep-audit | New | Phase 27 | Build |
| REQ-FT-field-tests | New | Phase 28 | Build |
| REQ-A-login | Built | Phase 28 | Verify |
| REQ-A-logout | Built | Phase 28 | Verify |
| REQ-A-signup | Built | Phase 28 | Verify (+ `BUG-A3-4` fix) |
| REQ-A-profile | Built | Phase 28 | Verify |
| REQ-A-forgot-password | Built | Phase 28 | Verify (+ `BUG-A6-2` fix) |
| REQ-B-survey-list | Built | Phase 28 | Verify |
| REQ-C-guided-entry | Built | Phase 28 | Verify |
| REQ-C-save-draft | Built | Phase 28 | Verify |
| REQ-C-photos | Built | Phase 28 | Verify |
| REQ-C-parcel-linkage | Built | Phase 28 | Verify |
| REQ-C-submit | Built | Phase 28 | Verify |
| REQ-C-help | Built | Phase 28 | Verify |
| REQ-D-offline-work | Built | Phase 28 | Verify |
| REQ-D-auto-sync | Built | Phase 28 | Verify |
| REQ-D-conflict-resolution | Built | Phase 28 | Verify |

**Coverage:**

- MVP requirements: **71** total (`REQ-A-social-login` moved to Deferred — Next Milestone 2026-09-27, found unbuilt)
- Mapped to phases: **71** ✓
- Unmapped: **0** ✓
- Of which carry build work: **56** (up from 47: `REQ-A-delete-account`, `REQ-B-survey-detail` and `REQ-C-versioning` corrected from "Built"/Verify-only to Partial/Build in Phase 11, 2026-09-27); 15 are already built and are verified in Phase 28
- Deferred to next milestone: 20 · Deferred to V2: 4

---
*Requirements defined: 2026-09-22*
*Last updated: 2026-10-07 — phases renumbered flat (1 to 28), added `REQ-B-nearby-parcels-home` (Phase 23), `REQ-C-history-split` (Phase 24) and `REQ-B-global-search` (Phase 25). Earlier the same day, added `REQ-QA-ux-audit` (Phase 26); the deep audit moved to Phase 27. Earlier, 2026-10-06 — added `REQ-QA-visual-modernisation` (Phase 23) and `REQ-QA-deep-audit` (Phase 26). Earlier, 2026-09-27 — phases renumbered to a flat sequence (2–13); social login, account deletion, survey-detail history and versioning statuses corrected against the actual code*
