# Codebase Structure

**Analysis Date:** 2026-09-22, updated 2026-09-27 (phase 01.9 closing sweep)

## Directory Layout

```
cortege/ (npm workspaces monorepo: mobile, api, packages/ibp-domain)
├── .claude/                    # Claude Code settings
│   └── skills/                 # Project-specific GSD skills
├── .github/
│   └── workflows/               # CI/CD: ci.yml (lint/format/typecheck, unit, E2E, native builds,
│   │                             # Docker image, aggregate gate) and codeql.yml
├── .planning/
│   ├── codebase/               # Generated architecture docs
│   └── phases/                 # Planning outputs from GSD commands
├── .prettierrc.json            # Formatter config (double quotes, 2 spaces, 100 line width, no semicolons)
├── .eslintrc.json              # Linter config (no unused vars, no explicit any, ES modules only)
├── CLAUDE.md                   # Project instructions (tech stack, setup, conventions)
├── CONTRIBUTING.md             # Contributing guide
├── README.md                   # Project overview
├── docs/                       # Technical documentation
│   ├── technical/              # Architecture, data contracts, ADRs
│   ├── specs/                  # Product specs, user stories, epics
│   ├── design/                 # Brand and design system
│   ├── audits/                 # Code audits and remediation tracking
│   └── user-tests/             # User testing reports
├── infra/                      # Infrastructure as code
│   ├── docker-compose.yml      # Local dev stack (PostgreSQL, MinIO, pgAdmin)
│   └── vps/                    # VPS deployment (systemd, Caddy, pull-based updates)
├── scripts/                    # Root-level utilities
├── packages/
│   └── ibp-domain/             # @cortege/ibp-domain: shared IBP rules workspace (phase 01.8)
│       ├── src/                # Factor keys, evaluateIbp, bands, cas/region models, contract/ wire types, parity/
│       ├── jest.config.js      # Coverage thresholds 100%
│       ├── tsconfig.json
│       └── package.json        # `main`/`react-native` point at src for Metro/Jest/tsc, `dist` for Node runtime
├── mobile/                     # React Native / Expo package (no root App.tsx or tsconfig.json — removed phase 01.9)
│   ├── src/                    # TypeScript source
│   │   ├── storage.ts          # Re-exports storage module
│   │   ├── screens/            # Screen components, split into feature subfolders under 400 lines each
│   │   │   ├── survey-list/, survey-detail/, survey-form/, public-map/  # container + presentational parts
│   │   ├── state/               # NEW (phase 01.9): AppStateProvider (single assembler) and the five
│   │   │                        # memoised contexts (session, status, sync actions, surveys, survey form)
│   │   │                        # plus the narrow nearby-parcels context and useLatestCallback/useStableActions
│   │   ├── hooks/               # Custom hooks (useSurveySync and its survey-sync/ sub-hooks; useSurveyForm,
│   │   │   │                    # useSurveyList, useEditingDraft, useSurveyDraftPatcher, useGpsCapture,
│   │   │   │                    # useLocalDataOwner, useNearbyParcels, useParcelStatuses, usePublicMapExplorer,
│   │   │   │                    # useDebouncedValue)
│   │   │   └── survey-sync/    # Sub-hooks composed by useSurveySync (network, profile, operations, attachment previews)
│   │   ├── i18n/                # NEW (phase 01.9): typed French catalogue (`fr`), no i18n library
│   │   ├── navigation/          # AuthenticatedAppNavigation split: types.ts, tabs/, stacks/, routes/
│   │   ├── components/         # UI components (ParcelOverlay, DraftCard, etc)
│   │   ├── ui/                 # Reusable UI elements (buttons, cards, chips, fields)
│   │   ├── api/                # HTTP client and endpoint definitions
│   │   ├── storage/             # SQLite schema (PRAGMA user_version migrations, now 2), queries, types
│   │   ├── app/                 # Domain logic (ibp-scoring.ts as an @cortege/ibp-domain adapter, formatters,
│   │   │                        # constants, types re-exported from the package)
│   │   └── __mocks__/          # Jest mocks for tests
│   ├── test/                   # Test fixtures and utilities
│   ├── assets/                 # Images, fonts (committed)
│   ├── plugins/                # Expo plugins for native configuration
│   ├── App.tsx                 # Root component (mounts AppStateProvider, navigation, session overlays)
│   ├── index.js                # Entry point
│   ├── app.json                # Expo app config (icon, permissions in French, Auth0, etc)
│   ├── metro.config.js         # Metro bundler config
│   ├── jest.unit.config.js     # Jest config for unit tests
│   ├── tsconfig.json           # TypeScript config
│   ├── package.json            # Dependencies (Expo 57.0.24, React Native 0.86.3, Auth0, supercluster, etc)
│   ├── README.md               # Mobile-specific setup
│   └── README-native.md        # Native customization guide
├── api/                        # NestJS package
│   ├── src/
│   │   ├── main.ts             # NestJS bootstrap (port, CORS, validation pipe)
│   │   ├── app.module.ts       # Root module (module imports and setup)
│   │   ├── app.controller.ts   # Health/info endpoints
│   │   ├── config/              # Validated typed config: env.schema.ts, app-config.ts, production-rules.ts
│   │   ├── auth/                # Authentication (JWT, Auth0, guards)
│   │   │   ├── auth.guard.ts   # JWT validation against Auth0 JWKS
│   │   │   ├── auth.module.ts  # Auth module setup
│   │   │   ├── auth.types.ts   # AuthenticatedUser type
│   │   │   ├── auth0-management.service.ts # Auth0 API calls
│   │   │   ├── current-user.decorator.ts   # @CurrentUser() injection
│   │   │   ├── throttler.guard.ts           # Client-aware throttler guard
│   │   │   └── admin.guard.ts  # Admin-only protection
│   │   ├── users/              # User profile management (no email.service.ts — removed phase 01.9)
│   │   │   ├── users.service.ts       # CRUD, provisioning
│   │   │   ├── users.controller.ts    # Endpoints
│   │   │   ├── users.module.ts        # Module setup
│   │   │   └── dtos/                  # Request/response DTOs
│   │   ├── surveys/            # Survey CRUD, sync, IBP validation, parcels, public map
│   │   │   ├── surveys.service.ts            # CRUD, validation, parcel linkage
│   │   │   ├── surveys.repository.ts        # Raw-SQL survey queries
│   │   │   ├── surveys.controller.ts        # GET/POST/PATCH endpoints
│   │   │   ├── surveys-sync.service.ts      # Batch sync processor
│   │   │   ├── surveys-attachments.service.ts # Upload/download, S3
│   │   │   ├── survey-events.service.ts     # Survey event history
│   │   │   ├── ibp-rules.service.ts         # Thin adapter over @cortege/ibp-domain
│   │   │   ├── cadastre-provider.service.ts # Parcel data (IGN WFS or synthetic)
│   │   │   ├── parcels.service.ts, parcels.controller.ts   # Parcel metadata and status endpoints
│   │   │   ├── public-map.service.ts, public.controller.ts # Public map endpoints (bbox-aware, phase 01.9)
│   │   │   ├── sync.controller.ts           # POST /v1/sync and GET /v1/sync/changes
│   │   │   ├── surveys.module.ts, surveys-data.module.ts   # Module setup
│   │   │   ├── surveys.types.ts             # TypeScript types (SurveyRow, etc)
│   │   │   ├── surveys-normalize.utils.ts   # Input validation/normalization
│   │   │   ├── public-map.utils.ts, public-map.queries.ts  # Public map query logic
│   │   │   ├── sync-error.utils.ts          # Sync error code mapping
│   │   │   ├── dtos/                        # Request/response DTOs
│   │   │   └── __mocks__/                   # Jest mocks
│   │   ├── reports/            # Moderation/reporting
│   │   │   ├── reports.service.ts
│   │   │   ├── reports.controller.ts
│   │   │   ├── reports.module.ts
│   │   │   └── dtos/
│   │   ├── database/            # Database connection
│   │   │   ├── database.service.ts  # pg.Pool wrapper
│   │   │   └── database.module.ts   # NestJS module
│   │   ├── debug/              # Dev-only helpers
│   │   │   ├── debug.controller.ts  # Reset endpoints
│   │   │   ├── debug.service.ts
│   │   │   └── debug.module.ts
│   │   └── common/             # Shared utilities (rate-limit config, file.utils.ts)
│   ├── test/                   # Unit and E2E test specs
│   │   ├── *.spec.ts           # Jest unit/integration specs (e.g. `auth.guard.rs256.spec.ts`)
│   │   ├── *.e2e-spec.ts       # Jest E2E tests (require running DB), split per feature
│   │   │                       # (surveys-submit, surveys-visibility, public-map-items, surveys-attachments,
│   │   │                       # parcel-history, surveys-method-version, migration-016-ibp-method-version)
│   │   ├── helpers/            # Shared E2E helpers (ids from randomUUID())
│   │   └── __mocks__/          # Jest mocks
│   ├── migrations/             # SQL migration files (ordered)
│   │   ├── 001-initial-schema.sql
│   │   ├── ...
│   │   └── 016_ibp_method_version.sql
│   ├── scripts/                # Build/migration scripts
│   │   └── migrate.js          # Run pending migrations
│   ├── jest.config.js          # Jest config (E2E)
│   ├── jest.unit.config.js     # Jest config (unit)
│   ├── tsconfig.json           # TypeScript config
│   ├── tsconfig.build.json     # TypeScript build config
│   ├── package.json            # Dependencies (NestJS, pg, class-validator, @cortege/ibp-domain; no bcryptjs,
│   │                            # no @nestjs/schedule, no mailer package — removed phase 01.9)
│   ├── .env.example            # Env template
│   └── README.md               # API-specific setup
└── package.json                # Root workspace config (workspaces only: mobile, api, packages/ibp-domain;
                                 # overrides + one dev dependency; no runtime deps, no root App.tsx/tsconfig.json)
```

## Directory Purposes

**`.claude/skills/`**
- Purpose: Project-specific GSD skills (not loaded by default; documented for reference)
- Contains: Subdirectories for skills (each has SKILL.md index)

**`.github/workflows/`**
- Purpose: CI/CD pipeline automation
- Contains: `ci.yml` (changes, check, unit-api, unit-mobile, e2e, e2e-minio, mobile-build, native-android,
  native-ios, audit, image-check, ci-ok, build) and `codeql.yml` (CodeQL analysis)

**`.planning/codebase/`**
- Purpose: Generated architecture documentation (output of `/gsd-map-codebase`)
- Contains: ARCHITECTURE.md, STRUCTURE.md, TESTING.md, CONVENTIONS.md, STACK.md, INTEGRATIONS.md, CONCERNS.md

**`docs/`**
- Purpose: Project documentation (read before implementation)
- Key files:
  - `docs/technical/technical-architecture-v1.md` — System overview
  - `docs/technical/api-contract-v1.md` — REST API specification
  - `docs/technical/data-contract-v1.md` — PostgreSQL schema
  - `docs/technical/sync-conflict-resolution-v1.md` — Offline sync conflict strategy
  - `docs/technical/ibp-validation-matrix-v1.md` — Factor scoring rules
  - `docs/specs/user-stories.md` — Full backlog
  - `docs/specs/epic-*.md` — Feature specifications

**`infra/`**
- Purpose: Infrastructure and deployment
- Contains:
  - `docker-compose.yml` — Local dev stack (PostgreSQL 16, MinIO, pgAdmin)
  - `vps/` — VPS deployment (systemd timer for pull-based updates, Caddy reverse proxy)

**`mobile/src/screens/`**
- Purpose: Screen components (UI pages), split into feature subfolders (container + presentational parts) so
  no file under `screens/` exceeds 400 lines (phase 01.9, D-04)
- Contains:
  - `HomeScreen.tsx` — Survey list summary, sync status, nearby parcels
  - `survey-form/` (`SurveyFormScreen.tsx` + parts) — IBP factor data entry
  - `survey-detail/` (`SurveyDetailScreen.tsx` + parts) — Survey review and visibility controls
  - `SurveyParcelSelectionScreen.tsx` — Parcel picker with map
  - `public-map/` (`PublicMapScreen.tsx` + parts) — Public map explorer, bbox loading, clustering
  - `AuthGateScreen.tsx` — Login redirect
  - `ProfileSetupScreen.tsx` — First-time user setup
  - `AccountScreen.tsx` — User profile and account settings
  - `SettingsScreen.tsx` — App preferences and debug tools (only consumer of the status context)
  - `FactorDetailScreen.tsx` — Individual factor details

**`mobile/src/state/`** (new, phase 01.9)
- Purpose: The single state assembler and the memoised React contexts screens read
- Contains:
  - `AppStateProvider.tsx` — calls every stateful hook exactly once (`useAppController`), splits
    the result into contexts
  - `session-context.ts`, `status-context.ts`, `sync-actions-context.ts`, `surveys-context.ts`,
    `survey-form-context.ts`, `nearby-parcels-context.ts` — one `createContext` + hook per slice
  - `useLatestCallback.ts` — stable-identity action wrapper (`useLatestCallback`, `useStableActions`)

**`mobile/src/i18n/`** (new, phase 01.9)
- Purpose: The typed French text catalogue (`fr`), one module per screen or area; no i18n library
- Status messages are `StatusMessage` values built only by catalogue functions

**`mobile/src/hooks/`**
- Purpose: Stateful logic (React hooks)
- `useSurveySync.ts` — sync/session orchestrator, calls `useAuth0Session` and `useLocalDataOwner`
  directly, composed of the `survey-sync/` sub-hooks:
  - `survey-sync/useSurveySyncNetwork.ts` — Sync queue draining, retry backoff (`POST /v1/sync`, `GET /v1/sync/changes`)
  - `survey-sync/useSurveySyncProfile.ts` — User profile sync
  - `survey-sync/useSurveySyncSurveyOperations.ts` — Survey CRUD
  - `survey-sync/useAttachmentPreviews.ts` — Attachment preview cache
- Other hooks under `hooks/` (each called once by `AppStateProvider`, not nested in `useSurveySync`):
  `useAuth0Session.ts`, `useLocalDataOwner.ts`, `useSurveyForm.ts`, `useSurveyList.ts`,
  `useEditingDraft.ts`, `useSurveyDraftPatcher.ts`, `useGpsCapture.ts`, `useNearbyParcels.ts`
- Hooks called directly by the screens that need them: `usePublicMapExplorer.ts` (public map),
  `useParcelStatuses.ts` (parcel selection, home), `useDebouncedValue.ts` (map region debouncing)

**`mobile/src/storage/`**
- Purpose: Local SQLite persistence layer
- Contains:
  - `db.ts` — Schema (`local_surveys` with `payload_completion`, `sync_queue`, `local_attachments`,
    `local_meta`); `PRAGMA user_version` migrations, currently at 2
  - `surveys.ts` — Survey CRUD helpers
  - `sync.ts` — Sync queue management and sync operation
  - `types.ts` — TypeScript types (LocalSurvey, SyncQueueEntry, etc.)
  - `utils.ts` — Utility functions (UUID generation, date handling)

**`mobile/src/api/`**
- Purpose: HTTP client and API endpoint definitions
- Contains:
  - `client.ts` — Fetch wrapper (Bearer token, timeout, typed errors)
  - `ibp-api.ts` — All endpoint definitions (auth, surveys, sync, public, attachments)

**`mobile/src/app/`**
- Purpose: Domain logic and shared utilities
- Contains:
  - `ibp-scoring.ts` — Factor validation and score calculation (client-side validation)
  - `formatters.ts` — Date/time/number formatting
  - `number-utils.ts` — Numeric helpers
  - `survey-logic.ts` — Survey status and state logic
  - `constants.ts` — App constants (factor keys, defaults, retry limits, timeouts)
  - `types.ts` — Shared TypeScript types (SurveyDetailTab, SurveyStats, SurveyEventItem)
  - `AuthenticatedAppNavigation.tsx` — Navigation tree setup (native-stack + bottom-tabs)
  - `styles.ts` — Global styles
  - `brand-tokens.ts` — Design tokens (colors, spacing, fonts)
  - `vegetation.ts` — Vegetation type mappings

**`mobile/src/ui/`**
- Purpose: Reusable UI components
- Contains: Buttons, cards, chips, fields, notices, badges (no business logic)

**`mobile/src/components/`**
- Purpose: Domain-specific components (maps, overlays, cards)
- Contains:
  - `ParcelOverlayPolygons.tsx` — IGN cadastre tile overlay on map
  - `IgnCadastreTileOverlay.tsx` — Tile layer management
  - `cards/` — Survey/parcel card components

**`api/src/config/`**
- Purpose: Validated, typed configuration
- Key files:
  - `env.schema.ts` — `class-validator`-decorated env shape, `validateEnv`
  - `app-config.ts` — typed config object (`ConfigModule.forRoot({ load: [appConfig] })`)
  - `production-rules.ts` — startup refusal rules for production (`CORS_ORIGIN`, etc.)

**`api/src/auth/`**
- Purpose: Authentication and authorization
- Key files:
  - `auth.guard.ts` — JWT validation against Auth0 JWKS
  - `auth0-management.service.ts` — Auth0 API calls (delete account, get /userinfo)
  - `current-user.decorator.ts` — @CurrentUser() injection
  - `throttler.guard.ts` — client-aware throttler guard

**`api/src/surveys/`**
- Purpose: Survey CRUD, sync, IBP validation, parcel linkage, attachments, public map
- Key files:
  - `surveys.service.ts`, `surveys.repository.ts` — Core business logic and raw-SQL queries
  - `surveys-sync.service.ts` — Batch sync processor (handles mobile sync requests)
  - `sync.controller.ts` — `POST /v1/sync` and `GET /v1/sync/changes`
  - `ibp-rules.service.ts` — Thin adapter over `@cortege/ibp-domain` (server-side validation)
  - `parcels.service.ts`/`parcels.controller.ts`, `cadastre-provider.service.ts` — Parcel linkage and lookup
  - `public-map.service.ts`/`public.controller.ts` — Public map and parcel-status endpoints
  - `survey-events.service.ts`, `surveys-attachments.service.ts` — Event history and attachment upload
  - `surveys.types.ts` — TypeScript types (SurveyRow, SyncBatchBody, etc.)
  - `dtos/` — Request/response DTOs (class-validator decorated)

**`api/src/users/`**
- Purpose: User profile management (no email service — the API sends no email, removed phase 01.9)
- Key files:
  - `users.service.ts` — CRUD, auto-provisioning on first login
  - `users.controller.ts` — Profile endpoints

**`api/src/database/`**
- Purpose: PostgreSQL access layer
- Key files:
  - `database.service.ts` — pg.Pool wrapper (query() and connect() methods)

**`api/migrations/`**
- Purpose: SQL schema versioning
- Pattern: Ordered files (001-*.sql, 002-*.sql, etc.)
- Run by: `npm run migrate:api` (api/scripts/migrate.js)

**`api/test/`**
- Purpose: unit/integration specs (`*.spec.ts`, run by `npm run test:unit`) and E2E tests that require a
  running database (`*.e2e-spec.ts`, Jest + Supertest, run by `npm run test:e2e`)
- `auth.guard.rs256.spec.ts` tests the RS256 path against a real loopback JWKS server
- E2E is split by feature: `surveys-submit`, `surveys-visibility`, `public-map-items`,
  `surveys-attachments`, `parcel-history`, `surveys-idempotency`, `surveys-method-version`,
  `migration-016-ibp-method-version`, `public-map-bbox`, etc.
- `helpers/surveys-e2e.ts` — shared E2E helpers (ids from `randomUUID()`)

## Key File Locations

### Entry Points

**Mobile:**
- `mobile/App.tsx` — Root component (mounts `AppStateProvider`, navigation, session overlays); no root-level
  `App.tsx` exists any more (removed phase 01.9)
- `mobile/index.js` — React Native entry point

**API:**
- `api/src/main.ts` — NestJS bootstrap (port, CORS, validation)
- `api/src/app.module.ts` — Root NestJS module

### Configuration

**Mobile:**
- `mobile/app.json` — Expo app config (icon, permissions, Auth0 client ID)
- `mobile/.env` — Runtime env (API_URL, Auth0 domain/client ID)
- `mobile/tsconfig.json` — TypeScript config (strict mode, path aliases)
- `mobile/jest.unit.config.js` — Jest config (unit tests)

**API:**
- `api/.env` — Runtime env (database, Auth0, S3; no SMTP)
- `api/tsconfig.json` — TypeScript config (strict, decorators)
- `api/jest.config.js` — Jest config (E2E tests)
- `api/jest.unit.config.js` — Jest config (unit tests)

**Root:**
- `.eslintrc.json` — Linter config (both mobile and API)
- `.prettierrc.json` — Formatter config (double quotes, 2 spaces, no semicolons)
- No root `tsconfig.json` (removed phase 01.9)

### Core Logic

**Mobile:**
- `mobile/src/state/AppStateProvider.tsx` — Single assembler, fills the five state contexts
- `mobile/src/hooks/useSurveySync.ts` — Sync and session orchestrator
- `mobile/src/storage/db.ts` — SQLite schema and initialization
- `mobile/src/api/client.ts` — HTTP client wrapper
- `mobile/src/app/ibp-scoring.ts` — Mobile IBP adapter over `@cortege/ibp-domain`

**Shared package:**
- `packages/ibp-domain/src/index.ts` — Public entry, the only module api and mobile import
- `packages/ibp-domain/src/evaluate.ts` — `evaluateIbp`: scoring and draft/submit validation

**API:**
- `api/src/surveys/surveys.service.ts` — Survey CRUD and validation
- `api/src/surveys/surveys-sync.service.ts` — Batch sync processor
- `api/src/surveys/ibp-rules.service.ts` — Server-side adapter over `@cortege/ibp-domain`
- `api/src/auth/auth.guard.ts` — JWT validation
- `api/src/database/database.service.ts` — DB connection pool

### Testing

**Mobile:**
- `mobile/src/**/*.test.ts(x)` — Co-located unit tests
- `mobile/test/` — Test fixtures and utilities

**Shared package:**
- `packages/ibp-domain/src/**/*.test.ts` — coverage thresholds 100%

**API:**
- `api/test/` — unit/integration specs (`*.spec.ts`) and E2E test specs (`*.e2e-spec.ts`)
- `api/src/**/__mocks__/` — Jest mocks

## Naming Conventions

### Files

**React Components:**
- Pattern: `PascalCase.tsx` (e.g., `HomeScreen.tsx`, `AppButton.tsx`)
- Location: `mobile/src/screens/`, `mobile/src/ui/`, `mobile/src/components/`
- Export: Default export with same name as file

**Custom Hooks:**
- Pattern: `use[Name].ts` (e.g., `useSurveySync.ts`, `useEditingDraft.ts`)
- Location: `mobile/src/hooks/`
- Export: Named export function, no default

**Utilities / Services:**
- Pattern: `camelCase.ts` (e.g., `ibp-scoring.ts`, `formatters.ts`, `surveys.service.ts`)
- Location: `mobile/src/app/`, `api/src/*/`
- Export: Named exports

**Test Files:**
- Pattern: `*.test.ts(x)` (unit, co-located with source); in `api/test/`, `*.spec.ts` (unit/integration)
  and `*.e2e-spec.ts` (E2E)
- Location: Co-located with source or in `api/test/`
- Example: `mobile/src/app/ibp-scoring.test.ts`, `api/test/auth.guard.spec.ts`, `api/test/surveys-submit.e2e-spec.ts`

**DTOs (API):**
- Pattern: `[Name].dto.ts` or `[Name]Body.ts`
- Location: `api/src/*/dtos/`
- Example: `survey-upsert.dto.ts`, `create-attachment.dto.ts`

**Configuration Files:**
- Pattern: `.eslintrc.json`, `.prettierrc.json`, `jest.config.js`, `tsconfig.json`
- Location: Root and package directories
- No variants per environment (env-specific logic in code via NODE_ENV)

### Directories

**Module Directories:**
- Pattern: `camelCase` (e.g., `surveys`, `users`, `auth`)
- Convention: One module per responsibility
- Contents: `*.service.ts`, `*.controller.ts`, `*.module.ts`, `dtos/`, `__mocks__/`

**Feature Directories:**
- Pattern: `camelCase` (e.g., `screens`, `hooks`, `components`, `storage`)
- Convention: Grouped by function (e.g., all screens together)

**Utility Directories:**
- Pattern: `camelCase` (e.g., `ui`, `app`, `api`, `common`)
- Convention: Shared code (no dependencies on other features)

## Where to Add New Code

### New Feature (Survey Fields)

- **Mobile UI:** Add screen component in `mobile/src/screens/` (e.g., `NewFeatureScreen.tsx`)
- **Mobile logic:** Add hook in `mobile/src/hooks/` (e.g., `useNewFeature.ts`)
- **Mobile storage:** Add schema and queries to `mobile/src/storage/surveys.ts`
- **Mobile domain:** Add validation to `mobile/src/app/` (e.g., new-feature-logic.ts)
- **API endpoint:** Add route to `api/src/surveys/surveys.controller.ts`
- **API service:** Extend `api/src/surveys/surveys.service.ts` with new CRUD/validation
- **API schema:** Add migration file `api/migrations/NNN-add-new-feature.sql`
- **Tests:** Add `mobile/src/screens/NewFeatureScreen.test.tsx` and `api/test/new-feature.e2e-spec.ts`

### New Component/Module

- **Reusable UI component:**
  - Mobile: `mobile/src/ui/NewComponent.tsx`
  - Tests: `mobile/src/ui/NewComponent.test.tsx`

- **Domain-specific component:**
  - Mobile: `mobile/src/components/NewComponent.tsx`
  - Tests: `mobile/src/components/NewComponent.test.tsx`

- **New API module (e.g., Analytics):**
  - Create `api/src/analytics/` directory
  - Add `analytics.module.ts`, `analytics.service.ts`, `analytics.controller.ts`
  - Add DTOs in `analytics/dtos/`
  - Add migration file for any schema changes
  - Import in `api/src/app.module.ts`

### Utilities

**Mobile:**
- Shared helpers: `mobile/src/app/` (e.g., `new-utils.ts`)
- Storage helpers: `mobile/src/storage/utils.ts`

**API:**
- Shared helpers: `api/src/common/` (e.g., `new.utils.ts`)
- Sync helpers: `api/src/surveys/` (e.g., `new-sync.utils.ts`)

## Special Directories

**`mobile/.expo/`**
- Purpose: Expo dev server cache and app state
- Generated: Yes (created by Expo CLI)
- Committed: No (in .gitignore)

**`mobile/ios/`, `mobile/android/`**
- Purpose: Native project directories (generated by `expo prebuild`)
- Generated: Yes (by Expo)
- Committed: No (in .gitignore as of recent change)
- How to customize: Use `mobile/app.json` and Expo plugins in `mobile/plugins/`

**`mobile/node_modules/`, `api/node_modules/`, `node_modules/`**
- Purpose: Dependencies
- Generated: Yes (by npm install)
- Committed: No (in .gitignore)

**`api/migrations/`**
- Purpose: Versioned SQL schema changes
- Generated: No (hand-written)
- Committed: Yes (part of source)
- Pattern: Ordered files (001-*.sql, 002-*.sql, etc.)

**`.planning/codebase/`**
- Purpose: Generated architecture documentation
- Generated: Yes (by `/gsd-map-codebase`)
- Committed: Yes (for reference)

**`.planning/phases/`**
- Purpose: Planning outputs and execution results
- Generated: Yes (by `/gsd-plan-phase` and `/gsd-execute-phase`)
- Committed: Depends on workflow (usually not, unless archiving)

---

*Structure analysis: 2026-09-22, updated 2026-09-27*
