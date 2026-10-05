import {
  FACTOR_KEYS,
  IBP_METHOD_V3_2,
  resolveMethodVersion,
  type CommunitySurveyDetail,
} from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import {
  NOT_FILLED_CLASS,
  type DisplayedFactorResult,
  type DisplayedScores,
} from "../survey-detail/useLocalDraftSummary"

const t = fr.communitySurvey

const asNumber = (value: unknown): number => (typeof value === "number" ? value : 0)

/** The three scores of the wire survey, as the score components show them. */
export function toDisplayedScores(detail: CommunitySurveyDetail): DisplayedScores {
  return {
    ibp_total: asNumber(detail.scores.ibp_total),
    ibp_peuplement_gestion: asNumber(detail.scores.ibp_peuplement_gestion),
    ibp_contexte: asNumber(detail.scores.ibp_contexte),
  }
}

/** The ten factors in order: their class and points, "à remplir" for one the survey lacks. */
export function toFactorEntries(
  detail: CommunitySurveyDetail,
): Array<[string, DisplayedFactorResult]> {
  return FACTOR_KEYS.map((code): [string, DisplayedFactorResult] => {
    const result = detail.factor_results[code] as
      | { selected_class?: string; score_points?: number }
      | undefined
    return [
      code,
      {
        selected_class: result?.selected_class ?? NOT_FILLED_CLASS,
        warnings: [],
        score_points: typeof result?.score_points === "number" ? result.score_points : null,
      },
    ]
  })
}

export type ContextRow = { key: string; label: string; value: string }

/**
 * The method and the station context of the survey: the version, then the cas (v3.2) or the region
 * and the vegetation stage (v3.0), each only when the survey has it.
 */
export function toContextRows(detail: CommunitySurveyDetail): ContextRow[] {
  const rows: ContextRow[] = []
  const version = resolveMethodVersion(detail.ibp_method_version)
  rows.push({
    key: "method",
    label: t.rows.method,
    // An untagged survey is a v3.0 one from before the version was chosen; an unknown tag has no name.
    value:
      detail.ibp_method_version === null || version === null
        ? fr.ibpMethod.legacyVersionLabel
        : fr.ibpMethod.versions[version],
  })
  if (version === IBP_METHOD_V3_2) {
    const cas = detail.ibp_cas
    if (cas === 1 || cas === 2 || cas === 3 || cas === 4) {
      rows.push({ key: "cas", label: t.rows.cas, value: fr.ibpMethod.casLabels[cas] })
    }
    return rows
  }
  const region = detail.region_version
  if (region === "ACA" || region === "M") {
    rows.push({ key: "region", label: t.rows.region, value: fr.labels.regions[region] })
  }
  const stage = detail.vegetation_stage as keyof typeof fr.labels.vegetationStages | null
  if (stage && stage in fr.labels.vegetationStages) {
    rows.push({ key: "stage", label: t.rows.stage, value: fr.labels.vegetationStages[stage] })
  }
  return rows
}
