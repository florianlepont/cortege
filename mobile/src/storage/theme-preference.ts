import type { BrandThemeMode } from "../app/theme"
import { getDb } from "./db"

// DS-12 (UX audit, Phase 12): same local_meta key/value pattern as map-preference.ts /
// onboarding-preference.ts, so the chosen theme mode survives navigation and an app relaunch
// alike. Best-effort like onboarding-preference.ts: a storage failure never blocks app startup or
// theme resolution — worst case, the app falls back to "automatic" for that session.
export const THEME_MODE_KEY = "theme_mode"
export const DEFAULT_THEME_MODE: BrandThemeMode = "automatic"

function isThemeMode(value: string): value is BrandThemeMode {
  return value === "automatic" || value === "light" || value === "dark"
}

export async function loadThemeModePreference(): Promise<BrandThemeMode> {
  try {
    const db = await getDb()
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM local_meta WHERE key = ?`,
      [THEME_MODE_KEY],
    )
    if (row?.value && isThemeMode(row.value)) {
      return row.value
    }
    return DEFAULT_THEME_MODE
  } catch {
    return DEFAULT_THEME_MODE
  }
}

export async function saveThemeModePreference(mode: BrandThemeMode): Promise<void> {
  try {
    const db = await getDb()
    const now = new Date().toISOString()
    await db.runAsync(
      `INSERT INTO local_meta (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [THEME_MODE_KEY, mode, now],
    )
  } catch {
    // Best-effort: never let a storage failure surface to the theme picker.
  }
}
