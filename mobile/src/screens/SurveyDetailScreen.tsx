import { useEffect, useMemo, useRef, useState } from "react"
import { Alert, ScrollView, View } from "react-native"
import { useReducedMotion } from "react-native-reanimated"
import { IBP_METHOD_V3_2, resolveMethodVersion } from "@cortege/ibp-domain"
import { shouldShowDevTools } from "../app/dev-tools"
import { runPdfSpike } from "../app/survey-pdf/spike"
import { useBrandTheme } from "../app/theme"
import { fr, logStatusDetail } from "../i18n"
import { useLatestCallback } from "../state/useLatestCallback"
import { AppActionSheet } from "../ui/AppActionSheet"
import { AppGroupedList } from "../ui/AppGroupedList"
import { AppNotice } from "../ui/AppNotice"
import { useFrameInsetBehavior, useFrameLargeTitle } from "../ui/frame-large-title"
import { resolveDisplayCoordinates, selectPreviewCandidates } from "./survey-screen-helpers"
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
import { useSubmitSuccessPulse } from "./survey-detail/useSubmitSuccessPulse"
import { useSurveyPdfExport } from "./survey-detail/useSurveyPdfExport"
import { useVisiblePulse } from "./survey-detail/useVisiblePulse"
import { useHistoryRow } from "./survey-detail/useHistoryRow"
import { useSurveyDetailHeader } from "./survey-detail/useSurveyDetailHeader"
import { useFinishBarHeight } from "./survey-detail/useFinishBarHeight"
import { useSubPageContentStyle } from "./survey-detail/useSubPageContent"
import { useScrollTop } from "./survey-detail/useScrollTop"
import { TitledScrollView } from "../ui/TitledScrollView"

const menuText = fr.surveyDetail.menu
const rowsText = fr.surveyDetail.rows
const summaryText = fr.surveyDetail.summary
const headerText = fr.surveyDetail.header
const alertsText = fr.surveyDetail.alerts

/**
 * The summary of a survey (OA-46): its name and where it stands, the score, the photos, the map,
 * and three rows that open the sub-pages (context and parcels, score by factor, the parcel's
 * history; the survey's own change log is in the "…" menu, never a row, D-02). The one action is
 * the button at the bottom. The coloured chart of the ten factors is not here (D-24): it
 * lives on the score page only.
 */
export function SurveyDetailScreen({
  apiUrl,
  accessToken,
  observerName,
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
  onOpenParcels,
  onOpenScore,
  onOpenFactor,
  onOpenHistory,
  onOpenJournal,
  onEnsureAttachmentPreviews,
  onSimulateMissingAttachmentFile,
}: SurveyDetailScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const data = useSurveyDetailData(selectedSurvey, surveyDetails, detailsLoadingSurveyId)
  const { detail, canEditSurvey, activeSiteName } = data
  const [menuVisible, setMenuVisible] = useState(false)
  const pulseTrigger = useSubmitSuccessPulse(selectedSurvey.status)
  // D-26: a finish from the factor pager plays the halo and pop once the summary is seen again.
  const shownPulse = useVisiblePulse(pulseTrigger, navigation)
  // D-25: at the finish the page goes back to the top, so the score card's halo and pop are seen
  // (without animation under Reduce Motion, where only the haptic plays).
  const scrollRef = useRef<ScrollView>(null)
  const { onScrollBeginDrag, scrollToTop } = useScrollTop(scrollRef)
  const reduceMotion = useReducedMotion()
  const scrolledPulse = useRef(pulseTrigger)
  useEffect(() => {
    if (scrolledPulse.current === pulseTrigger) return
    scrolledPulse.current = pulseTrigger
    scrollToTop(!reduceMotion)
  }, [pulseTrigger, reduceMotion, scrollToTop])
  // 12.2-17: under the native iOS large title the header carries the survey's name.
  const largeTitle = useFrameLargeTitle()
  const insetBehavior = useFrameInsetBehavior()

  const attachmentPreviewKey = selectedSurveyAttachments
    .map((attachment) => `${attachment.id}:${attachment.file_state}`)
    .join(",")
  useEffect(() => {
    void onEnsureAttachmentPreviews?.(selectPreviewCandidates(selectedSurveyAttachments))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentPreviewKey, onEnsureAttachmentPreviews])

  const { exporting, share } = useSurveyPdfExport({
    surveyId: selectedSurvey.id,
    detail,
    canEditSurvey,
    activeSiteName,
    parcelIds: data.parcelIds,
    localDraftMeta: data.localDraftMeta,
    scoringContext: data.scoringContext,
    displayedScores: data.displayedScores,
    displayedFactorEntries: data.displayedFactorEntries,
    createdAt: data.createdAt,
    observerName: observerName ?? null,
    apiUrl,
    accessToken,
  })
  // Phase 25.1 device spike (dev builds only, rendered inside the shouldShowDevTools() branch).
  const handleRunPdfSpike = useLatestCallback((layoutScale: number): void => {
    void runPdfSpike({
      surveyId: selectedSurvey.id,
      parcelIds: data.parcelIds,
      displayLocation: resolveDisplayCoordinates(detail?.display_location),
      layoutScale,
    }).catch((error) => logStatusDetail("surveyDetail.pdfSpike", error))
  })
  const handleDelete = useLatestCallback(() => onDeleteSurvey(selectedSurvey.id))
  const handleOpenMenu = useLatestCallback(() => setMenuVisible(true))
  // 12.2-17: the native large title is not a button, so the name is edited from the "…" menu in
  // the system's text prompt (iOS only, like the large title).
  const handleRename = useLatestCallback(() => {
    Alert.prompt(
      headerText.renameLabel,
      undefined,
      [
        { text: fr.common.actions.cancel, style: "cancel" },
        {
          text: fr.common.actions.save,
          onPress: (value?: string) => {
            const nextName = (value ?? "").trim()
            if (!nextName) {
              Alert.alert(alertsText.invalidNameTitle, alertsText.invalidNameMessage)
              return
            }
            void onRenameSurvey(selectedSurvey.id, nextName)
          },
        },
      ],
      "plain-text",
      activeSiteName,
    )
  })
  useSurveyDetailHeader({
    navigation,
    siteName: activeSiteName,
    largeTitle,
    onRename: largeTitle && canEditSurvey ? handleRename : undefined,
    onShare: () => void share(),
    onDelete: handleDelete,
    onOpenJournal,
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
  const historyRow = useHistoryRow({
    apiUrl,
    accessToken,
    parcelId: data.parcelIds[0] ?? null,
    currentSurveyId: selectedSurvey.id,
    refreshKey: selectedSurvey.status,
  })
  const resolvedMethod = resolveMethodVersion(data.scoringContext.ibp_method_version)
  // The bottom button floats over the page on a transparent bar (D-27c), so at maximum scroll the
  // last row must end above the bar (its measured height, tab bar clearance included). Without the
  // bar (a finished survey) the page runs under the floating tab bar: the last row needs that room.
  const { barHeight, onBarLayout } = useFinishBarHeight(cta.kind !== "hidden")
  const contentStyle = useSubPageContentStyle(styles.content, barHeight)
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
          value: historyRow.value,
          multiline: true,
          accessibilityLabel: historyRow.accessibilityLabel,
          onPress: historyRow.pressable ? onOpenHistory : undefined,
        },
      ],
    },
  ]

  return (
    <View style={styles.scroll}>
      <TitledScrollView
        collapsingTitle={activeSiteName}
        ref={scrollRef}
        // The header is transparent: the route's ScreenFrame starts the scroll view below it (D-19),
        // or iOS insets it under the native large title (12.2-17).
        style={styles.scroll}
        contentContainerStyle={contentStyle}
        contentInsetAdjustmentBehavior={insetBehavior}
        onScrollBeginDrag={onScrollBeginDrag}
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

        {exporting ? <AppNotice tone="info" message={fr.surveyExport.progress} /> : null}

        <ScoreCard
          scores={data.displayedScores}
          isDraftView={data.useLocalDraftView}
          filledFactorCount={data.filledFactorCount}
          pulseTrigger={shownPulse}
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
          surveyId={selectedSurvey.id}
          onPress={() => (canEditSurvey ? void onOpenParcels(selectedSurvey.id) : onOpenContext())}
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
            onRunPdfSpike={handleRunPdfSpike}
          />
        ) : null}
      </TitledScrollView>

      <FinishBar
        cta={cta}
        accessibilityLabel={fr.surveyDetail.a11y.finishSurvey(activeSiteName)}
        onFinish={() => void onSubmitSurvey(selectedSurvey.id)}
        onOpenFactor={(factor) => void onOpenFactor(selectedSurvey.id, factor)}
        onLayout={onBarLayout}
      />

      <AppActionSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title={activeSiteName}
        options={[
          { label: menuText.journal, onPress: onOpenJournal },
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
