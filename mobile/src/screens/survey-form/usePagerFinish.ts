import { useEffect, useMemo, useRef, useState } from "react"
import { evaluateSubmitReadinessFromDraft } from "../../app/ibp-scoring"
import type { SurveyFormDraftInput } from "../../hooks/useSurveyForm"
import { logStatusDetail } from "../../i18n"
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
  /** Complete, named, not blocked, not finished (`canFinishSurvey`): the pill is offered. */
  offered: boolean
  /** A finish is running: the pill shows its spinner and ignores presses. */
  busy: boolean
  /** Finishes that have ended (0 before any): a new value after one that did not finish shows
   * its calm message. */
  attempts: number
  /** Stable. Writes the pending edits, then runs the survey detail's finish. */
  finish: () => void
}

type UsePagerFinishParams = {
  /** The survey being edited in the pager, null when it is not in the local list. */
  survey: LocalSurvey | null
  draft: SurveyFormDraftInput
  flushDraft: () => Promise<boolean>
  /** The survey actions' `submitSurvey` (`handleSubmitSurvey`): sends the pending changes itself,
   * then submits, one finish at a time per survey (D-25). */
  submitSurvey: (surveyId: string) => Promise<void>
  /** Called once when the survey has become "submitted" after a finish from here. */
  onFinished: () => void
}

/**
 * D-26: "Terminer le relevé" from the factor pager. The same finish as the survey detail's bottom
 * button: the pending form edits are written first (the 900 ms autosave may still be waiting),
 * then `submitSurvey`. Success is the stored status becoming "submitted" (the only place that
 * writes it on the phone), seen through the survey list; the caller then goes back to the summary,
 * where the success haptic, halo and pop play (`useSubmitSuccessPulse`, not repeated here). A
 * finish that does not finish (offline, a sync not done, a refusal) leaves the status message it
 * set and the pager stays. A second press while one runs does nothing.
 */
export function usePagerFinish({
  survey,
  draft,
  flushDraft,
  submitSurvey,
  onFinished,
}: UsePagerFinishParams): PagerFinish {
  const complete = useMemo(() => isDraftComplete(draft), [draft])
  const offered = survey !== null && canFinishSurvey(survey, complete)
  const [busy, setBusy] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const running = useRef(false)
  const requested = useRef(false)
  const surveyId = survey?.id ?? null
  const status = survey?.status ?? null

  useEffect(() => {
    if (!requested.current || status !== "submitted") return
    requested.current = false
    onFinished()
  }, [status, onFinished])

  const finish = useLatestCallback((): void => {
    if (running.current || surveyId === null) return
    running.current = true
    requested.current = true
    setBusy(true)
    void (async () => {
      try {
        if (await flushDraft()) await submitSurvey(surveyId)
      } catch (error) {
        logStatusDetail("factorPager.finish", error)
      } finally {
        running.current = false
        setBusy(false)
        setAttempts((current) => current + 1)
      }
    })()
  })

  return { offered, busy, attempts, finish }
}
