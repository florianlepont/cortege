import type { BasemapKey } from "../map/basemaps"
import { getDb } from "./db"

// D-15: same local_meta key/value pattern as saveCachedProfile / setLocalDataOwner, so the
// basemap choice survives navigation and an app relaunch alike.
export const MAP_BASEMAP_KEY = "map_basemap"
export const DEFAULT_BASEMAP: BasemapKey = "map"

function isBasemapKey(value: string): value is BasemapKey {
  return value === "map" || value === "satellite"
}

export async function loadBasemapPreference(): Promise<BasemapKey> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM local_meta WHERE key = ?`,
    [MAP_BASEMAP_KEY],
  )
  if (row?.value && isBasemapKey(row.value)) {
    return row.value
  }
  return DEFAULT_BASEMAP
}

export async function saveBasemapPreference(basemap: BasemapKey): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO local_meta (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [MAP_BASEMAP_KEY, basemap, now],
  )
}
