import { fr } from "../../i18n"
import { EXPORT_FONT_FILES } from "./assets"
import { PDF_LAYOUT_SCALE, PDF_PAGE, PDF_PAGE_BLOCK_HEIGHT, pdfLayoutFor } from "./export-settings"
import {
  DRAFT_BANNER_HEIGHT,
  PAGE_FOOTER_HEIGHT,
  PAGE_HEADER_HEIGHT,
  PAGE_MARGIN_X,
  PDF_CLASS,
  PDF_CSP,
  buildBaseCss,
  cspMetaTag,
  fontFaceCss,
  fontWarmupHtml,
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
    expect(PDF_CSP).toBe("default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'")
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
    expect(css).toContain("src: url(data:font/ttf;base64,AAb==)")
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
    expect(ios).toMatch(/section\.page:last-of-type \{[^}]*page-break-after: auto; break-after: auto;/)
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
