import { FACTOR_KEYS, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import type { FactorKey } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import {
  CHART_MARGIN,
  buildFactorChartBlock,
  buildFactorChartSvg,
  factorChartCss,
} from "./factor-chart-svg"
import { PDF_FONT_FAMILIES } from "./types"
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

type Entries = SurveyExportData["factorEntries"]

const SIZE = { width: 515, height: 150 }
const PLOT = SIZE.height - CHART_MARGIN.top - CHART_MARGIN.bottom

function entriesOf(points: Partial<Record<FactorKey, number | null>>): Entries {
  return FACTOR_KEYS.map((key) => {
    const value = points[key] ?? null
    return [
      key,
      value === null
        ? { selected_class: "Not filled", warnings: [], score_points: null }
        : { selected_class: `S${value}`, warnings: [], score_points: value },
    ] as Entries[number]
  })
}

function allPoints(value: number): Entries {
  return entriesOf(Object.fromEntries(FACTOR_KEYS.map((key) => [key, value])))
}

type Bar = {
  factor: string
  x: number
  y: number
  width: number
  height: number
  tag: string
}

function bars(svg: string): Bar[] {
  const found: Bar[] = []
  const pattern =
    /<rect class="chart-bar[^"]*" data-factor="([A-J])" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*>/g
  let match = pattern.exec(svg)
  while (match) {
    found.push({
      factor: match[1],
      x: Number(match[2]),
      y: Number(match[3]),
      width: Number(match[4]),
      height: Number(match[5]),
      tag: match[0],
    })
    match = pattern.exec(svg)
  }
  return found
}

function bar(svg: string, factor: string): Bar {
  const found = bars(svg).find((candidate) => candidate.factor === factor)
  if (!found) throw new Error(`no bar ${factor}`)
  return found
}

describe("buildFactorChartSvg", () => {
  it("returns one labelled svg with ten bars A to J and ten letters", () => {
    const svg = buildFactorChartSvg(allPoints(3), palette, SIZE)
    expect(svg.match(/<svg /g)).toHaveLength(1)
    expect(svg).toContain('role="img"')
    expect(svg).toContain(`aria-label="${t.scores.chartA11y}"`)
    expect(bars(svg).map((b) => b.factor)).toEqual([...FACTOR_KEYS])
    for (const factor of FACTOR_KEYS) {
      expect(svg).toContain(`>${factor}</text>`)
    }
  })

  it("draws a 5 point bar as tall as the plot and a 0 point bar with no height", () => {
    const svg = buildFactorChartSvg(entriesOf({ A: 5, B: 0, C: 2.5 }), palette, SIZE)
    expect(bar(svg, "A").height).toBe(PLOT)
    expect(bar(svg, "A").y).toBe(CHART_MARGIN.top)
    expect(bar(svg, "B").height).toBe(0)
    expect(bar(svg, "B").y).toBe(CHART_MARGIN.top + PLOT)
    expect(bar(svg, "C").height).toBe(PLOT / 2)
  })

  it("starts every filled bar on the same baseline", () => {
    const svg = buildFactorChartSvg(entriesOf({ A: 1, B: 3, C: 5 }), palette, SIZE)
    for (const factor of ["A", "B", "C"]) {
      const b = bar(svg, factor)
      expect(b.y + b.height).toBe(CHART_MARGIN.top + PLOT)
    }
  })

  it("draws a missing factor as an empty outline in the faint ink", () => {
    const svg = buildFactorChartSvg(entriesOf({ A: 3 }), palette, SIZE)
    const missing = bar(svg, "B")
    expect(missing.tag).toContain('fill="none"')
    expect(missing.tag).toContain('stroke="inkFaint"')
    expect(missing.height).toBe(PLOT)
    expect(bar(svg, "A").tag).not.toContain("stroke=")
  })

  it("prints no value label for a missing factor and the points for the others", () => {
    const svg = buildFactorChartSvg(entriesOf({ A: 4, B: 0 }), palette, SIZE)
    const labels = svg.match(/class="chart-value"[^>]*>(\d)<\/text>/g) ?? []
    expect(labels).toHaveLength(2)
    expect(svg).toContain('class="chart-value"')
    expect(labels[0]).toContain(">4<")
    expect(labels[1]).toContain(">0<")
  })

  it("colours the bars by factorTone mapped to the band colours", () => {
    const svg = buildFactorChartSvg(entriesOf({ A: 1, B: 2, C: 3, D: 4, E: 5 }), palette, SIZE)
    expect(bar(svg, "A").tag).toContain('fill="bandLow"')
    expect(bar(svg, "B").tag).toContain('fill="bandLow"')
    expect(bar(svg, "C").tag).toContain('fill="bandMid"')
    expect(bar(svg, "D").tag).toContain('fill="bandHigh"')
    expect(bar(svg, "E").tag).toContain('fill="bandHigh"')
  })

  it("leaves a wider gap between G and H than between the other bars", () => {
    const svg = buildFactorChartSvg(allPoints(3), palette, SIZE)
    const gap = (left: string, right: string) =>
      bar(svg, right).x - (bar(svg, left).x + bar(svg, left).width)
    const gapGH = gap("G", "H")
    for (const [left, right] of [
      ["A", "B"],
      ["B", "C"],
      ["F", "G"],
      ["H", "I"],
      ["I", "J"],
    ]) {
      expect(gapGH).toBeGreaterThan(gap(left, right))
    }
  })

  it("keeps every bar inside the width", () => {
    const svg = buildFactorChartSvg(allPoints(3), palette, SIZE)
    const all = bars(svg)
    expect(all[0].x).toBeGreaterThanOrEqual(0)
    const last = all[all.length - 1]
    expect(last.x + last.width).toBeLessThanOrEqual(SIZE.width)
  })

  it("uses equal widths for the ten bars", () => {
    const widths = new Set(
      bars(buildFactorChartSvg(allPoints(3), palette, SIZE)).map((b) => b.width),
    )
    expect(widths.size).toBe(1)
  })

  it("writes only plain numbers", () => {
    const svg = buildFactorChartSvg(
      entriesOf({ A: 5, B: Number.NaN, C: Number.POSITIVE_INFINITY, D: -3, E: 99 }),
      palette,
      SIZE,
    )
    expect(svg).not.toContain("NaN")
    expect(svg).not.toContain("Infinity")
    expect(svg).not.toContain("undefined")
    expect(svg).not.toMatch(/="-\d/)
    // Out of range points are clamped to the plot; non-numbers read as missing.
    expect(bar(svg, "D").height).toBe(0)
    expect(bar(svg, "E").height).toBe(PLOT)
    expect(bar(svg, "B").tag).toContain('fill="none"')
    expect(bar(svg, "C").tag).toContain('fill="none"')
  })

  it("reads an empty entry list as ten missing factors", () => {
    const svg = buildFactorChartSvg([], palette, SIZE)
    expect(bars(svg)).toHaveLength(10)
    for (const b of bars(svg)) expect(b.tag).toContain('fill="none"')
  })

  it("holds no user text: only catalogue text, numbers, factor letters and palette values", () => {
    const hostile: Entries = [
      ["A", { selected_class: '"><script>x</script>', warnings: ["<b>"], score_points: 3 }],
    ]
    const svg = buildFactorChartSvg(hostile, palette, SIZE)
    expect(svg).not.toContain("<script")
    expect(svg).not.toContain("<b>")
  })

  it("follows the requested size", () => {
    const small = buildFactorChartSvg(allPoints(5), palette, { width: 300, height: 100 })
    expect(small).toContain('width="300"')
    expect(small).toContain('height="100"')
    expect(bar(small, "A").height).toBe(100 - CHART_MARGIN.top - CHART_MARGIN.bottom)
  })
})

function makeData(entries: Entries): SurveyExportData {
  return {
    surveyId: "survey-1",
    siteName: "Forêt de test",
    parcelIds: [],
    observationYear: 2026,
    versionNumber: 1,
    dateIso: "2026-10-10T08:00:00Z",
    isDraft: false,
    observerName: null,
    method: {
      version: IBP_METHOD_V3_2,
      ibpCas: 1,
      ibpCas3Scale: false,
      regionVersion: null,
      vegetationStage: null,
    },
    scores: null,
    factorEntries: entries,
    generatedAtIso: "2026-10-10T09:00:00Z",
    coordinates: null,
    rawFactors: {},
    photos: { items: [], total: 0, unavailable: 0 },
    map: null,
    history: null,
    assets: { fonts: [], logoDataUri: null },
    layout: { platform: "ios", layoutScale: 1.2487 },
  }
}

describe("buildFactorChartBlock", () => {
  it("wraps the svg with the chart heading and a positive height", () => {
    const block = buildFactorChartBlock(makeData(allPoints(3)), palette)
    expect(block.id).toBe("factor-chart")
    expect(block.height).toBeGreaterThan(SIZE.height)
    expect(block.html).toContain(t.scores.chartHeading)
    expect(block.html).toContain("<svg ")
    expect(block.html).not.toContain("—")
  })
})

describe("factorChartCss", () => {
  const css = factorChartCss(palette)

  it("prefixes every class with chart-", () => {
    const classes = css.match(/\.[A-Za-z][\w-]*/g) ?? []
    expect(classes.length).toBeGreaterThan(0)
    for (const name of classes) expect(name.startsWith(".chart-")).toBe(true)
  })

  it("uses palette colours and the charter fonts, no hex, no CSS columns", () => {
    expect(css).toContain("line")
    expect(css).toContain(PDF_FONT_FAMILIES.heading)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
    expect(css).not.toContain("column-count")
  })
})
