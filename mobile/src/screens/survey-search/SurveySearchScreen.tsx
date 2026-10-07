import { useCallback, useEffect, useMemo, useRef } from "react"
import {
  FlatList,
  ListRenderItemInfo,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { CommunitySurveyItem } from "@cortege/ibp-domain"
import { useBrandTheme } from "../../app/theme"
import type {
  SurveyAttachmentFilter,
  SurveyDetailResponse,
  SurveySort,
  SurveyStatusFilter,
} from "../../app/types"
import { useAppBottomTabBarHeight } from "../../app/useAppBottomTabBarHeight"
import type { CommunitySearchState } from "../../hooks/useCommunitySurveys"
import { fr } from "../../i18n"
import type { LocalAttachment, LocalSurvey } from "../../storage"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { AppText as Text } from "../../ui/AppText"
import { feedback } from "../../ui/feedback"
import { useEntrance } from "../../ui/useEntrance"
import { SurveyRow, type SurveyRowPreview } from "../survey-list/SurveyRow"
import {
  isPhotoAttachment,
  resolveAttachmentPreview,
  selectPreviewCandidates,
} from "../survey-screen-helpers"
import { CommunityRow } from "./CommunityRow"
import { createSearchStyles } from "./search.styles"

const t = fr.surveyList.search

export type SearchScope = "mine" | "community"

const SORT_CYCLE: readonly SurveySort[] = ["updated_desc", "updated_asc", "site_asc"]

export type SurveySearchScreenProps = {
  query: string
  onQueryChange: (value: string) => void
  scope: SearchScope
  onScopeChange: (scope: SearchScope) => void
  statusFilter: SurveyStatusFilter
  onStatusFilterChange: (value: SurveyStatusFilter) => void
  attachmentFilter: SurveyAttachmentFilter
  onAttachmentFilterChange: (value: SurveyAttachmentFilter) => void
  sortMode: SurveySort
  onSortModeChange: (value: SurveySort) => void
  /** The user's surveys after the query and the filters. */
  surveys: LocalSurvey[]
  attachmentsBySurvey: Record<string, LocalAttachment[]>
  surveyDetails: Record<string, SurveyDetailResponse>
  selectedSurveyId: string | null
  community: CommunitySearchState
  onOpenSurvey: (surveyId: string) => void
  /** Opens the read-only page of a finished survey of another member (OA-59). */
  onOpenCommunitySurvey: (surveyId: string) => void
  onDeleteSurvey: (surveyId: string) => void
  onCancel: () => void
  onEnsureAttachmentPreviews?: (attachments: LocalAttachment[]) => Promise<void> | void
}

type SearchItem =
  | { kind: "mine"; survey: LocalSurvey }
  | { kind: "community"; item: CommunitySurveyItem }

const keyOf = (item: SearchItem): string =>
  item.kind === "mine" ? `mine:${item.survey.id}` : `community:${item.item.survey_id}`

/**
 * The search page (OA-52, OA-54): one text field, two scopes ("Mes relevés" and "Communauté") and,
 * for the user's own surveys, a few compact filters. The community scope searches the finished
 * surveys of every member by site or author.
 */
export function SurveySearchScreen({
  query,
  onQueryChange,
  scope,
  onScopeChange,
  statusFilter,
  onStatusFilterChange,
  attachmentFilter,
  onAttachmentFilterChange,
  sortMode,
  onSortModeChange,
  surveys,
  attachmentsBySurvey,
  surveyDetails,
  selectedSurveyId,
  community,
  onOpenSurvey,
  onOpenCommunitySurvey,
  onDeleteSurvey,
  onCancel,
  onEnsureAttachmentPreviews,
}: SurveySearchScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSearchStyles(theme), [theme])
  const entrance = useEntrance()
  const insets = useSafeAreaInsets()
  const tabBarHeight = useAppBottomTabBarHeight(Platform.select({ ios: 84, default: 68 }) ?? 68)
  const inputRef = useRef<TextInput>(null)
  const trimmedQuery = query.trim()

  useEffect(() => {
    const candidates = surveys
      .map((survey) => (attachmentsBySurvey[survey.id] ?? []).find(isPhotoAttachment))
      .filter((attachment): attachment is LocalAttachment => Boolean(attachment))
    void onEnsureAttachmentPreviews?.(selectPreviewCandidates(candidates))
  }, [attachmentsBySurvey, onEnsureAttachmentPreviews, surveys])

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

  const data = useMemo<SearchItem[]>(
    () =>
      scope === "mine"
        ? surveys.map((survey) => ({ kind: "mine", survey }))
        : community.items.map((item) => ({ kind: "community", item })),
    [community.items, scope, surveys],
  )

  const toggleStatus = (value: "draft" | "submitted") =>
    onStatusFilterChange(statusFilter === value ? "all" : value)
  const toggleWithPhoto = () =>
    onAttachmentFilterChange(attachmentFilter === "with" ? "all" : "with")
  const cycleSort = () =>
    onSortModeChange(SORT_CYCLE[(SORT_CYCLE.indexOf(sortMode) + 1) % SORT_CYCLE.length])

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<SearchItem>) => (
      // First mount only, rows 0 to 7 (D-08): typing in the field does not replay the entrance.
      <Animated.View entering={entrance(index)}>
        {item.kind === "mine" ? (
          <SurveyRow
            survey={item.survey}
            preview={previewById[item.survey.id] ?? null}
            score={surveyDetails[item.survey.id]?.scores?.ibp_total ?? null}
            selected={selectedSurveyId === item.survey.id}
            index={index}
            onOpen={onOpenSurvey}
            onDelete={onDeleteSurvey}
          />
        ) : (
          <CommunityRow item={item.item} onOpen={onOpenCommunitySurvey} />
        )}
      </Animated.View>
    ),
    [
      entrance,
      onDeleteSurvey,
      onOpenCommunitySurvey,
      onOpenSurvey,
      previewById,
      selectedSurveyId,
      surveyDetails,
    ],
  )

  const caption =
    scope === "mine"
      ? t.results({ count: surveys.length, query: trimmedQuery })
      : community.status === "loading" && community.items.length === 0
        ? t.communityLoading
        : community.status === "error"
          ? t.communityError
          : t.results({ count: community.items.length, query: trimmedQuery })

  const showNone =
    scope === "mine"
      ? surveys.length === 0
      : community.status === "ready" && community.items.length === 0

  const sortLabel = t.sort[sortMode]

  return (
    <View style={styles.container}>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View style={styles.fieldRow}>
          <View style={styles.field}>
            <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={onQueryChange}
              placeholder={t.placeholder}
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.input}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              accessibilityLabel={t.placeholder}
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.clear}
                onPress={() => onQueryChange("")}
                style={styles.clearButton}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t.cancel} onPress={onCancel}>
            <Text style={styles.cancel}>{t.cancel}</Text>
          </Pressable>
        </View>

        {/* Glass segment group, like the Settings appearance picker: the active scope is the
            inverted neutral chip (direction principle 7). */}
        <View
          style={[
            styles.segments,
            { backgroundColor: theme.visual.chip.fill, borderColor: theme.visual.chip.border },
          ]}
          accessibilityRole="tablist"
        >
          {(["mine", "community"] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: scope === value }}
              onPress={() => {
                feedback.selection()
                onScopeChange(value)
              }}
              style={[styles.segment, scope === value ? styles.segmentActive : null]}
            >
              <Text
                style={[styles.segmentLabel, scope === value ? styles.segmentLabelActive : null]}
              >
                {t.segments[value]}
              </Text>
            </Pressable>
          ))}
        </View>

        {scope === "mine" ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <AppChoiceChip
              label={t.chips.drafts}
              active={statusFilter === "draft"}
              onPress={() => toggleStatus("draft")}
            />
            <AppChoiceChip
              label={t.chips.finished}
              active={statusFilter === "submitted"}
              onPress={() => toggleStatus("submitted")}
            />
            <AppChoiceChip
              label={t.chips.withPhoto}
              active={attachmentFilter === "with"}
              onPress={toggleWithPhoto}
            />
            <AppChoiceChip
              label={sortLabel}
              accessibilityLabel={t.sortA11y(sortLabel)}
              onPress={cycleSort}
            />
          </ScrollView>
        ) : null}
      </View>

      <FlatList
        data={data}
        keyExtractor={keyOf}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={<Text style={styles.caption}>{caption}</Text>}
        ListFooterComponent={
          <>
            {showNone ? (
              <Text style={styles.hint}>{scope === "mine" ? t.none : t.communityNone}</Text>
            ) : null}
            <Text style={styles.hint}>{t.communityHint}</Text>
          </>
        }
      />
    </View>
  )
}
