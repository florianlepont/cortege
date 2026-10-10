import { useRef, useState } from "react"
import { Alert } from "react-native"
import { exportAndShareSurveyPdf, type SurveyExportInput } from "../../app/survey-pdf-export"
import { fr, logStatusDetail } from "../../i18n"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { SurveyDetailData } from "./useSurveyDetailData"

const menuText = fr.surveyDetail.menu
const actionsText = fr.surveyDetail.actions

/** What the hook reads from the summary: the shared detail data plus the session facts. */
export type SurveyPdfExportArgs = Pick<
  SurveyDetailData,
  | "detail"
  | "canEditSurvey"
  | "activeSiteName"
  | "parcelIds"
  | "localDraftMeta"
  | "scoringContext"
  | "displayedScores"
  | "displayedFactorEntries"
  | "createdAt"
> & {
  surveyId: string
  /** The signed-in member's display name, printed as the observer (D-04). */
  observerName: string | null
  apiUrl: string
  accessToken: string | null
}

// Checked here and not through survey-screen-helpers: that module is mocked in the screen test.
function finiteLocation(
  location: { lat?: unknown; lng?: unknown } | null | undefined,
): { lat: number; lng: number } | null {
  const lat = location?.lat
  const lng = location?.lng
  if (typeof lat !== "number" || !Number.isFinite(lat)) return null
  if (typeof lng !== "number" || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/**
 * Maps the summary's data to the export input. A submitted survey is fixed on the server, so its
 * detail wins; a draft's local payload holds the latest edits (the same rule as the scoring
 * context). The year and the version number are server-assigned, so the detail wins for both.
 */
export function buildSurveyExportInput(args: SurveyPdfExportArgs): SurveyExportInput {
  const { detail, localDraftMeta, canEditSurvey } = args
  const [region, stage] = canEditSurvey
    ? [
        localDraftMeta?.region_version ?? detail?.region_version,
        localDraftMeta?.vegetation_stage ?? detail?.vegetation_stage,
      ]
    : [
        detail?.region_version ?? localDraftMeta?.region_version,
        detail?.vegetation_stage ?? localDraftMeta?.vegetation_stage,
      ]
  return {
    surveyId: args.surveyId,
    siteName: args.activeSiteName,
    parcelIds: args.parcelIds,
    observationYear: detail?.observation_year ?? localDraftMeta?.observation_year ?? null,
    versionNumber: detail?.version_number ?? localDraftMeta?.version_number ?? null,
    dateIso: detail?.submitted_at ?? args.createdAt,
    isDraft: canEditSurvey,
    observerName: args.observerName,
    displayLocation: finiteLocation(detail?.display_location),
    method: {
      version: args.scoringContext.ibp_method_version,
      ibpCas: args.scoringContext.ibp_cas,
      ibpCas3Scale: args.scoringContext.ibp_cas3_scale,
      regionVersion: region ?? null,
      vegetationStage: stage ?? null,
    },
    scores: args.displayedScores,
    factorEntries: args.displayedFactorEntries,
    apiUrl: args.apiUrl,
    accessToken: args.accessToken,
  }
}

/**
 * The share action of the summary: runs the PDF export once at a time (a second tap while it runs
 * does nothing, so Android never sees two share sheets) and tells the member when it cannot share
 * or fails.
 */
export function useSurveyPdfExport(args: SurveyPdfExportArgs): {
  exporting: boolean
  share: () => Promise<void>
} {
  const [exporting, setExporting] = useState(false)
  const running = useRef(false)
  const share = useLatestCallback(async (): Promise<void> => {
    if (running.current) return
    running.current = true
    setExporting(true)
    try {
      const { shared } = await exportAndShareSurveyPdf(buildSurveyExportInput(args))
      if (!shared) Alert.alert(menuText.share, actionsText.exportShareUnavailable)
    } catch (error) {
      logStatusDetail("surveyDetail.exportPdf", error)
      Alert.alert(menuText.share, actionsText.exportFailed)
    } finally {
      running.current = false
      setExporting(false)
    }
  })
  return { exporting, share }
}
