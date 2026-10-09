import { ScrollView, StyleSheet } from "react-native"
import { brandSpacing4 } from "../../app/brand-tokens"
import type { SurveyAttachmentFilter, SurveySort, SurveyStatusFilter } from "../../app/types"
import { fr } from "../../i18n"
import { AppChoiceChip } from "../../ui/AppChoiceChip"

const t = fr.surveyList.search

const SORT_CYCLE: readonly SurveySort[] = ["updated_desc", "updated_asc", "site_asc"]

type OwnSurveyChipsProps = {
  statusFilter: SurveyStatusFilter
  onStatusFilterChange: (value: SurveyStatusFilter) => void
  attachmentFilter: SurveyAttachmentFilter
  onAttachmentFilterChange: (value: SurveyAttachmentFilter) => void
  sortMode: SurveySort
  onSortModeChange: (value: SurveySort) => void
}

/**
 * The filter chips of the "Mes relevés" full list (OA-54, UI-SPEC U-12): Brouillons and Terminés
 * toggle the status, "Avec photo" toggles the attachment filter, and the last chip cycles the sort
 * (Plus récents, Plus anciens, Nom A-Z). They moved here from the old search page; the summary of
 * the search page has none.
 */
export function OwnSurveyChips({
  statusFilter,
  onStatusFilterChange,
  attachmentFilter,
  onAttachmentFilterChange,
  sortMode,
  onSortModeChange,
}: OwnSurveyChipsProps) {
  const toggleStatus = (value: "draft" | "submitted") =>
    onStatusFilterChange(statusFilter === value ? "all" : value)
  const toggleWithPhoto = () =>
    onAttachmentFilterChange(attachmentFilter === "with" ? "all" : "with")
  const cycleSort = () =>
    onSortModeChange(SORT_CYCLE[(SORT_CYCLE.indexOf(sortMode) + 1) % SORT_CYCLE.length])
  const sortLabel = t.sort[sortMode]

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.chips}
      testID="own-survey-chips"
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
  )
}

const styles = StyleSheet.create({
  // The chips scroll edge to edge: the list pads its content, this bleeds through that padding.
  scroll: {
    marginHorizontal: -brandSpacing4.md,
  },
  chips: {
    flexDirection: "row",
    gap: brandSpacing4.sm,
    paddingHorizontal: brandSpacing4.md,
  },
})
