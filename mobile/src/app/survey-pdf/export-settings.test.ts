import {
  GEOMETRY_FETCH_TIMEOUT_MS,
  MAP_FRAME_SIZE,
  PDF_FONT_WARMUP,
  PDF_LAYOUT_SCALE,
  PDF_PAGE,
  PDF_PAGE_BLOCK_HEIGHT,
  PHOTO_EXPORT_SETTINGS,
  SUMMARY_MAP_FRAME_SIZE,
  pdfLayoutFor,
} from "./export-settings"

describe("export settings (measured in plan 25.1-07, approved 2026-10-10)", () => {
  test("the page is A4 at 72 dpi and the blocks stay 2 px below its height", () => {
    expect(PDF_PAGE).toEqual({ width: 595, height: 842 })
    expect(PDF_PAGE_BLOCK_HEIGHT).toBe(840)
    expect(PDF_PAGE_BLOCK_HEIGHT).toBeLessThan(PDF_PAGE.height)
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

  test("the photo settings are the owner's choice of 2026-10-26: 640 px / 0.6 (-29 % iOS, -18 % Android, plan 33-14)", () => {
    expect(PHOTO_EXPORT_SETTINGS).toEqual({ cap: 24, longEdgePx: 640, jpegQuality: 0.6 })
  })

  test("the map frame, the geometry timeout and the font warm-up", () => {
    expect(MAP_FRAME_SIZE).toEqual({ width: 515, height: 250 })
    expect(GEOMETRY_FETCH_TIMEOUT_MS).toBe(4000)
    expect(PDF_FONT_WARMUP).toBe(false)
  })

  test("the one-page summary has its own, shorter map frame (515 x 228, UI-SPEC B.10)", () => {
    expect(SUMMARY_MAP_FRAME_SIZE).toEqual({ width: 515, height: 228 })
    expect(SUMMARY_MAP_FRAME_SIZE.width).toBe(MAP_FRAME_SIZE.width)
    expect(SUMMARY_MAP_FRAME_SIZE.height).toBeLessThan(MAP_FRAME_SIZE.height)
  })
})
