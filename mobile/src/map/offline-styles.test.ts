import * as FileSystem from "expo-file-system/legacy"
import { __getMockFile, __resetMockFileSystem } from "../../test/expo-file-system-legacy.mock"
import {
  CADASTRE_SOURCE_ID,
  offlineDisplayStyleExists,
  offlineDisplayStyleUri,
  offlineStyleExists,
  offlineStyleUri,
  withCadastre,
  writeOfflineStyle,
} from "./offline-styles"
import { rasterStyleFor } from "./layer-styles"
import { CADASTRE_TILES, ORTHO_STYLE } from "./maplibre/styles"

const DOCS = "file:///mock/documents/"

beforeEach(() => {
  __resetMockFileSystem()
  ;(FileSystem.writeAsStringAsync as jest.Mock).mockClear()
})

function written(): Map<string, string> {
  return new Map(
    (FileSystem.writeAsStringAsync as jest.Mock).mock.calls.map(
      ([target, content]: [string, string]) => [target, content],
    ),
  )
}

type SourceLike = { maxzoom: number }

function parse(uri: string): { sources: Record<string, SourceLike>; layers: { id: string }[] } {
  return JSON.parse(written().get(uri) as string)
}

describe("withCadastre", () => {
  test("adds the cadastre raster source and layer on top, keeping the base style intact", () => {
    const style = withCadastre(ORTHO_STYLE)
    expect(Object.keys(style.sources)).toEqual(["ortho", CADASTRE_SOURCE_ID])
    expect(style.layers.map((layer) => layer.id)).toEqual(["ortho", CADASTRE_SOURCE_ID])
    expect(style.sources[CADASTRE_SOURCE_ID]).toMatchObject({
      type: "raster",
      tiles: [CADASTRE_TILES],
      tileSize: 256,
      minzoom: 15,
      maxzoom: 20,
    })
    expect(style.layers[1]).toMatchObject({ paint: { "raster-opacity": 0.9 } })
    expect(ORTHO_STYLE.layers).toHaveLength(1)
    expect(Object.keys(ORTHO_STYLE.sources)).toEqual(["ortho"])
  })

  test("takes the line opacity of the layer (0.7 on the old maps)", () => {
    const style = withCadastre(ORTHO_STYLE, 0.7)
    expect(style.layers[1]).toMatchObject({ paint: { "raster-opacity": 0.7 } })
  })
})

describe("style URIs", () => {
  test("a pack style per layer, the legacy dark path kept for the Plan", () => {
    expect(offlineStyleUri(DOCS, "photos-1950")).toBe(`${DOCS}offline-styles/photos-1950.json`)
    expect(offlineStyleUri(DOCS, "map", true)).toBe(`${DOCS}offline-styles/map-dark.json`)
  })

  test("the display styles of the Plan, light and dark", () => {
    expect(offlineDisplayStyleUri(DOCS, false)).toBe(`${DOCS}offline-styles/map-display.json`)
    expect(offlineDisplayStyleUri(DOCS, true)).toBe(`${DOCS}offline-styles/map-display-dark.json`)
  })
})

describe("writeOfflineStyle", () => {
  test("satellite: the orthophoto source, no cadastre, no network", async () => {
    const fetchImpl = jest.fn()
    const uri = await writeOfflineStyle(DOCS, "satellite", fetchImpl)
    expect(uri).toBe(offlineStyleUri(DOCS, "satellite"))
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(await offlineStyleExists(DOCS, "satellite")).toBe(true)
    expect(__getMockFile(uri)).toBeDefined()
    const style = parse(uri)
    expect(Object.keys(style.sources)).toEqual(["ortho"])
    expect(style.sources.ortho.maxzoom).toBe(19)
    expect(written().get(uri)).not.toContain(CADASTRE_SOURCE_ID)
  })

  test.each([
    ["etat-major", 15],
    ["carte-1950", 15],
    ["photos-1950", 17],
    ["types-foret", 16],
  ] as const)("%s: one source capped at tile zoom %i offline, no fetch", async (layer, cap) => {
    const fetchImpl = jest.fn()
    const uri = await writeOfflineStyle(DOCS, layer, fetchImpl)
    expect(uri).toBe(`${DOCS}offline-styles/${layer}.json`)
    expect(fetchImpl).not.toHaveBeenCalled()
    const style = parse(uri)
    expect(Object.keys(style.sources)).toEqual([layer])
    expect(style.sources[layer].maxzoom).toBe(cap)
    expect(JSON.parse(written().get(uri) as string)).toEqual(
      JSON.parse(JSON.stringify(rasterStyleFor(layer, { offline: true }))),
    )
    expect(written().get(uri)).not.toContain(CADASTRE_SOURCE_ID)
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledTimes(1)
  })

  test("map: one fetch, the pack style with the cadastre and two display styles without it", async () => {
    const plan = {
      version: 8,
      sources: { plan: { type: "vector", url: "x" } },
      layers: [{ id: "land", type: "fill", source: "plan", paint: { "fill-color": "#FFFFFF" } }],
    }
    const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => plan }))
    const uri = await writeOfflineStyle(DOCS, "map", fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(uri).toBe(`${DOCS}offline-styles/map.json`)
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledTimes(3)

    const files = written()
    expect([...files.keys()].sort()).toEqual([
      `${DOCS}offline-styles/map-display-dark.json`,
      `${DOCS}offline-styles/map-display.json`,
      `${DOCS}offline-styles/map.json`,
    ])
    const pack = files.get(uri) as string
    expect(pack).toContain(CADASTRE_SOURCE_ID)
    expect(pack).not.toContain("basemap-dark-ground")

    const display = files.get(offlineDisplayStyleUri(DOCS, false)) as string
    expect(JSON.parse(display)).toEqual(plan)
    expect(display).not.toContain(CADASTRE_SOURCE_ID)

    const displayDark = files.get(offlineDisplayStyleUri(DOCS, true)) as string
    expect(displayDark).toContain("basemap-dark-ground")
    expect(displayDark).not.toContain(CADASTRE_SOURCE_ID)

    expect(await offlineStyleExists(DOCS, "map")).toBe(true)
    // The old dark pack file is no longer written.
    expect(await offlineStyleExists(DOCS, "map", true)).toBe(false)
  })

  test("map: a failed style fetch rejects (nothing written)", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: false, json: async () => ({}) }))
    await expect(writeOfflineStyle(DOCS, "map", fetchImpl)).rejects.toThrow("could not be fetched")
    expect(await offlineStyleExists(DOCS, "map")).toBe(false)
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled()
  })

  test("offlineStyleExists reflects the written file", async () => {
    expect(await offlineStyleExists(DOCS, "carte-1950")).toBe(false)
    await writeOfflineStyle(DOCS, "carte-1950", jest.fn())
    expect(await offlineStyleExists(DOCS, "carte-1950")).toBe(true)
  })

  test("offlineDisplayStyleExists reflects the two display files of the Plan", async () => {
    expect(await offlineDisplayStyleExists(DOCS, false)).toBe(false)
    expect(await offlineDisplayStyleExists(DOCS, true)).toBe(false)
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ version: 8, sources: {}, layers: [] }),
    }))
    await writeOfflineStyle(DOCS, "map", fetchImpl)
    expect(await offlineDisplayStyleExists(DOCS, false)).toBe(true)
    expect(await offlineDisplayStyleExists(DOCS, true)).toBe(true)
  })
})
