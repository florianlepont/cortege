import { bandTone, contextBand, ScoreTone, standBand } from "@cortege/ibp-domain"
import { resolveSurveySyncDisplay } from "../../app/survey-logic"
import { fr } from "../../i18n"
import { LocalSurvey } from "../../storage"

const h = fr.surveyDetail.header
const c = fr.surveyDetail.cta
const bands = fr.surveyDetail.bands

/** The status line under the title: "Brouillon" then "pas encore synchronisé" (OA-37). */
export type StatusLine = { status: string; sync: string; syncTone: "ok" | "pending" | "danger" }

export const resolveStatusLine = (survey: LocalSurvey, isComplete: boolean | null): StatusLine => {
  const syncDisplay = resolveSurveySyncDisplay(survey)
  const status =
    survey.status === "submitted"
      ? h.status.finished
      : isComplete === true
        ? h.status.draftComplete
        : h.status.draft
  if (syncDisplay === "sync") return { status, sync: h.sync.synced, syncTone: "ok" }
  if (syncDisplay === "sync_error") return { status, sync: h.sync.error, syncTone: "danger" }
  if (syncDisplay === "sync_blocked") return { status, sync: h.sync.blocked, syncTone: "danger" }
  return { status, sync: h.sync.pending, syncTone: "pending" }
}

/**
 * The single button at the bottom (OA-40). `hidden` once the survey is finished; `disabled` says
 * what is missing; `ready` finishes the survey.
 */
export type FinishCta =
  | { kind: "hidden" }
  | { kind: "ready"; label: string }
  | { kind: "disabled"; label: string }

export const resolveFinishCta = (
  survey: LocalSurvey,
  canFinishNow: boolean,
  isComplete: boolean | null,
  missingFactorCount: number | null,
): FinishCta => {
  if (survey.status === "submitted") return { kind: "hidden" }
  if (canFinishNow) return { kind: "ready", label: c.finish }
  if (isComplete === true) {
    return {
      kind: "disabled",
      label: survey.sync_blocked === 1 ? c.blocked : c.pendingSync,
    }
  }
  if (missingFactorCount !== null && missingFactorCount > 0) {
    return { kind: "disabled", label: c.remaining(missingFactorCount) }
  }
  return { kind: "disabled", label: c.remainingUnknown }
}

/** A sub-score's CNPF band: its French name and its colour tone. */
export type SubScoreBand = { bandLabel: string; tone: ScoreTone }

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
