import { fr } from "../i18n"

export const formatPoints = (value: number): string => `${value} point${value > 1 ? "s" : ""}`

export const formatEventPayload = (payload?: Record<string, unknown> | null): string => {
  if (!payload) return ""
  const json = JSON.stringify(payload)
  if (!json) return ""
  return json.length > 120 ? `${json.slice(0, 117)}...` : json
}

export const formatDateTime = (value?: string | null): string => {
  if (!value) return "n/a"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

export const formatShortDateTime = (value?: string | null): string => {
  if (!value) return "n/a"
  const date = new Date(value)
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
