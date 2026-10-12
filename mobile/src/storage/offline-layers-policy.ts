import { getDb } from "./db"

// Phase 28 (final decisions 7 and 8): which layers a map download keeps for offline use. Same
// local_meta key/value pattern as `map-preference.ts`, so the SQLite schema stays at version 5.
// A device preference: `clearLocalIbpData` leaves it, like `map_basemap`.
export const OFFLINE_LAYERS_POLICY_KEY = "offline_layers_policy"

/**
 * "base" keeps the Plan, the Satellite and the cadastre; "all" adds the old maps, the 1950
 * photographs and the forest types.
 */
export type OfflineLayersPolicy = "base" | "all"

export const DEFAULT_OFFLINE_LAYERS_POLICY: OfflineLayersPolicy = "all"

export function isOfflineLayersPolicy(value: unknown): value is OfflineLayersPolicy {
  return value === "base" || value === "all"
}

/** An unknown or missing stored value reads as the default, never as an error. */
export async function loadOfflineLayersPolicy(): Promise<OfflineLayersPolicy> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM local_meta WHERE key = ?`,
    [OFFLINE_LAYERS_POLICY_KEY],
  )
  if (isOfflineLayersPolicy(row?.value)) {
    return row.value
  }
  return DEFAULT_OFFLINE_LAYERS_POLICY
}

export async function saveOfflineLayersPolicy(policy: OfflineLayersPolicy): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO local_meta (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [OFFLINE_LAYERS_POLICY_KEY, policy, now],
  )
}
