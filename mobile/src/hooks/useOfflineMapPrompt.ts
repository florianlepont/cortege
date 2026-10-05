import { useCallback, useMemo, useState } from "react"
import { isOfflineMapsEnabled } from "../app/feature-flags"
import { regionAround } from "../map/offline-coverage"
import { resolveOfflineAreaForPoint } from "../map/tile-math"
import { useIsOffline } from "./useIsOffline"
import { useOfflineAreas } from "./useOfflineAreas"

export type OfflineMapPromptState = "hidden" | "missing" | "downloading" | "covered"

export type OfflineMapPrompt = {
  state: OfflineMapPromptState
  /** Estimated download size in megabytes, one decimal ("24.0"). */
  megabytes: string
  /** 0 to 100 while downloading. */
  percent: number
  download: (areaName: string) => void
}

/**
 * Whether the map around a survey is on the phone, and the means to fetch it (12.1 lot 3).
 * "hidden": the feature is off, there is no position, or the device is offline and nothing is
 * downloaded here. "missing": online and not covered by a ready area. The download covers about 2 km
 * around the point and keeps going when the screen moves on.
 */
export function useOfflineMapPrompt(input: {
  apiUrl: string
  accessToken: string | null
  point: { lat: number; lng: number } | null
}): OfflineMapPrompt {
  const { apiUrl, accessToken, point } = input
  const enabled = isOfflineMapsEnabled()
  const offline = useIsOffline()
  const { areas, downloadingAreaId, estimateForRegion, startDownload } = useOfflineAreas(
    apiUrl,
    accessToken,
    enabled,
  )
  const [startedHere, setStartedHere] = useState(false)

  const region = useMemo(() => (point ? regionAround(point) : null), [point])
  const megabytes = useMemo(
    () => (region ? (estimateForRegion(region).estimatedBytes / 1_000_000).toFixed(1) : "0.0"),
    [estimateForRegion, region],
  )
  const covered = point ? resolveOfflineAreaForPoint(areas, point.lat, point.lng) !== null : false
  const downloadingHere = startedHere && downloadingAreaId !== null
  const downloadingArea = areas.find((area) => area.id === downloadingAreaId)
  const percent =
    downloadingArea && downloadingArea.totalTiles > 0
      ? Math.round((downloadingArea.downloadedTiles / downloadingArea.totalTiles) * 100)
      : 0

  const download = useCallback(
    (areaName: string) => {
      if (!region) return
      setStartedHere(true)
      void startDownload(region, areaName).finally(() => setStartedHere(false))
    },
    [region, startDownload],
  )

  let state: OfflineMapPromptState = "hidden"
  if (enabled && point) {
    if (downloadingHere) state = "downloading"
    else if (covered) state = "covered"
    else if (!offline) state = "missing"
  }
  return { state, megabytes, percent, download }
}
