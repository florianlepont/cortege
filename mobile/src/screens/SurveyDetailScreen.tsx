import { useEffect, useMemo, useState } from "react"
import { Alert, Platform, ScrollView, View } from "react-native"
import { useHeaderHeight } from "@react-navigation/elements"
import { IBP_METHOD_V3_2, resolveMethodVersion } from "@cortege/ibp-domain"
import { shouldShowDevTools } from "../app/dev-tools"
import { exportAndShareSurveyPdf, type SurveyExportData } from "../app/survey-pdf-export"
import { useBrandTheme } from "../app/theme"
import { fr, logStatusDetail } from "../i18n"
import { useLatestCallback } from "../state/useLatestCallback"
import { AppActionSheet } from "../ui/AppActionSheet"
import { AppGroupedList } from "../ui/AppGroupedList"
import { AppNotice } from "../ui/AppNotice"
import { selectPreviewCandidates } from "./survey-screen-helpers"
import { DebugTab } from "./survey-detail/DebugTab"
import { DetailActions } from "./survey-detail/DetailActions"
import { FinishBar } from "./survey-detail/FinishBar"
import { ParcelMapCard } from "./survey-detail/ParcelMapCard"
import { SurveyOfflineMapRow } from "./survey-detail/SurveyOfflineMapRow"
import { PhotosStrip } from "./survey-detail/PhotosStrip"
import { ScoreCard } from "./survey-detail/ScoreCard"
import { type SurveyDetailScreenProps } from "./survey-detail/screen-props"
import { createSummaryScreenStyles } from "./survey-detail/summary-screen.styles"
import { resolveFinishCta, resolveStatusLine } from "./survey-detail/summary-state"
import { SummaryHeader } from "./survey-detail/SummaryHeader"
import { useSurveyDetailData } from "./survey-detail/useSurveyDetailData"
import { useSurveyDetailHeader } from "./survey-detail/useSurveyDetailHeader"

const menuText = fr.surveyDetail.menu
const actionsText = fr.surveyDetail.actions
const rowsText = fr.surveyDetail.rows
const summaryText = fr.surveyDetail.summary

/**
 * The summary of a survey (OA-46): its name and where it stands, the score, the photos, the map,
 * and three rows that open the sub-pages (context and parcels, score by factor, history). The one
 * action is the button at the bottom.
 */
export function SurveyDetailScreen({
  apiUrl,
  accessToken,
  navigation,
  selectedSurvey,
  selectedSurveyAttachments,
  surveyDetails,
  detailsLoadingSurveyId,
  surveyEvents,
  onTakePhoto,
  onPickPhoto,
  onDeleteAttachment,
  onDeleteSurvey,
  onSubmitSurvey,
  onRetrySurvey,
  onDiscardSurvey,
  onRenameSurvey,
  onOpenContext,
  onOpenScore,
  onOpenFactor,
  onOpenHistory,
  onEnsureAttachmentPreviews,
  onSimulateMissingAttachmentFile,
}: SurveyDetailScreenProps) {
  const theme = useBrandTheme()
  // The iOS header is transparent: the scroll view starts below it (OA-20).
  const headerHeight = useHeaderHeight()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const data = useSurveyDetailData(selectedSurvey, surveyDetails, detailsLoadingSurveyId)
  const { detail, canEditSurvey, activeSiteName } = data
  const [menuVisible, setMenuVisible] = useState(false)

  const attachmentPreviewKey = selectedSurveyAttachments
    .map((attachment) => `${attachment.id}:${attachment.file_state}`)
    .join(",")
  useEffect(() => {
    void onEnsureAttachmentPreviews?.(selectPreviewCandidates(selectedSurveyAttachments))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentPreviewKey, onEnsureAttachmentPreviews])

  const exportData: SurveyExportData = useMemo(
    () => ({
      siteName: activeSiteName,
      parcelIds: data.parcelIds,
      observationYear: detail?.observation_year ?? data.localDraftMeta?.observation_year ?? null,
      versionNumber: detail?.version_number ?? data.localDraftMeta?.version_number ?? null,
      methodVersion: detail?.ibp_method_version ?? data.localDraftMeta?.ibp_method_version ?? null,
      dateIso: detail?.submitted_at ?? data.createdAt,
      scores: data.displayedScores,
      factorEntries: data.displayedFactorEntries,
    }),
    [activeSiteName, data, detail],
  )

  const handleShare = useLatestCallback(async (): Promise<void> => {
    try {
      const { shared } = await exportAndShareSurveyPdf(exportData)
      if (!shared) Alert.alert(menuText.share, actionsText.exportShareUnavailable)
    } catch (error) {
      logStatusDetail("surveyDetail.exportPdf", error)
      Alert.alert(menuText.share, actionsText.exportFailed)
    }
  })
  const handleDelete = useLatestCallback(() => onDeleteSurvey(selectedSurvey.id))
  const handleOpenMenu = useLatestCallback(() => setMenuVisible(true))
  useSurveyDetailHeader({
    navigation,
    siteName: activeSiteName,
    onShare: () => void handleShare(),
    onDelete: handleDelete,
    onOpenMenu: handleOpenMenu,
  })

  const statusLine = resolveStatusLine(selectedSurvey, data.isComplete)
  const cta = resolveFinishCta(
    selectedSurvey,
    data.canFinishNow,
    data.isComplete,
    data.filledFactorCount,
    data.nextFactor,
  )
  const resolvedMethod = resolveMethodVersion(data.scoringContext.ibp_method_version)
  const methodLabel = resolvedMethod === IBP_METHOD_V3_2 ? "v3.2" : "v3.0"
  const rowSections = [
    {
      key: "pages",
      rows: [
        {
          key: "context",
          label: rowsText.context,
          value: rowsText.contextValue({
            method: methodLabel,
            cas: data.scoringContext.ibp_cas !== null ? String(data.scoringContext.ibp_cas) : null,
          }),
          onPress: onOpenContext,
        },
        {
          key: "score",
          label: rowsText.score,
          value:
            data.filledFactorCount !== null
              ? rowsText.scoreValue(data.filledFactorCount)
              : undefined,
          onPress: onOpenScore,
        },
        {
          key: "history",
          label: rowsText.history,
          value: rowsText.historyEmpty,
          onPress: onOpenHistory,
        },
      ],
    },
  ]

  return (
    <View style={styles.scroll}>
      <ScrollView
        style={[styles.scroll, Platform.OS === "ios" ? { marginTop: headerHeight } : null]}
        contentContainerStyle={styles.content}
      >
        <SummaryHeader
          surveyId={selectedSurvey.id}
          siteName={activeSiteName}
          canEdit={canEditSurvey}
          statusLine={statusLine}
          onRenameSurvey={onRenameSurvey}
        />

        {!canEditSurvey ? (
          <AppNotice
            tone="success"
            icon="checkmark-done-circle-outline"
            title={summaryText.submittedTitle}
            message={summaryText.submittedMessage}
          />
        ) : null}

        <ScoreCard
          scores={data.displayedScores}
          isDraftView={data.useLocalDraftView}
          filledFactorCount={data.filledFactorCount}
        />

        <PhotosStrip
          survey={selectedSurvey}
          attachments={selectedSurveyAttachments}
          canEdit={canEditSurvey}
          onTakePhoto={onTakePhoto}
          onPickPhoto={onPickPhoto}
          onDeleteAttachment={onDeleteAttachment}
        />

        <ParcelMapCard
          apiUrl={apiUrl}
          accessToken={accessToken}
          siteName={activeSiteName}
          displayLocation={detail?.display_location}
          parcelIds={data.parcelIds}
          onPress={onOpenContext}
        />

        <SurveyOfflineMapRow
          apiUrl={apiUrl}
          accessToken={accessToken}
          siteName={activeSiteName}
          displayLocation={detail?.display_location}
        />

        <AppGroupedList sections={rowSections} />

        <DetailActions
          survey={selectedSurvey}
          onRetrySurvey={onRetrySurvey}
          onDiscardSurvey={onDiscardSurvey}
        />

        {/* The debug view shows ids, error codes and raw payloads: dev builds only (D-06). */}
        {shouldShowDevTools() ? (
          <DebugTab
            survey={selectedSurvey}
            attachments={selectedSurveyAttachments}
            events={surveyEvents[selectedSurvey.id] ?? []}
            createdAt={data.createdAt}
            submittedAt={detail?.submitted_at ?? null}
            publishableOnPublicMap={
              selectedSurvey.status === "submitted" && selectedSurvey.visibility === "public"
            }
            onSimulateMissingAttachmentFile={onSimulateMissingAttachmentFile}
          />
        ) : null}
      </ScrollView>

      <FinishBar
        cta={cta}
        accessibilityLabel={fr.surveyDetail.a11y.finishSurvey(activeSiteName)}
        onFinish={() => void onSubmitSurvey(selectedSurvey.id)}
        onOpenFactor={(factor) => void onOpenFactor(selectedSurvey.id, factor)}
      />

      <AppActionSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title={activeSiteName}
        options={[
          {
            label: menuText.delete,
            destructive: true,
            onPress: () => onDeleteSurvey(selectedSurvey.id),
          },
        ]}
        cancelLabel={menuText.cancel}
      />
    </View>
  )
}
