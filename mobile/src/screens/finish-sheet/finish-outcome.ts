import type { FinishOutcome } from "../../hooks/survey-sync/useSurveySyncSurveyOperations"

/** What the finish sheet does once the finish has returned. */
export type FinishSheetStep = "close" | "notFinished" | "idle"

/**
 * Phase 29, D-05: how the sheet ends after `submitSurvey` returned.
 * - `submitted`: the survey is finished, the sheet closes.
 * - `not_submitted` offline: the choice is stored and the notice shown before the tap already said
 *   the survey can be finished once back online, so the sheet closes.
 * - `not_submitted` online: the sheet stays open and shows the status message of that moment. The
 *   summary never displays status messages (only Paramètres reads the status line), so closing
 *   would make a failed finish silent.
 * - `busy`: another finish of the same survey is running; nothing happened here, back to idle.
 */
export function nextStepAfterFinish(outcome: FinishOutcome, offline: boolean): FinishSheetStep {
  if (outcome === "submitted") return "close"
  if (outcome === "busy") return "idle"
  return offline ? "close" : "notFinished"
}
