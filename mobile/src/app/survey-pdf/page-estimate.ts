// Phase 33, D-05: the "Environ N pages" of the export choice sheet's "Complet" card. The real page
// count exists only after the PDF is assembled, so this is an estimate: a fixed base plus the photo
// pages. Plan 33-13 pins it to the page counts of the builder on the fixtures (research Pitfall 8:
// exact for the typical survey, within one page for the others), so a layout change that moves the
// count fails a test instead of drifting silently.
import { PHOTO_EXPORT_SETTINGS } from "./export-settings"
import { PHOTOS_PER_PAGE } from "./photos-section"

/**
 * Pages of the complete PDF before its photo pages, for the typical survey: the cover with the parcel
 * map, the identity card with the factor chart and factor A, the factors B to G, and the context
 * heading with the factors H to J and the trend. This is the page count of `exportFixtureTypical`
 * with its photos removed, measured on the final builder. Plan 33-13: 5 (map and trend on their own
 * page); re-derived by plan 33-18 (2026-10-26, D-24: the map moved to the cover): 4.
 * `page-estimate.test.ts` fails when it drifts.
 */
export const COMPLETE_BASE_PAGES = 4

/** The smallest PDF there is: the cover and one page of content. */
const MIN_PAGES = 2

/**
 * The approximate page count of the complete PDF: the base plus one page per six photos, the photos
 * being capped like the export itself. A negative or NaN count is read as no photo.
 */
export function estimateCompletePages({ photoCount }: { photoCount: number }): number {
  const count = Number.isNaN(photoCount) ? 0 : photoCount
  const photos = Math.min(Math.max(count, 0), PHOTO_EXPORT_SETTINGS.cap)
  return Math.max(MIN_PAGES, COMPLETE_BASE_PAGES + Math.ceil(photos / PHOTOS_PER_PAGE))
}
