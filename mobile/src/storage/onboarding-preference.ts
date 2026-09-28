import { getDb } from "./db"

// ONB-01: the first-launch carousel + permissions-priming flow is shown once, then remembered —
// same local_meta key/value pattern as saveBasemapPreference/saveCachedProfile. Best-effort: every
// function catches its own errors, like profile-cache.ts, so a storage failure never blocks the
// app from starting (worst case, the flow is shown again).
export const ONBOARDING_SEEN_KEY = "onboarding_seen"

export async function loadOnboardingSeen(): Promise<boolean> {
  try {
    const db = await getDb()
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM local_meta WHERE key = ?`,
      [ONBOARDING_SEEN_KEY],
    )
    return row?.value === "1"
  } catch {
    return false
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    const db = await getDb()
    const now = new Date().toISOString()
    await db.runAsync(
      `INSERT INTO local_meta (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [ONBOARDING_SEEN_KEY, "1", now],
    )
  } catch {
    // Best-effort: never let a storage failure break the app's startup flow.
  }
}
