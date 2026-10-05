jest.mock("react-native", () => ({}))

const mockOffline = { value: false }
jest.mock("./useIsOffline", () => ({ useIsOffline: () => mockOffline.value }))
const mockFlag = { value: true }
jest.mock("../app/feature-flags", () => ({ isOfflineMapsEnabled: () => mockFlag.value }))
const mockListOfflineAreas = jest.fn()
jest.mock("../storage/offline-map", () => ({
  listOfflineAreas: (...args: unknown[]) => mockListOfflineAreas(...args),
  tryGetOfflineDocumentDirectory: () => "file:///mock/documents/",
}))
const mockStyleExists = jest.fn()
jest.mock("../map/offline-styles", () => ({
  offlineStyleExists: (...args: unknown[]) => mockStyleExists(...args),
  offlineStyleUri: (dir: string, basemap: string) => `${dir}offline-styles/${basemap}.json`,
}))

import { cleanup, renderHook, waitFor } from "@testing-library/react-native/pure"
import { PLAN_IGN_STYLE_URL } from "../map/maplibre/styles"
import { useMapStyle } from "./useMapStyle"

beforeEach(() => {
  mockOffline.value = false
  mockFlag.value = true
  mockListOfflineAreas.mockResolvedValue([{ status: "ready" }])
  mockStyleExists.mockResolvedValue(true)
})
afterEach(async () => {
  await cleanup()
})

describe("useMapStyle", () => {
  test("online: the published remote style and the separate cadastre overlay", async () => {
    const { result } = await renderHook(() => useMapStyle("map"))
    expect(result.current).toEqual({ mapStyle: PLAN_IGN_STYLE_URL, cadastreInStyle: false })
  })

  test("offline with a ready area: the composite style file, cadastre inside", async () => {
    mockOffline.value = true
    const { result } = await renderHook(() => useMapStyle("satellite"))
    await waitFor(() => expect(result.current.cadastreInStyle).toBe(true))
    expect(result.current.mapStyle).toBe("file:///mock/documents/offline-styles/satellite.json")
  })

  test("offline without a ready area, or without the style file: stays on the remote style", async () => {
    mockOffline.value = true
    mockListOfflineAreas.mockResolvedValue([{ status: "failed" }])
    const first = await renderHook(() => useMapStyle("map"))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())
    expect(first.result.current.cadastreInStyle).toBe(false)

    mockListOfflineAreas.mockResolvedValue([{ status: "ready" }])
    mockStyleExists.mockResolvedValue(false)
    const second = await renderHook(() => useMapStyle("map"))
    await waitFor(() => expect(mockStyleExists).toHaveBeenCalled())
    expect(second.result.current.cadastreInStyle).toBe(false)
  })

  test("flag off: never reads the offline storage", async () => {
    mockOffline.value = true
    mockFlag.value = false
    mockListOfflineAreas.mockClear()
    const { result } = await renderHook(() => useMapStyle("map"))
    expect(result.current.cadastreInStyle).toBe(false)
    expect(mockListOfflineAreas).not.toHaveBeenCalled()
  })
})
