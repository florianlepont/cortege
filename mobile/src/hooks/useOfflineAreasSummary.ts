import { useCallback, useState } from "react"
import { listOfflineAreas } from "../storage/offline-map"

export type OfflineAreasSummary = { count: number; bytes: number }

const EMPTY: OfflineAreasSummary = { count: 0, bytes: 0 }

/**
 * The downloaded offline-map zones in one line for Paramètres: how many are ready and how much
 * room they take (their size estimate). `refresh` reads the local database again; a failure leaves
 * the previous value.
 */
export function useOfflineAreasSummary(): {
  summary: OfflineAreasSummary
  refresh: () => Promise<void>
} {
  const [summary, setSummary] = useState<OfflineAreasSummary>(EMPTY)
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const areas = (await listOfflineAreas()).filter((area) => area.status === "ready")
      setSummary({
        count: areas.length,
        bytes: areas.reduce((total, area) => total + area.estimatedBytes, 0),
      })
    } catch {
      // The summary is a nicety: keep what was shown.
    }
  }, [])
  return { summary, refresh }
}
