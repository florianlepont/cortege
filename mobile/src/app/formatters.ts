import { fr } from "../i18n"

export const formatPoints = (value: number): string => `${value} point${value > 1 ? "s" : ""}`

export const formatEventPayload = (payload?: Record<string, unknown> | null): string => {
  if (!payload) return ""
  const json = JSON.stringify(payload)
  if (!json) return ""
  return json.length > 120 ? `${json.slice(0, 117)}...` : json
}

// The API sends some timestamps as PostgreSQL text ("2026-10-06 10:24:20.217289+00": a space for
// the "T", microseconds, an offset without minutes), which `new Date` cannot read on the device; the
// raw text was shown in the history (OA-112). Rewrite it as ISO 8601 first, anything else is left to
// `new Date` as it is.
const POSTGRES_TIMESTAMP =
  /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)?$/

export const parseTimestamp = (value: string): Date => {
  const match = POSTGRES_TIMESTAMP.exec(value.trim())
  if (!match) return new Date(value)
  const [, day, time, fraction, zone] = match
  const millis = fraction ? `.${fraction.slice(0, 3).padEnd(3, "0")}` : ""
  let offset = zone ?? ""
  if (/^[+-]\d{2}$/.test(offset)) offset = `${offset}:00`
  else if (/^[+-]\d{4}$/.test(offset)) offset = `${offset.slice(0, 3)}:${offset.slice(3)}`
  return new Date(`${day}T${time}${millis}${offset}`)
}

/**
 * A day in words ("16 mai 2026", or with an abbreviated month "16 mai 2026" for "short"),
 * from the server's timestamps, which Hermes cannot read as they are ("2026-05-16 10:00:00+00").
 * An unreadable value comes back unchanged.
 */
export const formatDay = (value: string, month: "short" | "long" = "long"): string => {
  const date = parseTimestamp(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("fr-FR", { day: "numeric", month, year: "numeric" })
}

export const formatDateTime = (value?: string | null): string => {
  if (!value) return "n/a"
  const date = parseTimestamp(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

export const formatShortDateTime = (value?: string | null): string => {
  if (!value) return "n/a"
  const date = parseTimestamp(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type SyncErrorPatternKey = keyof typeof fr.syncErrors.patterns

// Fallback for rows stored before last_sync_error_code existed. The texts live
// in the catalogue; the raw error is only matched, never shown.
const SYNC_ERROR_PATTERNS: Array<{ pattern: RegExp; key: SyncErrorPatternKey }> = [
  { pattern: /site_name.*required|required.*site_name/i, key: "siteNameMissing" },
  { pattern: /region.*required|required.*region/i, key: "regionMissing" },
  { pattern: /vegetation.*required|required.*vegetation/i, key: "vegetationMissing" },
  { pattern: /HTTP 4\d\d/i, key: "invalidData" },
  { pattern: /HTTP 5\d\d|network|timeout|ECONNREFUSED/i, key: "network" },
  { pattern: /unauthorized|401|forbidden|403/i, key: "session" },
]

const SYNC_ERROR_BY_CODE: Readonly<Record<string, string>> = fr.syncErrors.byCode

export const formatSyncErrorForUser = (
  rawError?: string | null,
  code?: string | null,
): string | null => {
  if (!rawError?.trim()) return null
  if (code && Object.prototype.hasOwnProperty.call(SYNC_ERROR_BY_CODE, code)) {
    return SYNC_ERROR_BY_CODE[code]
  }
  for (const { pattern, key } of SYNC_ERROR_PATTERNS) {
    if (pattern.test(rawError)) return fr.syncErrors.patterns[key]
  }
  return fr.syncErrors.generic
}

/** A byte count as megabytes with one decimal ("38.0"), for the offline-map zones. */
export const formatAreaMegabytes = (bytes: number): string => (bytes / 1_000_000).toFixed(1)
