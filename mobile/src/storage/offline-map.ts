import * as FileSystem from "expo-file-system/legacy"
import type { BasemapKey } from "../map/basemaps"
import { offlineAreaDir } from "../map/basemaps"
import type { LatLngBounds } from "../map/tile-math"
import { getDb } from "./db"
import { safeParseJson } from "./utils"

export type OfflineAreaStatus = "downloading" | "ready" | "failed"

export type OfflineAreaSummary = {
  id: string
  name: string
  bounds: LatLngBounds
  minZoom: number
  maxZoom: number
  status: OfflineAreaStatus
  totalTiles: number
  downloadedTiles: number
  failedTiles: number
  estimatedBytes: number
  createdAt: string
  updatedAt: string
}

type OfflineAreaRow = {
  id: string
  name: string
  min_lat: number
  min_lng: number
  max_lat: number
  max_lng: number
  min_zoom: number
  max_zoom: number
  status: string
  total_tiles: number
  downloaded_tiles: number
  failed_tiles: number
  estimated_bytes: number
  created_at: string
  updated_at: string
}

function toSummary(row: OfflineAreaRow): OfflineAreaSummary {
  return {
    id: row.id,
    name: row.name,
    bounds: { minLat: row.min_lat, minLng: row.min_lng, maxLat: row.max_lat, maxLng: row.max_lng },
    minZoom: row.min_zoom,
    maxZoom: row.max_zoom,
    status: row.status as OfflineAreaStatus,
    totalTiles: row.total_tiles,
    downloadedTiles: row.downloaded_tiles,
    failedTiles: row.failed_tiles,
    estimatedBytes: row.estimated_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getOfflineDocumentDirectory(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error("offline-map: FileSystem.documentDirectory is null")
  }
  return FileSystem.documentDirectory
}

/** Same as `getOfflineDocumentDirectory`, but for render-time callers that would rather show
 * nothing than throw (the offline basemap tile layer, which is a graceful-degradation surface). */
export function tryGetOfflineDocumentDirectory(): string | null {
  try {
    return getOfflineDocumentDirectory()
  } catch {
    return null
  }
}

export async function insertOfflineArea(input: {
  id: string
  name: string
  bounds: LatLngBounds
  minZoom: number
  maxZoom: number
  totalTiles: number
  estimatedBytes: number
}): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO offline_areas
       (id, name, min_lat, min_lng, max_lat, max_lng, min_zoom, max_zoom, status,
        total_tiles, downloaded_tiles, failed_tiles, estimated_bytes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'downloading', ?, 0, 0, ?, ?, ?)`,
    [
      input.id,
      input.name,
      input.bounds.minLat,
      input.bounds.minLng,
      input.bounds.maxLat,
      input.bounds.maxLng,
      input.minZoom,
      input.maxZoom,
      input.totalTiles,
      input.estimatedBytes,
      now,
      now,
    ],
  )
}

export async function updateOfflineAreaProgress(
  id: string,
  progress: { downloadedTiles: number; failedTiles: number },
): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE offline_areas SET downloaded_tiles = ?, failed_tiles = ?, updated_at = ? WHERE id = ?`,
    [progress.downloadedTiles, progress.failedTiles, new Date().toISOString(), id],
  )
}

export async function finalizeOfflineArea(
  id: string,
  status: OfflineAreaStatus,
  progress: { downloadedTiles: number; failedTiles: number },
): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE offline_areas SET status = ?, downloaded_tiles = ?, failed_tiles = ?, updated_at = ? WHERE id = ?`,
    [status, progress.downloadedTiles, progress.failedTiles, new Date().toISOString(), id],
  )
}

export async function listOfflineAreas(): Promise<OfflineAreaSummary[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<OfflineAreaRow>(
    `SELECT * FROM offline_areas ORDER BY created_at DESC`,
  )
  return rows.map(toSummary)
}

export async function getOfflineArea(id: string): Promise<OfflineAreaSummary | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<OfflineAreaRow>(`SELECT * FROM offline_areas WHERE id = ?`, [
    id,
  ])
  return row ? toSummary(row) : null
}

/** The most recently downloaded ready area whose bbox contains `(lat, lng)` (08-CONTEXT D-02). */
export async function findReadyOfflineAreaForPoint(
  lat: number,
  lng: number,
): Promise<OfflineAreaSummary | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<OfflineAreaRow>(
    `SELECT * FROM offline_areas
     WHERE status = 'ready' AND min_lat <= ? AND max_lat >= ? AND min_lng <= ? AND max_lng >= ?
     ORDER BY created_at DESC LIMIT 1`,
    [lat, lat, lng, lng],
  )
  return row ? toSummary(row) : null
}

export async function deleteOfflineArea(id: string): Promise<void> {
  await FileSystem.deleteAsync(offlineAreaDir(getOfflineDocumentDirectory(), id), {
    idempotent: true,
  })
  const db = await getDb()
  await db.runAsync(`DELETE FROM offline_area_parcels WHERE area_id = ?`, [id])
  await db.runAsync(`DELETE FROM offline_areas WHERE id = ?`, [id])
}

export async function saveOfflineAreaParcels(
  areaId: string,
  parcels: ReadonlyArray<{ parcel_id: string } & Record<string, unknown>>,
): Promise<void> {
  const db = await getDb()
  for (const parcel of parcels) {
    await db.runAsync(
      `INSERT INTO offline_area_parcels (area_id, parcel_id, payload_json)
       VALUES (?, ?, ?)
       ON CONFLICT(area_id, parcel_id) DO UPDATE SET payload_json = excluded.payload_json`,
      [areaId, parcel.parcel_id, JSON.stringify(parcel)],
    )
  }
}

/** Cached parcel statuses of every downloaded area overlapping `bounds` (08-CONTEXT D-13). */
export async function getCachedParcelsForBounds<T>(bounds: LatLngBounds): Promise<T[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<{ payload_json: string }>(
    `SELECT DISTINCT p.payload_json
     FROM offline_area_parcels p
     JOIN offline_areas a ON a.id = p.area_id
     WHERE a.min_lat <= ? AND a.max_lat >= ? AND a.min_lng <= ? AND a.max_lng >= ?`,
    [bounds.maxLat, bounds.minLat, bounds.maxLng, bounds.minLng],
  )
  const parcels: T[] = []
  for (const row of rows) {
    const parsed = safeParseJson(row.payload_json)
    if (parsed !== null) {
      parcels.push(parsed as T)
    }
  }
  return parcels
}

export async function getCachedParcelById<T>(parcelId: string): Promise<T | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ payload_json: string }>(
    `SELECT payload_json FROM offline_area_parcels WHERE parcel_id = ? LIMIT 1`,
    [parcelId],
  )
  if (!row) {
    return null
  }
  return safeParseJson(row.payload_json) as T | null
}

export async function addPendingParcelDownload(parcelId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT INTO offline_pending_parcels (parcel_id, requested_at)
     VALUES (?, ?)
     ON CONFLICT(parcel_id) DO NOTHING`,
    [parcelId, new Date().toISOString()],
  )
}

export async function listPendingParcelDownloads(): Promise<string[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<{ parcel_id: string }>(
    `SELECT parcel_id FROM offline_pending_parcels ORDER BY requested_at ASC`,
  )
  return rows.map((row) => row.parcel_id)
}

export async function removePendingParcelDownload(parcelId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(`DELETE FROM offline_pending_parcels WHERE parcel_id = ?`, [parcelId])
}

export function basemapsForDownload(): BasemapKey[] {
  return ["map", "satellite"]
}
