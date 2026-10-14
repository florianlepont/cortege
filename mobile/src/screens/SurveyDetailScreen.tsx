import { useEffect, useMemo, useRef, useState } from "react"
import { Alert, ScrollView, View } from "react-native"
import { useReducedMotion } from "react-native-reanimated"
import { shouldShowDevTools } from "../app/dev-tools"
import { routeShortLabel } from "../app/route-display"
import { useBrandTheme } from "../app/theme"
import { weatherVisitTooOld } from "../app/weather"
import { useSurveyRoute } from "../hooks/useSurveyRoute"
import { fr } from "../i18n"
import { useLatestCallback } from "../state/useLatestCallback"
import { AppActionSheet } from "../ui/AppActionSheet"
import { AppGroupedList } from "../ui/AppGroupedList"
import { AppNotice } from "../ui/AppNotice"
import { EntranceView } from "../ui/EntranceView"
import { useFrameInsetBehavior, useFrameLargeTitle } from "../ui/frame-large-title"
import { selectPreviewCandidates } from "./survey-screen-helpers"
import { SurveyNoteCard } from "./survey-detail/conditions/SurveyNoteCard"
import { useSurveyConditions } from "./survey-detail/conditions/useSurveyConditions"
import { WeatherCard } from "./survey-detail/conditions/WeatherCard"
import { DebugTab } from "./survey-detail/DebugTab"
import { DetailActions } from "./survey-detail/DetailActions"
import { FinishBar } from "./survey-detail/FinishBar"
import { ParcelMapCard } from "./survey-detail/ParcelMapCard"
import { PhotosStrip } from "./survey-detail/PhotosStrip"
import { ScoreCard } from "./survey-detail/ScoreCard"
import { type SurveyDetailScreenProps } from "./survey-detail/screen-props"
import { createSummaryScreenStyles } from "./survey-detail/summary-screen.styles"
import { buildSummaryRowSections } from "./survey-detail/summary-rows"
import { resolveFinishCta, resolveStatusLine } from "./survey-detail/summary-state"
import { SummaryHeader } from "./survey-detail/SummaryHeader"
import { resolveVisibilityLine } from "./survey-detail/visibility-line"
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
import { useScrollIntoViewOnKeyboard } from "../ui/useScrollIntoViewOnKeyboard"

const menuText = fr.surveyDetail.menu
const summaryText = fr.surveyDetail.summary
const headerText = fr.surveyDetail.header
const alertsText = fr.surveyDetail.alerts

/**
 * D-46: every section of the summary slides up with the same entrance, one after the other in
 * reading order (40 ms apart, `brandMotion.staggerMax` slots). A fixed slot per section, so a
 * section that is not drawn (no photos, no sync problem) only leaves a short pause.
 */
const ENTRANCE = {
  header: 0,
  submittedNotice: 1,
  score: 2,
  weather: 3,
  photos: 4,
  map: 5,
  rows: 6,
  actions: 7,
  note: 8,
} as const

/**
 * The summary of a survey (OA-46): its name and where it stands, the score, the compact weather
 * card (D-17, D-41), the photos, the map, four rows that open the sub-pages (Contexte, Parcelles,
 * the factors, the parcel's history; D-32), the survey actions and, last, the survey note (D-33,
 * D-38). The survey's own change log is in the "…" menu, never a row, D-02. The one action is
 * the button at the bottom. The coloured chart of the ten factors is not here (D-24): it lives on
 * the score page only.
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
  onOpenFinish,
  onRetrySurvey,
  onDiscardSurvey,
  onRenameSurvey,
  onOpenContext,
  onOpenConditions,
  conditionsLoading,
  conditionsOffline,
  onChangeNote,
  onOpenParcelsPage,
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
  const conditions = useSurveyConditions(selectedSurvey)
  const { route, loaded: routeLoaded } = useSurveyRoute(selectedSurvey)
  const [menuVisible, setMenuVisible] = useState(false)
  const pulseTrigger = useSubmitSuccessPulse(selectedSurvey.status)
  // D-26: a finish from the factor pager plays the halo and pop once the summary is seen again.
  const shownPulse = useVisiblePulse(pulseTrigger, navigation)
  // D-25: at the finish the page goes back to the top, so the score card's halo and pop are seen
  // (without animation under Reduce Motion, where only the haptic plays).
  const scrollRef = useRef<ScrollView>(null)
  const { onScrollBeginDrag, scrollToTop } = useScrollTop(scrollRef)
  // D-46: the note is the last card; once the keyboard is up the page scrolls it above the keyboard.
  const noteKeyboard = useScrollIntoViewOnKeyboard(scrollRef)
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
  const changeNote = useLatestCallback((text: string) => void onChangeNote(selectedSurvey.id, text))
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
  // The bottom button floats over the page on a transparent bar (D-27c), so at maximum scroll the
  // last row must end above the bar (its measured height, tab bar clearance included). Without the
  // bar (a finished survey) the page runs under the floating tab bar: the last row needs that room.
  const { barHeight, onBarLayout } = useFinishBarHeight(cta.kind !== "hidden")
  const contentStyle = useSubPageContentStyle(styles.content, barHeight, noteKeyboard.keyboardInset)
  // Phase 30 (U-O9, moved on 2026-10-14): the "Parcelles et parcours" row carries the short route
  // label after the parcel count, or says the parcours is still to choose on a draft without one.
  const routeLabel = route !== null ? routeShortLabel(route) : null
  const routePending = routeLoaded && route === null && canEditSurvey
  const rowSections = buildSummaryRowSections({ ...data, routeLabel, routePending }, historyRow, {
    onOpenContext,
    onOpenParcelsPage,
    onOpenScore,
    onOpenHistory,
  })

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
        // The note is a text field: taps reach buttons while the keyboard is up, dragging the page
        // closes it, and iOS lifts the content above it (D-33). That lift does not reach the last
        // card in a Release build, so `useScrollIntoViewOnKeyboard` scrolls it above the keyboard
        // by hand and gives the content its room (D-46).
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        onScrollBeginDrag={onScrollBeginDrag}
        onScroll={noteKeyboard.onScroll}
      >
        <EntranceView index={ENTRANCE.header}>
          <SummaryHeader
            surveyId={selectedSurvey.id}
            siteName={activeSiteName}
            canEdit={canEditSurvey}
            statusLine={statusLine}
            visibilityLine={resolveVisibilityLine(selectedSurvey)}
            onRenameSurvey={onRenameSurvey}
          />
        </EntranceView>

        {!canEditSurvey ? (
          <EntranceView index={ENTRANCE.submittedNotice}>
            <AppNotice
              tone="success"
              icon="checkmark-done-circle-outline"
              title={summaryText.submittedTitle}
              message={summaryText.submittedMessage}
            />
          </EntranceView>
        ) : null}

        {exporting ? <AppNotice tone="info" message={fr.surveyExport.progress} /> : null}

        <EntranceView index={ENTRANCE.score}>
          <ScoreCard
            scores={data.displayedScores}
            isDraftView={data.useLocalDraftView}
            filledFactorCount={data.filledFactorCount}
            pulseTrigger={shownPulse}
          />
        </EntranceView>

        <WeatherCard
          weather={conditions.weather}
          loading={conditionsLoading}
          offline={conditionsOffline}
          visitTooOld={weatherVisitTooOld(
            conditions.weather,
            selectedSurvey.created_at,
            Date.now(),
          )}
          submitted={selectedSurvey.status === "submitted"}
          onOpen={onOpenConditions}
          entranceIndex={ENTRANCE.weather}
        />

        <PhotosStrip
          survey={selectedSurvey}
          attachments={selectedSurveyAttachments}
          canEdit={canEditSurvey}
          onTakePhoto={onTakePhoto}
          onPickPhoto={onPickPhoto}
          onDeleteAttachment={onDeleteAttachment}
          entranceIndex={ENTRANCE.photos}
        />

        <EntranceView index={ENTRANCE.map}>
          <ParcelMapCard
            apiUrl={apiUrl}
            accessToken={accessToken}
            siteName={activeSiteName}
            displayLocation={detail?.display_location}
            parcelIds={data.parcelIds}
            surveyId={selectedSurvey.id}
            refreshKey={selectedSurvey.updated_at}
            onPress={onOpenParcelsPage}
          />
        </EntranceView>

        <EntranceView index={ENTRANCE.rows}>
          <AppGroupedList sections={rowSections} />
        </EntranceView>

        <DetailActions
          survey={selectedSurvey}
          onRetrySurvey={onRetrySurvey}
          onDiscardSurvey={onDiscardSurvey}
          entranceIndex={ENTRANCE.actions}
        />

        {/* D-38: the survey note is the last card of the page, after the rows and the actions. */}
        <SurveyNoteCard
          editable={canEditSurvey}
          loaded={conditions.loaded}
          stored={conditions.note}
          onChangeNote={changeNote}
          entranceIndex={ENTRANCE.note}
          cardRef={noteKeyboard.targetRef}
          onFieldFocus={noteKeyboard.onFieldFocus}
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
      </TitledScrollView>

      <FinishBar
        cta={cta}
        accessibilityLabel={fr.surveyDetail.a11y.finishSurvey(activeSiteName)}
        onFinish={() => onOpenFinish(selectedSurvey.id)}
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
