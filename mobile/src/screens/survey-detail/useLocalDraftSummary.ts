import { FACTOR_KEYS } from "@cortege/ibp-domain"
import { useEffect, useState } from "react"
import {
  computeIbpTotalsFromRetainedScores,
  computeRetainedScoresFromRawFactors,
  evaluateSubmitReadinessFromDraft,
} from "../../app/ibp-scoring"
import {
  defaultVegetationStageForRegion,
  normalizeVegetationStageForRegion,
} from "../../app/constants"
import { RegionVersion, VegetationStage } from "../../app/types"
import { getLocalSurveyDraft, LocalSurvey } from "../../storage"

export type DisplayedScores = {
  ibp_total: number
  ibp_peuplement_gestion: number
  ibp_contexte: number
}
export type DisplayedFactorResult = {
  selected_class: string
  warnings: string[]
}
export type LocalDraftMeta = {
  site_name: string
  region_version: RegionVersion
  vegetation_stage: VegetationStage
  // The draft's method fields as stored (01.8-14): null version = untagged legacy draft (v3.0).
  ibp_method_version: string | null
  ibp_cas: number | null
  ibp_cas3_scale: boolean
  // Read straight from the local payload (phase 10, D-01): parcel_ids is set on device;
  // observation_year/version_number are server-assigned and only present once cached back
  // locally (cacheSurveyCanonicalFields), so a PDF export has an offline fallback either way.
  parcel_ids: string[]
  observation_year: number | null
  version_number: number | null
}

export type LocalDraftSummary = {
  scores: DisplayedScores | null
  factorEntries: Array<[string, DisplayedFactorResult]>
  submitReady: boolean | null
  missingFactorCount: number | null
  meta: LocalDraftMeta | null
}

export const NOT_FILLED_CLASS = "Not filled"

const EMPTY_SUMMARY: LocalDraftSummary = {
  scores: null,
  factorEntries: [],
  submitReady: null,
  missingFactorCount: null,
  meta: null,
}

// Reads the local draft of the selected survey and derives the live scores,
// factor classes and submit readiness shown before the server copy catches up.
export function useLocalDraftSummary(survey: LocalSurvey): LocalDraftSummary {
  const [summary, setSummary] = useState<LocalDraftSummary>(EMPTY_SUMMARY)

  useEffect(() => {
    let cancelled = false

    const run = async (): Promise<void> => {
      try {
        const draft = await getLocalSurveyDraft(survey.id)
        if (!draft || cancelled) {
          if (!cancelled) setSummary(EMPTY_SUMMARY)
          return
        }

        const context = {
          ibp_method_version: draft.ibp_method_version,
          ibp_cas: draft.ibp_cas,
          ibp_cas3_scale: draft.ibp_cas3_scale,
          region_version: draft.region_version,
          vegetation_stage: draft.vegetation_stage,
        }
        const retained = computeRetainedScoresFromRawFactors(
          typeof draft.factors === "object" && draft.factors && !Array.isArray(draft.factors)
            ? draft.factors
            : {},
          context,
        )

        const totals = computeIbpTotalsFromRetainedScores(retained)
        const regionVersion: RegionVersion = draft.region_version === "M" ? "M" : "ACA"
        const vegetationStage = normalizeVegetationStageForRegion(
          regionVersion,
          typeof draft.vegetation_stage === "string"
            ? draft.vegetation_stage
            : defaultVegetationStageForRegion(regionVersion),
        )
        const readiness = evaluateSubmitReadinessFromDraft({
          ...context,
          factors: draft.factors,
          parcel_ids: draft.parcel_ids,
          expires_at: draft.expires_at,
        })
        const entries = FACTOR_KEYS.map<[string, DisplayedFactorResult]>((factorCode) => {
          const score = retained[factorCode]
          return [
            factorCode,
            {
              selected_class: score?.selected_class ?? NOT_FILLED_CLASS,
              warnings: [],
            },
          ]
        })

        if (cancelled) return
        setSummary({
          scores: {
            ibp_total: totals.ibp_total,
            ibp_peuplement_gestion: totals.ibp_peuplement_gestion,
            ibp_contexte: totals.ibp_contexte,
          },
          factorEntries: entries,
          submitReady: readiness.ready,
          missingFactorCount: readiness.missing_factors.length,
          meta: {
            site_name:
              typeof draft.site_name === "string" && draft.site_name.trim().length > 0
                ? draft.site_name
                : survey.site_name,
            region_version: regionVersion,
            vegetation_stage: vegetationStage,
            ibp_method_version:
              typeof draft.ibp_method_version === "string" ? draft.ibp_method_version : null,
            ibp_cas: typeof draft.ibp_cas === "number" ? draft.ibp_cas : null,
            ibp_cas3_scale: draft.ibp_cas3_scale === true,
            parcel_ids: Array.isArray(draft.parcel_ids) ? draft.parcel_ids : [],
            observation_year:
              typeof draft.observation_year === "number" ? draft.observation_year : null,
            version_number: typeof draft.version_number === "number" ? draft.version_number : null,
          },
        })
      } catch (_error) {
        if (!cancelled) setSummary(EMPTY_SUMMARY)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [survey.id, survey.site_name, survey.updated_at])

  return summary
}
