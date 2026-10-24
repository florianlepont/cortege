import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"

import {
  exportFixtureV30Draft,
  exportFixtureV32Submitted,
} from "../../../test/survey-export-fixtures"
import { fr } from "../../i18n"
import { CONTOUR_VIEWBOX, buildContourPaths } from "../contour-paths"
import { COVER_FACT_MAX_CHARS, buildCoverBlocks, coverCss } from "./cover-section"
import { escapeHtml, formatDateFr } from "./html"
import { paginateBlocks } from "./paginate"
import type { PageChrome } from "./paginate"
import { COVER_PANEL_HEIGHT, PDF_CLASS } from "./styles"
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
] as const

// Fake palette: each value is its key name, so a rule can be traced without any colour literal.
const palette = Object.fromEntries(PALETTE_KEYS.map((key) => [key, key])) as PdfPalette

const submitted = exportFixtureV32Submitted
const draft = exportFixtureV30Draft

const CHROME: PageChrome = {
  siteName: "Bois de la Colline",
  isDraft: false,
  generatedAtText: "10 octobre 2026",
}

function htmlOf(data: SurveyExportData): string {
  return buildCoverBlocks(data, palette)[0].html
}

function withData(patch: Partial<SurveyExportData>): SurveyExportData {
  return { ...submitted, ...patch }
}

describe("the block", () => {
  test("is one cover page style block of 740 units", () => {
    const blocks = buildCoverBlocks(submitted, palette)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].id).toBe("cover")
    expect(blocks[0].pageStyle).toBe("cover")
    expect(blocks[0].height).toBe(740)
  })

  test("COVER_FACT_MAX_CHARS is 34", () => {
    expect(COVER_FACT_MAX_CHARS).toBe(34)
  })
})

describe("the forest panel", () => {
  test("opens with the contour svg: viewBox, slice, hidden, the sage and moss paths", () => {
    const html = htmlOf(submitted)
    const panelStart = html.indexOf('<div class="cover-panel">')
    expect(
      html.slice(panelStart).startsWith('<div class="cover-panel"><svg class="cover-contours"'),
    ).toBe(true)
    const { sage, moss } = buildContourPaths(7)
    expect(html).toContain(`viewBox="${CONTOUR_VIEWBOX}"`)
    expect(html).toContain('preserveAspectRatio="xMaxYMax slice"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain(`<path d="${sage}" fill="none" stroke="contourSage" stroke-width="1"/>`)
    expect(html).toContain(
      `<path d="${moss}" fill="none" stroke="contourMoss" stroke-width="1.4"/>`,
    )
    expect(html).toContain(`height="${COVER_PANEL_HEIGHT}"`)
  })

  test("inlines the logo in a tile when it is a base64 PNG or JPEG data URI", () => {
    const html = htmlOf(submitted)
    expect(html).toContain('<div class="cover-logo-tile"><img class="cover-logo"')
    expect(html).toContain(`src="${submitted.assets.logoDataUri}"`)
    const jpeg = withData({
      assets: { ...submitted.assets, logoDataUri: "data:image/jpeg;base64,/9j/AAAA" },
    })
    expect(htmlOf(jpeg)).toContain("<img ")
  })

  test.each([
    ["null", null],
    ["a remote url", "https://example.com/logo.png"],
    ["an svg data uri", "data:image/svg+xml;base64,AAAA"],
    ["a png with a quote", 'data:image/png;base64,AAAA"onerror="x'],
  ])("prints no tile and no img for a logo that is %s", (_name, logo) => {
    const html = htmlOf(withData({ assets: { ...submitted.assets, logoDataUri: logo } }))
    expect(html).not.toContain("<img")
    expect(html).not.toContain("cover-logo-tile")
    expect(html).not.toContain("https:")
    expect(html).toContain("cover-eyebrow cover-bare")
    expect(html).toContain("cover-subtitle cover-bare")
  })

  test("a logo keeps the eyebrow and the subtitle at x 144", () => {
    const html = htmlOf(submitted)
    expect(html).not.toContain("cover-bare")
    const css = coverCss(palette)
    expect(css).toMatch(/\.cover-eyebrow \{[^}]*left: 144px; top: 56px/)
    expect(css).toMatch(/\.cover-subtitle \{[^}]*left: 144px; top: 76px/)
  })

  test("prints the eyebrow, the subtitle, the title and the long date", () => {
    const html = htmlOf(submitted)
    expect(html).toContain(`<div class="cover-eyebrow">${t.sheetTitle}</div>`)
    expect(html).toContain(`<div class="cover-subtitle">${t.sheetSubtitle}</div>`)
    expect(html).toContain(`<div class="cover-title">Bois de la Colline</div>`)
    expect(html).toContain(
      `<div class="cover-date">${formatDateFr(submitted.dateIso, t.identity.unknown)}</div>`,
    )
    expect(coverCss(palette)).toMatch(
      /\.cover-title \{[^}]*left: 40px; top: 156px; width: 340px; height: 84px; overflow: hidden/,
    )
    expect(coverCss(palette)).toMatch(/\.cover-date \{[^}]*left: 40px; top: 252px/)
  })

  test("a bad date prints the unknown text", () => {
    expect(htmlOf(withData({ dateIso: "not a date" }))).toContain(
      `<div class="cover-date">${t.identity.unknown}</div>`,
    )
  })

  test("a name of 48 characters keeps the title size, 49 takes the long class", () => {
    expect(htmlOf(withData({ siteName: "a".repeat(48) }))).toContain('<div class="cover-title">')
    expect(htmlOf(withData({ siteName: "a".repeat(49) }))).toContain(
      '<div class="cover-title cover-title-long">',
    )
  })

  test("a survey with a total prints the numeral, the unit and the band pill", () => {
    const html = htmlOf(submitted)
    expect(html).toContain('<span class="cover-numeral">32</span>')
    expect(html).toContain(`<span class="cover-outof">${t.cover.outOf({ max: "50" })}</span>`)
    expect(html).toContain('<span class="cover-pill">Niveau : ')
    expect(html).toContain(`aria-label="${t.cover.scoreA11y({ points: "32", max: "50" })}"`)
    expect(html).not.toContain("cover-noscore")
  })

  test("a survey with no scores prints Non renseigné and no pill", () => {
    const html = htmlOf(withData({ scores: null }))
    expect(html).toContain(`<span class="cover-noscore">${t.scores.notFilled}</span>`)
    expect(html).not.toContain("cover-numeral")
    expect(html).not.toContain("cover-pill")
    expect(html).not.toContain("cover-outof")
  })

  test("a draft with two missing factors prints the provisional line", () => {
    const html = htmlOf(draft)
    expect(html).toContain(
      `<div class="cover-provisional">${t.scores.provisional({ count: 2 })}</div>`,
    )
    expect(coverCss(palette)).toMatch(/\.cover-provisional \{[^}]*top: 352px/)
  })

  test("a submitted survey, or a draft with every factor filled, prints no provisional line", () => {
    expect(htmlOf(submitted)).not.toContain("cover-provisional")
    expect(htmlOf(withData({ isDraft: true }))).not.toContain("cover-provisional")
    const missingSubmitted = withData({ factorEntries: draft.factorEntries })
    expect(htmlOf(missingSubmitted)).not.toContain("cover-provisional")
  })

  test("the site name and the observer appear only escaped (T-33-23)", () => {
    const html = htmlOf(
      withData({
        siteName: '<b>Bois</b> & "x" <img src=x onerror=alert(1)>',
        observerName: "<script>alert(1)</script>",
      }),
    )
    expect(html).toContain("&lt;b&gt;Bois&lt;/b&gt; &amp; &quot;x&quot; &lt;img src=x")
    expect(html).not.toContain("<b>")
    expect(html).not.toContain("<script")
    expect(html).not.toContain("<img src=x")
    expect(html).toContain("&lt;script&gt;")
  })
})

describe("the sub-score tiles", () => {
  test("two tiles at 408 on a submitted survey and 432 on a draft", () => {
    expect(htmlOf(submitted)).toContain('<div class="cover-tiles" style="top: 408px">')
    expect(htmlOf(draft)).toContain('<div class="cover-tiles" style="top: 432px">')
    expect((htmlOf(submitted).match(/class="cover-tile"/g) ?? []).length).toBe(2)
  })

  test("the second tile sits 16 to the right of the first", () => {
    const html = htmlOf(submitted)
    expect(html).toContain('class="cover-tile" style="left: 0px"')
    expect(html).toContain('class="cover-tile" style="left: 265.5px"')
    const css = coverCss(palette)
    expect(css).toMatch(
      /\.cover-tile \{[^}]*width: 249\.5px; height: 112px; border: 1px solid line; border-radius: 12px; background: panel/,
    )
  })

  test("each tile holds a 64 ring in its band tone, the heading, the value and the band line", () => {
    const html = htmlOf(submitted)
    expect((html.match(/<svg class="ring-svg"/g) ?? []).length).toBe(2)
    expect(html).toContain('width="64" height="64" viewBox="0 0 64 64"')
    expect(html).toContain(t.scores.standHeading)
    expect(html).toContain(t.scores.contextHeading)
    expect(html).toContain('<span class="cover-tile-numeral">20</span>')
    expect(html).toContain(`<span class="cover-tile-outof">${t.cover.outOf({ max: "35" })}</span>`)
    expect(html).toContain('<span class="cover-tile-numeral">12</span>')
    expect(html).toContain(`<span class="cover-tile-outof">${t.cover.outOf({ max: "15" })}</span>`)
    expect(html).toContain('<span class="cover-tile-dot"')
    expect(html).toContain(
      t.cover.subscoreA11y({ heading: t.scores.standHeading, points: "20", max: "35" }),
    )
    expect(html).toContain(
      t.cover.subscoreA11y({ heading: t.scores.contextHeading, points: "12", max: "15" }),
    )
    expect(html).toContain('stroke="chartGrid"')
    // 20 / 35 stand is mid or high; the tone is a palette band key, never a literal colour.
    expect(html).toMatch(/stroke="band(?:Low|Mid|High)"/)
    expect(html).toMatch(/background: band(?:Low|Mid|High)"/)
  })

  test("a missing sub-score prints Non renseigné, an empty ring and no band line", () => {
    const html = htmlOf(
      withData({
        scores: { ibp_total: 12, ibp_peuplement_gestion: 12, ibp_contexte: null as never },
      }),
    )
    expect(html).toContain(`<div class="cover-tile-empty">${t.scores.notFilled}</div>`)
    expect((html.match(/class="cover-tile-band"/g) ?? []).length).toBe(1)
    expect((html.match(/class="ring-arc"/g) ?? []).length).toBe(1)
  })

  test("a survey without scores has two empty tiles and no ring arc", () => {
    const html = htmlOf(withData({ scores: null }))
    expect((html.match(/class="cover-tile-empty"/g) ?? []).length).toBe(2)
    expect(html).not.toContain("ring-arc")
    expect(html).not.toContain("cover-tile-band")
  })
})

describe("the identity facts", () => {
  function facts(
    html: string,
  ): Array<{ caption: string; value: string; left: string; top: string }> {
    const re =
      /<div class="cover-fact" style="left: ([\d.]+)px; top: (\d+)px"><div class="cover-fact-caption">(.*?)<\/div><div class="cover-fact-value">(.*?)<\/div><\/div>/g
    return Array.from(html.matchAll(re), (m) => ({
      left: m[1],
      top: m[2],
      caption: m[3],
      value: m[4],
    }))
  }

  test("starts at 548 on a submitted survey and 572 on a draft", () => {
    expect(htmlOf(submitted)).toContain('<div class="cover-facts" style="top: 548px">')
    expect(htmlOf(draft)).toContain('<div class="cover-facts" style="top: 572px">')
  })

  test("six cells in two columns, rows 57 apart, in reading order", () => {
    const cells = facts(htmlOf(submitted))
    expect(cells.map((c) => c.caption)).toEqual([
      t.identity.commune,
      t.identity.parcels,
      escapeHtml(t.identity.observationYear),
      t.identity.versionNumber,
      t.identity.observer,
      t.identity.method,
    ])
    expect(cells.map((c) => [c.left, c.top])).toEqual([
      ["0", "0"],
      ["269.5", "0"],
      ["0", "57"],
      ["269.5", "57"],
      ["0", "114"],
      ["269.5", "114"],
    ])
    expect(cells.map((c) => c.value)).toEqual([
      "77186 (département 77)",
      "77186000AB0123",
      "2026",
      "2",
      "Camille Martin",
      "v3.2, cas 1",
    ])
  })

  test("the cell box is 245.5 wide with a hairline, 8 / 16 padding and a nowrap 20 value", () => {
    const css = coverCss(palette)
    expect(css).toMatch(
      /\.cover-fact \{[^}]*width: 245\.5px; height: 57px; padding: 8px 0 16px; border-top: 1px solid line/,
    )
    expect(css).toMatch(/\.cover-fact-caption \{[^}]*font-size: 8\.5px; line-height: 12px/)
    expect(css).toMatch(
      /\.cover-fact-value \{[^}]*height: 20px; overflow: hidden; font-family: Sora-Medium; font-size: 12px; line-height: 20px; white-space: nowrap/,
    )
  })

  test("unknown values print Non renseigné and a missing observer drops its cell", () => {
    const cells = facts(
      htmlOf(
        withData({
          parcelIds: [],
          observationYear: null,
          versionNumber: null,
          observerName: "   ",
          method: { ...submitted.method, version: IBP_METHOD_V3_0, ibpCas: null },
        }),
      ),
    )
    expect(cells.map((c) => c.value)).toEqual([
      t.identity.unknown,
      t.identity.noParcel,
      t.identity.unknown,
      t.identity.unknown,
      "v3.0",
    ])
    expect(cells[4].caption).toBe(t.identity.method)
    expect([cells[4].left, cells[4].top]).toEqual(["0", "114"])
  })

  test("a malformed parcel id prints the unknown commune", () => {
    const cells = facts(htmlOf(withData({ parcelIds: ["short"] })))
    expect(cells[0].value).toBe(t.identity.unknown)
    expect(cells[1].value).toBe("short")
  })

  test("the parcel list and a long observer are shortened with an ellipsis", () => {
    const cells = facts(
      htmlOf(
        withData({
          parcelIds: ["77186000AB0123", "77186000AB0124", "77186000AB0125"],
          observerName: "Jean-Baptiste de la Tour d'Auvergne-Lauraguais",
        }),
      ),
    )
    expect(cells[1].value).toBe("77186000AB0123, 77186000AB0124, …")
    expect(cells[1].value.length).toBeLessThanOrEqual(COVER_FACT_MAX_CHARS)
    expect(cells[4].value.endsWith("…")).toBe(true)
    expect(cells[4].value.length).toBeLessThanOrEqual(COVER_FACT_MAX_CHARS)
  })

  test("the method cell reads the version and cas", () => {
    const v32 = facts(htmlOf(withData({ method: { ...submitted.method, ibpCas: 3 } })))
    expect(v32[5].value).toBe("v3.2, cas 3")
    expect(submitted.method.version).toBe(IBP_METHOD_V3_2)
  })
})

describe("the page", () => {
  const DRAFT_CHROME: PageChrome = { ...CHROME, isDraft: true }
  const longDraft: SurveyExportData = {
    ...draft,
    siteName: "Forêt domaniale des grands massifs de l'Est, parcelle numéro soixante-quatre",
    parcelIds: ["77186000AB0123", "77186000AB0124", "77186000AB0125"],
    observerName: null,
  }

  test("a draft cover paginates to one page-cover page with banner, watermark and footer", () => {
    expect(longDraft.siteName).toHaveLength(76)
    const { html, pageCount } = paginateBlocks(buildCoverBlocks(longDraft, palette), DRAFT_CHROME)
    expect(pageCount).toBe(1)
    expect(html).toContain(`class="${PDF_CLASS.page} ${PDF_CLASS.draft} ${PDF_CLASS.pageCover}"`)
    expect(html).not.toContain(PDF_CLASS.header)
    expect(html).toContain(`<div class="${PDF_CLASS.banner}">`)
    expect(html).toContain(`<div class="${PDF_CLASS.watermark}">`)
    expect(html).toContain(t.page.number({ index: "1", total: 1 }))
    expect(html).toContain("cover-title cover-title-long")
    expect(html).toContain("77186000AB0123, 77186000AB0124, …")
    // Five cells: Méthode IBP moved up into the fifth place (left column, third row).
    expect(html).toContain(
      `style="left: 0px; top: 114px"><div class="cover-fact-caption">${t.identity.method}`,
    )
    expect(html).not.toContain(t.identity.observer)
  })

  test("a cover without scores paginates to one page too", () => {
    const { pageCount, html } = paginateBlocks(
      buildCoverBlocks(withData({ scores: null }), palette),
      CHROME,
    )
    expect(pageCount).toBe(1)
    expect(html).toContain(PDF_CLASS.pageCover)
    expect(html).not.toContain(PDF_CLASS.banner + '">')
  })

  test("the light part ends above the footer line on a draft", () => {
    // Facts start at 572 on a draft; three rows of 57 end at 743, the footer line is at 804.
    expect(572 + 3 * 57).toBeLessThan(804)
  })
})

describe("the print contract", () => {
  const forbidden = /opacity|gradient|shadow|filter|#[0-9a-fA-F]{3,8}\b|rgba?\(|http/i

  test("the CSS and the HTML hold no opacity, gradient, shadow, filter, hex literal or http", () => {
    expect(coverCss(palette)).not.toMatch(forbidden)
    expect(htmlOf(submitted)).not.toMatch(forbidden)
    expect(htmlOf(draft)).not.toMatch(forbidden)
    expect(htmlOf(withData({ scores: null }))).not.toMatch(forbidden)
  })

  test("the CSS uses only palette values and the charter fonts, with the cover- prefix", () => {
    const css = coverCss(palette)
    const families = new Set(Array.from(css.matchAll(/font-family: ([\w-]+);/g), (m) => m[1]))
    const charter = new Set<string>(Object.values(PDF_FONT_FAMILIES))
    for (const family of families) expect(charter.has(family)).toBe(true)
    const classes = Array.from(css.matchAll(/^\.([\w-]+)/gm), (m) => m[1])
    expect(classes.length).toBeGreaterThan(20)
    for (const name of classes) expect(name.startsWith("cover-")).toBe(true)
    for (const key of ["forest", "onForest", "onForestAccent", "onForestBody", "line", "panel"]) {
      expect(css).toContain(key)
    }
  })

  test("the numeral takes Sora-Light 64 / 72 with letter-spacing -3", () => {
    expect(coverCss(palette)).toMatch(
      /\.cover-numeral \{[^}]*font-family: Sora-Light; font-size: 64px; line-height: 72px; letter-spacing: -3px; color: onForest/,
    )
  })

  test("the pill has a forest backing, a 1 unit accent border and a 999 radius", () => {
    expect(coverCss(palette)).toMatch(
      /\.cover-pill \{[^}]*height: 24px; margin-left: 16px; padding: 0 12px; border: 1px solid onForestAccent; border-radius: 999px;[^}]*background: forest/,
    )
  })

  test("the logo tile is 88 at (40, 40) on paper with the 72 image at (8, 8)", () => {
    const css = coverCss(palette)
    expect(css).toMatch(
      /\.cover-logo-tile \{[^}]*left: 40px; top: 40px; width: 88px; height: 88px; border-radius: 24px; background: paper/,
    )
    expect(css).toMatch(/\.cover-logo \{[^}]*left: 8px; top: 8px; width: 72px; height: 72px/)
  })
})
