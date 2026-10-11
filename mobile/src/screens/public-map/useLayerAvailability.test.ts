jest.mock("react-native", () => ({}))
const mockListAreaLayers = jest.fn()
jest.mock("../../map/offline-packs", () => ({
  listAreaLayers: () => mockListAreaLayers(),
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import type { MapLayerKey } from "../../map/layers"
import type { OfflineAreaSummary } from "../../storage/offline-map"
import { useLayerAvailability } from "./useLayerAvailability"

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

const INSIDE = { lat: 48.4, lng: 2.7 }
const OUTSIDE = { lat: 45, lng: 5 }
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
      useLayerAvailability({ areas: [], center: INSIDE, isOffline: false }),
    )
    expect(availableKeys(result.current.isAvailable)).toEqual(ALL)
    expect(result.current.areaAtCenter).toBe(false)
  })

  test("offline, the packs of the ready area at the centre decide", async () => {
    const areas = [area("a1")]
    const { result } = await renderHook(() =>
      useLayerAvailability({ areas, center: INSIDE, isOffline: true }),
    )
    expect(result.current.areaAtCenter).toBe(true)
    expect(availableKeys(result.current.isAvailable)).toEqual(["map", "satellite", "carte-1950"])
  })

  test("offline with no area at the centre, only the Plan and the Satellite", async () => {
    const areas = [area("a1")]
    const { result } = await renderHook(() =>
      useLayerAvailability({ areas, center: OUTSIDE, isOffline: true }),
    )
    expect(result.current.areaAtCenter).toBe(false)
    expect(availableKeys(result.current.isAvailable)).toEqual(["map", "satellite"])
  })

  test("an area still downloading does not count", async () => {
    const areas = [area("a1", { status: "downloading" })]
    const { result } = await renderHook(() =>
      useLayerAvailability({ areas, center: INSIDE, isOffline: true }),
    )
    expect(result.current.areaAtCenter).toBe(false)
  })

  test("reloads the pack layers when the set of ready areas changes", async () => {
    const { result, rerender } = await renderHook(
      ({ areas }: { areas: OfflineAreaSummary[] }) =>
        useLayerAvailability({ areas, center: INSIDE, isOffline: true }),
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

  test("unreadable pack metadata leaves only the Plan and the Satellite", async () => {
    mockListAreaLayers.mockRejectedValue(new Error("native"))
    const areas = [area("a1")]
    const { result } = await renderHook(() =>
      useLayerAvailability({ areas, center: INSIDE, isOffline: true }),
    )
    expect(availableKeys(result.current.isAvailable)).toEqual(["map", "satellite"])
  })

  test("a late answer after unmount is ignored", async () => {
    let resolve!: (value: Map<string, Set<MapLayerKey>>) => void
    mockListAreaLayers.mockReturnValue(new Promise((r) => (resolve = r)))
    let rejectLater!: (error: Error) => void
    const { unmount } = await renderHook(() =>
      useLayerAvailability({ areas: [area("a1")], center: INSIDE, isOffline: true }),
    )
    await unmount()
    await act(async () => resolve(new Map()))
    mockListAreaLayers.mockReturnValue(
      new Promise((_r, reject) => (rejectLater = reject as (error: Error) => void)),
    )
    const second = await renderHook(() =>
      useLayerAvailability({ areas: [area("a9")], center: INSIDE, isOffline: true }),
    )
    await second.unmount()
    await act(async () => rejectLater(new Error("late")))
    expect(mockListAreaLayers).toHaveBeenCalledTimes(2)
  })
})
