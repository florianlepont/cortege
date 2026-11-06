import {
  exportFixtureTypical,
  exportFixtureV30Draft,
  exportFixtureV32Submitted,
  exportFixtureWorstCase,
} from "../../../test/survey-export-fixtures"
import { fr } from "../../i18n"
import { CONTOUR_VIEWBOX, buildContourPaths } from "../contour-paths"
import { buildCoverBlocks, coverCss } from "./cover-section"
import { COVER_MAP_FRAME_SIZE } from "./export-settings"
import { escapeHtml, formatDateFr } from "./html"
import { buildMapFigure, mapFigureCss } from "./map-figure"
import { paginateBlocks } from "./paginate"
import type { PageChrome } from "./paginate"
import { COVER_BANNER_TOP, COVER_PANEL_HEIGHT, COVER_WATERMARK_TOP, PDF_CLASS } from "./styles"
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
      /\.cover-title \{[^}]*left: 40px; top: 148px; width: 340px; height: 84px; overflow: hidden/,
    )
    expect(coverCss(palette)).toMatch(/\.cover-date \{[^}]*left: 40px; top: 240px/)
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
    expect(coverCss(palette)).toMatch(/\.cover-provisional \{[^}]*top: 336px/)
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
    // The observer is on page 2 only: the cover prints no identity fact any more.
    expect(html).not.toContain("alert(1)</script>")
  })
})

describe("the sub-score tiles", () => {
  test("two tiles at 376 on a submitted survey and 400 on a draft", () => {
    expect(htmlOf(submitted)).toContain('<div class="cover-tiles" style="top: 376px">')
    expect(htmlOf(draft)).toContain('<div class="cover-tiles" style="top: 400px">')
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

describe("the parcel map zone (D-24)", () => {
  // The typical fixture has one parcel on a basemap; the worst case has three.
  const mapped = withData({
    parcelIds: exportFixtureTypical.parcelIds,
    map: exportFixtureTypical.map,
  })

  test("sits at 504 on a submitted survey and 528 on a draft, 264 high, ending above the footer", () => {
    expect(htmlOf(mapped)).toContain('<div class="cover-map" style="top: 504px">')
    expect(htmlOf({ ...mapped, isDraft: true })).toContain(
      '<div class="cover-map" style="top: 528px">',
    )
    expect(coverCss(palette)).toMatch(/\.cover-map \{[^}]*left: 40px; width: 515px; height: 264px/)
    expect(504 + 264).toBe(768)
    expect(528 + 264).toBe(792)
    expect(528 + 264).toBeLessThan(804)
  })

  test("the box is the cover frame, 228 high, 20 under the zone top, with hidden overflow", () => {
    expect(COVER_MAP_FRAME_SIZE).toEqual({ width: 515, height: 228 })
    expect(coverCss(palette)).toMatch(
      /\.cover-map-box \{[^}]*left: 0; top: 20px; width: 515px; height: 228px; overflow: hidden/,
    )
    expect(coverCss(palette)).toMatch(
      /\.cover-map-legend \{[^}]*top: 252px; width: 515px; height: 12px; overflow: hidden; white-space: nowrap;[^}]*font-size: 8px; line-height: 12px; color: inkMuted/,
    )
    expect(coverCss(palette)).toMatch(
      /\.cover-map-heading \{[^}]*top: 0; width: 515px; height: 20px; overflow: hidden; white-space: nowrap; font-family: Sora-SemiBold; font-size: 11px; line-height: 20px; color: ink/,
    )
  })

  test("with a basemap: the heading, the shared figure in the box and the source line", () => {
    const html = htmlOf(mapped)
    const figure = buildMapFigure(mapped.map, palette)
    expect(figure.kind).toBe("figure")
    if (figure.kind !== "figure") return
    expect(figure.hasBasemap).toBe(true)
    expect(html).toContain(`<div class="cover-map-heading">${t.map.heading}</div>`)
    expect(html).toContain(`<div class="cover-map-box">${figure.html}</div>`)
    expect(html).toContain(`<div class="cover-map-legend">${escapeHtml(t.map.source)}</div>`)
    expect((html.match(/class="map-frame"/g) ?? []).length).toBe(1)
    expect(html).not.toContain("cover-quiet")
  })

  test("with the outline only: the figure on the pale canvas and the outline-only legend", () => {
    const outline = withData({
      parcelIds: exportFixtureTypical.parcelIds,
      map: exportFixtureTypical.map && { ...exportFixtureTypical.map, basemap: null },
    })
    const html = htmlOf(outline)
    expect(html).toContain('class="map-canvas"')
    expect(html).not.toContain("map-image")
    expect(html).toContain(`<div class="cover-map-legend">${t.map.outlineOnly}</div>`)
    expect(html).not.toContain(escapeHtml(t.map.source))
  })

  test("a basemap that is not a base64 JPEG data URI gives the outline (T-33-44)", () => {
    for (const dataUri of ["http://example.com/m.jpg", 'data:image/jpeg;base64,AAAA"onerror="x']) {
      const base = exportFixtureTypical.map
      const html = htmlOf(
        withData({
          parcelIds: exportFixtureTypical.parcelIds,
          map: base && base.basemap ? { ...base, basemap: { ...base.basemap, dataUri } } : base,
        }),
      )
      expect(html).toContain('class="map-canvas"')
      expect(html).not.toContain("map-image")
      expect(html).not.toContain("http:")
      expect(html).not.toContain("onerror")
      expect(html).toContain(t.map.outlineOnly)
    }
  })

  test("no parcel: a quiet panel with the no-parcel sentence and no legend", () => {
    const html = htmlOf(withData({ parcelIds: [], map: null }))
    expect(html).toContain(`<div class="cover-quiet">${t.map.noParcel}</div>`)
    expect(html).toContain(`<div class="cover-map-heading">${t.map.heading}</div>`)
    expect(html).not.toContain("cover-map-legend")
    expect(html).not.toContain("cover-map-box")
    expect(html).not.toContain("map-frame")
  })

  test("parcels without geometry: a quiet panel with the no-outline sentence and no legend", () => {
    const html = htmlOf(withData({ parcelIds: ["77186000AB0123"], map: null }))
    expect(html).toContain(`<div class="cover-quiet">${t.map.noOutline}</div>`)
    expect(html).not.toContain("cover-map-legend")
    expect(html).not.toContain("map-frame")
  })

  test("the quiet panel is 515 x 228 on panel with a line border, radius 12 and 9 / 13 muted text", () => {
    expect(coverCss(palette)).toMatch(
      /\.cover-quiet \{[^}]*top: 20px;[^}]*width: 515px; height: 228px;[^}]*padding: 0 24px;[^}]*border: 1px solid line; border-radius: 12px; background: panel;[^}]*font-size: 9px; line-height: 13px; color: inkMuted/,
    )
  })

  test("prints no parcel id and no observation year caption anywhere on the cover", () => {
    const html = htmlOf(exportFixtureWorstCase)
    expect(exportFixtureWorstCase.parcelIds).toHaveLength(3)
    for (const id of exportFixtureWorstCase.parcelIds) expect(html).not.toContain(id)
    expect(html).not.toContain(t.identity.observationYear)
    expect(html).not.toContain(t.identity.parcels)
    expect(html).not.toContain("cover-fact")
    expect(html).not.toContain("…")
    // The long date stays in the forest panel.
    expect(html).toContain(formatDateFr(exportFixtureWorstCase.dateIso, t.identity.unknown))
  })

  test("the figure CSS closes the cover CSS, once", () => {
    const css = coverCss(palette)
    expect(css.endsWith(`${mapFigureCss(palette)}`)).toBe(true)
    expect(css.split(mapFigureCss(palette)).length - 1).toBe(1)
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
    // The draft cover moves the tiles and the map zone down by the banner height.
    expect(html).toContain('<div class="cover-tiles" style="top: 400px">')
    expect(html).toContain('<div class="cover-map" style="top: 528px">')
    expect(html).not.toContain("77186000AB0123")
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

  test("the draft banner and watermark keep their place on the shorter panel (T-33-45)", () => {
    expect(COVER_BANNER_TOP).toBe(368)
    expect(COVER_WATERMARK_TOP).toBe(543)
    // The banner strip is 18 high: 368 to 386, above the tiles at 400.
    expect(COVER_BANNER_TOP + 18).toBeLessThan(400)
  })

  test("the light part ends above the footer line on a draft and on a submitted survey", () => {
    // The map zone is 264 high: 504 to 768 submitted, 528 to 792 draft, the footer line is at 804.
    expect(528 + 264).toBeLessThan(804)
  })
})

describe("the print contract", () => {
  const forbidden = /opacity|gradient|shadow|filter|#[0-9a-fA-F]{3,8}\b|rgba?\(|http/i

  // The shared map figure ships its translucent scale and north panels since phase 25.1: the cover's
  // own HTML and CSS are checked with the figure removed.
  function ownHtml(data: SurveyExportData): string {
    const figure = buildMapFigure(data.map, palette)
    return figure.kind === "figure" ? htmlOf(data).replace(figure.html, "") : htmlOf(data)
  }

  test("the CSS and the HTML hold no opacity, gradient, shadow, filter, hex literal or http", () => {
    const own = coverCss(palette).replace(mapFigureCss(palette), "")
    expect(own).not.toMatch(forbidden)
    expect(ownHtml(submitted)).not.toMatch(forbidden)
    expect(ownHtml(draft)).not.toMatch(forbidden)
    expect(ownHtml(withData({ scores: null }))).not.toMatch(forbidden)
    for (const data of [exportFixtureTypical, exportFixtureWorstCase]) {
      expect(ownHtml(data)).not.toMatch(forbidden)
    }
    // The figure it replaced must have been there: the check above is not vacuous.
    expect(htmlOf(exportFixtureTypical)).toContain("map-frame")
  })

  test("the CSS uses only palette values and the charter fonts, with the cover- prefix", () => {
    const css = coverCss(palette).replace(mapFigureCss(palette), "")
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
