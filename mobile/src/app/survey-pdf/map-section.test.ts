import { fr } from "../../i18n"
import { PDF_PAGE_BLOCK_HEIGHT } from "./export-settings"
import { escapeHtml } from "./html"
import {
  chooseScaleBar,
  fitFrameToBounds,
  boundsOfRings,
  metresPerPixel,
  ringsToPathD,
} from "./map-projection"
import type { MapFrame } from "./map-projection"
import { buildMapBlock, mapSectionCss } from "./map-section"
import type { PdfPalette, SurveyExportData } from "./types"

const t = fr.surveyExport

const PALETTE_KEYS = [
  "ink",
  "inkMuted",
  "inkFaint",
  "line",
  "paper",
  "panel",
  "panelStrong",
  "accent",
  "accentInk",
  "accentSoft",
  "alert",
  "alertSoft",
  "bandLow",
  "bandMid",
  "bandHigh",
  "bandTrack",
  "watermark",
  "parcelFill",
  "parcelStroke",
  "mapCanvas",
  "chartGrid",
] as const

// Fake palette: each value is its key name, so a rule can be traced without any colour literal.
const palette = Object.fromEntries(PALETTE_KEYS.map((key) => [key, key])) as PdfPalette

type Polygons = NonNullable<SurveyExportData["map"]>["polygons"]

// Three adjacent parcels around Fontainebleau, one with a hole.
const POLYGONS: Polygons = [
  {
    parcelId: "77186000AB0001",
    rings: [
      [
        [2.7, 48.4],
        [2.702, 48.4],
        [2.702, 48.401],
        [2.7, 48.401],
        [2.7, 48.4],
      ],
    ],
  },
  {
    parcelId: "77186000AB0002",
    rings: [
      [
        [2.702, 48.4],
        [2.704, 48.4],
        [2.704, 48.401],
        [2.702, 48.401],
        [2.702, 48.4],
      ],
      [
        [2.7025, 48.4003],
        [2.7035, 48.4003],
        [2.7035, 48.4007],
        [2.7025, 48.4007],
        [2.7025, 48.4003],
      ],
    ],
  },
  {
    parcelId: "77186000AB0003",
    rings: [
      [
        [2.7, 48.401],
        [2.704, 48.401],
        [2.704, 48.402],
        [2.7, 48.402],
        [2.7, 48.401],
      ],
    ],
  },
]

const SIZE = { width: 515, height: 340 }
const JPEG = "data:image/jpeg;base64,QUJDREVGRw=="

function snapshotFrame(): MapFrame {
  const bounds = boundsOfRings(POLYGONS.flatMap((polygon) => polygon.rings))!
  return fitFrameToBounds(bounds, SIZE, {
    paddingRatio: 0.1,
    zoomRange: { min: 13, max: 17 },
  })
}

function makeData(overrides: Partial<SurveyExportData> = {}): SurveyExportData {
  return {
    surveyId: "survey-1",
    siteName: "Forêt de test",
    parcelIds: POLYGONS.map((polygon) => polygon.parcelId),
    observationYear: 2026,
    versionNumber: 1,
    dateIso: "2026-10-10T08:00:00Z",
    isDraft: false,
    observerName: null,
    method: {
      version: "3.2",
      ibpCas: 1,
      ibpCas3Scale: false,
      regionVersion: null,
      vegetationStage: null,
    },
    scores: null,
    factorEntries: [],
    generatedAtIso: "2026-10-10T09:00:00Z",
    coordinates: null,
    rawFactors: {},
    photos: { items: [], total: 0, unavailable: 0 },
    map: {
      polygons: POLYGONS,
      basemap: { dataUri: JPEG, frame: snapshotFrame() },
      frameSize: SIZE,
    },
    history: null,
    assets: { fonts: [], logoDataUri: null },
    layout: { platform: "ios", layoutScale: 1.2487 },
    ...overrides,
  }
}

function outlineData(overrides: Partial<SurveyExportData> = {}): SurveyExportData {
  return makeData({ map: { polygons: POLYGONS, basemap: null, frameSize: SIZE }, ...overrides })
}

function pathsOf(html: string): string[] {
  return [...html.matchAll(/<path class="map-parcel"[^>]* d="([^"]*)"/g)].map((match) => match[1])
}

describe("buildMapBlock without a parcel", () => {
  it("prints the no parcel note and nothing else", () => {
    const block = buildMapBlock(makeData({ parcelIds: [], map: null }), palette)
    expect(block.html).toContain(escapeHtml(t.map.noParcel))
    expect(block.html).not.toContain("<svg")
    expect(block.html).not.toContain("<img")
    expect(block.breakBefore).toBe(true)
  })
})

describe("buildMapBlock without geometry", () => {
  it("lists the escaped parcel ids with the no outline note when the map is null", () => {
    const block = buildMapBlock(makeData({ parcelIds: ["A<b>1", "B&2"], map: null }), palette)
    expect(block.html).toContain(escapeHtml(t.map.noOutline))
    expect(block.html).toContain("A&lt;b&gt;1")
    expect(block.html).toContain("B&amp;2")
    expect(block.html).not.toContain("<b>")
    expect(block.html).not.toContain("<svg")
  })

  it("does the same when the map has no polygon", () => {
    const block = buildMapBlock(
      makeData({ map: { polygons: [], basemap: null, frameSize: SIZE } }),
      palette,
    )
    expect(block.html).toContain(escapeHtml(t.map.noOutline))
    expect(block.html).toContain("77186000AB0001")
  })

  it("does the same when the polygons hold no finite point", () => {
    const block = buildMapBlock(
      makeData({
        map: {
          polygons: [{ parcelId: "X", rings: [[[Number.NaN, 1]]] }],
          basemap: null,
          frameSize: SIZE,
        },
      }),
      palette,
    )
    expect(block.html).toContain(escapeHtml(t.map.noOutline))
  })
})

describe("buildMapBlock with a basemap", () => {
  const data = makeData()
  const block = buildMapBlock(data, palette)
  const frame = data.map!.basemap!.frame

  it("starts a page and fits it", () => {
    expect(block.id).toBe("map")
    expect(block.breakBefore).toBe(true)
    expect(block.height).toBeGreaterThan(SIZE.height)
    expect(block.height).toBeLessThanOrEqual(PDF_PAGE_BLOCK_HEIGHT)
  })

  it("shows the heading and the snapshot at the frame size", () => {
    expect(block.html).toContain(escapeHtml(t.map.heading))
    const image = block.html.match(/<img [^>]*>/)![0]
    expect(image).toContain(`src="${JPEG}"`)
    expect(image).toContain(`width="${frame.width}"`)
    expect(image).toContain(`height="${frame.height}"`)
    expect(block.html).not.toContain("map-canvas")
  })

  it("draws the overlay in the frame's own box", () => {
    expect(block.html).toContain(`viewBox="0 0 ${frame.width} ${frame.height}"`)
  })

  it("draws one path per polygon, projected with the snapshot frame", () => {
    const paths = pathsOf(block.html)
    expect(paths).toEqual(POLYGONS.map((polygon) => ringsToPathD(polygon.rings, frame)))
    expect(block.html).toContain("fill: parcelFill")
    expect(block.html).toContain("stroke: parcelStroke")
    expect(block.html).toContain('fill-rule="evenodd"')
  })

  it("keeps every polygon corner inside the frame", () => {
    const numbers = pathsOf(block.html)
      .join(" ")
      .match(/-?\d+(\.\d+)?/g)!
      .map(Number)
    for (let index = 0; index < numbers.length; index += 2) {
      expect(numbers[index]).toBeGreaterThanOrEqual(0)
      expect(numbers[index]).toBeLessThanOrEqual(frame.width)
      expect(numbers[index + 1]).toBeGreaterThanOrEqual(0)
      expect(numbers[index + 1]).toBeLessThanOrEqual(frame.height)
    }
  })

  it("draws a scale bar labelled with its round distance, the label clear of the line", () => {
    const bar = chooseScaleBar(metresPerPixel(frame.centerLat, frame.zoom), frame.width)
    expect(block.html).toContain(escapeHtml(t.map.scaleValue({ metres: String(bar.metres) })))
    const label = block.html.match(/<text class="map-scale-label"[^>]* y="([\d.]+)"/)!
    const line = block.html.match(/<line class="map-scale-line"[^>]* y1="([\d.]+)"/)!
    // The baseline of the label sits at least 8 units above the line (font 9: no collision).
    expect(Number(line[1]) - Number(label[1])).toBeGreaterThanOrEqual(8)
  })

  it("draws the north arrow with the N", () => {
    expect(block.html).toContain('class="map-north"')
    expect(block.html).toContain(`>${escapeHtml(t.map.north)}</text>`)
  })

  it("lists the parcels under the map", () => {
    expect(block.html).toContain(escapeHtml(t.map.parcels))
    for (const polygon of POLYGONS) expect(block.html).toContain(polygon.parcelId)
  })

  it("prints the source line once", () => {
    expect(block.html.split(escapeHtml(t.map.source))).toHaveLength(2)
  })

  it("does not print the outline-only note", () => {
    expect(block.html).not.toContain(escapeHtml(t.map.outlineOnly))
  })

  it("prints kilometres from 1000 m", () => {
    const wide: MapFrame = { ...frame, zoom: 12 }
    const out = buildMapBlock(
      makeData({
        map: { polygons: POLYGONS, basemap: { dataUri: JPEG, frame: wide }, frameSize: SIZE },
      }),
      palette,
    )
    const bar = chooseScaleBar(metresPerPixel(wide.centerLat, wide.zoom), wide.width)
    expect(bar.metres).toBeGreaterThanOrEqual(1000)
    expect(out.html).toContain(escapeHtml(t.map.scaleKm({ km: String(bar.metres / 1000) })))
  })

  it("drops a scale bar that would run over half the frame", () => {
    const tiny: MapFrame = { ...frame, zoom: 22 }
    const out = buildMapBlock(
      makeData({
        map: { polygons: POLYGONS, basemap: { dataUri: JPEG, frame: tiny }, frameSize: SIZE },
      }),
      palette,
    )
    expect(out.html).not.toContain("map-scale-line")
  })
})

describe("buildMapBlock with a basemap that is not a JPEG data URI", () => {
  it.each([
    "https://example.test/map.jpg",
    "file:///a.jpg",
    'data:image/jpeg;base64,AB"onload=',
    "",
  ])("falls back to the outline for %p", (dataUri) => {
    const base = makeData()
    const out = buildMapBlock(
      makeData({
        map: { ...base.map!, basemap: { dataUri, frame: base.map!.basemap!.frame } },
      }),
      palette,
    )
    expect(out.html).not.toContain("<img")
    expect(out.html).toContain(escapeHtml(t.map.outlineOnly))
  })
})

describe("buildMapBlock outline only", () => {
  const block = buildMapBlock(outlineData(), palette)

  it("has no image, a canvas and the polygons fitted exactly", () => {
    expect(block.html).not.toContain("<img")
    expect(block.html).toContain("fill: mapCanvas")
    const frame = fitFrameToBounds(
      boundsOfRings(POLYGONS.flatMap((polygon) => polygon.rings))!,
      SIZE,
      { paddingRatio: 0.1, zoomRange: null },
    )
    expect(pathsOf(block.html)).toEqual(
      POLYGONS.map((polygon) => ringsToPathD(polygon.rings, frame)),
    )
  })

  it("has the scale bar, the north arrow and the outline only note, but no source line", () => {
    expect(block.html).toContain("map-scale-line")
    expect(block.html).toContain('class="map-north"')
    expect(block.html).toContain(escapeHtml(t.map.outlineOnly))
    expect(block.html).not.toContain(escapeHtml(t.map.source))
  })

  it("starts a page and fits it", () => {
    expect(block.breakBefore).toBe(true)
    expect(block.height).toBeLessThanOrEqual(PDF_PAGE_BLOCK_HEIGHT)
  })

  it("keeps a very small parcel at a zoom whose scale bar fits", () => {
    const small = outlineData({
      map: {
        polygons: [
          {
            parcelId: "S",
            rings: [
              [
                [2.7, 48.4],
                [2.700001, 48.4],
                [2.700001, 48.400001],
                [2.7, 48.400001],
                [2.7, 48.4],
              ],
            ],
          },
        ],
        basemap: null,
        frameSize: SIZE,
      },
    })
    const out = buildMapBlock(small, palette)
    const line = out.html.match(
      /<line class="map-scale-line" x1="([\d.]+)" y1="[\d.]+" x2="([\d.]+)"/,
    )!
    expect(Number(line[2]) - Number(line[1])).toBeLessThanOrEqual(SIZE.width / 2)
  })
})

describe("safety", () => {
  const blocks = [
    buildMapBlock(makeData(), palette),
    buildMapBlock(outlineData(), palette),
    buildMapBlock(makeData({ map: null }), palette),
    buildMapBlock(makeData({ parcelIds: [], map: null }), palette),
  ]

  it.each(blocks.map((block, index) => [index, block] as const))(
    "block %i holds no file:, http: nor https:",
    (_index, block) => {
      expect(block.html).not.toMatch(/file:|https?:/)
    },
  )

  it("escapes a hostile parcel id wherever it is printed", () => {
    const hostile = '"><script>alert(1)</script>'
    const out = buildMapBlock(
      makeData({
        parcelIds: [hostile],
        map: { polygons: [{ ...POLYGONS[0], parcelId: hostile }], basemap: null, frameSize: SIZE },
      }),
      palette,
    )
    expect(out.html).not.toContain("<script>")
    expect(out.html).toContain(escapeHtml(hostile))
  })

  it("writes SVG coordinates from numbers only", () => {
    for (const block of blocks.slice(0, 2)) {
      for (const path of pathsOf(block.html)) expect(path).toMatch(/^[MLZ\d\s.\-]+$/)
    }
  })
})

describe("mapSectionCss", () => {
  const css = mapSectionCss(palette)

  it("prefixes every class with map-", () => {
    const classes = [...css.matchAll(/\.([a-z][\w-]*)/g)].map((match) => match[1])
    expect(classes.length).toBeGreaterThan(0)
    for (const name of classes) expect(name.startsWith("map-")).toBe(true)
  })

  it("uses palette values only and no hex or rgba literal", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
  })

  it("uses no CSS columns and no 1 px filled rule", () => {
    expect(css).not.toContain("column-count")
    expect(css).not.toMatch(/height: 1px/)
  })
})
