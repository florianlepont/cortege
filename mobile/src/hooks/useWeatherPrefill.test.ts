/**
 * Tests for useWeatherPrefill (phase 27, D-10, D-11, D-20): the app-level weather lookup and
 * catch-up. Storage and the API client are mocked; the online flag is driven through the mocked
 * useIsOffline and the app foreground through the mocked AppState.
 */

type AppStateHandler = (state: string) => void
const mockAppStateHandlers = new Set<AppStateHandler>()

jest.mock("react-native", () => ({
  AppState: {
    addEventListener: (_type: string, handler: AppStateHandler) => {
      mockAppStateHandlers.add(handler)
      return { remove: () => mockAppStateHandlers.delete(handler) }
    },
  },
}))

let mockOffline = false
jest.mock("./useIsOffline", () => ({ useIsOffline: () => mockOffline }))

jest.mock("../storage/weather", () => ({
  listWeatherCandidates: jest.fn(),
  loadWeatherPoint: jest.fn(),
  saveWeatherPoint: jest.fn(),
}))

jest.mock("../storage/offline-map", () => ({
  getCachedParcelById: jest.fn(),
}))

jest.mock("../api/weather-api", () => ({
  fetchWeather: jest.fn(),
}))

import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native/pure"
import type { SurveyWeather, WeatherObservation } from "@cortege/ibp-domain"
import { fetchWeather } from "../api/weather-api"
import { mergeWeatherObservation } from "../app/weather"
import { getCachedParcelById } from "../storage/offline-map"
import type { LocalSurvey } from "../storage/types"
import {
  listWeatherCandidates,
  loadWeatherPoint,
  saveWeatherPoint,
  type WeatherCandidate,
} from "../storage/weather"
import { useWeatherPrefill, WEATHER_SETTLED_RETRY_MS } from "./useWeatherPrefill"

const mockList = listWeatherCandidates as jest.Mock
const mockLoadPoint = loadWeatherPoint as jest.Mock
const mockSavePoint = saveWeatherPoint as jest.Mock
const mockParcel = getCachedParcelById as jest.Mock
const mockFetch = fetchWeather as jest.Mock

const HOUR = 60 * 60 * 1000
const POINT = { lat: 48.85, lng: 2.35 }

const OBSERVATION: WeatherObservation = {
  sky: "clear",
  temperature_c: 14.2,
  wind_kmh: 11,
  rain_24h_mm: 0,
  observed_at: "2026-10-11T07:00:00.000Z",
  source: "meteo_france",
  station: { id: "75114001", name: "Paris-Montsouris", distance_km: 3.1 },
}

const hoursAgo = (hours: number): string => new Date(Date.now() - hours * HOUR).toISOString()

const candidate = (
  id: string,
  weather: SurveyWeather,
  parcelIds = ["P1"],
  createdAt = hoursAgo(100),
): WeatherCandidate => ({
  id,
  parcel_ids: parcelIds,
  weather,
  created_at: createdAt,
})

const localSurvey = (id: string, updatedAt = "2026-10-11T08:00:00.000Z"): LocalSurvey =>
  ({ id, status: "draft", updated_at: updatedAt }) as LocalSurvey

type Props = {
  surveys: LocalSurvey[]
  accessToken: string | null
}

describe("useWeatherPrefill", () => {
  let updateSurveyWeather: jest.Mock
  let stored: Record<string, SurveyWeather | null>

  const mount = async (initial: Partial<Props> = {}) => {
    const hook = await renderHook(
      (props: Props) =>
        useWeatherPrefill({
          apiUrl: "https://api.test/v1",
          accessToken: props.accessToken,
          surveys: props.surveys,
          updateSurveyWeather,
        }),
      { initialProps: { surveys: [localSurvey("S1")], accessToken: "tok", ...initial } },
    )
    return hook
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockAppStateHandlers.clear()
    mockOffline = false
    stored = {}
    updateSurveyWeather = jest.fn(
      async (
        id: string,
        update: (current: SurveyWeather | null) => SurveyWeather | null,
      ): Promise<boolean> => {
        stored[id] = update(stored[id] ?? null)
        return true
      },
    )
    mockList.mockResolvedValue([])
    mockLoadPoint.mockResolvedValue(POINT)
    mockSavePoint.mockResolvedValue(undefined)
    mockParcel.mockResolvedValue(null)
    mockFetch.mockResolvedValue({ observation: OBSERVATION })
  })

  afterEach(async () => {
    await cleanup()
  })

  test("online with a token, a draft is fetched once for its own time and merged", async () => {
    const requestedAt = hoursAgo(1)
    mockList.mockResolvedValue([candidate("S1", { requested_at: requestedAt })])
    stored.S1 = { requested_at: requestedAt }

    await mount()

    await waitFor(() => expect(updateSurveyWeather).toHaveBeenCalledTimes(1))
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith("https://api.test/v1", "tok", {
      lat: POINT.lat,
      lng: POINT.lng,
      at: requestedAt,
    })
    expect(stored.S1).toEqual(mergeWeatherObservation({ requested_at: requestedAt }, OBSERVATION))
  })

  test("a sky the observer set does not stop the lookup and is kept by the merge (D-37)", async () => {
    const requestedAt = hoursAgo(1)
    const observers: SurveyWeather = {
      requested_at: requestedAt,
      sky: null,
      edited: ["sky"],
      source: "manual",
    }
    mockList.mockResolvedValue([candidate("S1", observers)])
    stored.S1 = observers

    await mount()

    await waitFor(() => expect(updateSurveyWeather).toHaveBeenCalledTimes(1))
    expect(stored.S1?.sky).toBeNull()
    expect(stored.S1?.temperature_c).toBe(OBSERVATION.temperature_c)
    expect(stored.S1?.source).toBe("meteo_france")
  })

  test("inFlightIds holds the id while the request runs", async () => {
    mockList.mockResolvedValue([candidate("S1", { requested_at: hoursAgo(1) })])
    let release: (value: unknown) => void = () => undefined
    mockFetch.mockReturnValue(new Promise((resolve) => (release = resolve)))

    const { result } = await mount()

    await waitFor(() => expect(result.current.state.inFlightIds.has("S1")).toBe(true))
    await act(async () => {
      release({ observation: OBSERVATION })
    })
    await waitFor(() => expect(result.current.state.inFlightIds.has("S1")).toBe(false))
  })

  test("offline nothing is requested; when the network returns the same draft is fetched for requested_at", async () => {
    const requestedAt = hoursAgo(2)
    mockOffline = true
    mockList.mockResolvedValue([candidate("S1", { requested_at: requestedAt })])

    const { rerender, result } = await mount()
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.state.unavailableIds.size).toBe(0)

    mockOffline = false
    await rerender({ surveys: [localSurvey("S1")], accessToken: "tok" })

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(mockFetch.mock.calls[0][2]).toEqual({ lat: POINT.lat, lng: POINT.lng, at: requestedAt })
  })

  test("no request without an access token", async () => {
    mockList.mockResolvedValue([candidate("S1", { requested_at: hoursAgo(1) })])

    await mount({ accessToken: null })
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  test("never fetches a candidate older than 24 h or a provider-filled one", async () => {
    mockList.mockResolvedValue([
      candidate("OLD", { requested_at: hoursAgo(25) }),
      candidate("DONE", { requested_at: hoursAgo(1), source: "meteo_france" }),
    ])

    await mount({ surveys: [localSurvey("OLD"), localSurvey("DONE")] })
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  test("the candidate list is drafts only, so a submitted survey is never fetched", async () => {
    // The storage query keeps status = 'draft'; a submitted survey is not in the list.
    mockList.mockResolvedValue([])

    await mount({ surveys: [{ ...localSurvey("S1"), status: "submitted" } as LocalSurvey] })
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  test("falls back to the centre of the cached parcel geometry, and to nothing", async () => {
    mockList.mockResolvedValue([candidate("S1", { requested_at: hoursAgo(1) })])
    mockLoadPoint.mockResolvedValue(null)
    mockParcel.mockResolvedValue({
      parcel_id: "P1",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [2.0, 48.0],
            [2.2, 48.0],
            [2.2, 48.2],
            [2.0, 48.2],
            [2.0, 48.0],
          ],
        ],
      },
    })

    const { unmount } = await mount()

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    const sent = mockFetch.mock.calls[0][2] as { lat: number; lng: number }
    expect(sent.lat).toBeCloseTo(48.1, 5)
    expect(sent.lng).toBeCloseTo(2.1, 5)
    await unmount()

    mockFetch.mockClear()
    mockParcel.mockResolvedValue(null)
    const second = await mount()
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(second.result.current.state.unavailableIds.size).toBe(0)
  })

  // D-39: the owner's "Parcelle de la source" had parcels and the observer's sky, but no survey time
  // and no stored point, so nothing ever asked for its weather.
  describe("a draft with parcels that was never stamped (D-39 safety net)", () => {
    const OWNERS_SHAPE: SurveyWeather = { sky: "partly_cloudy", edited: ["sky"], source: "manual" }
    const GEOMETRY = {
      parcel_id: "P1",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [2.0, 48.0],
            [2.2, 48.0],
            [2.2, 48.2],
            [2.0, 48.2],
            [2.0, 48.0],
          ],
        ],
      },
    }

    test("is fetched for its creation time, at the centre of its cached parcels, and keeps both", async () => {
      const createdAt = hoursAgo(3)
      mockList.mockResolvedValue([candidate("S1", OWNERS_SHAPE, ["P1", "P2", "P3"], createdAt)])
      stored.S1 = OWNERS_SHAPE
      mockLoadPoint.mockResolvedValue(null)
      mockParcel.mockResolvedValue(GEOMETRY)

      await mount()

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
      const sent = mockFetch.mock.calls[0][2] as { lat: number; lng: number; at: string }
      expect(sent.at).toBe(createdAt)
      expect(sent.lat).toBeCloseTo(48.1, 5)
      expect(sent.lng).toBeCloseTo(2.1, 5)
      // The point is kept for the next pass and the survey time lands in the draft with the answer.
      expect(mockSavePoint).toHaveBeenCalledWith("S1", expect.objectContaining({ lat: 48.1 }))
      await waitFor(() => expect(updateSurveyWeather).toHaveBeenCalledTimes(1))
      expect(stored.S1).toEqual(
        mergeWeatherObservation({ ...OWNERS_SHAPE, requested_at: createdAt }, OBSERVATION),
      )
      expect(stored.S1?.sky).toBe("partly_cloudy")
    })

    test("uses the stored point when there is one and does not store it again", async () => {
      mockList.mockResolvedValue([candidate("S1", {}, ["P1"], hoursAgo(1))])

      await mount()

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
      expect(mockFetch.mock.calls[0][2]).toMatchObject({ lat: POINT.lat, lng: POINT.lng })
      expect(mockSavePoint).not.toHaveBeenCalled()
    })

    test("is left alone when created more than 24 h ago (never invents a time)", async () => {
      mockList.mockResolvedValue([candidate("S1", OWNERS_SHAPE, ["P1"], hoursAgo(26))])

      const { result } = await mount()
      await act(async () => {
        await Promise.resolve()
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result.current.state.unavailableIds.size).toBe(0)
    })

    test("is left alone when there is no point and no cached geometry", async () => {
      mockList.mockResolvedValue([candidate("S1", OWNERS_SHAPE, ["P1"], hoursAgo(1))])
      mockLoadPoint.mockResolvedValue(null)
      mockParcel.mockResolvedValue(null)

      await mount()
      await act(async () => {
        await Promise.resolve()
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(mockSavePoint).not.toHaveBeenCalled()
    })
  })

  test("a rejection marks the draft unavailable; retry fetches again at once and a success clears it", async () => {
    mockList.mockResolvedValue([candidate("S1", { requested_at: hoursAgo(1) })])
    mockFetch.mockRejectedValueOnce(new Error("503"))

    const { result } = await mount()
    await waitFor(() => expect(result.current.state.unavailableIds.has("S1")).toBe(true))
    expect(mockFetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.actions.retry("S1")
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result.current.state.unavailableIds.has("S1")).toBe(false)
    expect(updateSurveyWeather).toHaveBeenCalledTimes(1)
  })

  test("an unavailable draft is not asked again by a list change, but is on the next foreground", async () => {
    mockList.mockResolvedValue([candidate("S1", { requested_at: hoursAgo(1) })])
    mockFetch.mockRejectedValue(new Error("network"))

    const { result, rerender } = await mount()
    await waitFor(() => expect(result.current.state.unavailableIds.has("S1")).toBe(true))

    await rerender({
      surveys: [localSurvey("S1", "2026-10-11T09:00:00.000Z")],
      accessToken: "tok",
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)

    mockFetch.mockResolvedValue({ observation: OBSERVATION })
    await act(async () => {
      mockAppStateHandlers.forEach((handler) => handler("active"))
    })
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.state.unavailableIds.has("S1")).toBe(false))
  })

  test("a 200 without observation settles the draft for the retry window, even on a network change", async () => {
    mockList.mockResolvedValue([candidate("S1", { requested_at: hoursAgo(1) })])
    mockFetch.mockResolvedValue({ observation: null, reason: "no_data" })

    const { result } = await mount()
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.state.inFlightIds.size).toBe(0))
    expect(result.current.state.unavailableIds.size).toBe(0)
    expect(updateSurveyWeather).not.toHaveBeenCalled()

    await act(async () => {
      mockAppStateHandlers.forEach((handler) => handler("active"))
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(WEATHER_SETTLED_RETRY_MS).toBe(60 * 60 * 1000)

    // Once the window has passed, the next trigger asks again.
    const realNow = Date.now
    Date.now = () => realNow() + WEATHER_SETTLED_RETRY_MS + 1000
    try {
      await act(async () => {
        mockAppStateHandlers.forEach((handler) => handler("active"))
      })
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    } finally {
      Date.now = realNow
    }
  })

  test("rememberPoint saves the point and fetches at once when online", async () => {
    mockList.mockResolvedValue([])
    const { result } = await mount()
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockFetch).not.toHaveBeenCalled()

    mockList.mockResolvedValue([candidate("S1", { requested_at: hoursAgo(1) })])
    await act(async () => {
      await result.current.actions.rememberPoint("S1", { lat: 44.1, lng: 3.2 })
    })

    expect(mockSavePoint).toHaveBeenCalledWith("S1", { lat: 44.1, lng: 3.2 })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test("rememberPoint offline only saves the point", async () => {
    mockOffline = true
    mockList.mockResolvedValue([candidate("S1", { requested_at: hoursAgo(1) })])
    const { result } = await mount()

    await act(async () => {
      await result.current.actions.rememberPoint("S1", { lat: 44.1, lng: 3.2 })
    })

    expect(mockSavePoint).toHaveBeenCalledTimes(1)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test("requests run one at a time and a trigger during a run does not start a second run", async () => {
    mockList.mockResolvedValue([
      candidate("S1", { requested_at: hoursAgo(1) }),
      candidate("S2", { requested_at: hoursAgo(1) }),
    ])
    const releases: Array<(value: unknown) => void> = []
    mockFetch.mockImplementation(() => new Promise((resolve) => releases.push(resolve)))

    await mount({ surveys: [localSurvey("S1"), localSurvey("S2")] })
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

    // A trigger while the first request is in flight changes nothing yet.
    await act(async () => {
      mockAppStateHandlers.forEach((handler) => handler("active"))
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      releases[0]({ observation: null, reason: "no_data" })
    })
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    expect(mockFetch.mock.calls[1][2].at).toBeDefined()
    await act(async () => {
      releases[1]({ observation: null, reason: "no_data" })
    })
    await waitFor(() => expect(mockList).toHaveBeenCalled())
    // Both drafts are settled now: no further request.
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  test("a storage failure while listing candidates is silent", async () => {
    mockList.mockRejectedValue(new Error("db"))

    const { result } = await mount()
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.state.unavailableIds.size).toBe(0)
  })

  test("the actions keep their identity across renders", async () => {
    const { result, rerender } = await mount()
    const before = result.current.actions

    await rerender({
      surveys: [localSurvey("S1", "2026-10-11T10:00:00.000Z")],
      accessToken: "tok2",
    })

    expect(result.current.actions).toBe(before)
  })
})
