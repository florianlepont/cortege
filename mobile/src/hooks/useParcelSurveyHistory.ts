import { useCallback, useEffect, useRef, useState } from "react"
import { fetchParcelSurveyHistory } from "../api/ibp-api"
import type { ParcelSurveyHistoryItem } from "../app/types"
import { saveParcelHistoryCache } from "../storage/parcel-history-cache"

export type ParcelSurveyHistoryState = {
  items: ParcelSurveyHistoryItem[]
  loading: boolean
  error: boolean
  /** REQ-D-offline-parcel-warning (08-CONTEXT D-14): the screen never reads the history copy kept
   * for the PDF (25.1 D-13, written below, read only by the PDF loader), so offline always means
   * "not available" on screen, distinct from a real fetch failure. */
  offline: boolean
}

export type ParcelSurveyHistoryResult = ParcelSurveyHistoryState & {
  /** Fetches the history again (pull to refresh, error action). The previous items stay. */
  reload: () => void
}

const IDLE_STATE: ParcelSurveyHistoryState = {
  items: [],
  loading: false,
  error: false,
  offline: false,
}
const OFFLINE_STATE: ParcelSurveyHistoryState = {
  items: [],
  loading: false,
  error: false,
  offline: true,
}

/**
 * Previous submitted surveys of a parcel (REQ-B-survey-detail, REQ-C-versioning), oldest first
 * as the API returns them. Loads whenever `parcelId` or `accessToken` changes; a null parcelId or
 * accessToken clears the state instead of fetching (the caller is not ready yet). While offline,
 * no request is attempted at all (REQ-D-offline-parcel-warning): the state goes straight to
 * `offline: true` instead of loading, so the caller can show a plain explanation instead of a
 * spinner that would never resolve. `reload()` fetches again on demand, and a new `refreshKey`
 * (for example the status of the open survey, which changes after "Terminer") refetches too; the
 * items of the previous answer stay on screen while it refetches.
 */
export function useParcelSurveyHistory(
  apiUrl: string,
  accessToken: string | null,
  parcelId: string | null,
  isOffline = false,
  refreshKey: string | number | null = null,
): ParcelSurveyHistoryResult {
  const [state, setState] = useState<ParcelSurveyHistoryState>(IDLE_STATE)
  const [attempt, setAttempt] = useState(0)
  const requestRef = useRef(0)
  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    if (!parcelId || !accessToken) {
      setState(IDLE_STATE)
      return
    }

    if (isOffline) {
      requestRef.current += 1
      setState(OFFLINE_STATE)
      return
    }

    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setState((current) => ({ ...current, loading: true, error: false, offline: false }))

    fetchParcelSurveyHistory(apiUrl, accessToken, parcelId)
      .then((payload) => {
        if (requestRef.current !== requestId) return
        const items = Array.isArray(payload.items) ? payload.items : []
        // D-13: keep a copy so the PDF trend prints offline. Fire-and-forget, never blocks the screen.
        void saveParcelHistoryCache(parcelId, items).catch(() => undefined)
        setState({ items, loading: false, error: false, offline: false })
      })
      .catch(() => {
        if (requestRef.current !== requestId) return
        setState({ items: [], loading: false, error: true, offline: false })
      })
  }, [apiUrl, accessToken, parcelId, isOffline, attempt, refreshKey])

  return { ...state, reload }
}
