import { useEffect, useMemo, useRef } from "react"
import { evaluateSubmitReadinessFromDraft } from "../../app/ibp-scoring"
import { useSurveyRoute } from "../../hooks/useSurveyRoute"
import type { SurveyFormDraftInput } from "../../hooks/useSurveyForm"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { LocalSurvey } from "../../storage"
import { canFinishSurvey } from "../survey-detail/summary-state"

/**
 * Whether the draft on screen holds the ten factors and the information (the package's submit
 * readiness plus a parcel, `evaluateSubmitReadinessFromDraft`). Read from the live form, so the
 * pill appears as soon as the last answer is given, before the autosave has written it.
 */
export function isDraftComplete(draft: SurveyFormDraftInput): boolean {
  return evaluateSubmitReadinessFromDraft(draft).ready
}

export type PagerFinish = {
  /**
   * Complete, named, with a route, not blocked, not finished (`canFinishSurvey`): the pill is
   * offered. While the route is read, and for a draft without route, it is not.
   */
  offered: boolean
  /** Stable. Opens the submission step for the survey being edited. */
  finish: () => void
}

type UsePagerFinishParams = {
  /** The survey being edited in the pager, null when it is not in the local list. */
  survey: LocalSurvey | null
  draft: SurveyFormDraftInput
  /** Opens the submission step (the `surveyFinish` sheet) for this survey. */
  openFinish: (surveyId: string) => void
  /** Called once when the survey has become "submitted" after a finish from here. */
  onFinished: () => void
}

/**
 * D-26: "Terminer le relevé" from the factor pager. The pill opens the same submission step as
 * the survey detail's bottom button (Phase 29, D-04): the sheet writes the pending form edits
 * (the 900 ms autosave may still be waiting), then stores the visibility choice, then finishes.
 * Success is the stored status becoming "submitted" (the only place that writes it on the phone),
 * seen through the survey list; the caller then goes back to the summary, where the success
 * haptic, halo and pop play (`useSubmitSuccessPulse`, not repeated here). A sheet closed without
 * finishing leaves the pager as it was. A draft without route has no pill (phase 30, O-19).
 */
export function usePagerFinish({
  survey,
  draft,
  openFinish,
  onFinished,
}: UsePagerFinishParams): PagerFinish {
  const complete = useMemo(() => isDraftComplete(draft), [draft])
  // Phase 30 (O-19, spec section 8): a draft without route cannot be finished. The route is read
  // from the local payload; nothing is offered until that read is done.
  const route = useSurveyRoute(survey)
  const hasRoute = route.loaded && route.route !== null
  const offered = survey !== null && canFinishSurvey(survey, complete, hasRoute)
  const requested = useRef(false)
  const surveyId = survey?.id ?? null
  const status = survey?.status ?? null

  useEffect(() => {
    if (!requested.current || status !== "submitted") return
    requested.current = false
    onFinished()
  }, [status, onFinished])

  const finish = useLatestCallback((): void => {
    if (surveyId === null) return
    requested.current = true
    openFinish(surveyId)
  })

  return { offered, finish }
}
