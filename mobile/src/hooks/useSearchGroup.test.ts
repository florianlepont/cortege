/**
 * Tests for useSearchGroup: the per-group state machine of the global search (debounce, kept rows,
 * stale answers, offline and reconnection, error kinds, retry, immediate mode).
 */

jest.mock("react-native", () => ({}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { ApiError } from "../api/client"
import { SEARCH_DEBOUNCE_MS, useSearchGroup } from "./useSearchGroup"

const mockFetcher = jest.fn<Promise<string[]>, [string]>()

type Params = Parameters<typeof useSearchGroup<string[]>>[0]
const base: Params = { query: "", enabled: true, offline: false, fetcher: mockFetcher }

const withQuery = (query: string, rest: Partial<Params> = {}): Params => ({
  ...base,
  query,
  ...rest,
})

async function flush() {
  await act(async () => {
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 10)
    await Promise.resolve()
  })
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  let reject: (error: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  jest.useFakeTimers()
  mockFetcher.mockReset()
  jest.spyOn(console, "debug").mockImplementation(() => undefined)
})

afterEach(async () => {
  await cleanup()
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe("useSearchGroup", () => {
  it("is idle and never calls the fetcher when disabled", async () => {
    const { result } = await renderHook((params: Params) => useSearchGroup(params), {
      initialProps: withQuery("foret", { enabled: false }),
    })
    await flush()
    expect(mockFetcher).not.toHaveBeenCalled()
    expect(result.current).toMatchObject({ status: "idle", data: null, error: null })
  })

  it("reports offline without a request, and queries once when the connection returns", async () => {
    mockFetcher.mockResolvedValue(["a"])
    const { result, rerender } = await renderHook((params: Params) => useSearchGroup(params), {
      initialProps: withQuery("foret", { offline: true }),
    })
    await flush()
    expect(mockFetcher).not.toHaveBeenCalled()
    expect(result.current).toMatchObject({ status: "offline", data: null, error: null })

    await rerender(withQuery("foret"))
    await flush()
    expect(mockFetcher).toHaveBeenCalledTimes(1)
    expect(mockFetcher).toHaveBeenCalledWith("foret")
    expect(result.current).toMatchObject({ status: "ready", data: ["a"] })
  })

  it("waits for the pause: waiting at each keystroke, loading while pending, then ready", async () => {
    const pending = deferred<string[]>()
    mockFetcher.mockReturnValueOnce(pending.promise)
    const { result, rerender } = await renderHook((params: Params) => useSearchGroup(params), {
      initialProps: withQuery("fo"),
    })
    // The first call happens at once for a query present at mount.
    expect(mockFetcher).toHaveBeenCalledWith("fo")
    await act(async () => {
      pending.resolve(["fo"])
      await Promise.resolve()
    })
    mockFetcher.mockReset()

    const next = deferred<string[]>()
    mockFetcher.mockReturnValueOnce(next.promise)
    await rerender(withQuery("for"))
    expect(result.current.status).toBe("waiting")
    expect(result.current.data).toEqual(["fo"])
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 100)
    })
    await rerender(withQuery("fore"))
    expect(result.current.status).toBe("waiting")
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 100)
    })
    expect(mockFetcher).not.toHaveBeenCalled()
    await act(async () => {
      jest.advanceTimersByTime(110)
    })
    expect(mockFetcher).toHaveBeenCalledTimes(1)
    expect(mockFetcher).toHaveBeenCalledWith("fore")
    expect(result.current.status).toBe("loading")
    expect(result.current.data).toEqual(["fo"])

    await act(async () => {
      next.resolve(["fore"])
      await Promise.resolve()
    })
    expect(result.current).toMatchObject({ status: "ready", data: ["fore"], error: null })
  })

  it("ignores the answer of a request that a newer one replaced", async () => {
    const first = deferred<string[]>()
    mockFetcher.mockReturnValueOnce(first.promise)
    mockFetcher.mockResolvedValueOnce(["new"])
    const { result, rerender } = await renderHook((params: Params) => useSearchGroup(params), {
      initialProps: withQuery("chene"),
    })
    await rerender(withQuery("chenes"))
    await flush()
    expect(result.current.data).toEqual(["new"])

    await act(async () => {
      first.resolve(["stale"])
      await Promise.resolve()
    })
    expect(result.current).toMatchObject({ status: "ready", data: ["new"] })
  })

  it("ignores the failure of a request that a newer one replaced", async () => {
    const first = deferred<string[]>()
    mockFetcher.mockReturnValueOnce(first.promise)
    mockFetcher.mockResolvedValueOnce(["new"])
    const { result, rerender } = await renderHook((params: Params) => useSearchGroup(params), {
      initialProps: withQuery("chene"),
    })
    await rerender(withQuery("chenes"))
    await flush()

    await act(async () => {
      first.reject(new Error("late"))
      await Promise.resolve()
    })
    expect(result.current).toMatchObject({ status: "ready", data: ["new"], error: null })
  })

  it("maps HTTP 429 to rateLimited and any other failure to failed", async () => {
    mockFetcher.mockRejectedValueOnce(new ApiError(429, "Too many", null))
    const { result, rerender } = await renderHook((params: Params) => useSearchGroup(params), {
      initialProps: withQuery("foret"),
    })
    await flush()
    expect(result.current).toMatchObject({ status: "error", error: "rateLimited", data: null })

    mockFetcher.mockRejectedValueOnce(new ApiError(500, "Boom", null))
    await rerender(withQuery("forets"))
    await flush()
    expect(result.current).toMatchObject({ status: "error", error: "failed" })

    mockFetcher.mockRejectedValueOnce(new Error("network"))
    await rerender(withQuery("foretss"))
    await flush()
    expect(result.current).toMatchObject({ status: "error", error: "failed" })
  })

  it("retries at once with the same query and clears the error on success", async () => {
    mockFetcher.mockRejectedValueOnce(new Error("network"))
    const { result } = await renderHook((params: Params) => useSearchGroup(params), {
      initialProps: withQuery("foret"),
    })
    await flush()
    expect(result.current.status).toBe("error")

    mockFetcher.mockResolvedValueOnce(["ok"])
    await act(async () => {
      result.current.retry()
      await Promise.resolve()
    })
    expect(mockFetcher).toHaveBeenCalledTimes(2)
    expect(mockFetcher).toHaveBeenLastCalledWith("foret")
    expect(result.current).toMatchObject({ status: "ready", data: ["ok"], error: null })
  })

  it("requests a changed query at once in immediate mode", async () => {
    const pending = deferred<string[]>()
    mockFetcher.mockReturnValueOnce(pending.promise)
    const { result, rerender } = await renderHook((params: Params) => useSearchGroup(params), {
      initialProps: withQuery("", { immediate: true, enabled: false }),
    })
    await rerender(withQuery("fontainebleau", { immediate: true }))
    expect(mockFetcher).toHaveBeenCalledWith("fontainebleau")
    expect(result.current.status).toBe("loading")
    await act(async () => {
      pending.resolve(["x"])
      await Promise.resolve()
    })
    expect(result.current).toMatchObject({ status: "ready", data: ["x"] })
  })

  it("resets the rows when the group is disabled, so old rows never show for a new text", async () => {
    mockFetcher.mockResolvedValue(["a"])
    const { result, rerender } = await renderHook((params: Params) => useSearchGroup(params), {
      initialProps: withQuery("foret"),
    })
    await flush()
    expect(result.current.data).toEqual(["a"])

    await rerender(withQuery("f", { enabled: false }))
    expect(result.current).toMatchObject({ status: "idle", data: null })
    await rerender(withQuery("fo"))
    expect(result.current).toMatchObject({ status: "waiting", data: null })
  })
})
