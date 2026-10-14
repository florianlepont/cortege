import { useEffect, useRef, useState } from "react"
import { AccessibilityInfo } from "react-native"
import type { SurveyVisibility } from "@cortege/ibp-domain"
import type {
  DraftVisibilityResult,
  FinishOutcome,
} from "../../hooks/survey-sync/useSurveySyncSurveyOperations"
import { fr, logStatusDetail } from "../../i18n"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { LocalSurvey } from "../../storage"
import { feedback } from "../../ui/feedback"
import { nextStepAfterFinish } from "./finish-outcome"

export type FinishSheetPhase = "idle" | "submitting" | "saveError" | "notFinished" | "frozen"

type UseFinishSheetParams = {
  /** The survey being finished, null when it is not (or no longer) in the local list. */
  survey: LocalSurvey | null
  /** Read at the tap: the offline sheet stores the choice and closes (the finish cannot run). */
  offline: boolean
  /** Writes the pending form edits; resolves true when nothing was being edited or the write worked. */
  flushDraft: () => Promise<boolean>
  /** Queue-only write of the choice (the finish's own drain sends it). */
  setDraftVisibility: (
    surveyId: string,
    visibility: SurveyVisibility,
  ) => Promise<DraftVisibilityResult>
  submitSurvey: (surveyId: string) => Promise<FinishOutcome>
  onClose: () => void
  announce?: (message: string) => void
}

export type FinishSheet = {
  choice: SurveyVisibility
  select: (next: SurveyVisibility) => void
  confirm: () => void
  phase: FinishSheetPhase
  /** Changes at each finish that ended without submitting online: keys the outcome notice. */
  outcomeKey: number
}

/**
 * Phase 29, D-04, D-05 and D-07: the confirm sequence of the finish sheet. In this order and never
 * out of it: the pending form edits are written, the choice is stored on the draft when it differs
 * from the stored one, then the existing finish runs. The finish is never attempted after a failed
 * write (T-29-23). Nothing is stored before the confirm: a cancel, a swipe down or a back press
 * discards the choice. The choice and the frozen state are taken once at mount: the sheet mounts at
 * each opening, so a reopening shows the stored value.
 */
export function useFinishSheet({
  survey,
  offline,
  flushDraft,
  setDraftVisibility,
  submitSurvey,
  onClose,
  announce = AccessibilityInfo.announceForAccessibility,
}: UseFinishSheetParams): FinishSheet {
  const [choice, setChoice] = useState<SurveyVisibility>(
    survey?.visibility === "private" ? "private" : "public",
  )
  const [phase, setPhase] = useState<FinishSheetPhase>(
    survey?.status === "submitted" ? "frozen" : "idle",
  )
  const [outcomeKey, setOutcomeKey] = useState(0)
  const running = useRef(false)
  const surveyMissing = survey === null

  // Stable, so the effect below reacts only to the survey disappearing (deleted meanwhile).
  const close = useLatestCallback(onClose)
  useEffect(() => {
    if (surveyMissing) close()
  }, [surveyMissing, close])

  const select = useLatestCallback((next: SurveyVisibility): void => {
    if (phase === "submitting" || phase === "frozen") return
    setChoice(next)
  })

  const confirm = useLatestCallback((): void => {
    if (running.current || survey === null) return
    if (phase === "submitting" || phase === "frozen") return
    const surveyId = survey.id
    const stored = survey.visibility
    const wasOffline = offline
    running.current = true
    setPhase("submitting")
    announce(fr.surveyFinish.submittingA11y)
    void (async () => {
      let released = true
      try {
        let written: boolean
        try {
          written = await flushDraft()
          if (written && choice !== stored) {
            const result = await setDraftVisibility(surveyId, choice)
            if (result === "frozen") {
              setPhase("frozen")
              return
            }
          }
        } catch (error) {
          logStatusDetail("finishSheet.save", error)
          written = false
        }
        if (!written) {
          feedback.notify.error()
          setPhase("saveError")
          return
        }
        const step = nextStepAfterFinish(await submitSurvey(surveyId), wasOffline)
        if (step === "close") {
          // Left in "submitting" on purpose: the sheet is closing, the controls stay locked.
          released = false
          close()
        } else if (step === "notFinished") {
          setOutcomeKey((current) => current + 1)
          setPhase("notFinished")
        } else {
          setPhase("idle")
        }
      } catch (error) {
        logStatusDetail("finishSheet.finish", error)
        setOutcomeKey((current) => current + 1)
        setPhase("notFinished")
      } finally {
        if (released) running.current = false
      }
    })()
  })

  return { choice, select, confirm, phase, outcomeKey }
}
