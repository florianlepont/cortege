import { bandTone, contextBand, ScoreTone, standBand } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { LocalSurvey } from "../../storage"
import { DisplayedScores } from "./useLocalDraftSummary"

export type HeroSubmitState = "submitted" | "ready" | "pending_sync" | "blocked" | "progress"

export const resolveHeroSubmitState = (
  survey: LocalSurvey,
  canSubmitNow: boolean,
  localSubmitReady: boolean | null,
): HeroSubmitState => {
  if (survey.status === "submitted") return "submitted"
  if (canSubmitNow) return "ready"
  if (localSubmitReady === true) return survey.sync_blocked === 1 ? "blocked" : "pending_sync"
  return "progress"
}

/** A sub-score's CNPF band (D-03 amended): its French name and its colour tone. */
export type SubScoreBand = { bandLabel: string; tone: ScoreTone }

/** A sub-score as the hero shows it: "P/G 21 / 35", with its band. */
export type HeroSubScore = SubScoreBand & { text: string }

export type HeroMetric = {
  caption: string
  value: string
  meta: string
  stand: HeroSubScore | null
  context: HeroSubScore | null
}

const m = fr.surveyDetail.metric
const bands = fr.surveyDetail.bands

/** The CNPF bands of the stand (/35) and context (/15) sub-scores, from the shared package. */
export const resolveSubScoreBands = (
  standScore: number,
  contextScore: number,
): { stand: SubScoreBand; context: SubScoreBand } => {
  const stand = standBand(standScore)
  const context = contextBand(contextScore)
  return {
    stand: { bandLabel: bands.stand[stand], tone: bandTone(stand) },
    context: { bandLabel: bands.context[context], tone: bandTone(context) },
  }
}

export const resolveHeroMetric = (
  scores: DisplayedScores | null,
  useLocalDraftView: boolean,
  completedFactorCount: number | null,
): HeroMetric => {
  if (scores) {
    const subScoreBands = resolveSubScoreBands(scores.ibp_peuplement_gestion, scores.ibp_contexte)
    return {
      caption: useLocalDraftView ? m.localDraftScore : m.ibpTotal,
      value: m.total(scores.ibp_total),
      meta: m.split({
        standTotal: scores.ibp_peuplement_gestion,
        contextTotal: scores.ibp_contexte,
      }),
      stand: { ...subScoreBands.stand, text: m.standScore(scores.ibp_peuplement_gestion) },
      context: { ...subScoreBands.context, text: m.contextScore(scores.ibp_contexte) },
    }
  }
  return {
    caption: m.factorsReady,
    value: completedFactorCount !== null ? m.factorsCount(completedFactorCount) : m.unknown,
    meta: completedFactorCount !== null ? m.requiredCompleted : m.readinessPending,
    stand: null,
    context: null,
  }
}

export type HeroSubmitCopy = { heading: string; body: string; pill: string }

export const resolveHeroSubmitCopy = (state: HeroSubmitState): HeroSubmitCopy => {
  const copy = fr.surveyDetail.submit
  if (state === "ready") return copy.ready
  if (state === "pending_sync") return copy.pendingSync
  if (state === "blocked") return copy.blocked
  return copy.progress
}
