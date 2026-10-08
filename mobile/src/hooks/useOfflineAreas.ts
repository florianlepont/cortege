import { useCallback, useEffect, useState } from "react"
import { randomUUID } from "expo-crypto"
import type { MapRegion as Region } from "../app/map-viewport"
import { fetchPublicParcelStatuses } from "../api/ibp-api"
import { computeRegionBbox, computeRegionBounds } from "../app/map-viewport"
import { deleteAreaPacks, downloadAreaPacks } from "../map/offline-packs"
import {
  MAX_TILE_ZOOM,
  MIN_TILE_ZOOM,
  estimateAreaDownload,
  type AreaDownloadEstimate,
} from "../map/tile-math"
import {
  basemapsForDownload,
  deleteOfflineArea as deleteOfflineAreaRecord,
  finalizeOfflineArea,
  getOfflineDocumentDirectory,
  insertOfflineArea,
  listOfflineAreas,
  saveOfflineAreaParcels,
  updateOfflineAreaProgress,
  type OfflineAreaSummary,
} from "../storage/offline-map"

/** Progress of an area download, for the panel's progress bar (12.2-19 third round). */
export type AreaDownloadProgress = {
  areaId: string
  name: string
  /** 0 to 100, completed resources over required ones, averaged over the basemaps; never goes back. */
  percentage: number
  /** Tiles done out of `totalTiles`, read from the percentage against the estimate. */
  downloadedTiles: number
  totalTiles: number
}

/**
 * The last download started from this screen: running, done or failed. It stays at its outcome
 * until `clearDownloadStatus`, so the panel goes straight from the bar to its outcome, never back
 * to the form in between.
 */
export type AreaDownloadStatus =
  | ({ phase: "running" } & AreaDownloadProgress)
  | ({ phase: "done" } & AreaDownloadProgress)
  | { phase: "failed"; areaId: string; name: string }

export type StartDownloadResult =
  | { ok: true; areaId: string }
  | { ok: false; reason: "too_large" | "failed" }

/**
 * Downloaded offline areas: list/download/delete (REQ-D-area-download). `startDownload` covers
 * the current map viewport at the fixed zoom range (08-CONTEXT D-04/D-05), for both basemaps
 * (D-03), and best-effort-caches the viewport's parcel statuses once the tiles are in (D-10).
 */
export function useOfflineAreas(
  apiUrl: string,
  accessToken: string | null,
  enabled = true,
): {
  areas: OfflineAreaSummary[]
  downloadingAreaId: string | null
  downloadStatus: AreaDownloadStatus | null
  clearDownloadStatus: () => void
  estimateForRegion: (region: Region) => AreaDownloadEstimate
  startDownload: (region: Region, name: string) => Promise<StartDownloadResult>
  deleteArea: (id: string) => Promise<void>
  refresh: () => Promise<void>
} {
  const [areas, setAreas] = useState<OfflineAreaSummary[]>([])
  const [downloadingAreaId, setDownloadingAreaId] = useState<string | null>(null)
  const [downloadStatus, setDownloadStatus] = useState<AreaDownloadStatus | null>(null)
  const clearDownloadStatus = useCallback(() => {
    setDownloadStatus((status) => (status?.phase === "running" ? status : null))
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    setAreas(await listOfflineAreas())
  }, [])

  useEffect(() => {
    if (enabled) void refresh()
  }, [enabled, refresh])

  const estimateForRegion = useCallback((region: Region): AreaDownloadEstimate => {
    return estimateAreaDownload(computeRegionBounds(region), basemapsForDownload().length)
  }, [])

  const startDownload = useCallback(
    async (region: Region, name: string): Promise<StartDownloadResult> => {
      const bbox = computeRegionBbox(region)
      const bounds = computeRegionBounds(region)
      const basemaps = basemapsForDownload()
      const estimate = estimateAreaDownload(bounds, basemaps.length)
      if (estimate.exceedsCap) {
        return { ok: false, reason: "too_large" }
      }

      const areaId = randomUUID()
      // The native pack download reports a percentage; the list shows it against the estimate.
      const toTiles = (percentage: number): number =>
        Math.min(estimate.totalTileCount, Math.round((percentage / 100) * estimate.totalTileCount))
      // The download panel switches to its progress bar at once, before the first native report.
      // A percentage that a basemap's later start would pull back is held: the bar only moves on.
      let shownPercentage = 0
      // A late native report (another basemap's pack) never takes the panel back from its outcome.
      let finished = false
      const progressAt = (percentage: number): AreaDownloadProgress => {
        shownPercentage = Math.max(shownPercentage, Math.min(100, percentage))
        return {
          areaId,
          name,
          percentage: shownPercentage,
          downloadedTiles: toTiles(shownPercentage),
          totalTiles: estimate.totalTileCount,
        }
      }
      setDownloadStatus({ phase: "running", ...progressAt(0) })
      setDownloadingAreaId(areaId)

      let progress: { downloadedTiles: number; failedTiles: number }
      try {
        await insertOfflineArea({
          id: areaId,
          name,
          bounds,
          minZoom: MIN_TILE_ZOOM,
          maxZoom: MAX_TILE_ZOOM,
          totalTiles: estimate.totalTileCount,
          estimatedBytes: estimate.estimatedBytes,
        })
        await refresh()
        const documentDirectory = getOfflineDocumentDirectory()
        const result = await downloadAreaPacks({
          documentDirectory,
          areaId,
          bounds,
          basemaps,
          onProgress: (packProgress) => {
            if (finished) return
            setDownloadStatus({ phase: "running", ...progressAt(packProgress.percentage) })
            void updateOfflineAreaProgress(areaId, {
              downloadedTiles: toTiles(packProgress.percentage),
              failedTiles: 0,
            }).then(refresh)
          },
        })
        progress = { downloadedTiles: toTiles(result.percentage), failedTiles: 0 }
        finished = true
      } catch {
        finished = true
        await deleteAreaPacks(areaId).catch(() => undefined)
        await finalizeOfflineArea(areaId, "failed", { downloadedTiles: 0, failedTiles: 0 }).catch(
          () => undefined,
        )
        setDownloadingAreaId(null)
        setDownloadStatus({ phase: "failed", areaId, name })
        await refresh()
        return { ok: false, reason: "failed" }
      }

      if (accessToken) {
        try {
          const { items } = await fetchPublicParcelStatuses(apiUrl, accessToken, {
            bbox,
            zoom: 16,
          })
          await saveOfflineAreaParcels(areaId, items)
        } catch {
          // A bonus cache on top of the basemap tiles (08-CONTEXT D-10): its failure must not
          // turn an otherwise-successful tile download into a failed area.
        }
      }

      await finalizeOfflineArea(areaId, "ready", progress)
      setDownloadingAreaId(null)
      setDownloadStatus({ phase: "done", ...progressAt(100) })
      await refresh()

      return { ok: true, areaId }
    },
    [apiUrl, accessToken, refresh],
  )

  const deleteArea = useCallback(
    async (id: string): Promise<void> => {
      await deleteAreaPacks(id).catch(() => undefined)
      await deleteOfflineAreaRecord(id)
      await refresh()
    },
    [refresh],
  )

  return {
    areas,
    downloadingAreaId,
    downloadStatus,
    clearDownloadStatus,
    estimateForRegion,
    startDownload,
    deleteArea,
    refresh,
  }
}
