import { useMemo, useState } from "react"
import { Pressable, StyleSheet, TextInput, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandRadius, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { FilterPanel } from "./FilterPanel"
import type { SurveyListFilters } from "./FilterPanel"

const t = fr.surveyList.filters

type FilterBarProps = SurveyListFilters & {
  useNativeSearchUI: boolean
  stickyFilterOffset: number
  summaryLabel: string
  advancedFilterCount: number
  showInlineSearch: boolean
  surveyQuery: string
  setSurveyQuery: (value: string) => void
}

// The sticky filters bar (list header, sticky index 0): summary, advanced
// toggle, inline search and the filter panel.
export function FilterBar({
  useNativeSearchUI,
  stickyFilterOffset,
  summaryLabel,
  advancedFilterCount,
  showInlineSearch,
  surveyQuery,
  setSurveyQuery,
  ...filters
}: FilterBarProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const hasQuery = surveyQuery.trim().length > 0

  return (
    <View
      style={[
        styles.filtersStickyHost,
        useNativeSearchUI
          ? styles.filtersStickyHostNativeSearch
          : { paddingTop: stickyFilterOffset },
      ]}
    >
      <AppCard variant="panelElevated" padding={14} style={styles.filtersCard}>
        <View style={styles.filtersHeaderRow}>
          <View style={styles.filtersHeadingBlock}>
            <View style={styles.filtersCompactTitleRow}>
              <Ionicons name="funnel-outline" size={14} color={theme.colors.forest} />
              <Text style={styles.filtersCompactTitle}>{t.title}</Text>
            </View>
            <Text numberOfLines={1} style={styles.filtersCompactMeta}>
              {summaryLabel}
            </Text>
          </View>

          <Pressable
            accessibilityLabel={advancedOpen ? t.toggle.hide : t.toggle.show}
            accessibilityRole="button"
            accessibilityState={{ expanded: advancedOpen }}
            style={styles.advancedToggle}
            onPress={() => setAdvancedOpen((current) => !current)}
          >
            <Ionicons
              name={advancedOpen ? "close" : "funnel-outline"}
              size={16}
              color={theme.colors.forest}
            />
            <Text style={styles.advancedToggleText}>
              {advancedOpen
                ? t.toggle.close
                : advancedFilterCount > 0
                  ? t.toggle.active(advancedFilterCount)
                  : t.toggle.more}
            </Text>
          </Pressable>
        </View>

        {/* Inline search */}
        {showInlineSearch ? (
          <View style={styles.searchRow}>
            <View style={styles.searchField}>
              <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
              <TextInput
                value={surveyQuery}
                onChangeText={setSurveyQuery}
                placeholder={t.search.placeholder}
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
                style={styles.searchInput}
              />
              {hasQuery ? (
                <Pressable
                  accessibilityLabel={t.search.clear}
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setSurveyQuery("")}
                  style={styles.searchClearButton}
                >
                  <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <FilterPanel advancedOpen={advancedOpen} {...filters} />
      </AppCard>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    filtersStickyHost: {
      backgroundColor: theme.colors.canvas,
      zIndex: 1,
      paddingBottom: 10,
    },
    filtersStickyHostNativeSearch: {
      paddingTop: 4,
    },
    filtersCard: {
      gap: 10,
    },
    filtersHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    filtersHeadingBlock: {
      flex: 1,
      gap: 4,
    },
    filtersCompactTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    filtersCompactTitle: {
      ...brandTypography.meta,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.3,
      color: theme.colors.forest,
      textTransform: "uppercase",
    },
    filtersCompactMeta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    advancedToggle: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panelMuted,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    advancedToggleText: {
      ...brandTypography.meta,
      color: theme.colors.forest,
    },
    searchRow: {
      paddingBottom: 2,
    },
    searchField: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: brandRadius.field,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.inputFill,
      paddingHorizontal: 14,
    },
    searchInput: {
      flex: 1,
      minHeight: 44,
      paddingVertical: 0,
      color: theme.colors.textPrimary,
      ...brandTypography.input,
      fontSize: 15,
      lineHeight: 18,
    },
    searchClearButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
  })
}
