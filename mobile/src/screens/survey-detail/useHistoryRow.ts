import { useMemo } from "react"
import { buildEntriesFromOwn, historyRowState } from "../../app/parcel-history"
import { useIsOffline } from "../../hooks/useIsOffline"
import { useParcelSurveyHistory } from "../../hooks/useParcelSurveyHistory"
import { toHistoryRow, type HistoryRowDisplay } from "./history-row"

type UseHistoryRowInput = {
  apiUrl: string
  accessToken: string | null
  parcelId: string | null
  currentSurveyId: string
  /** The status of the open survey: it changes after "Terminer", which refetches the history. */
  refreshKey: string
}

/**
 * The summary's "Historique de la parcelle" row (D-01): fetches the parcel history, knows the
 * offline state and the missing token (the row then shows no value, like the history page's
 * skeleton), and returns the row's texts. The status as refresh key keeps the value right after
 * "Terminer", so a first survey does not stay "Premier relevé" (RESEARCH Pitfall 2).
 */
export function useHistoryRow({
  apiUrl,
  accessToken,
  parcelId,
  currentSurveyId,
  refreshKey,
}: UseHistoryRowInput): HistoryRowDisplay {
  const isOffline = useIsOffline()
  const history = useParcelSurveyHistory(apiUrl, accessToken, parcelId, isOffline, refreshKey)
  const entries = useMemo(
    () => buildEntriesFromOwn(history.items, currentSurveyId),
    [history.items, currentSurveyId],
  )
  const state = historyRowState(
    {
      hasParcel: parcelId !== null,
      loading: history.loading || accessToken === null,
      error: history.error,
      offline: history.offline || isOffline,
    },
    entries,
  )
  return toHistoryRow(state)
}
