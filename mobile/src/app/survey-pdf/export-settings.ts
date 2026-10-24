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
// Phase 30 (2026-10-14): a draft with a "Parcours utilisé" block prints 5 pages on the Android emulator
// (parcours en plein, plafonné, no factor filled; page 1 held the identity, the method, the conditions
// and the route block).
// Phase 33 (plan 33-14, 2026-10-24): the page counts of the phase 33 layout, printed through the real
// `printToFileAsync` and read with `pdfinfo` on the iPhone 18 Pro simulator (iOS 27.0, WebKit) and on an
// API 36 Android emulator (Skia), equal to the builder's `pageCount` and to Chrome on every case:
//   complete: v3.2 submitted, no map and no history 5; v3.0 draft 4; typical (one parcel on the map, 3 history
//   points, 6 photos) 6; typical with note and fullest route 7; worst case (34 genera, 3 parcels, 6 history
//   points, 24 photos, full route) 10, and 10 without the route;
//   summary: 1 page for the typical, the fullest, the no basemap and the no history cases.
// The last body text of a page ends at 746.5 pt at most (body bottom 800); the summary ends on its source lines
// at 798 to 800. Measurements: 33-14-MEASUREMENTS.md; device checks RC-05 and DC-33-01.
export const PDF_PAGE_BLOCK_HEIGHT = 840

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
 * Photos in the PDF (phase 33, D-17): cap 24 and 6 per page, JPEG 800 px at 0.65. Plan 33-14 measured
 * the lighter trial (640 px at 0.6) against it on the same 24 sources on 2026-10-24 (iOS simulator, Android
 * emulator, `pdfinfo` of the whole worst-case PDF): iOS 1460.6 KB at 800 / 0.65 against 1035.2 KB at
 * 640 / 0.6 (-29.1 %), Android 1161.2 KB against 947.9 KB (-18.4 %). The rule of the plan keeps the trial
 * only when both platforms gain at least 25 %, so the settings of 25.1-07 stay (they were 2.8 to 3.0 MB on
 * iOS and 1.7 to 1.8 MB on Android for 24 phone photos, 24 of 24 present, about 282 ppi). The lighter
 * encoding shows no visible blocking and is an owner option (see the open items of 33-14-MEASUREMENTS.md).
 */
export const PHOTO_EXPORT_SETTINGS: PhotoExportSettings = {
  cap: 24,
  longEdgePx: 800,
  jpegQuality: 0.65,
}

/**
 * Frame of the map snapshot and of its SVG overlay of the complete PDF (phase 33, D-12): 250 high
 * so that the map and the trend share a page. The 340 high frame was aligned on both platforms on
 * 2026-10-10. Re-measured by plan 33-14 on 2026-10-24 with three real cadastre parcels of Fontainebleau
 * over a snapshot that draws the cadastre layer: the outline lies on the cadastre lines and the building
 * edges with no visible offset (under 2 units at 200 dpi) on the iOS simulator and on the Android emulator.
 */
export const MAP_FRAME_SIZE = { width: 515, height: 250 } as const

/**
 * Frame of the map snapshot of the one-page summary (phase 33, UI-SPEC B.10 zone Z3). Overlay alignment
 * measured by plan 33-14 on 2026-10-24 on the iOS simulator and the Android emulator, same method as
 * `MAP_FRAME_SIZE`: no visible offset between the outline and the cadastre lines or the building edges.
 */
export const SUMMARY_MAP_FRAME_SIZE = { width: 515, height: 228 } as const

/** Longest wait of the optional parcel geometry fetch (RESEARCH; not exercised by the spike). */
export const GEOMETRY_FETCH_TIMEOUT_MS = 4000

/**
 * No hidden text per font on page 1: the six charter fonts were embedded in the PDF on iOS and
 * Android, also on the first export after a cold launch (pdffonts, 2026-10-10).
 */
export const PDF_FONT_WARMUP = false
