import { currentNodeEnv, loadAppConfig } from "../src/config/app-config"
import { validateEnv } from "../src/config/env.schema"
import {
  findProductionProblems,
  findProductionWarnings,
  isKnownDefaultSecret,
} from "../src/config/production-rules"

/** A production env that passes every rule (D-02, D-03, D-18). */
function validProductionEnv(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    NODE_ENV: "production",
    POSTGRES_HOST: "db",
    POSTGRES_PORT: "5432",
    POSTGRES_USER: "cortege",
    POSTGRES_DB: "cortege",
    POSTGRES_PASSWORD: "s3cure-db-password",
    AUTH0_DOMAIN: "tenant.example.auth0.com",
    AUTH0_AUDIENCE: "https://api.example",
    AUTH0_MGMT_CLIENT_ID: "mgmt-client",
    AUTH0_MGMT_CLIENT_SECRET: "mgmt-secret-value",
    CORS_ORIGIN: "none",
    OBJECT_STORAGE_MODE: "minio",
    OBJECT_STORAGE_ENDPOINT: "https://files.example",
    OBJECT_STORAGE_ACCESS_KEY: "minio",
    OBJECT_STORAGE_SECRET_KEY: "s3cr3t-value",
    ...overrides,
  }
}

function productionError(env: Record<string, string | undefined>): string {
  try {
    validateEnv(env)
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error("expected validateEnv to throw")
}

describe("config: loadAppConfig defaults (D-02: outside production nothing changes)", () => {
  it("returns today's defaults for an empty env", () => {
    const config = loadAppConfig({})
    expect(config.nodeEnv).toBe("development")
    expect(config.isProduction).toBe(false)
    expect(config.database.password).toBe("ibp")
    expect(config.database.host).toBe("localhost")
    expect(config.database.port).toBe(5432)
    expect(config.database.user).toBe("ibp")
    expect(config.database.database).toBe("ibp")
    expect(config.database.statementTimeoutMs).toBe(10000)
    expect(config.database.poolMax).toBe(10)
    expect(config.database.idleTimeoutMs).toBe(30000)
    expect(config.database.connectionTimeoutMs).toBe(5000)
    expect(config.database.idleInTransactionTimeoutMs).toBe(60000)
    expect(config.database.applicationName).toBe("cortege-api")
    expect(config.storage.mode).toBe("local")
    expect(config.storage.bucket).toBe("ibp-media")
    expect(config.storage.uploadsDir).toBe("/tmp/ibp-uploads")
    expect(config.storage.endpoint).toBe("http://localhost:9000")
    expect(config.storage.region).toBe("us-east-1")
    expect(config.storage.accessKey).toBe("minio")
    expect(config.storage.secretKey).toBe("minio123")
    expect(config.http.port).toBe(3000)
    expect(config.http.trustProxy).toBe("loopback,uniquelocal")
    expect(config.cadastre.provider).toBe("synthetic")
    expect(config.cadastre.timeoutMs).toBe(2500)
    expect(config.cadastre.wfsCount).toBe(1200)
    expect(config.cadastre.wfsUrl).toBe("https://data.geopf.fr/wfs/ows")
    expect(config.cadastre.wfsTypename).toBe("CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle")
    expect(config.cadastre.reverseUrl).toBe("https://data.geopf.fr/geocodage/reverse")
    expect(config.cadastre.searchUrl).toBe("https://data.geopf.fr/geocodage/search")
    expect(config.cadastre.apiCartoParcelUrl).toBe("https://apicarto.ign.fr/api/cadastre/parcelle")
    expect(config.auth0.domain).toBe("")
    expect(config.auth0.audience).toBe("")
    expect(config.auth0.httpTimeoutMs).toBe(5000)
    expect(config.debug.dataResetEnabled).toBe(false)
  })

  it("falls back AUTH0_PUBLIC_DOMAIN to AUTH0_DOMAIN and trims TRUST_PROXY", () => {
    expect(loadAppConfig({ AUTH0_DOMAIN: "a.auth0.com" }).auth0.publicDomain).toBe("a.auth0.com")
    expect(
      loadAppConfig({ AUTH0_DOMAIN: "a.auth0.com", AUTH0_PUBLIC_DOMAIN: " login.example " }).auth0
        .publicDomain,
    ).toBe("login.example")
    expect(loadAppConfig({ TRUST_PROXY: "  " }).http.trustProxy).toBe("loopback,uniquelocal")
    expect(loadAppConfig({ TRUST_PROXY: " 1 " }).http.trustProxy).toBe("1")
  })

  it("has no e-mail settings (D-09: the API sends no e-mail)", () => {
    expect(Object.keys(loadAppConfig({}))).not.toContain("smtp")
  })

  it("rejects an unknown NODE_ENV and names it", () => {
    expect(() => validateEnv({ NODE_ENV: "staging" })).toThrow(/NODE_ENV/)
    expect(() => validateEnv({ NODE_ENV: "staging" })).toThrow(/^Configuration invalide : /)
  })
})

describe("config: number parsing (garbage or empty falls back, never throws)", () => {
  it.each([
    ["PORT", "abc", (c: ReturnType<typeof loadAppConfig>) => c.http.port, 3000],
    ["PORT", "", (c: ReturnType<typeof loadAppConfig>) => c.http.port, 3000],
    ["PORT", "8080", (c: ReturnType<typeof loadAppConfig>) => c.http.port, 8080],
    [
      "CADASTRE_IGN_WFS_COUNT",
      "9999",
      (c: ReturnType<typeof loadAppConfig>) => c.cadastre.wfsCount,
      3000,
    ],
    [
      "CADASTRE_IGN_WFS_COUNT",
      "450.7",
      (c: ReturnType<typeof loadAppConfig>) => c.cadastre.wfsCount,
      450,
    ],
    [
      "CADASTRE_PROVIDER_TIMEOUT_MS",
      "-5",
      (c: ReturnType<typeof loadAppConfig>) => c.cadastre.timeoutMs,
      2500,
    ],
    [
      "PG_STATEMENT_TIMEOUT_MS",
      "x",
      (c: ReturnType<typeof loadAppConfig>) => c.database.statementTimeoutMs,
      10000,
    ],
    [
      "PG_STATEMENT_TIMEOUT_MS",
      "2000",
      (c: ReturnType<typeof loadAppConfig>) => c.database.statementTimeoutMs,
      2000,
    ],
    ["POSTGRES_PORT", "0", (c: ReturnType<typeof loadAppConfig>) => c.database.port, 5432],
  ])("%s=%p resolves to %p", (name, value, pick, expected) => {
    expect(pick(loadAppConfig({ NODE_ENV: "test", [name]: value }))).toBe(expected)
  })
})

describe("config: boolean and enum parsing (today's predicates)", () => {
  it("parses DEBUG_DATA_RESET_ENABLED case-insensitively", () => {
    expect(loadAppConfig({ DEBUG_DATA_RESET_ENABLED: "True" }).debug.dataResetEnabled).toBe(true)
    expect(loadAppConfig({ DEBUG_DATA_RESET_ENABLED: "1" }).debug.dataResetEnabled).toBe(false)
  })

  it("keeps GIT_SHA only when it is a git sha (7 to 40 hex characters, lowercased)", () => {
    const sha = "0123456789abcdef0123456789abcdef01234567"
    expect(loadAppConfig({}).build.commit).toBeNull()
    expect(loadAppConfig({ GIT_SHA: sha }).build.commit).toBe(sha)
    expect(loadAppConfig({ GIT_SHA: " A7A26B4 " }).build.commit).toBe("a7a26b4")
    for (const value of ["", "   ", "a7a26b", `${sha}0`, "main", "a7a26b49; rm", "unknown"]) {
      expect(loadAppConfig({ GIT_SHA: value }).build.commit).toBeNull()
    }
  })

  it("keeps CADASTRE_PROVIDER_ALLOW_FALLBACK on unless it is exactly 'false'", () => {
    expect(loadAppConfig({}).cadastre.allowFallback).toBe(true)
    expect(
      loadAppConfig({ CADASTRE_PROVIDER_ALLOW_FALLBACK: "FALSE" }).cadastre.allowFallback,
    ).toBe(false)
    expect(loadAppConfig({ CADASTRE_PROVIDER_ALLOW_FALLBACK: "no" }).cadastre.allowFallback).toBe(
      true,
    )
  })

  it("reads GEOCODING_IGN_SEARCH_URL as the place search URL", () => {
    expect(
      loadAppConfig({ GEOCODING_IGN_SEARCH_URL: "http://localhost:9999/search" }).cadastre
        .searchUrl,
    ).toBe("http://localhost:9999/search")
  })

  it("normalises CADASTRE_PROVIDER and falls back to local storage outside production", () => {
    expect(loadAppConfig({ CADASTRE_PROVIDER: " IGN " }).cadastre.provider).toBe("ign")
    expect(loadAppConfig({ NODE_ENV: "test", OBJECT_STORAGE_MODE: "s3" }).storage.mode).toBe(
      "local",
    )
    expect(loadAppConfig({ OBJECT_STORAGE_MODE: "minio" }).storage.mode).toBe("minio")
  })

  it("maps CORS_ORIGIN to none, list or any (D-03)", () => {
    expect(loadAppConfig({ CORS_ORIGIN: "none" }).cors).toEqual({ mode: "none", origins: [] })
    expect(loadAppConfig({ CORS_ORIGIN: " NONE " }).cors).toEqual({ mode: "none", origins: [] })
    expect(loadAppConfig({ CORS_ORIGIN: "https://a, https://b" }).cors).toEqual({
      mode: "list",
      origins: ["https://a", "https://b"],
    })
    expect(loadAppConfig({ NODE_ENV: "test" }).cors).toEqual({ mode: "any", origins: [] })
    expect(loadAppConfig({ NODE_ENV: "test", CORS_ORIGIN: "" }).cors).toEqual({
      mode: "any",
      origins: [],
    })
  })
})

describe("config: currentNodeEnv (decorator-time, no validation)", () => {
  it("reads NODE_ENV only, even when the rest of the env is invalid", () => {
    expect(currentNodeEnv({ NODE_ENV: "production", POSTGRES_PASSWORD: "ibp" })).toBe("production")
    expect(currentNodeEnv({ NODE_ENV: "test" })).toBe("test")
    expect(currentNodeEnv({})).toBe("development")
    expect(currentNodeEnv({ NODE_ENV: "staging" })).toBe("development")
  })
})

describe("config: production rules (D-02, D-03, D-18)", () => {
  it("accepts a full valid production env", () => {
    expect(() => validateEnv(validProductionEnv())).not.toThrow()
    expect(loadAppConfig(validProductionEnv()).isProduction).toBe(true)
  })

  it.each(["POSTGRES_USER", "POSTGRES_DB", "POSTGRES_HOST", "POSTGRES_PORT"])(
    "refuses an absent or empty %s (raw env, no default applied)",
    (name) => {
      expect(productionError(validProductionEnv({ [name]: undefined }))).toContain(name)
      expect(productionError(validProductionEnv({ [name]: "" }))).toContain(name)
    },
  )

  it.each(["ibp", "", "CHANGE_ME_64_CHAR_HEX", "change-me-access-secret", "ChangeMe123", "  "])(
    "refuses POSTGRES_PASSWORD=%p",
    (value) => {
      const message = productionError(validProductionEnv({ POSTGRES_PASSWORD: value }))
      expect(message).toMatch(/^Configuration de production refusée : /)
      expect(message).toContain("POSTGRES_PASSWORD")
      if (value.trim()) {
        expect(message).not.toContain(value)
      }
    },
  )

  it.each(["minio123", "minio", "", "CHANGE_ME_64_CHAR_HEX"])(
    "refuses OBJECT_STORAGE_SECRET_KEY=%p in minio mode",
    (value) => {
      expect(productionError(validProductionEnv({ OBJECT_STORAGE_SECRET_KEY: value }))).toContain(
        "OBJECT_STORAGE_SECRET_KEY",
      )
    },
  )

  it("still starts when leftover SMTP_* lines remain in the env (D-09, unknown keys ignored)", () => {
    const env = validProductionEnv({
      SMTP_ENABLED: "true",
      SMTP_HOST: "smtp.example",
      SMTP_PORT: "not-a-port",
      SMTP_PASSWORD: "x",
      EMAIL_CHANGE_CONFIRM_URL_TEMPLATE: "https://example/confirm?t={token}",
    })
    expect(() => validateEnv(env)).not.toThrow()
    expect(findProductionProblems(env)).toEqual([])
  })

  it("refuses minio mode without OBJECT_STORAGE_ENDPOINT", () => {
    expect(productionError(validProductionEnv({ OBJECT_STORAGE_ENDPOINT: "" }))).toContain(
      "OBJECT_STORAGE_ENDPOINT",
    )
  })

  it("accepts OBJECT_STORAGE_SECRET_KEY=minio123 when OBJECT_STORAGE_MODE is local", () => {
    expect(() =>
      validateEnv(
        validProductionEnv({ OBJECT_STORAGE_MODE: "local", OBJECT_STORAGE_SECRET_KEY: "minio123" }),
      ),
    ).not.toThrow()
  })

  it("keeps OBJECT_STORAGE_ACCESS_KEY=minio allowed (pattern map C-2)", () => {
    expect(
      findProductionProblems(validProductionEnv({ OBJECT_STORAGE_ACCESS_KEY: "minio" })),
    ).toEqual([])
  })

  it.each([undefined, "", "s3", "MINIO"])("refuses OBJECT_STORAGE_MODE=%p", (value) => {
    expect(productionError(validProductionEnv({ OBJECT_STORAGE_MODE: value }))).toContain(
      "OBJECT_STORAGE_MODE",
    )
  })

  it.each(["AUTH0_AUDIENCE", "AUTH0_DOMAIN"])("refuses an empty %s", (name) => {
    expect(productionError(validProductionEnv({ [name]: "" }))).toContain(name)
    expect(productionError(validProductionEnv({ [name]: "   " }))).toContain(name)
    expect(productionError(validProductionEnv({ [name]: undefined }))).toContain(name)
  })

  it.each([
    undefined,
    "",
    "  ",
    "https://CHANGE_ME_YOUR_DOMAIN",
    "not a url",
    "https://a.example/",
  ])("refuses CORS_ORIGIN=%p", (value) => {
    expect(productionError(validProductionEnv({ CORS_ORIGIN: value }))).toContain("CORS_ORIGIN")
  })

  it.each(["NONE", "none", "https://a.example", "https://a.example, https://b.example"])(
    "accepts CORS_ORIGIN=%p",
    (value) => {
      expect(() => validateEnv(validProductionEnv({ CORS_ORIGIN: value }))).not.toThrow()
    },
  )

  it("lists every failing variable at once", () => {
    const problems = findProductionProblems({ NODE_ENV: "production", POSTGRES_PASSWORD: "ibp" })
    const variables = problems.map((p) => p.variable)
    expect(variables).toEqual(
      expect.arrayContaining([
        "POSTGRES_HOST",
        "POSTGRES_PORT",
        "POSTGRES_USER",
        "POSTGRES_DB",
        "POSTGRES_PASSWORD",
        "OBJECT_STORAGE_MODE",
        "AUTH0_DOMAIN",
        "AUTH0_AUDIENCE",
        "CORS_ORIGIN",
      ]),
    )
  })

  it("never echoes a rejected secret value", () => {
    const marker = "change-me-UNIQUE-MARKER-7f3a9"
    const env = validProductionEnv({
      POSTGRES_PASSWORD: marker,
      OBJECT_STORAGE_SECRET_KEY: marker,
      CORS_ORIGIN: `https://${marker}`,
    })
    const message = productionError(env)
    expect(message).not.toContain("UNIQUE-MARKER")
    for (const problem of findProductionProblems(env)) {
      expect(problem.reason).not.toContain("UNIQUE-MARKER")
    }
  })

  it("does not apply production rules outside production", () => {
    expect(() => validateEnv({ NODE_ENV: "test", POSTGRES_PASSWORD: "ibp" })).not.toThrow()
    expect(() => validateEnv({})).not.toThrow()
  })
})

describe("config: production warnings (AUTH0_MGMT_* degrade, never refuse)", () => {
  it("flags empty or placeholder AUTH0_MGMT_* without failing validation", () => {
    const env = validProductionEnv({
      AUTH0_MGMT_CLIENT_ID: "",
      AUTH0_MGMT_CLIENT_SECRET: undefined,
    })
    expect(findProductionWarnings(env).map((w) => w.variable)).toEqual([
      "AUTH0_MGMT_CLIENT_ID",
      "AUTH0_MGMT_CLIENT_SECRET",
    ])
    expect(findProductionProblems(env)).toEqual([])
    expect(() => validateEnv(env)).not.toThrow()
    expect(
      findProductionWarnings(validProductionEnv({ AUTH0_MGMT_CLIENT_SECRET: "CHANGE_ME" })).map(
        (w) => w.variable,
      ),
    ).toEqual(["AUTH0_MGMT_CLIENT_SECRET"])
    expect(findProductionWarnings(validProductionEnv())).toEqual([])
  })
})

describe("config: weather (phase 27, D-19, D-22)", () => {
  it("defaults to no weather: provider off, no credential, caps 30 km and 50 km, tolerance 90 minutes", () => {
    expect(loadAppConfig({}).weather).toEqual({
      provider: "off",
      credential: "",
      authMode: "auto",
      observationsUrl: "https://public-api.meteofrance.fr/public/DPObs/v2",
      timeoutMs: 4000,
      maxStationDistanceKm: 30,
      synopMaxDistanceKm: 50,
      timeToleranceMinutes: 90,
    })
  })

  it("trims and lowercases WEATHER_PROVIDER, and reads a blank value as off", () => {
    expect(loadAppConfig({ WEATHER_PROVIDER: "Synthetic " }).weather.provider).toBe("synthetic")
    expect(loadAppConfig({ WEATHER_PROVIDER: "meteofrance" }).weather.provider).toBe("meteofrance")
    expect(loadAppConfig({ WEATHER_PROVIDER: " OFF" }).weather.provider).toBe("off")
    expect(loadAppConfig({ WEATHER_PROVIDER: "" }).weather.provider).toBe("off")
    expect(loadAppConfig({ WEATHER_PROVIDER: "  " }).weather.provider).toBe("off")
  })

  it("reads the credential, the URL and the numbers from the environment", () => {
    const weather = loadAppConfig({
      METEOFRANCE_API_KEY: "  a-key  ",
      METEOFRANCE_OBS_URL: "http://localhost:9998/obs",
      WEATHER_TIMEOUT_MS: "1500",
      WEATHER_MAX_STATION_DISTANCE_KM: "12.5",
      WEATHER_SYNOP_MAX_DISTANCE_KM: "80",
      WEATHER_TIME_TOLERANCE_MINUTES: "45",
    }).weather
    expect(weather.credential).toBe("a-key")
    expect(weather.observationsUrl).toBe("http://localhost:9998/obs")
    expect(weather.timeoutMs).toBe(1500)
    expect(weather.maxStationDistanceKm).toBe(12.5)
    expect(weather.synopMaxDistanceKm).toBe(80)
    expect(weather.timeToleranceMinutes).toBe(45)
  })

  it.each([
    ["apikey", "apikey"],
    [" Bearer ", "bearer"],
    ["APPLICATION-ID", "application-id"],
    ["", "auto"],
    ["token", "auto"],
  ])("reads METEOFRANCE_AUTH_MODE=%p as %s, an unknown value being auto", (value, expected) => {
    expect(loadAppConfig({ METEOFRANCE_AUTH_MODE: value }).weather.authMode).toBe(expected)
    expect(() => validateEnv({ METEOFRANCE_AUTH_MODE: value })).not.toThrow()
  })

  it("falls back to the defaults on garbage numbers", () => {
    const weather = loadAppConfig({
      WEATHER_TIMEOUT_MS: "x",
      WEATHER_MAX_STATION_DISTANCE_KM: "-3",
      WEATHER_SYNOP_MAX_DISTANCE_KM: "far",
      WEATHER_TIME_TOLERANCE_MINUTES: "0",
    }).weather
    expect(weather.timeoutMs).toBe(4000)
    expect(weather.maxStationDistanceKm).toBe(30)
    expect(weather.synopMaxDistanceKm).toBe(50)
    expect(weather.timeToleranceMinutes).toBe(90)
  })

  it("falls back when a whole number truncates to zero, but keeps a fractional distance", () => {
    const weather = loadAppConfig({
      WEATHER_TIMEOUT_MS: "0.5",
      WEATHER_TIME_TOLERANCE_MINUTES: "0.9",
      WEATHER_MAX_STATION_DISTANCE_KM: "0.5",
    }).weather
    expect(weather.timeoutMs).toBe(4000)
    expect(weather.timeToleranceMinutes).toBe(90)
    expect(weather.maxStationDistanceKm).toBe(0.5)
  })

  it.each(["meteofrance", "synthetic", "off", "METEOFRANCE", " Off "])(
    "accepts WEATHER_PROVIDER=%p",
    (value) => {
      expect(() => validateEnv({ WEATHER_PROVIDER: value })).not.toThrow()
    },
  )

  it.each(["meteo", "meteo-france", "ign", "on"])(
    "rejects WEATHER_PROVIDER=%p and names the variable",
    (value) => {
      expect(() => validateEnv({ WEATHER_PROVIDER: value })).toThrow(/WEATHER_PROVIDER/)
      expect(() => validateEnv({ WEATHER_PROVIDER: value })).toThrow(/^Configuration invalide : /)
    },
  )

  it("refuses synthetic weather in production (invented weather must never be stored)", () => {
    const env = validProductionEnv({ WEATHER_PROVIDER: "Synthetic " })
    expect(findProductionProblems(env)).toContainEqual(
      expect.objectContaining({ variable: "WEATHER_PROVIDER" }),
    )
    expect(productionError(env)).toContain("WEATHER_PROVIDER")
  })

  it.each([undefined, "", "off", "meteofrance"])(
    "accepts WEATHER_PROVIDER=%p in production",
    (value) => {
      const env = validProductionEnv({ WEATHER_PROVIDER: value, METEOFRANCE_API_KEY: "k" })
      expect(findProductionProblems(env).map((p) => p.variable)).not.toContain("WEATHER_PROVIDER")
      expect(() => validateEnv(env)).not.toThrow()
    },
  )

  it.each([undefined, "", "  ", "CHANGE_ME", "change-me-later"])(
    "warns, never refuses, for meteofrance with METEOFRANCE_API_KEY=%p",
    (value) => {
      const env = validProductionEnv({
        WEATHER_PROVIDER: "meteofrance",
        METEOFRANCE_API_KEY: value,
      })
      expect(findProductionWarnings(env).map((w) => w.variable)).toEqual(["METEOFRANCE_API_KEY"])
      expect(findProductionProblems(env)).toEqual([])
      expect(() => validateEnv(env)).not.toThrow()
    },
  )

  it("does not warn about the key when meteofrance has a real key, or when weather is off", () => {
    expect(
      findProductionWarnings(
        validProductionEnv({ WEATHER_PROVIDER: "meteofrance", METEOFRANCE_API_KEY: "real-key" }),
      ),
    ).toEqual([])
    expect(findProductionWarnings(validProductionEnv({ METEOFRANCE_API_KEY: "" }))).toEqual([])
    expect(
      findProductionWarnings(
        validProductionEnv({ WEATHER_PROVIDER: "off", METEOFRANCE_API_KEY: "" }),
      ),
    ).toEqual([])
  })

  it("never echoes the credential in a problem, a warning or an error", () => {
    const marker = "change-me-WEATHER-MARKER-5d1e"
    const env = validProductionEnv({
      WEATHER_PROVIDER: "synthetic",
      METEOFRANCE_API_KEY: marker,
    })
    expect(productionError(env)).not.toContain("WEATHER-MARKER")
    for (const item of [...findProductionProblems(env), ...findProductionWarnings(env)]) {
      expect(item.reason).not.toContain("WEATHER-MARKER")
    }
    const warned = validProductionEnv({
      WEATHER_PROVIDER: "meteofrance",
      METEOFRANCE_API_KEY: marker,
    })
    for (const warning of findProductionWarnings(warned)) {
      expect(warning.reason).not.toContain("WEATHER-MARKER")
    }
  })
})

describe("config: isKnownDefaultSecret (D-18)", () => {
  it.each([
    [undefined, true],
    ["", true],
    [" ", true],
    ["ibp", true],
    ["minio", true],
    ["minio123", true],
    ["change-me", true],
    ["change_me_later", true],
    ["CHANGEME", true],
    ["ChangeMe123", true],
    ["s3cr3t-value", false],
    ["exchange-me", false],
  ])("%p -> %p", (value, expected) => {
    expect(isKnownDefaultSecret(value)).toBe(expected)
  })
})
