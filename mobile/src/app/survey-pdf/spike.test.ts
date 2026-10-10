import { fr } from "../../i18n"
import type { LocalAttachment } from "../../storage/types"
import type { PublicParcelStatusItem } from "../types"
import type { BasemapChoice } from "./map-snapshot"
import {
  buildSpikeHtml,
  runPdfSpike,
  SPIKE_PAGE_COUNT,
  SPIKE_PHOTO_COUNT,
  SPIKE_PHOTO_SETTINGS,
  type PdfSpikeDeps,
  type SpikeFixture,
} from "./spike"

const mockPrintToFileAsync = jest.fn()
jest.mock("expo-print", () => ({
  printToFileAsync: (...args: unknown[]) => mockPrintToFileAsync(...args),
}))

const mockShareAsync = jest.fn()
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}))

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }))

beforeAll(() => {
  jest.spyOn(console, "debug").mockImplementation(() => undefined)
})

afterAll(() => {
  jest.restoreAllMocks()
})

const FRAME = { centerLng: 2.7, centerLat: 48.4, zoom: 16, width: 515, height: 340 }

const fixture = (overrides: Partial<SpikeFixture> = {}): SpikeFixture => ({
  platform: "ios",
  fonts: [
    { family: "Sora-ExtraBold", base64: "QUJD" },
    { family: "Jost-Regular", base64: "REVG" },
  ],
  logoDataUri: "data:image/png;base64,QUJD",
  genusNames: Object.values(fr.genus.displayName),
  photos: Array.from({ length: SPIKE_PHOTO_COUNT }, (_, index) => ({
    id: `photo-${index}`,
    dataUri: "data:image/jpeg;base64,QUJD",
    width: 800,
    height: 600,
  })),
  map: {
    frame: FRAME,
    basemap: { dataUri: "data:image/jpeg;base64,QUJD", frame: FRAME },
    polygons: [
      {
        parcelId: "SPIKE",
        rings: [
          [
            [2.699, 48.399],
            [2.701, 48.399],
            [2.701, 48.401],
            [2.699, 48.401],
            [2.699, 48.399],
          ],
        ],
      },
    ],
  },
  ...overrides,
})

describe("buildSpikeHtml", () => {
  test("has 7 page sections, a page break after every page but the last", () => {
    const html = buildSpikeHtml(fixture(), 1)
    expect(SPIKE_PAGE_COUNT).toBe(7)
    expect(html.match(/<section class="page"/g)).toHaveLength(7)
    expect(html.match(/page-break-after: always/g)).toHaveLength(6)
    expect(html.match(/page-break-after: auto/g)).toHaveLength(1)
  })

  test("carries the CSP meta and no remote URL", () => {
    const html = buildSpikeHtml(fixture(), 1)
    expect(html).toContain(
      `content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'"`,
    )
    expect(html).not.toMatch(/https?:/)
    expect(html).not.toContain("<script")
  })

  test("embeds one @font-face per font and applies the layout scale on the root", () => {
    const scale = 4 / 3
    const html = buildSpikeHtml(fixture(), scale)
    expect(html.match(/@font-face/g)).toHaveLength(2)
    expect(html).toContain("font-family: 'Sora-ExtraBold'")
    expect(html).toContain("src: url(data:font/ttf;base64,QUJD)")
    expect(html).toContain(`zoom: ${scale}`)
  })

  test("lists the 34 genus display names on page 1", () => {
    const html = buildSpikeHtml(fixture(), 1)
    const names = Object.values(fr.genus.displayName)
    expect(names).toHaveLength(34)
    for (const name of names) {
      expect(html).toContain(name.replace(/&/g, "&amp;"))
    }
  })

  test("calibrates with rules at 0, 100, 200, 300, 400, 500 and 594", () => {
    const html = buildSpikeHtml(fixture(), 1)
    for (const x of [0, 100, 200, 300, 400, 500, 594]) {
      expect(html).toContain(`class="rule" style="left: ${x}px"`)
    }
  })

  test("holds 24 photo cells with explicit width and height attributes", () => {
    const html = buildSpikeHtml(fixture(), 1)
    const cells = html.match(/<img class="photo" [^>]*>/g) ?? []
    expect(cells).toHaveLength(24)
    for (const cell of cells) {
      expect(cell).toContain('width="255"')
      expect(cell).toContain('height="200"')
    }
  })

  test("page 7 has the map image, the polygon path, the scale bar and the north arrow", () => {
    const html = buildSpikeHtml(fixture(), 1)
    expect(html).toContain('<img class="basemap" width="515" height="340"')
    expect(html).toContain('viewBox="0 0 515 340"')
    expect(html).toMatch(/<path class="parcel" d="M[^"]+ Z"/)
    expect(html).toContain(fr.surveyExport.map.north)
    expect(html).toMatch(/class="scalebar"/)
    expect(html).toContain(fr.surveyExport.map.source)
  })

  test("page 7 without a snapshot omits the image and says outline only", () => {
    const html = buildSpikeHtml(fixture({ map: { ...fixture().map, basemap: null } }), 1)
    expect(html).not.toContain('class="basemap"')
    expect(html).toContain(fr.surveyExport.map.outlineOnly)
  })

  test("uses kilometres for a long scale bar", () => {
    const wide = { ...FRAME, zoom: 11 }
    const html = buildSpikeHtml(fixture({ map: { ...fixture().map, frame: wide } }), 1)
    expect(html).toContain(fr.surveyExport.map.scaleKm({ km: "2" }))
  })

  test("every page has the footer, the header and the draft watermark", () => {
    const html = buildSpikeHtml(fixture(), 1)
    for (let index = 1; index <= 7; index += 1) {
      expect(html).toContain(fr.surveyExport.page.number({ index: String(index), total: 7 }))
    }
    expect(html.match(new RegExp(fr.surveyExport.sheetTitle, "g"))?.length).toBeGreaterThanOrEqual(
      7,
    )
    expect(html.match(/class="watermark"/g)).toHaveLength(7)
    expect(html).not.toContain("opacity")
  })

  test("a page shows the logo in the header only when there is one", () => {
    expect(buildSpikeHtml(fixture(), 1)).toContain('<img class="logo"')
    expect(buildSpikeHtml(fixture({ logoDataUri: null }), 1)).not.toContain('<img class="logo"')
  })

  test("escapes every interpolated text", () => {
    const html = buildSpikeHtml(
      fixture({
        genusNames: ['<script>alert("x")</script>'],
        fonts: [{ family: "Bad'}</style><b>", base64: "QUJD" }],
      }),
      1,
    )
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain("</style><b>")
  })
})

const attachment = (id: string, overrides: Partial<LocalAttachment> = {}): LocalAttachment => ({
  id,
  survey_id: "survey-1",
  local_uri: `file:///photos/${id}.jpg`,
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
  updated_at: "2026-10-10T10:00:00.000Z",
  file_state: "local",
  ...overrides,
})

const square = (lng: number, lat: number) => ({
  type: "Polygon" as const,
  coordinates: [
    [
      [lng - 0.001, lat - 0.001],
      [lng + 0.001, lat - 0.001],
      [lng + 0.001, lat + 0.001],
      [lng - 0.001, lat + 0.001],
      [lng - 0.001, lat - 0.001],
    ],
  ],
})

type Overrides = Partial<PdfSpikeDeps>

function makeDeps(overrides: Overrides = {}) {
  let clock = 0
  const deps: PdfSpikeDeps = {
    platform: "ios",
    now: () => {
      clock += 10
      return clock
    },
    loadExportAssets: jest.fn(async () => ({
      fonts: [{ family: "Sora-ExtraBold", base64: "QUJD" }],
      logoDataUri: "data:image/png;base64,QUJD",
    })),
    preparePhotosForExport: jest.fn(async (sources) => ({
      photos: sources.map((source) => ({
        id: source.id,
        dataUri: "data:image/jpeg;base64,QUJD",
        width: 800,
        height: 600,
      })),
      failed: 0,
      capped: 0,
    })),
    listLocalAttachments: jest.fn(async () => [attachment("a1"), attachment("a2")]),
    getCachedParcel: jest.fn(async () => null),
    isOnline: jest.fn(async () => true),
    decideBasemap: jest.fn(
      async (): Promise<BasemapChoice> => ({
        kind: "offline",
        mapStyle: "file:///style.json",
      }),
    ),
    takeBasemapJpeg: jest.fn(async ({ frame }) => ({
      dataUri: "data:image/jpeg;base64,QUJD",
      frame,
    })),
    print: jest.fn(async () => ({ uri: "file:///cache/Print/spike.pdf", numberOfPages: 7 })),
    fileSize: jest.fn(async () => 2_000_000),
    writeLogoFile: jest.fn(async () => "file:///cache/spike-logo.png"),
    writeReport: jest.fn(async () => undefined),
    share: jest.fn(async () => undefined),
    ...overrides,
  }
  return deps
}

const input = {
  surveyId: "survey-1",
  parcelIds: ["12345000AB0123"],
  displayLocation: { lat: 48.5, lng: 2.8 },
  layoutScale: 1,
}

describe("runPdfSpike", () => {
  test("repeats the survey's local photos up to 24 and prepares them with the trial settings", async () => {
    const deps = makeDeps()
    const report = await runPdfSpike(input, deps)
    const [sources, settings] = (deps.preparePhotosForExport as jest.Mock).mock.calls[0]
    expect(sources).toHaveLength(24)
    expect(sources[0]).toEqual({ id: "a1#0", uri: "file:///photos/a1.jpg" })
    expect(sources[1]).toEqual({ id: "a2#1", uri: "file:///photos/a2.jpg" })
    expect(sources[2].uri).toBe("file:///photos/a1.jpg")
    expect(settings).toEqual({ cap: 24, longEdgePx: 800, jpegQuality: 0.65 })
    expect(SPIKE_PHOTO_SETTINGS).toEqual(settings)
    expect(report.photoSource).toBe("survey")
    expect(report.photoCount).toBe(24)
  })

  test("skips attachments that are not local photos", async () => {
    const deps = makeDeps({
      listLocalAttachments: jest.fn(async () => [
        attachment("pdf", { mime_type: "application/pdf" }),
        attachment("remote", { file_state: "remote" }),
        attachment("ok"),
      ]),
    })
    await runPdfSpike(input, deps)
    const [sources] = (deps.preparePhotosForExport as jest.Mock).mock.calls[0]
    expect(sources.every((source: { uri: string }) => source.uri === "file:///photos/ok.jpg")).toBe(
      true,
    )
  })

  test("uses the logo when the survey has no photo", async () => {
    const deps = makeDeps({ listLocalAttachments: jest.fn(async () => []) })
    const report = await runPdfSpike(input, deps)
    const [sources] = (deps.preparePhotosForExport as jest.Mock).mock.calls[0]
    expect(sources[0].uri).toBe("file:///cache/spike-logo.png")
    expect(report.photoSource).toBe("logo")
  })

  test("has no photo at all when there is neither photo nor logo", async () => {
    const deps = makeDeps({
      listLocalAttachments: jest.fn(async () => []),
      loadExportAssets: jest.fn(async () => ({ fonts: [], logoDataUri: null })),
    })
    const report = await runPdfSpike(input, deps)
    expect(deps.preparePhotosForExport).not.toHaveBeenCalled()
    expect(report.photoSource).toBe("none")
    expect(report.photoCount).toBe(0)
  })

  test("reads the attachments of a survey whose listing fails as no photo", async () => {
    const deps = makeDeps({
      listLocalAttachments: jest.fn(async () => {
        throw new Error("db")
      }),
      loadExportAssets: jest.fn(async () => ({ fonts: [], logoDataUri: null })),
    })
    const report = await runPdfSpike(input, deps)
    expect(report.photoSource).toBe("none")
  })

  test("uses the cached geometry of the first parcel", async () => {
    const item = {
      parcel_id: "12345000AB0123",
      geometry: square(3, 49),
    } as unknown as PublicParcelStatusItem
    const deps = makeDeps({ getCachedParcel: jest.fn(async () => item) })
    await runPdfSpike(input, deps)
    const { frame } = (deps.takeBasemapJpeg as jest.Mock).mock.calls[0][0]
    expect(frame.centerLng).toBeCloseTo(3, 4)
    expect(frame.centerLat).toBeCloseTo(49, 3)
    expect(frame.width).toBe(515)
    expect(frame.height).toBe(340)
    expect(frame.zoom).toBeGreaterThanOrEqual(13)
    expect(frame.zoom).toBeLessThanOrEqual(17)
    expect(deps.getCachedParcel).toHaveBeenCalledWith("12345000AB0123")
  })

  test("falls back to a square around the display location", async () => {
    const deps = makeDeps()
    await runPdfSpike(input, deps)
    const { frame } = (deps.takeBasemapJpeg as jest.Mock).mock.calls[0][0]
    expect(frame.centerLng).toBeCloseTo(2.8, 4)
    expect(frame.centerLat).toBeCloseTo(48.5, 3)
  })

  test("falls back to a square around the default point without parcel nor location", async () => {
    const deps = makeDeps({
      getCachedParcel: jest.fn(async () => {
        throw new Error("db")
      }),
    })
    await runPdfSpike({ ...input, parcelIds: [], displayLocation: null }, deps)
    const { frame } = (deps.takeBasemapJpeg as jest.Mock).mock.calls[0][0]
    expect(frame.centerLng).toBeCloseTo(2.7, 4)
    expect(frame.centerLat).toBeCloseTo(48.4, 3)
    expect(deps.getCachedParcel).not.toHaveBeenCalled()
  })

  test("prints the page size with zero margins, reads the size and shares the file", async () => {
    const deps = makeDeps()
    const report = await runPdfSpike({ ...input, layoutScale: 4 / 3 }, deps)
    const options = (deps.print as jest.Mock).mock.calls[0][0]
    expect(options.width).toBe(595)
    expect(options.height).toBe(842)
    expect(options.margins).toEqual({ left: 0, top: 0, right: 0, bottom: 0 })
    expect(options.html).toContain(`zoom: ${4 / 3}`)
    expect(deps.share).toHaveBeenCalledWith("file:///cache/Print/spike.pdf")
    expect(report).toMatchObject({
      platform: "ios",
      layoutScale: 4 / 3,
      fontsLoaded: ["Sora-ExtraBold"],
      snapshot: "offline",
      numberOfPages: 7,
      pdfBytes: 2_000_000,
      uri: "file:///cache/Print/spike.pdf",
    })
    expect(report.htmlBytes).toBe(options.html.length)
    expect(report.photoBytes).toBeGreaterThan(0)
    for (const key of ["assets", "photos", "snapshot", "print", "total"] as const) {
      expect(report.timingsMs[key]).toBeGreaterThan(0)
    }
  })

  test("writes the report next to the PDF and tolerates a failing write or share", async () => {
    const deps = makeDeps({
      writeReport: jest.fn(async () => {
        throw new Error("disk")
      }),
      share: jest.fn(async () => {
        throw new Error("no share")
      }),
    })
    const report = await runPdfSpike(input, deps)
    expect(deps.writeReport).toHaveBeenCalledWith(
      "file:///cache/Print/spike.json",
      expect.stringContaining('"numberOfPages": 7'),
    )
    expect(report.numberOfPages).toBe(7)
  })

  test("reports the online snapshot, the empty basemap and the unknown file size", async () => {
    const deps = makeDeps({
      decideBasemap: jest.fn(
        async (): Promise<BasemapChoice> => ({ kind: "online", mapStyle: "https://style" }),
      ),
      fileSize: jest.fn(async () => null),
    })
    const report = await runPdfSpike(input, deps)
    expect(report.snapshot).toBe("online")
    expect(report.pdfBytes).toBeNull()
  })

  test("takes no snapshot when no basemap can be served", async () => {
    const deps = makeDeps({
      decideBasemap: jest.fn(async (): Promise<BasemapChoice> => ({ kind: "none" })),
    })
    const report = await runPdfSpike(input, deps)
    expect(deps.takeBasemapJpeg).not.toHaveBeenCalled()
    expect(report.snapshot).toBe("none")
  })

  test("tells an error from a timeout of the snapshot by its duration", async () => {
    const failing = makeDeps({ takeBasemapJpeg: jest.fn(async () => null) })
    expect((await runPdfSpike(input, failing)).snapshot).toBe("error")

    let clock = 0
    const slow = makeDeps({
      now: () => {
        clock += 1
        return clock
      },
      takeBasemapJpeg: jest.fn(async () => {
        clock += 9000
        return null
      }),
    })
    expect((await runPdfSpike(input, slow)).snapshot).toBe("timeout")
  })

  test("a throwing online check counts as offline", async () => {
    const deps = makeDeps({
      isOnline: jest.fn(async () => {
        throw new Error("net")
      }),
    })
    await runPdfSpike(input, deps)
    expect(deps.decideBasemap).toHaveBeenCalledWith(
      expect.objectContaining({ lat: expect.any(Number), lng: expect.any(Number) }),
      false,
    )
  })

  test("with the default dependencies it prints through expo-print and shares through expo-sharing", async () => {
    mockPrintToFileAsync.mockResolvedValue({ uri: "file:///cache/Print/x.pdf", numberOfPages: 7 })
    mockShareAsync.mockResolvedValue(undefined)
    const base = makeDeps()
    const report = await runPdfSpike(input, {
      ...base,
      print: undefined,
      share: undefined,
      fileSize: base.fileSize,
      writeReport: base.writeReport,
    } as unknown as PdfSpikeDeps)
    expect(mockPrintToFileAsync).toHaveBeenCalledWith(
      expect.objectContaining({ width: 595, height: 842 }),
    )
    expect(mockShareAsync).toHaveBeenCalledWith(
      "file:///cache/Print/x.pdf",
      expect.objectContaining({ mimeType: "application/pdf" }),
    )
    expect(report.uri).toBe("file:///cache/Print/x.pdf")
  })
})
