import { useCallback, useEffect, useMemo, useState } from "react"
import { FlatList, ListRenderItemInfo, Platform, RefreshControl, View } from "react-native"
import Animated from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandSpacing } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import { useEntrance } from "../ui/useEntrance"
import type { LocalAttachment } from "../storage"
import {
  isPhotoAttachment,
  resolveAttachmentPreview,
  selectPreviewCandidates,
} from "./survey-screen-helpers"
import { ListEmptyState } from "./survey-list/ListEmptyState"
import { IntroStats, ListTitleBar, SectionTitle } from "./survey-list/list-chrome"
import {
  buildListItems,
  isSectionHeader,
  keyExtractor,
  type SurveyListItem,
} from "./survey-list/list-items"
import { SurveyRow } from "./survey-list/SurveyRow"
import type { SurveyRowPreview } from "./survey-list/SurveyRow"
import { createListStyles } from "./survey-list/styles"
import type { SurveyListScreenProps } from "./survey-list/types"

// D-03: rows mounted on the first render and per batch.
const INITIAL_ROWS = 10

/**
 * Mes Relevés (OA-56): the figures, then the surveys in "À terminer" and "Terminés". Searching and
 * filtering moved to the search page (OA-52, OA-54), so the list always shows every survey.
 */
export function SurveyListScreen({
  surveys,
  selectedSurveyId,
  attachmentsBySurvey,
  surveyDetails,
  showTitleBar,
  onRefresh,
  onDeleteSurvey,
  onOpenCreateSurvey,
  onOpenSearch,
  onOpenSurvey,
  onEnsureAttachmentPreviews,
}: SurveyListScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createListStyles(theme), [theme])
  const entrance = useEntrance()
  const [refreshing, setRefreshing] = useState(false)
  const insets = useSafeAreaInsets()
  // The iOS header of this screen is opaque (SurveysStack), so the list already starts below it:
  // adding its height again left a ~100pt gap (OA-99). Without a native header (Android, JS tabs)
  // the screen draws its own title bar under the status bar.
  const tabBarHeight = useAppBottomTabBarHeight(Platform.select({ ios: 84, default: 68 }) ?? 68)

  const { items, toFinishCount } = useMemo(() => buildListItems(surveys), [surveys])

  // D-11: ask for the first photo of every survey so a pulled ("remote") attachment downloads on
  // demand instead of staying hidden in the list.
  const firstPhotoKey = surveys
    .map((survey) => {
      const firstPhoto = (attachmentsBySurvey[survey.id] ?? []).find(isPhotoAttachment)
      return firstPhoto ? `${firstPhoto.id}:${firstPhoto.file_state}` : null
    })
    .filter((key): key is string => key !== null)
    .join(",")

  useEffect(() => {
    const candidates = surveys
      .map((survey) => (attachmentsBySurvey[survey.id] ?? []).find(isPhotoAttachment))
      .filter((attachment): attachment is LocalAttachment => Boolean(attachment))
    void onEnsureAttachmentPreviews?.(selectPreviewCandidates(candidates))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstPhotoKey, onEnsureAttachmentPreviews])

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }, [onRefresh])

  const refreshControl = useMemo(
    () =>
      onRefresh ? (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void handleRefresh()}
          tintColor={theme.colors.forest}
        />
      ) : undefined,
    [handleRefresh, onRefresh, refreshing, theme],
  )

  // One preview value per survey, derived once per attachments change (D-03).
  const previewById = useMemo(() => {
    const byId: Record<string, SurveyRowPreview> = {}
    for (const [surveyId, attachments] of Object.entries(attachmentsBySurvey)) {
      const firstPhoto = attachments.find(isPhotoAttachment)
      if (firstPhoto) {
        byId[surveyId] = { ...resolveAttachmentPreview(firstPhoto), attachmentId: firstPhoto.id }
      }
    }
    return byId
  }, [attachmentsBySurvey])

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<SurveyListItem>) =>
      isSectionHeader(item) ? (
        <SectionTitle section={item.key} count={item.count} />
      ) : (
        // First mount only, rows 0 to 7 (D-08): a row the list remounts on scroll gets no entrance.
        <Animated.View entering={entrance(index)}>
          <SurveyRow
            survey={item}
            preview={previewById[item.id] ?? null}
            score={surveyDetails[item.id]?.scores?.ibp_total ?? null}
            selected={selectedSurveyId === item.id}
            index={index}
            onOpen={onOpenSurvey}
            onDelete={onDeleteSurvey}
          />
        </Animated.View>
      ),
    [entrance, onDeleteSurvey, onOpenSurvey, previewById, selectedSurveyId, surveyDetails],
  )

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        {showTitleBar ? (
          <ListTitleBar onOpenSearch={onOpenSearch} onOpenCreateSurvey={onOpenCreateSurvey} />
        ) : null}
        {surveys.length > 0 ? <IntroStats total={surveys.length} toFinish={toFinishCount} /> : null}
      </View>
    ),
    [onOpenCreateSurvey, onOpenSearch, showTitleBar, styles, surveys.length, toFinishCount],
  )

  const listFooter = useMemo(
    () => (surveys.length === 0 ? <ListEmptyState /> : null),
    [surveys.length],
  )

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        initialNumToRender={INITIAL_ROWS + 1}
        maxToRenderPerBatch={INITIAL_ROWS}
        windowSize={7}
        removeClippedSubviews
        style={styles.pageScroll}
        contentContainerStyle={[
          styles.pageContent,
          {
            paddingTop: showTitleBar ? insets.top + brandSpacing.xs : brandSpacing.xs,
            paddingBottom: tabBarHeight + brandSpacing.xl + 22,
          },
        ]}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
        contentInsetAdjustmentBehavior="never"
        refreshControl={refreshControl}
      />
    </View>
  )
}
