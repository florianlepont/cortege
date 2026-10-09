import { IbpCas } from "@cortege/ibp-domain"
import {
  FactorKey,
  RegionVersion,
  SurveyDetailResponse,
  SurveyEventItem,
  VegetationStage,
} from "../../app/types"
import { LocalAttachment, LocalSurvey } from "../../storage"
import type { HeaderNavigation } from "./useSurveyDetailHeader"
import type { PulseNavigation } from "./useVisiblePulse"

/** What the summary and its sub-pages all read about the selected survey. */
type SurveyDetailBaseProps = {
  apiUrl: string
  accessToken: string | null
  selectedSurvey: LocalSurvey
  surveyDetails: Record<string, SurveyDetailResponse>
  detailsLoadingSurveyId: string | null
}

export type SurveyDetailScreenProps = SurveyDetailBaseProps & {
  navigation: HeaderNavigation & PulseNavigation
  selectedSurveyAttachments: LocalAttachment[]
  surveyEvents: Record<string, SurveyEventItem[]>
  onTakePhoto: (surveyId: string) => Promise<void> | void
  onPickPhoto: (surveyId: string) => Promise<void> | void
  onDeleteAttachment: (surveyId: string, localAttachmentId: string) => Promise<void> | void
  onDeleteSurvey: (surveyId: string) => void
  onSubmitSurvey: (surveyId: string) => Promise<void>
  onRetrySurvey: (surveyId: string) => Promise<void>
  onDiscardSurvey: (surveyId: string) => Promise<void>
  onRenameSurvey: (surveyId: string, nextSiteName: string) => Promise<void> | void
  onOpenContext: () => void
  /** Opens the parcel editor straight from the map card (OA-96). */
  onOpenParcels: (surveyId: string) => Promise<void> | void
  onOpenScore: () => void
  /** Opens a factor of the survey to fill it ("Commencer / Continuer la notation"). */
  onOpenFactor: (surveyId: string, factor: FactorKey) => void | Promise<void>
  onOpenHistory: () => void
  onEnsureAttachmentPreviews?: (attachments: LocalAttachment[]) => Promise<void> | void
  onSimulateMissingAttachmentFile?: (localAttachmentId: string) => Promise<void> | void
}

/** "Contexte et parcelles": the map, the parcels, the method and the station context. */
export type SurveyContextScreenProps = SurveyDetailBaseProps & {
  onOpenParcels: (surveyId: string) => Promise<void> | void
  onUpdateRegionVersion: (surveyId: string, region: RegionVersion) => Promise<void> | void
  onUpdateVegetationStage: (surveyId: string, stage: VegetationStage) => Promise<void> | void
  onUpdateIbpCas: (surveyId: string, ibpCas: IbpCas) => Promise<void> | void
  onUpdateCas3Scale: (surveyId: string, value: boolean) => Promise<void> | void
  onSwitchToV32: (surveyId: string) => Promise<void> | void
}

/** "Score IBP": the total, the two sub-scores and the ten factors. */
export type SurveyScoreScreenProps = SurveyDetailBaseProps & {
  onOpenFactor: (surveyId: string, factor: FactorKey) => Promise<void> | void
}

/** "Historique": the steps of this survey and the earlier surveys of its parcel. */
export type SurveyHistoryScreenProps = SurveyDetailBaseProps & {
  surveyEvents: Record<string, SurveyEventItem[]>
  eventsLoadingSurveyId: string | null
  onLoadSurveyEvents: (surveyId: string) => Promise<void>
}

/** "Journal du relevé": the change log of this survey (own surveys only). */
export type SurveyJournalScreenProps = {
  selectedSurvey: LocalSurvey
  surveyEvents: Record<string, SurveyEventItem[]>
  eventsLoadingSurveyId: string | null
  onLoadSurveyEvents: (surveyId: string) => Promise<void>
}
