import { useEffect, useRef } from "react"
import { fetchParcelSurveyHistory } from "../api/ibp-api"
import { listPendingParcelDownloads, removePendingParcelDownload } from "../storage/offline-map"

/**
 * Fulfils a parcel history queued from `ParcelHistoryCard` while offline (REQ-D-offline-parcel-
 * warning, 08-CONTEXT D-14): one fetch per pending parcel id, then it is cleared. A parcel that
 * still fails (offline again, or a transient error) stays queued for the next reconnect.
 */
export async function drainPendingParcelDownloads(
  apiUrl: string,
  accessToken: string,
): Promise<void> {
  const pending = await listPendingParcelDownloads()
  for (const parcelId of pending) {
    try {
      await fetchParcelSurveyHistory(apiUrl, accessToken, parcelId)
      await removePendingParcelDownload(parcelId)
    } catch {
      // Left pending: drained again on the next offline -> online transition.
    }
  }
}

/** Mounted once (PublicMapRoute): drains the queue exactly when the device comes back online. */
export function useOfflinePendingParcelDrain(
  apiUrl: string,
  accessToken: string | null,
  isOffline: boolean,
): void {
  const wasOfflineRef = useRef(isOffline)

  useEffect(() => {
    const wasOffline = wasOfflineRef.current
    wasOfflineRef.current = isOffline

    if (wasOffline && !isOffline && accessToken) {
      void drainPendingParcelDownloads(apiUrl, accessToken)
    }
  }, [isOffline, apiUrl, accessToken])
}
