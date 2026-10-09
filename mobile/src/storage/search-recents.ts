import { getDb } from "./db"

// Phase 25 (D-02b, D-16): the recent searches of the search page, newest first. Convenience
// data only: kept in the local_meta key/value table (no migration), never synced, and deleted by
// clearLocalIbpData so the next account on the phone never sees them. Best-effort like
// onboarding-preference.ts: every function catches its own errors, so a storage failure never
// breaks the search page (worst case, the list is empty).
export const SEARCH_RECENTS_KEY = "search_recents"
export const SEARCH_RECENTS_MAX = 8

const MIN_QUERY_LENGTH = 2

const sameQuery = (a: string, b: string) => a.toLocaleLowerCase("fr") === b.toLocaleLowerCase("fr")

// A corrupt value (not JSON, not an array) reads as no recents; non-string entries are dropped.
function parseRecents(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === "string")
  } catch {
    return []
  }
}

async function writeRecents(recents: string[]): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT INTO local_meta (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [SEARCH_RECENTS_KEY, JSON.stringify(recents), new Date().toISOString()],
  )
}

export async function loadSearchRecents(): Promise<string[]> {
  try {
    const db = await getDb()
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM local_meta WHERE key = ?`,
      [SEARCH_RECENTS_KEY],
    )
    return parseRecents(row?.value)
  } catch {
    return []
  }
}

export async function saveSearchRecent(query: string): Promise<string[]> {
  try {
    const clean = query.trim().replace(/\s+/g, " ")
    const current = await loadSearchRecents()
    if (clean.length < MIN_QUERY_LENGTH) return current
    const next = [clean, ...current.filter((entry) => !sameQuery(entry, clean))].slice(
      0,
      SEARCH_RECENTS_MAX,
    )
    await writeRecents(next)
    return next
  } catch {
    return []
  }
}

export async function removeSearchRecent(query: string): Promise<string[]> {
  try {
    const current = await loadSearchRecents()
    const next = current.filter((entry) => !sameQuery(entry, query.trim()))
    await writeRecents(next)
    return next
  } catch {
    return []
  }
}

export async function clearSearchRecents(): Promise<void> {
  try {
    await writeRecents([])
  } catch {
    // Best-effort: the list is a convenience, retyping restores it.
  }
}
