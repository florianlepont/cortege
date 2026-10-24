import { FACTOR_KEYS, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import type { FactorKey } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import {
  CHART_MARGIN,
  buildFactorChartBlock,
  buildFactorChartSvg,
  factorChartCss,
} from "./factor-chart-svg"
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

const CAPTIONS = { stand: "Peuplement et gestion : 20 / 35", context: "Contexte : 12 / 15" }
const CAPTION_SIZE = { width: 493, height: 160 }
const CAPTION_PLOT = CAPTION_SIZE.height - CHART_MARGIN.top - 30

function captionTexts(svg: string): { x: number; y: number; text: string; tag: string }[] {
  const found: { x: number; y: number; text: string; tag: string }[] = []
  const pattern = /<text class="chart-caption" x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]*)<\/text>/g
  let match = pattern.exec(svg)
  while (match) {
    found.push({ x: Number(match[1]), y: Number(match[2]), text: match[3], tag: match[0] })
    match = pattern.exec(svg)
  }
  return found
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

  it("rounds the bars with a radius of 4, the outlined ones too", () => {
    const svg = buildFactorChartSvg(entriesOf({ A: 3 }), palette, SIZE)
    expect(bar(svg, "A").tag).toContain('rx="4"')
    expect(bar(svg, "B").tag).toContain('rx="4"')
    expect(bar(svg, "B").tag).toContain('stroke="inkFaint"')
  })

  it("prints no caption without options and keeps the letters at 5 above the bottom", () => {
    const svg = buildFactorChartSvg(allPoints(5), palette, { width: 299, height: 156 })
    expect(svg).not.toContain("chart-caption")
    expect(bar(svg, "A").height).toBe(156 - CHART_MARGIN.top - CHART_MARGIN.bottom)
    expect(letterY(svg, "A")).toBe(156 - 5)
    expect(buildFactorChartSvg(allPoints(3), palette, SIZE, {})).toBe(
      buildFactorChartSvg(allPoints(3), palette, SIZE),
    )
  })

  it("prints two captions in Jost-SemiBold 8 muted ink, one under each group", () => {
    const svg = buildFactorChartSvg(allPoints(3), palette, CAPTION_SIZE, { captions: CAPTIONS })
    const captions = captionTexts(svg)
    expect(captions.map((caption) => caption.text)).toEqual([CAPTIONS.stand, CAPTIONS.context])
    for (const caption of captions) {
      expect(caption.y).toBe(CAPTION_SIZE.height - 3)
      expect(caption.tag).toContain(`font-family="${PDF_FONT_FAMILIES.label}"`)
      expect(caption.tag).toContain('font-size="8"')
      expect(caption.tag).toContain('fill="inkMuted"')
      expect(caption.tag).toContain('text-anchor="middle"')
    }
    const a = bar(svg, "A")
    const g = bar(svg, "G")
    const h = bar(svg, "H")
    const j = bar(svg, "J")
    expect(captions[0].x).toBeCloseTo((a.x + g.x + g.width) / 2, 0)
    expect(captions[1].x).toBeCloseTo((h.x + j.x + j.width) / 2, 0)
  })

  it("makes room for the captions: bottom margin 30 and the letters 13 under the plot", () => {
    const svg = buildFactorChartSvg(allPoints(5), palette, CAPTION_SIZE, { captions: CAPTIONS })
    expect(bar(svg, "A").height).toBe(CAPTION_PLOT)
    expect(bar(svg, "A").y).toBe(CHART_MARGIN.top)
    expect(letterY(svg, "A")).toBe(CHART_MARGIN.top + CAPTION_PLOT + 13)
    const plain = buildFactorChartSvg(allPoints(5), palette, SIZE)
    expect(letterY(plain, "A")).toBe(CHART_MARGIN.top + PLOT + 13)
  })

  it("prints nothing for a group whose caption is null", () => {
    const standOnly = buildFactorChartSvg(allPoints(3), palette, CAPTION_SIZE, {
      captions: { stand: CAPTIONS.stand, context: null },
    })
    expect(captionTexts(standOnly).map((caption) => caption.text)).toEqual([CAPTIONS.stand])
    const none = buildFactorChartSvg(allPoints(5), palette, CAPTION_SIZE, {
      captions: { stand: null, context: null },
    })
    expect(none).not.toContain("chart-caption")
    // The margin is still the caption one: the plot does not jump when a sub-score is missing.
    expect(bar(none, "A").height).toBe(CAPTION_PLOT)
  })

  it("escapes a caption and holds no opacity", () => {
    const svg = buildFactorChartSvg(allPoints(3), palette, CAPTION_SIZE, {
      captions: { stand: '"><script>x</script>', context: CAPTIONS.context },
    })
    expect(svg).not.toContain("<script")
    expect(svg).toContain("&quot;&gt;&lt;script&gt;")
    expect(svg).not.toContain("opacity")
    expect(svg).not.toContain("—")
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

  it("captions the two sub-scores from the survey scores", () => {
    const block = buildFactorChartBlock(
      {
        ...makeData(allPoints(3)),
        scores: { ibp_total: 32, ibp_peuplement_gestion: 20, ibp_contexte: 12 },
      },
      palette,
    )
    expect(block.html).toContain(`>${t.scores.stand(20)}</text>`)
    expect(block.html).toContain(`>${t.scores.context(12)}</text>`)
  })

  it("leaves a caption out when its sub-score is missing or not a number", () => {
    const none = buildFactorChartBlock(makeData(allPoints(3)), palette)
    expect(none.html).not.toContain("chart-caption")
    const partial = buildFactorChartBlock(
      {
        ...makeData(allPoints(3)),
        scores: { ibp_total: 32, ibp_peuplement_gestion: Number.NaN, ibp_contexte: 12 },
      },
      palette,
    )
    expect(partial.html).not.toContain("NaN")
    expect(partial.html).not.toContain(t.scores.stand(Number.NaN))
    expect(partial.html).toContain(`>${t.scores.context(12)}</text>`)
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
