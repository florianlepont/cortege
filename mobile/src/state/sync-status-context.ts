import { createContext, useContext } from "react"

/**
 * Sync-status context (phase 7, SYNC-02): `isOnline` and `isSyncing` only, read by
 * `SyncStatusLine` in the Home and Mes Relevés headers. Kept separate from the status-message
 * context (`status-context.ts`) on purpose: a status-message update (e.g. "relevé ouvert") must
 * not re-render Home and Mes Relevés, only Settings — the same narrow-context pattern as
 * `useAccessToken`/`useNearbyParcelsState` (see `AppStateProvider.tsx`).
 */
export type SyncStatusContextValue = {
  isOnline: boolean
  isSyncing: boolean
}

export const SyncStatusContext = createContext<SyncStatusContextValue | null>(null)

export const SyncStatusProvider = SyncStatusContext.Provider

export function useSyncStatus(): SyncStatusContextValue {
  const value = useContext(SyncStatusContext)
  if (value === null) {
    throw new Error("useSyncStatus must be used inside AppStateProvider")
  }
  return value
}
