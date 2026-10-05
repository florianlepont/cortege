import { useEffect, useState } from "react"
import type { CommunitySurveyItem } from "@cortege/ibp-domain"
import { searchCommunitySurveys } from "../api/ibp-api"
import { logStatusDetail } from "../i18n"
import { useDebouncedValue } from "./useDebouncedValue"

/** How long the text stays unchanged before the community is queried. */
export const COMMUNITY_SEARCH_DELAY_MS = 350

export type CommunitySearchState = {
  items: CommunitySurveyItem[]
  status: "idle" | "loading" | "ready" | "error"
}

const IDLE: CommunitySearchState = { items: [], status: "idle" }

type Params = {
  apiUrl: string
  accessToken: string | null
  query: string
  /** Only the "Communauté" scope queries the server. */
  active: boolean
}

/**
 * The community search (OA-52): the finished surveys of every member whose site or author matches
 * the text. It waits for a pause in typing, drops an answer that a newer search has replaced, and
 * keeps the previous results on screen while the next ones load.
 */
export function useCommunitySurveys({
  apiUrl,
  accessToken,
  query,
  active,
}: Params): CommunitySearchState {
  const debouncedQuery = useDebouncedValue(query.trim(), COMMUNITY_SEARCH_DELAY_MS)
  const [state, setState] = useState<CommunitySearchState>(IDLE)

  useEffect(() => {
    if (!active || !accessToken) return
    let cancelled = false
    setState((previous) => ({ items: previous.items, status: "loading" }))
    searchCommunitySurveys(apiUrl, accessToken, { q: debouncedQuery })
      .then((response) => {
        if (!cancelled) setState({ items: response.items, status: "ready" })
      })
      .catch((error: unknown) => {
        logStatusDetail("communitySearch", error)
        if (!cancelled) setState((previous) => ({ items: previous.items, status: "error" }))
      })
    return () => {
      cancelled = true
    }
  }, [active, accessToken, apiUrl, debouncedQuery])

  return state
}
