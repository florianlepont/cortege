import { createContext, useContext } from "react"
import type { CnpfFactorAGenusCode, IbpCas, SurveyWeather } from "@cortege/ibp-domain"
import type {
  RegionVersion,
  SurveyDetailResponse,
  SurveyDetailTab,
  SurveyEventItem,
  SurveyStats,
  VegetationStage,
} from "../app/types"
import type { useSurveyList } from "../hooks/useSurveyList"
import type { FormMode } from "../navigation/types"
import type { useSurveySyncSurveyOperations } from "../hooks/survey-sync/useSurveySyncSurveyOperations"

type SurveyList = ReturnType<typeof useSurveyList>
type SurveyOperations = ReturnType<typeof useSurveySyncSurveyOperations>

/**
 * Surveys context (phase 01.9, D-01): the local survey list, its filters, the
 * selection, the server detail and event caches, and the survey actions. It
 * changes when the list, a filter, the selection or a cache changes, never on
 * a status message or a form keystroke.
 */
export type SurveysState = {
  surveys: SurveyList["surveys"]
  visibleSurveys: SurveyList["visibleSurveys"]
  selectedSurveyId: string | null
  selectedSurvey: SurveyList["selectedSurvey"]
  selectedSurveyAttachments: SurveyList["selectedSurveyAttachments"]
  surveyFromDate: string
  surveyToDate: string
  statusFilter: SurveyList["statusFilter"]
  syncFilter: SurveyList["syncFilter"]
  blockedFilter: SurveyList["blockedFilter"]
  attachmentFilter: SurveyList["attachmentFilter"]
  sortMode: SurveyList["sortMode"]
  surveyDetails: Record<string, SurveyDetailResponse>
  detailsLoadingSurveyId: string | null
  surveyEvents: Record<string, SurveyEventItem[]>
  eventsLoadingSurveyId: string | null
  surveyStats: SurveyStats
  ownSurveyIds: string[]
  surveyDetailTab: SurveyDetailTab
  editingSurveyId: string | null
  formMode: FormMode
}

export type SurveyActions = {
  setSurveyFromDate: SurveyList["setSurveyFromDate"]
  setSurveyToDate: SurveyList["setSurveyToDate"]
  setStatusFilter: SurveyList["setStatusFilter"]
  setSyncFilter: SurveyList["setSyncFilter"]
  setBlockedFilter: SurveyList["setBlockedFilter"]
  setAttachmentFilter: SurveyList["setAttachmentFilter"]
  setSortMode: SurveyList["setSortMode"]
  resetFilters: SurveyList["resetFilters"]
  openSurvey: (surveyId: string) => void
  closeSurveyDetailSelection: () => void
  setSurveyDetailTab: (tab: SurveyDetailTab) => void
  submitSurvey: SurveyOperations["handleSubmitSurvey"]
  retrySurvey: SurveyOperations["handleRetrySurvey"]
  discardSurvey: SurveyOperations["handleDiscardSurvey"]
  /**
   * Phase 29, D-05: stores the shared or private choice of a draft in the queue, silently and without
   * a sync (the finish sends it). Resolves "frozen" for a submitted survey (D-07), rejects when the
   * local write fails.
   */
  setDraftVisibility: SurveyOperations["handleSetDraftVisibility"]
  confirmDeleteSurvey: SurveyOperations["confirmDeleteSurvey"]
  /** Drops the empty draft the new-survey wizard opened, when it is left before the site is named. */
  discardEmptyDraft: SurveyOperations["handleDiscardEmptyDraft"]
  queueAttachmentFromLibrary: SurveyOperations["handleQueueAttachmentFromLibrary"]
  queueAttachmentFromCamera: SurveyOperations["handleQueueAttachmentFromCamera"]
  deleteAttachment: SurveyOperations["handleDeleteAttachment"]
  loadCanonicalDetails: (surveyId: string, options?: { silent?: boolean }) => Promise<void>
  loadSurveyEvents: (surveyId: string, options?: { silent?: boolean }) => Promise<void>
  /** OA-107: `genus` starts the survey with that genus already in factor A. */
  openCreateSurvey: (options?: { genus?: CnpfFactorAGenusCode }) => void
  /** OA-107: false when the genus could not be added (submitted survey, not found). */
  addGenusToSurvey: (surveyId: string, genus: CnpfFactorAGenusCode) => Promise<boolean>
  startEditSurvey: (surveyId: string) => Promise<boolean>
  renameSurvey: (surveyId: string, nextSiteName: string) => Promise<void>
  updateRegionVersion: (surveyId: string, region: RegionVersion) => Promise<void>
  updateVegetationStage: (surveyId: string, stage: VegetationStage) => Promise<void>
  /** v3.2 drafts only (01.8-10). */
  updateIbpCas: (surveyId: string, cas: IbpCas) => Promise<void>
  updateCas3Scale: (surveyId: string, value: boolean) => Promise<void>
  /** Unsubmitted v3.0 or untagged drafts only (D-08). */
  switchToV32: (surveyId: string) => Promise<void>
  /**
   * Phase 27, D-03: the survey note of a draft. Silent (no status message, written on debounced
   * keystrokes), read-only after submit: false when nothing was written.
   */
  updateSurveyNote: (surveyId: string, text: string) => Promise<boolean>
  /**
   * Phase 27, D-03: the weather of a draft as a function of the stored one (hand edit, refill, late
   * lookup answer). Silent, read-only after submit: false when nothing was written.
   */
  updateSurveyWeather: (
    surveyId: string,
    update: (current: SurveyWeather | null) => SurveyWeather | null,
  ) => Promise<boolean>
}

export type SurveysContextValue = {
  state: SurveysState
  actions: SurveyActions
}

export const SurveysContext = createContext<SurveysContextValue | null>(null)

export const SurveysProvider = SurveysContext.Provider

/**
 * Actions-only view of the surveys context (phase 01.9-18). The value is the
 * same stable object as `useSurveys().actions`, so components that only act on
 * surveys (the navigation listeners, the form routes) never re-render when the
 * list, a filter or the selection changes.
 */
export const SurveyActionsContext = createContext<SurveyActions | null>(null)

export const SurveyActionsProvider = SurveyActionsContext.Provider

export function useSurveys(): SurveysContextValue {
  const value = useContext(SurveysContext)
  if (value === null) {
    throw new Error("useSurveys must be used inside AppStateProvider")
  }
  return value
}

export function useSurveyActions(): SurveyActions {
  const value = useContext(SurveyActionsContext)
  if (value === null) {
    throw new Error("useSurveyActions must be used inside AppStateProvider")
  }
  return value
}
