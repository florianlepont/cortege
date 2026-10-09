import { fetchIgnJson } from "../src/surveys/ign-http"

describe("fetchIgnJson", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("sends a GET with a JSON accept header and a timeout signal, and parses the body", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: "world" }),
    })
    global.fetch = fetchMock as unknown as typeof fetch
    const url = new URL("https://example.test/search?q=a")

    await expect(fetchIgnJson(url, { timeoutMs: 1000, label: "geocoder" })).resolves.toEqual({
      hello: "world",
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(calledUrl).toBe(url)
    expect(init.method).toBe("GET")
    expect(init.headers).toEqual({ Accept: "application/json" })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("throws with the label and the status on a non-2xx answer", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    }) as unknown as typeof fetch

    await expect(
      fetchIgnJson(new URL("https://example.test/"), { timeoutMs: 1000, label: "geocoder" }),
    ).rejects.toThrow("geocoder returned HTTP 429")
  })

  it("aborts a server that stalls after the headers (the timeout covers the body)", async () => {
    global.fetch = jest.fn((_url: URL, init?: RequestInit) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason))
          }),
      }),
    ) as unknown as typeof fetch

    await expect(
      fetchIgnJson(new URL("https://example.test/"), { timeoutMs: 20, label: "geocoder" }),
    ).rejects.toMatchObject({ name: "TimeoutError" })
  })
})
