// Phase 33, D-05: the "Environ N pages" of the export choice sheet's "Complet" card. The real page
// count exists only after the PDF is assembled, so this is an estimate: a fixed base plus the photo
// pages. Plan 33-13 pins it to the page counts of the builder on the fixtures (research Pitfall 8),
// so a layout change that moves the count fails a test instead of drifting silently.
import { PHOTO_EXPORT_SETTINGS } from "./export-settings"
import { PHOTOS_PER_PAGE } from "./photos-section"

/**
 * Pages of the complete PDF before its photo pages, for the typical survey with the cover (research
 * section 5: five pages). Plan 33-13 replaces this value with the final builder's count and pins it
 * to the fixtures.
 */
export const COMPLETE_BASE_PAGES = 5

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
