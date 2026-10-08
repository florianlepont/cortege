import type { SurveyUiStatus } from "../../app/survey-logic"
import { ScoreRing } from "../../ui/ScoreRing"
import type { SurveyRowTone } from "./SurveyRowFrame"

// The parts of an own-survey row that Mes Relevés (`SurveyRow`) and the recent surveys of Accueil
// share: the accent tone of a status and the ring in the ring column.

export function resolveSurveyRowTone(uiStatus: SurveyUiStatus): SurveyRowTone {
  if (uiStatus === "sync_error" || uiStatus === "sync_blocked") return "danger"
  if (uiStatus === "submitted") return "success"
  if (uiStatus === "sync_pending") return "warning"
  return "neutral"
}

// LIST-01: the score ring (12.2-11). A submitted survey with a known total gets the band-coloured
// ring, a submitted one without a score the dashed "no score" ring, a draft a neutral arc showing
// how many of the ten factors are filled.
export function RowIndicator({
  surveyId,
  isSubmitted,
  score,
  completionRate,
  index,
  size,
}: {
  surveyId: string
  isSubmitted: boolean
  score: number | null
  completionRate: number
  index: number
  /** A smaller ring for a slim row (Accueil's recent surveys); the lists keep the default. */
  size?: number
}) {
  if (isSubmitted) {
    return score != null ? (
      <ScoreRing score={score} index={index} animationKey={`${surveyId}:${score}`} size={size} />
    ) : (
      <ScoreRing score={null} size={size} />
    )
  }
  const clamped = Math.max(0, Math.min(100, completionRate))
  return (
    <ScoreRing
      score={null}
      completion={clamped / 100}
      size={size}
      index={index}
      animationKey={`${surveyId}:draft:${clamped}`}
    />
  )
}
