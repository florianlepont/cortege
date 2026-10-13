import { useEffect } from "react"
import type { BaseLayerKey } from "../../map/layers"
import { useLatestCallback } from "../../state/useLatestCallback"

/** The side an offline exit keeps: the left layer, as the quit pill does, unless only the right one is downloaded here. */
export function offlineKeep(
  compare: { sideA: BaseLayerKey; sideB: BaseLayerKey } | null,
  isAvailable: (key: BaseLayerKey) => boolean,
): "A" | "B" {
  return compare && !isAvailable(compare.sideA) && isAvailable(compare.sideB) ? "B" : "A"
}

/**
 * The comparison needs a connection. If it is on when the connection is lost (or is on while
 * offline), `exit` ends it at once with the side `offlineKeep` picks; the screen then shows the
 * single map with its one offline pill.
 */
export function useOfflineCompareExit(
  active: boolean,
  compare: { sideA: BaseLayerKey; sideB: BaseLayerKey } | null,
  isAvailable: (key: BaseLayerKey) => boolean,
  exit: (keeps: "A" | "B") => void,
): void {
  const latest = useLatestCallback(() => exit(offlineKeep(compare, isAvailable)))
  useEffect(() => {
    if (active) latest()
  }, [active, latest])
}
