import {
  GEOMETRY_FETCH_TIMEOUT_MS,
  MAP_FRAME_SIZE,
  PDF_FONT_WARMUP,
  PDF_LAYOUT_SCALE,
  PDF_PAGE,
  PDF_PAGE_BLOCK_HEIGHT,
  PDF_PAGE_FILL_FACTOR,
  PHOTO_EXPORT_SETTINGS,
  pdfLayoutFor,
} from "./export-settings"

describe("export settings (measured in plan 25.1-07, approved 2026-10-10)", () => {
  test("the page is A4 at 72 dpi and the blocks stay 2 px below its height", () => {
    expect(PDF_PAGE).toEqual({ width: 595, height: 842 })
    expect(PDF_PAGE_BLOCK_HEIGHT).toBe(840)
    expect(PDF_PAGE_BLOCK_HEIGHT).toBeLessThan(PDF_PAGE.height)
    expect(PDF_PAGE_FILL_FACTOR).toBe(0.9)
  })

  test("pdfLayoutFor gives the measured scale of each platform", () => {
    expect(pdfLayoutFor("ios")).toEqual({ platform: "ios", layoutScale: 1.2487 })
    expect(pdfLayoutFor("android")).toEqual({ platform: "android", layoutScale: 4 / 3 })
    expect(PDF_LAYOUT_SCALE).toEqual({ ios: 1.2487, android: 4 / 3 })
  })

  test("a scaled page block fills the page on both platforms without passing its height", () => {
    // pt per CSS px at zoom 1, measured with pdftotext -bbox on the calibration page.
    const ptPerPx = { ios: 0.80081, android: 0.7491 }
    for (const platform of ["ios", "android"] as const) {
      const { layoutScale } = pdfLayoutFor(platform)
      const heightPt = PDF_PAGE_BLOCK_HEIGHT * layoutScale * ptPerPx[platform]
      expect(heightPt).toBeGreaterThan(838)
      expect(heightPt).toBeLessThanOrEqual(840.96)
    }
  })

  test("the photo settings are the approved ones", () => {
    expect(PHOTO_EXPORT_SETTINGS).toEqual({ cap: 24, longEdgePx: 800, jpegQuality: 0.65 })
  })

  test("the map frame, the geometry timeout and the font warm-up", () => {
    expect(MAP_FRAME_SIZE).toEqual({ width: 515, height: 340 })
    expect(GEOMETRY_FETCH_TIMEOUT_MS).toBe(4000)
    expect(PDF_FONT_WARMUP).toBe(false)
  })
})
