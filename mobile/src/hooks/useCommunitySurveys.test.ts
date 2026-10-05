/**
 * Tests for useCommunitySurveys: it queries only for the community scope and once the typing
 * pauses, keeps the previous results while loading, and ignores an answer a newer search replaced.
 */

jest.mock("react-native", () => ({}))

const mockSearch = jest.fn()
jest.mock("../api/ibp-api", () => ({
  searchCommunitySurveys: (...args: unknown[]) => mockSearch(...args),
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import type { CommunitySurveyItem } from "@cortege/ibp-domain"
import { COMMUNITY_SEARCH_DELAY_MS, useCommunitySurveys } from "./useCommunitySurveys"

const item = (id: string): CommunitySurveyItem => ({
  survey_id: id,
  site_name: `Site ${id}`,
  author_name: "Camille",
  submitted_at: "2026-09-28T09:41:00.000Z",
  ibp_total: 34,
})

type Params = Parameters<typeof useCommunitySurveys>[0]
const base: Params = { apiUrl: "http://api.test/v1", accessToken: "token", query: "", active: true }

async function flush() {
  await act(async () => {
    jest.advanceTimersByTime(COMMUNITY_SEARCH_DELAY_MS + 10)
    await Promise.resolve()
  })
}

beforeEach(() => {
  jest.useFakeTimers()
  mockSearch.mockReset()
  jest.spyOn(console, "log").mockImplementation(() => undefined)
})

afterEach(async () => {
  await cleanup()
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe("useCommunitySurveys", () => {
  it("does not query outside the community scope or without a token", async () => {
    const { result, rerender } = await renderHook((params: Params) => useCommunitySurveys(params), {
      initialProps: { ...base, active: false },
    })
    await flush()
    expect(mockSearch).not.toHaveBeenCalled()
    expect(result.current).toEqual({ items: [], status: "idle" })

    await rerender({ ...base, accessToken: null })
    await flush()
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it("loads the results for the trimmed text", async () => {
    mockSearch.mockResolvedValue({ items: [item("a")] })
    const { result } = await renderHook((params: Params) => useCommunitySurveys(params), {
      initialProps: { ...base, query: "  forêt " },
    })
    await flush()
    expect(mockSearch).toHaveBeenCalledWith("http://api.test/v1", "token", { q: "forêt" })
    expect(result.current).toEqual({ items: [item("a")], status: "ready" })
  })

  it("keeps the previous results while the next search loads, and reports a failure", async () => {
    mockSearch.mockResolvedValueOnce({ items: [item("a")] })
    const { result, rerender } = await renderHook((params: Params) => useCommunitySurveys(params), {
      initialProps: base,
    })
    await flush()
    expect(result.current.status).toBe("ready")

    let rejectSearch: (error: Error) => void = () => undefined
    mockSearch.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectSearch = reject
        }),
    )
    await rerender({ ...base, query: "bois" })
    await act(async () => {
      jest.advanceTimersByTime(COMMUNITY_SEARCH_DELAY_MS + 10)
    })
    expect(result.current).toEqual({ items: [item("a")], status: "loading" })

    await act(async () => {
      rejectSearch(new Error("offline"))
      await Promise.resolve()
    })
    expect(result.current).toEqual({ items: [item("a")], status: "error" })
  })

  it("ignores the answer of a search that a newer one replaced", async () => {
    let resolveFirst: (value: { items: CommunitySurveyItem[] }) => void = () => undefined
    mockSearch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
    )
    mockSearch.mockResolvedValueOnce({ items: [item("new")] })
    const { result, rerender } = await renderHook((params: Params) => useCommunitySurveys(params), {
      initialProps: base,
    })
    await act(async () => {
      jest.advanceTimersByTime(COMMUNITY_SEARCH_DELAY_MS + 10)
    })
    await rerender({ ...base, query: "chêne" })
    await flush()
    expect(result.current.items).toEqual([item("new")])

    await act(async () => {
      resolveFirst({ items: [item("stale")] })
      await Promise.resolve()
    })
    expect(result.current.items).toEqual([item("new")])
  })

  it("ignores a failure of a search that a newer one replaced", async () => {
    let rejectFirst: (error: Error) => void = () => undefined
    mockSearch.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirst = reject
        }),
    )
    mockSearch.mockResolvedValueOnce({ items: [item("new")] })
    const { result, rerender } = await renderHook((params: Params) => useCommunitySurveys(params), {
      initialProps: base,
    })
    await act(async () => {
      jest.advanceTimersByTime(COMMUNITY_SEARCH_DELAY_MS + 10)
    })
    await rerender({ ...base, query: "chêne" })
    await flush()
    await act(async () => {
      rejectFirst(new Error("late"))
      await Promise.resolve()
    })
    expect(result.current).toEqual({ items: [item("new")], status: "ready" })
  })
})
