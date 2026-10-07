import { bandTone, contextBand, ScoreTone, standBand } from "@cortege/ibp-domain"
import type { FactorKey } from "../../app/types"
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
 * Whether the "Terminer le relevé" button is live (D-25): the ten factors and the information are
 * filled in, the survey is named, not blocked and not finished yet. Whether it is synced does not
 * matter: the finish sends the last changes itself before the submit call. An unnamed draft never
 * leaves the phone (OA-18), so it is asked for a name first.
 */
export const canFinishSurvey = (survey: LocalSurvey, isComplete: boolean | null): boolean =>
  isComplete === true &&
  survey.status !== "submitted" &&
  survey.sync_blocked !== 1 &&
  (survey.site_name ?? "").trim() !== ""

/**
 * The single button at the bottom (OA-40). `hidden` once the survey is finished; `next` opens the
 * first factor still to fill ("Commencer" with none filled, then "Continuer"); `disabled` says
 * what is missing (a name, or a blocked sync); `ready` finishes the survey. There is no sync step
 * to wait for (D-25).
 */
export type FinishCta =
  | { kind: "hidden" }
  | { kind: "ready"; label: string }
  | { kind: "next"; label: string; factor: FactorKey }
  | { kind: "disabled"; label: string }

export const resolveFinishCta = (
  survey: LocalSurvey,
  canFinishNow: boolean,
  isComplete: boolean | null,
  filledFactorCount: number | null,
  nextFactor: FactorKey | null,
): FinishCta => {
  if (survey.status === "submitted") return { kind: "hidden" }
  if (canFinishNow) return { kind: "ready", label: c.finish }
  if (isComplete === true) {
    return {
      kind: "disabled",
      label: survey.sync_blocked === 1 ? c.blocked : c.nameRequired,
    }
  }
  if (filledFactorCount === null) return { kind: "disabled", label: c.remainingUnknown }
  if (nextFactor === null) return { kind: "disabled", label: c.contextMissing }
  return {
    kind: "next",
    label: filledFactorCount === 0 ? c.start : c.continue,
    factor: nextFactor,
  }
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
