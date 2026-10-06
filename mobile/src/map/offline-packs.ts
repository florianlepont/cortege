import { OfflineManager, type OfflinePack } from "@maplibre/maplibre-react-native"
import type { BasemapKey } from "./basemaps"
import { writeOfflineStyle } from "./offline-styles"
import type { LatLngBounds } from "./tile-math"

/** Highest zoom stored offline (the owner-validated cap: size and IGN fair use). */
export const OFFLINE_MAX_ZOOM = 17
export const OFFLINE_MIN_ZOOM = 13

export type PackMetadata = { areaId: string; basemap: BasemapKey }

export type AreaPackProgress = {
  /** 0 to 100, averaged over the basemaps of the area. */
  percentage: number
  completedTileCount: number
  complete: boolean
}

function isPackMetadata(value: unknown): value is PackMetadata {
  const record = value as Partial<PackMetadata> | null
  return (
    typeof record?.areaId === "string" &&
    (record.basemap === "map" || record.basemap === "satellite")
  )
}

/**
 * Creates one native offline pack per basemap for an area (style and cadastre included) and resolves
 * once all are complete. The native downloader owns the request concurrency and the cache; nothing
 * here touches individual tiles.
 */
export async function downloadAreaPacks(input: {
  documentDirectory: string
  areaId: string
  bounds: LatLngBounds
  basemaps: BasemapKey[]
  minZoom?: number
  maxZoom?: number
  onProgress: (progress: AreaPackProgress) => void
}): Promise<AreaPackProgress> {
  const { areaId, bounds, basemaps, onProgress } = input
  const entries = basemaps.map(() => ({ percentage: 0, tiles: 0, done: false, started: false }))
  // The native downloader reports a missing resource (a sprite the IGN does not publish, a tile
  // outside its coverage) as an error but goes on with the rest of the pack: only a download that
  // stops before it is complete is a failure (found on the phone: the IGN "Gris" style has no @2x
  // sprite, its 404 aborted every download).
  let lastError = ""

  const snapshot = (): AreaPackProgress => ({
    percentage: entries.reduce((sum, entry) => sum + entry.percentage, 0) / entries.length,
    completedTileCount: entries.reduce((sum, entry) => sum + entry.tiles, 0),
    complete: entries.every((entry) => entry.done),
  })

  return new Promise<AreaPackProgress>((resolve, reject) => {
    let settled = false
    const fail = (error: unknown): void => {
      if (settled) return
      settled = true
      reject(error instanceof Error ? error : new Error(String(error)))
    }

    const start = async (basemap: BasemapKey, index: number): Promise<void> => {
      const mapStyle = await writeOfflineStyle(input.documentDirectory, basemap)
      await OfflineManager.createPack(
        {
          mapStyle,
          bounds: [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat],
          minZoom: input.minZoom ?? OFFLINE_MIN_ZOOM,
          maxZoom: input.maxZoom ?? OFFLINE_MAX_ZOOM,
          metadata: { areaId, basemap } satisfies PackMetadata,
        },
        (_pack, status) => {
          const entry = entries[index]
          entry.percentage = status.percentage
          entry.tiles = status.completedTileCount
          entry.done = status.state === "complete"
          if (status.state === "active") entry.started = true
          if (status.state === "inactive" && entry.started && !entry.done) {
            fail(new Error(lastError || "offline pack stopped before it was complete"))
            return
          }
          const progress = snapshot()
          onProgress(progress)
          if (!settled && progress.complete) {
            settled = true
            resolve(progress)
          }
        },
        (_pack, error) => {
          lastError = error.message
        },
      )
    }

    Promise.all(basemaps.map(start)).catch(fail)
  })
}

async function packsOfArea(areaId: string): Promise<OfflinePack[]> {
  const packs = await OfflineManager.getPacks()
  return packs.filter((pack) => isPackMetadata(pack.metadata) && pack.metadata.areaId === areaId)
}

export async function deleteAreaPacks(areaId: string): Promise<void> {
  for (const pack of await packsOfArea(areaId)) {
    await OfflineManager.deletePack(pack.id)
  }
}

/** Area ids that still own at least one native pack (for reconciling the local list). */
export async function listPackAreaIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  for (const pack of await OfflineManager.getPacks()) {
    if (isPackMetadata(pack.metadata)) ids.add(pack.metadata.areaId)
  }
  return ids
}
