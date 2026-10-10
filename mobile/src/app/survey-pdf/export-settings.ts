import type { PhotoExportSettings } from "./photo-prep"
import type { PdfLayout } from "./types"

// The measured constants of the PDF export, written once (plan 25.1-07, Task 3). They come from
// real PDFs of the iOS simulator (iPhone 18 Pro and Pro Max, iOS 27.0) and the Android emulator
// (API 36), measured on 2026-10-10 with pdfinfo, pdffonts, pdfimages and pdftotext -bbox, and were
// approved by the owner the same day. See 25.1-07-SUMMARY.md. Every layout plan reads them here.
// Pure: no react-native and no native module, so the builders can import it.

/** A4 at 72 dpi, the size passed to `printToFileAsync` and the design unit of every builder. */
export const PDF_PAGE = { width: 595, height: 842 } as const

/**
 * Height of one fixed page block. A block of 842 px spilled a second page for every block on iOS
 * (13 pages for 7 blocks, measured 2026-10-10); 840 gives exactly 7 pages on iOS and Android.
 */
export const PDF_PAGE_BLOCK_HEIGHT = 840

/** Share of a page block that the greedy packer of `paginate.ts` may fill (RESEARCH, not measured). */
export const PDF_PAGE_FILL_FACTOR = 0.9

/**
 * Scale applied once on the root, so that 595 design px fill the 595 pt page. A CSS px prints as
 * 0.8008 pt on iOS (100 px = 80.08 pt, same on iPhone 18 Pro and Pro Max, with or without a
 * viewport meta tag) and 0.7491 pt on Android (96 dpi), measured 2026-10-10. 1.25 on iOS would
 * overflow the page by 0.6 pt.
 */
export const PDF_LAYOUT_SCALE = { ios: 1.2487, android: 4 / 3 } as const

export function pdfLayoutFor(platform: "ios" | "android"): PdfLayout {
  return { platform, layoutScale: PDF_LAYOUT_SCALE[platform] }
}

/**
 * Photos in the PDF: 24 of 24 present, JPEG kept by both engines, PDF 2.8 to 3.0 MB on iOS and 1.7
 * to 1.8 MB on Android, about 282 ppi in the 255 px cell (measured 2026-10-10 in the simulator and
 * the emulator, 24 distinct photos).
 */
export const PHOTO_EXPORT_SETTINGS: PhotoExportSettings = {
  cap: 24,
  longEdgePx: 800,
  jpegQuality: 0.65,
}

/** Frame of the map snapshot and of its SVG overlay, aligned on both platforms (2026-10-10). */
export const MAP_FRAME_SIZE = { width: 515, height: 340 } as const

/** Longest wait of the optional parcel geometry fetch (RESEARCH; not exercised by the spike). */
export const GEOMETRY_FETCH_TIMEOUT_MS = 4000

/**
 * No hidden text per font on page 1: the six charter fonts were embedded in the PDF on iOS and
 * Android, also on the first export after a cold launch (pdffonts, 2026-10-10).
 */
export const PDF_FONT_WARMUP = false
