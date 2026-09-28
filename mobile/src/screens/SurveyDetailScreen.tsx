import { IbpCas } from "@cortege/ibp-domain"
import { useEffect, useMemo, useRef, useState } from "react"
import { Alert, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native"
import { shouldShowDevTools } from "../app/dev-tools"
import { exportAndShareSurveyPdf, type SurveyExportData } from "../app/survey-pdf-export"
import {
  defaultVegetationStageForRegion,
  normalizeVegetationStageForRegion,
} from "../app/constants"
import {
  formatRemainingTime,
  isLessThan24HoursRemaining,
  resolveSubmissionDeadline,
} from "../app/formatters"
import {
  FactorKey,
  RegionVersion,
  SurveyDetailResponse,
  SurveyDetailTab,
  SurveyEventItem,
  VegetationStage,
} from "../app/types"
import { fr, logStatusDetail } from "../i18n"
import { LocalAttachment, LocalSurvey } from "../storage"
import { AppActionSheet } from "../ui/AppActionSheet"
import { selectPreviewCandidates } from "./survey-screen-helpers"
import { DebugTab } from "./survey-detail/DebugTab"
import { DetailActions } from "./survey-detail/DetailActions"
import { DetailHeader, type DetailHeaderHandle } from "./survey-detail/DetailHeader"
import { DetailTabBar } from "./survey-detail/DetailTabBar"
import { EventsTab } from "./survey-detail/EventsTab"
import { FactorsSection } from "./survey-detail/FactorsSection"
import { HistorySection } from "./survey-detail/HistorySection"
import { resolveHeroMetric, resolveHeroSubmitState } from "./survey-detail/hero-state"
import { MediaSection } from "./survey-detail/MediaSection"
import { resolveScoringContext, ScoringContextEditor } from "./survey-detail/ScoringContextEditor"
import { styles } from "./survey-detail/styles"
import { SummaryTab } from "./survey-detail/SummaryTab"
import {
  DisplayedFactorResult,
  DisplayedScores,
  useLocalDraftSummary,
} from "./survey-detail/useLocalDraftSummary"

type SurveyDetailScreenProps = {
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

export function SurveyDetailScreen({
  apiUrl,
  accessToken,
  selectedSurvey,
  selectedSurveyAttachments,
  surveyDetailTab,
  setSurveyDetailTab,
  surveyDetails,
  detailsLoadingSurveyId,
  surveyEvents,
  eventsLoadingSurveyId,
  onLoadSurveyEvents,
  onTakePhoto,
  onPickPhoto,
  onDeleteAttachment,
  onDeleteSurvey,
  onSubmitSurvey,
  onRetrySurvey,
  onDiscardSurvey,
  onOpenFactor,
  onRenameSurvey,
  onUpdateRegionVersion,
  onUpdateVegetationStage,
  onUpdateIbpCas,
  onUpdateCas3Scale,
  onSwitchToV32,
  onOpenParcels,
  onEnsureAttachmentPreviews,
  onSimulateMissingAttachmentFile,
}: SurveyDetailScreenProps) {
  const isHeroCompressedRef = useRef(false)
  const [isHeroCompressed, setIsHeroCompressed] = useState(false)
  const detail = surveyDetails[selectedSurvey.id]
  // The Debug tab only exists in dev builds (D-06): a stale "debug" selection shows the summary.
  const activeTab: SurveyDetailTab =
    surveyDetailTab === "debug" && !shouldShowDevTools() ? "summary" : surveyDetailTab
  // Local survey state is the live source after user actions (submit / visibility toggle).
  const detailStatus = selectedSurvey.status
  const detailCreatedAt = detail?.created_at ?? selectedSurvey.created_at
  const submissionDeadline = resolveSubmissionDeadline(detailCreatedAt, detail?.expires_at ?? null)
  const remainingTime = formatRemainingTime(submissionDeadline)
  const isDraftNearDeadline =
    detailStatus === "draft" && isLessThan24HoursRemaining(submissionDeadline)
  const surveyEventList = surveyEvents[selectedSurvey.id] ?? []
  const canonicalFactorEntries = useMemo(
    () =>
      detail
        ? Object.entries(detail.factor_results).sort(([left], [right]) => left.localeCompare(right))
        : [],
    [detail],
  )
  const localDraft = useLocalDraftSummary(selectedSurvey)
  const historyParcelId = detail?.parcel_ids?.[0] ?? detail?.parcel_id ?? null

  const attachmentPreviewKey = selectedSurveyAttachments
    .map((attachment) => `${attachment.id}:${attachment.file_state}`)
    .join(",")

  useEffect(() => {
    void onEnsureAttachmentPreviews?.(selectPreviewCandidates(selectedSurveyAttachments))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentPreviewKey, onEnsureAttachmentPreviews])

  const useLocalDraftView = selectedSurvey.status !== "submitted" && localDraft.scores !== null
  const displayedScores: DisplayedScores | null = useMemo(() => {
    if (useLocalDraftView && localDraft.scores) {
      return localDraft.scores
    }
    if (detail?.scores) {
      return detail.scores
    }
    return localDraft.scores
  }, [useLocalDraftView, localDraft.scores, detail?.scores])
  const displayedFactorEntries = useMemo<Array<[string, DisplayedFactorResult]>>(() => {
    if (useLocalDraftView && localDraft.factorEntries.length > 0) {
      return localDraft.factorEntries
    }
    if (canonicalFactorEntries.length > 0) {
      return canonicalFactorEntries as Array<[string, DisplayedFactorResult]>
    }
    return localDraft.factorEntries
  }, [useLocalDraftView, localDraft.factorEntries, canonicalFactorEntries])
  const showFactorLoadingHint =
    detailsLoadingSurveyId === selectedSurvey.id &&
    !displayedScores &&
    displayedFactorEntries.length === 0
  const canSubmitNow =
    selectedSurvey.sync_state === "synced" &&
    selectedSurvey.status !== "submitted" &&
    selectedSurvey.sync_blocked !== 1 &&
    localDraft.submitReady === true
  const completedFactorCountForSubmit =
    localDraft.missingFactorCount === null ? null : 10 - localDraft.missingFactorCount
  const canEditSurvey = selectedSurvey.status !== "submitted"
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

  const exportData: SurveyExportData = useMemo(() => {
    const detailParcelIds = detail?.parcel_ids?.length
      ? detail.parcel_ids
      : detail?.parcel_id
        ? [detail.parcel_id]
        : null
    return {
      siteName: activeSiteName,
      parcelIds: detailParcelIds ?? localDraftMeta?.parcel_ids ?? [],
      observationYear: detail?.observation_year ?? localDraftMeta?.observation_year ?? null,
      versionNumber: detail?.version_number ?? localDraftMeta?.version_number ?? null,
      methodVersion: detail?.ibp_method_version ?? localDraftMeta?.ibp_method_version ?? null,
      dateIso: detail?.submitted_at ?? detailCreatedAt,
      scores: displayedScores,
      factorEntries: displayedFactorEntries,
    }
  }, [
    activeSiteName,
    detail?.parcel_ids,
    detail?.parcel_id,
    detail?.observation_year,
    detail?.version_number,
    detail?.ibp_method_version,
    detail?.submitted_at,
    detailCreatedAt,
    localDraftMeta,
    displayedScores,
    displayedFactorEntries,
  ])

  // DET-03/04: the header's "…" menu (Renommer/Partager/Supprimer). Renommer is delegated to
  // DetailHeader's own rename form via a ref, since that form's state already lives there.
  const detailHeaderRef = useRef<DetailHeaderHandle>(null)
  const [menuVisible, setMenuVisible] = useState(false)
  const menuText = fr.surveyDetail.menu
  const actionsText = fr.surveyDetail.actions

  const handleSharePdf = async (): Promise<void> => {
    try {
      const { shared } = await exportAndShareSurveyPdf(exportData)
      if (!shared) {
        Alert.alert(menuText.share, actionsText.exportShareUnavailable)
      }
    } catch (error) {
      logStatusDetail("surveyDetail.exportPdf", error)
      Alert.alert(menuText.share, actionsText.exportFailed)
    }
  }

  const menuOptions = [
    { label: menuText.rename, onPress: () => detailHeaderRef.current?.startRename() },
    { label: menuText.share, onPress: () => void handleSharePdf() },
    {
      label: menuText.delete,
      destructive: true,
      onPress: () => onDeleteSurvey(selectedSurvey.id),
    },
  ]

  useEffect(() => {
    isHeroCompressedRef.current = false
    setIsHeroCompressed(false)
  }, [selectedSurvey.id])

  const handleOpenParcels = (): void => {
    if (!canEditSurvey) {
      return
    }
    void onOpenParcels(selectedSurvey.id)
  }

  const handleDetailScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const nextCompressed = event.nativeEvent.contentOffset.y > 56
    if (isHeroCompressedRef.current === nextCompressed) {
      return
    }
    isHeroCompressedRef.current = nextCompressed
    setIsHeroCompressed(nextCompressed)
  }

  return (
    <ScrollView
      style={styles.mainScroll}
      contentContainerStyle={styles.detailScreenContent}
      onScroll={handleDetailScroll}
      scrollEventThrottle={16}
      stickyHeaderIndices={[0]}
    >
      <DetailHeader
        ref={detailHeaderRef}
        survey={selectedSurvey}
        activeSiteName={activeSiteName}
        canEditSurvey={canEditSurvey}
        isHeroCompressed={isHeroCompressed}
        metric={resolveHeroMetric(
          displayedScores,
          useLocalDraftView,
          completedFactorCountForSubmit,
        )}
        submitState={resolveHeroSubmitState(selectedSurvey, canSubmitNow, localDraft.submitReady)}
        remainingTime={remainingTime}
        attachmentCount={selectedSurveyAttachments.length}
        onRenameSurvey={onRenameSurvey}
        onSubmitSurvey={onSubmitSurvey}
        onOpenMenu={() => setMenuVisible(true)}
      />

      <MediaSection
        apiUrl={apiUrl}
        accessToken={accessToken}
        survey={selectedSurvey}
        siteName={activeSiteName}
        attachments={selectedSurveyAttachments}
        displayLocation={detail?.display_location}
        canEditSurvey={canEditSurvey}
        hidden={activeTab === "debug"}
        onOpenParcels={handleOpenParcels}
        onTakePhoto={onTakePhoto}
        onPickPhoto={onPickPhoto}
        onDeleteAttachment={onDeleteAttachment}
      />

      <DetailTabBar activeTab={activeTab} onSelectTab={setSurveyDetailTab} />

      {activeTab === "summary" ? (
        <SummaryTab
          survey={selectedSurvey}
          remainingTime={remainingTime}
          submissionDeadline={submissionDeadline}
          isDraftNearDeadline={isDraftNearDeadline}
          contextCard={
            <ScoringContextEditor
              surveyId={selectedSurvey.id}
              canEditSurvey={canEditSurvey}
              scoringContext={scoringContext}
              activeRegion={activeRegion}
              activeVegetationStage={activeVegetationStage}
              onOpenParcels={handleOpenParcels}
              onUpdateRegionVersion={onUpdateRegionVersion}
              onUpdateVegetationStage={onUpdateVegetationStage}
              onUpdateIbpCas={onUpdateIbpCas}
              onUpdateCas3Scale={onUpdateCas3Scale}
              onSwitchToV32={onSwitchToV32}
            />
          }
        >
          <FactorsSection
            scores={displayedScores}
            factorEntries={displayedFactorEntries}
            useLocalDraftView={useLocalDraftView}
            showLoadingHint={showFactorLoadingHint}
            canEditSurvey={canEditSurvey}
            onOpenFactor={(factor) => void onOpenFactor(selectedSurvey.id, factor)}
          />
          <HistorySection
            apiUrl={apiUrl}
            accessToken={accessToken}
            parcelId={historyParcelId}
            currentSurveyId={selectedSurvey.id}
            currentScores={detail?.scores ?? null}
            currentFactorResults={detail?.factor_results ?? null}
          />
          <DetailActions
            survey={selectedSurvey}
            onRetrySurvey={onRetrySurvey}
            onDiscardSurvey={onDiscardSurvey}
          />
        </SummaryTab>
      ) : null}

      {activeTab === "events" ? (
        <EventsTab
          events={surveyEventList}
          isLoading={eventsLoadingSurveyId === selectedSurvey.id}
          onReload={() => void onLoadSurveyEvents(selectedSurvey.id)}
        />
      ) : null}

      {activeTab === "debug" ? (
        <DebugTab
          survey={selectedSurvey}
          attachments={selectedSurveyAttachments}
          events={surveyEventList}
          createdAt={detailCreatedAt}
          submittedAt={detail?.submitted_at ?? null}
          publishableOnPublicMap={
            detailStatus === "submitted" && selectedSurvey.visibility === "public"
          }
          onSimulateMissingAttachmentFile={onSimulateMissingAttachmentFile}
        />
      ) : null}

      <AppActionSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title={activeSiteName}
        options={menuOptions}
        cancelLabel={menuText.cancel}
      />
    </ScrollView>
  )
}
