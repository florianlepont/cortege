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
  estimateForRegion: (region: Region) => AreaDownloadEstimate
  startDownload: (region: Region, name: string) => Promise<StartDownloadResult>
  deleteArea: (id: string) => Promise<void>
  refresh: () => Promise<void>
} {
  const [areas, setAreas] = useState<OfflineAreaSummary[]>([])
  const [downloadingAreaId, setDownloadingAreaId] = useState<string | null>(null)

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
      await insertOfflineArea({
        id: areaId,
        name,
        bounds,
        minZoom: MIN_TILE_ZOOM,
        maxZoom: MAX_TILE_ZOOM,
        totalTiles: estimate.totalTileCount,
        estimatedBytes: estimate.estimatedBytes,
      })
      setDownloadingAreaId(areaId)
      await refresh()

      const documentDirectory = getOfflineDocumentDirectory()
      // The native pack download reports a percentage; the list shows it against the estimate.
      const toTiles = (percentage: number): number =>
        Math.min(estimate.totalTileCount, Math.round((percentage / 100) * estimate.totalTileCount))

      let progress: { downloadedTiles: number; failedTiles: number }
      try {
        const result = await downloadAreaPacks({
          documentDirectory,
          areaId,
          bounds,
          basemaps,
          onProgress: (packProgress) => {
            void updateOfflineAreaProgress(areaId, {
              downloadedTiles: toTiles(packProgress.percentage),
              failedTiles: 0,
            }).then(refresh)
          },
        })
        progress = { downloadedTiles: toTiles(result.percentage), failedTiles: 0 }
      } catch {
        await deleteAreaPacks(areaId).catch(() => undefined)
        await finalizeOfflineArea(areaId, "failed", { downloadedTiles: 0, failedTiles: 0 })
        setDownloadingAreaId(null)
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

  return { areas, downloadingAreaId, estimateForRegion, startDownload, deleteArea, refresh }
}
