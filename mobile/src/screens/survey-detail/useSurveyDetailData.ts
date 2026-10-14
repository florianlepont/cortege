import { readFactorAnnotations } from "@cortege/ibp-domain"
import { useMemo } from "react"
import { attachFactorAnnotations } from "../../app/factor-annotations"
import {
  defaultVegetationStageForRegion,
  normalizeVegetationStageForRegion,
} from "../../app/constants"
import { FactorKey, RegionVersion, SurveyDetailResponse, VegetationStage } from "../../app/types"
import { LocalSurvey } from "../../storage"
import { resolveScoringContext, type ScoringContext } from "./ScoringContextEditor"
import { canFinishSurvey } from "./summary-state"
import {
  DisplayedFactorResult,
  DisplayedScores,
  LocalDraftMeta,
  NOT_FILLED_CLASS,
  useLocalDraftSummary,
} from "./useLocalDraftSummary"

export type SurveyDetailData = {
  detail: SurveyDetailResponse | undefined
  displayedScores: DisplayedScores | null
  displayedFactorEntries: Array<[string, DisplayedFactorResult]>
  useLocalDraftView: boolean
  showFactorLoadingHint: boolean
  canEditSurvey: boolean
  /**
   * Complete, named, with a route, not blocked, not finished: "Terminer" is live, synced or not
   * (D-25; the route is phase 30, O-19).
   */
  canFinishNow: boolean
  /** The ten factors and the information are filled in (null until the local draft is read). */
  isComplete: boolean | null
  missingFactorCount: number | null
  filledFactorCount: number | null
  /** The first factor (A to J) not filled yet, where "Commencer / Continuer la notation" goes. */
  nextFactor: FactorKey | null
  localDraftMeta: LocalDraftMeta | null
  activeRegion: RegionVersion
  activeVegetationStage: VegetationStage
  scoringContext: ScoringContext
  activeSiteName: string
  parcelIds: string[]
  createdAt: string
}

/**
 * Everything the survey detail screens read about the selected survey, derived once: the summary
 * and its sub-pages (context, score, history) share it, so each page shows the same numbers.
 * A draft shows its local, live scores; a finished survey shows the server's.
 */
export function useSurveyDetailData(
  selectedSurvey: LocalSurvey,
  surveyDetails: Record<string, SurveyDetailResponse>,
  detailsLoadingSurveyId: string | null,
): SurveyDetailData {
  const detail = surveyDetails[selectedSurvey.id]
  const localDraft = useLocalDraftSummary(selectedSurvey)
  const canEditSurvey = selectedSurvey.status !== "submitted"
  const createdAt = detail?.created_at ?? selectedSurvey.created_at

  const canonicalFactorEntries = useMemo(() => {
    if (!detail) return []
    const entries = Object.entries(detail.factor_results).sort(([left], [right]) =>
      left.localeCompare(right),
    ) as Array<[string, DisplayedFactorResult]>
    // The server's annotations first, else the ones cached in the local payload (phase 27, D-13).
    const serverAnnotations = readFactorAnnotations(detail.factors)
    const annotations =
      Object.keys(serverAnnotations).length > 0 ? serverAnnotations : localDraft.annotations
    return attachFactorAnnotations(entries, annotations)
  }, [detail, localDraft.annotations])

  const useLocalDraftView = canEditSurvey && localDraft.scores !== null
  const displayedScores: DisplayedScores | null = useMemo(() => {
    if (useLocalDraftView && localDraft.scores) return localDraft.scores
    if (detail?.scores) return detail.scores
    return localDraft.scores
  }, [useLocalDraftView, localDraft.scores, detail?.scores])
  const displayedFactorEntries = useMemo<Array<[string, DisplayedFactorResult]>>(() => {
    if (useLocalDraftView && localDraft.factorEntries.length > 0) return localDraft.factorEntries
    if (canonicalFactorEntries.length > 0) {
      return canonicalFactorEntries
    }
    return localDraft.factorEntries
  }, [useLocalDraftView, localDraft.factorEntries, canonicalFactorEntries])
  const showFactorLoadingHint =
    detailsLoadingSurveyId === selectedSurvey.id &&
    !displayedScores &&
    displayedFactorEntries.length === 0

  const canFinishNow = canFinishSurvey(selectedSurvey, localDraft.submitReady, localDraft.hasRoute)
  const missingFactorCount = localDraft.missingFactorCount
  const filledFactorCount = missingFactorCount === null ? null : 10 - missingFactorCount

  const nextFactor = useMemo(
    () =>
      (localDraft.factorEntries.find(
        ([, result]) => result.selected_class === NOT_FILLED_CLASS,
      )?.[0] ?? null) as FactorKey | null,
    [localDraft.factorEntries],
  )

  const localDraftMeta = localDraft.meta
  const activeRegion: RegionVersion = useMemo(() => {
    if (localDraftMeta) return localDraftMeta.region_version
    return detail?.region_version === "M" ? "M" : "ACA"
  }, [localDraftMeta, detail?.region_version])
  const activeVegetationStage: VegetationStage = useMemo(() => {
    if (localDraftMeta) return localDraftMeta.vegetation_stage
    const fallback = defaultVegetationStageForRegion(activeRegion)
    return normalizeVegetationStageForRegion(
      activeRegion,
      typeof detail?.vegetation_stage === "string" ? detail.vegetation_stage : fallback,
    )
  }, [localDraftMeta, activeRegion, detail?.vegetation_stage])
  const scoringContext = useMemo(
    () => resolveScoringContext(localDraftMeta, detail, !canEditSurvey),
    [localDraftMeta, detail, canEditSurvey],
  )
  const activeSiteName =
    (localDraftMeta?.site_name ?? detail?.site_name ?? selectedSurvey.site_name).trim() ||
    selectedSurvey.site_name
  const parcelIds = useMemo(() => {
    if (detail?.parcel_ids?.length) return detail.parcel_ids
    if (detail?.parcel_id) return [detail.parcel_id]
    return localDraftMeta?.parcel_ids ?? []
  }, [detail?.parcel_ids, detail?.parcel_id, localDraftMeta?.parcel_ids])

  return {
    detail,
    displayedScores,
    displayedFactorEntries,
    useLocalDraftView,
    showFactorLoadingHint,
    canEditSurvey,
    canFinishNow,
    isComplete: localDraft.submitReady,
    missingFactorCount,
    filledFactorCount,
    nextFactor,
    localDraftMeta,
    activeRegion,
    activeVegetationStage,
    scoringContext,
    activeSiteName,
    parcelIds,
    createdAt,
  }
}
