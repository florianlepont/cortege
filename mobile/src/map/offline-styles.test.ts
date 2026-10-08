import * as FileSystem from "expo-file-system/legacy"
import { __getMockFile, __resetMockFileSystem } from "../../test/expo-file-system-legacy.mock"
import {
  CADASTRE_SOURCE_ID,
  offlineStyleExists,
  offlineStyleUri,
  withCadastre,
  writeOfflineStyle,
} from "./offline-styles"
import { CADASTRE_TILES, ORTHO_STYLE } from "./maplibre/styles"

const DOCS = "file:///mock/documents/"

beforeEach(() => {
  __resetMockFileSystem()
})

describe("withCadastre", () => {
  test("adds the cadastre raster source and layer on top, keeping the base style intact", () => {
    const style = withCadastre(ORTHO_STYLE)
    expect(Object.keys(style.sources)).toEqual(["ortho", CADASTRE_SOURCE_ID])
    expect(style.layers.map((layer) => layer.id)).toEqual(["ortho", CADASTRE_SOURCE_ID])
    expect(style.sources[CADASTRE_SOURCE_ID]).toMatchObject({
      type: "raster",
      tiles: [CADASTRE_TILES],
      minzoom: 15,
    })
    expect(ORTHO_STYLE.layers).toHaveLength(1)
  })
})

describe("writeOfflineStyle", () => {
  test("satellite: writes the orthophoto style with the cadastre, no network", async () => {
    const fetchImpl = jest.fn()
    const uri = await writeOfflineStyle(DOCS, "satellite", fetchImpl)
    expect(uri).toBe(offlineStyleUri(DOCS, "satellite"))
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(await offlineStyleExists(DOCS, "satellite")).toBe(true)
    expect(__getMockFile(uri)).toBeDefined()
  })

  test("map: fetches the Plan IGN style and adds the cadastre", async () => {
    const plan = { version: 8, sources: { plan: { type: "vector", url: "x" } }, layers: [] }
    const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => plan }))
    const uri = await writeOfflineStyle(DOCS, "map", fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(uri).toBe(`${DOCS}offline-styles/map.json`)
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      uri,
      expect.stringContaining(CADASTRE_SOURCE_ID),
    )
  })

  test("map: also writes the dark variant next to it, the light URL is returned", async () => {
    const plan = {
      version: 8,
      sources: { plan: { type: "vector", url: "x" } },
      layers: [{ id: "land", type: "fill", source: "plan", paint: { "fill-color": "#FFFFFF" } }],
    }
    const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => plan }))
    const uri = await writeOfflineStyle(DOCS, "map", fetchImpl)
    expect(uri).toBe(offlineStyleUri(DOCS, "map"))
    expect(await offlineStyleExists(DOCS, "map", true)).toBe(true)
    expect(offlineStyleUri(DOCS, "map", true)).toBe(`${DOCS}offline-styles/map-dark.json`)
    const written = new Map(
      (FileSystem.writeAsStringAsync as jest.Mock).mock.calls.map(
        ([target, content]: [string, string]) => [target, content],
      ),
    )
    const dark = written.get(offlineStyleUri(DOCS, "map", true))
    expect(dark).toContain("basemap-dark-ground")
    expect(dark).toContain(CADASTRE_SOURCE_ID)
    expect(written.get(uri)).not.toContain("basemap-dark-ground")
  })

  test("satellite: no dark variant", async () => {
    await writeOfflineStyle(DOCS, "satellite", jest.fn())
    expect(await offlineStyleExists(DOCS, "satellite", true)).toBe(false)
  })

  test("map: a failed style fetch rejects (nothing written)", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: false, json: async () => ({}) }))
    await expect(writeOfflineStyle(DOCS, "map", fetchImpl)).rejects.toThrow("could not be fetched")
    expect(await offlineStyleExists(DOCS, "map")).toBe(false)
  })
})
