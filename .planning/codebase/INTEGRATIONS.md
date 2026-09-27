# External Integrations

**Analysis Date:** 2026-09-22, updated 2026-09-27 (phase 01.9 closing sweep)

## APIs & External Services

**Auth0:**
- Service: OAuth 2.0 / OpenID Connect identity provider
- What it's used for: User authentication, profile management, password reset
- SDK/Client: `react-native-auth0` (Mobile), `jwks-rsa` (API)
- Auth: RS256 JWT validated against Auth0 JWKS endpoint
- Configuration:
  - Mobile: `mobile/.env` - `EXPO_PUBLIC_AUTH0_DOMAIN`, `EXPO_PUBLIC_AUTH0_CLIENT_ID`, `EXPO_PUBLIC_AUTH0_AUDIENCE`
  - API: `api/.env` - `AUTH0_DOMAIN`, `AUTH0_PUBLIC_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_MGMT_CLIENT_ID`, `AUTH0_MGMT_CLIENT_SECRET`, `AUTH0_APP_CLIENT_ID`
  - Default domain (fallback): `cortege-auth.algernon.ovh`
  - Default audience: `https://api.ibp-app`
- Implementation file: `api/src/auth/auth.guard.ts` (JWT validation), `api/src/auth/auth0-management.service.ts` (user management)

## Data Storage

**Databases:**

**PostgreSQL 16** (Primary)
- Connection: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- Client: `pg` library (raw SQL, connection pooling via `Pool`)
- Service: `api/src/database/database.service.ts`
- Local dev connection: `postgres:5432` (Docker Compose)
- Migrations: `api/migrations/` - ordered SQL files executed via `api/scripts/migrate.js`
- No ORM — all queries are raw parameterized SQL

**Expo SQLite** (Mobile Local Storage)
- Database file: `cortege-local.db` (device-local, encrypted on iOS Keychain)
- Schema: `mobile/src/storage/db.ts`
- Tables:
  - `local_surveys` — survey drafts with sync state, payload and the precomputed `payload_completion` (SQLite `PRAGMA user_version` migration 2)
  - `sync_queue` — pending operations for server sync
  - `local_attachments` — photo metadata and upload state
  - `local_meta` — key/value app-level settings
- Offline-first design: all changes written locally before network sync

**File Storage:**

**S3-Compatible Object Storage** (Primary)
- Service: MinIO (local dev), AWS S3 (production)
- SDK: `@aws-sdk/client-s3` (DeleteObjectCommand, S3Client)
- Configuration:
  - `OBJECT_STORAGE_MODE` - `local` or `minio`
  - `OBJECT_STORAGE_BUCKET` - S3 bucket name (e.g., `ibp-media`)
  - `OBJECT_STORAGE_ENDPOINT` - S3 endpoint URL
  - `OBJECT_STORAGE_REGION` - AWS region (e.g., `us-east-1`)
  - `OBJECT_STORAGE_ACCESS_KEY`, `OBJECT_STORAGE_SECRET_KEY` - Credentials
  - `ATTACHMENTS_UPLOAD_DIR` - Local filesystem fallback (when mode = `local`)
- Local dev: MinIO on port 9000 (Docker), console on port 9001
- Usage:
  - Survey attachment upload/download
  - Presigned URL generation via `@aws-sdk/s3-request-presigner`
  - Attachment deletion on survey removal
- Implementation: `api/src/surveys/surveys-attachments.service.ts`

**Caching:**
- Not detected — no Redis or caching layer; all queries hit PostgreSQL

## Authentication & Identity

**Auth Provider:**
- Auth0 (OAuth 2.0 / OpenID Connect)
  - Mobile: Native Auth0 SDK with iOS/Android deep linking
  - API: JWT validation via JWKS endpoint

**Token Management:**
- Auth0 issues and refreshes both the access token (RS256 JWT, validated against JWKS) and the refresh token; there is no homegrown token issuance (`ACCESS_TOKEN_SECRET`/`REFRESH_TOKEN_SECRET` do not exist in this codebase, removed with the Auth0 migration, phase 01.7)
- Mobile secure storage: Tokens stored in `expo-secure-store` (encrypted)
- API token validation: `api/src/auth/auth.guard.ts` verifies JWT signature and claims against the JWKS endpoint

**Current User Injection:**
- Decorator: `@CurrentUser()` in `api/src/auth/current-user.decorator.ts`
- Extracts authenticated user from JWT claims into controller methods

**Auth0 Management API:**
- Service: `api/src/auth/auth0-management.service.ts`
- Capabilities:
  - Email updates (with verification flow)
  - User deletion (with Auth0 removal)
  - Password reset email sending
- Token caching: Management tokens cached with expiration check

## Monitoring & Observability

**Error Tracking:**
- Not detected — no Sentry, Datadog, or error aggregation service configured

**Logs:**
- Console logging via `Logger` from `@nestjs/common` (API)
- Log level: configurable via `NODE_ENV`
- Development logs to stdout
- Startup log explicit at `http://localhost:${port}/v1/health` for debugging

**Health Check:**
- Endpoint: `GET /v1/health` (API)
- Implementation: `api/src/app.controller.ts`

## CI/CD & Deployment

**Hosting:**
- GitHub Container Registry: `ghcr.io/florianlepont/cortege:latest` (API image)
- VPS deployment: Pull-based via systemd timer (polls registry every 5 minutes)

**CI Pipeline:**
- GitHub Actions (`.github/workflows/ci.yml`, plus a separate `codeql.yml`)
- Triggers: Pushes to `main`, PRs to `main`, manual `workflow_dispatch`
- Jobs: `changes` (path detection), `check` (lint, format, typecheck, actionlint), `unit-api` (includes `@cortege/ibp-domain` coverage), `unit-mobile`, `e2e` and `e2e-minio` (API E2E, local and MinIO storage modes), `mobile-build` (expo-doctor, expo export), `native-android` and `native-ios` (unsigned native builds, path-filtered or manual), `audit`, `image-check` (Docker build, smoke tests), `ci-ok` (aggregate gate), `build` (pushes the image on `main`)
- Test PostgreSQL service: PostgreSQL 16 in-container with health checks
- Node version: 22 (enforced via `actions/setup-node`)

**Container Registry:**
- GitHub Container Registry (GHCR)
- Authentication: GitHub token (`secrets.GITHUB_TOKEN`)
- Docker build: Multistage, x86_64 (linux/amd64) optimized for VPS

## Maps Integration

**React Native Maps:**
- Package: `react-native-maps` 1.27.2
- Implementation: Map display in survey site selection and the public map (Explorer tab)
- Providers: Google Maps (Android), Apple Maps (iOS)
- Not explicitly configured for API keys in this codebase; assumes platform-provided keys via Xcode/AndroidManifest
- Public map viewport loading (phase 01.9, D-05): `GET /v1/public/map-items` accepts an optional `bbox`; the mobile map debounces region changes (~400 ms, `useDebouncedValue`) and clusters markers on-device with `supercluster` (no native module)

## Email

The API sends no email. `EmailService`, the mailer package and its mail-relay env settings were removed in phase 01.9 (config schema, env examples, `infra/vps/check-env.sh`, which now reports any leftover mail-relay env lines as an obsolete INFO entry). Do not re-add them.

## Webhooks & Callbacks

**Incoming:**
- Not detected — API does not expose webhook endpoints for external services

**Outgoing:**
- Auth0 callback URLs (mobile deep linking):
  - iOS: `fr.etatssauvages.cortege.auth0://cortege-auth.algernon.ovh/ios/fr.etatssauvages.cortege/callback`
  - Registered in `app.json` via `react-native-auth0` plugin configuration

## Rate Limiting

**Throttler (API):**
- Framework: NestJS Throttler
- Configuration:
  - Development: 10,000 requests per 60s (essentially unlimited)
  - Production: 10 requests per 60s
- Applied globally via `ThrottlerGuard` in `app.module.ts`

## Security Features

**CORS:**
- Enabled via NestJS `enableCors()`
- Origin: `CORS_ORIGIN` environment variable — `none` (no browser origin) or a comma-separated origin list; required in production, startup refuses otherwise
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Credentials: Allowed

**Security Headers:**
- Helmet 8.1.0 middleware enabled in `api/src/main.ts`
- Protects against common vulnerabilities (XSS, MIME sniffing, etc.)

**Request Validation:**
- Global validation pipe: `ValidationPipe` in `api/src/main.ts`
- Config: whitelist mode, forbid non-whitelisted fields, auto-transform
- DTO validation: `class-validator` decorators on DTO classes

## IGN Cadastre Integration (Optional)

**Cadastre Provider:**
- Environment variable: `CADASTRE_PROVIDER`
- Options:
  - `synthetic` - Offline test data (default for dev/test)
  - `ign` - Real IGN (French Land Registry) parcel data
- Fallback: `CADASTRE_PROVIDER_ALLOW_FALLBACK` (if set, falls back to synthetic)
- Not explicitly integrated via API client in codebase; queries handled server-side

## Environment Variables Summary

**Critical (required):**
- API: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- API: `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`
- Mobile: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_AUTH0_DOMAIN`, `EXPO_PUBLIC_AUTH0_CLIENT_ID`, `EXPO_PUBLIC_AUTH0_AUDIENCE`

**Optional:**
- Mobile: `EXPO_PUBLIC_API_TIMEOUT_MS` (default: 15000ms)
- API: `OBJECT_STORAGE_MODE` (default: local)
- API: `TRUST_PROXY` (default: `loopback,uniquelocal`), `DEBUG_DATA_RESET_ENABLED`, `PG_*` pool/timeout settings
- API: `CORS_ORIGIN` (`none` or a comma-separated list; required in production)

---

*Integration audit: 2026-09-22, updated 2026-09-27*
