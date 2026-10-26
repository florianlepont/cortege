// palette.ts reads useColorScheme from react-native through theme.ts; the print palette never calls
// it, so the stub only has to exist.
jest.mock("react-native", () => ({ useColorScheme: () => "light" }))

import { FACTOR_KEYS, type SurveyWeather } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import {
  WORST_ROUTE,
  exportFixtureManyParcels,
  exportFixtureSummary,
  exportFixtureSummaryWorst,
  exportFixtureTypical,
  exportFixtureTypicalConditioned,
  exportFixtureV30Draft,
  exportFixtureV32Submitted,
  exportFixtureWorstCase,
  summaryVariant,
} from "../../../test/survey-export-fixtures"
import type { SummaryVariantKind } from "../../../test/survey-export-fixtures"
import { buildSurveyExportHtml } from "./build-html"
import { buildConditionsBlock } from "./conditions-section"
import { buildCoverBlocks } from "./cover-section"
import { buildFactorChartBlock } from "./factor-chart-svg"
import { buildFactorBlocks } from "./factor-section"
import { escapeHtml, formatDateFr } from "./html"
import { buildIdentityBlocks } from "./identity"
import { PAGE_FILL_FACTOR } from "./paginate"
import { buildRouteBlock } from "./route-section"
import { PDF_PAGE_BLOCK_HEIGHT } from "./export-settings"
import { buildPdfPalette } from "./palette"
import { sectionsFor } from "./sections"
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
      ".cover-",
      ".identity-heading",
      ".chart-card",
      ".factor-card",
      ".map-frame",
      ".trend-",
      ".photos-",
    ]) {
      expect(css).toContain(marker)
    }
    expectInOrder(css, ["@font-face", "@page", ".cover-", ".identity-heading"])
    // The old score card is gone from the body (phase 33, D-01): its CSS goes with it.
    expect(css).not.toContain(".score-tile")
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

  it("follows the sheet: cover with the map, identity, method, chart, factors, trend, photos", () => {
    expectInOrder(body, [
      'class="cover-page"',
      t.map.heading,
      t.identity.heading,
      t.method.heading,
      t.scores.chartHeading,
      t.factors.standGroup,
      t.factors.contextGroup,
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

  it("opens with the cover alone: page 1 is a cover page with no running header", () => {
    const pages = pagesOf(html)
    expect(pages[0].startsWith(` ${PDF_CLASS.pageCover}"`)).toBe(true)
    expect(pages[0]).not.toContain(`class="${PDF_CLASS.header}"`)
    expect(pages[0]).not.toContain(t.identity.heading)
    for (const page of pages.slice(1)) {
      expect(page).toContain(`class="${PDF_CLASS.header}"`)
      expect(page).not.toContain(PDF_CLASS.pageCover)
    }
  })

  it("puts the total, both sub-scores and their band lines on the cover (D-01: nothing lost)", () => {
    const cover = pagesOf(html)[0]
    expect(cover).toContain(t.scores.standHeading)
    expect(cover).toContain(t.scores.contextHeading)
    expect(cover).toContain('class="cover-numeral')
    // The total pill and the two sub-score tiles each print a band line.
    expect(countOf(cover, escapeHtml(t.scores.band({ band: "" })))).toBe(3)
    expect(bodyOf(html).indexOf(t.scores.standHeading)).toBeLessThan(
      bodyOf(html).indexOf(t.identity.heading),
    )
  })

  it("gives page 2 the identity card with the method and the factor chart, light sheet or not", () => {
    for (const data of [exportFixtureV30Draft, exportFixtureV32Submitted, exportFixtureWorstCase]) {
      const second = pagesOf(buildSurveyExportHtml(data).html)[1]
      expect(second).toContain(t.identity.heading)
      expect(second).toContain(t.method.heading)
      expect(second).toContain(t.scores.chartHeading)
    }
  })

  it("has no score card in the body any more", () => {
    const body = pagesOf(buildSurveyExportHtml(exportFixtureV32Submitted).html).slice(1).join("")
    expect(body).not.toContain("score-card")
    expect(body).not.toContain("score-tile")
    expect(body).not.toContain(t.scores.totalHeading)
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
  it("sits after the identity and method blocks and before the factor chart", () => {
    const { html } = buildSurveyExportHtml(WITH_CONDITIONS)

    expectInOrder(bodyOf(html), [
      t.identity.heading,
      t.method.heading,
      t.conditions.heading,
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

    expectInOrder(css, [".identity-heading", ".conditions-card", ".chart-card"])
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

  it("shows the doubt badge and the note on every card and leaves the cover scores and the chart alone", () => {
    const { html } = buildSurveyExportHtml(MAXIMAL)
    const palette = buildPdfPalette()

    expect(countOf(html, `class="factor-badge"`)).toBe(FACTOR_KEYS.length)
    expect(countOf(html, `class="factor-user-note"`)).toBe(FACTOR_KEYS.length)
    expect(buildCoverBlocks(MAXIMAL, palette)).toEqual(
      buildCoverBlocks(exportFixtureV32Submitted, palette),
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
    expect(countOf(html, `class="${PDF_CLASS.page} ${PDF_CLASS.draft}`)).toBe(pageCount)
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

// Phase 30 (D-09, spec section 9, U-11, P-3): the "Parcours utilisé" block, right after the
// conditions, and the identity row "Mode de relevé" that goes only when the block prints.
describe("buildSurveyExportHtml route block (phase 30)", () => {
  const rt = t.route
  const WITH_ROUTE: SurveyExportData = { ...exportFixtureV32Submitted, route: WORST_ROUTE }
  const WITH_BOTH: SurveyExportData = { ...WITH_CONDITIONS, route: WORST_ROUTE }

  it("sits right after the conditions block and before the factor chart", () => {
    const { html } = buildSurveyExportHtml(WITH_BOTH)

    expectInOrder(bodyOf(html), [
      t.identity.heading,
      t.method.heading,
      t.conditions.heading,
      rt.heading,
      t.scores.chartHeading,
      t.factors.standGroup,
    ])
  })

  it("sits right after the identity and method blocks when there is no conditions block", () => {
    const { html } = buildSurveyExportHtml(WITH_ROUTE)

    expect(bodyOf(html)).not.toContain(t.conditions.heading)
    expectInOrder(bodyOf(html), [
      t.identity.heading,
      t.method.heading,
      rt.heading,
      t.scores.chartHeading,
    ])
  })

  it("carries its CSS in the document style after the conditions CSS", () => {
    const { html } = buildSurveyExportHtml(WITH_BOTH)
    const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"))

    expectInOrder(css, [".identity-heading", ".conditions-card", ".route-card", ".chart-card"])
  })

  it("removes the identity row Mode de relevé when the block prints, and only then", () => {
    const withRoute = bodyOf(buildSurveyExportHtml(WITH_ROUTE).html)
    const without = bodyOf(buildSurveyExportHtml(exportFixtureV32Submitted).html)

    expect(withRoute).not.toContain(t.identity.cappedMode)
    // The route block carries the same caption "Mode de relevé" (spec section 9): one row only, and
    // it is the block's, after the "Parcours utilisé" heading, not the identity card's.
    expect(t.identity.surveyMode).toBe(rt.counting)
    expect(countOf(withRoute, `>${t.identity.surveyMode}</th>`)).toBe(1)
    expect(withRoute.indexOf(`>${t.identity.surveyMode}</th>`)).toBeGreaterThan(
      withRoute.indexOf(rt.heading),
    )
    expect(without).toContain(t.identity.cappedMode)
    expect(countOf(without, `>${t.identity.surveyMode}</th>`)).toBe(1)
  })

  it("prints nothing about the route for a survey without one, draft or submitted", () => {
    for (const data of [exportFixtureV32Submitted, exportFixtureV30Draft]) {
      const { html } = buildSurveyExportHtml(data)
      expect(bodyOf(html)).not.toContain(rt.heading)
      expect(bodyOf(html)).not.toContain('class="route-card"')
      expect(bodyOf(html)).toContain(t.identity.cappedMode)
    }
  })

  it("prints a draft with its route, banner and watermark kept", () => {
    const { html, pageCount } = buildSurveyExportHtml({
      ...exportFixtureV30Draft,
      route: WORST_ROUTE,
    })

    expect(bodyOf(html)).toContain(rt.heading)
    expect(countOf(html, `<div class="${PDF_CLASS.banner}">`)).toBe(pageCount)
    expect(countOf(html, `<div class="${PDF_CLASS.watermark}">`)).toBe(pageCount)
  })

  it("prints the Choix sentence and the factors counted in full, escaped", () => {
    const { html } = buildSurveyExportHtml(WITH_ROUTE)

    expect(html).toContain("Conseillé par l&#39;application d&#39;après vos réponses")
    expect(html).toContain(`>${rt.countedFactors}</th>`)
    expect(html).toContain(`>${rt.complement}</th>`)
  })

  it("keeps the route block whole, once, on a single page, never taller than a page", () => {
    const block = buildRouteBlock(exportFixtureWorstCase, buildPdfPalette())
    const capacity =
      (PDF_PAGE_BLOCK_HEIGHT - PAGE_HEADER_HEIGHT - PAGE_FOOTER_HEIGHT - DRAFT_BANNER_HEIGHT) *
      PAGE_FILL_FACTOR

    expect(block).not.toBeNull()
    expect(block?.height ?? 0).toBeLessThanOrEqual(capacity)
    const pages = pagesOf(buildSurveyExportHtml(exportFixtureWorstCase).html)
    expect(pages.filter((page) => page.includes(block?.html ?? ""))).toHaveLength(1)
  })

  it("never prints an em dash in the block", () => {
    expect(buildRouteBlock(exportFixtureWorstCase, buildPdfPalette())?.html).not.toContain(EM_DASH)
  })
})

// Phase 33 (D-10): the sections come from the registry (`sections.ts`), and `build-html.ts` names
// none of them: the cover and the summary joined the documents by two registry entries.
describe("buildSurveyExportHtml section registry", () => {
  it("keeps the CSS order: fonts, shell, then the sections in sheet order", () => {
    const { html } = buildSurveyExportHtml(exportFixtureWorstCase)
    const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"))
    expectInOrder(css, [
      "@font-face",
      "@page",
      ".cover-",
      ".map-frame",
      ".identity-heading",
      ".conditions-",
      ".route-",
      ".chart-card",
      ".factor-card",
      ".trend-",
      ".photos-",
    ])
  })

  it("prints the sections of the complete mode, and only those, in the registry order", () => {
    const ids = sectionsFor("complete").map((section) => section.id)
    expect(ids[0]).toBe("cover")
    expect(ids).not.toContain("summary")
    expect(sectionsFor("summary").map((section) => section.id)).toEqual(["summary"])
  })
})

// Phase 33 (D-03, D-11, D-24, UI-SPEC B.11): the page-count targets with the cover and the map on it.
// The counts are those of the block-height estimate against the page capacity, not a device
// measurement: plans 33-14 and 33-18 compare them with `pdfinfo` on Chrome, the iOS simulator and the
// Android emulator. The exact number is in each test name; the target is the upper bound.
describe("buildSurveyExportHtml page counts (B.11)", () => {
  const WITH_ROUTE: SurveyExportData = { ...exportFixtureV32Submitted, route: WORST_ROUTE }

  it.each([
    { label: "a v3.0 draft (target 4)", data: exportFixtureV30Draft, pages: 4, target: 4 },
    { label: "the typical survey (target 6)", data: exportFixtureTypical, pages: 5, target: 6 },
    {
      label: "the typical survey with conditions and route (target 7)",
      data: exportFixtureTypicalConditioned,
      pages: 6,
      target: 7,
    },
    {
      label: "the worst case sheet (target 10)",
      data: exportFixtureWorstCase,
      pages: 9,
      target: 10,
    },
    {
      label: "the worst case sheet without its route (target 10)",
      data: { ...exportFixtureWorstCase, route: null },
      pages: 9,
      target: 10,
    },
  ])("pins the page count of $label at $pages", ({ data, pages, target }) => {
    const { pageCount } = buildSurveyExportHtml(data)
    expect(pageCount).toBe(pages)
    expect(pageCount).toBeLessThanOrEqual(target)
  })

  // Plan 33-16 (owner decision 2026-10-26): PAGE_FILL_FACTOR 0.92 -> 0.94. Plan 33-18 (D-24, D-25):
  // the body has no map and the year row is gone when it equals the date's year. Page 2 holds the
  // identity card (269 with the year rule), the factor chart (214) and the stand heading with factor A
  // (190), 673 against a capacity of 695.6, so the factors start on page 2 and the closing notes share
  // the last page. The devices printed the same content in 689.8 of 740 units (33-14-MEASUREMENTS.md).
  it("pins the page count of a v3.2 submitted survey at 4, the B.11 target", () => {
    expect(buildSurveyExportHtml(exportFixtureV32Submitted).pageCount).toBe(4)
  })

  it("pins a v3.2 submitted survey with the fullest route at 4 (it was 5 with the body map)", () => {
    expect(buildSurveyExportHtml(WITH_ROUTE).pageCount).toBe(4)
  })

  it.each([
    ["the typical survey", exportFixtureTypical],
    ["the typical survey with conditions and route", exportFixtureTypicalConditioned],
    ["the worst case sheet", exportFixtureWorstCase],
  ])("draws the map once, on page 1, with its heading, for %s", (_label, data) => {
    const { html } = buildSurveyExportHtml(data)
    const pages = pagesOf(html)
    expect(pages[0]).toContain(`<div class="cover-map-heading">${t.map.heading}</div>`)
    expect(countOf(pages[0], 'class="map-frame"')).toBe(1)
    expect(countOf(bodyOf(html), 'class="map-frame"')).toBe(1)
    expect(countOf(bodyOf(html), t.map.heading)).toBe(1)
    for (const page of pages.slice(1)) expect(page).not.toContain("map-frame")
  })

  it.each([
    ["the typical survey", exportFixtureTypical],
    ["the worst case sheet", exportFixtureWorstCase],
  ])(
    "puts the trend after the factors, on the page of the factor J card, for %s",
    (_label, data) => {
      const pages = pagesOf(buildSurveyExportHtml(data).html)
      const trendPage = pages.findIndex((page) => page.includes(t.trend.heading))
      expect(trendPage).toBeGreaterThan(1)
      const lastFactor = pages.findIndex((page) =>
        page.includes('<span class="factor-letter">J</span>'),
      )
      expect(trendPage).toBe(lastFactor)
      const page = pages[trendPage]
      expect(page.indexOf('<span class="factor-letter">J</span>')).toBeLessThan(
        page.indexOf(t.trend.heading),
      )
      const photoPage = pages.findIndex((entry) => entry.includes(t.photos.heading))
      expect(photoPage).toBeGreaterThan(trendPage)
    },
  )

  it("keeps one trend block for a six-point history", () => {
    expect(exportFixtureWorstCase.history?.items).toHaveLength(6)
    const pages = pagesOf(buildSurveyExportHtml(exportFixtureWorstCase).html)
    expect(pages.filter((page) => page.includes(t.trend.heading))).toHaveLength(1)
  })

  it("prints all 30 parcel ids of the many-parcels fixture and no ellipsis in the whole document (D-23)", () => {
    const { html } = buildSurveyExportHtml(exportFixtureManyParcels)
    const body = bodyOf(html)
    for (const id of exportFixtureManyParcels.parcelIds) expect(body).toContain(id)
    expect(body).not.toContain(String.fromCharCode(0x2026))
    // The cover prints no parcel id at all: the list is on page 2 only.
    expect(pagesOf(html)[0]).not.toContain(exportFixtureManyParcels.parcelIds[0])
  })

  it("starts the first photo page after the trend, never beside it", () => {
    const pages = pagesOf(buildSurveyExportHtml(exportFixtureTypical).html)
    const photo = pages.findIndex((page) => page.includes(t.photos.heading))
    expect(photo).toBe(pages.length - 1)
    expect(pages[photo]).not.toContain(t.trend.heading)
  })
})

describe("buildSurveyExportHtml whole blocks and photo pages (B.11)", () => {
  const palette = buildPdfPalette()

  it.each([
    ["a v3.2 submitted survey", exportFixtureV32Submitted],
    ["a v3.0 draft", exportFixtureV30Draft],
    ["the typical survey", exportFixtureTypical],
    ["the typical survey with conditions and route", exportFixtureTypicalConditioned],
    ["the worst case sheet", exportFixtureWorstCase],
    ["a survey on 30 parcels", exportFixtureManyParcels],
  ])("prints every block of the complete mode whole, on exactly one page: %s", (_label, data) => {
    const pages = pagesOf(buildSurveyExportHtml(data).html)
    const blocks = sectionsFor("complete").flatMap((section) => section.build(data, palette))
    expect(blocks.length).toBeGreaterThan(10)
    for (const block of blocks) {
      expect(pages.filter((page) => page.includes(block.html))).toHaveLength(1)
    }
  })

  it("lists the 30 ids of the many-parcels fixture in the identity block, shortened nowhere", () => {
    const identity = buildIdentityBlocks(exportFixtureManyParcels, palette)[0].html
    for (const id of exportFixtureManyParcels.parcelIds) expect(identity).toContain(id)
    expect(identity).not.toContain("…")
  })

  function withPhotos(count: number): SurveyExportData {
    const items = exportFixtureWorstCase.photos.items.slice(0, count)
    return { ...exportFixtureTypical, photos: { items, total: count, unavailable: 0 } }
  }

  /** The number of photo cells on each page that holds one, in page order, with the last flag. */
  function photoPages(data: SurveyExportData): { cells: number; last: boolean }[] {
    const pages = pagesOf(buildSurveyExportHtml(data).html)
    return pages.flatMap((page, index) => {
      const cells = countOf(page, `class="photos-cell"`)
      return cells === 0 ? [] : [{ cells, last: index === pages.length - 1 }]
    })
  }

  it.each([
    ["the typical survey with conditions", exportFixtureTypicalConditioned],
    ["the worst case sheet", exportFixtureWorstCase],
    ["the typical survey with 1 photo", withPhotos(1)],
    ["the typical survey with 7 photos", withPhotos(7)],
    ["the typical survey with 13 photos", withPhotos(13)],
    ["the typical survey with 24 photos", withPhotos(24)],
  ])("leaves no photo page before the last with fewer than two photos: %s", (_label, data) => {
    const holders = photoPages(data)
    expect(holders.length).toBeGreaterThan(0)
    for (const holder of holders.filter((entry) => !entry.last)) {
      expect(holder.cells).toBeGreaterThanOrEqual(2)
    }
  })

  it("prints every photo of the fixtures once", () => {
    for (const count of [1, 7, 13, 24]) {
      const total = photoPages(withPhotos(count)).reduce((sum, entry) => sum + entry.cells, 0)
      expect(total).toBe(count)
    }
  })
})

describe("buildSurveyExportHtml summary document (D-07)", () => {
  const KINDS: SummaryVariantKind[] = [
    "noBasemap",
    "noGeometry",
    "noParcel",
    "noHistory",
    "firstSurvey",
    "staleCache",
  ]
  const CASES: [string, SurveyExportData][] = [
    ["the typical summary", exportFixtureSummary],
    ["the fullest summary", exportFixtureSummaryWorst],
    ...KINDS.map((kind): [string, SurveyExportData] => [
      `the ${kind} fallback`,
      summaryVariant(kind),
    ]),
  ]

  it.each(CASES)("prints %s as exactly one summary page, with 1 page", (_label, data) => {
    const { html, pageCount } = buildSurveyExportHtml(data)
    expect(pageCount).toBe(1)
    const pages = pagesOf(html)
    expect(pages).toHaveLength(1)
    expect(pages[0].startsWith(` ${PDF_CLASS.pageSummary}"`)).toBe(true)
    expect(pages[0]).not.toContain(`class="${PDF_CLASS.header}"`)
    expect(pages[0]).not.toContain(PDF_CLASS.pageCover)
  })

  it.each(CASES)("holds none of the complete-only markup or CSS for %s", (_label, data) => {
    const { html } = buildSurveyExportHtml(data)
    const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"))
    expect(css).toContain(".summary-")
    expect(css).toContain(".map-frame")
    for (const rule of [".identity-card", ".factor-card", ".photos-", ".cover-", ".score-"]) {
      expect(css).not.toContain(rule)
    }
    const body = bodyOf(html)
    for (const marker of [
      "identity-card",
      "factor-card",
      "photos-cell",
      "cover-page",
      t.photos.heading,
      t.identity.heading,
    ]) {
      expect(body).not.toContain(marker)
    }
  })

  it("keeps the content security policy and no script or address in the summary", () => {
    for (const [, data] of CASES) {
      const { html } = buildSurveyExportHtml(data)
      expect(html).toContain(`<meta http-equiv="Content-Security-Policy" content="${PDF_CSP}">`)
      for (const needle of ["<script", "http:", "https:", "file:", EM_DASH]) {
        expect(html).not.toContain(needle)
      }
    }
  })

  it("never prints the photos of a survey in its summary, whatever the data holds", () => {
    const { html } = buildSurveyExportHtml({
      ...exportFixtureSummary,
      photos: exportFixtureWorstCase.photos,
    })
    expect(bodyOf(html)).not.toContain("photos-cell")
    expect(bodyOf(html)).not.toContain(t.photos.heading)
  })
})

describe("buildSurveyExportHtml draft cover (D-10)", () => {
  it("keeps the banner and the watermark on the cover of a draft too", () => {
    const { html } = buildSurveyExportHtml(exportFixtureV30Draft)
    const cover = pagesOf(html)[0]
    expect(cover).toContain(PDF_CLASS.pageCover)
    expect(cover).toContain(`<div class="${PDF_CLASS.banner}">`)
    expect(cover).toContain(`<div class="${PDF_CLASS.watermark}">`)
  })
})
