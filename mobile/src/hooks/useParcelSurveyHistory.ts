import { useEffect, useRef, useState } from "react"
import { fetchParcelSurveyHistory } from "../api/ibp-api"
import type { ParcelSurveyHistoryItem } from "../app/types"

export type ParcelSurveyHistoryState = {
  items: ParcelSurveyHistoryItem[]
  loading: boolean
  error: boolean
  /** REQ-D-offline-parcel-warning (08-CONTEXT D-14): no history is cached for this phase, so
   * offline always means "not available", distinct from a real fetch failure. */
  offline: boolean
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
 * spinner that would never resolve.
 */
export function useParcelSurveyHistory(
  apiUrl: string,
  accessToken: string | null,
  parcelId: string | null,
  isOffline = false,
): ParcelSurveyHistoryState {
  const [state, setState] = useState<ParcelSurveyHistoryState>(IDLE_STATE)
  const requestRef = useRef(0)

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
        setState({
          items: Array.isArray(payload.items) ? payload.items : [],
          loading: false,
          error: false,
          offline: false,
        })
      })
      .catch(() => {
        if (requestRef.current !== requestId) return
        setState({ items: [], loading: false, error: true, offline: false })
      })
  }, [apiUrl, accessToken, parcelId, isOffline])

  return state
}
