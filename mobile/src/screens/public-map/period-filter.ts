// MAP-02: the map's period filter is a small fixed set of presets (chips), not a free-text date
// range. Each preset resolves to the same "from"/"to" (YYYY-MM-DD) shape the public-map API and
// usePublicMapExplorer already expect.

export const PERIOD_KEYS = ["all", "month", "quarter", "year"] as const
export type PeriodKey = (typeof PERIOD_KEYS)[number]

// Built from local date components, not `toISOString()` (which converts to UTC and can roll the
// date backward or forward by a day depending on the device's timezone).
function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** First day of the month `monthsAgo` months before `now` (0 = the current month). */
function startOfMonthsAgo(now: Date, monthsAgo: number): Date {
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
}

export type PeriodRange = { from: string; to: string }

/** "all" clears the filter entirely; every other preset ends today. */
export function computePeriodRange(period: PeriodKey, now: Date = new Date()): PeriodRange {
  if (period === "all") {
    return { from: "", to: "" }
  }
  const to = toIsoDate(now)
  if (period === "month") {
    return { from: toIsoDate(startOfMonthsAgo(now, 0)), to }
  }
  if (period === "quarter") {
    return { from: toIsoDate(startOfMonthsAgo(now, 2)), to }
  }
  return { from: toIsoDate(new Date(now.getFullYear(), 0, 1)), to }
}
