// palette.ts reads useColorScheme from react-native through theme.ts; the print palette never calls
// it, so the stub only has to exist.
jest.mock("react-native", () => ({ useColorScheme: () => "light" }))

import { FACTOR_KEYS, type SurveyWeather } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import {
  exportFixtureV30Draft,
  exportFixtureV32Submitted,
  exportFixtureWorstCase,
} from "../../../test/survey-export-fixtures"
import { buildSurveyExportHtml } from "./build-html"
import { buildConditionsBlock } from "./conditions-section"
import { buildFactorChartBlock } from "./factor-chart-svg"
import { buildFactorBlocks } from "./factor-section"
import { escapeHtml, formatDateFr } from "./html"
import { PAGE_FILL_FACTOR } from "./paginate"
import { PDF_PAGE_BLOCK_HEIGHT } from "./export-settings"
import { buildPdfPalette } from "./palette"
import { buildScoreSummaryBlock } from "./score-section"
import { DRAFT_BANNER_HEIGHT, PAGE_FOOTER_HEIGHT, PAGE_HEADER_HEIGHT } from "./styles"
import { PDF_CSP, PDF_CLASS } from "./styles"
import type { SurveyExportData } from "./types"

const t = fr.surveyExport

const EM_DASH = String.fromCharCode(0x2014)

function countOf(html: string, text: string): number {
  return html.split(text).length - 1
}

/** The body of the document: the head holds CSS and the title, which are not content. */
function bodyOf(html: string): string {
  return html.slice(html.indexOf("<body>"))
}

/** The pages of the body, one string each. */
function pagesOf(html: string): string[] {
  return bodyOf(html).split(`<section class="${PDF_CLASS.page}`).slice(1)
}

function expectInOrder(html: string, markers: string[]): void {
  const positions = markers.map((marker) => html.indexOf(marker))
  positions.forEach((position, index) => {
    if (position < 0) throw new Error(`marker not found: ${markers[index]}`)
  })
  expect(positions).toEqual([...positions].sort((a, b) => a - b))
}

describe("buildSurveyExportHtml document head", () => {
  const { html, pageCount } = buildSurveyExportHtml(exportFixtureV32Submitted)

  it("starts with a doctype and declares French and UTF-8", () => {
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true)
    expect(html).toContain('<html lang="fr">')
    expect(html).toContain('<meta charset="utf-8">')
  })

  it("carries the content security policy before any content", () => {
    expect(html).toContain(`<meta http-equiv="Content-Security-Policy" content="${PDF_CSP}">`)
    expect(html.indexOf("Content-Security-Policy")).toBeLessThan(html.indexOf("<style>"))
    expect(html.indexOf("Content-Security-Policy")).toBeLessThan(html.indexOf("<body>"))
  })

  it("titles the document from the site name", () => {
    expect(html).toContain(
      `<title>${escapeHtml(t.documentTitle(exportFixtureV32Submitted.siteName))}</title>`,
    )
  })

  it("has one style element holding the fonts, the shell and every section's CSS", () => {
    expect(countOf(html, "<style>")).toBe(1)
    expect(countOf(html, "</style>")).toBe(1)
    const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"))
    expect(countOf(css, "@font-face")).toBe(exportFixtureV32Submitted.assets.fonts.length)
    for (const marker of [
      `.${PDF_CLASS.root} {`,
      ".identity-heading",
      ".score-",
      ".chart-card",
      ".factor-card",
      ".map-",
      ".trend-",
      ".photos-",
    ]) {
      expect(css).toContain(marker)
    }
    expectInOrder(css, ["@font-face", "@page", ".identity-heading"])
  })

  it("holds the pages in one pdf-root and counts them", () => {
    expect(countOf(html, `<div class="${PDF_CLASS.root}">`)).toBe(1)
    expect(pagesOf(html)).toHaveLength(pageCount)
    expect(pageCount).toBeGreaterThan(1)
  })

  it("numbers every page against the total", () => {
    for (let index = 1; index <= pageCount; index += 1) {
      expect(
        countOf(html, escapeHtml(t.page.number({ index: String(index), total: pageCount }))),
      ).toBe(1)
    }
    expect(countOf(html, `class="${PDF_CLASS.footerNumber}"`)).toBe(pageCount)
  })

  it("prints the generation date in every footer", () => {
    const date = formatDateFr(exportFixtureV32Submitted.generatedAtIso, t.identity.unknown)
    expect(countOf(html, escapeHtml(t.page.generatedAt({ date })))).toBe(pageCount)
  })

  it("is the same document for the same input", () => {
    expect(buildSurveyExportHtml(exportFixtureV32Submitted)).toEqual({ html, pageCount })
  })
})

describe("buildSurveyExportHtml page order", () => {
  const { html } = buildSurveyExportHtml(exportFixtureWorstCase)
  const body = bodyOf(html)

  it("follows the sheet: identity, method, scores, chart, factors, map, trend, photos", () => {
    expectInOrder(body, [
      t.identity.heading,
      t.method.heading,
      t.scores.totalHeading,
      t.scores.chartHeading,
      t.factors.standGroup,
      t.factors.contextGroup,
      t.map.heading,
      t.trend.heading,
      t.photos.heading,
    ])
  })

  it("prints the factors in the order A to J", () => {
    const stand = body.indexOf(t.factors.standGroup)
    const letters = FACTOR_KEYS.map((key) => {
      const position = body.indexOf(`<span class="factor-letter">${key}</span>`, stand)
      if (position < 0) throw new Error(`no card for factor ${key}`)
      return position
    })
    expect(letters).toEqual([...letters].sort((a, b) => a - b))
    const gAt = letters[FACTOR_KEYS.indexOf("G")]
    const hAt = letters[FACTOR_KEYS.indexOf("H")]
    const context = body.indexOf(t.factors.contextGroup)
    expect(gAt).toBeLessThan(context)
    expect(context).toBeLessThan(hAt)
  })

  it("puts identity, method and the score summary on the first page", () => {
    const first = pagesOf(html)[0]
    expect(first).toContain(t.identity.heading)
    expect(first).toContain(t.method.heading)
    expect(first).toContain(t.scores.totalHeading)
  })

  it("gives the chart of a light sheet the first page too", () => {
    const light = buildSurveyExportHtml(exportFixtureV30Draft)
    expect(pagesOf(light.html)[0]).toContain(t.scores.chartHeading)
  })

  it("gives the chart the first page of an ordinary submitted survey with a full identity", () => {
    // Measured on iOS and Android (plan 25.1-17): identity 245 + method 93 + scores 136 + chart 206
    // fills 680 of the 740 of the body, so the chart stays on page 1 and does not leave it 40 % empty.
    const submitted = buildSurveyExportHtml(exportFixtureV32Submitted)
    expect(pagesOf(submitted.html)[0]).toContain(t.scores.chartHeading)
    expect(pagesOf(submitted.html)[0]).not.toContain(t.factors.standGroup)
  })

  it("renders the worst case with every section present", () => {
    expect(countOf(body, 'class="factor-card"')).toBe(FACTOR_KEYS.length)
    expect(body).toContain("map-parcel")
    expect(countOf(body, 'class="photos-cell"')).toBe(exportFixtureWorstCase.photos.items.length)
    expect(body).toContain(t.photos.caption({ index: "24", total: 24 }))
    expect(body).toContain("trend-segment")
    expect(body).toContain(t.factors.genusCount({ count: 34 }))
  })
})

// Phase 27 (D-13, D-17): the conditions block, the doubt badges and the factor notes.
const FULL_WEATHER: SurveyWeather = {
  sky: "cloudy",
  temperature_c: 14,
  wind_kmh: 12,
  rain_24h_mm: 2,
  observed_at: new Date(2026, 9, 10, 14, 30).toISOString(),
  source: "meteo_france",
  edited: [],
}

/** A note of `chars` characters: one paragraph, or two so that the line count is per paragraph. */
function longNote(chars: number, letter: string, paragraphs = 1): string {
  if (paragraphs === 1) return letter.repeat(chars)
  const half = Math.floor(chars / 2)
  return `${letter.repeat(half)}\n${letter.repeat(chars - half - 1)}`
}

const WITH_CONDITIONS: SurveyExportData = {
  ...exportFixtureV32Submitted,
  conditions: { note: "Sol humide près du ruisseau.", weather: { ...FULL_WEATHER } },
}

/** The maximal survey of UI-SPEC 4.4: a 1000 character note, ten 300 character notes, ten doubts. */
function maximalSurvey(paragraphs: number): SurveyExportData {
  return {
    ...exportFixtureV32Submitted,
    conditions: { note: longNote(1000, "n", paragraphs), weather: { ...FULL_WEATHER } },
    factorEntries: exportFixtureV32Submitted.factorEntries.map(([key, entry]) => [
      key,
      { ...entry, doubt: true, note: longNote(300, "f", paragraphs) },
    ]),
  }
}

const MAXIMAL = maximalSurvey(1)
const MAXIMAL_PARAGRAPHS = maximalSurvey(2)

describe("buildSurveyExportHtml conditions block (phase 27)", () => {
  it("sits after the identity and method blocks and before the score summary", () => {
    const { html } = buildSurveyExportHtml(WITH_CONDITIONS)

    expectInOrder(bodyOf(html), [
      t.identity.heading,
      t.method.heading,
      t.conditions.heading,
      t.scores.totalHeading,
      t.scores.chartHeading,
      t.factors.standGroup,
    ])
  })

  it("is not printed when the survey has neither a weather value nor a note", () => {
    for (const data of [exportFixtureV32Submitted, exportFixtureV30Draft]) {
      const { html } = buildSurveyExportHtml(data)
      expect(bodyOf(html)).not.toContain(t.conditions.heading)
      expect(bodyOf(html)).not.toContain('class="conditions-card"')
    }
  })

  it("carries its CSS in the document style after the identity CSS", () => {
    const { html } = buildSurveyExportHtml(WITH_CONDITIONS)
    const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"))

    expectInOrder(css, [".identity-heading", ".conditions-card", ".score-"])
  })

  it("prints the Météo-France source and the escaped note", () => {
    const { html } = buildSurveyExportHtml({
      ...WITH_CONDITIONS,
      conditions: { note: "<b>gras</b> & co", weather: { ...FULL_WEATHER } },
    })

    expect(html).toContain(">Météo-France, mesure du 10/10/2026 à 14:30</td>")
    expect(html).toContain("&lt;b&gt;gras&lt;/b&gt; &amp; co")
    expect(html).not.toContain("<b>gras")
  })

  it("prints a draft with a note, banner and watermark kept", () => {
    const { html, pageCount } = buildSurveyExportHtml({
      ...exportFixtureV30Draft,
      conditions: { note: "Brouillon annoté", weather: null },
    })

    expect(html).toContain("Brouillon annoté")
    expect(countOf(html, `<div class="${PDF_CLASS.banner}">`)).toBe(pageCount)
  })

  it("shows the doubt badge and the note on every card and leaves scores and chart alone", () => {
    const { html } = buildSurveyExportHtml(MAXIMAL)
    const palette = buildPdfPalette()

    expect(countOf(html, `class="factor-badge"`)).toBe(FACTOR_KEYS.length)
    expect(countOf(html, `class="factor-user-note"`)).toBe(FACTOR_KEYS.length)
    expect(buildScoreSummaryBlock(MAXIMAL, palette)).toEqual(
      buildScoreSummaryBlock(exportFixtureV32Submitted, palette),
    )
    expect(buildFactorChartBlock(MAXIMAL, palette)).toEqual(
      buildFactorChartBlock(exportFixtureV32Submitted, palette),
    )
  })
})

describe("buildSurveyExportHtml page budget of the maximal survey (phase 27, UI-SPEC 4.4)", () => {
  const base = buildSurveyExportHtml(exportFixtureV32Submitted)
  const maximal = buildSurveyExportHtml(MAXIMAL)
  const palette = buildPdfPalette()
  const capacity = (draft: boolean) =>
    (PDF_PAGE_BLOCK_HEIGHT -
      PAGE_HEADER_HEIGHT -
      PAGE_FOOTER_HEIGHT -
      (draft ? DRAFT_BANNER_HEIGHT : 0)) *
    PAGE_FILL_FACTOR

  // The count is recorded in the name for the device check of plan 27-21 (real page count on iOS
  // and Android). The estimate-level count is about one page of content (about 687 px against a capacity
  // of 680) plus the white space left by blocks that are never split; the UI-SPEC target of "one
  // page more" is confirmed or refuted on the devices, so the bound here is the loose one.
  it(`never loses a page and adds a bounded number (${base.pageCount} pages without, ${maximal.pageCount} with)`, () => {
    expect(maximal.pageCount).toBeGreaterThanOrEqual(base.pageCount)
    expect(maximal.pageCount).toBeLessThanOrEqual(base.pageCount + 2)
  })

  it.each([
    ["one paragraph a note", MAXIMAL],
    ["two paragraphs a note", MAXIMAL_PARAGRAPHS],
  ])("keeps every block whole with %s: none is taller than a page", (_label, data) => {
    const blocks = [buildConditionsBlock(data, palette), ...buildFactorBlocks(data, palette)]

    for (const block of blocks) {
      expect(block).not.toBeNull()
      expect(block?.height ?? 0).toBeGreaterThan(0)
      expect(block?.height ?? 0).toBeLessThanOrEqual(capacity(true))
    }
  })

  it.each([
    ["one paragraph a note", MAXIMAL],
    ["two paragraphs a note", MAXIMAL_PARAGRAPHS],
  ])("prints each of those blocks once, whole, on a single page with %s", (_label, data) => {
    const pages = pagesOf(buildSurveyExportHtml(data).html)
    const blocks = [buildConditionsBlock(data, palette), ...buildFactorBlocks(data, palette)]

    for (const block of blocks) {
      const holders = pages.filter((page) => page.includes(block?.html ?? ""))
      expect(holders).toHaveLength(1)
    }
  })
})

describe("buildSurveyExportHtml method contexts (D-09)", () => {
  it("shows the cas and the v3.2 scale lines for a v3.2 survey", () => {
    const { html } = buildSurveyExportHtml(exportFixtureV32Submitted)
    expect(html).toContain(escapeHtml(fr.ibpMethod.casLabels[1]))
    expect(html).toContain(escapeHtml(fr.surveyExport.scaleLines.v3_2.A))
    expect(html).toContain(escapeHtml(fr.surveyExport.scaleLines.v3_2.G))
    expect(html).not.toContain(escapeHtml(fr.surveyExport.scaleLines.v3_0.A))
    expect(html).not.toContain(t.method.region)
  })

  it("shows region, stage and the v3.0 scale lines for a legacy survey", () => {
    const { html } = buildSurveyExportHtml(exportFixtureV30Draft)
    expect(html).toContain(t.method.region)
    expect(html).toContain(escapeHtml(fr.labels.regions.ACA))
    expect(html).toContain(escapeHtml(fr.labels.vegetationStages.collineen))
    expect(html).toContain(escapeHtml(fr.surveyExport.scaleLines.v3_0.A))
    expect(html).toContain(escapeHtml(fr.surveyExport.scaleLines.v3_0.G))
    expect(html).not.toContain(escapeHtml(fr.surveyExport.scaleLines.v3_2.A))
    expect(html).not.toContain(t.method.cas + "<")
  })

  it("counts the cas 4 genera of the worst case", () => {
    const { html } = buildSurveyExportHtml(exportFixtureWorstCase)
    expect(html).toContain(escapeHtml(fr.ibpMethod.casLabels[4]))
  })
})

describe("buildSurveyExportHtml draft and submitted (D-10)", () => {
  it("puts the banner and the watermark on every page of a draft", () => {
    const { html, pageCount } = buildSurveyExportHtml(exportFixtureV30Draft)
    expect(countOf(html, `<div class="${PDF_CLASS.banner}">`)).toBe(pageCount)
    expect(countOf(html, `<div class="${PDF_CLASS.watermark}">`)).toBe(pageCount)
    expect(countOf(html, `class="${PDF_CLASS.page} ${PDF_CLASS.draft}"`)).toBe(pageCount)
  })

  it("marks the factors of a draft that are not filled", () => {
    const { html } = buildSurveyExportHtml(exportFixtureV30Draft)
    expect(countOf(bodyOf(html), t.factors.missing)).toBe(2)
    expect(html).toContain(escapeHtml(t.scores.provisional({ count: 2 })))
  })

  it("has no banner, no watermark and no missing marker once submitted", () => {
    const { html } = buildSurveyExportHtml(exportFixtureV32Submitted)
    const body = bodyOf(html)
    expect(body).not.toContain(`<div class="${PDF_CLASS.banner}">`)
    expect(body).not.toContain(`<div class="${PDF_CLASS.watermark}">`)
    expect(body).not.toContain(t.draft.banner)
    expect(body).not.toContain(t.factors.missing)
    expect(body).not.toContain(PDF_CLASS.draft)
  })
})

describe("buildSurveyExportHtml safety (D-08)", () => {
  const hostile: SurveyExportData = {
    ...exportFixtureWorstCase,
    siteName: "<script>alert(1)</script>",
    observerName: '"onerror=x',
    parcelIds: ["77<186", 'AB"><img src=x>'],
    map: {
      ...exportFixtureWorstCase.map!,
      polygons: exportFixtureWorstCase.map!.polygons.map((polygon, index) => ({
        ...polygon,
        parcelId: index === 0 ? "77<186" : polygon.parcelId,
      })),
    },
  }
  const { html } = buildSurveyExportHtml(hostile)

  it("escapes the site name, the observer and the parcel ids", () => {
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
    expect(html).toContain("&quot;onerror=x")
    expect(html).not.toContain('"onerror=x')
    expect(html).toContain("77&lt;186")
    expect(html).not.toContain("77<186")
    expect(html).not.toContain("<img src=x>")
  })

  it.each([
    ["a script", "<script"],
    ["an http url", "http:"],
    ["an https url", "https:"],
    ["a file url", "file:"],
    ["an em dash", EM_DASH],
  ])("holds no %s", (_label, needle) => {
    for (const data of [
      hostile,
      exportFixtureV32Submitted,
      exportFixtureV30Draft,
      exportFixtureWorstCase,
    ]) {
      expect(buildSurveyExportHtml(data).html).not.toContain(needle)
    }
  })

  it("never opens an event handler attribute from survey text", () => {
    expect(html).not.toMatch(/<[^>]+\son[a-z]+=/i)
  })
})

describe("buildSurveyExportHtml font warm-up", () => {
  afterEach(() => {
    jest.resetModules()
    jest.dontMock("./export-settings")
  })

  it("adds the hidden warm-up text on the first page only when the settings ask for it", async () => {
    expect(buildSurveyExportHtml(exportFixtureV32Submitted).html).not.toContain(
      `<div class="${PDF_CLASS.warmup}"`,
    )

    jest.resetModules()
    jest.doMock("./export-settings", () => ({
      ...jest.requireActual("./export-settings"),
      PDF_FONT_WARMUP: true,
    }))
    const fresh = await import("./build-html")
    const { html } = fresh.buildSurveyExportHtml(exportFixtureV32Submitted)
    const pages = bodyOf(html).split(`<section class="${PDF_CLASS.page}`).slice(1)
    expect(countOf(html, `<div class="${PDF_CLASS.warmup}"`)).toBe(1)
    expect(pages[0]).toContain(`<div class="${PDF_CLASS.warmup}"`)
  })
})
