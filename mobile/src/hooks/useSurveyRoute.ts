import { readSurveyRoute, type SurveyRoute } from "@cortege/ibp-domain"
import { useEffect, useState } from "react"
import { getLocalSurveyDraft } from "../storage/surveys"
import type { LocalSurvey } from "../storage/types"

/** What a screen reads about the recorded route of one survey (phase 30, D-08). */
export type SurveyRouteState = {
  /** The canonical record, or null when absent, older, newer or damaged. */
  route: SurveyRoute | null
  /** False until the local draft was read once; true after a failed read too (empty route). */
  loaded: boolean
}

const NOT_LOADED: SurveyRouteState = { route: null, loaded: false }
const EMPTY: SurveyRouteState = { route: null, loaded: true }

type Read = { surveyId: string; route: SurveyRoute | null }

/**
 * The recorded route of a survey, read from its local payload through `readSurveyRoute` (tolerant:
 * null for anything invalid, T-30-21) and read again whenever the survey row changes (`updated_at`,
 * bumped by every write of the route). A read that is overtaken by a newer one is dropped, and the
 * route of another survey is never returned while the new one loads. A null survey gives an empty,
 * loaded state.
 */
export function useSurveyRoute(survey: LocalSurvey | null): SurveyRouteState {
  const [read, setRead] = useState<Read | null>(null)
  const surveyId = survey?.id ?? null
  const updatedAt = survey?.updated_at ?? null

  useEffect(() => {
    if (surveyId === null) return undefined
    let cancelled = false

    const run = async (): Promise<void> => {
      try {
        const draft = await getLocalSurveyDraft(surveyId)
        if (cancelled) return
        setRead({ surveyId, route: draft ? readSurveyRoute(draft.survey_route) : null })
      } catch (_error) {
        if (!cancelled) setRead({ surveyId, route: null })
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [surveyId, updatedAt])

  if (surveyId === null) return EMPTY
  if (read === null || read.surveyId !== surveyId) return NOT_LOADED
  return { route: read.route, loaded: true }
}
