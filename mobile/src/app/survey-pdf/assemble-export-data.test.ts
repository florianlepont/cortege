import { initLocalDb } from "../../storage/db"
import type { LocalAttachment } from "../../storage/types"
import type { PublicParcelStatusItem } from "../types"
import {
  assembleSurveyExportData,
  defaultAssembleDeps,
  type AssembleDeps,
} from "./assemble-export-data"
import { GEOMETRY_FETCH_TIMEOUT_MS, MAP_FRAME_SIZE, PHOTO_EXPORT_SETTINGS } from "./export-settings"
import { boundsOfRings, fitFrameToBounds, OFFLINE_ZOOM_RANGE } from "./map-projection"
import type { BasemapChoice } from "./map-snapshot"
import type { SurveyExportInput } from "./types"

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }))

beforeAll(() => {
  jest.spyOn(console, "debug").mockImplementation(() => undefined)
})

afterAll(() => {
  jest.restoreAllMocks()
})

const PARCEL = "77186000AB0123"
const OTHER = "77186000AB0124"
const NOW = new Date("2026-10-10T09:00:00.000Z")
const OFFLINE_CHOICE: BasemapChoice = { kind: "offline", mapStyle: "file:///style.json" }
const BASEMAP = {
  dataUri: "data:image/jpeg;base64,QUJD",
  frame: { centerLng: 2.7, centerLat: 48.4, zoom: 16, width: 515, height: 340 },
}

const input = (overrides: Partial<SurveyExportInput> = {}): SurveyExportInput => ({
  surveyId: "S1",
  siteName: "Bois de la Colline",
  parcelIds: [PARCEL],
  observationYear: 2026,
  versionNumber: 2,
  dateIso: "2026-09-26T10:00:00.000Z",
  isDraft: false,
  observerName: "Camille Martin",
  displayLocation: { lat: 48.4, lng: 2.7 },
  method: {
    version: "3.2",
    ibpCas: 1,
    ibpCas3Scale: false,
    regionVersion: null,
    vegetationStage: null,
  },
  scores: { ibp_total: 32, ibp_peuplement_gestion: 20, ibp_contexte: 12 },
  factorEntries: [],
  apiUrl: "https://api.example.test/v1",
  accessToken: "secret-token",
  ...overrides,
})

const attachment = (id: string, overrides: Partial<LocalAttachment> = {}): LocalAttachment => ({
  id,
  survey_id: "S1",
  local_uri: `file:///mock/documents/attachments/${id}.jpg`,
  mime_type: "image/jpeg",
  size_bytes: 1000,
  sync_state: "synced",
  remote_attachment_id: null,
  storage_key: null,
  upload_url: null,
  confirm_url: null,
  last_sync_error: null,
  last_sync_error_code: null,
  last_sync_error_at: null,
  updated_at: "2026-09-26T10:00:00.000Z",
  file_state: "local",
  ...overrides,
})

function parcelItem(parcelId: string, lng = 2.7, lat = 48.4): PublicParcelStatusItem {
  const d = 0.0005
  return {
    parcel_id: parcelId,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lng - d, lat - d],
          [lng + d, lat - d],
          [lng + d, lat + d],
          [lng - d, lat + d],
          [lng - d, lat - d],
        ],
      ],
    },
  } as unknown as PublicParcelStatusItem
}

function fakeDeps(overrides: Partial<AssembleDeps> = {}): AssembleDeps {
  return {
    platform: "ios",
    now: () => NOW,
    isOnline: jest.fn(async () => false),
    loadDraft: jest.fn(async () => ({ factors: { A: { native_genus_count: 5 } } })),
    listPhotos: jest.fn(async () => []),
    preparePhotos: jest.fn(async (sources) => ({
      photos: sources.map((source) => ({
        id: source.id,
        dataUri: "data:image/jpeg;base64,QUJD",
        width: 800,
        height: 600,
      })),
      failed: 0,
      capped: 0,
    })),
    loadAssets: jest.fn(async () => ({
      fonts: [{ family: "Jost-Regular", base64: "QUJD" }],
      logoDataUri: "data:image/png;base64,QUJD",
    })),
    getCachedParcel: jest.fn(async (parcelId: string) => parcelItem(parcelId)),
    fetchParcelStatuses: jest.fn(async () => ({ items: [] })),
    decideBasemap: jest.fn(async (_center, isOnline) =>
      isOnline
        ? ({ kind: "online", mapStyle: "https://style.example.test" } as const)
        : ({ kind: "none" } as const),
    ),
    takeBasemap: jest.fn(async ({ frame }) => ({ dataUri: BASEMAP.dataUri, frame })),
    loadHistory: jest.fn(async () => null),
    ...overrides,
  }
}

describe("assembleSurveyExportData", () => {
  describe("raw factors, layout, clock and the fields handed to the builders", () => {
    test("reads the factors of the local draft", async () => {
      const data = await assembleSurveyExportData(input(), fakeDeps())

      expect(data.rawFactors).toEqual({ A: { native_genus_count: 5 } })
    })

    test("is an empty object when the draft is missing, has no factors or cannot be read", async () => {
      const missing = await assembleSurveyExportData(
        input(),
        fakeDeps({ loadDraft: async () => null }),
      )
      const noFactors = await assembleSurveyExportData(
        input(),
        fakeDeps({ loadDraft: async () => ({}) }),
      )
      const broken = await assembleSurveyExportData(
        input(),
        fakeDeps({
          loadDraft: async () => {
            throw new Error("sqlite")
          },
        }),
      )

      expect(missing.rawFactors).toEqual({})
      expect(noFactors.rawFactors).toEqual({})
      expect(broken.rawFactors).toEqual({})
    })

    test("takes the layout from the platform and the date from the injected clock", async () => {
      const ios = await assembleSurveyExportData(input(), fakeDeps({ platform: "ios" }))
      const android = await assembleSurveyExportData(input(), fakeDeps({ platform: "android" }))

      expect(ios.layout).toEqual({ platform: "ios", layoutScale: 1.2487 })
      expect(android.layout).toEqual({ platform: "android", layoutScale: 4 / 3 })
      expect(ios.generatedAtIso).toBe("2026-10-10T09:00:00.000Z")
    })

    test("copies the survey fields and leaves the token, the API URL and the location out", async () => {
      const data = await assembleSurveyExportData(input(), fakeDeps())

      expect(data).toMatchObject({
        surveyId: "S1",
        siteName: "Bois de la Colline",
        parcelIds: [PARCEL],
        observationYear: 2026,
        versionNumber: 2,
        isDraft: false,
        observerName: "Camille Martin",
      })
      expect(Object.keys(data)).not.toEqual(
        expect.arrayContaining(["accessToken", "apiUrl", "displayLocation"]),
      )
      expect(JSON.stringify(data)).not.toContain("secret-token")
    })

    test("reads the assets through the loader and survives its failure", async () => {
      const ok = await assembleSurveyExportData(input(), fakeDeps())
      const broken = await assembleSurveyExportData(
        input(),
        fakeDeps({
          loadAssets: async () => {
            throw new Error("asset")
          },
        }),
      )

      expect(ok.assets.fonts).toHaveLength(1)
      expect(broken.assets).toEqual({ fonts: [], logoDataUri: null })
    })
  })

  describe("photos", () => {
    test("prepares the local photos in the order listed, with the measured settings", async () => {
      const deps = fakeDeps({
        listPhotos: async () => [attachment("p1"), attachment("p2"), attachment("p3")],
      })

      const data = await assembleSurveyExportData(input(), deps)

      expect(data.photos.items.map((photo) => photo.id)).toEqual(["p1", "p2", "p3"])
      expect(data.photos.total).toBe(3)
      expect(data.photos.unavailable).toBe(0)
      expect(deps.preparePhotos).toHaveBeenCalledWith(
        [
          { id: "p1", uri: "file:///mock/documents/attachments/p1.jpg" },
          { id: "p2", uri: "file:///mock/documents/attachments/p2.jpg" },
          { id: "p3", uri: "file:///mock/documents/attachments/p3.jpg" },
        ],
        PHOTO_EXPORT_SETTINGS,
      )
    })

    test("counts the photos that are not on the phone and the ones that failed as unavailable", async () => {
      const deps = fakeDeps({
        listPhotos: async () => [
          attachment("p1"),
          attachment("p2", { file_state: "remote" }),
          attachment("p3", { file_state: "missing" }),
          attachment("p4"),
        ],
        preparePhotos: async (sources) => ({
          photos: [
            { id: sources[0].id, dataUri: "data:image/jpeg;base64,QUJD", width: 1, height: 1 },
          ],
          failed: 1,
          capped: 0,
        }),
      })

      const data = await assembleSurveyExportData(input(), deps)

      expect(data.photos.total).toBe(4)
      expect(data.photos.unavailable).toBe(3)
      expect(data.photos.items).toHaveLength(1)
    })

    test("does not prepare anything when no photo is on the phone", async () => {
      const deps = fakeDeps({
        listPhotos: async () => [attachment("p1", { file_state: "remote" })],
      })

      const data = await assembleSurveyExportData(input(), deps)

      expect(deps.preparePhotos).not.toHaveBeenCalled()
      expect(data.photos).toEqual({ items: [], total: 1, unavailable: 1 })
    })

    test("ignores a non image attachment", async () => {
      const deps = fakeDeps({
        listPhotos: async () => [
          attachment("p1"),
          attachment("doc", { mime_type: "application/pdf" }),
        ],
      })

      const data = await assembleSurveyExportData(input(), deps)

      expect(data.photos.total).toBe(1)
      expect(data.photos.items.map((photo) => photo.id)).toEqual(["p1"])
    })

    test("leaves the cap to the preparation: total counts every photo", async () => {
      const many = Array.from({ length: 30 }, (_, index) => attachment(`p${index}`))
      const deps = fakeDeps({
        listPhotos: async () => many,
        preparePhotos: async (sources, settings) => ({
          photos: sources.slice(0, settings.cap).map((source) => ({
            id: source.id,
            dataUri: "data:image/jpeg;base64,QUJD",
            width: 1,
            height: 1,
          })),
          failed: 0,
          capped: sources.length - settings.cap,
        }),
      })

      const data = await assembleSurveyExportData(input(), deps)

      expect(data.photos.total).toBe(30)
      expect(data.photos.items).toHaveLength(PHOTO_EXPORT_SETTINGS.cap)
      expect(data.photos.unavailable).toBe(0)
    })

    test("gives no photo when the listing throws", async () => {
      const data = await assembleSurveyExportData(
        input(),
        fakeDeps({
          listPhotos: async () => {
            throw new Error("sqlite")
          },
        }),
      )

      expect(data.photos).toEqual({ items: [], total: 0, unavailable: 0 })
    })

    test("counts every photo unavailable when the preparation throws", async () => {
      const data = await assembleSurveyExportData(
        input(),
        fakeDeps({
          listPhotos: async () => [attachment("p1"), attachment("p2")],
          preparePhotos: async () => {
            throw new Error("manipulator")
          },
        }),
      )

      expect(data.photos).toEqual({ items: [], total: 2, unavailable: 2 })
    })
  })

  describe("map, offline", () => {
    test("uses the cached outlines, makes no network read and takes the offline basemap", async () => {
      const deps = fakeDeps({
        isOnline: async () => false,
        decideBasemap: jest.fn(async () => OFFLINE_CHOICE),
      })

      const data = await assembleSurveyExportData(input({ parcelIds: [PARCEL, OTHER] }), deps)

      expect(deps.fetchParcelStatuses).not.toHaveBeenCalled()
      expect(deps.decideBasemap).toHaveBeenCalledWith(
        { lat: expect.any(Number), lng: expect.any(Number) },
        false,
      )
      expect(deps.takeBasemap).toHaveBeenCalledWith(
        expect.objectContaining({ mapStyle: "file:///style.json", kind: "offline" }),
      )
      expect(data.map?.polygons.map((polygon) => polygon.parcelId)).toEqual([PARCEL, OTHER])
      expect(data.map?.basemap?.dataUri).toBe(BASEMAP.dataUri)
      expect(data.map?.frameSize).toEqual(MAP_FRAME_SIZE)
    })

    test("frames the snapshot on the outlines inside the offline zoom range", async () => {
      const deps = fakeDeps()

      const data = await assembleSurveyExportData(input(), deps)

      const rings = (data.map?.polygons ?? []).flatMap((polygon) => polygon.rings)
      const bounds = boundsOfRings(rings)
      expect(bounds).not.toBeNull()
      const expected = fitFrameToBounds(bounds!, MAP_FRAME_SIZE, {
        paddingRatio: 0.12,
        zoomRange: OFFLINE_ZOOM_RANGE,
      })
      expect(deps.decideBasemap).toHaveBeenCalledWith(
        { lat: expected.centerLat, lng: expected.centerLng },
        false,
      )
    })

    test("keeps the outline and no basemap when no basemap can be chosen", async () => {
      const deps = fakeDeps()

      const data = await assembleSurveyExportData(input(), deps)

      expect(deps.takeBasemap).not.toHaveBeenCalled()
      expect(data.map?.basemap).toBeNull()
      expect(data.map?.polygons).toHaveLength(1)
    })

    test("keeps the outline when the snapshot comes back empty or throws", async () => {
      const online = fakeDeps({ isOnline: async () => true })
      const empty = await assembleSurveyExportData(input(), {
        ...online,
        takeBasemap: async () => null,
      })
      const thrown = await assembleSurveyExportData(input(), {
        ...online,
        takeBasemap: async () => {
          throw new Error("native")
        },
      })
      const decided = await assembleSurveyExportData(input(), {
        ...online,
        decideBasemap: async () => {
          throw new Error("native")
        },
      })

      for (const data of [empty, thrown, decided]) {
        expect(data.map?.basemap).toBeNull()
        expect(data.map?.polygons).toHaveLength(1)
      }
    })

    test("is null with no cached outline and no known coordinates", async () => {
      const deps = fakeDeps({ getCachedParcel: async () => null })

      const data = await assembleSurveyExportData(input({ displayLocation: null }), deps)

      expect(data.map).toBeNull()
      expect(data.coordinates).toBeNull()
      expect(deps.decideBasemap).not.toHaveBeenCalled()
    })

    test("takes the centre of the outlines as the coordinates when the survey has no location", async () => {
      const data = await assembleSurveyExportData(
        input({ displayLocation: null }),
        fakeDeps({ getCachedParcel: async (id) => parcelItem(id, 2.5, 48.2) }),
      )

      expect(data.coordinates?.lng).toBeCloseTo(2.5, 6)
      expect(data.coordinates?.lat).toBeCloseTo(48.2, 6)
    })

    test("keeps the survey location as the coordinates", async () => {
      const data = await assembleSurveyExportData(
        input({ displayLocation: { lat: 1, lng: 2 } }),
        fakeDeps(),
      )

      expect(data.coordinates).toEqual({ lat: 1, lng: 2 })
    })

    test("frames zoom 16 around the location when there is no outline", async () => {
      const deps = fakeDeps({
        getCachedParcel: async () => null,
        decideBasemap: jest.fn(async () => OFFLINE_CHOICE),
      })

      const data = await assembleSurveyExportData(input(), deps)

      expect(deps.takeBasemap).toHaveBeenCalledWith(
        expect.objectContaining({
          frame: { centerLng: 2.7, centerLat: 48.4, zoom: 16, width: 515, height: 340 },
        }),
      )
      expect(data.map?.polygons).toEqual([])
      expect(data.map?.basemap).not.toBeNull()
    })

    test("has no map and reads nothing when the survey has no parcel", async () => {
      const deps = fakeDeps()

      const data = await assembleSurveyExportData(input({ parcelIds: [] }), deps)

      expect(data.map).toBeNull()
      expect(data.coordinates).toEqual({ lat: 48.4, lng: 2.7 })
      expect(deps.getCachedParcel).not.toHaveBeenCalled()
      expect(deps.isOnline).not.toHaveBeenCalled()
    })

    test("treats a cache read that throws as a missing parcel", async () => {
      const data = await assembleSurveyExportData(
        input(),
        fakeDeps({
          getCachedParcel: async () => {
            throw new Error("sqlite")
          },
        }),
      )

      expect(data.map?.polygons).toEqual([])
    })

    test("treats a network check that throws as offline", async () => {
      const deps = fakeDeps({
        isOnline: async () => {
          throw new Error("expo-network")
        },
        getCachedParcel: async () => null,
      })

      await assembleSurveyExportData(input(), deps)

      expect(deps.fetchParcelStatuses).not.toHaveBeenCalled()
      expect(deps.decideBasemap).toHaveBeenCalledWith(expect.anything(), false)
    })
  })

  describe("map, online", () => {
    afterEach(() => {
      jest.useRealTimers()
    })

    test("makes no read when every parcel is cached", async () => {
      const deps = fakeDeps({ isOnline: async () => true })

      await assembleSurveyExportData(input(), deps)

      expect(deps.fetchParcelStatuses).not.toHaveBeenCalled()
    })

    test("reads one small box around the location for a parcel missing from the cache", async () => {
      const fetchParcelStatuses = jest.fn(async () => ({ items: [parcelItem(PARCEL)] }))
      const deps = fakeDeps({
        isOnline: async () => true,
        getCachedParcel: async () => null,
        fetchParcelStatuses,
      })

      const data = await assembleSurveyExportData(input(), deps)

      expect(fetchParcelStatuses).toHaveBeenCalledTimes(1)
      expect(fetchParcelStatuses).toHaveBeenCalledWith(
        "https://api.example.test/v1",
        "secret-token",
        {
          bbox: "2.699000,48.399000,2.701000,48.401000",
          zoom: 16,
        },
      )
      expect(data.map?.polygons.map((polygon) => polygon.parcelId)).toEqual([PARCEL])
      expect(deps.decideBasemap).toHaveBeenCalledWith(expect.anything(), true)
      expect(deps.takeBasemap).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "online", mapStyle: "https://style.example.test" }),
      )
    })

    test("merges the cached outline with the one read for the missing parcel", async () => {
      const deps = fakeDeps({
        isOnline: async () => true,
        getCachedParcel: async (id) => (id === PARCEL ? parcelItem(PARCEL) : null),
        fetchParcelStatuses: async () => ({ items: [parcelItem(OTHER, 2.7005, 48.4)] }),
      })

      const data = await assembleSurveyExportData(input({ parcelIds: [PARCEL, OTHER] }), deps)

      expect(data.map?.polygons.map((polygon) => polygon.parcelId).sort()).toEqual([PARCEL, OTHER])
    })

    test("does not read without a token or without a known location", async () => {
      const base = { isOnline: async () => true, getCachedParcel: async () => null }
      const noToken = fakeDeps(base)
      const noLocation = fakeDeps(base)

      await assembleSurveyExportData(input({ accessToken: null }), noToken)
      await assembleSurveyExportData(input({ displayLocation: null }), noLocation)

      expect(noToken.fetchParcelStatuses).not.toHaveBeenCalled()
      expect(noLocation.fetchParcelStatuses).not.toHaveBeenCalled()
    })

    test("gives no polygon when the read fails or answers without items", async () => {
      const base = { isOnline: async () => true, getCachedParcel: async () => null }
      const rejected = await assembleSurveyExportData(
        input(),
        fakeDeps({
          ...base,
          fetchParcelStatuses: async () => {
            throw new Error("HTTP 503")
          },
        }),
      )
      const malformed = await assembleSurveyExportData(
        input(),
        fakeDeps({
          ...base,
          fetchParcelStatuses: async () => ({}) as { items: PublicParcelStatusItem[] },
        }),
      )

      expect(rejected.map?.polygons).toEqual([])
      expect(malformed.map?.polygons).toEqual([])
    })

    test("gives no polygon once the read has been silent for the geometry timeout", async () => {
      jest.useFakeTimers()
      const deps = fakeDeps({
        isOnline: async () => true,
        getCachedParcel: async () => null,
        fetchParcelStatuses: () => new Promise(() => undefined),
      })

      const pending = assembleSurveyExportData(input(), deps)
      await jest.advanceTimersByTimeAsync(GEOMETRY_FETCH_TIMEOUT_MS - 1)
      expect(deps.takeBasemap).not.toHaveBeenCalled()
      await jest.advanceTimersByTimeAsync(1)
      const data = await pending

      expect(data.map?.polygons).toEqual([])
      expect(data.map).not.toBeNull()
    })

    test("does not let a read that fails after the timeout become an unhandled rejection", async () => {
      jest.useFakeTimers()
      let fail: (reason: Error) => void = () => undefined
      const deps = fakeDeps({
        isOnline: async () => true,
        getCachedParcel: async () => null,
        fetchParcelStatuses: () =>
          new Promise((_resolve, reject) => {
            fail = reject
          }),
      })

      const pending = assembleSurveyExportData(input(), deps)
      await jest.advanceTimersByTimeAsync(GEOMETRY_FETCH_TIMEOUT_MS)
      await pending
      fail(new Error("late"))
      await jest.advanceTimersByTimeAsync(0)
    })
  })

  describe("history", () => {
    test("maps the cache of the first parcel", async () => {
      const items = [{ survey_id: "S0" }] as never
      const loadHistory = jest.fn(async () => ({ fetched_at: "2026-10-01T00:00:00.000Z", items }))

      const data = await assembleSurveyExportData(
        input({ parcelIds: [PARCEL, OTHER] }),
        fakeDeps({ loadHistory }),
      )

      expect(loadHistory).toHaveBeenCalledTimes(1)
      expect(loadHistory).toHaveBeenCalledWith(PARCEL)
      expect(data.history).toEqual({ fetchedAt: "2026-10-01T00:00:00.000Z", items })
    })

    test("is null without a cache, without a parcel (no read) or when the read throws", async () => {
      const none = await assembleSurveyExportData(input(), fakeDeps())
      const noParcelDeps = fakeDeps()
      const noParcel = await assembleSurveyExportData(input({ parcelIds: [] }), noParcelDeps)
      const broken = await assembleSurveyExportData(
        input(),
        fakeDeps({
          loadHistory: async () => {
            throw new Error("sqlite")
          },
        }),
      )

      expect(none.history).toBeNull()
      expect(noParcel.history).toBeNull()
      expect(noParcelDeps.loadHistory).not.toHaveBeenCalled()
      expect(broken.history).toBeNull()
    })
  })

  test("resolves with every optional piece empty when all of them throw", async () => {
    const fail = async () => {
      throw new Error("boom")
    }
    const deps = fakeDeps({
      loadDraft: fail,
      listPhotos: fail,
      loadAssets: fail,
      getCachedParcel: fail,
      isOnline: fail,
      decideBasemap: fail,
      loadHistory: fail,
    })

    const data = await assembleSurveyExportData(input(), deps)

    expect(data.rawFactors).toEqual({})
    expect(data.photos).toEqual({ items: [], total: 0, unavailable: 0 })
    expect(data.history).toBeNull()
    expect(data.assets).toEqual({ fonts: [], logoDataUri: null })
    expect(data.siteName).toBe("Bois de la Colline")
  })

  test("falls back to a null map and the survey location when the whole map branch throws", async () => {
    const deps = fakeDeps({
      isOnline: jest.fn(() => {
        throw new Error("sync throw")
      }) as unknown as AssembleDeps["isOnline"],
    })
    // isOnline is caught on its own; a throw further in (the parcel cache iterator) is the whole branch.
    const data = await assembleSurveyExportData(
      { ...input(), parcelIds: undefined as unknown as string[] },
      deps,
    )

    expect(data.map).toBeNull()
    expect(data.coordinates).toEqual({ lat: 48.4, lng: 2.7 })
  })
})

describe("defaultAssembleDeps", () => {
  test("wires every reader and maps the platform", () => {
    const deps = defaultAssembleDeps()

    expect(deps.platform).toBe("ios")
    expect(deps.now()).toBeInstanceOf(Date)
    for (const key of [
      "isOnline",
      "loadDraft",
      "listPhotos",
      "preparePhotos",
      "loadAssets",
      "getCachedParcel",
      "fetchParcelStatuses",
      "decideBasemap",
      "takeBasemap",
      "loadHistory",
    ] as const) {
      expect(typeof deps[key]).toBe("function")
    }
  })

  test("reads the network state through expo-network", async () => {
    await expect(defaultAssembleDeps().isOnline()).resolves.toBe(true)
  })

  test("reads the offline-area cache and decides the basemap on the real modules", async () => {
    await initLocalDb()
    const deps = defaultAssembleDeps()

    await expect(deps.getCachedParcel(PARCEL)).resolves.toBeNull()
    await expect(deps.decideBasemap({ lat: 48.4, lng: 2.7 }, false)).resolves.toEqual({
      kind: "none",
    })
    await expect(deps.decideBasemap({ lat: 48.4, lng: 2.7 }, true)).resolves.toMatchObject({
      kind: "online",
    })
    await expect(deps.preparePhotos([], PHOTO_EXPORT_SETTINGS)).resolves.toEqual({
      photos: [],
      failed: 0,
      capped: 0,
    })
  })
})
