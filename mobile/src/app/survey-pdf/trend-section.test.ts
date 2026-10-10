import { FACTOR_KEYS } from "@cortege/ibp-domain"
import { buildEntriesFromOwn, buildParcelHistory } from "../parcel-history"
import type { ParcelHistoryModel } from "../parcel-history"
import { TREND_HEIGHT, TREND_YEAR_BASELINE, buildTrend } from "../trend-geometry"
import { fr } from "../../i18n"
import { factorResults, ownItem, V30, V32 } from "../../../test/parcel-history-fixtures"
import { escapeHtml, formatDateFr } from "./html"
import { TREND_PRINT_WIDTH, buildTrendBlock, buildTrendSvg, trendSectionCss } from "./trend-section"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfPalette, SurveyExportData } from "./types"

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

// The geometry writes two decimals; the print writes one, through svgNumber.
const oneDecimal = (d: string): string =>
  d.replace(/-?\d+(?:\.\d+)?/g, (match) => String(Math.round(Number(match) * 10) / 10))

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
    expect(svg).toContain(`d="${oneDecimal(geometry.segments[0].d)}"`)
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
    expect(svg).toContain(`d="${oneDecimal(geometry.links[0].d)}"`)
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

// ---- the block ------------------------------------------------------------------------------

const pt = fr.parcelHistory.page
const FETCHED_AT = "2026-10-09T08:30:00Z"

type Items = ReturnType<typeof ownItem>[]

function makeData(overrides: Partial<SurveyExportData> = {}): SurveyExportData {
  return {
    surveyId: "c",
    siteName: "Forêt de test",
    parcelIds: ["940750000AB0352"],
    observationYear: 2024,
    versionNumber: 3,
    dateIso: "2024-10-10T08:00:00Z",
    isDraft: false,
    observerName: null,
    method: {
      version: V32,
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
    map: null,
    history: null,
    assets: { fonts: [], logoDataUri: null },
    layout: { platform: "ios", layoutScale: 1.2487 },
    ...overrides,
  }
}

const withHistory = (items: Items, overrides: Partial<SurveyExportData> = {}) =>
  makeData({ history: { fetchedAt: FETCHED_AT, items }, ...overrides })

/** A text as it appears in the HTML (the catalogue texts hold apostrophes). */
const printed = (text: string): string => escapeHtml(text)

const history3: Items = [
  ownItem("a", {
    observation_year: 2020,
    scores: scored(22),
    factor_results: factorResults({ A: 2, B: 3, C: 1, D: 4, E: 0, F: 5, G: 2, H: 3, I: 1, J: 2 }),
  }),
  ownItem("b", {
    observation_year: 2022,
    scores: scored(28),
    factor_results: factorResults({ A: 3, B: 3, C: 2, D: 4, E: 1, F: 5, G: 3, H: 3, I: 2, J: 2 }),
  }),
  ownItem("c", {
    observation_year: 2024,
    scores: scored(34),
    factor_results: factorResults({ A: 4, B: 3, C: 2, D: 5, E: 1, F: 4, G: 3, H: 3, I: 2, J: 3 }),
  }),
]

describe("buildTrendBlock notes", () => {
  it("is a note when the survey has no parcel", () => {
    const block = buildTrendBlock(withHistory(history3, { parcelIds: [] }), palette)
    expect(block.id).toBe("trend")
    expect(block.height).toBeGreaterThan(0)
    expect(block.html).toContain(printed(t.heading))
    expect(block.html).toContain(printed(t.noParcel))
    expect(block.html).not.toContain("<svg")
    expect(block.html).not.toContain("trend-cached")
  })

  it("is a note when no history is cached", () => {
    const block = buildTrendBlock(makeData({ history: null }), palette)
    expect(block.html).toContain(printed(t.unavailable))
    expect(block.html).not.toContain("<svg")
    expect(block.height).toBeGreaterThan(0)
  })

  it("is a note for the first survey of the parcel, with an empty or a lone current history", () => {
    for (const items of [[], [ownItem("c")]]) {
      const block = buildTrendBlock(withHistory(items), palette)
      expect(block.html).toContain(printed(t.first))
      expect(block.html).not.toContain("<svg")
    }
  })

  it("prefers the no-parcel note over an unavailable history", () => {
    const block = buildTrendBlock(makeData({ parcelIds: [], history: null }), palette)
    expect(block.html).toContain(printed(t.noParcel))
    expect(block.html).not.toContain(printed(t.unavailable))
  })
})

describe("buildTrendBlock with a history", () => {
  it("prints the heading, the summary line, the curve and the cache date", () => {
    const block = buildTrendBlock(withHistory(history3), palette)
    expect(block.html).toContain(printed(t.heading))
    expect(block.html).toContain(printed(pt.trend.titleStrong(12)))
    expect(block.html).toContain(printed(pt.trend.titleAccent(2020)))
    expect(countOf(block.html, /<svg\b/g)).toBe(1)
    expect(block.html).toContain(printed(t.cachedAt({ date: formatDateFr(FETCHED_AT, "") })))
    expect(block.height).toBeGreaterThan(0)
    expect(block.html).not.toMatch(/https?:/)
  })

  it("says no change when the totals are equal", () => {
    const flat: Items = [
      ownItem("a", { observation_year: 2022, scores: scored(30) }),
      ownItem("c", { observation_year: 2024, scores: scored(30) }),
    ]
    const block = buildTrendBlock(withHistory(flat), palette)
    expect(block.html).toContain(printed(pt.trend.titleStrong(0)))
  })

  it("words a fall in points with the minus sign of the screen", () => {
    const fall: Items = [
      ownItem("a", { observation_year: 2022, scores: scored(34) }),
      ownItem("c", { observation_year: 2024, scores: scored(30) }),
    ]
    const block = buildTrendBlock(withHistory(fall), palette)
    expect(block.html).toContain(printed(pt.trend.titleStrong(-4)))
  })

  it("prints the ten factors A to J against the survey just before", () => {
    const block = buildTrendBlock(withHistory(history3), palette)
    expect(block.html).toContain(printed(t.deltaHeading({ year: "2022" })))
    expect(block.html).toContain(printed(pt.deltas.total({ delta: 6, current: 34, previous: 28 })))
    expect(countOf(block.html, /class="trend-delta-row"/g)).toBe(10)
    for (const factor of FACTOR_KEYS) expect(block.html).toContain(`data-factor="${factor}"`)
    // A went from 3 to 4: four points out of five, +1.
    expect(block.html).toMatch(/data-factor="A"[^]*?4 \/ 5[^]*?\+1/)
    // B is unchanged.
    expect(block.html).toMatch(/data-factor="B"[^]*?3 \/ 5[^]*?=/)
    // F fell from 5 to 4.
    expect(block.html).toMatch(/data-factor="F"[^]*?4 \/ 5[^]*?-1/)
  })

  it("uses the heading without a year when the survey before has none", () => {
    const noYear: Items = [
      ownItem("b", {
        observation_year: null,
        scores: scored(28),
        factor_results: factorResults({ A: 3 }),
      }),
      ownItem("c", {
        observation_year: 2024,
        scores: scored(34),
        factor_results: factorResults({ A: 4 }),
      }),
    ]
    const block = buildTrendBlock(withHistory(noYear), palette)
    expect(block.html).toContain(printed(t.deltaHeadingNoYear))
    expect(block.html).not.toContain(printed(t.deltaHeading({ year: "2022" })))
  })

  it("prints the unfilled factors and missing deltas as such", () => {
    const sparse: Items = [
      ownItem("b", {
        observation_year: 2022,
        scores: scored(28),
        factor_results: factorResults({ A: 3 }),
      }),
      ownItem("c", {
        observation_year: 2024,
        scores: scored(34),
        factor_results: factorResults({ A: 4 }),
      }),
    ]
    const block = buildTrendBlock(withHistory(sparse), palette)
    expect(countOf(block.html, /class="trend-delta-row"/g)).toBe(10)
    expect(block.html).toContain(printed(pt.deltas.none))
    expect(block.html).toContain(printed(fr.surveyExport.scores.notFilled))
  })

  it("explains a method change between the two surveys instead of a factor table", () => {
    const changed: Items = [
      ownItem("b", { ibp_method_version: V30, observation_year: 2022, scores: scored(28) }),
      ownItem("c", { ibp_method_version: V32, observation_year: 2024, scores: scored(34) }),
    ]
    const block = buildTrendBlock(withHistory(changed), palette)
    expect(block.html).toContain(printed(t.differentMethod))
    expect(block.html).not.toContain("trend-delta-row")
    expect(block.html).toContain(printed(pt.trend.newMethodStrong("v3.2")))
    expect(block.html).toContain(printed(pt.trend.newMethodAccent(2024)))
    expect(block.html).toContain(printed(pt.trend.mixed))
  })

  it("adds the mixed-methods sentence on a curve that spans both methods", () => {
    const mixed: Items = [
      ownItem("a", { ibp_method_version: V30, observation_year: 2018, scores: scored(18) }),
      ownItem("b", { ibp_method_version: V32, observation_year: 2020, scores: scored(22) }),
      ownItem("c", { ibp_method_version: V32, observation_year: 2024, scores: scored(30) }),
    ]
    const block = buildTrendBlock(withHistory(mixed), palette)
    expect(block.html).toContain(printed(pt.trend.mixed))
    expect(block.html).toContain("trend-link")
    const same = buildTrendBlock(withHistory(history3), palette)
    expect(same.html).not.toContain(printed(pt.trend.mixed))
  })

  it("has no per-factor table when the survey before has no scores", () => {
    const bare: Items = [
      ownItem("b", { observation_year: 2022, scores: undefined as never }),
      ownItem("c", { observation_year: 2024, scores: scored(34) }),
    ]
    const block = buildTrendBlock(withHistory(bare), palette)
    expect(block.html).not.toContain("trend-delta-row")
    expect(block.html).not.toContain(printed(t.differentMethod))
    expect(block.html).toContain("<svg")
  })

  it("handles a draft that is not in the history: curve of the past, no factor table", () => {
    const block = buildTrendBlock(
      withHistory(history3, { surveyId: "draft-1", isDraft: true }),
      palette,
    )
    expect(block.html).toContain("<svg")
    expect(block.html).not.toContain("trend-delta-row")
    expect(countOf(block.html, /trend-point-current/g)).toBe(0)
  })

  it("omits the cache line when the date is unreadable", () => {
    const data = withHistory(history3)
    const block = buildTrendBlock(
      { ...data, history: { fetchedAt: "not a date", items: history3 } },
      palette,
    )
    expect(block.html).not.toContain("trend-cached")
    expect(block.html).toContain("<svg")
  })

  it("grows with the factor table: more height than a note", () => {
    const full = buildTrendBlock(withHistory(history3), palette)
    const note = buildTrendBlock(makeData(), palette)
    expect(full.height).toBeGreaterThan(note.height)
    expect(full.height).toBeLessThan(420)
  })
})

describe("trendSectionCss", () => {
  const css = trendSectionCss(palette)

  it("prefixes every class with trend- and uses palette values only", () => {
    const classes = css.match(/\.[a-z][\w-]*/g) ?? []
    expect(classes.length).toBeGreaterThan(0)
    for (const name of classes) expect(name.startsWith(".trend-")).toBe(true)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
    expect(css).toContain("ink")
  })

  it("avoids what iOS print does not draw: column-count and 1 px filled divs", () => {
    expect(css).not.toContain("column-count")
    expect(css).toContain(PDF_FONT_FAMILIES.heading)
  })
})
