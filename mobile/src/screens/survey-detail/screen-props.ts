import { IbpCas } from "@cortege/ibp-domain"
import {
  FactorKey,
  RegionVersion,
  SurveyDetailResponse,
  SurveyDetailTab,
  SurveyEventItem,
  VegetationStage,
} from "../../app/types"
import { LocalAttachment, LocalSurvey } from "../../storage"

export type SurveyDetailScreenProps = {
  apiUrl: string
  accessToken: string | null
  selectedSurvey: LocalSurvey
  selectedSurveyAttachments: LocalAttachment[]
  surveyDetailTab: SurveyDetailTab
  setSurveyDetailTab: (tab: SurveyDetailTab) => void
  surveyDetails: Record<string, SurveyDetailResponse>
  detailsLoadingSurveyId: string | null
  surveyEvents: Record<string, SurveyEventItem[]>
  eventsLoadingSurveyId: string | null
  onLoadSurveyEvents: (surveyId: string) => Promise<void>
  onTakePhoto: (surveyId: string) => Promise<void> | void
  onPickPhoto: (surveyId: string) => Promise<void> | void
  onDeleteAttachment: (surveyId: string, localAttachmentId: string) => Promise<void> | void
  onDeleteSurvey: (surveyId: string) => void
  onSubmitSurvey: (surveyId: string) => Promise<void>
  onRetrySurvey: (surveyId: string) => Promise<void>
  onDiscardSurvey: (surveyId: string) => Promise<void>
  onOpenFactor: (surveyId: string, factor: FactorKey) => Promise<void> | void
  onRenameSurvey: (surveyId: string, nextSiteName: string) => Promise<void> | void
  onUpdateRegionVersion: (surveyId: string, region: RegionVersion) => Promise<void> | void
  onUpdateVegetationStage: (surveyId: string, stage: VegetationStage) => Promise<void> | void
  onUpdateIbpCas: (surveyId: string, ibpCas: IbpCas) => Promise<void> | void
  onUpdateCas3Scale: (surveyId: string, value: boolean) => Promise<void> | void
  onSwitchToV32: (surveyId: string) => Promise<void> | void
  onOpenParcels: (surveyId: string) => Promise<void> | void
  onEnsureAttachmentPreviews?: (attachments: LocalAttachment[]) => Promise<void> | void
  onSimulateMissingAttachmentFile?: (localAttachmentId: string) => Promise<void> | void
}
