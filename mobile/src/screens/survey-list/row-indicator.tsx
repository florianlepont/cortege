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
}: {
  surveyId: string
  isSubmitted: boolean
  score: number | null
  completionRate: number
  index: number
}) {
  if (isSubmitted) {
    return score != null ? (
      <ScoreRing score={score} index={index} animationKey={`${surveyId}:${score}`} />
    ) : (
      <ScoreRing score={null} />
    )
  }
  const clamped = Math.max(0, Math.min(100, completionRate))
  return (
    <ScoreRing
      score={null}
      completion={clamped / 100}
      index={index}
      animationKey={`${surveyId}:draft:${clamped}`}
    />
  )
}
