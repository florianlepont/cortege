import { onRequestOutcome, type RequestOutcome } from "../network/request-outcome"
import { apiRequest } from "./client"

type MockResponse = {
  ok: boolean
  status: number
  text: () => Promise<string>
}

describe("apiRequest", () => {
  const originalFetch = global.fetch
  const originalTimeout = process.env.EXPO_PUBLIC_API_TIMEOUT_MS

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.EXPO_PUBLIC_API_TIMEOUT_MS = originalTimeout
  })

  afterAll(() => {
    global.fetch = originalFetch
    process.env.EXPO_PUBLIC_API_TIMEOUT_MS = originalTimeout
  })

  it("normalizes the base URL, adds headers and returns parsed JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    } satisfies MockResponse) as typeof global.fetch

    const result = await apiRequest<{ ok: boolean }>({
      baseUrl: "https://api.example.com///",
      path: "/auth/login",
      method: "POST",
      token: "access-token",
      json: { email: "user@example.com" },
    })

    expect(result).toEqual({ ok: true })
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
          "X-Cortege-Features": "survey_route",
        },
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    )
  })

  it("sends the client marker of the route feature, without a token too (phase 30, P-2)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "{}",
    } satisfies MockResponse) as typeof global.fetch

    await apiRequest({ baseUrl: "https://api.example.com", path: "/health" })

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as { headers: Record<string, string> }
    expect(init.headers).toEqual({ "X-Cortege-Features": "survey_route" })
  })

  it("does not override a marker header passed by the caller", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "{}",
    } satisfies MockResponse) as typeof global.fetch

    await apiRequest({
      baseUrl: "https://api.example.com",
      path: "/health",
      headers: { "x-cortege-features": "other" },
    })

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as { headers: Record<string, string> }
    expect(init.headers).toEqual({ "x-cortege-features": "other" })
  })

  it("throws an ApiError with the parsed server message on HTTP errors", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ message: "Forbidden access" }),
    } satisfies MockResponse) as typeof global.fetch

    await expect(
      apiRequest({
        baseUrl: "https://api.example.com",
        path: "/me",
      }),
    ).rejects.toMatchObject({
      status: 403,
      message: "Forbidden access",
      body: { message: "Forbidden access" },
    })
  })

  it("returns undefined when JSON parsing is disabled", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => "",
    } satisfies MockResponse) as typeof global.fetch

    await expect(
      apiRequest({
        baseUrl: "https://api.example.com",
        path: "/auth/logout",
        method: "POST",
        expectJson: false,
      }),
    ).resolves.toBeUndefined()
  })

  it("maps abort errors to a timeout ApiError", async () => {
    global.fetch = jest.fn().mockRejectedValue({ name: "AbortError" }) as typeof global.fetch

    await expect(
      apiRequest({
        baseUrl: "https://api.example.com",
        path: "/slow",
        timeoutMs: 50,
      }),
    ).rejects.toMatchObject({
      status: 408,
      message: "Request timeout after 50ms",
      body: null,
    })
  })

  it("rejects with a timeout ApiError if the response body never resolves", async () => {
    jest.useFakeTimers()
    try {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => new Promise<string>(() => {}),
      } satisfies MockResponse) as typeof global.fetch

      const pending = apiRequest({
        baseUrl: "https://api.example.com",
        path: "/hangs",
        timeoutMs: 1000,
      })
      const assertion = expect(pending).rejects.toMatchObject({
        status: 408,
        message: "Request timeout after 1000ms",
        body: null,
      })

      await jest.advanceTimersByTimeAsync(1000)
      await assertion
    } finally {
      jest.useRealTimers()
    }
  })

  it("still parses a normal response and clears the timer on success", async () => {
    jest.useFakeTimers()
    try {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true }),
      } satisfies MockResponse) as typeof global.fetch

      const result = await apiRequest<{ ok: boolean }>({
        baseUrl: "https://api.example.com",
        path: "/fine",
        timeoutMs: 1000,
      })

      expect(result).toEqual({ ok: true })
      expect(jest.getTimerCount()).toBe(0)
    } finally {
      jest.useRealTimers()
    }
  })
  describe("request outcomes for the network status", () => {
    const outcomes: RequestOutcome[] = []
    let stop: () => void

    beforeEach(() => {
      outcomes.length = 0
      stop = onRequestOutcome((outcome) => outcomes.push(outcome))
    })

    afterEach(() => stop())

    const call = () => apiRequest({ baseUrl: "https://api.example.com", path: "/x" })

    it("reports ok for a 2xx and for an HTTP error status", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "{}",
      } satisfies MockResponse) as typeof global.fetch
      await call()
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "",
      } satisfies MockResponse) as typeof global.fetch
      await expect(call()).rejects.toMatchObject({ status: 500 })

      expect(outcomes).toEqual(["ok", "ok"])
    })

    it("reports a network failure when fetch itself throws", async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new TypeError("Network request failed")) as typeof global.fetch

      await expect(call()).rejects.toThrow("Network request failed")

      expect(outcomes).toEqual(["network-failure"])
    })

    it("reports a timeout, not a network failure, when the request is aborted", async () => {
      global.fetch = jest.fn().mockRejectedValue({ name: "AbortError" }) as typeof global.fetch

      await expect(call()).rejects.toMatchObject({ status: 408 })

      expect(outcomes).toEqual(["timeout"])
    })
  })
})
