import { escapeHtml } from "./html"
import { fr } from "../../i18n"
import { MAP_FRAME_RADIUS, buildMapFigure, mapFigureCss } from "./map-figure"
import type { MapFigure } from "./map-figure"
import {
  boundsOfRings,
  chooseScaleBar,
  fitFrameToBounds,
  metresPerPixel,
  ringsToPathD,
} from "./map-projection"
import type { MapFrame } from "./map-projection"
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
  "warning",
  "warningSoft",
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

type MapData = NonNullable<SurveyExportData["map"]>
type Polygons = MapData["polygons"]

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

const SIZE = { width: 515, height: 250 }
const SUMMARY_SIZE = { width: 515, height: 228 }
const JPEG = "data:image/jpeg;base64,QUJDREVGRw=="

function snapshotFrame(size = SIZE): MapFrame {
  const bounds = boundsOfRings(POLYGONS.flatMap((polygon) => polygon.rings))!
  return fitFrameToBounds(bounds, size, {
    paddingRatio: 0.1,
    zoomRange: { min: 13, max: 17 },
  })
}

function withBasemap(frame: MapFrame, dataUri = JPEG, size = SIZE): MapData {
  return { polygons: POLYGONS, basemap: { dataUri, frame }, frameSize: size }
}

function outline(size = SIZE): MapData {
  return { polygons: POLYGONS, basemap: null, frameSize: size }
}

function figureOf(map: MapData | null): Extract<MapFigure, { kind: "figure" }> {
  const figure = buildMapFigure(map, palette)
  if (figure.kind !== "figure") throw new Error("expected a figure")
  return figure
}

function pathsOf(html: string): string[] {
  return [...html.matchAll(/<path class="map-parcel"[^>]* d="([^"]*)"/g)].map((match) => match[1])
}

describe("buildMapFigure without geometry", () => {
  it("is noGeometry when the map is null", () => {
    expect(buildMapFigure(null, palette)).toEqual({ kind: "noGeometry" })
  })

  it("is noGeometry when the map has no polygon", () => {
    expect(buildMapFigure({ polygons: [], basemap: null, frameSize: SIZE }, palette)).toEqual({
      kind: "noGeometry",
    })
  })

  it("is noGeometry when the polygons hold no finite point", () => {
    const map: MapData = {
      polygons: [{ parcelId: "X", rings: [[[Number.NaN, 1]]] }],
      basemap: null,
      frameSize: SIZE,
    }
    expect(buildMapFigure(map, palette)).toEqual({ kind: "noGeometry" })
  })
})

describe.each([
  ["515 x 250", SIZE],
  ["515 x 228", SUMMARY_SIZE],
])("buildMapFigure with a basemap at %s", (_label, size) => {
  const frame = snapshotFrame(size)
  const figure = figureOf(withBasemap(frame, JPEG, size))

  it("carries the basemap's own frame and says there is a basemap", () => {
    expect(figure.hasBasemap).toBe(true)
    expect(figure.frame).toEqual(frame)
    expect(figure.frame.width).toBe(size.width)
    expect(figure.frame.height).toBe(size.height)
  })

  it("is one frame div of that size holding the image and the overlay", () => {
    expect(figure.html.startsWith('<div class="map-frame"')).toBe(true)
    expect(figure.html).toContain(`style="width: ${frame.width}px; height: ${frame.height}px"`)
    const image = figure.html.match(/<img [^>]*>/)![0]
    expect(image).toContain(`src="${JPEG}"`)
    expect(image).toContain(`width="${frame.width}"`)
    expect(image).toContain(`height="${frame.height}"`)
    expect(figure.html).not.toContain("map-canvas")
    expect(figure.html).toContain(`viewBox="0 0 ${frame.width} ${frame.height}"`)
  })

  it("draws one path per polygon, projected with the snapshot frame", () => {
    expect(pathsOf(figure.html)).toEqual(
      POLYGONS.map((polygon) => ringsToPathD(polygon.rings, frame)),
    )
    expect(figure.html).toContain("fill: parcelFill")
    expect(figure.html).toContain("stroke: parcelStroke")
    expect(figure.html).toContain('fill-rule="evenodd"')
  })

  it("keeps every polygon corner inside the frame", () => {
    const numbers = pathsOf(figure.html)
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
})

describe("buildMapFigure furniture", () => {
  const frame = snapshotFrame()
  const figure = figureOf(withBasemap(frame))

  it("draws a scale bar labelled with its round distance, the label clear of the line", () => {
    const bar = chooseScaleBar(metresPerPixel(frame.centerLat, frame.zoom), frame.width)
    expect(figure.html).toContain(escapeHtml(t.map.scaleValue({ metres: String(bar.metres) })))
    const label = figure.html.match(/<text class="map-scale-label"[^>]* y="([\d.]+)"/)!
    const line = figure.html.match(/<line class="map-scale-line"[^>]* y1="([\d.]+)"/)!
    // The baseline of the label sits at least 8 units above the line (font 9: no collision).
    expect(Number(line[1]) - Number(label[1])).toBeGreaterThanOrEqual(8)
  })

  it("draws the north arrow with the N", () => {
    expect(figure.html).toContain('class="map-north"')
    expect(figure.html).toContain(`>${escapeHtml(t.map.north)}</text>`)
  })

  it("prints kilometres from 1000 m", () => {
    const wide: MapFrame = { ...frame, zoom: 12 }
    const out = figureOf(withBasemap(wide))
    const bar = chooseScaleBar(metresPerPixel(wide.centerLat, wide.zoom), wide.width)
    expect(bar.metres).toBeGreaterThanOrEqual(1000)
    expect(out.html).toContain(escapeHtml(t.map.scaleKm({ km: String(bar.metres / 1000) })))
  })

  it("drops a scale bar that would run over half the frame", () => {
    const tiny: MapFrame = { ...frame, zoom: 22 }
    expect(figureOf(withBasemap(tiny)).html).not.toContain("map-scale-line")
  })
})

describe("the corner radius", () => {
  it("is 12, in the CSS clip and in the overlay border", () => {
    expect(MAP_FRAME_RADIUS).toBe(12)
    expect(mapFigureCss(palette)).toContain(
      `.map-frame { position: relative; border-radius: ${MAP_FRAME_RADIUS}px; overflow: hidden; }`,
    )
    const html = figureOf(withBasemap(snapshotFrame())).html
    // The 1 px stroke sits half a unit inside the frame, so its radius is half a unit smaller.
    expect(html).toMatch(/<rect class="map-border"[^>]* rx="11\.5"/)
  })
})

describe("buildMapFigure with a basemap that is not a JPEG data URI", () => {
  it.each([
    "https://example.test/map.jpg",
    "http://example.test/map.jpg",
    "file:///a.jpg",
    'data:image/jpeg;base64,AB"onload=',
    "data:image/png;base64,QUJD",
    "",
  ])("falls back to the outline for %p", (dataUri) => {
    const figure = figureOf(withBasemap(snapshotFrame(), dataUri))
    expect(figure.hasBasemap).toBe(false)
    expect(figure.html).not.toContain("<img")
    expect(figure.html).not.toContain(dataUri === "" ? "src=" : dataUri)
    expect(figure.html).not.toMatch(/file:|https?:/)
    expect(figure.html).toContain("fill: mapCanvas")
  })
})

describe("buildMapFigure outline only", () => {
  const expectedFrame = fitFrameToBounds(
    boundsOfRings(POLYGONS.flatMap((polygon) => polygon.rings))!,
    SIZE,
    { paddingRatio: 0.1, zoomRange: null },
  )
  const figure = figureOf(outline())

  it("has no image, the pale canvas and the polygons fitted exactly", () => {
    expect(figure.hasBasemap).toBe(false)
    expect(figure.html).not.toContain("<img")
    expect(figure.html).toContain("fill: mapCanvas")
    expect(figure.frame.width).toBe(SIZE.width)
    expect(figure.frame.height).toBe(SIZE.height)
    expect(pathsOf(figure.html)).toEqual(
      POLYGONS.map((polygon) => ringsToPathD(polygon.rings, expectedFrame)),
    )
  })

  it("has the scale bar and the north arrow", () => {
    expect(figure.html).toContain("map-scale-line")
    expect(figure.html).toContain('class="map-north"')
  })

  it("follows the frame size of the data", () => {
    const summary = figureOf(outline(SUMMARY_SIZE))
    expect(summary.frame.height).toBe(228)
    expect(summary.html).toContain('viewBox="0 0 515 228"')
  })

  it("keeps a very small parcel at a zoom whose scale bar fits", () => {
    const small: MapData = {
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
    }
    const out = figureOf(small)
    expect(out.frame.zoom).toBeLessThanOrEqual(19)
    const line = out.html.match(
      /<line class="map-scale-line" x1="([\d.]+)" y1="[\d.]+" x2="([\d.]+)"/,
    )!
    expect(Number(line[2]) - Number(line[1])).toBeLessThanOrEqual(SIZE.width / 2)
  })
})

describe("safety", () => {
  it("writes SVG coordinates from numbers only", () => {
    for (const map of [withBasemap(snapshotFrame()), outline()]) {
      for (const path of pathsOf(figureOf(map).html)) expect(path).toMatch(/^[MLZ\d\s.-]+$/)
    }
  })

  it("holds no file:, http: nor https: for a good basemap or an outline", () => {
    for (const map of [withBasemap(snapshotFrame()), outline()]) {
      expect(figureOf(map).html).not.toMatch(/file:|https?:/)
    }
  })
})

describe("mapFigureCss", () => {
  const css = mapFigureCss(palette)

  it("prefixes every class with map-", () => {
    const classes = [...css.matchAll(/\.([a-z][\w-]*)/g)].map((match) => match[1])
    expect(classes.length).toBeGreaterThan(0)
    for (const name of classes) expect(name.startsWith("map-")).toBe(true)
  })

  it("uses no hex or rgba literal, no CSS columns and no 1 px filled rule", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
    expect(css).not.toContain("column-count")
    expect(css).not.toMatch(/height: 1px/)
  })
})
