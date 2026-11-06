import { fr } from "../../i18n"
import { EXPORT_FONT_FILES } from "./assets"
import { PDF_LAYOUT_SCALE, PDF_PAGE, PDF_PAGE_BLOCK_HEIGHT, pdfLayoutFor } from "./export-settings"
import {
  COVER_BANNER_TOP,
  COVER_PANEL_HEIGHT,
  COVER_WATERMARK_TOP,
  DRAFT_BANNER_HEIGHT,
  PAGE_FOOTER_HEIGHT,
  PAGE_HEADER_HEIGHT,
  PAGE_MARGIN_X,
  PDF_CLASS,
  PDF_CSP,
  PDF_LOGO_DATA_URI,
  SUMMARY_BODY_HEIGHT,
  SUMMARY_BODY_TOP,
  buildBaseCss,
  cspMetaTag,
  fontFaceCss,
  fontWarmupHtml,
  sectionTitleCss,
} from "./styles"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfPalette } from "./types"

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

const FONTS = [
  { family: "Sora-ExtraBold", base64: "AAAA" },
  { family: "Jost-Regular", base64: "QUJD" },
]

describe("PDF_CSP", () => {
  test("is exactly the policy that lets the print WebView load nothing", () => {
    expect(PDF_CSP).toBe(
      "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'",
    )
  })

  test("the meta tag wraps it as an http-equiv Content-Security-Policy element", () => {
    const tag = cspMetaTag()
    expect(tag).toBe(`<meta http-equiv="Content-Security-Policy" content="${PDF_CSP}">`)
    expect(tag).not.toMatch(/http:|https:/)
  })

  test("allows no script, no connection and no remote source", () => {
    expect(PDF_CSP).not.toMatch(/script-src|connect-src|https?:|\*/)
    expect(PDF_CSP.startsWith("default-src 'none'")).toBe(true)
  })
})

describe("fontFaceCss", () => {
  test("emits one @font-face per font, with a data URI source", () => {
    const css = fontFaceCss(FONTS)
    expect(css.match(/@font-face/g)).toHaveLength(2)
    expect(css).toContain(
      '@font-face { font-family: "Sora-ExtraBold"; src: url(data:font/ttf;base64,AAAA) format("truetype");',
    )
    expect(css).toContain(
      '@font-face { font-family: "Jost-Regular"; src: url(data:font/ttf;base64,QUJD) format("truetype");',
    )
  })

  test("an empty list gives an empty string", () => {
    expect(fontFaceCss([])).toBe("")
  })

  test("keeps only base64 characters in the data and name characters in the family", () => {
    const css = fontFaceCss([{ family: 'Evil"; } body { x: y', base64: "AA);}</style><b>==" }])
    expect(css).toContain("src: url(data:font/ttf;base64,AA/styleb==)")
    expect(css).not.toMatch(/<|>|\{ x|\);\}/)
    expect(css.match(/@font-face/g)).toHaveLength(1)
    expect(css).toContain('font-family: "Evilbodyxy"')
  })

  test("never writes a remote address", () => {
    expect(fontFaceCss(FONTS)).not.toMatch(/https?:/)
  })

  test("every family of PDF_FONT_FAMILIES is one of the bundled export fonts", () => {
    const bundled = EXPORT_FONT_FILES.map((file) => file.family)
    for (const family of Object.values(PDF_FONT_FAMILIES)) {
      expect(bundled).toContain(family)
    }
  })
})

describe("buildBaseCss", () => {
  const ios = buildBaseCss(palette, pdfLayoutFor("ios"))
  const android = buildBaseCss(palette, pdfLayoutFor("android"))

  test("declares the A4 @page without margin", () => {
    expect(ios).toContain("@page { size: 595pt 842pt; margin: 0; }")
    expect(PDF_PAGE).toEqual({ width: 595, height: 842 })
  })

  test("applies the platform layout scale once, on the root class", () => {
    expect(ios).toContain(`.${PDF_CLASS.root} { zoom: ${PDF_LAYOUT_SCALE.ios}; }`)
    expect(android).toContain(`.${PDF_CLASS.root} { zoom: ${PDF_LAYOUT_SCALE.android}; }`)
    expect(ios.match(/zoom:/g)).toHaveLength(1)
    expect(ios).not.toMatch(/transform: scale|\bscale\(/)
  })

  test("an unusable scale falls back to 1", () => {
    for (const layoutScale of [0, -2, Number.NaN, Number.POSITIVE_INFINITY]) {
      const css = buildBaseCss(palette, { platform: "ios", layoutScale })
      expect(css).toContain(`.${PDF_CLASS.root} { zoom: 1; }`)
    }
  })

  test("the page is a fixed 595 x block-height box that breaks after itself except the last", () => {
    expect(ios).toContain(
      `.${PDF_CLASS.page} { position: relative; width: ${PDF_PAGE.width}px; height: ${PDF_PAGE_BLOCK_HEIGHT}px; overflow: hidden;`,
    )
    expect(ios).toMatch(/\.page \{[^}]*page-break-after: always; break-after: page;/)
    expect(ios).toMatch(
      /section\.page:last-of-type \{[^}]*page-break-after: auto; break-after: auto;/,
    )
  })

  test("the page body fills exactly the space between the header and the footer", () => {
    const height = PDF_PAGE_BLOCK_HEIGHT - PAGE_HEADER_HEIGHT - PAGE_FOOTER_HEIGHT
    expect(ios).toMatch(
      new RegExp(
        `\\.page-body \\{[^}]*left: ${PAGE_MARGIN_X}px; top: ${PAGE_HEADER_HEIGHT}px; width: ${
          PDF_PAGE.width - 2 * PAGE_MARGIN_X
        }px; height: ${height}px;`,
      ),
    )
  })

  test("a draft page moves its body under the banner", () => {
    const top = PAGE_HEADER_HEIGHT + DRAFT_BANNER_HEIGHT
    const height = PDF_PAGE_BLOCK_HEIGHT - top - PAGE_FOOTER_HEIGHT
    expect(ios).toMatch(
      new RegExp(`\\.page-draft \\.page-body \\{[^}]*top: ${top}px; height: ${height}px;`),
    )
  })

  test("defines every class the paginator emits", () => {
    for (const name of Object.values(PDF_CLASS)) {
      expect(ios).toContain(`.${name}`)
    }
  })

  test("the watermark is a rotated layer in the watermark colour, without CSS opacity", () => {
    expect(ios).toMatch(/\.page-watermark \{[^}]*transform: rotate\(-30deg\);/)
    expect(ios).toMatch(/\.page-watermark \{[^}]*color: watermark;/)
    expect(ios).not.toMatch(/opacity:/)
  })

  test("the banner uses the alert colours of the palette", () => {
    expect(ios).toMatch(/\.page-draft-banner \{[^}]*background: alertSoft;[^}]*color: alert;/)
  })

  test("colours are palette values only and fonts are the charter fonts with a system fallback", () => {
    expect(ios).not.toMatch(/#[0-9A-Fa-f]{3,8}\b|rgba?\(/)
    expect(ios).toContain(PDF_FONT_FAMILIES.title)
    expect(ios).toContain(PDF_FONT_FAMILIES.body)
    expect(ios).toContain(PDF_FONT_FAMILIES.label)
    expect(ios).toMatch(/font-family: "Jost-Regular", [^;]*sans-serif;/)
  })

  test("prints backgrounds and uses no column-count, no remote address, no print-media rule", () => {
    expect(ios).toContain("print-color-adjust: exact")
    expect(ios).not.toMatch(/column-count|https?:|@media/)
  })

  test("is the same for the same inputs", () => {
    expect(buildBaseCss(palette, pdfLayoutFor("ios"))).toBe(ios)
  })
})

describe("page kind geometry", () => {
  const ios = buildBaseCss(palette, pdfLayoutFor("ios"))

  test("pins the measures of the cover and the summary (UI-SPEC B.1, B.4, B.10)", () => {
    expect(COVER_PANEL_HEIGHT).toBe(356)
    expect(COVER_BANNER_TOP).toBe(368)
    expect(COVER_WATERMARK_TOP).toBe(543)
    expect(SUMMARY_BODY_TOP).toBe(36)
    expect(SUMMARY_BODY_HEIGHT).toBe(764)
    expect(SUMMARY_BODY_TOP + SUMMARY_BODY_HEIGHT + PAGE_FOOTER_HEIGHT).toBe(PDF_PAGE_BLOCK_HEIGHT)
  })

  test("the cover body covers the whole page, also on a draft", () => {
    expect(ios).toMatch(
      /\.page-cover \.page-body, \.page-draft\.page-cover \.page-body \{[^}]*left: 0; top: 0; width: 595px; height: 840px;/,
    )
  })

  test("the summary body starts at 36 and is 764 high, also on a draft", () => {
    expect(ios).toMatch(
      /\.page-summary \.page-body, \.page-draft\.page-summary \.page-body \{[^}]*top: 36px; height: 764px;/,
    )
  })

  test("both page kinds are written after the draft body rule so they win over it", () => {
    const draft = ios.indexOf(".page-draft .page-body {")
    expect(draft).toBeGreaterThan(0)
    expect(ios.indexOf(".page-cover .page-body")).toBeGreaterThan(draft)
    expect(ios.indexOf(".page-summary .page-body")).toBeGreaterThan(draft)
  })

  test("the cover moves the draft banner under the panel and the watermark into the light part", () => {
    expect(ios).toMatch(/\.page-cover \.page-draft-banner \{[^}]*top: 368px;/)
    expect(ios).toMatch(/\.page-cover \.page-watermark \{[^}]*top: 543px;/)
    expect(ios.indexOf(".page-cover .page-watermark")).toBeGreaterThan(
      ios.indexOf(".page-watermark {"),
    )
  })

  test("the running header no longer styles a logo", () => {
    expect(ios).not.toContain("page-logo")
    expect(PDF_CLASS).not.toHaveProperty("logo")
  })
})

describe("sectionTitleCss", () => {
  const css = sectionTitleCss(".x-heading", palette)

  test("is one rule for the given selector", () => {
    expect(css.startsWith(".x-heading { ")).toBe(true)
    expect(css.match(/\{/g)).toHaveLength(1)
  })

  test("draws the 24 unit line box with the 4 unit accent bar (UI-SPEC B.3)", () => {
    for (const declaration of [
      "margin: 0",
      "height: 24px",
      "box-sizing: border-box",
      "font-size: 13px",
      "line-height: 24px",
      "border-left: 4px solid accent",
      "padding-left: 8px",
      "color: accent",
    ]) {
      expect(css).toContain(`${declaration};`)
    }
    expect(css).toContain(`font-family: "${PDF_FONT_FAMILIES.heading}", `)
  })

  test("uses palette values only", () => {
    expect(css).not.toMatch(/#[0-9A-Fa-f]{3,8}\b|rgba?\(/)
  })
})

describe("PDF_LOGO_DATA_URI", () => {
  test("accepts a base64 PNG or JPEG data URI", () => {
    expect(PDF_LOGO_DATA_URI.test("data:image/png;base64,iVBORw0KGgo=")).toBe(true)
    expect(PDF_LOGO_DATA_URI.test("data:image/jpeg;base64,/9j/4AAQ")).toBe(true)
  })

  test("rejects a remote address, a broken attribute and any other type", () => {
    for (const value of [
      "https://example.invalid/logo.png",
      'data:image/png;base64,AAAA" onerror="x',
      "data:text/html;base64,AAAA",
      "data:image/svg+xml;base64,AAAA",
      "",
    ]) {
      expect(PDF_LOGO_DATA_URI.test(value)).toBe(false)
    }
  })
})

describe("fontWarmupHtml", () => {
  test("is empty when the warm-up is off", () => {
    expect(fontWarmupHtml(FONTS, false)).toBe("")
  })

  test("is empty by default because the approved setting is off (25.1-07)", () => {
    expect(fontWarmupHtml(FONTS)).toBe("")
  })

  test("writes hidden text in each family when on", () => {
    const html = fontWarmupHtml(FONTS, true)
    expect(html).toContain(`class="${PDF_CLASS.warmup}"`)
    expect(html).toContain('style="font-family: &quot;Sora-ExtraBold&quot;"')
    expect(html).toContain('style="font-family: &quot;Jost-Regular&quot;"')
    expect(html).toContain(fr.surveyExport.sheetTitle)
    expect(html).toContain('aria-hidden="true"')
  })

  test("is empty with no font even when on", () => {
    expect(fontWarmupHtml([], true)).toBe("")
  })

  test("keeps only name characters in the family", () => {
    const html = fontWarmupHtml([{ family: 'A"><script>', base64: "" }], true)
    expect(html).not.toContain("<script")
  })
})
