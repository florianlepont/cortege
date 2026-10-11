/**
 * Typed application configuration (D-01). Built once by `loadAppConfig` from the
 * validated environment and exposed through `ConfigService` under the "app" key
 * (`appConfigOf(config)`). Services read these fields instead of `process.env`.
 */
export type NodeEnv = "development" | "test" | "production"

export type CorsMode = "any" | "none" | "list"

export type StorageMode = "local" | "minio"

export type WeatherProvider = "meteofrance" | "synthetic" | "off"

export type AppConfig = {
  nodeEnv: NodeEnv
  isProduction: boolean
  http: {
    port: number
    trustProxy: string
  }
  /**
   * D-03: "none" disables CORS, "list" allows the listed origins only, "any"
   * (reflect every origin) is only reachable outside production.
   */
  cors: {
    mode: CorsMode
    origins: string[]
  }
  database: {
    host: string
    port: number
    user: string
    password: string
    database: string
    poolMax: number
    idleTimeoutMs: number
    connectionTimeoutMs: number
    statementTimeoutMs: number
    idleInTransactionTimeoutMs: number
    applicationName: string
  }
  auth0: {
    domain: string
    publicDomain: string
    audience: string
    mgmtClientId: string
    mgmtClientSecret: string
    appClientId: string
    httpTimeoutMs: number
  }
  storage: {
    mode: StorageMode
    bucket: string
    uploadsDir: string
    endpoint: string
    region: string
    accessKey: string
    secretKey: string
  }
  cadastre: {
    provider: string
    allowFallback: boolean
    timeoutMs: number
    reverseUrl: string
    searchUrl: string
    apiCartoParcelUrl: string
    wfsUrl: string
    wfsTypename: string
    wfsCount: number
  }
  weather: {
    /** Default "off": an unset production value must never store invented weather (D-22). */
    provider: WeatherProvider
    /** The Météo-France portal credential. Read from the environment only, never logged. */
    credential: string
    observationsUrl: string
    timeoutMs: number
    /** D-19: beyond this distance to the nearest station the weather stays empty. */
    maxStationDistanceKm: number
    /** Longest gap between the survey time and an observation that is still used. */
    timeToleranceMinutes: number
  }
  debug: {
    dataResetEnabled: boolean
  }
  build: {
    /** The git commit the image was built from (lowercase hex, 7 to 40 chars), or null. */
    commit: string | null
  }
}
