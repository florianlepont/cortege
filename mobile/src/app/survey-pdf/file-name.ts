import { fr } from "../../i18n"

// The name of the shared PDF (phase 25.1, D-11): `Cortege-IBP-<site>[-<year>][-brouillon].pdf`.
// The site name is user text, so it is reduced to ASCII letters and digits joined by single dashes:
// no separator, no dot and no accent can reach the file system. Pure.

const t = fr.surveyExport.file

/** Longest site part of the name, in characters. */
export const EXPORT_SITE_SLUG_MAX = 40

// A cut inside a word backs up to the last dash only when that dash is in the second half of the
// slug, so a name is never reduced to its first word just to end on a boundary.
const BACK_UP_FROM = EXPORT_SITE_SLUG_MAX / 2

const FIRST_YEAR = 1000
const LAST_YEAR = 9999

/** ASCII letters and digits joined by single dashes; accents are dropped, anything else is a dash. */
function slugOf(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** The slug cut to the limit, on a word boundary when one is close, with no trailing dash. */
function capSlug(slug: string): string {
  if (slug.length <= EXPORT_SITE_SLUG_MAX) return slug
  const cut = slug.slice(0, EXPORT_SITE_SLUG_MAX)
  const onBoundary = slug[EXPORT_SITE_SLUG_MAX] === "-" || cut.endsWith("-")
  const lastDash = cut.lastIndexOf("-")
  const kept = !onBoundary && lastDash >= BACK_UP_FROM ? cut.slice(0, lastDash) : cut
  return kept.replace(/-+$/, "")
}

function isPlainYear(year: number | null): year is number {
  return year !== null && Number.isInteger(year) && year >= FIRST_YEAR && year <= LAST_YEAR
}

/** The observation year, else the year of the survey date, else nothing. */
function yearOf(observationYear: number | null, dateIso: string): string | null {
  if (isPlainYear(observationYear)) return String(observationYear)
  const date = new Date(dateIso)
  const year = Number.isNaN(date.getTime()) ? null : date.getUTCFullYear()
  return isPlainYear(year) ? String(year) : null
}

/**
 * The file name of the export. It always matches `^[A-Za-z0-9-]+\.pdf$`: the site falls back to
 * the neutral word when nothing readable remains, and the year is left out when it is unknown.
 */
export function buildExportFileName(input: {
  siteName: string
  observationYear: number | null
  dateIso: string
  isDraft: boolean
}): string {
  const site = capSlug(slugOf(input.siteName)) || t.fallbackSite
  const parts = [t.prefix, site]
  const year = yearOf(input.observationYear, input.dateIso)
  if (year !== null) parts.push(year)
  if (input.isDraft) parts.push(t.draftSuffix)
  return `${parts.join("-")}.pdf`
}
