# Roadmap: Cortege — IBP

## Overview

Most of the MVP is already built. This milestone closes the gap between "business logic works on my
phone" and "an ecologist trusts it in a forest". It opens with the milestone's one real unknown —
on-device tree species recognition — behind two deliberate gates: an ADR that measures the approach
on real devices, and a data/API contract extension, so a no-go costs days rather than months. It
then completes the offline map the field actually needs, gives the surveyor a way to get a survey
out of the app as a PDF, takes PostgreSQL out of PoC status and ratifies the hosting that has been
running unofficially, and finishes by proving the whole thing in the field — which is the milestone's
success metric, not its afterthought. A September 2026 UX/UI audit, folded into this milestone by
owner decision on 2026-09-27 (Phases 12, 13, 16, 18 and 21), rebuilds field-entry ergonomics, the visual
identity and information architecture before that field test happens, so it validates the interface
the association will actually use.

**Milestone framing:** internal-only, shared within the association. Every authenticated member sees
every member's submitted surveys — there is no per-user private/public choice and no anonymous public
surface. The wider community and social dimension (an anonymous public map, gamification, moderation,
association section, donation) is deferred to the next milestone. See `.planning/REQUIREMENTS.md` for
what is deferred and why, and Phase 11 for where this milestone's own scope was trimmed to match.

**Schedule reality:** the published plan (May 2026) put MVP finalization at September 2026, field
tests October–December 2026, store publication January 2027. Today is 2026-09-22 and species
recognition is unbuilt and unresearched. Phases 1, 14 and 15 front-load that unknown so the slip is
measured in October rather than discovered in December.

## Phases

**Phase Numbering:**

Phases are plain integers 1 to 28 and execute in the order listed, so reading top to bottom is reading
the execution order. The roadmap was first written with `1.x` sub-phases (the 2026-09 code audit) and
`12.x` inserts; it was renumbered flat on 2026-10-07 and the phase directories under
`.planning/phases/` were renamed to match. Phases 24 and 25 were added at the same time. Code comments, ADRs and
the audit documents written before that date still quote the old numbers; this table maps them.

| Old | New | Old | New | Old | New |
|-----|-----|-----|-----|-----|-----|
| 1 | 1 | 5 | 14 | 12.1 | 22 |
| 1.1 | 2 | 6 | 15 | 12.2 | 23 |
| 1.2 | 3 | 7 | 16 | (new) | 24, 25 |
| 1.3 | 4 | 8 | 17 | 12.3 | 26 |
| 1.4 | 5 | 9 | 18 | 12.4 | 27 |
| 1.5 | 6 | 10 | 19 | 13 | 28 |
| 1.6 | 7 | 11 | 20 | | |
| 1.7 | 8 | 12 | 21 | | |
| 1.8 | 9 | 2 | 11 | | |
| 1.9 | 10 | 3 | 12 | | |
| | | 4 | 13 | | |

Ambiguity warning: an old "Phase 2" (association-only sharing) is now Phase 11, and the new Phase 2 is the
old Phase 1.1 (IBP method version). When a document predates 2026-10-07, read its phase numbers as old.

- [x] **Phase 1: Species Recognition — Approach Decision** - Measure on-device ML on real devices and ratify a go/no-go in an ADR (completed 2026-09-26)
- [x] **Phase 2: Reconcile the IBP method version** (INSERTED) - Establish whether the app still implements the current CNPF method, and what changes if not (completed 2026-09-26)
- [x] **Phase 3: Stop field data loss and account exposure** (INSERTED) - Session errors never delete offline data; no account takeover or open debug surface (completed 2026-09-24)
- [x] **Phase 4: CI and test safety net** (INSERTED) - Typecheck in CI, reproducible image, tests that run real SQL (completed 2026-09-24)
- [x] **Phase 5: API sync integrity** (INSERTED) - Validated sync payloads, no submit bypass, transactional writes (completed 2026-09-24)
- [x] **Phase 6: Mobile sync engine reliability** (INSERTED) - Single-flight drain, bounded batches, durable photos (completed 2026-09-25)
- [x] **Phase 7: Sync feed ordering and unified object storage** (INSERTED) - No skipped change between devices; one bounded storage service (completed 2026-09-25)
- [x] **Phase 8: API configuration, service split and database tuning** (INSERTED) - Fail-fast config, split SurveysService, bounded and indexed queries (completed 2026-09-26)
- [x] **Phase 9: Shared IBP domain package and test completeness** (INSERTED) - IBP rules defined once; RS256 path tested (completed 2026-09-27)
- [x] **Phase 10: Mobile state architecture, i18n, accessibility and hygiene** (INSERTED) - Targeted re-renders, French catalogue, accessible controls, accurate docs (completed 2026-09-27)
- [x] **Phase 11: Association-only sharing & scope trim** (INSERTED) - Authenticated members see each other's surveys instead of an anonymous public map; the private/public toggle and the report feature are removed for this release; survey-history comparison and account deletion get their missing UI; the UX audit's Lot 0 trust bugs (score scale, sync-status masking, account-deletion copy, tab icon, status bar, pull-to-refresh, contrast) are folded in (completed 2026-09-27; decimal input (BUG-04) deferred to Phase 12, see `11-VALIDATION.md`)
- [x] **Phase 12: Field-Entry Ergonomics** (INSERTED, UX audit Lot 1) - Counters, segments and chips replace the numeric keyboard for factors B–J; a pager, a fixed CTA and a visible progress gauge cut a survey from ~80 to ~40 interactions (completed 2026-09-27)
- [x] **Phase 13: Visual Foundations & Motion** (INSERTED, UX audit Lot 2) - Brand fonts actually load, colors move onto tokens with a lint rule, Reanimated 4 replaces the legacy `Animated`/`LayoutAnimation` calls (completed 2026-09-27)
- [x] **Phase 14: Factor A Genus List & Data-Contract Corrections** - Record the observed genera as a list rather than a count, migrate existing surveys; correct the stale form spec (completed 2026-09-27)
- [x] **Phase 15: Genus Recognition for Factor A** - Photograph a tree, get a calibrated genus suggestion, confirm it (completed 2026-09-27; Android device run + real-device photo test deferred to Phase 28, see phase detail)
- [x] **Phase 16: Information Architecture** (INSERTED, UX audit Lot 3) - Home and Mes Relevés stop duplicating each other, a sync-status indicator is visible outside Settings, survey detail and Compte are restructured (completed 2026-09-27)
- [x] **Phase 17: Offline Map & Own-Survey Navigation** - Navigate a parcel with no network, and see your own surveys on the map (completed 2026-09-27; on-device airplane-mode/relaunch verification deferred to Phase 28, see phase detail)
- [x] **Phase 18: Onboarding & Explorer Polish** (INSERTED, UX audit Lot 4) - A permissions-aware first launch, a tiered map sheet, chip filters and legible score markers on the now member-only map (completed 2026-09-27)
- [x] **Phase 19: Survey Export & Ownership** - Export a survey as a PDF offline and delete your own surveys (completed 2026-09-27)
- [x] **Phase 20: Durable Backend** - Backups that restore, migrations that hold, hosting ratified, dead and unsafe code gone (completed 2026-09-27)
- [x] **Phase 21: Interface Finishing** (INSERTED, UX audit Lot 5) - Dark mode, Liquid Glass on floating controls, a real history timeline — the "Ma saison" gamification hook stays deferred with Epic F (completed 2026-09-28)
- [x] **Phase 22: Owner acceptance testing** (INSERTED) - The owner tests the app on their own phone; display bugs and UX friction are logged, triaged and fixed in batches until the owner judges it ready for the association's field tests (completed 2026-10-06; the owner declared the app ready for field tests, which open after Phases 23 and 26)
- [x] **Phase 23: Visual Modernisation** (INSERTED) - A more pleasant, modern and lively interface: visual refresh and motion across the main screens, colourised map background with a dark variant, design spec updated, components reused and homogenised, native first (completed 2026-10-09; Android pass deferred to Phase 28, open design points to Phase 26)
- [x] **Phase 24: Survey History Split** (INSERTED) - The survey change log and the parcel history become two separate things (SEED-002; owner decision 2026-10-07, done before the audits so they audit the final screens) (completed 2026-10-09)
- [x] **Phase 25: Global Search** (INSERTED) - One search covers the whole app: own and community surveys, places and parcels on the map, and the other items the app exposes (SEED-003; owner decision 2026-10-07) (completed 2026-10-10)
- [ ] **Phase 25.1: PDF Export Improvement** (INSERTED) - The exported survey PDF carries the content of the CNPF survey sheet in the brand finish, with photos, the parcel map and the trend, before the UX/UI audit (owner decisions 2026-10-09 and 2026-10-10)
- [ ] **Phase 26: UX/UI Audit & Design System Update** (INSERTED) - Audit the interface after Phase 23, update the design system to match, check global coherence across screens and fix visual bugs (owner decision 2026-10-07)
- [ ] **Phase 27: In-depth Quality Audit** (INSERTED) - Deep audit of code quality, test coverage, architecture and security, with findings triaged and the blockers fixed (owner decision 2026-10-06)
- [ ] **Phase 28: Field Validation** - Prove the offline survey-to-sync loop on real parcels with real observers

## Phase Details

### Phase 1: Species Recognition — Approach Decision

**Goal**: We know, with numbers from real devices, how on-device tree species recognition will work — or that it cannot ship in this milestone.
**Depends on**: Nothing (first phase)
**Requirements**: REQ-ML-adr
**Success Criteria** (what must be TRUE):

  1. An accepted ADR in `docs/technical/` names the inference runtime, the model and its licence, the on-device model size, and how suggestions behave when the model or the network is unavailable.
  2. A throwaway spike on a real iOS device and a real Android device produces recorded figures for inference latency, model size on disk, and top-1/top-3 accuracy on a handful of French tree species.
  3. The ADR states an explicit go/no-go for US-C9 in this milestone, and if it is a no-go, describes the fallback (manual species entry) and what moves to the next milestone.
  4. The ADR adds no recurring inference cost to the ~€346/yr budget, or states plainly what it would cost.

**Plans**: 6/6 plans complete
Plans:

- [x] 01-01-PLAN.md — Spike scaffold, benchmark-device and field-photo asks, measurement document skeleton
- [x] 01-02-PLAN.md — CNPF Factor A genus label set (34 classes) and a licence-clean image corpus
- [x] 01-03-PLAN.md — On-device TFLite harness on real iOS and Android, proven with a stock model
- [x] 01-04-PLAN.md — Fine-tune, export quantised .tflite, measure top-1/top-3 accuracy per genus
- [x] 01-05-PLAN.md — Real-device latency against the 3 s budget and field-photograph validation
- [x] 01-06-PLAN.md — ADR-002 with the go / partial go / no-go for US-C9, ratified

### Phase 2: Reconcile the IBP method version — repo implements Fr v3.0, CNPF publishes FR v3.2 (INSERTED)

**Goal**: Know whether the app still implements the current CNPF IBP method, and exactly what changes if it does not.
**Depends on**: Nothing — independent of the species-recognition track. Must land before Phase 14, which writes the Factor A genus list.
**Requirements**: REQ-QA-ibp-version
**Success Criteria** (what must be TRUE):

  1. A written comparison of IBP Fr v3.0 (the version this repo cites, PDFs dated 2023-03-23 in `docs/references/README.md`) against the CNPF's currently published FR v3.2 (dated 2026-02-02), covering all ten factors: field definitions, class thresholds, and the Factor A native-genus list.
  2. Every divergence found is recorded with its concrete impact on `api/src/surveys/ibp-rules.service.ts`, `mobile/src/app/ibp-scoring.ts`, and the 17 reference cases in `docs/technical/ibp-validation-matrix-v1.md`.
  3. An explicit decision is recorded in `docs/technical/`: this milestone either migrates to v3.2 or stays on v3.0. Staying is a legitimate outcome for internal-only use, but it must be a stated choice with its reasoning, not an accident.
  4. If migration is chosen, the effect on surveys already recorded under v3.0 is stated plainly: whether their computed scores change, and what happens to them.
  5. `docs/references/README.md` and `docs/specs/ibp-form-spec.md` cite the version the app actually implements, whichever that turns out to be.

**Why this exists**: surfaced by the Phase 1 research (`01-RESEARCH.md`), which recovered the Factor A genus list from the current official CNPF PDF and found it was v3.2, three years newer than the v3.0 this repo cites. If the method moved, the app computes outdated scores — which matters more than any single feature in this milestone.

**Plans**: 4 plans (wave 1: 01–03 in parallel; wave 2: 04)

Plans:

- [x] 02-01-PLAN.md — Factor-by-factor comparison doc (v3.0 as implemented vs FR v3.2) with API/mobile/matrix impact per difference
- [x] 02-02-PLAN.md — ADR-003: migrate to v3.2 in Phase 9, treatment of recorded surveys, version dispatch, CH-1..CH-12; phase-1 doc cross-refs and page fixes
- [x] 02-03-PLAN.md — Citation files say "implemented v3.0, target v3.2 (ADR-003)"; validation matrix v3.2 impact and target cases
- [x] 02-04-PLAN.md — Index the new docs, ROADMAP input line for Phase 9, phase gate and 02-VALIDATION.md

### Phase 3: Stop field data loss and account exposure (INSERTED)

**Goal**: Nothing an ecologist records offline can be destroyed by a session error, and no account or endpoint can be taken over or opened by configuration mistake.
**Depends on**: Nothing — independent of the species-recognition track. Must land before Phase 28.
**Requirements**: REQ-AUD-session-data-loss, REQ-AUD-rate-limit, REQ-AUD-debug-surface, REQ-AUD-identity, REQ-AUD-mobile-quick-fixes
**Source**: audit lots L1–L4 (`docs/audits/plan-remediation-2026-09.md`), findings M-C1, A-C1, A-H1, A-H4, A-M6, M-H3, M-H5 (`docs/audits/audit-2026-09-code-complet.md`)
**Success Criteria** (what must be TRUE):

  1. A network error, a timeout or an unknown error while refreshing the Auth0 token never deletes `local_surveys`, `sync_queue` or `local_attachments`; only an explicit refresh-token rejection (`invalid_grant`, Auth0 401/403) ends the session, and even then the local queue is kept and syncs after re-login with the same account.
  2. Logging out with unsynced surveys or photos shows how many will be lost and purges only after explicit confirmation; local data is never attached to a different account after re-login.
  3. Behind Caddy, rate limiting keys on the real client (`trust proxy` on loopback, per-user tracker when authenticated); the global production limit no longer lets one syncing device lock out every user.
  4. `DebugModule` and the HS256 test-token path are not loaded in production; `/v1/debug/*` returns 404 there.
  5. An unknown Auth0 `sub` is linked to an existing account by email only when Auth0 reports `email_verified === true` (Google/Apple social login keeps working); first-login provisioning is race-free (`INSERT … ON CONFLICT`); a report no longer exposes the reporter's identity to the reported surveyor.
  6. Developer tools (API URL override, data reset) are absent from production builds, and the nearby-parcels bbox is sent as `minLng,minLat,maxLng,maxLat`.
  7. The pre-Auth0 session stubs are gone (`handleVerifyEmail`, `handleResendVerification`, `handleCancelEmailVerification`, `pendingEmailVerification`, `devVerificationToken`, `refreshToken: ""`), and no caller still tests `accessToken || refreshToken`.

**Plans**: 9 plans

Plans:

- [x] 03-01-PLAN.md — API rate limiting: per-client tracker (bearer hash / trusted IP), trust proxy, raised production limits, tighter /sync and upload limits (wave 1)
- [x] 03-02-PLAN.md — API identity and reports: email_verified-gated linking, race-free provisioning, private reported events, reason bound, migration 013 (wave 1)
- [x] 03-03-PLAN.md — Mobile test tooling (RNTL) and Auth0 error classification in useAuth0Session, forced refresh on 401 (wave 1)
- [x] 03-04-PLAN.md — Mobile quick fixes: dev tools only in __DEV__, nearby-parcels bbox order (wave 1)
- [x] 03-05-PLAN.md — DebugModule and HS256 path absent in production, /v1/debug/* 404 (wave 2)
- [x] 03-06-PLAN.md — Session end never purges; retry-later handling; pre-Auth0 stubs removed (wave 2)
- [x] 03-07-PLAN.md — Local-data owner marker, unsynced-work count, useLocalDataOwner hook (wave 2)
- [x] 03-08-PLAN.md — Confirmed-purge logout, owner-gated sync, blocking conflict screen (wave 3)
- [x] 03-09-PLAN.md — Phase gate and on-device verification (wave 4, checkpoint)

### Phase 4: CI and test safety net (INSERTED)

**Goal**: A change that breaks types, the Docker image or the sync storage layer cannot reach `main` or production unnoticed.
**Depends on**: Nothing. Must land before Phases 5 and 6, which rely on its test infrastructure.
**Requirements**: REQ-AUD-ci-pipeline, REQ-AUD-reproducible-image, REQ-AUD-test-infra
**Source**: audit lots L5, L6 and the core of L7, findings CI-1…CI-6, T1, T3, T4, T5
**Success Criteria** (what must be TRUE):

  1. CI runs `npm run typecheck`; a PR with a deliberate type error fails, and a docs-only PR runs only the cheap checks (path filters, one aggregating `ci-ok` required check).
  2. Every job has `timeout-minutes`, the workflow declares least-privilege `permissions`, PR runs cancel superseded runs, and third-party actions are pinned by SHA.
  3. The API image is built from the repo root with `npm ci` against the root lockfile, runs as a non-root user, is tagged with the commit SHA as well as `latest`, and can only be pushed from `main`.
  4. Mobile unit tests execute real SQL (in-memory SQLite behind the `expo-sqlite` mock), hooks are tested with `renderHook`, `*.test.tsx` files are picked up, and the E2E database is reset before each run.
  5. Coverage runs in CI with per-directory thresholds set at today's measured values (ratchet).
  6. Mobile changes run `expo-doctor` and `expo export`; a dependency audit fails CI on `high` vulnerabilities; CodeQL scans JavaScript/TypeScript.

**Plans**: 7 plans

Plans:

- [x] 04-01-PLAN.md — Mobile test infra: real-SQL expo-sqlite mock by default, storage.test.ts on table state, .test.tsx collected, Node engines floor (wave 1)
- [x] 04-02-PLAN.md — API: E2E globalSetup drops schema and re-migrates; reproducible non-root Dockerfile from the root lockfile, .dockerignore, VPS runbook (wave 1)
- [x] 04-03-PLAN.md — expo-doctor fixes: newArchEnabled removed, Metro override proven obsolete with a single-React export check (wave 1)
- [x] 04-04-PLAN.md — Coverage ratchet: per-directory coverageThreshold at measured floor values (wave 2)
- [x] 04-05-PLAN.md — CI rewrite: path filters, check/typecheck, unit+coverage, E2E twice, mobile-build, audit, image smoke, CI OK, main-only SHA-tagged push; CodeQL; Dependabot actions (wave 2)
- [x] 04-06-PLAN.md — Phase gate: local suite, PR CI evidence, owner device check and merge (wave 3, checkpoint)
- [x] 04-07-PLAN.md — Post-merge: main push tags, type-error and docs-only PR proofs, VPS health and CI OK branch protection (wave 4, checkpoint)

### Phase 5: API sync integrity (INSERTED)

**Goal**: The server accepts only valid, correctly-sequenced sync operations and never commits half of a write.
**Depends on**: Phase 4
**Requirements**: REQ-AUD-sync-validation, REQ-AUD-transactions
**Source**: audit lots L8, L9, findings A-H2, A-M1, A-M2 (validation), A-M5, A-M7, A-M9, ARCH-3 (API)
**Success Criteria** (what must be TRUE):

  1. Every `POST /v1/sync` operation payload is validated by a class DTO; an invalid payload yields a per-operation `fatal_error` with a generic message instead of a retried 500, and deterministic PostgreSQL errors (22xxx/23xxx) are never retryable.
  2. A sync upsert can no longer submit a survey or move its `expires_at`: `status` and `expires_at` from the client are ignored (installed apps keep working), and read-only fields of a submitted survey cannot be overwritten.
  3. Upsert, patch, submit, delete, attachment writes and report creation each run in one transaction with their event; an injected failure on the event insert leaves nothing committed; the upsert UPDATE is guarded on `sync_version`.
  4. Two concurrent submits on the same parcel give one success and one 409, never a 500 or a duplicate version; `parcel_ids` is bounded and validated.
  5. Account deletion commits the database transaction before deleting the Auth0 user.

**Plans**: 6 plans

Plans:

- [x] 05-01-PLAN.md — Transaction helper, E2E fault injection, account deletion commits before Auth0 (wave 1)
- [x] 05-02-PLAN.md — Sync DTO validation, fatal 22xxx/23xxx, parcel_ids bound (wave 1)
- [x] 05-03-PLAN.md — Survey writes transactional, guarded upsert, concurrent submit lock (wave 2)
- [x] 05-04-PLAN.md — Attachment and report writes transactional (wave 2)
- [x] 05-05-PLAN.md — Upsert ignores status/expires_at, submitted read-only, installed-app replay (wave 3)
- [x] 05-06-PLAN.md — Phase gate: local gate, CI evidence, owner device check (wave 4)

### Phase 6: Mobile sync engine reliability (INSERTED)

**Goal**: The queue on the phone drains exactly once, in bounded batches, survives crashes, and never loses or silently drops a photo.
**Depends on**: Phase 4
**Requirements**: REQ-AUD-sync-engine, REQ-AUD-local-storage, REQ-AUD-photos, REQ-AUD-offline-start
**Source**: audit lots L11a, L11b, L12, findings M-H1, M-H2, M-H4, ARCH-3 (mobile), ARCH-5, and the retry-cap, timeout, pull-overwrite, autosave and ID findings
**Success Criteria** (what must be TRUE):

  1. Only one drain or pull runs at a time (module-level single flight); two concurrent triggers produce one `POST /sync`.
  2. A queue of 250 operations syncs in batches of at most 100; a survey is marked `synced` only when no other queue row exists for it.
  3. The documented retry cap applies (8 attempts then `sync_blocked`), network and 5xx errors do not consume it, every sync request has a timeout, and a pull never overwrites a survey that has a pending or blocked local change.
  4. SQLite writes that span several statements run in a transaction, the schema is versioned with `PRAGMA user_version`, and new IDs are UUIDs.
  5. Photos are resized (2048 px, JPEG 0.7) and copied to the document directory at capture, uploaded by streaming, and a missing local file is shown to the user instead of being deleted silently.
  6. Attachments pulled from the server are displayable (no more `local_uri=""` dead rows: fetched on demand through their presigned URL and cached), and thumbnails and the detail carousel render through `expo-image` from downsized sources.
  7. A cold start with no network and valid stored credentials opens the app on the signed-in screens with the last known profile, instead of the login overlay; the profile refreshes from `/me` once the API is reachable.

**Plans**: 12 plans

Plans:

- [x] 06-01-PLAN.md — Install the 4 Expo modules, Jest mocks, photo path helpers (wave 1)
- [x] 06-02-PLAN.md — API: attachment download URL / content route (wave 1)
- [x] 06-03-PLAN.md — SQLite user_version migrations, transaction helper with reentrancy guard (wave 1)
- [x] 06-04-PLAN.md — Offline cold start with cached profile, autosave fix (wave 1)
- [x] 06-05-PLAN.md — Transactional survey writes, UUIDs (wave 2)
- [x] 06-06-PLAN.md — Server photos fetched on demand and cached, unavailable state (wave 2)
- [x] 06-07-PLAN.md — Photo capture: resize, durable storage, streaming upload helper (wave 2)
- [x] 06-08-PLAN.md — Retry classification, timeouts, pull guard (wave 3)
- [x] 06-09-PLAN.md — expo-image thumbnails and carousel, missing/unavailable states (wave 3)
- [x] 06-10-PLAN.md — Single flight, batches of 100, synced only when queue empty (wave 4)
- [x] 06-11-PLAN.md — Streaming upload wired into sync, missing file handling (wave 5)
- [x] 06-12-PLAN.md — Phase gate: local gate, CI evidence, owner device check (wave 6)

### Phase 7: Sync feed ordering and unified object storage (INSERTED)

**Goal**: No change is ever skipped or silently dropped between devices, and every stored file lives in object storage behind one service that bounds what it accepts.
**Depends on**: Phase 5
**Requirements**: REQ-AUD-changes-feed, REQ-AUD-object-storage
**Source**: audit lots L10, L13, findings ARCH-6, A-H3, A-M3, A-M4, the `isAllowedMimeType` finding, the unbounded `/sync/changes` fallback
**Success Criteria** (what must be TRUE):

  1. `/v1/sync/changes` pages on a commit-safe monotonic order (`survey_events` `(xid8, seq)`, filtered by the snapshot minimum `xid8 < pg_snapshot_xmin(pg_current_snapshot())`), still accepts the old `(created_at, id)` cursor, and an event committed late is never skipped (E2E test).
  2. Two devices sending the same `sync_version` with different content get a `sync_version_conflict` instead of a silent replay; the fallback that re-sends event-less surveys on every poll is gone.
  3. One `StorageService` owns the S3 client, bucket and local mode for surveys, attachments and users; profile pictures are in object storage and survive a container restart.
  4. Storage keys are built only from validated identifiers and stay inside the upload directory in local mode; the presigned PUT enforces `ContentLength` and confirmation rejects a size mismatch with 422.
  5. `isAllowedMimeType` uses an own-property check, so `"constructor"` and other prototype keys are rejected.
  6. `sync-conflict-resolution-v1.md` and `api-contract-v1.md` describe the new cursor and same-version rule.

**Plans**: 9 plans

Plans:

- [x] 07-01-PLAN.md — Migration 014 (seq + xid8, backfill, synthetic events), migration E2E, v2 cursor helpers (wave 1)
- [x] 07-02-PLAN.md — StorageService + module, safe-id rule, own-property MIME check (wave 1)
- [x] 07-03-PLAN.md — /sync/changes on (xid8, seq) with snapshot filter, legacy cursor, fallback removed, concurrency E2E (wave 2)
- [x] 07-04-PLAN.md — Profile pictures through StorageService, bytes served by the API (wave 2)
- [x] 07-05-PLAN.md — Safe-id validation at the API boundary (pipe + DTOs) (wave 2)
- [x] 07-06-PLAN.md — Same-version conflict rule (visibility-only applied), SurveysService drops its S3 client (wave 3)
- [x] 07-07-PLAN.md — Attachments through StorageService, presigned ContentLength, 422 on size mismatch (wave 3)
- [x] 07-08-PLAN.md — MinIO-mode E2E CI job and documentation (wave 4)
- [x] 07-09-PLAN.md — Phase gate: local gate, CI evidence, owner device check (wave 5)

### Phase 8: API configuration, service split and database tuning (INSERTED)

**Goal**: The API fails fast on bad configuration, its survey logic is split into reviewable units, and its queries are bounded and indexed.
**Depends on**: Phase 7
**Requirements**: REQ-AUD-config, REQ-AUD-surveys-split, REQ-AUD-db-tuning
**Source**: audit lots L14, L15, the remainder of L16, findings A-M8, ARCH-2, CORS and logging findings, every API efficiency finding
**Success Criteria** (what must be TRUE):

  1. Configuration is read through `@nestjs/config` with a schema validated at startup; production refuses to start on default credentials or an empty `AUTH0_AUDIENCE`; `CORS_ORIGIN` is required in production; `REFRESH_TOKEN_SECRET` and `ACCESS_TOKEN_*` are gone.
  2. The `pg` pool has `max`, `idleTimeoutMillis`, `statement_timeout` and an `error` listener; services log through the Nest `Logger`, and a failed authentication logs only its message and code.
  3. `SurveysService` is split into a repository, survey, events, parcels (merging the internal IGN client with `CadastreProviderService`) and public-map services; `getSurveyForUser` and `insertEvent` exist once.
  4. Parcel ids are written in one batched statement, ownership checks select only the columns they need, list endpoints (`listForUser`, `getEvents`, `listReports`) paginate by cursor while still answering unpaginated callers, and the IGN fetch caches per tile and times out on the body as well as the headers. A 100-operation sync batch issues at least three times fewer queries than today.
  5. The public-surveys partial index and generated `centroid_lat`/`centroid_lng` columns with a btree index exist (no PostGIS), migrations take a `pg_advisory_lock`, and the dead `auth_sessions` tables are dropped — `EXPLAIN ANALYZE` on 10 000 surveys attached to the PR.

**Plans**: TBD

### Phase 9: Shared IBP domain package and test completeness (INSERTED)

**Goal**: The IBP rules and the sync contract types are defined once and proven identical on both sides, and the API's authentication path is tested for real.
**Depends on**: Phase 4. Should follow Phase 2, so the extracted rules are the ratified method version.
**Requirements**: REQ-AUD-ibp-domain, REQ-AUD-test-infra-rest
**Source**: audit lot L17 and the remainder of L7, findings ARCH-1, T6, the untested RS256 path, the catch-all E2E suite
**Input from Phase 2**: ADR-003 (`docs/technical/adr-003-ibp-method-version-v1.md`) adopts IBP FR v3.2; this phase implements its change list CH-1..CH-11 (CH-12 is phase 5), including the method-version dispatch (CH-6: a missing method version means v3.0, so identical replays of submitted v3.0 surveys stay valid) and `docs/technical/ibp-validation-matrix-v2.md` (CH-10).
**Success Criteria** (what must be TRUE):

  1. A `packages/ibp-domain` workspace exports the factor keys, allowed sets, scoring and draft/submit validation as pure functions, plus the sync contract types; `IbpRulesService` and `mobile/src/app/ibp-scoring.ts` delegate to it and `mobile/src/app/types.ts` imports its contract types.
  2. One parity fixture runs in the package, and the known drift (`factor_f_group_capped` exists only in the API today) is resolved.
  3. The API image builds with the package and `expo export` resolves it in CI.
  4. `AuthGuard`'s RS256 path is tested against a locally served JWKS: valid, expired, wrong audience and unknown `kid` tokens.
  5. `surveys-idempotency.e2e-spec.ts` is split by feature (submit, visibility, public map, attachments, parcel history) and uses `randomUUID()` instead of `Date.now()`.
  6. The IBP rules in `packages/ibp-domain` implement IBP FR v3.2 per ADR-003 (CH-1..CH-11), with the v3.0 rules kept for surveys tagged v3.0 or carrying no method version; every survey carries its method version, the observer picks it when creating a survey (default v3.2, v3.0 available) and it is fixed after submit; the total score is shown out of 50; `docs/references/README.md` and `docs/specs/ibp-form-spec.md` then say the app implements v3.2.

**Plans**: 16 plans

Plans:

- [x] 09-01-PLAN.md — Create the `packages/ibp-domain` workspace (seed: factor keys, method versions, wire types) and wire npm, Jest, Metro, the Dockerfile and CI (only plan touching package.json/lockfile) (wave 1)
- [x] 09-02-PLAN.md — Test AuthGuard's RS256 path against a loopback JWKS: valid, expired, wrong audience, unknown kid, wrong issuer, HS256 confusion (wave 1)
- [x] 09-03-PLAN.md — Split surveys-idempotency.e2e-spec.ts by feature with randomUUID ids; move direct G/H = 1 E2E fixtures to 2 (wave 1)
- [x] 09-05-PLAN.md — Write ibp-validation-matrix-v2.md and the ADR-003 implementation addendum (MAT-B-01 change, ibp_cas + ibp_cas3_scale) (wave 1)
- [x] 09-04-PLAN.md — Implement the v3.0 (fixed) and v3.2 rules, dispatch, readiness, draft migration, bands and the parity fixture in the package (wave 2)
- [x] 09-08-PLAN.md — Store method version and cas in the phone's JSON payloads (no SQLite migration), copy them on pull, no stamping of legacy drafts (wave 2)
- [x] 09-06-PLAN.md — Make IbpRulesService a thin adapter over the package, type the API wire types from it, run the parity fixture through it (wave 3)
- [x] 09-07-PLAN.md — Make mobile ibp-scoring.ts an adapter, take app types from the package, run the parity fixture, readiness texts for the cas (wave 3)
- [x] 09-09-PLAN.md — Migration 016 + DTO fields + effective-version validation, write normalisation, fixed-after-submit, MAT-VER-01 replay E2E (wave 4)
- [x] 09-10-PLAN.md — Form hook, draft patcher and contexts for version/cas/flag/A cover; fr.ibpMethod catalogue and fixed v3.0 help (wave 4)
- [x] 09-11-PLAN.md — Totals out of 50 with package bands on the badge, sector card and map; mixed-methods line; component tests (wave 4)
- [x] 09-12-PLAN.md — Method version on public map items and parcel statuses; API and data contracts; production probes (wave 5)
- [x] 09-13-PLAN.md — Form screens: method version picker (v3.2 default), scoring context by version, A cover, per-version help, / 50 (wave 5)
- [x] 09-14-PLAN.md — Detail screens: version display, cas editor, switch to v3.2 for drafts, / 50 with band-coloured /35 and /15 sub-scores (wave 5)
- [x] 09-15-PLAN.md — Citation files and form spec say v3.2 implemented; architecture docs, docs index, native README and CLAUDE.md (wave 6)
- [x] 09-16-PLAN.md — Phase gate: local gate, CI evidence with native builds, merge and API deploy with probes, owner's 6-step iPhone check (wave 7)

### Phase 10: Mobile state architecture, i18n, accessibility and hygiene (INSERTED)

**Goal**: The app renders only what changed, reads in one language with proper accessibility, and the repository and its docs describe what is actually there.
**Depends on**: Phase 6, Phase 9
**Requirements**: REQ-AUD-mobile-state, REQ-AUD-i18n-a11y, REQ-AUD-hygiene
**Source**: audit lots L18, L19, the remainder of L20, findings ARCH-4, ARCH-7, ARCH-8, every mobile efficiency finding, the i18n and accessibility findings
**Success Criteria** (what must be TRUE):

  1. Session, sync and surveys state come from memoised contexts; `useSurveySync` no longer returns a new ~60-key object each render, and a status update no longer re-renders every mounted tab (React DevTools profile before/after attached).
  2. The survey list is a `FlatList` with memoised rows and stays fluid with 500 surveys; completion is precomputed at write time instead of parsing every payload; no screen file exceeds 400 lines; the 158 unused style keys are gone; navigation is typed (no `useNavigation() as any`).
  3. The map requests by bbox, clusters markers, memoises them and debounces region changes.
  4. Every user-facing string comes from a French i18n catalogue, status messages carry no ids or technical text, and every `Pressable` in the survey detail, survey form and map screens has an accessibility role and label.
  5. The root `App.tsx`, the root runtime dependencies and the Expo-flavoured root tsconfig are gone; `bcryptjs`, `@nestjs/schedule` and the unused tab library are removed and `@expo/ngrok` is a dev dependency, with native iOS and Android builds still passing.
  6. `CLAUDE.md` and the technical docs match the final state (versions, `/v1/sync`, `local_meta`, test conventions, CI steps, new modules), and the audit report links each finding to the PR that closed it.

**Plans**: 32 plans

Plans:

- [x] 10-01-PLAN.md — Build the render-count harness that stands in for the React DevTools before/after profile (D-02), run it on th (wave 1)
- [x] 10-02-PLAN.md — Rewrite four of the ten React-spying hook tests, starting with `useSurveySync.test.ts`, onto the `renderHook` (wave 1)
- [x] 10-03-PLAN.md — Move the six remaining React-spying hook tests onto `renderHook`, with their assertions unchanged, before any (wave 1)
- [x] 10-04-PLAN.md — Create the measuring tools the rest of the phase is checked against: the unused-style-key script D-04 asks for (wave 1)
- [x] 10-05-PLAN.md — Create the French catalogue skeleton, the status message type and the sync-error texts, and translate the iOS (wave 1)
- [x] 10-06-PLAN.md — Add native Android and iOS build jobs to CI, prove them green on a PR before any dependency change, document t (wave 1)
- [x] 10-07-PLAN.md — Add the optional `bbox` filter to `GET /v1/public/map-items`, prove it with a new E2E spec and an EXPLAIN, doc (wave 1)
- [x] 10-08-PLAN.md — Precompute survey completion at write time in a new SQLite column, stop parsing every payload when listing, an (wave 1)
- [x] 10-09-PLAN.md — Introduce the five memoised contexts and the single assembler, make `useSurveySync` return memoised slices wit (wave 2)
- [x] 10-10-PLAN.md — Remove the unused e-mail service and every SMTP setting from the API, its configuration, examples, CI and docs (wave 2)
- [x] 10-11-PLAN.md — Move the status and alert texts of the survey-operations and profile sync hooks to the French catalogue, drop (wave 2)
- [x] 10-12-PLAN.md — Split the survey detail screen (1 344 lines + 836-line styles) into parts under 400 lines, delete its unused s (wave 2)
- [x] 10-13-PLAN.md — Split the survey form screen (1 190 lines + 644-line styles + 167-line components file) into parts under 400 l (wave 2)
- [x] 10-14-PLAN.md — Split the sign-in screen (752 lines) under 400 lines per file, delete unused styles, and move its text to the (wave 2)
- [x] 10-15-PLAN.md — Split the account screen (596 lines) under 400 lines per file, delete unused styles, move its text and alerts (wave 2)
- [x] 10-16-PLAN.md — Bring the Home screen under 400 lines and move the text of Home, the cards, the splash and the UI primitives t (wave 2)
- [x] 10-17-PLAN.md — Move the text of the five small screens and of the shared label modules to the catalogue, and delete their unu (wave 2)
- [x] 10-18-PLAN.md — Replace the navigation prop funnel with one memoised route component per screen that reads its own contexts, m (wave 3)
- [x] 10-19-PLAN.md — Do every dependency change of the phase in one plan: remove the root leftovers and the unused API packages, mo (wave 3)
- [x] 10-20-PLAN.md — Move the status and dialog texts of the session, owner, network and central sync hooks to the catalogue, remov (wave 3)
- [x] 10-21-PLAN.md — Move the remaining hook status messages (editing, draft patching, GPS, app bootstrap) and the form validation (wave 4)
- [x] 10-22-PLAN.md — Turn the survey list into a virtualised `Animated.FlatList` with memoised rows, prove it stays fluid with 500 (wave 4)
- [x] 10-23-PLAN.md — Build the map's data layer: bbox-aware API client and explorer hook with stale-response and duplicate-request (wave 4)
- [x] 10-24-PLAN.md — Split the 961-line navigation file into `mobile/src/navigation/`, type navigation globally, mount screens with (wave 5)
- [x] 10-25-PLAN.md — Apply the owner's tab decisions: remove the Recherche tab in favour of the native header search in Mes Relevés (wave 6)
- [x] 10-26-PLAN.md — Document the tab changes of 01.9-25 in the native README and the search user story (wave 7)
- [x] 10-27-PLAN.md — Split the rest of the survey list screen (hero, stat tiles, filters, attention and continue sections) under 40 (wave 7)
- [x] 10-28-PLAN.md — Rebuild the public map screen on the 01.9-23 data layer: viewport loading with debounce and no auto-refit loop (wave 7)
- [x] 10-29-PLAN.md — Lock the phase's text, accessibility and structure rules: narrow status setters to the catalogue type, turn th (wave 8)
- [x] 10-30-PLAN.md — Record this phase's facts in CLAUDE.md, in the same PR as the code (RESEARCH "two passes"; split out of the st (wave 7)
- [x] 10-31-PLAN.md — Prove the phase: run and record the full local gate and every measurement, record PR #158's CI evidence suppli (wave 9)
- [x] 10-32-PLAN.md — Close Phase 10 after Phase 9: final documentation sweep, complete audit status links, and the French vali (wave 10)

### Phase 11: Association-only sharing & scope trim (INSERTED)

**Goal**: The app matches its real audience — association members only, no anonymous public surface, no half-built moderation — and the survey-detail and account screens do what `REQUIREMENTS.md` already claims they do.
**Depends on**: Phase 7 (StorageService/API boundary), Phase 10 (mobile state/i18n conventions). Independent of the species-recognition track. Should land before Phase 17, which builds offline capability on top of the map this phase repoints.
**Requirements**: REQ-B-own-surveys-map (redefined), REQ-B-manage-published, REQ-X-visibility, REQ-A-delete-account (build), REQ-B-survey-detail (build), REQ-C-versioning (build), REQ-B-manage-published (US-B4 tap target)
**Source**: Owner decision 2026-09-27, on top of a code-vs-code-audit review of Epics A–I (`.planning` session notes) that found three bricks already shipped past what `REQUIREMENTS.md` had decided, and three bricks `REQUIREMENTS.md` had already marked "Built" that have no working UI.
**Success Criteria** (what must be TRUE):

  1. `GET /public/map-items` and `GET /public/parcels/status` require authentication; the "Explorer" map shows surveys submitted by any association member (not an anonymous public set, and not only the contributor's own) — this **replaces** Phase 17's original "own surveys" framing in `REQ-B-own-surveys-map`.
  2. The private/public visibility control is removed from survey detail; every submitted survey is visible by default to every authenticated member. `REQ-X-visibility` no longer applies as a per-survey choice this milestone.
  3. The "report a survey" entry point is removed from the mobile app (button, panel, and the `POST /reports` call site). The `reports` module and its role-gated review endpoints stay in the API, untouched and still unreachable from any client, ready for the next milestone that gives it a moderation UI.
  4. From the Compte screen, a contributor can delete their account — the existing API path (`DELETE /me`) gets a mobile entry point with a destructive confirmation.
  5. Survey detail shows previous submitted surveys on the same parcel and the IBP total/factor deltas against the latest previous version — wiring the existing `GET /parcels/:parcelId/surveys/history` endpoint into the UI (`REQ-B-survey-detail`, `REQ-C-versioning`).
  6. In the now member-only Explorer map, tapping a studied parcel opens its latest survey detail or history, matching the behaviour already working in the survey-creation map.
  7. `REQUIREMENTS.md` no longer marks `REQ-A-social-login`, `REQ-A-delete-account`, `REQ-B-survey-detail` or `REQ-C-versioning` as "Built" when they are not; `docs/specs/epic-a-access-and-security.md` retags US-A4 (social login) out of MVP to match the QA plan's own treatment of it, and `docs/specs/user-stories.md` §8 stops filing Epic E/F's moderation workflow and team-challenge stories under "V2" when they are next-milestone (deferred), not V2.
  8. **UX audit Lot 0** (`docs/design/ux-ui-audit-2026-09.md` §2 and §3.4, owner decision 2026-09-27): re-verified first, since the audit predates the 01.8-11 fix and BUG-01/BUG-02 (score shown "/10") are already resolved. What remains is fixed here: `resolveSurveyUiStatus` stops letting a submitted-but-failed survey read "Soumis" in green (BUG-03); the numeric keyboard accepts a decimal comma (BUG-04); account-deletion copy says "anonymised", not "deleted", and the danger zone moves out of the first Settings section (BUG-05, folds into this phase's account-deletion UI); the iOS status bar uses `dark-content` on light screens (BUG-06); the Android Home tab gets its own icon, not Mes Relevés' (BUG-07); Home's pull-to-refresh reflects real state instead of a hardcoded `refreshing={false}` (BUG-08); and the badge/notice contrast failures below the WCAG floor (DS-01, DS-02, DS-14) are corrected.

**Status note** (2026-09-27, see `11-VALIDATION.md` for full detail): all 8 criteria satisfied except two scoped deviations, both deliberate and recorded rather than silently dropped. Criterion 6 is satisfied by opening the parcel's **history** on tap, not a full "survey detail" view — another member's survey has no local copy, and loosening the owner-scoped `GET /surveys/:id` is a bigger API-surface change than this phase's stated boundary (`api/src/surveys/`, `api/src/users/`) should absorb without a separate decision. Criterion 8's BUG-04 (decimal-comma numeric input) is deferred: it lives in `mobile/src/hooks/useSurveyForm.ts`, inside Phase 12's active factor-entry work running in parallel this same milestone; fixing it here risked a direct merge collision. Every other item, including BUG-01/BUG-02 re-verification, is done.

**Plans**:

- [x] 02-01-PLAN.md — API: `AuthGuard` on `PublicController`, drop the `visibility` predicate on the two public routes and parcel history, migration 017 (wave 1)
- [x] 02-02-PLAN.md — Mobile: access token on the Explorer map and every parcel-status caller; tap a studied parcel to see its history; remove the report entry point (waves 2 + 4, merged)
- [x] 02-03-PLAN.md — Mobile: survey detail shows previous submitted surveys on the parcel and IBP total/factor deltas; visibility toggle removed (wave 3)
- [x] 02-04-PLAN.md — Mobile: account-deletion single confirmation with correct copy, danger zone last; UX audit Lot 0 (BUG-03, BUG-05..08, DS-01/02/14) (waves 5 + 6, merged)
- [x] 02-05-PLAN.md — Docs: US-A4 retagged out of MVP; `user-stories.md` §8 moderation/team-challenge filing corrected (wave 7)

(Executed as 5 plans with their own `02-0N-SUMMARY.md`, not the granular per-task `PLAN.md` structure earlier phases used; see `11-CONTEXT.md`/`11-RESEARCH.md` for the equivalent planning record and `11-VALIDATION.md` for the phase-gate rollup.)

### Phase 12: Field-Entry Ergonomics (INSERTED, UX audit Lot 1)

**Goal**: Scoring a factor is a tap, not a typed number — a survey drops from ~80–90 interactions to ~35–45, with no keyboard for 80% of them.
**Depends on**: Phase 10 (mobile state/i18n/component conventions this phase's new components follow). Must land before Phase 14, which redesigns Factor A's own input as a genus list and should build it on these same components rather than the old numeric fields.
**Requirements**: none yet in `REQUIREMENTS.md` — this phase's own success criteria are its requirements, added here by the 2026-09-27 owner decision to bring the UX audit into MVP scope
**Source**: `docs/design/ux-ui-audit-2026-09.md` §3.1 (FLOW-01…FLOW-12), §5 (tokens, the slice this phase needs) and §7 Lot 1
**Success Criteria** (what must be TRUE):

  0. This phase adds the minimal token slice its own components need — spacing on the 4-grid, semantic empty/error/complete colors, pressed/interaction states (§5) — as real entries in `brand-tokens.ts`, not one-off inline styles; it does not wait for Phase 13's full design-system pass, and does not redo this work when Phase 13 lands. Every new pattern (`FactorInput`'s four variants, the pager, the fixed CTA bar, the progress gauge) is added to `docs/design/charte-graphique-etats-sauvages-spec.md` in the same PR that ships it, so the charter documents what the app actually does.
  1. A `FactorInput` component ships in four variants — counter (C/D/E), segmented control (H), checkable chips with a derived count (B/I/J), slider in 5% steps (B/G) — replacing every `keyboardType="numeric"` field in the ten factors.
  2. A factor's error state shows only after the field is left or submission is attempted, never on first open; empty, error and complete each have a distinct, non-alarming visual state.
  3. Factors are navigated through a horizontal pager (A→J) with a fixed footer pager control, instead of 20 round trips to the factor grid; a "next incomplete factor" shortcut exists.
  4. A fixed bottom bar carries the primary CTA (the finish bar of the survey summary, the floating letter strip and next button of the factor pager). *Rewritten 2026-10-07 (owner decision): the 2×5 factor grid with a progress ring per factor and the segmented total gauge were dropped by the new-survey wizard (OA-25, OA-40, OA-98); the running total shows in the factor pager and the survey list keeps a survey-level ring.*
  5. The decimal comma is accepted in every numeric entry point that remains. *Rewritten 2026-10-07 (owner decision): the visible autosave line ("Enregistré · 14:32") is dropped; drafts still save automatically and the manual "Save draft" label is gone.*
  6. The parcel map's selected/studied/free states use accessible, on-brand colors readable in direct sunlight. *Rewritten 2026-10-07 (owner decision): the "Parcels near you" native sheet is dropped from parcel selection; selection is the full-screen parcel map step of the wizard. The list is to come back on the Home (SEED-004).*

**Plans**: 6 batches, executed and closed directly (no separate orchestrator/executor split for
this phase) — see `.planning/phases/12-field-entry-ergonomics/12-CONTEXT.md` and its
`03-0N-SUMMARY.md` files for what each batch shipped and its test evidence.
**Outcome (2026-10-06)**: closed. Two phone passes (the second on the build of `main` 4419590), 127 entries logged in the grid and every one closed or deferred: OA-124 (split the survey change log from the parcel history, SEED-002) and OA-127 (map layers, SEED-001) are phases of their own for later, not blockers. The owner wrote in chat: "La 12.1 est terminée, prêt pour les tests terrain à partir du 7 octobre 2026", then decided the same evening to do Phases 23 and 26 first ("tant pis pour la date"): Phase 28 keeps its dependencies and the field tests do not open on 2026-10-07. The demo data (`api/scripts/seed-demo-community.js`) stays on the server for the owner's tests and must be removed before the app opens to anyone else.
**UI hint**: yes
**Status**: Complete (2026-09-27). All 7 success criteria met; scope decisions (Factor A and F stay
numeric, B is chips not slider, the CTA is not renamed to "Vérifier et soumettre") are recorded in
`12-CONTEXT.md`.

### Phase 13: Visual Foundations & Motion (INSERTED, UX audit Lot 2)

**Goal**: The app looks like Etats Sauvages, not a generic SF Pro/Roboto build, and its motion runs on the UI thread instead of ad hoc JS timers.
**Depends on**: Phase 12 (extends the token slice Phase 12 already added — spacing, empty/error/complete colors, interaction states — rather than replacing it; this phase's own job is the parts Phase 12 didn't need: fonts, the full hex-literal migration, the motion engine, and the components below)
**Requirements**: none yet in `REQUIREMENTS.md` — added by the 2026-09-27 owner decision
**Source**: `docs/design/ux-ui-audit-2026-09.md` §3.4 (DS-01…DS-16), §4 (motion system), §5 (tokens) and §7 Lot 2
**Success Criteria** (what must be TRUE):

  1. The charter's typefaces (Mazzard H, or Avenir Next as an explicit stand-in pending licence) load through an `expo-font` config plugin and are wired into `brandTypography`; no screen renders in the OS default face.
  2. The 125 hard-coded hex/`rgba` colors outside `brand-tokens.ts` are gone, replaced by semantic tokens (`onWarningSurface`, `onDangerSurface`, `onDark.*`, `map.*`); an ESLint rule rejects a new hex literal or `rgba(` outside the tokens file.
  3. `react-native-reanimated` 4 and `expo-haptics` back a `brandMotion` token set (durations, easings, springs) and a semantic `ui/feedback.ts`; the legacy `Animated`/`LayoutAnimation` calls in the collapsible headers are migrated to `useAnimatedScrollHandler` on `translateY`/`opacity`.
  4. `AppPressable` is the single pressable primitive (spring scale, Android ripple, mandatory accessibility label) and replaces the inconsistent pressed-opacity values across `DraftCard`, `ParcelNearbyCard` and `AppButton`.
  5. A `Skeleton`/`SkeletonRow` pulse replaces static loading placeholders; every animation and decorative loop respects "Reduce Motion" and pauses in the background.
  6. `docs/design/charte-graphique-etats-sauvages-spec.md` is updated with the typefaces actually loaded, the full semantic token list, the motion tokens (`brandMotion`) and `AppPressable`'s interaction spec — closing the gap the audit found between the written charter and the shipped app.

**Plans**: 5 batches, executed and closed directly (no separate orchestrator/executor split for this
phase) — see `.planning/phases/13-visual-foundations-motion/13-CONTEXT.md` and its
`04-0N-SUMMARY.md` files for what each batch shipped and its test evidence. A sketchboard (an
interactive HTML mock, not shipped code) was iterated on live with the product owner before any code
was written, since this phase is almost entirely visual; the three decisions that came out of that
session (Sora+Jost over an alternative pairing, the IBP badge's forest-on-sage contrast fix, the
press spring's numbers unchanged) are recorded in `13-CONTEXT.md` and carried through every batch.
**UI hint**: yes
**Status**: Complete (2026-09-27). All 6 success criteria met. No simulator/display in this cloud
session, so batches were validated by the sketchboard (real Sora/Jost webfonts and the exact token
colors, checked with the product owner before code) plus lint/typecheck/`test:unit`/format as
correctness gates, not by eyeballing the running app — stated explicitly rather than claimed as
verified-in-app, per `13-CONTEXT.md`.

### Phase 14: Factor A Genus List & Data-Contract Corrections

**Goal**: Factor A records the observed native genera as a list rather than a bare count, through contracts written down before any UI exists; surveys already recorded keep their scores; and the two stale spec sections that contradict shipped behaviour are corrected.
**Depends on**: Phase 1, Phase 2 (the Factor A genus list must come from the ratified method version), Phase 9 (the Factor A rules, the CNPF genus list as an allowed set, and the sync contract types all belong in the `packages/ibp-domain` workspace that phase creates)
**Requirements**: REQ-ML-contracts, REQ-DOC-form-spec
**Input from Phase 2**: CH-12 in ADR-003 (`docs/technical/adr-003-ibp-method-version-v1.md`): the Factor A genus list comes from IBP FR v3.2 p. 3 and Table 1, keyed by cas (supplementary genera for cas 4 and 2, coastal-only Juniperus species, Ficus not counted, Pistacia per the CNPF answer).
**Success Criteria** (what must be TRUE):

  1. `docs/technical/data-contract-v1.md` defines Factor A as a list of observed native genera drawn from the closed CNPF regional list, with the genus count derived from it, replacing the single `native_genus_count` number (ADR-002, D-15). There is no species entity: recognition is genus-level only (D-01), and neither the recognition photo (D-13) nor the ecologist's acceptance or correction of a suggestion (D-14) is stored.
  2. `docs/technical/api-contract-v1.md` documents the Factor A genus-list shape in the survey payload under `/v1`, validated against the CNPF list, with standard error codes. No recognition endpoint exists — inference is on-device (ADR-002, D-06).
  3. A migration introduces the genus list and states explicitly what happens to surveys already recorded as a bare count, which cannot be decomposed into named genera; their Factor A score is unchanged. `npm run migrate:api` applies cleanly on an empty database and on a copy of existing data.
  4. Factor A scoring derives from the genus list in `packages/ibp-domain` (Phase 9), to which both `IbpRulesService` and `mobile/src/app/ibp-scoring.ts` delegate; the CNPF genus list is one of the package's allowed sets and the genus-list payload shape is one of its sync contract types. The package's parity fixture and the 17 reference cases in `docs/technical/ibp-validation-matrix-v1.md` still pass.
  5. The genus list survives a round-trip through `POST /surveys/sync`: an E2E test replays the same payload twice and nothing is duplicated.
  6. `docs/specs/ibp-form-spec.md` §4 states that a survey may reference one or many parcels (`parcel_ids[]`), and §10.1 lists the shipped status enum `draft | submitted | synced | error | expired` with `submitted_at` and `deleted_at` — no `deleted` value, no `published_at`.

**Plans**: 1/1 plans complete

Plans:

- [x] 14-01-PLAN.md — Genus list in `packages/ibp-domain` (genus code list, derived count, validation), migration 018 (017 was claimed by Phase 11), API/mobile E2E and contract docs, form-spec corrections

### Phase 15: Genus Recognition for Factor A

**Goal**: A surveyor fills Factor A faster by photographing a tree than by naming its genus from memory.
**Depends on**: Phase 14
**Requirements**: REQ-C-species-recognition
**Inputs from Phase 1**: the promoted model `genus_classifier.tflite` (EfficientNet-B0, float16, 8.24 MB) and the per-genus confidence calibration table — both measured artefacts ADR-002 rests on. Both are preserved outside the repository at `~/Projects/cortege-ml-artifacts/genus-classifier-iteration4/` (model, labels, Keras source, training and export reports, calibration table and re-cut scale — 42 MB, MD5-verified against the originals on 2026-09-26). They are deliberately not committed: 42 MB of binaries would stay in git history forever. The calibrated thresholds are also versioned in `docs/technical/species-recognition-spike-measurements-v1.md` §15.2.
**Success Criteria** (what must be TRUE):

  1. From the Factor A section, the surveyor photographs a single subject — one tree, a leaf or bark (D-10) — and sees the most likely genus first with its alternatives underneath (D-11), each carrying a plain-words confidence indicator (D-12).
  2. The indicator uses ADR-002's per-genus calibrated thresholds, so a given label means the same reliability whichever genus is shown; all 34 CNPF genera are suggested and none is withheld (D-04).
  3. A suggestion never applies itself: the surveyor confirms it, and the accepted genus is added to Factor A's genus list (Phase 14), which is there again when the survey is reopened. The recognition photo is not kept (D-13).
  4. Recognition works with the device in airplane mode: the model is bundled in the app binary (D-07, amended) and inference is on-device (D-06). If the model fails to load, the surveyor sees a clear message and falls back to manual entry (D-08).
  5. The genus list reaches the server through the normal sync flow and appears in the survey read back from the API.
  6. **Closes Phase 1's accepted Android deviation:** a real Android device run records median, p95 and worst total latency, online and in airplane mode, against the 3 s budget, plus an accuracy spot-check confirming the bundled `.tflite` behaves as on iOS. Recorded in the same format as the measurement document's Section 7. The feature does not ship until this is done.

**Plans**: 1/1 complete (15-01-PLAN.md — Factor A genus-list UI, the photograph → classify →
confirm entry point, per-genus calibrated confidence, bundled-model plumbing, GBIF attribution
row), plus a follow-up fix (PR #178) that swapped in the real model.

**UI hint**: yes
**Status**: Complete (2026-09-27), with one explicit gap deferred to Phase 28. Criteria 1-5 are
fully built: `FactorGenusListInput` (Factor A's genus-list UI, which Phase 14 had left as a stale
numeric field), `GenusRecognitionModal`'s photograph → classify → confirm flow, per-genus
calibrated confidence bands (`mobile/src/recognition/calibration.ts`), the bundled-model plumbing
(`react-native-fast-tflite`, on-device only, fails closed to manual entry on a load error), and the
existing `/v1/sync` round-trip (unchanged, Phase 14 already proved it). The real, MD5-verified
`genus_classifier.tflite` (PR #176 shipped a placeholder pending it; PR #178 replaced it) is now in
place: 8,238,676 bytes, labels in the model's real output-tensor order (`genus_labels.txt`, not
alphabetical — `Pinus` before `Picea`), and preprocessing confirmed (not assumed) by loading the
source `SavedModel` and reading its graph — an internal `Rescaling` (1/255) plus `Normalization`
(ImageNet mean/variance) ahead of the backbone, so the app feeds raw `[0, 255]` pixels. Criterion
6 (a real Android device run: median/p95/worst latency online and in airplane mode, plus an
accuracy spot-check, closing Phase 1's own accepted deviation) was not performed — no Android
device was available in either container this phase ran in. Real-device recognition accuracy
against actual tree photographs (not just the lab/GBIF figures ADR-002 already caps) was likewise
not exercised on-device. Both are explicitly deferred to Phase 28's field validation, per the
owner's 2026-09-27 decision, rather than blocking this phase indefinitely.

### Phase 16: Information Architecture (INSERTED, UX audit Lot 3)

**Goal**: Home and Mes Relevés each do one job instead of duplicating each other, sync state is visible wherever it matters, and survey detail and Compte read as one coherent app.
**Depends on**: Phase 13 (this phase's new components — `SyncStatusPill`, `SurveyProgressCard`, `IbpFactorBars`, `AppGroupedList` — are built on Lot 2's tokens and motion primitives)
**Requirements**: none yet in `REQUIREMENTS.md` — added by the 2026-09-27 owner decision. Note: SYNC-02 (a visible offline/queue indicator) restates the spirit of `REQ-D-offline-work` and `REQ-D-auto-sync`, which this milestone already built but never surfaced outside Settings.
**Source**: `docs/design/ux-ui-audit-2026-09.md` §3.2 (HOME-01…SYNC-03) and §7 Lot 3
**Success Criteria** (what must be TRUE):

  1. Home becomes a dashboard (resume action, actionable alerts, progress in the resume hero); Mes Relevés becomes a pure list (title, search, filters, a "+" in the header). *Rewritten 2026-10-07 (owner decision, after the Phase 22 redesigns): the duplicated draft cards are gone rather than merged into a `SurveyProgressCard`.*
  2. Sync state (offline · N to send · syncing · up to date) is visible outside Settings, as the quiet sync line on Home; a blocked/conflicted survey never reads "Soumis" in green (BUG-03, carried to every screen that shows survey status). *Rewritten 2026-10-07 (owner decision, after the Phase 22 redesigns): the pill was replaced by `SyncStatusLine` and Mes Relevés carries no indicator (OA-51).*
  3. Survey detail shows one score with its denominator and a peuplement/contexte split, instead of the same number repeated three times with no scale. *Rewritten 2026-10-07 (owner decision, after the Phase 22 redesigns): delivered by the score card and the score sub-page (OA-46); `IbpFactorBars` is not used.*
  4. The survey list row shows a score or progress ring; deletion follows the iOS swipe convention (destructive on the right) with a confirmation and an accessible alternative.
  5. Compte is a grouped iOS-style list (Profile, Connection, then Sign out) instead of a mix of inline forms, rows and pills. *Rewritten 2026-10-07 (owner decision, after the Phase 22 redesigns): Data and About moved to Paramètres (OA-75).*

**Plans**: 6 batches, executed and closed directly (no separate orchestrator/executor split for
this phase) — see `.planning/phases/16-information-architecture/16-CONTEXT.md` and its
`07-0N-SUMMARY.md` files for what each batch shipped and its test evidence; `16-VALIDATION.md` maps
each success criterion above to its batch. `origin/main` was merged before batch 5 (survey detail)
and again before opening the PR, per the cross-phase coordination note with Phase 17/Phase 19 — no
conflicts, no overlap with the score-display change.
**UI hint**: yes

### Phase 17: Offline Map & Own-Survey Navigation

**Goal**: The surveyor can find their way around a parcel and see the association's recorded work on the map, with no network at all.
**Depends on**: Phase 11 (the map this phase makes offline-capable is the member-authenticated one Phase 11 ships; the "own surveys" framing below is superseded — see that phase)
**Requirements**: REQ-D-offline-map, REQ-D-area-download, REQ-D-offline-parcel-warning, REQ-D-basemap-switch
**Success Criteria** (what must be TRUE):

  1. ~~The map screen shows the surveyor's own surveys instead of the public anonymized set~~ — done in Phase 11, which repoints the map to all authenticated members' surveys instead. This phase builds offline capability on top of that map; navigation stays unchanged.
  2. The surveyor switches between a satellite and a map basemap, and the choice persists while navigating.
  3. The surveyor selects an area, sees its estimated download size and progress, and the downloaded area is still usable after force-quitting and relaunching the app; downloaded areas can be listed and deleted.
  4. In airplane mode the map shows an offline indicator, renders the downloaded basemap and cached parcels, follows GPS, and still allows zoom, pan and parcel selection.
  5. When a parcel is missing from the offline cache, the app says so plainly and offers a download action that runs once the network returns — no infinite spinner.

**Plans**: executed and closed directly (no separate orchestrator/executor split), autonomous
execution — see `.planning/phases/17-offline-map-own-survey-navigation/17-CONTEXT.md` for the
scope boundary and every design decision (tile source, zoom range, download concurrency/size cap,
what "cached parcels" means).
**UI hint**: yes
**Status**: Complete (2026-09-27), with one explicit gap. Criteria 2, 3 and 5 are fully built and
unit-tested: a persisted Plan/Satellite basemap toggle; an offline-areas sheet with a client-side
size estimate, live progress, list and delete, surviving a relaunch via a new SQLite migration
(`offline_areas`, `offline_area_parcels`, `offline_pending_parcels`) and per-area files under the
document directory; and a plain "not cached, will retry when back online" notice with a queued
download that drains automatically on reconnect. Criterion 4 is built for the basemap, cached
parcels, zoom/pan and parcel selection (the app's own IGN raster tile layer switches to local
files offline, `ParcelOverlayPolygons` reads the offline parcel-status cache instead of the
network), but GPS "follow" while offline was not touched — `PublicMapScreen`'s existing
`handleLocate` already works without a live network call (`expo-location` is on-device), so no
code change was needed there, but it has not been checked on a real device in airplane mode. No
simulator or physical device is available in this cloud session (same constraint as Phase 13), so
verification is lint/typecheck/`test:unit`/format plus full coverage-threshold runs, not an
on-device airplane-mode walkthrough — stated explicitly rather than claimed as verified-in-app.
That on-device check (criterion 3's "survives a force-quit and relaunch", criterion 4's airplane-
mode walkthrough) is the one item Phase 28's field validation should confirm.

### Phase 18: Onboarding & Explorer Polish (INSERTED, UX audit Lot 4)

**Goal**: A first launch explains the app and asks for permissions with context, and the now member-only Explorer map behaves like a real map instead of a prototype.
**Depends on**: Phase 17 (this phase's map-sheet and filter work happens on the offline-capable, member-authenticated map Phases 11 and 17 ship — building it earlier would mean redoing it once offline support lands)
**Requirements**: none yet in `REQUIREMENTS.md` — added by the 2026-09-27 owner decision. Sign-in-with-Apple (ONB-04) is explicitly **not** built here: US-A4 (social login) is deferred to the next milestone (Phase 11, criterion 7).
**Source**: `docs/design/ux-ui-audit-2026-09.md` §3.3 (ONB-01…MAP-05) and §7 Lot 4
**Success Criteria** (what must be TRUE):

  1. A three-screen carousel (ten factors · offline · member map) runs before login on first launch, followed by a permissions-priming screen for location and camera with a link to Settings on refusal; "already seen" is persisted.
  2. The Expo splash and adaptive icon are configured natively, so no default Expo splash flashes before `TypewriterSplash`.
  3. Explorer's floating panels become one blurred sheet instead of absolutely-positioned cards. *Rewritten 2026-10-07 (owner decision, after the Phase 22 redesigns): the tiered native sheet failed on iOS 27 (OA-66) and all Explorer filters were removed (OA-67), so there are no chips, active-filter count or reset.*
  4. Map markers show the survey's score band (moss/ochre/terracotta) with a legend, instead of a single off-brand system pin color; the user's position uses the native `showsUserLocation` halo instead of a custom marker.

**Plans**: 7 batches, executed and closed directly (no separate orchestrator/executor split for
this phase) — see `.planning/phases/18-onboarding-explorer-polish/18-CONTEXT.md` and its
`09-0N-SUMMARY.md` files for what each batch shipped and its test evidence; `18-VALIDATION.md` maps
each success criterion above (plus the task's criterion 5 remediation sweep: DS-05, DS-10, DS-11,
DS-13, DET-03/04, HOME-06, LIST-07, ACC-02) to its batch.
**UI hint**: yes

### Phase 19: Survey Export & Ownership

**Goal**: The surveyor can get a survey out of the app and clean up their own surveys — with no network and no back-office.
**Depends on**: Nothing (independent of Phases 1–13)
**Requirements**: REQ-C-pdf-export, REQ-B-manage-published
**Success Criteria** (what must be TRUE):

  1. [x] From a survey's detail, the surveyor generates a PDF on the device and sends it through the OS share sheet to any installed target — Google Drive, Wimi, mail, AirDrop. (`survey-pdf-export.ts`'s `exportAndShareSurveyPdf`) *Rewritten 2026-10-07 (owner decision, after the Phase 22 redesigns): the button is now the "Partager" item of the survey header (Phase 22), not "Exporter en PDF" in `DetailActions.tsx`.*
  2. [x] The export works in airplane mode: the PDF is produced and shared with no API call. (no `fetch`/`apiRequest` in `survey-pdf-export.ts`; `observation_year`/`version_number` cached locally via `cacheSurveyCanonicalFields` so they survive an offline restart — see `19-CONTEXT.md` D-01)
  3. [x] The PDF contains the survey's identifying data (site, parcel ids, observation year, version, date), the ten factor values as class labels and the IBP total. (`buildSurveyExportHtml`, unit-tested in `survey-pdf-export.test.ts`) *Rewritten 2026-10-07 (owner decision, after the Phase 22 redesigns): class labels, not points, as `19-CONTEXT.md` D-02 decided.*
  4. [x] The surveyor deletes their own survey behind a confirmation step, and it disappears from their list. (already built pre-Phase-10 — `confirmDeleteSurvey`'s `Alert.alert` + synchronous local delete; verified, not rebuilt)
  5. [x] ~~No private/public visibility control is presented anywhere in the app~~ — done in Phase 11, re-verified in Phase 19.

**Plans**: `10-01` (single wave — PDF export module, action-bar wiring, offline-caching fix, delete/visibility verification)
**UI hint**: yes

### Phase 20: Durable Backend

**Goal**: The production database can survive a failure, the hosting that is actually running is the hosting that is written down, and the API no longer carries dead or unsafe code.
**Depends on**: Nothing (independent of Phases 1–14)
**Requirements**: REQ-INF-hosting-adr, REQ-INF-backups, REQ-INF-migrations, REQ-INF-deadcode, REQ-QA-sql-injection, REQ-QA-indexes
**Success Criteria** (what must be TRUE):

  1. [x] An accepted ADR ratifies the current VPS stack — Docker + Caddy + GHCR + systemd timer + MinIO on `cortege.algernon.ovh` — as the hosting target, superseding the unratified alwaysdata + Cloudflare R2 note. (`docs/technical/adr-004-hosting-and-infrastructure-v1.md`)
  2. [x] A scheduled PostgreSQL backup runs unattended, and a restore of one of those backups into a clean database has been performed and recorded at least once. (`infra/vps/backup-postgres.sh` + `restore-postgres.sh` + `cortege-backup.timer`; rehearsed locally, recorded in `.planning/phases/20-durable-backend/20-02-SUMMARY.md`)
  3. [x] A fresh database and the production database reach the same schema version through one documented path, and a deliberately failed migration leaves the schema unchanged rather than half-applied. (`api/migrations/README.md`; verified locally, recorded in `20-03-SUMMARY.md`)
  4. [x] `api/src/users/email.service.ts` and the vestigial `SMTP_*` variables are gone from the repo, from `api/.env.example` and from the deployment env. (already true since Phase 10; verified, recorded in `20-05-dead-code-verification.md`)
  5. [x] A lint rule rejects interpolating values into SQL strings (account deletion already interpolates only constant subqueries and binds `$1`, verified 2026-09-23); `survey_events(actor_id)` is indexed and the redundant `idx_users_auth0_sub`, `idx_survey_parcels_survey_id` and `idx_surveys_parcel_id` are dropped — confirmed by `EXPLAIN` on account deletion and the survey list. (`api/eslint-local-rules/sql-no-unsafe-interpolation.js`; index work already done by migration 015; `EXPLAIN` evidence in `.planning/phases/20-durable-backend/evidence/`)

**Plans**: 4 (`.planning/phases/20-durable-backend/11-01` through `11-04`, plus a dead-code verification note)

### Phase 21: Interface Finishing (INSERTED, UX audit Lot 5)

**Goal**: The remaining audit findings that don't block a field test — dark mode, fuller use of Liquid Glass, a real history view — are closed before the app is judged in the field.
**Depends on**: Phase 16, Phase 18
**Requirements**: none yet in `REQUIREMENTS.md` — added by the 2026-09-27 owner decision. **Carve-out:** the audit's "Ma saison" gamification module (points, badges, next-reward teaser) is explicitly excluded — it is Epic F, deferred to the next milestone per this milestone's own scope decision, and stays out even though the rest of Lot 5 is pulled into MVP.
**Source**: `docs/design/ux-ui-audit-2026-09.md` §3.4 (DS-12, DS-15), §3.2 (DET-05) and §7 Lot 5 (minus the gamification item)
**Success Criteria** (what must be TRUE):

  1. [x] `light`/`dark` themes exist on the same semantic tokens through `useBrandTheme()`, defaulting to `automatic`. (`mobile/src/app/theme.ts`, persisted via `storage/theme-preference.ts`, picked in Settings' new "Apparence" section; every screen/component converted, see `12-01` through `12-04` and `12-06`/`12-07` summaries)
  2. [x] Floating map and card controls use `expo-blur` or `expo-glass-effect` instead of a flat `rgba` fill (`ui/GlassSurface.tsx` + `AppCard`'s `glass` prop). *Rewritten 2026-10-07 (owner decision, after the Phase 22 redesigns): parcel selection is one full-screen glass parcel map, not a `formSheet` with detents (OA-91, OA-97).*
  3. [x] Survey-detail history renders as an icon timeline with pull-to-refresh and a loading skeleton, instead of plain text. (`EventsTab.tsx` rewrite + new `event-icons.ts`, `SkeletonRow`, `SurveyDetailScreen.tsx`'s `RefreshControl` — `12-07`)

**Plans**: 7 batches, executed and closed directly (no separate orchestrator/executor split) — see
`.planning/phases/21-interface-finishing/21-CONTEXT.md` and its `12-0N-SUMMARY.md` files for what
each batch shipped; `21-VALIDATION.md` maps each success criterion above to its batch.
**UI hint**: yes

### Phase 22: Owner acceptance testing (INSERTED)

**Goal**: The app is good enough to put in front of the association's observers: the owner has used it on their own phone, every display bug and UX friction they found is logged and triaged, and the blockers are fixed.
**Depends on**: Phase 21
**Requirements**: none yet in `REQUIREMENTS.md` — added by the 2026-09-28 owner decision
**Source**: owner decision 2026-09-28. Testing the app on their own phone, the owner still finds many ergonomics problems and display bugs, and judged Phase 28's field tests with the association premature until those are dealt with.
**Success Criteria** (what must be TRUE):

  1. The owner has used the app on their own phone across the main flows (sign-in, Home, a survey from creation to submission, Mes Relevés, survey detail, Explorer, Compte), in light and dark mode.
  2. Every display bug and UX friction the owner finds is logged in one grid (`docs/user-tests/owner-acceptance.md`) with an ID, the screen concerned, a description (and a screenshot where useful), and triaged as *blocker before field tests*, *fix later* or *rejected* (with a reason).
  3. Fixes land in batches; after each batch the owner re-tests the entries it closes, and an entry is closed only when the owner confirms it on the phone.
  4. The owner explicitly records that the app is ready to open field tests to the association, with no open *blocker before field tests* entry left.

**Plans**: TBD. The phase is an iterative loop (owner test → triage → fix batch → re-test), not a fixed plan list.
**Scope decision (2026-10-05, OA-41)**: the submission deadline is out of the app for now. The survey detail shows no deadline, and the API's `expires_at` and `expired` status are no longer surfaced; removing them from the API and the data contract is part of the survey-detail redesign (OA-46), not a separate phase.
**Update (2026-10-06, OA-41)**: the deadline was hidden but still enforced: the server refused a submit made more than 7 days after creation and marked the survey `expired` for good, and the phone did the same locally. Done in one batch (owner: production is test data, nothing to preserve): the deadline is not applied anywhere (domain, API, phone), the `expires_at` column and the `expired` status are removed (API migration 019, SQLite migration 4), and a survey the old rule had marked `expired` goes back to `draft`.
**UI hint**: yes

### Phase 23: Visual Modernisation (INSERTED)

**Goal**: The app is more pleasant to look at, more modern and more dynamic, in light and dark mode, before the association sees it.
**Depends on**: Phase 21 (dark mode, Liquid Glass, motion system), Phase 22 (the owner's findings feed this phase rather than being redone)
**Requirements**: REQ-QA-visual-modernisation
**Source**: owner decision 2026-10-06, folded into the MVP.
**Success Criteria** (what must be TRUE):

  1. A short visual direction is written down (what "modern and dynamic" means for the brand charter `docs/design/charte-graphique-etats-sauvages-spec.md`: typography, colour, depth, iconography, imagery) and the owner approves it before the screens are touched.
  2. The main screens (Accueil, Mes Relevés, survey form and detail, Explorer, Compte) follow that direction, in light and dark mode, with no regression on field ergonomics (Phase 12) or accessibility (contrast, touch targets, reduced motion).
  3. Transitions and feedback use the Reanimated motion system consistently and respect the system reduced-motion setting.
  4. The maps are colourised: the base map is no longer only the grey IGN plan and the satellite photo. A comparison board (same places, same parcels, each candidate background) comes first, the owner picks, then the chosen colourised background is integrated in light and dark mode, with the cadastre and the parcel colours (selected, studied, not studied, score) staying legible on every background. Added 2026-10-08 (owner decision, from SEED-001 / OA-127).
  5. Offline map packs stay reasonable with the new background (size of a zone, number of IGN tiles at zooms 13 to 17, a style with its sprites so that downloading does not fail as the grey style did, OA-120).
  6. The design specification is updated in the same phase: `docs/design/charte-graphique-etats-sauvages-spec.md` describes the visual direction, tokens, components and motion rules as they are after this phase, so the spec and the code do not drift apart.
  7. Existing design components are reused, not recreated, and the ones already created are homogenised. First an inventory of the components in `mobile/src/ui/` and in the screen folders: duplicates and near-duplicates (several buttons, cards, pills, sheets, rows, headers doing the same job) are merged into one component with variants, and inconsistent props, spacing and states are aligned. Then every screen touched builds on the shared components and the tokens in `app/brand-tokens.ts` and `app/theme.ts`; a new component is added only when no existing one fits, and is then documented in the spec. No one-off style or duplicate component is left behind (the colour lint rule stays green).
  8. Native libraries and platform components are used as much as possible (native iOS tab bar and header items, native sheets, menus and pickers, Liquid Glass through `expo-glass-effect`, the maps and animation libraries already in the project) instead of custom-drawn equivalents; each custom component that remains has a stated reason.
  9. The owner confirms the result on their own phone.

**Plans:** 23/23 plans executed

Plans:
**Wave 1**

- [x] 23-01-PLAN.md — Align the direction text with the planning defaults; owner gate before any code (criterion 1)
- [x] 23-02-PLAN.md — Reanimated mock reduced-motion toggle, motion gate test, ibp-display and contour-paths helpers

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 23-03-PLAN.md — Visual tokens and BrandTheme.visual, contrast test, radii and typography roles, Sora Light, ESLint colour rule repair

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 23-04-PLAN.md — ForestCard, ContourLines, GradientNumeral, GlowBar, useScreenFocus
- [x] 23-05-PLAN.md — AppCard glass variant, ScreenBackdrop, AppButton glow variant, HaloPulse
- [x] 23-06-PLAN.md — ScoreRing, FactorBarsChart, useEntrance, AnimatedNumber, status dot spring, catalogue entries
- [x] 23-07-PLAN.md — Both tab bar trees, glass chips with inverted active state, section header and page title

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 23-08-PLAN.md — Home: forest resume card, backdrop, glass cards, sector ring, entrances (batch 1)
- [x] 23-09-PLAN.md — Account and Settings: glass grouped lists with icon tiles, compact layout (batch 1)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 23-10-PLAN.md — Owner phone check, batch 1

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 23-11-PLAN.md — My Surveys and search: score rings, glass rows, entrances, animated empty state (batch 2)
- [x] 23-12-PLAN.md — Survey detail summary: forest score card, factor bars, submit feedback (batch 2)
- [x] 23-13-PLAN.md — Survey detail Score, History and Context pages (batch 2)

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 23-14-PLAN.md — Owner phone check, batch 2 (numeral rendering decided here)

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 23-15-PLAN.md — Factor entry chrome: pager, letter strip, tiles, rings, factor detail (batch 3)
- [x] 23-16-PLAN.md — Survey wizard and factor inputs, tokens only (batch 3)

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 23-17-PLAN.md — Owner phone check, batch 3 (field ergonomics)

**Wave 10** *(blocked on Wave 9 completion)*

- [x] 23-18-PLAN.md — Explorer overlays, selected card, cluster list, sheets; map untouched (batch 4)

**Wave 11** *(blocked on Wave 10 completion)*

- [x] 23-19-PLAN.md — Owner phone check, batch 4

**Wave 12** *(blocked on Wave 11 completion)*

- [x] 23-20-PLAN.md — Outline icon harmonisation and icon gate (D-07)
- [x] 23-21-PLAN.md — Em dash catalogue gate, motion consistency audit, dark pass
- [x] 23-22-PLAN.md — Charter section 13, direction corrections, Phase 28 Android carry-over (planned as "Phase 13"), animals seed, CLAUDE.md note

**Wave 13** *(blocked on Wave 12 completion)*

- [x] 23-23-PLAN.md — Final owner confirmation on the phone and approval of the direction text (criteria 1 and 9, numbered 1 and 4 when planned)

**Cross-cutting constraints:**

- D-18: this checkpoint stops the pipeline (gate blocking-human) and is never auto-approved
- Only open Phase 22 (old 12.1) findings on these screens are absorbed, named by OA id (D-10)

**Coverage note (merge of main, 2026-10-08):** plans 01 to 23 were written against the first four criteria (now criteria 1, 2, 3 and 9). Criteria 4 to 8 (map colourisation, offline packs with the new background, design spec kept in step, component inventory and homogenisation, native components first) were added to this phase on main on 2026-10-07 and 2026-10-08 and are not covered by these plans yet; the phase stays open for them.

**UI hint**: yes

### Phase 24: Survey History Split (INSERTED)

**Goal**: The survey's change log and the parcel's history are two separate things, each easy to read.
**Depends on**: Phase 23 (built on the modernised screens, so the audits that follow see the final interface)
**Requirements**: REQ-C-history-split
**Source**: owner decision 2026-10-07. SEED-002 (OA-124, change log vs parcel history). SEED-004 (nearby parcels on Home) was folded into Phase 23 by the owner and is not part of this phase.
**Success Criteria** (what must be TRUE):

  1. The survey change log (creation, edits, sync, completion) and the history of earlier surveys on the same parcel (with the score evolution) are no longer mixed on one page: they are two distinct entries, the placement being decided on a mock-up first, as OA-124 asks.
  2. A survey from another member keeps showing the parcel history and never the change log.
  3. The owner confirms it on their phone, in light and dark mode.

**Plans**: 11/12 plans executed

**Wave 1**

- [x] 24-01-PLAN.md — API and wire contract: `ibp_method_version` on the two history payloads (only API touch; triggers native CI)
- [x] 24-02-PLAN.md — Building blocks: grouped-list `multiline` row, history hook `reload`/refresh key, community hook `withPhotos`, delta-text contrast pairs
- [x] 24-03-PLAN.md — "Journal du relevé" page and `surveyJournal` route, `EventsTab` `hideHeader`, journal strings, navigation tests

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 24-04-PLAN.md — Pure model (TDD): `app/parcel-history.ts` and `app/trend-geometry.ts`
- [x] 24-05-PLAN.md — Catalogue: parcel history page texts, summary row texts, header titles, "version N" entry
- [x] 24-06-PLAN.md — "Journal du relevé" entry in the summary's "…" menu (iOS native menu and sheet); export and delete unchanged (D-05)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 24-07-PLAN.md — Summary row "Historique de la parcelle" with its derived value
- [x] 24-08-PLAN.md — Trend card and SVG curve (reveal spike first, fallback dash offset)
- [x] 24-09-PLAN.md — Per-factor delta card and parcel survey list

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 24-10-PLAN.md — Parcel history page assembled (`surveyHistory`), old history section removed

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 24-11-PLAN.md — Another member's survey: history row and `communityHistory` page in both stacks, no change log

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 24-12-PLAN.md — CLAUDE.md note and owner phone check, light and dark (criterion 3), then OA-124 closed

**UI hint**: yes

### Phase 25: Global Search (INSERTED)

**Goal**: One search field finds anything in the app: the member's own surveys, the other members' surveys, places and parcels on the map, and the other items the app exposes.
**Depends on**: Phase 24 (built on the final survey screens); an API search endpoint is likely needed for the community and places parts
**Requirements**: REQ-B-global-search
**Source**: owner decision 2026-10-07. SEED-003. Done before Phases 26 and 27 so the audits cover the final navigation.
**Success Criteria** (what must be TRUE):

  1. A single search entry point, reachable from every main tab, returns results grouped by item type (own surveys, community surveys, places and parcels, and the other items the owner lists when the phase is discussed), each result leading straight to the item (survey page, map centred on the place or parcel).
  2. Own surveys are searched offline from local data; community surveys and places need the network and say so plainly when offline, without hiding the local results.
  3. Place search resolves a place name or address to a map position, using a provider consistent with the existing cadastre provider choice (the discussion decides which, and the cost stays inside the milestone budget).
  4. The search is fast enough to feel instant on a typical phone (debounced input, bounded results per group), with empty, no-result and error states, and all texts from the French catalogue.
  5. The owner confirms it on their phone, in light and dark mode.

**Plans**: 15/15 plans executed

**Wave 1**

- [x] 25-01-PLAN.md — Search wire types in `@cortege/ibp-domain`, accent folding and the pure phone rules (own match, parcel gate, member match, D-14 best result, group order, summaries)
- [x] 25-02-PLAN.md — Catalogue `fr.search` and recent searches in `local_meta` (cleared by `clearLocalIbpData`)
- [x] 25-03-PLAN.md — Fourth JS tab "Rechercher" (Android, Expo Go), old Mes Relevés magnifier and `surveySearch` route removed, `searchGroup` params typed
- [x] 25-04-PLAN.md — Result rows: shared `CompactSurveyRow` (Accueil unchanged), `CommunityRow` compact and moved, `SearchResultRow` (member, place, parcel)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 25-05-PLAN.md — API community and members: migration 022 (`unaccent`, parcels key index), SQL builders, `SearchService.community`
- [x] 25-06-PLAN.md — API places: `GEOCODING_IGN_SEARCH_URL`, shared IGN HTTP helper, `GeocoderService` (cache, de-duplication, cap, 503, commune resolution)
- [x] 25-07-PLAN.md — Phone data layer: client functions, `useSearchGroup`, `useGlobalSearch`, `useSearchRecents`
- [x] 25-08-PLAN.md — Explorer focus union (survey, place, parcel), place pin layer, parcel highlight, `useExplorerFocus`
- [x] 25-09-PLAN.md — Group card, group notices (loading, offline, error), "Meilleur résultat" card, per-type result labels

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 25-10-PLAN.md — API parcels: `parseParcelQuery`, API Carto `lookupParcelByKey`, `ParcelSearchService` with database fallback and survey count
- [x] 25-11-PLAN.md — Search page: field, start page, results and no-result, `GlobalSearchScreen`, `SearchHomeRoute`
- [x] 25-12-PLAN.md — "Voir les N" full list: `SearchGroupListScreen` (chips, member list), `SearchGroupRoute`

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 25-13-PLAN.md — API `SearchController` (`/v1/search/community|places|parcels`), `search` throttle, e2e spec, API contract
- [x] 25-14-PLAN.md — Cutover of the search stack, render-count keystroke scenario, old search page and context query removed

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 25-15-PLAN.md — CLAUDE.md notes and owner phone check, light and dark (criterion 5), then REQ-B-global-search done

**UI hint**: yes

### Phase 25.1: PDF Export Improvement (INSERTED)

**Goal**: The PDF of a survey carries the same information as the official CNPF IBP survey sheet, in the brand finish, with the photos, the parcel map over a basemap and the parcel trend; it is still generated on the phone, works offline, and is shared through the OS share sheet.
**Depends on**: Phase 25
**Requirements**: none new: it rebuilds REQ-C-pdf-export (built in Phase 19); traced by the decisions D-01 to D-13 of `25.1-CONTEXT.md`
**Source**: owner decision 2026-10-09 ("il faut vraiment que ça contienne les mêmes infos que sur le pdf du relevé IBP initial, mais en plus beau"), decisions of 2026-10-10 (basemap, trend, stored details, history cache, photos not grouped by factor).
**Success Criteria** (what must be TRUE):

  1. The PDF shows, in the order of the CNPF sheet for the survey's method (v3.0 or v3.2), each factor A to J with its raw observations (including the strata, dendromicrohabitat groups, continuity sources and aquatic and rocky types the app now stores, D-12), the class scale with the retained class, the points and the scale line, then the subtotals /35 and /15 and the total /50 with their CNPF bands, and the method context (cas and cas-3 scale, or region and stage).
  2. It follows the brand charter (logo, Sora and Jost fonts, band colours, a factor chart, a header and a footer with "Page i / N" on every page), always light, every word from the French catalogue with no em dash; a draft carries a "Brouillon, non soumis" banner and a watermark on every page and its missing factors are marked.
  3. It includes all the survey's photos on their own pages in shooting order (capped if the device measurements require it), the parcel polygons over a basemap snapshot with scale and north arrow (the outline alone when no tiles are available offline), and the parcel trend from the history cached on the phone (a short note when there is none).
  4. The export never needs the network and never hangs: offline it makes no call, online its two optional reads are bounded; the shared file is named `Cortege-IBP-<site>-<year>.pdf`, with `-brouillon` for a draft.
  5. The owner confirms it on their phone: a draft and a submitted survey, a v3.0 and a v3.2 survey, the share names, and the export offline with and without a downloaded area.

**Plans**: 1/17 plans executed

**Wave 1**

- [x] 25.1-01-PLAN.md — expo-asset declared after a blocking check, Jest doubles, fonts and logo loader, photo pipeline
- [ ] 25.1-02-PLAN.md — Web Mercator projection (TDD) and bounded MapLibre basemap snapshot, offline-first
- [ ] 25.1-03-PLAN.md — Contracts: `fr.surveyExport` catalogue (dash exception removed), export data types, HTML helpers
- [ ] 25.1-04-PLAN.md — Stored details (D-12), data side: CNPF typology lists, `factor-selections.ts`, form payload and draft read
- [ ] 25.1-05-PLAN.md — Stored details round trip: API e2e (no API change), pull on another phone, specs and contracts
- [ ] 25.1-06-PLAN.md — Parcel history cache in `local_meta` (`parcel_history:<ID>`), purged by `clearLocalIbpData`

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 25.1-07-PLAN.md — Device spike on the iOS simulator and the Android emulator (worst case, measurements, approved constants)
- [ ] 25.1-08-PLAN.md — Stored details, inputs: controlled chips, F dendromicrohabitat groups, H sources, CNPF I/J types per method

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 25.1-09-PLAN.md — Factor cards A to J: raw observations, class scale, points, scale lines, missing marker
- [ ] 25.1-10-PLAN.md — Identity, method context, score summary with CNPF bands, factor chart
- [ ] 25.1-11-PLAN.md — Map page (basemap and overlay, outline, note) and photo pages
- [ ] 25.1-12-PLAN.md — Parcel trend from the cached history
- [ ] 25.1-13-PLAN.md — Document shell: light palette, CSP and embedded fonts, fixed A4 pages with header, footer, draft banner and watermark

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 25.1-14-PLAN.md — Full HTML document (end-to-end tests, both methods, both states) and the readable file name

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 25.1-15-PLAN.md — Offline-safe data loader and the print, rename and share runner

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 25.1-16-PLAN.md — Survey summary on the new pipeline (facade, `useSurveyPdfExport`, observer name), spike removed

**Wave 7** *(blocked on Wave 6 completion)*

- [ ] 25.1-17-PLAN.md — CLAUDE.md and charter notes, owner phone check (criterion 5), OA-131

**UI hint**: yes

### Phase 26: UX/UI Audit & Design System Update (INSERTED)

**Goal**: After the visual modernisation, the interface is coherent from one screen to the next, the design system documents what the app now is, and the visual bugs are gone.
**Depends on**: Phase 23 (audits and documents what Phase 23 produced)
**Requirements**: REQ-QA-ux-audit
**Source**: owner decision 2026-10-07, folded into the MVP. Baseline: `docs/design/ux-ui-audit-2026-09.md` and `docs/design/charte-graphique-etats-sauvages-spec.md`.
**Success Criteria** (what must be TRUE):

  1. A UX/UI audit report in `docs/design/` covers every screen in light and dark mode on iOS (and Android where it differs): global coherence (spacing, typography, colour, iconography, components, motion, wording), accessibility (contrast, touch targets, reduced motion, Dynamic Type) and visual bugs, with the previous audit's findings re-checked.
  2. Each finding has an ID, severity and a triage (*blocker before field tests*, *fix later*, *rejected* with a reason), logged in one grid.
  3. The design system is updated to match Phase 23: tokens, components and motion rules are documented in the charter, stale sections are corrected, and no screen keeps a one-off style the system does not describe (the colour lint rule stays green).
  4. Every *blocker before field tests* finding is fixed in batches, and the owner confirms them on their phone.

**Plans**: TBD
**UI hint**: yes

### Phase 27: In-depth Quality Audit (INSERTED)

**Goal**: We know, from a documented audit, the real state of code quality, test coverage, architecture and security, and the blockers it finds are fixed before field tests.
**Depends on**: Phase 20 (durable backend), Phase 26 (audit the code that will ship), and the 2026-09 audit (`docs/audits/audit-2026-09-code-complet.md`) as the baseline to compare against
**Requirements**: REQ-QA-deep-audit
**Source**: owner decision 2026-10-06, folded into the MVP.
**Success Criteria** (what must be TRUE):

  1. An audit report in `docs/audits/` covers four axes: code quality (duplication, dead code, complexity, lint and type debt), test coverage (measured per workspace, gaps on critical paths such as sync, auth and IBP rules), architecture (module boundaries, offline-first and sync design, shared `ibp-domain` package) and security (auth, authorisation per survey, input validation, rate limiting, storage and presigned URLs, secrets, dependencies, mobile data at rest).
  2. Each finding has an ID, severity and a triage (*blocker before field tests*, *fix later*, *rejected* with a reason); the previous audit's findings are re-checked as closed or still open.
  3. Every *blocker before field tests* finding is fixed and verified, in batches.
  4. Coverage thresholds and the CI checks that guard the audited axes are recorded, so the result does not decay.

**Plans**: TBD

### Phase 28: Field Validation

**Goal**: An ecologist completes a full IBP survey offline on a real parcel, and it syncs back with no data loss and no duplicates — on record.
**Depends on**: Phases 23, 25, 26 and 27 (visual modernisation, global search, UX/UI audit, quality audit), Phase 22 (the owner opens field tests to the association only once their own testing has no open blocker), Phases 3, 5, 6, 7 (field tests must not run on the data-loss and sync defects), 3, 4, 7, 9 and 12 (field tests should exercise the ergonomics and screens the UX audit rebuilt, not the ones it found broken), 6, 8, 10, 11
**Requirements**: REQ-FT-field-tests, REQ-QA-bug-a3-4, REQ-QA-bug-a6-2, REQ-QA-screen-tests, REQ-DOC-taxonomy, REQ-DOC-epicd-ids
**Carried over from Phase 23 (old 12.2, D-17)**: an Android device pass of the visual refresh (gradients, coloured shadows, flat glass fill on cards, map controls and sheets, the download edge glow at the navigation layer, the forest card SVG mask, and the cost of the forest card mist and flowing contours: turn `ForestCard`'s `motion` off on Android if frames drop; header tint in dark mode). See charter section 13.9.
**Success Criteria** (what must be TRUE):

  1. A field-test report exists for each of Epics B, C and D, in the form of `docs/user-tests/epic-a-access-and-security.md`, with a recorded outcome for every case.
  2. At least one full run is recorded end to end — survey created offline on a real parcel, ten factors scored, photos attached, submitted offline, synced on reconnection — with the resulting server record checked for completeness and for the absence of duplicate surveys and attachments.
  3. Signing up with an already-registered email shows a specific message inviting the user to log in (`BUG-A3-4`), and password-reset deliverability is closed as an Auth0 tenant configuration item with the change recorded (`BUG-A6-2`).
  4. The survey list, survey detail, survey form and map screens have tests covering their sync-status, filter and error states, so the flows the field tests exercise are protected against regression.
  5. Every field-test case cites a unique story ID: the six Epic D stories have six distinct IDs, and `docs/specs/user-stories.md` §4 uses the MVP / V1 / V2 taxonomy.
  6. Each field observer's feedback is collected in one feedback grid (`docs/user-tests/field-feedback.md`): bugs, interface friction (slow entry, unclear screens, anything that gets in the way on a parcel) and suggestions, each with an ID, the screen concerned and the observer. At the end of the phase every entry is triaged as *release blocker*, *next milestone* or *rejected* (with a reason); the release blockers are fixed, in a short follow-up phase if needed, before the milestone closes.
  7. The checks deferred from earlier phases are run on real devices and recorded: genus recognition on Android (latency and accuracy) and with real photos, the offline map in airplane mode and after a relaunch, the PDF share sheet, and the splash and permission-refusal paths of onboarding (see the `human_verification` entries of the Phase 15, 17, 18 and 19 `VERIFICATION.md`).

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → … → 28

Phases 3–10 (audit remediation) do not depend on the species-recognition track and should run while Phase 1 waits on real devices. Phase 11 (association-only sharing & scope trim) does not depend on the species-recognition track either, and should land before Phase 17, whose offline-map work builds on the map Phase 11 repoints. Phases 12, 13, 16, 18 and 21 (the UX/UI audit, folded into MVP by owner decision 2026-09-27) are threaded between the phases they depend on for components (Phase 12 before Phase 14, so Factor A's genus-list UI reuses the new field components) or for a stable screen to redesign (Phase 16 after Phase 15, Phase 18 after Phase 17, Phase 21 last, right before Phase 28). Phases 19–20 do not depend on Phases 7–10 or Phase 11 either, so they can interleave if the schedule requires it.

Phases 17, 19 and 20 declare no dependency on the species-recognition track and can be reordered ahead
of it if Phase 1 returns a no-go, or run in parallel with it.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Species Recognition — Approach Decision | 6/6 | Complete   | 2026-09-26 |
| 2. Reconcile the IBP method version | 4/4 | Complete    | 2026-09-26 |
| 3. Stop field data loss and account exposure | 9/9 | Complete    | 2026-09-24 |
| 4. CI and test safety net | 7/7 | Complete    | 2026-09-24 |
| 5. API sync integrity | 6/6 | Complete    | 2026-09-24 |
| 6. Mobile sync engine reliability | 12/12 | Complete    | 2026-09-25 |
| 7. Sync feed ordering and unified object storage | 9/9 | Complete    | 2026-09-25 |
| 8. API configuration, service split and database tuning | 13/14 | Complete    | 2026-09-26 |
| 9. Shared IBP domain package and test completeness | 16/16 | Complete    | 2026-09-27 |
| 10. Mobile state architecture, i18n, accessibility and hygiene | 32/32 | Complete    | 2026-09-27 |
| 11. Association-only sharing & scope trim | 5/5 | Complete (BUG-04 deferred) | 2026-09-27 |
| 12. Field-Entry Ergonomics (UX Lot 1) | 6/6 | Complete   | 2026-09-27 |
| 13. Visual Foundations & Motion (UX Lot 2) | 5/5 | Complete   | 2026-09-27 |
| 14. Factor A Genus List & Data-Contract Corrections | 1/1 | Complete   | 2026-09-27 |
| 15. Genus Recognition for Factor A | 1/1 | Complete (Android device run + real-device photo test deferred to Phase 28) | 2026-09-27 |
| 16. Information Architecture (UX Lot 3) | 6/6 | Complete   | 2026-09-27 |
| 17. Offline Map & Own-Survey Navigation | n/a | Complete (on-device airplane-mode check deferred to Phase 28) | 2026-09-27 |
| 18. Onboarding & Explorer Polish (UX Lot 4) | n/a | Complete    | 2026-09-27 |
| 19. Survey Export & Ownership | 1/1 | Complete   | 2026-09-27 |
| 20. Durable Backend | 4/4 | Complete    | 2026-09-27 |
| 21. Interface Finishing (UX Lot 5) | 7/7 | Complete   | 2026-09-28 |
| 22. Owner acceptance testing | n/a | Complete | 2026-10-06 |
| 23. Visual Modernisation | 23/23 | Complete (Android pass deferred to Phase 28) | 2026-10-09 |
| 24. Survey History Split | 12/12 | Complete | 2026-10-09 |
| 25. Global Search | 15/15 | Complete | 2026-10-10 |
| 26. UX/UI Audit & Design System Update | 0/TBD | Not started | - |
| 27. In-depth Quality Audit | 0/TBD | Not started | - |
| 28. Field Validation | 0/TBD | Not started | - |

## Coverage

All 66 MVP requirements map to exactly one phase. 47 carry build work across Phases 1–28 (24 of them
from the 2026-09 code audit, Phases 3–10); the other 19 are already built and are verified in Phase 28's field tests. Full mapping in
`.planning/REQUIREMENTS.md` → Traceability.

**UX/UI audit (Phases 12, 13, 16, 18, 21):** folded into MVP scope by owner decision 2026-09-27, on top of the
66 requirements above. Not yet broken into individual `REQ-UX-*` IDs in `REQUIREMENTS.md` — tracked
for now by direct reference to `docs/design/ux-ui-audit-2026-09.md`'s own finding IDs (FLOW-*, DS-*,
HOME-*, LIST-*, DET-*, SYNC-*, ONB-*, NAV-*, MAP-*, ACC-*) inside each phase's success criteria.

## Deferred

Recorded in `.planning/REQUIREMENTS.md`, not dropped:

- **Next milestone (community / social):** `REQ-F-france-map`, `REQ-B-parcel-status-map`, `REQ-B-explore-analysis`, `REQ-C-privacy-choice`, and all of Epics E, F, G and I — including the UX audit's "Ma saison" gamification module (§7 Lot 5), explicitly carved out of Phase 21 as Epic F. Code already exists for several of them. **Prerequisite:** a back-office / CMS surface, which needs its own ADR, architecture block and contract before Epics E and G can be planned.
- **V2:** all of Epic H (regional overviews, parcel trends, factor distributions, analytics trust).

---
*Roadmap created: 2026-09-22*
