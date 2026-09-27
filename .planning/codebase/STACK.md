# Technology Stack

**Analysis Date:** 2026-09-22, updated 2026-09-27 (phase 01.9 closing sweep: `packages/ibp-domain`, hygiene removals, supercluster)

## Languages

**Primary:**
- TypeScript 5.9 - API backend (`api/`)
- TypeScript 5.x (strict mode) - Mobile frontend (`mobile/`)
- JavaScript/Node.js - Build scripts and configuration

**Secondary:**
- SQL - PostgreSQL query execution (raw SQL via `pg` library)
- Bash/Shell - Deployment and utility scripts

## Runtime

**Environment:**
- Node.js >= 22.5 (`package.json` `engines`), Alpine in the container image - API runtime and build toolchain
- React Native 0.86.3 - Mobile app runtime
- Expo 57.0.24 - React Native development platform and iOS/Android bridge

**Package Manager:**
- npm 10+ with workspaces (`mobile`, `api`, `packages/ibp-domain`; the root `package.json` holds only these three workspaces, `overrides` and one dev dependency, `react-test-renderer` — no runtime dependencies, no root `App.tsx`, no root `tsconfig.json`, phase 01.9)
- Lockfile: `package-lock.json` (workspace root manages all dependencies)

## Frameworks

**API:**
- NestJS 11.1.16 - HTTP framework, dependency injection, module system
- Express 5.x (via `@nestjs/platform-express`) - Underlying HTTP server
- Helmet 8.1.0 - Security headers middleware
- Throttler 6.5.0 - Rate limiting (10 requests/60s in production)

**Shared:**
- `@cortege/ibp-domain` (`packages/ibp-domain/`) - third npm workspace: pure TypeScript IBP rules (v3.0 + v3.2), bands and the sync/public wire types, no runtime dependencies. `IbpRulesService` (API) and `mobile/src/app/ibp-scoring.ts` (mobile) are thin adapters over it.

**Mobile:**
- React 19.2.3 - Component framework
- React Native 0.86.3 - Native platform abstraction
- React Navigation 7.x - Navigation stack
  - `@react-navigation/native-stack` - Native iOS/Android navigation
  - `@react-navigation/bottom-tabs` - Tab bar navigation (Android, and the iOS fallback outside Release)
  - `react-native-bottom-tabs` + `@bottom-tabs/react-navigation` - Native iOS tab bar (always used in Release)
  - `@react-navigation/elements` - Navigation utilities
- `supercluster` 9.1.0 - Marker clustering on the public map (JS only, no native module)

**Testing:**
- Jest 29.7.0 - Test runner and assertion framework
- ts-jest 29.4.6 - TypeScript support for Jest
- Supertest 7.2.2 - HTTP assertion library (API E2E)
- React Test Renderer 19.x - React component rendering for tests

**Build/Dev:**
- TypeScript 5.9.3 - Compiler (`tsc`)
- ts-node-dev 2.0.0 - Development server with watch and auto-reload (API)
- Expo CLI - React Native development and build tooling
- Docker - Container runtime (multistage build, Alpine base)

## Key Dependencies

**Critical:**
- pg 8.20.0 - PostgreSQL client (raw SQL, connection pooling)
- class-validator 0.15.1 - DTO request validation (API)
- class-transformer 0.5.1 - DTO serialization
- jsonwebtoken 9.0.3 - JWT creation and verification
- jwks-rsa 4.0.1 - Auth0 JWKS key resolution
- react-native-auth0 5.4.0 - Auth0 OAuth integration (Mobile)
- expo-secure-store 57.0.4 - Encrypted credential storage (Mobile)
- expo-sqlite 57.0.3 - Local SQLite database (Mobile)

**Infrastructure:**
- @aws-sdk/client-s3 3.1004.0 - S3 object storage operations
- @aws-sdk/s3-request-presigner 3.1004.0 - Presigned URL generation
- dotenv 17.3.1 - Environment variable loading
- reflect-metadata 0.2.2 - TypeScript decorator support
- lru-cache 11.5.3 - In-process caching

Phase 01.9 removed the mailer package and `@types` for it, plus `EmailService` (the API sends no email; the mail-relay env settings are gone), `bcryptjs` and `@nestjs/schedule` (zero imports). Do not re-add them.

**Mobile UI/Navigation:**
- react-native-maps 1.27.2 - Map component (Google Maps/Apple Maps)
- react-native-gesture-handler 2.32.0 - Touch gesture system
- react-native-screens 4.26.0 - Native screen management
- react-native-safe-area-context 5.7.0 - Safe area layout
- react-native-bottom-tabs 1.4.0 - Custom bottom tab bar
- @bottom-tabs/react-navigation 1.4.0 - React Navigation bottom tabs integration
- @expo/vector-icons 15.0.2 - Icon library (Ionicons, MaterialCommunity, etc.)
- react-native-svg 15.15.4 - SVG rendering
- supercluster 9.1.0 - marker clustering on the public map

**Mobile OS Features:**
- expo-location 57.0.19 - GPS location services
- expo-image-picker 57.0.19 - Camera and photo library access
- expo-haptics 57.0.3 - Haptic feedback
- expo-blur 57.0.3 - Blur effect component
- expo-network 57.0.2 - Network connectivity detection
- expo-constants 57.0.19 - App constants (version, etc.)

**Development Tools:**
- ESLint 8.57.1 - Code linting
- @typescript-eslint 7.18.0 - TypeScript-specific lint rules
- eslint-plugin-react 7.37.5 - React-specific lint rules
- eslint-plugin-react-hooks 4.6.2 - React Hooks lint rules
- Prettier 3.8.1 - Code formatting
- jimp 1.6.1 - Image processing (asset generation)
- @expo/ngrok 4.1.0 - Local tunnel for testing on physical devices (mobile `devDependencies` since phase 01.9; `expo start --tunnel` still finds it in dev installs)

## Configuration

**Environment:**
- `api/.env` - API backend secrets and configuration (PostgreSQL, Auth0, S3; no SMTP)
- `mobile/.env` - Mobile app configuration (API URL, Auth0 endpoints)
- `docker-compose.yml` - Local development services (PostgreSQL, MinIO)

**Build:**
- No root `tsconfig.json` (removed phase 01.9; `api/` and `mobile/` each extend their own)
- `api/tsconfig.json` - API TypeScript configuration (strict mode)
- `api/tsconfig.build.json` - Production build exclusions
- `mobile/tsconfig.json` - Mobile TypeScript configuration (strict mode enabled)
- `packages/ibp-domain/tsconfig.json` - Shared package configuration (built to `dist` via `npm run build:domain`; Metro, Jest and `tsc` read its `src`, Node at runtime reads `dist`)
- `.prettierrc.json` - Shared formatting: 2-space indent, 100-char line width, no semicolons
- `.eslintrc.json` - Shared linting: unused vars error, no-explicit-any warning, no require imports
- `mobile/app.json` - Expo configuration (iOS bundle ID, native plugins, permissions)
- `mobile/jest.unit.config.js` - Mobile unit test configuration
- `api/jest.config.js` - API E2E test configuration
- `api/jest.unit.config.js` - API unit test configuration
- `packages/ibp-domain/jest.config.js` - Shared package test configuration (coverage thresholds 100%)

**Docker:**
- `Dockerfile` - Multistage build: Node 22 Alpine builder → runtime image
- `infra/docker-compose.yml` - Development: PostgreSQL 16, MinIO S3
- `infra/docker-compose.vps.yml` - Production VPS stack

## Platform Requirements

**Development:**
- macOS, Linux, or Windows with Docker Desktop
- Node.js >= 22.5 (`package.json` `engines`, enforced in CI with `actions/setup-node`)
- npm 10+
- Xcode (macOS) or Android Studio for native builds
- CI now also builds unsigned Android and iOS binaries (`native-android`, `native-ios` jobs) without a device

**Production:**
- Node.js 22 Alpine (containerized)
- PostgreSQL 16
- S3-compatible object storage (AWS S3 or MinIO)
- Caddy reverse proxy (VPS deployment, see `infra/vps/`)
- The API sends no email: SMTP settings and `EmailService` were removed (phase 01.9)

**Deployment:**
- GitHub Container Registry (`ghcr.io/florianlepont/cortege:latest`)
- Docker-based pull-deployment on VPS (systemd timer pulls digest every 5 minutes)
- Presigned S3 URLs for attachment access

---

*Stack analysis: 2026-09-22, updated 2026-09-27*
