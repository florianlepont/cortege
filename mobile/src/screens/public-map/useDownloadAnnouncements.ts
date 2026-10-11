import { useEffect, useRef } from "react"
import { AccessibilityInfo } from "react-native"
import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"
import { announceStep } from "./DownloadStatusView"

const chip = fr.mapLayers.download.chip

/** The announced outcome of a finished status, as the chip words it. */
function outcomeLabel(status: Exclude<AreaDownloadStatus, { phase: "running" }>): string {
  if (status.phase === "failed") return chip.failed
  return status.failedLayers.length > 0 ? chip.partial : chip.done
}

/**
 * What a screen reader hears of an offline-area download (UI-SPEC section 6): the start, each
 * step of 25 % and the outcome, once each. It belongs to the Explorer screen, not to the chip, so
 * the announcements go on while the swipe mode hides the chip. Nothing is spoken twice, and a
 * status that comes back to "running" after an outcome (a retry) is a new run.
 */
export function useDownloadAnnouncements(status: AreaDownloadStatus | null): void {
  const run = useRef<{ areaId: string; step: number; outcome: string | null } | null>(null)

  useEffect(() => {
    if (status === null) return
    const current = run.current
    if (status.phase === "running") {
      let state = current
      if (state === null || state.areaId !== status.areaId || state.outcome !== null) {
        state = { areaId: status.areaId, step: 0, outcome: null }
        run.current = state
        AccessibilityInfo.announceForAccessibility(chip.announceStarted)
      }
      const step = announceStep(Math.round(status.percentage))
      if (step > state.step) {
        state.step = step
        AccessibilityInfo.announceForAccessibility(chip.running(step))
      }
      return
    }
    const label = outcomeLabel(status)
    if (current !== null && current.areaId === status.areaId && current.outcome === label) return
    run.current = { areaId: status.areaId, step: current?.step ?? 0, outcome: label }
    AccessibilityInfo.announceForAccessibility(label)
  }, [status])
}
