/**
 * Tests for useGlobalSearch: the own-survey match on every keystroke, the three network groups
 * with their gates (text length, parcel-looking text, offline, token), the best result and the
 * group order from the pure rules, and the busy and settled flags.
 */

jest.mock("react-native", () => ({}))

const mockCommunity = jest.fn()
const mockPlaces = jest.fn()
const mockParcels = jest.fn()
jest.mock("../api/ibp-api", () => ({
  searchCommunity: (...args: unknown[]) => mockCommunity(...args),
  searchPlaces: (...args: unknown[]) => mockPlaces(...args),
  searchParcels: (...args: unknown[]) => mockParcels(...args),
}))

let mockOffline = false
jest.mock("./useIsOffline", () => ({ useIsOffline: () => mockOffline }))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import type {
  CommunitySurveyItem,
  SearchMemberItem,
  SearchParcelItem,
  SearchPlaceItem,
} from "@cortege/ibp-domain"
import type { LocalSurvey } from "../storage/types"
import { useGlobalSearch } from "./useGlobalSearch"
import { SEARCH_DEBOUNCE_MS } from "./useSearchGroup"

const survey = (id: string, siteName: string): LocalSurvey => ({
  id,
  site_name: siteName,
  status: "draft",
  visibility: "private",
  sync_version: 1,
  sync_state: "synced",
  last_sync_error: null,
  last_sync_error_code: null,
  last_sync_error_at: null,
  sync_blocked: 0,
  created_at: "2026-09-01T10:00:00.000Z",
  updated_at: "2026-09-01T10:00:00.000Z",
  completion_rate: 0,
  factors_filled: 0,
})

const communitySurvey = (id: string): CommunitySurveyItem => ({
  survey_id: id,
  site_name: `Site ${id}`,
  author_name: "Camille",
  submitted_at: "2026-09-28T09:41:00.000Z",
  ibp_total: 34,
})

const member: SearchMemberItem = { author_name: "Marie Dupont", survey_count: 3 }

const place: SearchPlaceItem = {
  id: "p1",
  name: "Fontainebleau",
  kind: "municipality",
  context: "77300",
  lat: 48.4,
  lng: 2.7,
  score: 0.95,
}

const parcel: SearchParcelItem = {
  parcel_id: "77186000AB0123",
  commune_code: "77186",
  commune_name: "Fontainebleau",
  section: "AB",
  number: "0123",
  centroid: { lat: 48.4, lng: 2.7 },
  bbox: null,
  survey_count: 1,
}

const surveys = [survey("s1", "Forêt de Bercé"), survey("s2", "Prairie du Nord")]

type Params = Parameters<typeof useGlobalSearch>[0]
const base: Params = { query: "", surveys, apiUrl: "http://api.test/v1", accessToken: "token" }

async function flush() {
  await act(async () => {
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 10)
    await Promise.resolve()
  })
}

beforeEach(() => {
  jest.useFakeTimers()
  mockOffline = false
  mockCommunity.mockReset().mockResolvedValue({ members: [], surveys: [] })
  mockPlaces.mockReset().mockResolvedValue({ items: [] })
  mockParcels.mockReset().mockResolvedValue({ items: [] })
  jest.spyOn(console, "debug").mockImplementation(() => undefined)
})

afterEach(async () => {
  await cleanup()
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe("useGlobalSearch", () => {
  it("does nothing under two characters", async () => {
    const { result } = await renderHook((params: Params) => useGlobalSearch(params), {
      initialProps: { ...base, query: " f " },
    })
    await flush()
    expect(result.current).toMatchObject({
      normalized: "f",
      active: false,
      mine: [],
      best: null,
      busy: false,
      settled: true,
      resultCount: 0,
      parcelsShown: false,
    })
    expect(result.current.community.status).toBe("idle")
    expect(mockCommunity).not.toHaveBeenCalled()
    expect(mockPlaces).not.toHaveBeenCalled()
    expect(mockParcels).not.toHaveBeenCalled()
  })

  it("matches own surveys at once and requests community and places after the pause", async () => {
    const { result, rerender } = await renderHook((params: Params) => useGlobalSearch(params), {
      initialProps: base,
    })
    await rerender({ ...base, query: "Forêt" })
    expect(result.current.mine.map((item) => item.id)).toEqual(["s1"])
    expect(result.current.best).toMatchObject({ kind: "mine" })
    expect(result.current.busy).toBe(true)
    expect(result.current.settled).toBe(false)
    expect(mockCommunity).not.toHaveBeenCalled()

    await flush()
    expect(mockCommunity).toHaveBeenCalledWith("http://api.test/v1", "token", {
      q: "Forêt",
      limit: 50,
    })
    expect(mockPlaces).toHaveBeenCalledWith("http://api.test/v1", "token", {
      q: "Forêt",
      limit: 10,
    })
    expect(mockParcels).not.toHaveBeenCalled()
    expect(result.current.parcelsShown).toBe(false)
    expect(result.current.parcels.status).toBe("idle")
    expect(result.current.busy).toBe(false)
    expect(result.current.settled).toBe(true)
    expect(result.current.order).toEqual(["mine", "community", "places", "parcels"])
  })

  it("requests parcels for a parcel-looking query and puts them first", async () => {
    mockParcels.mockResolvedValue({ items: [parcel] })
    const { result } = await renderHook((params: Params) => useGlobalSearch(params), {
      initialProps: { ...base, query: "77186 AB 0123" },
    })
    await flush()
    expect(mockParcels).toHaveBeenCalledWith("http://api.test/v1", "token", {
      q: "77186 AB 0123",
    })
    expect(result.current.parcelsShown).toBe(true)
    expect(result.current.best).toMatchObject({ kind: "parcel", item: parcel })
    expect(result.current.order[0]).toBe("parcels")
    expect(result.current.resultCount).toBe(1)
  })

  it("promotes a matching member over a place, and counts every group", async () => {
    mockCommunity.mockResolvedValue({
      members: [member],
      surveys: [communitySurvey("c1"), communitySurvey("c2")],
    })
    mockPlaces.mockResolvedValue({ items: [place] })
    const { result } = await renderHook((params: Params) => useGlobalSearch(params), {
      initialProps: { ...base, query: "Marie" },
    })
    await flush()
    expect(result.current.best).toMatchObject({ kind: "member", item: member })
    expect(result.current.order[0]).toBe("mine")
    expect(result.current.resultCount).toBe(1 + 2 + 1)
  })

  it("does not call the geocoder under three characters, and the group resolves empty", async () => {
    const { result } = await renderHook((params: Params) => useGlobalSearch(params), {
      initialProps: { ...base, query: "ab" },
    })
    await flush()
    expect(mockPlaces).not.toHaveBeenCalled()
    expect(result.current.places).toMatchObject({ status: "ready", data: { items: [] } })
    expect(mockCommunity).toHaveBeenCalledTimes(1)
    expect(result.current.parcelsShown).toBe(false)
  })

  it("offline: no request, three offline groups, parcels shown, local results kept", async () => {
    mockOffline = true
    const { result } = await renderHook((params: Params) => useGlobalSearch(params), {
      initialProps: { ...base, query: "ab" },
    })
    await flush()
    expect(mockCommunity).not.toHaveBeenCalled()
    expect(mockPlaces).not.toHaveBeenCalled()
    expect(mockParcels).not.toHaveBeenCalled()
    expect(result.current.offline).toBe(true)
    expect(result.current.community.status).toBe("offline")
    expect(result.current.places.status).toBe("offline")
    expect(result.current.parcels.status).toBe("offline")
    expect(result.current.parcelsShown).toBe(true)
    expect(result.current.mine).toEqual([])
    expect(result.current.busy).toBe(false)
  })

  it("queries by itself with the current text when the connection returns", async () => {
    mockOffline = true
    const { result, rerender } = await renderHook((params: Params) => useGlobalSearch(params), {
      initialProps: { ...base, query: "Forêt" },
    })
    await flush()
    expect(result.current.mine.map((item) => item.id)).toEqual(["s1"])
    expect(mockCommunity).not.toHaveBeenCalled()

    mockOffline = false
    await rerender({ ...base, query: "Forêt" })
    await flush()
    expect(mockCommunity).toHaveBeenCalledTimes(1)
    expect(mockPlaces).toHaveBeenCalledTimes(1)
    expect(result.current.community.status).toBe("ready")
  })

  it("keeps the network groups idle without an access token", async () => {
    const { result } = await renderHook((params: Params) => useGlobalSearch(params), {
      initialProps: { ...base, query: "Forêt", accessToken: null },
    })
    await flush()
    expect(mockCommunity).not.toHaveBeenCalled()
    expect(result.current.community.status).toBe("idle")
    expect(result.current.places.status).toBe("idle")
    expect(result.current.parcels.status).toBe("idle")
    expect(result.current.mine).toHaveLength(1)
  })

  it("reports one group failing without touching the others, and retries only that group", async () => {
    mockPlaces.mockRejectedValueOnce(new Error("network"))
    const { result } = await renderHook((params: Params) => useGlobalSearch(params), {
      initialProps: { ...base, query: "Forêt" },
    })
    await flush()
    expect(result.current.places).toMatchObject({ status: "error", error: "failed" })
    expect(result.current.community.status).toBe("ready")

    mockPlaces.mockResolvedValueOnce({ items: [place] })
    await act(async () => {
      result.current.places.retry()
      await Promise.resolve()
    })
    expect(mockPlaces).toHaveBeenCalledTimes(2)
    expect(mockCommunity).toHaveBeenCalledTimes(1)
    expect(result.current.places.status).toBe("ready")
  })

  it("requests a changed text at once in immediate mode", async () => {
    const { rerender } = await renderHook((params: Params) => useGlobalSearch(params), {
      initialProps: { ...base, immediate: true },
    })
    await rerender({ ...base, immediate: true, query: "Fontainebleau" })
    expect(mockCommunity).toHaveBeenCalledWith("http://api.test/v1", "token", {
      q: "Fontainebleau",
      limit: 50,
    })
  })
})
