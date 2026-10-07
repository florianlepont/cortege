import { useCallback, useMemo, useState } from "react"
import { FlatList, ListRenderItemInfo, Platform, RefreshControl, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandSpacing } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import { ListEntranceRow } from "../ui/ListEntranceRow"
import { useListEntrance } from "../ui/useListEntrance"
import { ListEmptyState } from "./survey-list/ListEmptyState"
import { ListSummaryCard } from "./survey-list/ListSummaryCard"
import { ListTitleBar, SectionTitle } from "./survey-list/list-chrome"
import {
  buildListItems,
  isSectionHeader,
  keyExtractor,
  type SurveyListItem,
} from "./survey-list/list-items"
import { SurveyRow } from "./survey-list/SurveyRow"
import { createListStyles } from "./survey-list/styles"
import type { SurveyListScreenProps } from "./survey-list/types"

// D-03: rows mounted on the first render and per batch.
const INITIAL_ROWS = 10

/**
 * Mes Relevés (OA-56): the forest summary card with the figures (D-22), then the surveys in "À terminer" and "Terminés". Searching and
 * filtering moved to the search page (OA-52, OA-54), so the list always shows every survey.
 */
export function SurveyListScreen({
  surveys,
  selectedSurveyId,
  surveyDetails,
  showTitleBar,
  onRefresh,
  onDeleteSurvey,
  onOpenCreateSurvey,
  onOpenSearch,
  onOpenSurvey,
}: SurveyListScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createListStyles(theme), [theme])
  const canAnimateRow = useListEntrance()
  const [refreshing, setRefreshing] = useState(false)
  const insets = useSafeAreaInsets()
  // The iOS header of this screen is opaque (SurveysStack), so the list already starts below it:
  // adding its height again left a ~100pt gap (OA-99). Without a native header (Android, JS tabs)
  // the screen draws its own title bar under the status bar.
  const tabBarHeight = useAppBottomTabBarHeight(Platform.select({ ios: 84, default: 68 }) ?? 68)

  const { items, toFinishCount } = useMemo(() => buildListItems(surveys), [surveys])

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

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<SurveyListItem>) =>
      isSectionHeader(item) ? (
        <SectionTitle section={item.key} count={item.count} />
      ) : (
        // Rows 0 to 7 that mount with the screen slide up when it becomes visible (D-08); a row the
        // list remounts on scroll gets no entrance.
        <ListEntranceRow index={index} canAnimate={canAnimateRow}>
          <SurveyRow
            survey={item}
            score={surveyDetails[item.id]?.scores?.ibp_total ?? null}
            selected={selectedSurveyId === item.id}
            index={index}
            onOpen={onOpenSurvey}
            onDelete={onDeleteSurvey}
          />
        </ListEntranceRow>
      ),
    [canAnimateRow, onDeleteSurvey, onOpenSurvey, selectedSurveyId, surveyDetails],
  )

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        {showTitleBar ? (
          <ListTitleBar onOpenSearch={onOpenSearch} onOpenCreateSurvey={onOpenCreateSurvey} />
        ) : null}
        {surveys.length > 0 ? (
          <ListSummaryCard total={surveys.length} toFinish={toFinishCount} />
        ) : null}
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
