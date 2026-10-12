jest.mock("react-native", () => ({}))
const mockListAreaLayers = jest.fn()
jest.mock("../../map/offline-packs", () => ({
  listAreaLayers: () => mockListAreaLayers(),
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import type { MapLayerKey } from "../../map/layers"
import type { OfflineAreaSummary } from "../../storage/offline-map"
import { VIEW_AVAILABILITY_DEBOUNCE_MS, useLayerAvailability } from "./useLayerAvailability"

const area = (id: string, overrides: Partial<OfflineAreaSummary> = {}): OfflineAreaSummary => ({
  id,
  name: id,
  bounds: { minLat: 48, minLng: 2, maxLat: 49, maxLng: 3 },
  minZoom: 13,
  maxZoom: 17,
  status: "ready",
  totalTiles: 10,
  downloadedTiles: 10,
  failedTiles: 0,
  estimatedBytes: 1,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
})

const INSIDE = { latitude: 48.4, longitude: 2.7, latitudeDelta: 0.1, longitudeDelta: 0.1 }
const OUTSIDE = { latitude: 45, longitude: 5, latitudeDelta: 0.1, longitudeDelta: 0.1 }
const ALL: MapLayerKey[] = [
  "map",
  "satellite",
  "etat-major",
  "carte-1950",
  "photos-1950",
  "types-foret",
]

beforeEach(() => {
  mockListAreaLayers.mockReset()
  mockListAreaLayers.mockResolvedValue(
    new Map<string, Set<MapLayerKey>>([
      ["a1", new Set<MapLayerKey>(["map", "satellite", "carte-1950"])],
    ]),
  )
})

afterEach(async () => {
  await cleanup()
})

const availableKeys = (isAvailable: (key: MapLayerKey) => boolean) =>
  ALL.filter((key) => isAvailable(key))

describe("useLayerAvailability", () => {
  test("online everything is available", async () => {
    const { result } = await renderHook(() =>
      useLayerAvailability({ areas: [], region: INSIDE, isOffline: false }),
    )
    expect(availableKeys(result.current.isAvailable)).toEqual(ALL)
    expect(result.current.areaAtView).toBe(false)
  })

  test("offline, the packs of the ready area around the view decide", async () => {
    const areas = [area("a1")]
    const { result } = await renderHook(() =>
      useLayerAvailability({ areas, region: INSIDE, isOffline: true }),
    )
    expect(result.current.areaAtView).toBe(true)
    expect(availableKeys(result.current.isAvailable)).toEqual(["map", "satellite", "carte-1950"])
  })

  test("offline with no area around the view, nothing is available", async () => {
    const areas = [area("a1")]
    const { result } = await renderHook(() =>
      useLayerAvailability({ areas, region: OUTSIDE, isOffline: true }),
    )
    expect(result.current.areaAtView).toBe(false)
    expect(availableKeys(result.current.isAvailable)).toEqual([])
  })

  test("an area still downloading does not count", async () => {
    const areas = [area("a1", { status: "downloading" })]
    const { result } = await renderHook(() =>
      useLayerAvailability({ areas, region: INSIDE, isOffline: true }),
    )
    expect(result.current.areaAtView).toBe(false)
  })

  test("reloads the pack layers when the set of ready areas changes", async () => {
    const { result, rerender } = await renderHook(
      ({ areas }: { areas: OfflineAreaSummary[] }) =>
        useLayerAvailability({ areas, region: INSIDE, isOffline: true }),
      { initialProps: { areas: [area("a1")] } },
    )
    expect(mockListAreaLayers).toHaveBeenCalledTimes(1)
    // Same ids in a new array: no reload.
    await rerender({ areas: [area("a1")] })
    expect(mockListAreaLayers).toHaveBeenCalledTimes(1)
    mockListAreaLayers.mockResolvedValue(
      new Map<string, Set<MapLayerKey>>([["a2", new Set<MapLayerKey>(["etat-major"])]]),
    )
    await rerender({ areas: [area("a2")] })
    expect(mockListAreaLayers).toHaveBeenCalledTimes(2)
    expect(result.current.isAvailable("etat-major")).toBe(true)
    expect(result.current.isAvailable("carte-1950")).toBe(false)
  })

  test("unreadable pack metadata leaves nothing available", async () => {
    mockListAreaLayers.mockRejectedValue(new Error("native"))
    const areas = [area("a1")]
    const { result } = await renderHook(() =>
      useLayerAvailability({ areas, region: INSIDE, isOffline: true }),
    )
    expect(availableKeys(result.current.isAvailable)).toEqual([])
  })

  test("follows the settled view only: a pan out of the area changes it after the debounce", async () => {
    jest.useFakeTimers()
    try {
      const areas = [area("a1")]
      const { result, rerender } = await renderHook(
        ({ view }: { view: typeof INSIDE }) =>
          useLayerAvailability({ areas, region: view, isOffline: true }),
        { initialProps: { view: INSIDE } },
      )
      await act(async () => undefined)
      expect(result.current.isAvailable("map")).toBe(true)
      await rerender({ view: OUTSIDE })
      expect(result.current.isAvailable("map")).toBe(true)
      await act(async () => {
        jest.advanceTimersByTime(VIEW_AVAILABILITY_DEBOUNCE_MS)
      })
      expect(result.current.isAvailable("map")).toBe(false)
      expect(result.current.areaAtView).toBe(false)
    } finally {
      jest.useRealTimers()
    }
  })

  test("a late answer after unmount is ignored", async () => {
    let resolve!: (value: Map<string, Set<MapLayerKey>>) => void
    mockListAreaLayers.mockReturnValue(new Promise((r) => (resolve = r)))
    let rejectLater!: (error: Error) => void
    const { unmount } = await renderHook(() =>
      useLayerAvailability({ areas: [area("a1")], region: INSIDE, isOffline: true }),
    )
    await unmount()
    await act(async () => resolve(new Map()))
    mockListAreaLayers.mockReturnValue(
      new Promise((_r, reject) => (rejectLater = reject as (error: Error) => void)),
    )
    const second = await renderHook(() =>
      useLayerAvailability({ areas: [area("a9")], region: INSIDE, isOffline: true }),
    )
    await second.unmount()
    await act(async () => rejectLater(new Error("late")))
    expect(mockListAreaLayers).toHaveBeenCalledTimes(2)
  })
})
