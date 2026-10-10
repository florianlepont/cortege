import { buildEntriesFromOwn, buildParcelHistory } from "../parcel-history"
import type { ParcelHistoryModel } from "../parcel-history"
import { TREND_HEIGHT, TREND_YEAR_BASELINE, buildTrend } from "../trend-geometry"
import { fr } from "../../i18n"
import { ownItem, V30, V32 } from "../../../test/parcel-history-fixtures"
import { TREND_PRINT_WIDTH, buildTrendSvg } from "./trend-section"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfPalette } from "./types"

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

const t = fr.surveyExport.trend

function scored(total: number) {
  return { ibp_peuplement_gestion: Math.min(35, total), ibp_contexte: 0, ibp_total: total }
}

function modelOf(
  items: ReturnType<typeof ownItem>[],
  currentId: string | null = null,
): ParcelHistoryModel {
  return buildParcelHistory(buildEntriesFromOwn(items, currentId))
}

const countOf = (html: string, pattern: RegExp): number => (html.match(pattern) ?? []).length

describe("TREND_PRINT_WIDTH", () => {
  it("is the content width of the page in design units", () => {
    expect(TREND_PRINT_WIDTH).toBe(515)
  })
})

describe("buildTrendSvg", () => {
  const items = [
    ownItem("a", { observation_year: 2020, scores: scored(20) }),
    ownItem("b", { observation_year: 2022, scores: scored(28) }),
    ownItem("c", { observation_year: 2024, scores: scored(34) }),
  ]

  it("is one accessible svg sized to the print width", () => {
    const svg = buildTrendSvg(modelOf(items, "c"), palette)
    expect(countOf(svg, /<svg\b/g)).toBe(1)
    expect(svg).toContain('role="img"')
    expect(svg).toContain(`aria-label="${t.curveA11y}"`)
    expect(svg).toContain(`viewBox="0 0 ${TREND_PRINT_WIDTH} ${TREND_HEIGHT}"`)
    expect(svg).toContain(`width="${TREND_PRINT_WIDTH}"`)
    expect(svg).toContain(`height="${TREND_HEIGHT}"`)
  })

  it("draws one solid accent path through points of one method", () => {
    const model = modelOf(items, "c")
    const geometry = buildTrend(model.drawn, TREND_PRINT_WIDTH)
    const svg = buildTrendSvg(model, palette)
    expect(geometry.segments).toHaveLength(1)
    expect(countOf(svg, /class="trend-segment"/g)).toBe(1)
    expect(svg).toContain(`d="${geometry.segments[0].d}"`)
    expect(svg).toMatch(/class="trend-segment"[^>]*stroke="accent"/)
    expect(svg).not.toContain("stroke-dasharray")
    expect(svg).not.toContain("trend-link")
  })

  it("draws a circle per point, the current one emphasised", () => {
    const svg = buildTrendSvg(modelOf(items, "c"), palette)
    expect(countOf(svg, /<circle\b/g)).toBe(3)
    expect(countOf(svg, /class="trend-point-current"/g)).toBe(1)
    expect(countOf(svg, /class="trend-point"/g)).toBe(2)
    expect(svg).toMatch(/class="trend-point-current"[^>]*r="6"/)
    expect(svg).toMatch(/class="trend-point"[^>]*r="4"/)
  })

  it("prints each year below and each total above its point", () => {
    const model = modelOf(items, "c")
    const geometry = buildTrend(model.drawn, TREND_PRINT_WIDTH)
    const svg = buildTrendSvg(model, palette)
    expect(countOf(svg, /class="trend-year"/g)).toBe(3)
    expect(countOf(svg, /class="trend-value"/g)).toBe(3)
    for (const year of ["2020", "2022", "2024"]) expect(svg).toContain(`>${year}</text>`)
    for (const total of ["20", "28", "34"]) expect(svg).toContain(`>${total}</text>`)
    expect(svg).toContain(`y="${TREND_YEAR_BASELINE}"`)
    expect(geometry.points).toHaveLength(3)
    expect(svg).toContain(`font-family="${PDF_FONT_FAMILIES.numeral}"`)
    expect(svg).toContain(`font-family="${PDF_FONT_FAMILIES.label}"`)
  })

  it("prints the unknown-year sign when a survey has no year", () => {
    const svg = buildTrendSvg(
      modelOf([items[0], ownItem("b", { observation_year: null, scores: scored(28) })], "b"),
      palette,
    )
    expect(svg).toContain(`>${fr.parcelHistory.page.trend.unknownYear}</text>`)
  })

  it("cuts the line at a method change and links the runs with a dashed path", () => {
    const mixed = [
      ownItem("a", { ibp_method_version: V30, observation_year: 2018, scores: scored(18) }),
      ownItem("b", { ibp_method_version: V30, observation_year: 2020, scores: scored(22) }),
      ownItem("c", { ibp_method_version: V32, observation_year: 2022, scores: scored(30) }),
      ownItem("d", { ibp_method_version: V32, observation_year: 2024, scores: scored(36) }),
    ]
    const model = modelOf(mixed, "d")
    const geometry = buildTrend(model.drawn, TREND_PRINT_WIDTH)
    const svg = buildTrendSvg(model, palette)
    expect(geometry.segments).toHaveLength(2)
    expect(geometry.links).toHaveLength(1)
    expect(countOf(svg, /class="trend-segment"/g)).toBe(2)
    expect(countOf(svg, /class="trend-link"/g)).toBe(1)
    expect(svg).toContain(`d="${geometry.links[0].d}"`)
    expect(svg).toMatch(/class="trend-link"[^>]*stroke-dasharray="4 4"/)
    expect(svg).toMatch(/class="trend-link"[^>]*stroke="inkMuted"/)
  })

  it("gives a lone point one circle and no path", () => {
    const svg = buildTrendSvg(modelOf([ownItem("a", { scores: scored(25) })], "a"), palette)
    expect(countOf(svg, /<circle\b/g)).toBe(1)
    expect(svg).not.toContain("<path")
    expect(svg).toContain("trend-point-current")
  })

  it("draws nothing for an empty model but stays a valid svg", () => {
    const svg = buildTrendSvg(modelOf([]), palette)
    expect(svg).toContain("<svg")
    expect(svg).not.toContain("<circle")
    expect(svg).not.toContain("<path")
    expect(svg).toContain("</svg>")
  })

  it("keeps only the latest eight surveys, as the screen does", () => {
    const many = Array.from({ length: 11 }, (_, index) =>
      ownItem(`s${index}`, { observation_year: 2010 + index, scores: scored(10 + index) }),
    )
    const svg = buildTrendSvg(modelOf(many, "s10"), palette)
    expect(countOf(svg, /<circle\b/g)).toBe(8)
    expect(svg).not.toContain(">2010</text>")
    expect(svg).toContain(">2020</text>")
  })

  it("writes every coordinate through svgNumber: no scientific notation, no NaN", () => {
    const svg = buildTrendSvg(
      modelOf(
        [
          ownItem("a", { scores: { ...scored(1), ibp_total: Number.NaN } }),
          ownItem("b", { scores: scored(33.333333) }),
        ],
        "b",
      ),
      palette,
    )
    expect(svg).not.toMatch(/NaN|Infinity|e[+-]\d/)
    expect(svg).not.toMatch(/\d\.\d{2,}/)
  })

  it("holds no link, script nor event handler", () => {
    const svg = buildTrendSvg(modelOf(items, "c"), palette)
    expect(svg).not.toMatch(/https?:|<script|onerror/)
  })

  it("clamps an out-of-range total to the 0..50 scale", () => {
    const svg = buildTrendSvg(
      modelOf([ownItem("a", { scores: scored(400) }), ownItem("b", { scores: scored(25) })], "b"),
      palette,
    )
    expect(svg).toContain(">50</text>")
  })
})
