import * as FileSystem from "expo-file-system/legacy"
import type { BasemapKey } from "./basemaps"
import { offlineBasemapDir, offlineTileLocalPath, remoteTileUrl } from "./basemaps"
import type { LatLngBounds, TileCoordinate } from "./tile-math"
import { tilesForBounds } from "./tile-math"

export type TileDownloadJob = { basemap: BasemapKey; tile: TileCoordinate }

const CONCURRENCY = 6
/** Progress is persisted roughly this often, not per tile (08-CONTEXT D-11): a maxed-out area
 * download is thousands of tiles, and writing SQLite on every one would dominate the download. */
const PROGRESS_REPORT_INTERVAL = 30

export function buildDownloadJobs(
  bounds: LatLngBounds,
  basemaps: BasemapKey[],
  minZoom: number,
  maxZoom: number,
): TileDownloadJob[] {
  const tiles = tilesForBounds(bounds, minZoom, maxZoom)
  const jobs: TileDownloadJob[] = []
  for (const basemap of basemaps) {
    for (const tile of tiles) {
      jobs.push({ basemap, tile })
    }
  }
  return jobs
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

async function ensureDirectoriesForJobs(
  documentDirectory: string,
  areaId: string,
  jobs: TileDownloadJob[],
): Promise<void> {
  const dirs = new Set<string>()
  for (const job of jobs) {
    dirs.add(
      `${offlineBasemapDir(documentDirectory, areaId, job.basemap)}${job.tile.z}/${job.tile.x}/`,
    )
  }
  for (const dir of dirs) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  }
}

async function downloadOneTile(
  documentDirectory: string,
  areaId: string,
  job: TileDownloadJob,
): Promise<boolean> {
  try {
    const localPath = offlineTileLocalPath(documentDirectory, areaId, job.basemap, job.tile)
    const result = await FileSystem.downloadAsync(remoteTileUrl(job.basemap, job.tile), localPath)
    return result.status >= 200 && result.status < 300
  } catch {
    return false
  }
}

export type DownloadProgress = { downloadedTiles: number; failedTiles: number; totalTiles: number }

/**
 * Downloads every job in bounded concurrent batches (08-CONTEXT D-09). A failed tile is counted
 * and skipped, never retried automatically; the loop always runs to completion. `onProgress` is
 * awaited before the next batch starts, so a caller that persists progress never races itself.
 */
export async function downloadAreaTiles(
  documentDirectory: string,
  areaId: string,
  jobs: TileDownloadJob[],
  onProgress: (progress: DownloadProgress) => void | Promise<void>,
): Promise<DownloadProgress> {
  await ensureDirectoriesForJobs(documentDirectory, areaId, jobs)

  let downloadedTiles = 0
  let failedTiles = 0
  let lastReportedTotal = 0
  const totalTiles = jobs.length
  const batches = chunk(jobs, CONCURRENCY)

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex]
    const results = await Promise.all(
      batch.map((job) => downloadOneTile(documentDirectory, areaId, job)),
    )
    for (const ok of results) {
      if (ok) {
        downloadedTiles += 1
      } else {
        failedTiles += 1
      }
    }

    const isLastBatch = batchIndex === batches.length - 1
    const doneSoFar = downloadedTiles + failedTiles
    if (isLastBatch || doneSoFar - lastReportedTotal >= PROGRESS_REPORT_INTERVAL) {
      lastReportedTotal = doneSoFar
      await onProgress({ downloadedTiles, failedTiles, totalTiles })
    }
  }

  return { downloadedTiles, failedTiles, totalTiles }
}
