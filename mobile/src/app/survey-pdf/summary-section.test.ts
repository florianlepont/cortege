import {
  exportFixtureSummary,
  exportFixtureSummaryWorst,
  summaryVariant,
} from "../../../test/survey-export-fixtures"
import type { SummaryVariantKind } from "../../../test/survey-export-fixtures"
import { fr } from "../../i18n"
import { escapeHtml, formatDateFr } from "./html"
import { buildMapFigure, mapFigureCss } from "./map-figure"
import { paginateBlocks } from "./paginate"
import type { PageChrome } from "./paginate"
import { PDF_CLASS } from "./styles"
import { SUMMARY_ZONES, buildSummaryBlocks, summaryCss } from "./summary-section"
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

const typical = exportFixtureSummary
const worst = exportFixtureSummaryWorst

const CHROME: PageChrome = {
  siteName: "Bois de la Colline",
  isDraft: false,
  generatedAtText: "10 octobre 2026",
}

const VARIANTS: SummaryVariantKind[] = [
  "noBasemap",
  "noGeometry",
  "noParcel",
  "noHistory",
  "firstSurvey",
  "staleCache",
]

const ALL_FIXTURES: Array<[string, SurveyExportData]> = [
  ["exportFixtureSummary", typical],
  ["exportFixtureSummaryWorst", worst],
  ...VARIANTS.map((kind): [string, SurveyExportData] => [kind, summaryVariant(kind)]),
]

function htmlOf(data: SurveyExportData): string {
  return buildSummaryBlocks(data, palette)[0].html
}

function withData(patch: Partial<SurveyExportData>): SurveyExportData {
  return { ...typical, ...patch }
}

describe("the block", () => {
  test("is one summary page style block of 764 units", () => {
    const blocks = buildSummaryBlocks(typical, palette)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].id).toBe("summary")
    expect(blocks[0].pageStyle).toBe("summary")
    expect(blocks[0].height).toBe(764)
    expect(blocks[0].html.startsWith('<div class="summary-page">')).toBe(true)
  })

  test("SUMMARY_ZONES holds the five zones of UI-SPEC B.10 and is frozen", () => {
    expect(SUMMARY_ZONES).toEqual({
      title: [0, 88],
      score: [100, 176],
      map: [288, 264],
      evolution: [564, 168],
      sources: [740, 24],
    })
    expect(Object.isFrozen(SUMMARY_ZONES)).toBe(true)
    expect(Object.isFrozen(SUMMARY_ZONES.title)).toBe(true)
  })

  test("the zones, the 12 unit gaps and the 8 spare sum to 764, every value on the 4-grid", () => {
    const { title, score, map, evolution, sources } = SUMMARY_ZONES
    expect(score[0]).toBe(title[0] + title[1] + 12)
    expect(map[0]).toBe(score[0] + score[1] + 12)
    expect(evolution[0]).toBe(map[0] + map[1] + 12)
    expect(sources[0]).toBe(evolution[0] + evolution[1] + 8)
    expect(sources[0] + sources[1]).toBe(764)
    for (const [offset, height] of Object.values(SUMMARY_ZONES)) {
      expect(offset % 4).toBe(0)
      expect(height % 4).toBe(0)
    }
  })

  test("every zone is written with its offset, height and hidden overflow", () => {
    const css = summaryCss(palette)
    const { title, score, map, evolution, sources } = SUMMARY_ZONES
    expect(css).toMatch(/\.summary-zone \{[^}]*overflow: hidden/)
    expect(css).toContain(`.summary-zone-title { top: ${title[0]}px; height: ${title[1]}px; }`)
    expect(css).toContain(`.summary-zone-score { top: ${score[0]}px; height: ${score[1]}px; }`)
    expect(css).toContain(`.summary-zone-map { top: ${map[0]}px; height: ${map[1]}px; }`)
    expect(css).toContain(
      `.summary-zone-evolution { top: ${evolution[0]}px; height: ${evolution[1]}px; }`,
    )
    expect(css).toContain(
      `.summary-zone-sources { top: ${sources[0]}px; height: ${sources[1]}px; }`,
    )
    expect(css).toMatch(/\.summary-page \{[^}]*width: 515px; height: 764px; overflow: hidden/)
  })
})

describe("Z1, the title band", () => {
  test("inlines the logo at 72 x 72 from (0, 0) when it is a base64 PNG or JPEG data URI", () => {
    const html = htmlOf(typical)
    expect(html).toContain('<img class="summary-logo" alt=""')
    expect(html).toContain(`src="${typical.assets.logoDataUri}"`)
    expect(summaryCss(palette)).toMatch(
      /\.summary-logo \{[^}]*left: 0; top: 0; width: 72px; height: 72px/,
    )
    const jpeg = withData({
      assets: { ...typical.assets, logoDataUri: "data:image/jpeg;base64,/9j/AAAA" },
    })
    expect(htmlOf(jpeg)).toContain('<img class="summary-logo"')
  })

  test.each([
    ["null", null],
    ["a remote url", "https://example.com/logo.png"],
    ["an svg data uri", "data:image/svg+xml;base64,AAAA"],
    ["a png with a quote", 'data:image/png;base64,AAAA"onerror="x'],
  ])(
    "prints no logo image for a logo that is %s, and the texts move to the left edge",
    (_name, logo) => {
      const html = htmlOf(withData({ assets: { ...typical.assets, logoDataUri: logo } }))
      expect(html).not.toContain('<img class="summary-logo"')
      expect(html).not.toContain("https:")
      expect(html).toContain('class="summary-eyebrow summary-bare"')
      expect(html).toContain('class="summary-title summary-bare"')
      expect(html).toContain('class="summary-meta summary-bare"')
      expect(summaryCss(palette)).toMatch(/\.summary-bare \{ left: 0; width: 515px; \}/)
    },
  )

  test("with the logo the texts stay at x 88 in a 427 unit column", () => {
    const html = htmlOf(typical)
    expect(html).not.toContain("summary-bare")
    const css = summaryCss(palette)
    expect(css).toMatch(/\.summary-eyebrow \{[^}]*left: 88px; top: 4px/)
    expect(css).toMatch(/\.summary-title \{[^}]*left: 88px; top: 16px; width: 427px; height: 56px/)
    expect(css).toMatch(/\.summary-meta \{[^}]*left: 88px; top: 72px; width: 427px/)
  })

  test("prints the eyebrow, the long date, the site name and the meta line", () => {
    const html = htmlOf(typical)
    expect(html).toContain(`<div class="summary-eyebrow">${t.summary.eyebrow}</div>`)
    const date = formatDateFr(typical.dateIso, t.identity.unknown)
    expect(html).toContain(`<div class="summary-date">${date}</div>`)
    expect(html).toContain('<div class="summary-title">Bois de la Colline</div>')
    expect(html).toContain(
      `<div class="summary-meta">${t.summary.metaLine({
        commune: "77186",
        parcels: "77186000AB0001",
        version: "2",
      })}</div>`,
    )
  })

  test("an unreadable date prints the unknown text", () => {
    expect(htmlOf(withData({ dateIso: "not a date" }))).toContain(
      `<div class="summary-date">${t.identity.unknown}</div>`,
    )
  })

  test("a name of 48 characters keeps the title size, 49 takes the long one", () => {
    expect(htmlOf(withData({ siteName: "a".repeat(48) }))).toContain('<div class="summary-title">')
    expect(htmlOf(withData({ siteName: "a".repeat(49) }))).toContain(
      '<div class="summary-title summary-title-long">',
    )
    const css = summaryCss(palette)
    expect(css).toMatch(
      /\.summary-title \{[^}]*font-family: Sora-SemiBold; font-size: 24px; line-height: 28px; color: accent/,
    )
    expect(css).toMatch(
      /\.summary-title-long \{[^}]*height: 48px; font-size: 20px; line-height: 24px/,
    )
  })

  test("the 64 character worst name is printed whole in the long title", () => {
    expect(worst.siteName).toHaveLength(64)
    const html = htmlOf(worst)
    expect(html).toContain("summary-title summary-title-long")
    expect(html).toContain(`>${escapeHtml(worst.siteName)}</div>`)
  })

  test("a name beyond 72 characters is shortened by the builder with one ellipsis", () => {
    const html = htmlOf(withData({ siteName: `${"Forêt ".repeat(20)}fin` }))
    const title = /<div class="summary-title[^"]*">([^<]*)<\/div>/.exec(html)?.[1] ?? ""
    expect(title.length).toBeLessThanOrEqual(72)
    expect(title.endsWith("…")).toBe(true)
    expect(title).not.toContain("fin")
  })

  test("the meta line of three parcels names the commune of the first one", () => {
    const html = htmlOf(worst)
    const meta = /<div class="summary-meta">([^<]*)<\/div>/.exec(html)?.[1] ?? ""
    expect(meta).toBe(
      t.summary.metaLine({
        commune: "77186",
        parcels: worst.parcelIds.join(", "),
        version: "2",
      }),
    )
    expect(meta.length).toBeLessThanOrEqual(95)
  })

  test("a long id list is shortened to 95 characters with the ellipsis", () => {
    const ids = Array.from(
      { length: 12 },
      (_v, index) => `77186000AB01${String(index).padStart(2, "0")}`,
    )
    const html = htmlOf(withData({ parcelIds: ids }))
    const meta = /<div class="summary-meta">([^<]*)<\/div>/.exec(html)?.[1] ?? ""
    expect(meta.length).toBeLessThanOrEqual(95)
    expect(meta.endsWith("…")).toBe(true)
    expect(meta.startsWith("Commune 77186, parcelle 77186000AB0100")).toBe(true)
  })

  test("a missing commune, parcel or version reads as a feminine missing value", () => {
    const html = htmlOf(withData({ parcelIds: [], versionNumber: null, map: null }))
    expect(html).toContain(
      `<div class="summary-meta">${t.summary.metaLine({
        commune: "non renseignée",
        parcels: "non renseignée",
        version: "non renseignée",
      })}</div>`,
    )
  })

  test("an id that is not a cadastral id gives no commune", () => {
    expect(htmlOf(withData({ parcelIds: ["abc"] }))).toContain(
      "Commune non renseignée, parcelle abc, version 2",
    )
  })

  test("a one unit line rule closes the band at y 88", () => {
    expect(htmlOf(typical)).toContain('<div class="summary-rule"></div>')
    expect(summaryCss(palette)).toMatch(
      /\.summary-rule \{[^}]*top: 88px; width: 515px; height: 1px; background: line/,
    )
  })
})

describe("Z2 left, the forest card", () => {
  test("is 200 x 176, radius 16, on forest, with the eyebrow at (16, 12)", () => {
    const css = summaryCss(palette)
    expect(css).toMatch(
      /\.summary-score-card \{[^}]*width: 200px; height: 176px;[^}]*border-radius: 16px; background: forest/,
    )
    expect(css).toMatch(
      /\.summary-card-eyebrow \{[^}]*left: 16px; top: 12px;[^}]*color: onForestBody/,
    )
    expect(htmlOf(typical)).toContain(`<div class="summary-card-eyebrow">${t.scores.title}</div>`)
  })

  test("draws a 112 ring of stroke 8 with the forest track and arc, ratio total / 50", () => {
    const html = htmlOf(typical)
    expect(html).toContain('class="ring-svg"')
    expect(html).toContain('width="112" height="112"')
    expect(html).toContain('stroke-width="8"')
    expect(html).toContain('stroke="forestDeep"')
    expect(html).toContain('stroke="onForestAccent"')
    // 32 / 50 of the circumference 2 * pi * 52 = 326.7.
    expect(html).toContain('stroke-dasharray="209.1 326.7"')
    expect(html).toContain(`aria-label="${t.cover.scoreA11y({ points: "32", max: "50" })}"`)
    expect(summaryCss(palette)).toMatch(/\.summary-ring \{[^}]*left: 44px; top: 24px; width: 112px/)
  })

  test("centres the numeral and the unit in a 112 box with a flex column and no gap", () => {
    const css = summaryCss(palette)
    expect(css).toMatch(
      /\.summary-ring-value \{[^}]*left: 44px; top: 24px; width: 112px; height: 112px; display: flex; flex-direction: column; align-items: center; justify-content: center/,
    )
    expect(css).not.toMatch(/\bgap:/)
    expect(htmlOf(typical)).toContain(
      `<span class="summary-numeral">32</span><span class="summary-outof">${t.cover.outOf({ max: "50" })}</span>`,
    )
  })

  test("the numeral is Sora-Light 40 / 44 with letter-spacing -2 on onForest", () => {
    expect(summaryCss(palette)).toMatch(
      /\.summary-numeral \{[^}]*font-family: Sora-Light; font-size: 40px; line-height: 44px; letter-spacing: -2px; color: onForest/,
    )
    expect(summaryCss(palette)).toMatch(
      /\.summary-outof \{[^}]*font-family: Jost-Regular; font-size: 12px;[^}]*color: onForestBody/,
    )
  })

  test("prints the band line at y 140 and the sub-scores at y 156", () => {
    const html = htmlOf(typical)
    expect(html).toContain(
      `<div class="summary-band">${t.scores.band({ band: "assez forte" })}</div>`,
    )
    expect(html).toContain(
      `<div class="summary-subscores">${t.summary.subscores({ stand: "20", context: "12" })}</div>`,
    )
    const css = summaryCss(palette)
    expect(css).toMatch(
      /\.summary-band \{[^}]*top: 140px;[^}]*text-align: center;[^}]*onForestAccent/,
    )
    expect(css).toMatch(
      /\.summary-subscores \{[^}]*top: 156px;[^}]*text-align: center;[^}]*onForestBody/,
    )
  })

  test("without a total the ring is empty, the numeral gives way to the unknown text, no band", () => {
    const html = htmlOf(withData({ scores: null }))
    expect(html).toContain(`<span class="summary-noscore">${t.scores.notFilled}</span>`)
    expect(html).not.toContain("summary-numeral")
    expect(html).not.toContain("summary-outof")
    expect(html).not.toContain("summary-band")
    expect(html).not.toContain("summary-subscores")
    expect(html).toContain('class="ring-track"')
    expect(html).not.toContain('class="ring-arc"')
    expect(html).toContain(`aria-label="${t.scores.title} : ${t.scores.notFilled}"`)
  })

  test("a sub-score that is not a number leaves the sub-scores line out", () => {
    const scores = { ibp_total: 32, ibp_peuplement_gestion: 20, ibp_contexte: Number.NaN }
    const html = htmlOf(withData({ scores }))
    expect(html).toContain("summary-numeral")
    expect(html).toContain("summary-band")
    expect(html).not.toContain("summary-subscores")
  })
})

describe("Z2 right, the plane (D-28)", () => {
  test("holds the plane title as heading and the 299 x 156 plane at (216, 0), no rose, no bar", () => {
    const html = htmlOf(typical)
    expect(html).toContain(`<div class="summary-heading">${escapeHtml(t.charts.planeTitle)}</div>`)
    expect(html).toContain('<svg class="chart-plane"')
    expect(html).toContain('width="299" height="156" viewBox="0 0 299 156"')
    expect(html).not.toContain("chart-rose")
    expect(html).not.toMatch(/chart-(bar|group)/)
    expect(html).not.toContain(t.scores.chartHeading)
    const css = summaryCss(palette)
    expect(css).toMatch(/\.summary-chart \{[^}]*left: 216px; top: 0; width: 299px/)
    expect(css).toMatch(/\.summary-chart-box \{[^}]*top: 20px; width: 299px; height: 156px/)
    expect(css).toMatch(/\.summary-chart-box svg \{ display: block; \}/)
    expect(css).toMatch(
      /\.summary-heading \{[^}]*height: 20px;[^}]*font-family: Sora-SemiBold; font-size: 11px; line-height: 20px; color: ink/,
    )
  })

  test("has no title band: the panel is the page's `panel` fill and the plot starts at 18", () => {
    const html = htmlOf(typical)
    expect(html).toMatch(
      /<svg class="chart-plane"[^>]*><rect [^>]*width="298" height="155"[^>]*fill="panel"/,
    )
    expect(html).not.toContain(`>${t.charts.planeTitle}</text>`)
  })

  test("places the survey at its two sub-scores with the axis titles carrying them", () => {
    const html = htmlOf(typical)
    const stand = typical.scores?.ibp_peuplement_gestion ?? 0
    const context = typical.scores?.ibp_contexte ?? 0
    expect(html).toContain(`>${t.scores.stand(stand)}</text>`)
    expect(html).toContain(`>${t.scores.context(context)}</text>`)
    expect(html).toContain('class="plane-marker"')
  })

  test("a survey with no score prints the plane without a marker and the group names alone", () => {
    const html = htmlOf(withData({ scores: null }))
    expect(html).toContain('<svg class="chart-plane"')
    expect(html).not.toContain("plane-marker")
    expect(html).toContain(">Peuplement et gestion</text>")
    expect(html).toContain(">Contexte</text>")
  })

  test("a survey with no factor still prints the plane (it reads the sub-scores, not the factors)", () => {
    const html = htmlOf(withData({ factorEntries: [] }))
    expect(html).toContain("plane-marker")
  })
})

describe("Z3, the map", () => {
  const mapBlockOf = (html: string) =>
    /<div class="summary-zone summary-zone-map">(.*?)<\/div><div class="summary-zone summary-zone-evolution">/s.exec(
      html,
    )?.[1] ?? ""

  test("heading at y 0, the figure in a 515 x 228 box at y 20 and the legend line at y 248", () => {
    const html = htmlOf(typical)
    const zone = mapBlockOf(html)
    expect(zone.startsWith(`<div class="summary-heading">${t.summary.mapHeading}</div>`)).toBe(true)
    expect(zone).toContain('<div class="summary-map-box"><div class="map-frame"')
    expect(zone).toContain(`<div class="summary-legend">${t.map.parcels} 77186000AB0001</div>`)
    const css = summaryCss(palette)
    expect(css).toMatch(
      /\.summary-map-box \{[^}]*top: 20px; width: 515px; height: 228px; overflow: hidden/,
    )
    expect(css).toMatch(/\.summary-legend \{[^}]*top: 248px;[^}]*height: 16px;[^}]*color: inkMuted/)
  })

  test("the legend lists every parcel of the survey", () => {
    expect(htmlOf(worst)).toContain(`${t.map.parcels} ${worst.parcelIds.join(", ")}</div>`)
  })

  test("a long parcel list is shortened to 110 characters with the ellipsis", () => {
    const ids = Array.from(
      { length: 12 },
      (_v, index) => `77186000AB01${String(index).padStart(2, "0")}`,
    )
    const html = htmlOf(withData({ parcelIds: ids }))
    const legend = /<div class="summary-legend">([^<]*)<\/div>/.exec(html)?.[1] ?? ""
    expect(legend.length).toBeLessThanOrEqual(110)
    expect(legend.endsWith("…")).toBe(true)
  })

  test("with no basemap the figure is the outline, and the legend carries the outline-only sentence", () => {
    const html = htmlOf(summaryVariant("noBasemap"))
    expect(html).toContain('class="map-canvas"')
    expect(html).not.toContain("map-image")
    expect(html).toContain(`<div class="summary-legend">${t.map.outlineOnly}</div>`)
    expect(html).not.toContain(`>${t.map.parcels} 77186000AB0001<`)
  })

  test("with parcels but no geometry the zone is a quiet panel with the no-outline sentence", () => {
    const html = htmlOf(summaryVariant("noGeometry"))
    const zone = mapBlockOf(html)
    expect(zone).toContain(
      `<div class="summary-quiet" style="top: 20px; height: 228px">${t.map.noOutline}</div>`,
    )
    expect(zone).not.toContain("summary-legend")
    expect(zone).not.toContain("map-frame")
  })

  test("with no parcel the zone is a quiet panel with the no-parcel sentence", () => {
    const html = htmlOf(summaryVariant("noParcel"))
    const zone = mapBlockOf(html)
    expect(zone).toContain(
      `<div class="summary-quiet" style="top: 20px; height: 228px">${t.map.noParcel}</div>`,
    )
    expect(zone).not.toContain("summary-legend")
  })

  test("the quiet panel is a panel box with a 1 unit line, radius 12 and a centred 9 unit sentence", () => {
    expect(summaryCss(palette)).toMatch(
      /\.summary-quiet \{[^}]*width: 515px;[^}]*display: flex; align-items: center; justify-content: center; text-align: center; border: 1px solid line; border-radius: 12px; background: panel; font-family: Jost-Regular; font-size: 9px;[^}]*color: inkMuted/,
    )
  })
})

describe("Z4, the evolution", () => {
  const evolutionOf = (html: string) =>
    /<div class="summary-zone summary-zone-evolution">(.*?)<\/div><div class="summary-zone summary-zone-sources">/s.exec(
      html,
    )?.[1] ?? ""

  test("a ready trend prints the summary line and the curve at y 40", () => {
    const zone = evolutionOf(htmlOf(typical))
    expect(zone.startsWith(`<div class="summary-heading">${t.trend.heading}</div>`)).toBe(true)
    expect(zone).toContain(
      '<div class="summary-trend-line"><span class="summary-trend-strong">+8 points</span><span class="summary-trend-rest"> depuis 2023</span></div>',
    )
    expect(zone).toContain('<div class="summary-trend-box"><svg class="trend-svg"')
    expect(zone).not.toContain("summary-quiet")
    const css = summaryCss(palette)
    expect(css).toMatch(/\.summary-trend-box \{[^}]*top: 40px; width: 515px; height: 128px/)
    expect(css).toMatch(
      /\.summary-trend-line \{[^}]*top: 20px;[^}]*height: 20px;[^}]*font-size: 13px/,
    )
    expect(css).toMatch(/\.summary-trend-strong \{ font-family: Sora-ExtraBold; color: accent/)
    expect(css).toMatch(/\.summary-trend-rest \{ font-family: Jost-Regular; color: ink/)
  })

  test("the worst history of six points draws its curve with the method link", () => {
    const zone = evolutionOf(htmlOf(worst))
    expect(zone).toContain("trend-svg")
    expect(zone).toContain("trend-link")
    expect(zone).toContain("+12 points")
  })

  test("a first survey prints its quiet panel and no summary line", () => {
    const zone = evolutionOf(htmlOf(summaryVariant("firstSurvey")))
    expect(zone).toContain(
      `<div class="summary-quiet" style="top: 40px; height: 128px">${escapeHtml(t.trend.first)}</div>`,
    )
    expect(zone).not.toContain("summary-trend-line")
    expect(zone).not.toContain("trend-svg")
  })

  test.each<SummaryVariantKind>(["noHistory", "staleCache"])(
    "%s prints the unavailable panel and never the app instruction",
    (kind) => {
      const html = htmlOf(summaryVariant(kind))
      const zone = evolutionOf(html)
      expect(zone).toContain(
        `<div class="summary-quiet" style="top: 40px; height: 128px">${t.summary.trendUnavailable}</div>`,
      )
      expect(zone).not.toContain("summary-trend-line")
      expect(zone).not.toContain("trend-svg")
      expect(html).not.toContain(escapeHtml(t.trend.unavailable))
      expect(html).not.toContain(t.trend.cachedAt({ date: "" }).slice(0, 30))
    },
  )

  test("a survey with no parcel prints the no-parcel sentence of the trend", () => {
    expect(evolutionOf(htmlOf(summaryVariant("noParcel")))).toContain(
      `style="top: 40px; height: 128px">${escapeHtml(t.trend.noParcel)}</div>`,
    )
  })

  test("a change of method prints the new-method line over the curve", () => {
    const items = (typical.history?.items ?? []).map((item, index) =>
      index === 1 ? { ...item, ibp_method_version: null } : item,
    )
    const zone = evolutionOf(
      htmlOf(withData({ history: { fetchedAt: typical.history?.fetchedAt ?? "", items } })),
    )
    expect(zone).toContain('<span class="summary-trend-strong">Passage à la méthode v3.2</span>')
    expect(zone).toContain('<span class="summary-trend-rest"> en 2026</span>')
    expect(zone).toContain("trend-svg")
  })
})

describe("Z5, the sources", () => {
  const sourcesOf = (html: string) =>
    /<div class="summary-zone summary-zone-sources">(.*?)<\/div><\/div>$/s.exec(html)?.[1] ?? ""

  test("prints the cache date and the basemap source when the curve and the basemap exist", () => {
    const zone = sourcesOf(htmlOf(typical))
    expect(zone).toContain(
      `<div class="summary-source">${escapeHtml(t.trend.cachedAt({ date: formatDateFr(typical.history?.fetchedAt ?? "", "") }))}</div>`,
    )
    expect(zone).toContain(`<div class="summary-source">${escapeHtml(t.map.source)}</div>`)
    expect(zone.indexOf("Historique")).toBeLessThan(zone.indexOf("Fond de carte"))
    expect(summaryCss(palette)).toMatch(
      /\.summary-source \{[^}]*height: 12px;[^}]*font-size: 8px; line-height: 12px; color: inkMuted/,
    )
  })

  test("leaves out the basemap source when there is no basemap", () => {
    const zone = sourcesOf(htmlOf(summaryVariant("noBasemap")))
    expect(zone).toContain("Historique enregistré")
    expect(zone).not.toContain("Fond de carte")
  })

  test("leaves out the cache date when the curve is not drawn", () => {
    for (const kind of ["noHistory", "firstSurvey", "staleCache"] as const) {
      const zone = sourcesOf(htmlOf(summaryVariant(kind)))
      expect(zone).not.toContain("Historique enregistré")
    }
    expect(sourcesOf(htmlOf(summaryVariant("firstSurvey")))).toContain("Fond de carte")
  })

  test("is empty when neither line applies", () => {
    expect(sourcesOf(htmlOf(summaryVariant("noHistory"))).includes("Fond de carte")).toBe(true)
    const none = withData({ map: null, history: null })
    expect(htmlOf(none)).toContain('<div class="summary-zone summary-zone-sources"></div>')
  })

  test("a cache without a readable date prints no cache line", () => {
    const html = htmlOf(
      withData({
        history: { fetchedAt: "not a date", items: typical.history?.items ?? [] },
      }),
    )
    expect(html).toContain("trend-svg")
    expect(html).not.toContain("Historique enregistré")
  })
})

describe("one page for every survey the phone can hold", () => {
  test.each(ALL_FIXTURES)("%s paginates to exactly one summary page", (_name, data) => {
    const { html, pageCount } = paginateBlocks(buildSummaryBlocks(data, palette), CHROME)
    expect(pageCount).toBe(1)
    expect(html).toContain(`class="${PDF_CLASS.page} ${PDF_CLASS.pageSummary}"`)
    expect(html).not.toContain(PDF_CLASS.header)
    expect(html).not.toContain(PDF_CLASS.banner)
    expect(html).not.toContain(PDF_CLASS.watermark)
    expect(html).not.toContain(t.page.number({ index: "1", total: 1 }))
    expect(html).toContain(t.appName)
  })

  test.each(ALL_FIXTURES)("%s holds no photo, factor card, cover or draft word", (_name, data) => {
    const html = htmlOf(data)
    expect(html).not.toContain("photos-")
    expect(html).not.toContain("factor-card")
    expect(html).not.toContain("cover-")
    expect(html).not.toContain(t.draft.banner)
    expect(html).not.toContain(t.draft.watermark)
    expect(html).not.toContain("<h2")
  })

  test("a draft that slipped through still prints no draft word of its own", () => {
    const html = htmlOf(withData({ isDraft: true }))
    expect(html).not.toContain(t.draft.banner)
    expect(html).not.toContain(t.draft.watermark)
  })

  test("the page is a 515 x 764 box of five zones and one rule, nothing flows", () => {
    const html = htmlOf(typical)
    expect(html.match(/class="summary-zone /g)).toHaveLength(5)
    expect(html.match(/class="summary-rule"/g)).toHaveLength(1)
  })
})

describe("the print contract", () => {
  const forbidden = /opacity|gradient|shadow|filter|#[0-9a-fA-F]{3,8}\b|rgba?\(|http/i

  test("summaryCss starts with the shared figure CSS and prefixes its own classes", () => {
    const css = summaryCss(palette)
    expect(css.startsWith(mapFigureCss(palette))).toBe(true)
    const own = css.slice(mapFigureCss(palette).length)
    const classes = Array.from(own.matchAll(/^\.([\w-]+)/gm), (m) => m[1])
    expect(classes.length).toBeGreaterThan(30)
    for (const name of classes) expect(name.startsWith("summary-")).toBe(true)
    for (const name of [
      "summary-page",
      "summary-logo",
      "summary-eyebrow",
      "summary-date",
      "summary-title",
      "summary-title-long",
      "summary-meta",
      "summary-rule",
      "summary-score-card",
      "summary-ring-value",
      "summary-band",
      "summary-subscores",
      "summary-chart",
      "summary-legend",
      "summary-quiet",
      "summary-trend-line",
      "summary-source",
    ]) {
      expect(classes).toContain(name)
    }
  })

  test("the CSS holds no opacity, gradient, shadow, filter, hex literal or http", () => {
    expect(summaryCss(palette)).not.toMatch(forbidden)
  })

  test.each(ALL_FIXTURES)(
    "%s: the HTML of the summary holds none of them (the shared figure keeps its own)",
    (_name, data) => {
      // The shared map figure ships its translucent scale and north panels since phase 25.1.
      const figure = buildMapFigure(data.map, palette)
      const own = figure.kind === "figure" ? htmlOf(data).replace(figure.html, "") : htmlOf(data)
      expect(own).not.toMatch(forbidden)
    },
  )

  test("the CSS uses only palette values and the charter fonts", () => {
    const css = summaryCss(palette)
    const families = new Set(Array.from(css.matchAll(/font-family: ([\w-]+);/g), (m) => m[1]))
    const charter = new Set<string>(Object.values(PDF_FONT_FAMILIES))
    for (const family of families) expect(charter.has(family)).toBe(true)
    for (const key of ["forest", "onForest", "onForestAccent", "panel", "line"]) {
      expect(css).toContain(key)
    }
  })

  test("a site name with markup is printed only escaped", () => {
    const html = htmlOf(withData({ siteName: "<b>x</b> \"q\" & 'a'" }))
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt; &quot;q&quot; &amp; &#39;a&#39;")
    expect(html).not.toContain("<b>x")
  })

  test("parcel ids with markup are printed only escaped in the meta line and the legend", () => {
    const html = htmlOf(withData({ parcelIds: ['<i>"1"</i>'] }))
    expect(html).toContain("&lt;i&gt;&quot;1&quot;&lt;/i&gt;")
    expect(html).not.toContain("<i>")
  })
})
