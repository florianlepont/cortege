import type { SurveyWeather } from "@cortege/ibp-domain"
import { useEffect, useState } from "react"
import { getLocalSurveyDraft, type LocalSurvey } from "../../../storage"

/** What the Conditions section and the summary card read about one survey (phase 27, D-15). */
export type SurveyConditions = {
  note: string | null
  weather: SurveyWeather | null
  parcelIds: string[]
  /** False until the local draft was read once; true after a failed read too (empty values). */
  loaded: boolean
}

const NOT_LOADED: SurveyConditions = { note: null, weather: null, parcelIds: [], loaded: false }
const EMPTY: SurveyConditions = { note: null, weather: null, parcelIds: [], loaded: true }

/**
 * The survey note, the weather and the parcel ids of the survey, read from its local payload and
 * read again whenever the survey row changes (`updated_at`, bumped by every write of the section
 * and by the weather prefill). A read that is overtaken by a newer one is dropped.
 */
export function useSurveyConditions(survey: LocalSurvey): SurveyConditions {
  const [conditions, setConditions] = useState<SurveyConditions>(NOT_LOADED)

  useEffect(() => {
    let cancelled = false

    const run = async (): Promise<void> => {
      try {
        const draft = await getLocalSurveyDraft(survey.id)
        if (cancelled) return
        if (!draft) {
          setConditions(EMPTY)
          return
        }
        setConditions({
          note: typeof draft.survey_note === "string" ? draft.survey_note : null,
          weather: draft.weather ?? null,
          parcelIds: Array.isArray(draft.parcel_ids) ? draft.parcel_ids : [],
          loaded: true,
        })
      } catch (_error) {
        if (!cancelled) setConditions(EMPTY)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [survey.id, survey.updated_at])

  return conditions
}
