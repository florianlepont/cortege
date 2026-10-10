import type { ParcelSurveyHistoryItem } from "../app/types"
import { getDb } from "./db"

// Phase 25.1 (D-13): the last successful history of a parcel, kept so the PDF trend prints
// offline. It holds all submitted surveys of the parcel as the API returns them, other members'
// included (rows the app already shows). Convenience data only: kept in the local_meta key/value
// table (no migration), never synced, and deleted by clearLocalIbpData so the next account on the
// phone never sees it. Best-effort like search-recents.ts: every function catches its own errors.
export const PARCEL_HISTORY_KEY_PREFIX = "parcel_history:"
export const PARCEL_HISTORY_MAX_ITEMS = 50

export type CachedParcelHistory = {
  fetched_at: string
  items: ParcelSurveyHistoryItem[]
}

export const parcelHistoryKey = (parcelId: string): string =>
  `${PARCEL_HISTORY_KEY_PREFIX}${parcelId.trim().toUpperCase()}`

// A corrupt value (not JSON, wrong shape) reads as no history; items without a survey_id drop.
function parseCachedHistory(raw: string | null | undefined): CachedParcelHistory | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    const { fetched_at: fetchedAt, items } = parsed as Record<string, unknown>
    if (typeof fetchedAt !== "string" || !Array.isArray(items)) return null
    return {
      fetched_at: fetchedAt,
      items: items.filter(
        (entry): entry is ParcelSurveyHistoryItem =>
          !!entry &&
          typeof entry === "object" &&
          typeof (entry as { survey_id?: unknown }).survey_id === "string",
      ),
    }
  } catch {
    return null
  }
}

export async function saveParcelHistoryCache(
  parcelId: string,
  items: ParcelSurveyHistoryItem[],
  fetchedAt: string = new Date().toISOString(),
): Promise<void> {
  try {
    const db = await getDb()
    const value: CachedParcelHistory = {
      fetched_at: fetchedAt,
      items: items.slice(-PARCEL_HISTORY_MAX_ITEMS),
    }
    await db.runAsync(
      `INSERT INTO local_meta (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [parcelHistoryKey(parcelId), JSON.stringify(value), fetchedAt],
    )
  } catch {
    // Best-effort: without the copy the PDF simply leaves the trend out offline.
  }
}

export async function loadParcelHistoryCache(
  parcelId: string,
): Promise<CachedParcelHistory | null> {
  try {
    const db = await getDb()
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM local_meta WHERE key = ?`,
      [parcelHistoryKey(parcelId)],
    )
    return parseCachedHistory(row?.value)
  } catch {
    return null
  }
}
