import { FACTOR_KEYS, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import type { FactorKey } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import {
  CHART_MARGIN,
  buildFactorChartBlock,
  buildFactorChartSvg as buildChart,
  chartGroupLabels,
  factorChartCss,
} from "./factor-chart-svg"
import type { ChartGroups } from "./factor-chart-svg"
import { sectionTitleCss } from "./styles"
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

type Entries = SurveyExportData["factorEntries"]

// A fixed groups argument for the tests that are not about the panels.
const GROUPS: ChartGroups = { stand: "Stand", context: "Context", fill: "paper" }
// D-26: the header band of the group panels sits above the 18 of value room.
const HEADER = 16
const TOP = HEADER + CHART_MARGIN.top
const SIZE = { width: 515, height: 150 }
const PLOT = SIZE.height - TOP - CHART_MARGIN.bottom

function buildFactorChartSvg(
  entries: Entries,
  pal: PdfPalette,
  size: { width: number; height: number },
  groups: ChartGroups = GROUPS,
): string {
  return buildChart(entries, pal, size, groups)
}

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

const CHART_SIZE_COMPLETE = { width: 493, height: 160 }
const CHART_SIZE = { width: 299, height: 156 }

type Panel = { group: string; x: number; y: number; width: number; height: number; tag: string }

function panels(svg: string): Panel[] {
  return [
    ...svg.matchAll(
      /<rect class="chart-group" data-group="(\w+)" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*>/g,
    ),
  ].map((m) => ({
    group: m[1],
    x: Number(m[2]),
    y: Number(m[3]),
    width: Number(m[4]),
    height: Number(m[5]),
    tag: m[0],
  }))
}

function letterY(svg: string, factor: string): number {
  const match = svg.match(
    new RegExp(`class="chart-letter"[^>]* y="([\\d.]+)"[^>]*>${factor}</text>`),
  )
  if (!match) throw new Error(`no letter ${factor}`)
  return Number(match[1])
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

  it("carries no namespace url: inline svg needs none and the sheet holds no http (D-08)", () => {
    expect(buildFactorChartSvg(allPoints(3), palette, SIZE)).not.toContain("http")
  })

  it("draws a 5 point bar as tall as the plot and a 0 point bar with no height", () => {
    const svg = buildFactorChartSvg(entriesOf({ A: 5, B: 0, C: 2.5 }), palette, SIZE)
    expect(bar(svg, "A").height).toBe(PLOT)
    expect(bar(svg, "A").y).toBe(TOP)
    expect(bar(svg, "B").height).toBe(0)
    expect(bar(svg, "B").y).toBe(TOP + PLOT)
    expect(bar(svg, "C").height).toBe(PLOT / 2)
  })

  it("starts every filled bar on the same baseline", () => {
    const svg = buildFactorChartSvg(entriesOf({ A: 1, B: 3, C: 5 }), palette, SIZE)
    for (const factor of ["A", "B", "C"]) {
      const b = bar(svg, factor)
      expect(b.y + b.height).toBe(TOP + PLOT)
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

  it("rounds the bars with a radius of 4, the outlined ones too", () => {
    const svg = buildFactorChartSvg(entriesOf({ A: 3 }), palette, SIZE)
    expect(bar(svg, "A").tag).toContain('rx="4"')
    expect(bar(svg, "B").tag).toContain('rx="4"')
    expect(bar(svg, "B").tag).toContain('stroke="inkFaint"')
  })

  it("draws two group panels, A to G and H to J, with the given fill and the line stroke", () => {
    const svg = buildFactorChartSvg(allPoints(3), palette, SIZE)
    const found = panels(svg)
    expect(found.map((p) => p.group)).toEqual(["stand", "context"])
    for (const p of found) {
      expect(p.tag).toContain('rx="8"')
      expect(p.tag).toContain('fill="paper"')
      expect(p.tag).toContain('stroke="line"')
      expect(p.tag).toContain('stroke-width="1"')
      expect(p.y).toBe(0.5)
      expect(p.height).toBe(SIZE.height - 1)
    }
  })

  it("starts the stand panel at 0.5, ends the context panel at the width minus 0.5, 18 between", () => {
    for (const size of [
      { width: 493, height: 160 },
      { width: 299, height: 156 },
    ]) {
      const [stand, context] = panels(buildFactorChartSvg(allPoints(3), palette, size))
      expect(stand.x).toBe(0.5)
      expect(context.x + context.width).toBeCloseTo(size.width - 0.5, 1)
      // Outer edges, the half unit of the stroke included.
      const gap = context.x - 0.5 - (stand.x + stand.width + 0.5)
      expect(gap).toBeCloseTo(18, 1)
    }
  })

  it("keeps each bar inside its panel and every grid line inside one panel", () => {
    const svg = buildFactorChartSvg(allPoints(3), palette, CHART_SIZE)
    const [stand, context] = panels(svg)
    for (const factor of ["A", "B", "C", "D", "E", "F", "G"]) {
      const b = bar(svg, factor)
      expect(b.x).toBeGreaterThanOrEqual(stand.x)
      expect(b.x + b.width).toBeLessThanOrEqual(stand.x + stand.width)
    }
    for (const factor of ["H", "I", "J"]) {
      const b = bar(svg, factor)
      expect(b.x).toBeGreaterThanOrEqual(context.x)
      expect(b.x + b.width).toBeLessThanOrEqual(context.x + context.width)
    }
    const lines = [...svg.matchAll(/<line class="chart-grid" x1="([\d.]+)"[^>]* x2="([\d.]+)"/g)]
    expect(lines).toHaveLength(12)
    for (const [, x1, x2] of lines) {
      const inside = [stand, context].some((p) => Number(x1) >= p.x && Number(x2) <= p.x + p.width)
      expect(inside).toBe(true)
      // Never in the gap between the panels.
      const gapStart = stand.x + stand.width
      expect(Number(x2) <= gapStart || Number(x1) >= context.x).toBe(true)
    }
  })

  it("prints one label per panel, centred, in Jost-SemiBold 8 ink at baseline 11", () => {
    const groups: ChartGroups = {
      stand: "Peuplement et gestion : 20 / 35",
      context: "Contexte : 12 / 15",
      fill: "panel",
    }
    const svg = buildFactorChartSvg(allPoints(3), palette, CHART_SIZE, groups)
    const labels = [
      ...svg.matchAll(
        /<text class="chart-group-label" x="([\d.]+)" y="(\d+)"[^>]*>([^<]*)<\/text>/g,
      ),
    ]
    expect(labels.map((m) => m[3])).toEqual([groups.stand, groups.context])
    const found = panels(svg)
    labels.forEach((match, index) => {
      expect(Number(match[2])).toBe(11)
      // svgNumber rounds to one decimal, so the centre is within a tenth of the panel's.
      expect(
        Math.abs(Number(match[1]) - (found[index].x - 0.5 + (found[index].width + 1) / 2)),
      ).toBeLessThanOrEqual(0.1)
      expect(match[0]).toContain(`font-family="${PDF_FONT_FAMILIES.label}"`)
      expect(match[0]).toContain('font-size="8"')
      expect(match[0]).toContain('fill="ink"')
      expect(match[0]).toContain('text-anchor="middle"')
    })
    expect(svg).not.toContain("chart-caption")
  })

  it("puts the plot top at 34 and the bars at 108 and 104 high", () => {
    const complete = buildFactorChartSvg(allPoints(5), palette, CHART_SIZE_COMPLETE)
    expect(bar(complete, "A").y).toBe(34)
    expect(bar(complete, "A").height).toBe(108)
    expect(letterY(complete, "A")).toBe(34 + 108 + 13)
    const summary = buildFactorChartSvg(allPoints(5), palette, CHART_SIZE)
    expect(bar(summary, "A").y).toBe(34)
    expect(bar(summary, "A").height).toBe(104)
    expect(letterY(summary, "A")).toBe(34 + 104 + 13)
    for (const svg of [complete, summary]) {
      const baselines = new Set(bars(svg).map((b) => b.y + b.height))
      expect(baselines.size).toBe(1)
    }
  })

  it("holds no opacity, no gradient and no external reference at either size", () => {
    for (const size of [CHART_SIZE_COMPLETE, CHART_SIZE]) {
      const svg = buildFactorChartSvg(entriesOf({ A: 5, B: 2, H: 3 }), palette, size)
      expect(svg).not.toContain("opacity")
      expect(svg).not.toContain("Gradient")
      expect(svg).not.toContain("url(")
      expect(svg).not.toContain("http")
      expect(svg).not.toContain("—")
    }
  })

  it("escapes a hostile label and a hostile fill", () => {
    const svg = buildFactorChartSvg(allPoints(3), palette, CHART_SIZE_COMPLETE, {
      stand: '"><script>x</script>',
      context: "<b>Contexte</b>",
      fill: '"><script>y</script>',
    })
    expect(svg).not.toContain("<script")
    expect(svg).not.toContain("<b>")
    expect(svg).toContain("&quot;&gt;&lt;script&gt;x")
    expect(svg).toContain('fill="&quot;&gt;&lt;script&gt;y')
  })

  it("follows the requested size", () => {
    const small = buildFactorChartSvg(allPoints(5), palette, { width: 300, height: 100 })
    expect(small).toContain('width="300"')
    expect(small).toContain('height="100"')
    expect(bar(small, "A").height).toBe(100 - TOP - CHART_MARGIN.bottom)
  })
})

function makeData(entries: Entries): SurveyExportData {
  return {
    mode: "complete",
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
    conditions: { note: null, weather: null },
    route: null,
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

  it("is 214 units high: padding 20, heading 24, chart 160, margin 10", () => {
    const block = buildFactorChartBlock(makeData(allPoints(3)), palette)
    expect(block.height).toBe(214)
    expect(block.html).toContain('width="493"')
    expect(block.html).toContain('height="160"')
  })

  it("labels the two panels from the survey scores, on the paper fill of the chart card", () => {
    const block = buildFactorChartBlock(
      {
        ...makeData(allPoints(3)),
        scores: { ibp_total: 32, ibp_peuplement_gestion: 20, ibp_contexte: 12 },
      },
      palette,
    )
    expect(block.html).toContain(`>${t.scores.stand(20)}</text>`)
    expect(block.html).toContain(`>${t.scores.context(12)}</text>`)
    expect(block.html.match(/class="chart-group" [^>]*fill="paper"/g)).toHaveLength(2)
    expect(block.html).not.toContain("chart-caption")
  })

  it("prints the group name alone when a sub-score is missing", () => {
    const none = buildFactorChartBlock(makeData(allPoints(3)), palette)
    expect(none.html).toContain(">Peuplement et gestion</text>")
    expect(none.html).toContain(">Contexte</text>")
    const partial = buildFactorChartBlock(
      {
        ...makeData(allPoints(3)),
        scores: { ibp_total: 32, ibp_peuplement_gestion: Number.NaN, ibp_contexte: 12 },
      },
      palette,
    )
    expect(partial.html).not.toContain("NaN")
    expect(partial.html).toContain(">Peuplement et gestion</text>")
    expect(partial.html).toContain(`>${t.scores.context(12)}</text>`)
  })
})

describe("chartGroupLabels", () => {
  it("prints the domain sub-scores out of 35 and 15", () => {
    expect(
      chartGroupLabels({ ibp_total: 34, ibp_peuplement_gestion: 24, ibp_contexte: 10 }),
    ).toEqual({ stand: "Peuplement et gestion : 24 / 35", context: "Contexte : 10 / 15" })
  })

  it("never sums: a total that does not match the sub-scores is not used", () => {
    const labels = chartGroupLabels({ ibp_total: 50, ibp_peuplement_gestion: 1, ibp_contexte: 2 })
    expect(labels).toEqual({
      stand: "Peuplement et gestion : 1 / 35",
      context: "Contexte : 2 / 15",
    })
  })

  it("gives the group name alone for a null, missing or NaN sub-score", () => {
    expect(
      chartGroupLabels({
        ibp_total: 0,
        ibp_peuplement_gestion: null,
        ibp_contexte: Number.NaN,
      } as never),
    ).toEqual({ stand: "Peuplement et gestion", context: "Contexte" })
    expect(chartGroupLabels({ ibp_total: 0 } as never)).toEqual({
      stand: "Peuplement et gestion",
      context: "Contexte",
    })
    expect(chartGroupLabels(null)).toEqual({ stand: "Peuplement et gestion", context: "Contexte" })
  })
})

describe("factorChartCss", () => {
  const css = factorChartCss(palette)

  it("prefixes every class with chart-", () => {
    const classes = css.match(/\.[A-Za-z][\w-]*/g) ?? []
    expect(classes.length).toBeGreaterThan(0)
    for (const name of classes) expect(name.startsWith(".chart-")).toBe(true)
  })

  it("takes the section title rule, the card radius 12 and the 160 high svg", () => {
    expect(css).toContain(sectionTitleCss(".chart-heading", palette))
    expect(css).toContain("border-radius: 12px")
    expect(css).not.toContain("border-radius: 6px")
    expect(css).toContain(".chart-svg { display: block; width: 493px; height: 160px; }")
  })

  it("uses palette colours and the charter fonts, no hex, no CSS columns", () => {
    expect(css).toContain("line")
    expect(css).toContain(PDF_FONT_FAMILIES.heading)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
    expect(css).not.toContain("column-count")
  })
})
