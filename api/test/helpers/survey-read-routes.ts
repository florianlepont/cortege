// Phase 29 (D-12): the single classification of every API route, by what it may show of another
// member's surveys. test/survey-read-paths.spec.ts enumerates every controller route and fails on a
// route missing here (or on an entry whose route is gone); test/private-visibility.e2e-spec.ts runs
// one two-user case per MEMBER_READ_ROUTES key. Adding a route therefore forces a decision here,
// and adding a member read route forces an e2e case.
//
// Classes:
// - shared: reads other members' surveys through PUBLIC_SURVEY_PREDICATE only (D-09)
// - caller-aware: the parcel history, submittedVisibleToCallerSql (own surveys plus shared, D-10)
// - report-create: POST /v1/reports, PUBLIC_SURVEY_PREDICATE plus the moderator rule (404 otherwise)
// - owner: the caller's own surveys only (findOwned or user_id = caller), 404 to anyone else
// - moderator: report review, moderator or admin role
// - no-survey-data: reads no survey (weather, map styles, places, profile, health, parcel lookup)
// - debug: dev-only resets, gated by DEBUG_DATA_RESET_ENABLED and isDebugSurfaceEnabled()

export type SurveyRouteClass =
  | "shared"
  | "caller-aware"
  | "report-create"
  | "owner"
  | "moderator"
  | "no-survey-data"
  | "debug"

/** Keyed "METHOD /v1/path" with the Nest parameter names, one entry per controller route. */
export const SURVEY_ROUTE_CLASSES: Record<string, SurveyRouteClass> = {
  // app.controller.ts
  "GET /v1/health": "no-survey-data", // liveness, no table read

  // debug/debug.controller.ts
  "POST /v1/debug/test-token": "debug", // dev-only token minting
  "POST /v1/debug/reset-ibp-data": "debug", // dev-only DELETE FROM surveys, gated
  "POST /v1/debug/reset-user-data": "debug", // dev-only DELETE FROM surveys, gated

  // reports/reports.controller.ts
  "POST /v1/reports": "report-create", // findSurveyForReport: PUBLIC_SURVEY_PREDICATE AS shared, 404
  "GET /v1/reports": "moderator", // report review list, moderator or admin role
  "PATCH /v1/reports/:id": "moderator", // report review decision, moderator or admin role

  // surveys/map-styles.controller.ts
  "GET /v1/map-styles/:file": "no-survey-data", // fixed WMTS style documents

  // surveys/parcels.controller.ts
  "GET /v1/parcels/resolve": "no-survey-data", // cadastre lookup by coordinates, no survey read
  "GET /v1/parcels/:parcelId/surveys/history": "caller-aware", // submittedVisibleToCallerSql (D-10)

  // surveys/public.controller.ts
  "GET /v1/public/map-items": "shared", // buildPublicMapItemsQuery, conditions start with the predicate
  "GET /v1/public/community-surveys": "shared", // buildCommunitySurveysQuery, same
  "GET /v1/public/community-surveys/:id": "shared", // detail and its history, inline predicate
  "GET /v1/public/community-surveys/:id/attachments": "shared", // assertPublicSurvey first
  "GET /v1/public/community-surveys/:id/attachments/:attachmentId/download-url": "shared", // assertPublicSurvey first
  "GET /v1/public/community-surveys/:id/attachments/:attachmentId/content": "shared", // assertPublicSurvey first
  "GET /v1/public/parcels/status": "shared", // LATEST_PUBLIC_SURVEY_OF_PARCEL, inline predicate

  // surveys/search.controller.ts
  "GET /v1/search/community": "shared", // community surveys and members, the predicate
  "GET /v1/search/places": "no-survey-data", // IGN geocoder, no survey read
  "GET /v1/search/parcels": "shared", // parcel survey counts and ordering, inline predicate

  // surveys/surveys.controller.ts: every route goes through findOwned or user_id = caller
  "GET /v1/surveys": "owner", // owner list, conditions start with user_id = $1
  "POST /v1/surveys": "owner", // upsert of the caller's survey
  "GET /v1/surveys/:id": "owner", // findOwned, 404 to anyone else
  "PATCH /v1/surveys/:id": "owner", // findOwned, 404 to anyone else
  "PATCH /v1/surveys/:id/visibility": "owner", // findOwned, 404 to anyone else
  "POST /v1/surveys/:id/submit": "owner", // findOwned, 404 to anyone else
  "DELETE /v1/surveys/:id": "owner", // findOwned, 404 to anyone else
  "POST /v1/surveys/:id/attachments": "owner", // findOwnedOrThrow
  "GET /v1/surveys/:id/attachments": "owner", // findOwnedOrThrow
  "GET /v1/surveys/:id/attachments/:attachmentId/download-url": "owner", // findOwnedOrThrow
  "GET /v1/surveys/:id/attachments/:attachmentId/content": "owner", // findOwnedOrThrow
  "PUT /v1/surveys/:id/attachments/:attachmentId/upload": "owner", // findOwnedOrThrow
  "DELETE /v1/surveys/:id/attachments/:attachmentId": "owner", // findOwnedOrThrow
  "GET /v1/surveys/:id/events": "owner", // ownership first, then survey_id = $1

  // surveys/sync.controller.ts
  "POST /v1/sync": "owner", // the caller's own operations
  "GET /v1/sync/changes": "owner", // owner sync pull, s.user_id = $1

  // surveys/weather.controller.ts
  "GET /v1/weather": "no-survey-data", // Météo-France observations

  // users/users.controller.ts
  "GET /v1/me": "no-survey-data", // own profile
  "PATCH /v1/me": "no-survey-data", // own profile
  "PATCH /v1/me/email": "no-survey-data", // own profile
  "POST /v1/me/password-reset": "no-survey-data", // Auth0 call
  "PUT /v1/me/profile-picture": "no-survey-data", // own profile picture
  "GET /v1/me/profile-picture": "no-survey-data", // own profile picture
  "DELETE /v1/me/profile-picture": "no-survey-data", // own profile picture
  "DELETE /v1/me": "owner", // account deletion: the caller's own surveys (retained or deleted)
}

const MEMBER_READ_CLASSES: ReadonlySet<SurveyRouteClass> = new Set([
  "shared",
  "caller-aware",
  "report-create",
])

/** The routes that can show another member's surveys: each has a two-user e2e case (D-12). */
export const MEMBER_READ_ROUTES: readonly string[] = Object.entries(SURVEY_ROUTE_CLASSES)
  .filter(([, routeClass]) => MEMBER_READ_CLASSES.has(routeClass))
  .map(([route]) => route)
  .sort()
