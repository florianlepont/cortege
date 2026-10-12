import { plainToInstance } from "class-transformer"
import { IsIn, IsOptional, IsString, Matches, validateSync } from "class-validator"
import { assertProductionSafety } from "./production-rules"

export const NODE_ENVS = ["development", "test", "production"] as const

export const WEATHER_PROVIDERS = ["meteofrance", "synthetic", "off"] as const

/**
 * WEATHER_PROVIDER, case-insensitive and trimmed like `loadAppConfig` reads it; a blank value
 * means "off". An unknown value (a typo such as "meteo") fails the startup instead of silently
 * turning the weather off.
 */
const WEATHER_PROVIDER_PATTERN = new RegExp(`^\\s*(${WEATHER_PROVIDERS.join("|")})?\\s*$`, "i")

/**
 * Environment schema (D-01: class-validator only). Every variable is
 * an optional string: booleans and numbers are parsed in `loadAppConfig` with
 * today's exact predicates, so no value that works today is rejected in
 * development or test (D-02). Production rules live in production-rules.ts and
 * run on top, only when NODE_ENV is production.
 *
 * The retired token secrets, their expiry settings and the old AUTH_* flags
 * are deliberately absent (D-04).
 */
export class EnvironmentVariables {
  @IsOptional() @IsIn([...NODE_ENVS]) NODE_ENV?: string

  // HTTP
  @IsOptional() @IsString() PORT?: string
  @IsOptional() @IsString() TRUST_PROXY?: string
  @IsOptional() @IsString() CORS_ORIGIN?: string

  // PostgreSQL (D-06 pool and timeouts)
  @IsOptional() @IsString() POSTGRES_HOST?: string
  @IsOptional() @IsString() POSTGRES_PORT?: string
  @IsOptional() @IsString() POSTGRES_USER?: string
  @IsOptional() @IsString() POSTGRES_PASSWORD?: string
  @IsOptional() @IsString() POSTGRES_DB?: string
  @IsOptional() @IsString() PG_POOL_MAX?: string
  @IsOptional() @IsString() PG_IDLE_TIMEOUT_MS?: string
  @IsOptional() @IsString() PG_CONNECTION_TIMEOUT_MS?: string
  @IsOptional() @IsString() PG_STATEMENT_TIMEOUT_MS?: string
  @IsOptional() @IsString() PG_IDLE_IN_TRANSACTION_TIMEOUT_MS?: string

  // Auth0
  @IsOptional() @IsString() AUTH0_DOMAIN?: string
  @IsOptional() @IsString() AUTH0_PUBLIC_DOMAIN?: string
  @IsOptional() @IsString() AUTH0_AUDIENCE?: string
  @IsOptional() @IsString() AUTH0_MGMT_CLIENT_ID?: string
  @IsOptional() @IsString() AUTH0_MGMT_CLIENT_SECRET?: string
  @IsOptional() @IsString() AUTH0_APP_CLIENT_ID?: string
  @IsOptional() @IsString() AUTH0_HTTP_TIMEOUT_MS?: string

  // Object storage
  @IsOptional() @IsString() OBJECT_STORAGE_MODE?: string
  @IsOptional() @IsString() OBJECT_STORAGE_BUCKET?: string
  @IsOptional() @IsString() ATTACHMENTS_UPLOAD_DIR?: string
  @IsOptional() @IsString() OBJECT_STORAGE_ENDPOINT?: string
  @IsOptional() @IsString() OBJECT_STORAGE_REGION?: string
  @IsOptional() @IsString() OBJECT_STORAGE_ACCESS_KEY?: string
  @IsOptional() @IsString() OBJECT_STORAGE_SECRET_KEY?: string

  // Cadastre
  @IsOptional() @IsString() CADASTRE_PROVIDER?: string
  @IsOptional() @IsString() CADASTRE_PROVIDER_ALLOW_FALLBACK?: string
  @IsOptional() @IsString() CADASTRE_PROVIDER_TIMEOUT_MS?: string
  @IsOptional() @IsString() CADASTRE_IGN_REVERSE_URL?: string
  @IsOptional() @IsString() GEOCODING_IGN_SEARCH_URL?: string
  @IsOptional() @IsString() CADASTRE_IGN_APICARTO_PARCEL_URL?: string
  @IsOptional() @IsString() CADASTRE_IGN_WFS_URL?: string
  @IsOptional() @IsString() CADASTRE_IGN_WFS_TYPENAME?: string
  @IsOptional() @IsString() CADASTRE_IGN_WFS_COUNT?: string

  // Weather (phase 27, D-19, D-22). METEOFRANCE_API_KEY is a credential: read by app-config.ts
  // only, never logged.
  @IsOptional() @Matches(WEATHER_PROVIDER_PATTERN) WEATHER_PROVIDER?: string
  @IsOptional() @IsString() METEOFRANCE_API_KEY?: string
  @IsOptional() @IsString() METEOFRANCE_OBS_URL?: string
  @IsOptional() @IsString() WEATHER_TIMEOUT_MS?: string
  @IsOptional() @IsString() WEATHER_MAX_STATION_DISTANCE_KM?: string
  @IsOptional() @IsString() WEATHER_SYNOP_MAX_DISTANCE_KM?: string
  @IsOptional() @IsString() WEATHER_TIME_TOLERANCE_MINUTES?: string

  // Debug
  @IsOptional() @IsString() DEBUG_DATA_RESET_ENABLED?: string

  // Build: the git commit of the image, set by api/Dockerfile from the CI build arg (never in an
  // env file). Shown by GET /v1/health; anything that is not a hex sha is ignored there.
  @IsOptional() @IsString() GIT_SHA?: string
}

/**
 * Type-checks the raw env and returns the converted instance plus the names of
 * the invalid variables (names only: values may be secrets).
 */
export function checkEnvSchema(raw: Record<string, unknown>): {
  env: EnvironmentVariables
  invalidVariables: string[]
} {
  const env = plainToInstance(EnvironmentVariables, raw, { enableImplicitConversion: true })
  const errors = validateSync(env, { skipMissingProperties: false })
  return { env, invalidVariables: errors.map((error) => error.property) }
}

/**
 * The `validate` hook of ConfigModule.forRoot (D-01). Throws with variable
 * names only, then applies the production rules (D-02, D-03, D-18) when
 * NODE_ENV is production.
 */
export function validateEnv(raw: Record<string, unknown>): EnvironmentVariables {
  const { env, invalidVariables } = checkEnvSchema(raw)
  if (invalidVariables.length > 0) {
    throw new Error(`Configuration invalide : ${invalidVariables.join(", ")}`)
  }
  if (env.NODE_ENV === "production") {
    assertProductionSafety(env as Record<string, string | undefined>)
  }
  return env
}
