import { useEffect, useRef, useState } from "react"
import { fetchParcelSurveyHistory } from "../api/ibp-api"
import type { ParcelSurveyHistoryItem } from "../app/types"

export type ParcelSurveyHistoryState = {
  items: ParcelSurveyHistoryItem[]
  loading: boolean
  error: boolean
}

const IDLE_STATE: ParcelSurveyHistoryState = { items: [], loading: false, error: false }

/**
 * Previous submitted surveys of a parcel (REQ-B-survey-detail, REQ-C-versioning), oldest first
 * as the API returns them. Loads whenever `parcelId` or `accessToken` changes; a null parcelId or
 * accessToken clears the state instead of fetching (the caller is not ready yet).
 */
export function useParcelSurveyHistory(
  apiUrl: string,
  accessToken: string | null,
  parcelId: string | null,
): ParcelSurveyHistoryState {
  const [state, setState] = useState<ParcelSurveyHistoryState>(IDLE_STATE)
  const requestRef = useRef(0)

  useEffect(() => {
    if (!parcelId || !accessToken) {
      setState(IDLE_STATE)
      return
    }

    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setState((current) => ({ ...current, loading: true, error: false }))

    fetchParcelSurveyHistory(apiUrl, accessToken, parcelId)
      .then((payload) => {
        if (requestRef.current !== requestId) return
        setState({
          items: Array.isArray(payload.items) ? payload.items : [],
          loading: false,
          error: false,
        })
      })
      .catch(() => {
        if (requestRef.current !== requestId) return
        setState({ items: [], loading: false, error: true })
      })
  }, [apiUrl, accessToken, parcelId])

  return state
}
