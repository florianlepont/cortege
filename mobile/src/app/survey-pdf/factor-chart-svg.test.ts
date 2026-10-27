import {
  CONTEXT_BAND_CUT_OFFS,
  FACTOR_KEYS,
  IBP_MAX,
  STAND_BAND_CUT_OFFS,
} from "@cortege/ibp-domain"

import {
  exportFixtureV30Draft,
  exportFixtureV32Submitted,
} from "../../../test/survey-export-fixtures"
import { fr } from "../../i18n"
import {
  buildFactorChartBlock,
  chartGroupLabels,
  factorChartCss,
  planeInput,
  roseInput,
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
  "forest",
  "forestDeep",
  "onForest",
  "onForestAccent",
  "onForestBody",
  "contourSage",
  "contourMoss",
  "zoneLow",
  "zoneLowSoft",
  "zoneMid",
  "zoneHighSoft",
  "zoneHigh",
  "contextInk",
] as const

// Fake palette: each value is its key name, so a rule can be traced without any colour literal.
const palette = Object.fromEntries(PALETTE_KEYS.map((key) => [key, key])) as PdfPalette

const joined = (values: readonly number[]) =>
  t.charts.joinList({ items: values.map((value) => String(value)) })

describe("planeInput", () => {
  it("places a scored survey at its two domain sub-scores, with the package's zones", () => {
    const input = planeInput(exportFixtureV32Submitted)
    expect(input.stand).toBe(20)
    expect(input.context).toBe(12)
    expect(input.standZones.map((zone) => zone.from)).toEqual([0, ...STAND_BAND_CUT_OFFS])
    expect(input.standZones[input.standZones.length - 1].to).toBe(IBP_MAX.stand)
    expect(input.contextLevels.map((level) => level.from)).toEqual([0, ...CONTEXT_BAND_CUT_OFFS])
    expect(input.contextLevels[input.contextLevels.length - 1].to).toBe(IBP_MAX.context)
  })

  it("titles the axes with the sub-scores", () => {
    const input = planeInput(exportFixtureV32Submitted)
    expect(input.xTitle).toBe("Peuplement et gestion : 20 / 35")
    expect(input.yTitle).toBe("Contexte : 12 / 15")
  })

  it("words the spoken label from the band names and the package's cut points", () => {
    expect(planeInput(exportFixtureV32Submitted).label).toBe(
      t.charts.planeA11y({
        stand: "20",
        standMax: String(IBP_MAX.stand),
        standBand: "moyenne",
        context: "12",
        contextMax: String(IBP_MAX.context),
        contextBand: "forte",
        standCuts: joined(STAND_BAND_CUT_OFFS),
        contextCuts: joined(CONTEXT_BAND_CUT_OFFS),
      }),
    )
    expect(planeInput(exportFixtureV32Submitted).label).toContain("7, 14, 21 et 28 sur 35")
  })

  it("places nobody without scores: no sub-score, group names alone, the empty label", () => {
    const input = planeInput({ ...exportFixtureV32Submitted, scores: null })
    expect(input.stand).toBeNull()
    expect(input.context).toBeNull()
    expect(input.xTitle).toBe("Peuplement et gestion")
    expect(input.yTitle).toBe("Contexte")
    expect(input.label).toBe(
      t.charts.planeA11yEmpty({
        standCuts: joined(STAND_BAND_CUT_OFFS),
        standMax: String(IBP_MAX.stand),
        contextCuts: joined(CONTEXT_BAND_CUT_OFFS),
        contextMax: String(IBP_MAX.context),
      }),
    )
  })

  it("does not place the survey when one sub-score is missing, keeping the other title", () => {
    const partial = planeInput({
      ...exportFixtureV32Submitted,
      scores: { ibp_total: 32, ibp_peuplement_gestion: 20, ibp_contexte: Number.NaN },
    })
    expect(partial.stand).toBe(20)
    expect(partial.context).toBeNull()
    expect(partial.xTitle).toBe("Peuplement et gestion : 20 / 35")
    expect(partial.yTitle).toBe("Contexte")
    expect(partial.label).toContain("Score non renseigné")
    expect(partial.label).not.toContain("NaN")
  })

  it("never sums: a total that does not match the sub-scores is not used", () => {
    const input = planeInput({
      ...exportFixtureV32Submitted,
      scores: { ibp_total: 50, ibp_peuplement_gestion: 1, ibp_contexte: 2 },
    })
    expect([input.stand, input.context]).toEqual([1, 2])
  })
})

describe("roseInput", () => {
  it("has rings at the scores every factor may take, each in its factor tone", () => {
    expect(roseInput(exportFixtureV32Submitted).rings).toEqual([
      { value: 0, tone: "low" },
      { value: 2, tone: "low" },
      { value: 5, tone: "high" },
    ])
  })

  it("has ten items A to J with the app's titles, the points and the groups", () => {
    const { items } = roseInput(exportFixtureV32Submitted)
    expect(items.map((item) => item.factor)).toEqual([...FACTOR_KEYS])
    expect(items.map((item) => item.title)).toEqual(
      FACTOR_KEYS.map((key) => fr.labels.factorTitles[key]),
    )
    expect(items.map((item) => item.points)).toEqual([3, 2, 4, 1, 3, 2, 5, 4, 2, 1])
    expect(items.map((item) => item.group)).toEqual([
      "stand",
      "stand",
      "stand",
      "stand",
      "stand",
      "stand",
      "stand",
      "context",
      "context",
      "context",
    ])
  })

  it("gives a missing factor null points and says so in the spoken label", () => {
    const input = roseInput(exportFixtureV30Draft)
    const [i, j] = input.items.slice(8)
    expect([i.points, j.points]).toEqual([null, null])
    expect(input.label).toContain("Milieux aquatiques non renseigné")
    expect(input.label).toContain("Milieux rocheux non renseigné")
    expect(input.label.startsWith("Score par facteur, anneaux à 0, 2 et 5 points : ")).toBe(true)
    expect(input.label).toContain("Essences autochtones 3")
  })

  it("treats an absent entry and a non-finite point as missing", () => {
    const input = roseInput({
      ...exportFixtureV32Submitted,
      factorEntries: [["A", { selected_class: "S", warnings: [], score_points: Number.NaN }]],
    })
    expect(input.items.every((item) => item.points === null)).toBe(true)
  })
})

describe("buildFactorChartBlock", () => {
  const block = buildFactorChartBlock(exportFixtureV32Submitted, palette)

  it("is the registry's factor-chart block, 228 units high", () => {
    expect(block.id).toBe("factor-chart")
    expect(block.height).toBe(228)
    expect(block.html).not.toContain(String.fromCharCode(0x2014))
  })

  it("holds the heading, the plane then the rose in one row, then the source line", () => {
    const html = block.html
    expect(html.startsWith('<section class="chart-card">')).toBe(true)
    expect(html).toContain(`<h2 class="chart-heading">${t.charts.heading}</h2>`)
    const plane = html.indexOf('<svg class="chart-plane"')
    const rose = html.indexOf('<svg class="chart-rose"')
    const source = html.indexOf('<div class="chart-source">')
    expect(html.indexOf('<div class="chart-row">')).toBeLessThan(plane)
    expect(plane).toBeLessThan(rose)
    expect(rose).toBeLessThan(source)
    expect(html).toContain('width="272" height="160" viewBox="0 0 272 160"')
    expect(html).toContain('width="209" height="160" viewBox="0 0 209 160"')
  })

  it("titles the plane and the rose on the paper fill", () => {
    expect(block.html).toContain(">IBP contexte face à l&#39;IBP peuplement et gestion</text>")
    expect(block.html).toContain(`>${t.scores.chartHeading}</text>`)
    expect(block.html.match(/<rect x="0.5" y="0.5"[^>]*fill="paper"/g)).toHaveLength(2)
  })

  it("prints the source line in full and names neither the acronyms nor an image", () => {
    expect(block.html).toContain(
      "Graphiques d&#39;après la fiche de relevé IBP du Centre national de la propriété forestière et de l&#39;unité de recherche Dynafor.",
    )
    expect(block.html).not.toMatch(/CNPF|INRAE|<img|<image/)
  })

  it("draws no bar and no group panel", () => {
    expect(block.html).not.toMatch(/chart-(bar|group|letter)/)
  })

  it("labels both charts for a screen reader", () => {
    expect(block.html.match(/role="img"/g)).toHaveLength(2)
    expect(block.html).toContain("Le relevé se place à 20 sur 35")
    expect(block.html).toContain("anneaux à 0, 2 et 5 points")
  })

  it("draws a draft with missing factors without a false zero", () => {
    const draft = buildFactorChartBlock(exportFixtureV30Draft, palette)
    expect(draft.html.match(/class="rose-vertex"/g)).toHaveLength(8)
    expect(draft.html.match(/stroke-dasharray="2 2"/g)?.length).toBeGreaterThanOrEqual(2)
    expect(draft.height).toBe(228)
  })

  it("escapes a hostile palette value and hostile scores text", () => {
    const hostile = buildFactorChartBlock(
      { ...exportFixtureV32Submitted },
      { ...palette, accent: '"><script>x</script>' },
    )
    expect(hostile.html).not.toContain("<script")
    expect(hostile.html).toContain("&quot;&gt;&lt;script&gt;x")
  })

  it("holds no transparency, ramp, pattern, transform, script or resource", () => {
    const data: SurveyExportData[] = [exportFixtureV32Submitted, exportFixtureV30Draft]
    for (const item of data) {
      const html = buildFactorChartBlock(item, palette).html
      expect(html).not.toMatch(
        /opacity|gradient|<pattern|transform=|filter=|<script|http|rgba?\(|#[0-9a-f]{6}/i,
      )
    }
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

  it("takes the section title rule and the card radius 12", () => {
    expect(css).toContain(sectionTitleCss(".chart-heading", palette))
    expect(css).toContain("border-radius: 12px")
    expect(css).not.toContain("border-radius: 6px")
  })

  it("positions the row, the plane and the rose, and fixes the source line to one 12 high line", () => {
    expect(css).toContain(".chart-row { position: relative; width: 493px; height: 160px; }")
    expect(css).toContain(
      ".chart-plane { position: absolute; left: 0; top: 0; display: block; width: 272px; height: 160px; }",
    )
    expect(css).toContain(
      ".chart-rose { position: absolute; left: 284px; top: 0; display: block; width: 209px; height: 160px; }",
    )
    expect(css).toMatch(
      /\.chart-source \{ height: 12px; overflow: hidden; white-space: nowrap; font-family: Jost-Regular; font-size: 8px; line-height: 12px; color: inkMuted; \}/,
    )
  })

  it("uses palette colours and the charter fonts, no hex, no CSS columns", () => {
    expect(css).toContain("line")
    expect(css).toContain(PDF_FONT_FAMILIES.heading)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
    expect(css).not.toContain("column-count")
  })
})
