import { useMemo } from "react"
import { FlatList, ListRenderItemInfo, StyleSheet, View } from "react-native"
import type {
  CommunitySurveyItem,
  SearchCommunityResponse,
  SearchMemberItem,
  SearchParcelItem,
  SearchPlaceItem,
} from "@cortege/ibp-domain"
import { brandSpacing4, brandTypeScale } from "../../app/brand-tokens"
import type { SearchGroupKey } from "../../app/global-search"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import type {
  SurveyAttachmentFilter,
  SurveyDetailResponse,
  SurveySort,
  SurveyStatusFilter,
} from "../../app/types"
import { useTabBarClearance } from "../../app/useAppBottomTabBarHeight"
import type { SearchGroupError, SearchGroupStatus } from "../../hooks/useSearchGroup"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { AppButton } from "../../ui/AppButton"
import { AppText as Text } from "../../ui/AppText"
import { useFrameInsetBehavior, useFrameLargeTitle } from "../../ui/frame-large-title"
import { ListEntranceRow } from "../../ui/ListEntranceRow"
import { PageTitle } from "../../ui/PageTitle"
import { SkeletonRow } from "../../ui/Skeleton"
import { useListEntrance } from "../../ui/useListEntrance"
import { CommunityRow } from "../community-survey/CommunityRow"
import { resolveRowScore } from "../survey-list/row-score"
import { SurveyRow } from "../survey-list/SurveyRow"
import { OwnSurveyChips } from "./OwnSurveyChips"
import { SearchResultRow } from "./SearchResultRow"
import { memberLabels, parcelLabels, placeLabels } from "./result-labels"

const t = fr.search

/** Placeholder rows shown while the group loads for the first time (D-10). */
const SKELETON_ROWS = 3

/** The member's own surveys of a "Mes relevés" list, after the query and the chips. */
export type MineListProps = {
  surveys: readonly LocalSurvey[]
  /** Surveys whose name matches the query before the chips filter: 0 tells "no result" from "filtered out". */
  matchCount: number
  surveyDetails: Readonly<Record<string, SurveyDetailResponse | undefined>>
  selectedSurveyId: string | null
  statusFilter: SurveyStatusFilter
  attachmentFilter: SurveyAttachmentFilter
  sortMode: SurveySort
  onStatusFilterChange: (value: SurveyStatusFilter) => void
  onAttachmentFilterChange: (value: SurveyAttachmentFilter) => void
  onSortModeChange: (value: SurveySort) => void
  onDeleteSurvey: (surveyId: string) => void
}

export type SearchGroupListScreenProps = {
  group: SearchGroupKey
  /** The text the list was opened for. */
  query: string
  /** Set for the community list of one member (D-04): only that member's surveys are drawn. */
  memberName?: string
  /** The number of results, for the title; null until the group has answered (the title is then the group name). */
  count: number | null
  status: SearchGroupStatus
  error?: SearchGroupError | null
  onRetry?: () => void
  mine?: MineListProps
  community?: SearchCommunityResponse | null
  places?: readonly SearchPlaceItem[]
  parcels?: readonly SearchParcelItem[]
  onOpenOwn: (surveyId: string) => void
  onOpenCommunity: (surveyId: string) => void
  onOpenMember: (name: string) => void
  onOpenPlace: (item: SearchPlaceItem) => void
  onOpenParcel: (item: SearchParcelItem) => void
}

type ListItem =
  | { kind: "mine"; survey: LocalSurvey }
  | { kind: "member"; item: SearchMemberItem }
  | { kind: "community"; item: CommunitySurveyItem }
  | { kind: "place"; item: SearchPlaceItem }
  | { kind: "parcel"; item: SearchParcelItem }

function keyOf(row: ListItem): string {
  switch (row.kind) {
    case "mine":
      return `mine:${row.survey.id}`
    case "member":
      return `member:${row.item.author_name}`
    case "community":
      return `community:${row.item.survey_id}`
    case "place":
      return `place:${row.item.id}`
    case "parcel":
      return `parcel:${row.item.parcel_id}`
  }
}

function buildItems(
  group: SearchGroupKey,
  memberName: string | undefined,
  mine: readonly LocalSurvey[] | undefined,
  community: SearchCommunityResponse | null | undefined,
  places: readonly SearchPlaceItem[] | undefined,
  parcels: readonly SearchParcelItem[] | undefined,
): ListItem[] {
  switch (group) {
    case "mine":
      return (mine ?? []).map((survey) => ({ kind: "mine", survey }))
    case "community": {
      // A member's list is that member's surveys only: no member row (D-04).
      const members = memberName ? [] : (community?.members ?? [])
      return [
        ...members.map((item): ListItem => ({ kind: "member", item })),
        ...(community?.surveys ?? []).map((item): ListItem => ({ kind: "community", item })),
      ]
    }
    case "places":
      return (places ?? []).map((item) => ({ kind: "place", item }))
    case "parcels":
      return (parcels ?? []).map((item) => ({ kind: "parcel", item }))
  }
}

/**
 * The full list of one search group (25-12, D-02 "Voir les N", D-04, UI-SPEC section 4): the page
 * title and its caption, the chips of "Mes relevés" (U-12), then the rows in the regular density
 * (survey glass cards, member, place and parcel glass rows), or, in place of the rows, the group's
 * own loading, offline, error or empty state (D-10). The first rows slide in once when the page
 * mounts. Presentational: the route owns the data, the haptics and the navigation.
 */
export function SearchGroupListScreen({
  group,
  query,
  memberName,
  count,
  status,
  error,
  onRetry,
  mine,
  community,
  places,
  parcels,
  onOpenOwn,
  onOpenCommunity,
  onOpenMember,
  onOpenPlace,
  onOpenParcel,
}: SearchGroupListScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const canAnimateRow = useListEntrance()
  const insetBehavior = useFrameInsetBehavior()
  const largeTitle = useFrameLargeTitle()
  const clearance = useTabBarClearance()

  const items = useMemo(
    () => buildItems(group, memberName, mine?.surveys, community, places, parcels),
    [group, memberName, mine?.surveys, community, places, parcels],
  )

  // Rows 0 to 7 that mount with the page slide up once; scrolling never replays the entrance.
  const renderItem = ({ item: row, index }: ListRenderItemInfo<ListItem>) => (
    <ListEntranceRow index={index} canAnimate={canAnimateRow}>
      {renderRow(row, index)}
    </ListEntranceRow>
  )

  function renderRow(row: ListItem, index: number) {
    switch (row.kind) {
      case "mine":
        return (
          <SurveyRow
            survey={row.survey}
            score={resolveRowScore(row.survey, mine?.surveyDetails ?? {})}
            selected={mine?.selectedSurveyId === row.survey.id}
            index={index}
            onOpen={onOpenOwn}
            onDelete={mine?.onDeleteSurvey ?? noop}
          />
        )
      case "community":
        return <CommunityRow item={row.item} onOpen={onOpenCommunity} />
      case "member": {
        const labels = memberLabels(row.item)
        return (
          <SearchResultRow
            kind="member"
            density="regular"
            {...labels}
            onPress={() => onOpenMember(row.item.author_name)}
          />
        )
      }
      case "place": {
        const labels = placeLabels(row.item)
        return (
          <SearchResultRow
            kind="place"
            density="regular"
            {...labels}
            onPress={() => onOpenPlace(row.item)}
          />
        )
      }
      case "parcel": {
        const labels = parcelLabels(row.item)
        return (
          <SearchResultRow
            kind="parcel"
            density="regular"
            {...labels}
            onPress={() => onOpenParcel(row.item)}
          />
        )
      }
    }
  }

  const groupName = t.groups[group]
  const title = count === null ? groupName : t.list.title({ group: groupName, count })
  const caption = memberName ? t.list.memberCaption(memberName) : t.list.caption(query)

  const header = (
    <View style={styles.header}>
      <PageTitle>{title}</PageTitle>
      <Text style={styles.caption}>{caption}</Text>
      {mine ? (
        <OwnSurveyChips
          statusFilter={mine.statusFilter}
          onStatusFilterChange={mine.onStatusFilterChange}
          attachmentFilter={mine.attachmentFilter}
          onAttachmentFilterChange={mine.onAttachmentFilterChange}
          sortMode={mine.sortMode}
          onSortModeChange={mine.onSortModeChange}
        />
      ) : null}
    </View>
  )

  const state = renderState()

  function renderState() {
    if (status === "offline" && group !== "mine") {
      return (
        <Text style={styles.centered} accessibilityLiveRegion="polite" testID="search-list-offline">
          {t.offline[group]}
        </Text>
      )
    }
    if (status === "error" && group !== "mine") {
      return (
        <View style={styles.errorBlock} testID="search-list-error">
          <Text style={styles.centered} accessibilityLiveRegion="polite">
            {error === "rateLimited" ? t.error.rateLimited : t.error[group]}
          </Text>
          <AppButton
            label={t.error.retry}
            variant="secondary"
            accessibilityLabel={t.error.retryA11y(groupName)}
            onPress={onRetry ?? noop}
            testID="search-list-retry"
          />
        </View>
      )
    }
    if (status === "loading" || status === "waiting") {
      return (
        <View
          style={styles.skeletons}
          accessible
          accessibilityLabel={t.field.busy}
          testID="search-list-loading"
        >
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <SkeletonRow key={index} />
          ))}
        </View>
      )
    }
    // Every match filtered out by the chips: say so, rather than "no result" for a name that exists.
    const filteredOut = group === "mine" && (mine?.matchCount ?? 0) > 0
    return (
      <Text style={styles.centered} accessibilityLiveRegion="polite" testID="search-list-empty">
        {filteredOut ? fr.surveyList.search.none : t.noResult.title(memberName ?? query)}
      </Text>
    )
  }

  return (
    <FlatList
      data={items}
      keyExtractor={keyOf}
      renderItem={renderItem}
      style={styles.list}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: (largeTitle ? 0 : clearance) + brandSpacing4.lg },
      ]}
      contentInsetAdjustmentBehavior={insetBehavior}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListEmptyComponent={state}
      testID="search-group-list"
    />
  )
}

function noop() {}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    list: {
      flex: 1,
    },
    content: {
      paddingHorizontal: brandSpacing4.md,
      gap: brandSpacing4.smd,
    },
    header: {
      gap: brandSpacing4.smd,
    },
    caption: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
    },
    centered: {
      ...brandTypeScale.footnote,
      textAlign: "center",
      color: theme.colors.textSecondary,
      paddingTop: brandSpacing4.lg,
    },
    errorBlock: {
      alignItems: "center",
      gap: brandSpacing4.smd,
    },
    skeletons: {
      gap: brandSpacing4.md,
      paddingTop: brandSpacing4.smd,
    },
  })
}
