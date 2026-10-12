import {
  METEOFRANCE_TOKEN_URL,
  MeteoFranceHttp,
  MeteoFranceHttpError,
  authModeOf,
} from "../src/surveys/meteofrance-http"

// Markers: none of them may ever appear in an error message (T-27-38).
const JWT_CREDENTIAL = "eyJhbGciOiJSUzI1NiJ9.MARKERPAYLOAD.MARKERSIGNATURE"
const APP_ID_CREDENTIAL = "MARKERAPPLICATIONID0123456789abcdef=="
const TOKEN = "MARKERACCESSTOKEN"
const BASE = "https://obs.test/public/DPObs/v2"

type FakeResponse = { ok: boolean; status: number; text: () => Promise<string> }

function answer(status: number, body: unknown): FakeResponse {
  const text = typeof body === "string" ? body : JSON.stringify(body)
  return { ok: status >= 200 && status < 300, status, text: async () => text }
}

function tokenAnswer(expiresIn = 3600): FakeResponse {
  return answer(200, { access_token: TOKEN, token_type: "Bearer", expires_in: expiresIn })
}

function install(...responses: Array<FakeResponse | Error>): jest.Mock {
  const mock = jest.fn()
  for (const response of responses) {
    if (response instanceof Error) {
      mock.mockRejectedValueOnce(response)
    } else {
      mock.mockResolvedValueOnce(response)
    }
  }
  global.fetch = mock as unknown as typeof fetch
  return mock
}

function http(credential: string, timeoutMs = 1000): MeteoFranceHttp {
  return new MeteoFranceHttp({ credential, baseUrl: BASE, timeoutMs })
}

async function messageOf(call: Promise<unknown>): Promise<string> {
  try {
    await call
  } catch (error) {
    expect(error).toBeInstanceOf(MeteoFranceHttpError)
    return (error as Error).message
  }
  throw new Error("expected a rejection")
}

function expectNoSecret(message: string): void {
  for (const secret of [JWT_CREDENTIAL, APP_ID_CREDENTIAL, TOKEN, "obs.test", "MARKER", "http"]) {
    expect(message).not.toContain(secret)
  }
}

describe("authModeOf", () => {
  it("reads a JWT-shaped secret as a ready bearer token", () => {
    expect(authModeOf(JWT_CREDENTIAL)).toBe("bearer")
    expect(authModeOf(`  ${JWT_CREDENTIAL}  `)).toBe("bearer")
  })

  it("reads anything else as the portal application id", () => {
    expect(authModeOf(APP_ID_CREDENTIAL)).toBe("application-id")
    expect(authModeOf("abc.def")).toBe("application-id")
  })
})

describe("MeteoFranceHttp", () => {
  const originalFetch = global.fetch
  let now = 1_000_000

  beforeEach(() => {
    now = 1_000_000
    jest.spyOn(Date, "now").mockImplementation(() => now)
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  describe("bearer mode (a ready token as the credential)", () => {
    it("issues a GET with the bearer header and the query, and returns the parsed body", async () => {
      const fetchMock = install(answer(200, [{ ok: true }]))

      await expect(
        http(JWT_CREDENTIAL).getJson("station/horaire", { format: "json" }, "hourly"),
      ).resolves.toEqual([{ ok: true }])

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
      expect(url.toString()).toBe(`${BASE}/station/horaire?format=json`)
      expect(init.method).toBe("GET")
      expect(init.headers).toEqual({
        Accept: "application/json",
        Authorization: `Bearer ${JWT_CREDENTIAL}`,
      })
      expect(init.signal).toBeInstanceOf(AbortSignal)
    })

    it("tolerates a trailing slash on the base URL", async () => {
      const fetchMock = install(answer(200, []))
      const client = new MeteoFranceHttp({
        credential: JWT_CREDENTIAL,
        baseUrl: `${BASE}/`,
        timeoutMs: 1000,
      })
      await client.getJson("synop", { format: "json" }, "synop")
      expect((fetchMock.mock.calls[0] as [URL])[0].toString()).toBe(`${BASE}/synop?format=json`)
    })

    it("never asks for a token and does not retry a 401", async () => {
      const fetchMock = install(answer(401, "Invalid Credentials"))
      const message = await messageOf(http(JWT_CREDENTIAL).getJson("synop", {}, "synop"))
      expect(message).toBe("meteofrance synop returned HTTP 401")
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe("errors", () => {
    it.each([400, 403, 404, 429, 500, 503])(
      "rejects HTTP %i with the label and the status only",
      async (status) => {
        install(answer(status, `<html>Request Rejected ${JWT_CREDENTIAL} ${BASE}</html>`))
        const client = http(JWT_CREDENTIAL)
        let error: unknown
        try {
          await client.getJson("station/horaire", { id_station: "77186002" }, "hourly")
        } catch (caught) {
          error = caught
        }
        expect(error).toBeInstanceOf(MeteoFranceHttpError)
        expect((error as MeteoFranceHttpError).status).toBe(status)
        expect((error as Error).message).toBe(`meteofrance hourly returned HTTP ${status}`)
        expect((error as Error).name).toBe("MeteoFranceHttpError")
        expectNoSecret((error as Error).message)
      },
    )

    it("treats a firewall HTML page answered with 200 as a failure, never as data", async () => {
      install(answer(200, "<html><body>Request Rejected</body></html>"))
      const message = await messageOf(http(JWT_CREDENTIAL).getJson("station/horaire", {}, "hourly"))
      expect(message).toBe("meteofrance hourly returned an unreadable answer")
      expectNoSecret(message)
    })

    it("rejects a station list that is an HTML page too", async () => {
      install(answer(200, "  \n<!DOCTYPE html><html>Request Rejected</html>"))
      const message = await messageOf(
        http(JWT_CREDENTIAL).getText("liste-stations", {}, "stations"),
      )
      expect(message).toBe("meteofrance stations returned an unreadable answer")
    })

    it("returns the text of a CSV answer", async () => {
      install(answer(200, "Id_station;Nom_usuel\n77186002;FONTAINEBLEAU\n"))
      await expect(
        http(JWT_CREDENTIAL).getText("liste-stations", { format: "csv" }, "stations"),
      ).resolves.toBe("Id_station;Nom_usuel\n77186002;FONTAINEBLEAU\n")
    })

    it("hides a network error whose own message holds the URL and the credential", async () => {
      install(new Error(`connect ECONNREFUSED ${BASE} with ${JWT_CREDENTIAL}`))
      const client = http(JWT_CREDENTIAL)
      let error: unknown
      try {
        await client.getJson("synop", {}, "synop")
      } catch (caught) {
        error = caught
      }
      expect((error as MeteoFranceHttpError).status).toBe(0)
      expect((error as Error).message).toBe("meteofrance synop request failed")
      expectNoSecret((error as Error).message)
    })

    it("aborts a server that stalls after the headers, with status 0 and no URL", async () => {
      global.fetch = jest.fn((_url: URL, init?: RequestInit) =>
        Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => reject(init.signal?.reason))
            }),
        }),
      ) as unknown as typeof fetch

      let error: unknown
      try {
        await http(JWT_CREDENTIAL, 20).getJson("synop", {}, "synop")
      } catch (caught) {
        error = caught
      }
      expect(error).toBeInstanceOf(MeteoFranceHttpError)
      expect((error as MeteoFranceHttpError).status).toBe(0)
      expect((error as Error).message).toBe("meteofrance synop timed out")
      expectNoSecret((error as Error).message)
    })
  })

  describe("application-id mode (OAuth2 client credentials, D-27)", () => {
    it("exchanges the application id for a token, then calls with that token", async () => {
      const fetchMock = install(tokenAnswer(), answer(200, [{ n: 1 }]))

      await expect(
        http(APP_ID_CREDENTIAL).getJson("station/horaire", { format: "json" }, "hourly"),
      ).resolves.toEqual([{ n: 1 }])

      expect(fetchMock).toHaveBeenCalledTimes(2)
      const [tokenUrl, tokenInit] = fetchMock.mock.calls[0] as [string | URL, RequestInit]
      expect(String(tokenUrl)).toBe(METEOFRANCE_TOKEN_URL)
      expect(METEOFRANCE_TOKEN_URL).toBe("https://portail-api.meteofrance.fr/token")
      expect(tokenInit.method).toBe("POST")
      expect(tokenInit.headers).toEqual({
        Authorization: `Basic ${APP_ID_CREDENTIAL}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      })
      expect(tokenInit.body).toBe("grant_type=client_credentials")
      expect(tokenInit.signal).toBeInstanceOf(AbortSignal)

      const [, dataInit] = fetchMock.mock.calls[1] as [URL, RequestInit]
      expect(dataInit.headers).toEqual({
        Accept: "application/json",
        Authorization: `Bearer ${TOKEN}`,
      })
    })

    it("reuses the token until 60 seconds before its expiry, then renews it", async () => {
      const fetchMock = install(
        tokenAnswer(3600),
        answer(200, [1]),
        answer(200, [2]),
        tokenAnswer(3600),
        answer(200, [3]),
      )
      const client = http(APP_ID_CREDENTIAL)

      await client.getJson("synop", {}, "synop")
      now += 3600 * 1000 - 61_000
      await client.getJson("synop", {}, "synop")
      expect(fetchMock).toHaveBeenCalledTimes(3)

      now += 2000
      await client.getJson("synop", {}, "synop")
      expect(fetchMock).toHaveBeenCalledTimes(5)
      expect(String((fetchMock.mock.calls[3] as [string])[0])).toBe(METEOFRANCE_TOKEN_URL)
    })

    it("shares one token request between concurrent calls", async () => {
      const fetchMock = install(tokenAnswer(), answer(200, [1]), answer(200, [2]))
      const client = http(APP_ID_CREDENTIAL)

      await Promise.all([client.getJson("synop", {}, "a"), client.getJson("synop", {}, "b")])

      const tokenCalls = fetchMock.mock.calls.filter(
        (call) => String((call as [string])[0]) === METEOFRANCE_TOKEN_URL,
      )
      expect(tokenCalls).toHaveLength(1)
    })

    it("clears the token on a 401, fetches a new one and retries once", async () => {
      const fetchMock = install(
        tokenAnswer(),
        answer(401, "expired"),
        tokenAnswer(),
        answer(200, [9]),
      )

      await expect(http(APP_ID_CREDENTIAL).getJson("synop", {}, "synop")).resolves.toEqual([9])
      expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    it("rejects a second 401 without a third attempt", async () => {
      const fetchMock = install(
        tokenAnswer(),
        answer(401, "expired"),
        tokenAnswer(),
        answer(401, "still refused"),
      )

      const message = await messageOf(http(APP_ID_CREDENTIAL).getJson("synop", {}, "synop"))
      expect(message).toBe("meteofrance synop returned HTTP 401")
      expect(fetchMock).toHaveBeenCalledTimes(4)
      expectNoSecret(message)
    })

    it("rejects a refused application id with the token label and the status", async () => {
      install(answer(401, { error: "invalid_client" }))
      const message = await messageOf(http(APP_ID_CREDENTIAL).getJson("synop", {}, "synop"))
      expect(message).toBe("meteofrance token returned HTTP 401")
      expectNoSecret(message)
    })

    it("rejects a token answer without a usable token", async () => {
      install(answer(200, { token_type: "Bearer" }))
      const message = await messageOf(http(APP_ID_CREDENTIAL).getJson("synop", {}, "synop"))
      expect(message).toBe("meteofrance token returned an unreadable answer")
    })

    it("rejects a firewall page from the token endpoint", async () => {
      install(answer(200, "<html>Request Rejected</html>"))
      const message = await messageOf(http(APP_ID_CREDENTIAL).getJson("synop", {}, "synop"))
      expect(message).toBe("meteofrance token returned an unreadable answer")
    })

    it("uses a short default lifetime when the token answer gives none, and never caches a failure", async () => {
      const fetchMock = install(
        answer(200, { access_token: TOKEN }),
        answer(200, [1]),
        answer(500, "boom"),
        answer(200, [2]),
      )
      const client = http(APP_ID_CREDENTIAL)

      await client.getJson("synop", {}, "synop")
      await expect(client.getJson("synop", {}, "synop")).rejects.toBeInstanceOf(
        MeteoFranceHttpError,
      )
      await expect(client.getJson("synop", {}, "synop")).resolves.toEqual([2])
      expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    it("does not keep a failed token request: the next call asks again", async () => {
      const fetchMock = install(answer(503, "down"), tokenAnswer(), answer(200, [1]))
      const client = http(APP_ID_CREDENTIAL)

      await expect(client.getJson("synop", {}, "synop")).rejects.toBeInstanceOf(
        MeteoFranceHttpError,
      )
      await expect(client.getJson("synop", {}, "synop")).resolves.toEqual([1])
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })
  })
})
