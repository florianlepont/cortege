// The single Météo-France HTTP rule (D-08, D-22, D-27): an authenticated GET on the observation
// API (DPObs v2) with a whole-exchange timeout, and errors that carry a label and a status only.
//
// Authentication, as recorded by the spike (api/test/fixtures/meteofrance/README.md):
//  - `apikey`: the portal's "API Key" (valid three years) is sent in the `apikey` header. This is
//    the production mode: one secret, no token to renew (D-27 as corrected on 2026-10-12);
//  - `bearer`: the one hour JWT the portal hands out for trials is refused by the `apikey` header
//    but works as `Authorization: Bearer <token>`; the secret is used directly as that token;
//  - `application-id`: plan B, the portal application id exchanged for a token (OAuth2 client
//    credentials, POST on the token endpoint with `Authorization: Basic <application id>`), the
//    token cached in memory and renewed shortly before it expires or once after a 401. Built
//    against a mocked token endpoint and unverified against the real portal.
//
// The mode is the one configured (METEOFRANCE_AUTH_MODE); when it is not set, a JWT-shaped secret
// (three dot-separated parts, which is what an API key is) is sent as `apikey` and anything else is
// read as an application id.
//
// Nothing here logs. Neither the URL (it holds a station id and a time), the credential nor a
// token appears in any error message (T-27-38).

export type MeteoFranceAuthMode = "apikey" | "bearer" | "application-id"

/** The OAuth2 token endpoint of the portal (D-27). A constant, never user input (T-27-39). */
export const METEOFRANCE_TOKEN_URL = "https://portail-api.meteofrance.fr/token"

/** The only endpoints the API calls. A union, so no caller can build another path (T-27-39). */
export type MeteoFrancePath = "liste-stations" | "station/horaire" | "synop"

// A token is renewed this long before its announced expiry.
const TOKEN_MARGIN_MS = 60 * 1000
// Lifetime assumed when the token answer gives none: short, so a wrong guess costs one refresh.
const DEFAULT_TOKEN_LIFETIME_S = 300

// Three dot-separated base64url parts; the portal's 3 year key keeps the "=" padding of its last
// part, so up to two "=" are accepted at the end of each part.
const JWT_SHAPE = /^[A-Za-z0-9_-]+={0,2}\.[A-Za-z0-9_-]+={0,2}\.[A-Za-z0-9_-]*={0,2}$/

/** The mode to use: the requested one, else `apikey` for a JWT-shaped secret, else `application-id`. */
export function authModeOf(
  credential: string,
  requested: MeteoFranceAuthMode | "auto" = "auto",
): MeteoFranceAuthMode {
  if (requested !== "auto") {
    return requested
  }
  return JWT_SHAPE.test(credential.trim()) ? "apikey" : "application-id"
}

/**
 * A failed exchange. `status` is the HTTP status, or 0 when there was no answer (timeout, network).
 * The message is `meteofrance <label> ...`, never the URL, the credential or a token.
 */
export class MeteoFranceHttpError extends Error {
  readonly status: number

  constructor(label: string, status: number, detail?: string) {
    super(`meteofrance ${label} ${detail ?? `returned HTTP ${status}`}`)
    this.name = "MeteoFranceHttpError"
    this.status = status
  }
}

export type MeteoFranceHttpOptions = {
  /** METEOFRANCE_API_KEY: an API key, a ready one hour JWT or an application id. */
  credential: string
  /** METEOFRANCE_AUTH_MODE; "auto" (the default) reads the shape of the credential. */
  authMode?: MeteoFranceAuthMode | "auto"
  /** Base URL of the observation API, from configuration only (T-27-39). */
  baseUrl: string
  /** Budget of each exchange, headers and body (WEATHER_TIMEOUT_MS). */
  timeoutMs: number
  /** Token endpoint; defaults to the portal's. Tests may point it elsewhere. */
  tokenUrl?: string
}

type Answer = { status: number; ok: boolean; text: string }

type CachedToken = { value: string; expiresAt: number }

/** HTML where data was expected: the provider's firewall page ("Request Rejected"). */
function looksLikeHtml(text: string): boolean {
  return text.trimStart().startsWith("<")
}

export class MeteoFranceHttp {
  // ES private fields: they do not show up when the object is serialised or inspected.
  readonly #credential: string
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly tokenUrl: string
  private readonly mode: MeteoFranceAuthMode
  #token: CachedToken | null = null
  #tokenRequest: Promise<string> | null = null

  constructor(options: MeteoFranceHttpOptions) {
    this.#credential = options.credential.trim()
    this.baseUrl = options.baseUrl.replace(/\/+$/, "")
    this.timeoutMs = options.timeoutMs
    this.tokenUrl = options.tokenUrl ?? METEOFRANCE_TOKEN_URL
    this.mode = authModeOf(this.#credential, options.authMode)
  }

  /** A GET asking for JSON. An HTML page, even answered with 200, is a failure. */
  async getJson(
    path: MeteoFrancePath,
    query: Record<string, string>,
    label: string,
  ): Promise<unknown> {
    const text = await this.getText(path, query, label)
    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new MeteoFranceHttpError(label, 200, "returned an unreadable answer")
    }
  }

  /** A GET asking for text (the CSV station list). An HTML page is a failure. */
  async getText(
    path: MeteoFrancePath,
    query: Record<string, string>,
    label: string,
  ): Promise<string> {
    const url = new URL(`${this.baseUrl}/${path}`)
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value)
    }

    let answer = await this.send(url, label)
    if (answer.status === 401 && this.mode === "application-id") {
      // The token was refused (expired or revoked): drop it and retry once with a new one.
      this.#token = null
      answer = await this.send(url, label)
    }
    if (!answer.ok) {
      throw new MeteoFranceHttpError(label, answer.status)
    }
    if (looksLikeHtml(answer.text)) {
      throw new MeteoFranceHttpError(label, answer.status, "returned an unreadable answer")
    }
    return answer.text
  }

  private async send(url: URL, label: string): Promise<Answer> {
    let headers: Record<string, string>
    if (this.mode === "apikey") {
      headers = { Accept: "application/json", apikey: this.#credential }
    } else {
      const bearer = this.mode === "bearer" ? this.#credential : await this.accessToken()
      headers = { Accept: "application/json", Authorization: `Bearer ${bearer}` }
    }
    return await this.exchange(url, { method: "GET", headers }, label)
  }

  /** The cached token while it is valid, else one new token (concurrent callers share it). */
  private accessToken(): Promise<string> {
    if (this.#token !== null && Date.now() < this.#token.expiresAt - TOKEN_MARGIN_MS) {
      return Promise.resolve(this.#token.value)
    }
    if (this.#tokenRequest !== null) {
      return this.#tokenRequest
    }
    const request = this.requestToken().finally(() => {
      this.#tokenRequest = null
    })
    this.#tokenRequest = request
    return request
  }

  private async requestToken(): Promise<string> {
    const answer = await this.exchange(
      this.tokenUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${this.#credential}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: "grant_type=client_credentials",
      },
      "token",
    )
    if (!answer.ok) {
      throw new MeteoFranceHttpError("token", answer.status)
    }
    let body: unknown
    try {
      body = JSON.parse(answer.text)
    } catch {
      body = null
    }
    const record =
      typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {}
    const value = record.access_token
    if (typeof value !== "string" || value === "") {
      throw new MeteoFranceHttpError("token", answer.status, "returned an unreadable answer")
    }
    const lifetime =
      typeof record.expires_in === "number" && Number.isFinite(record.expires_in)
        ? Math.max(0, record.expires_in)
        : DEFAULT_TOKEN_LIFETIME_S
    this.#token = { value, expiresAt: Date.now() + lifetime * 1000 }
    return value
  }

  /**
   * One fetch bounded by the timeout; the body is awaited inside the same budget, so a server that
   * sends headers and then stalls is aborted too. Any rejection becomes a status 0 error that
   * does not repeat the original message (it may hold the URL or the credential).
   */
  private async exchange(url: URL | string, init: RequestInit, label: string): Promise<Answer> {
    try {
      const response = await fetch(url, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(this.timeoutMs),
      })
      const text = await response.text()
      return { status: response.status, ok: response.ok, text }
    } catch (error) {
      const name = typeof error === "object" && error !== null ? (error as Error).name : ""
      throw new MeteoFranceHttpError(
        label,
        0,
        name === "TimeoutError" || name === "AbortError" ? "timed out" : "request failed",
      )
    }
  }
}
