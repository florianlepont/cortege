jest.mock("react-native", () => ({}))

const mockOffline = { value: false }
jest.mock("./useIsOffline", () => ({ useIsOffline: () => mockOffline.value }))
const mockFlag = { value: true }
jest.mock("../app/feature-flags", () => ({ isOfflineMapsEnabled: () => mockFlag.value }))
const mockListOfflineAreas = jest.fn()
const mockDirectory = { value: "file:///mock/documents/" as string | null }
jest.mock("../storage/offline-map", () => ({
  listOfflineAreas: (...args: unknown[]) => mockListOfflineAreas(...args),
  tryGetOfflineDocumentDirectory: () => mockDirectory.value,
}))
const mockStyleExists = jest.fn()
const mockDisplayExists = jest.fn()
jest.mock("../map/offline-styles", () => ({
  offlineStyleExists: (...args: unknown[]) => mockStyleExists(...args),
  offlineDisplayStyleExists: (...args: unknown[]) => mockDisplayExists(...args),
  offlineStyleUri: (dir: string, layer: string, dark = false) =>
    `${dir}offline-styles/${layer}${dark ? "-dark" : ""}.json`,
  offlineDisplayStyleUri: (dir: string, dark: boolean) =>
    `${dir}offline-styles/map-display${dark ? "-dark" : ""}.json`,
}))
const mockScheme = { value: "light" }
jest.mock("../app/theme", () => ({
  useBrandTheme: () => ({
    scheme: mockScheme.value,
    visual: { mapRaster: { dimBrightnessMax: mockScheme.value === "dark" ? 0.8 : 1 } },
  }),
}))
const mockFetchDark = jest.fn()
jest.mock("../map/maplibre/plan-ign-style", () => ({
  fetchDarkPlanIgnStyle: (...args: unknown[]) => mockFetchDark(...args),
}))

import type { StyleSpecification } from "@maplibre/maplibre-react-native"
import { cleanup, renderHook, waitFor } from "@testing-library/react-native/pure"
import { rasterStyleFor } from "../map/layer-styles"
import { ORTHO_STYLE, PLAN_IGN_STYLE_URL } from "../map/maplibre/styles"
import { useMapStyle } from "./useMapStyle"

const DIR = "file:///mock/documents/"

beforeEach(() => {
  mockScheme.value = "light"
  mockFetchDark.mockReset()
  mockOffline.value = false
  mockFlag.value = true
  mockDirectory.value = DIR
  mockListOfflineAreas.mockReset()
  mockListOfflineAreas.mockResolvedValue([{ status: "ready" }])
  mockStyleExists.mockReset()
  mockStyleExists.mockResolvedValue(true)
  mockDisplayExists.mockReset()
  mockDisplayExists.mockResolvedValue(true)
})
afterEach(async () => {
  await cleanup()
})

function brightness(style: string | StyleSpecification) {
  const layers = (style as StyleSpecification).layers
  return (layers[0] as { paint?: Record<string, number> }).paint?.["raster-brightness-max"]
}

describe("useMapStyle, online", () => {
  test("the Plan: the published remote style, the cadastre drawn as a child layer", async () => {
    const { result } = await renderHook(() => useMapStyle("map"))
    expect(result.current).toEqual({
      mapStyle: PLAN_IGN_STYLE_URL,
      cadastreInStyle: false,
      cadastreOpacity: 0.9,
    })
  })

  test("the Etat-major map: its raster style, cadastre opacity 0.7, no dimming in light", async () => {
    const { result } = await renderHook(() => useMapStyle("etat-major"))
    expect(result.current.mapStyle).toEqual(
      rasterStyleFor("etat-major", { offline: false, brightnessMax: 1 }),
    )
    expect(result.current.cadastreOpacity).toBe(0.7)
    expect(result.current.cadastreInStyle).toBe(false)
    expect(brightness(result.current.mapStyle)).toBeUndefined()
  })

  test("the satellite is the orthophoto style with cadastre opacity 0.9", async () => {
    const { result } = await renderHook(() => useMapStyle("satellite"))
    expect(result.current.mapStyle).toEqual(ORTHO_STYLE)
    expect(result.current.cadastreOpacity).toBe(0.9)
    expect(result.current.cadastreInStyle).toBe(false)
  })

  test("the carte de 1950 has cadastre opacity 0.7 and the photographs 0.9", async () => {
    const carte = await renderHook(() => useMapStyle("carte-1950"))
    expect(carte.result.current.cadastreOpacity).toBe(0.7)
    const photos = await renderHook(() => useMapStyle("photos-1950"))
    expect(photos.result.current.cadastreOpacity).toBe(0.9)
    expect(photos.result.current.mapStyle).toEqual(
      rasterStyleFor("photos-1950", { offline: false, brightnessMax: 1 }),
    )
  })

  test("the same style object is kept between renders", async () => {
    const { result, rerender } = await renderHook(() => useMapStyle("carte-1950"))
    const first = result.current.mapStyle
    await rerender({})
    expect(result.current.mapStyle).toBe(first)
  })
})

describe("useMapStyle, dark scheme", () => {
  beforeEach(() => {
    mockScheme.value = "dark"
  })

  test("the Plan: the recoloured style once it is ready", async () => {
    const darkStyle = { version: 8, sources: {}, layers: [] }
    mockFetchDark.mockResolvedValue(darkStyle)
    const { result } = await renderHook(() => useMapStyle("map"))
    await waitFor(() => expect(result.current.mapStyle).toBe(darkStyle))
    expect(result.current.cadastreInStyle).toBe(false)
  })

  test("the Plan, recolouring failed: the published style stays", async () => {
    mockFetchDark.mockRejectedValue(new Error("offline"))
    const { result } = await renderHook(() => useMapStyle("map"))
    await waitFor(() => expect(mockFetchDark).toHaveBeenCalled())
    expect(result.current.mapStyle).toBe(PLAN_IGN_STYLE_URL)
  })

  test("the two old maps are dimmed to 0.8, the photographs and the satellite are not", async () => {
    const etat = await renderHook(() => useMapStyle("etat-major"))
    expect(brightness(etat.result.current.mapStyle)).toBe(0.8)
    const carte = await renderHook(() => useMapStyle("carte-1950"))
    expect(brightness(carte.result.current.mapStyle)).toBe(0.8)
    const photos = await renderHook(() => useMapStyle("photos-1950"))
    expect(brightness(photos.result.current.mapStyle)).toBeUndefined()
    const satellite = await renderHook(() => useMapStyle("satellite"))
    expect(brightness(satellite.result.current.mapStyle)).toBeUndefined()
    expect(mockFetchDark).not.toHaveBeenCalled()
  })

  test("offline: the dark display file of the Plan, the cadastre left to the child layer", async () => {
    mockOffline.value = true
    const { result } = await renderHook(() => useMapStyle("map"))
    await waitFor(() =>
      expect(result.current.mapStyle).toBe(`${DIR}offline-styles/map-display-dark.json`),
    )
    expect(result.current.cadastreInStyle).toBe(false)
  })

  test("offline, no dark display file (older area): the dark pack file, cadastre inside", async () => {
    mockOffline.value = true
    mockDisplayExists.mockResolvedValue(false)
    const { result } = await renderHook(() => useMapStyle("map"))
    await waitFor(() => expect(result.current.cadastreInStyle).toBe(true))
    expect(result.current.mapStyle).toBe(`${DIR}offline-styles/map-dark.json`)
  })

  test("offline, only the light pack file (older area): it is used, cadastre inside", async () => {
    mockOffline.value = true
    mockDisplayExists.mockResolvedValue(false)
    mockStyleExists.mockImplementation(
      async (_dir: string, _layer: string, dark?: boolean) => !dark,
    )
    const { result } = await renderHook(() => useMapStyle("map"))
    await waitFor(() => expect(result.current.cadastreInStyle).toBe(true))
    expect(result.current.mapStyle).toBe(`${DIR}offline-styles/map.json`)
  })
})

describe("useMapStyle, offline with a ready area", () => {
  beforeEach(() => {
    mockOffline.value = true
  })

  test("the Plan: the light display file, cadastre left to the child layer", async () => {
    const { result } = await renderHook(() => useMapStyle("map"))
    await waitFor(() =>
      expect(result.current.mapStyle).toBe(`${DIR}offline-styles/map-display.json`),
    )
    expect(result.current.cadastreInStyle).toBe(false)
    expect(result.current.cadastreOpacity).toBe(0.9)
  })

  test("the Plan, display file missing (area downloaded before the phase): the pack file", async () => {
    mockDisplayExists.mockResolvedValue(false)
    const { result } = await renderHook(() => useMapStyle("map"))
    await waitFor(() => expect(result.current.cadastreInStyle).toBe(true))
    expect(result.current.mapStyle).toBe(`${DIR}offline-styles/map.json`)
  })

  test("the Plan, no file at all: the remote style", async () => {
    mockDisplayExists.mockResolvedValue(false)
    mockStyleExists.mockResolvedValue(false)
    const { result } = await renderHook(() => useMapStyle("map"))
    await waitFor(() => expect(mockStyleExists).toHaveBeenCalled())
    expect(result.current.mapStyle).toBe(PLAN_IGN_STYLE_URL)
    expect(result.current.cadastreInStyle).toBe(false)
  })

  test("the photographs: an inline style capped at zoom 17, no cadastre inside", async () => {
    const { result } = await renderHook(() => useMapStyle("photos-1950"))
    await waitFor(() =>
      expect(result.current.mapStyle).toEqual(
        rasterStyleFor("photos-1950", { offline: true, brightnessMax: 1 }),
      ),
    )
    const style = result.current.mapStyle as StyleSpecification
    expect((style.sources["photos-1950"] as { maxzoom: number }).maxzoom).toBe(17)
    expect(result.current.cadastreInStyle).toBe(false)
  })

  test("the satellite: an inline style, no cadastre inside (the child layer draws it)", async () => {
    const { result } = await renderHook(() => useMapStyle("satellite"))
    await waitFor(() =>
      expect(result.current.mapStyle).toEqual(rasterStyleFor("satellite", { offline: true })),
    )
    expect(result.current.cadastreInStyle).toBe(false)
    expect(mockStyleExists).not.toHaveBeenCalled()
  })

  test("no ready area: the online choice", async () => {
    mockListOfflineAreas.mockResolvedValue([{ status: "failed" }])
    const plan = await renderHook(() => useMapStyle("map"))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())
    expect(plan.result.current.mapStyle).toBe(PLAN_IGN_STYLE_URL)
    const raster = await renderHook(() => useMapStyle("etat-major"))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalledTimes(2))
    expect(raster.result.current.mapStyle).toEqual(
      rasterStyleFor("etat-major", { offline: false, brightnessMax: 1 }),
    )
  })

  test("flag off, or no document directory: never reads the offline storage", async () => {
    mockFlag.value = false
    const first = await renderHook(() => useMapStyle("map"))
    expect(first.result.current.mapStyle).toBe(PLAN_IGN_STYLE_URL)
    expect(mockListOfflineAreas).not.toHaveBeenCalled()

    mockFlag.value = true
    mockDirectory.value = null
    const second = await renderHook(() => useMapStyle("satellite"))
    expect(second.result.current.mapStyle).toEqual(ORTHO_STYLE)
    expect(mockListOfflineAreas).not.toHaveBeenCalled()
  })

  test("a changed refresh key re-checks the offline storage", async () => {
    const { rerender } = await renderHook(
      (props: { refresh: number }) => useMapStyle("map", props.refresh),
      { initialProps: { refresh: 0 } },
    )
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalledTimes(1))
    await rerender({ refresh: 1 })
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalledTimes(2))
  })

  test("going back online leaves the offline choice", async () => {
    const { result, rerender } = await renderHook(() => useMapStyle("satellite"))
    await waitFor(() =>
      expect(result.current.mapStyle).toEqual(rasterStyleFor("satellite", { offline: true })),
    )
    mockOffline.value = false
    await rerender({})
    await waitFor(() => expect(result.current.mapStyle).toEqual(ORTHO_STYLE))
  })
})

describe("useMapStyle, retry", () => {
  test("the Plan URL carries the retry number", async () => {
    const { result } = await renderHook(() => useMapStyle("map", 0, 2))
    expect(result.current.mapStyle).toBe(`${PLAN_IGN_STYLE_URL}?retry=2`)
  })

  test("a raster style is a new object after a retry", async () => {
    const { result, rerender } = await renderHook(
      (props: { retry: number }) => useMapStyle("satellite", 0, props.retry),
      { initialProps: { retry: 0 } },
    )
    const first = result.current.mapStyle
    await rerender({ retry: 1 })
    expect(result.current.mapStyle).not.toBe(first)
    expect(result.current.mapStyle).toEqual(first)
  })

  test("the dark Plan is fetched again after a retry", async () => {
    mockScheme.value = "dark"
    mockFetchDark.mockResolvedValue({ version: 8, sources: {}, layers: [] })
    const { rerender } = await renderHook(
      (props: { retry: number }) => useMapStyle("map", 0, props.retry),
      { initialProps: { retry: 0 } },
    )
    await waitFor(() => expect(mockFetchDark).toHaveBeenCalledTimes(1))
    await rerender({ retry: 1 })
    await waitFor(() => expect(mockFetchDark).toHaveBeenCalledTimes(2))
  })
})
