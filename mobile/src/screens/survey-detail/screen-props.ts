import { IbpCas, type SurveyWeather } from "@cortege/ibp-domain"
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
  /** The signed-in member's display name, printed as the observer in the PDF export (D-04). */
  observerName?: string | null
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
  /** Opens the "Contexte" page (method, cas, weather). */
  onOpenContext: () => void
  /** Opens "Contexte" scrolled to its weather section (the summary card, D-15). */
  onOpenConditions: () => void
  /** A weather lookup is running for the selected survey (the card shows its search line). */
  conditionsLoading: boolean
  /** Phase 27 (D-33): silent draft write of the survey note, from the summary's note card. */
  onChangeNote: (surveyId: string, text: string) => Promise<boolean> | void
  /** Opens the "Parcelles" page (map, list, offline map), from the map card and its row (D-32). */
  onOpenParcelsPage: () => void
  onOpenScore: () => void
  /** Opens a factor of the survey to fill it ("Commencer / Continuer la notation"). */
  onOpenFactor: (surveyId: string, factor: FactorKey) => void | Promise<void>
  onOpenHistory: () => void
  /** Opens "Journal du relevé" from the "…" menu (D-02); stable, the header items capture it. */
  onOpenJournal: () => void
  onEnsureAttachmentPreviews?: (attachments: LocalAttachment[]) => Promise<void> | void
  onSimulateMissingAttachmentFile?: (localAttachmentId: string) => Promise<void> | void
}

/**
 * What the weather request of the survey is doing, read by the context page to pick the one status
 * line of the weather card (`weatherViewState`): the network, the lookup in flight, the last
 * lookup rejected.
 */
export type WeatherRequestState = {
  online: boolean
  inFlight: boolean
  unavailable: boolean
}

/** "Contexte": the method, the station context and the weather (D-32). */
export type SurveyContextScreenProps = Omit<SurveyDetailBaseProps, "apiUrl" | "accessToken"> & {
  /** Opens the page scrolled to the weather section (the summary card, D-15). */
  section?: "conditions"
  weatherRequest: WeatherRequestState
  onUpdateRegionVersion: (surveyId: string, region: RegionVersion) => Promise<void> | void
  onUpdateVegetationStage: (surveyId: string, stage: VegetationStage) => Promise<void> | void
  onUpdateIbpCas: (surveyId: string, ibpCas: IbpCas) => Promise<void> | void
  onUpdateCas3Scale: (surveyId: string, value: boolean) => Promise<void> | void
  onSwitchToV32: (surveyId: string) => Promise<void> | void
  /** Phase 27: silent draft write of the weather section (false when nothing was written). */
  onEditWeather: (
    surveyId: string,
    update: (current: SurveyWeather | null) => SurveyWeather | null,
  ) => Promise<boolean> | void
  /** "Réessayer" of the weather card (the weather prefill action). */
  onRetryWeather: (surveyId: string) => Promise<void> | void
}

/** "Parcelles": the map, the list of parcels and the offline map of the survey (D-32). */
export type SurveyParcelsScreenProps = SurveyDetailBaseProps & {
  /** Opens the parcel editor (the pencil on the map). */
  onOpenParcels: (surveyId: string) => Promise<void> | void
}

/** "Facteurs IBP": the total, the two sub-scores and the ten factors. */
export type SurveyScoreScreenProps = SurveyDetailBaseProps & {
  onOpenFactor: (surveyId: string, factor: FactorKey) => Promise<void> | void
}

/**
 * "Historique de la parcelle": the surveys of this survey's parcel, their trend and the change per
 * factor since the survey just before.
 */
export type SurveyHistoryScreenProps = SurveyDetailBaseProps & {
  /** Opens one other survey of the parcel, read-only. */
  onOpenSurvey: (surveyId: string) => void
}

/** "Journal du relevé": the change log of this survey (own surveys only). */
export type SurveyJournalScreenProps = {
  selectedSurvey: LocalSurvey
  surveyEvents: Record<string, SurveyEventItem[]>
  eventsLoadingSurveyId: string | null
  onLoadSurveyEvents: (surveyId: string) => Promise<void>
}
