import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  brandInteraction,
  brandRadius,
  brandSpacing4,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import type { SectionKey } from "./list-items"

const t = fr.surveyList

export function SectionTitle({ section, count }: { section: SectionKey; count: number }) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const title = t.sections[section]
  return (
    <Text
      accessibilityRole="header"
      accessibilityLabel={t.a11y.sectionHeader({ title, count })}
      style={styles.sectionTitle}
    >
      {title}
      <Text style={styles.sectionCount}>{t.sections.count(count)}</Text>
    </Text>
  )
}

type TitleBarProps = {
  onOpenSearch: () => void
  onOpenCreateSurvey: () => void
}

/**
 * Android and the JS tabs: the title with the search and "+" buttons on one row. On iOS the
 * native header carries the title and the "+", and the search is its own tab (OA-52).
 */
export function ListTitleBar({ onOpenSearch, onOpenCreateSurvey }: TitleBarProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <View style={styles.titleBar}>
      <Text accessibilityRole="header" style={styles.title}>
        {t.hero.title}
      </Text>
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={t.a11y.openSearch}
        onPress={onOpenSearch}
        style={styles.roundButton}
      >
        <Ionicons name="search-outline" size={20} color={theme.colors.forest} />
      </AppPressable>
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={t.a11y.createSurvey}
        onPress={onOpenCreateSurvey}
        style={styles.roundButton}
      >
        <Ionicons name="add-outline" size={24} color={theme.colors.forest} />
      </AppPressable>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // 12 of list gap plus 12 of padding above, the list gap minus 4 below: 24 above and 8 below.
    sectionTitle: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textPrimary,
      paddingTop: brandSpacing4.smd,
      marginBottom: -brandSpacing4.xs,
    },
    sectionCount: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textSecondary,
    },
    titleBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      paddingTop: brandSpacing4.xs,
    },
    title: {
      ...brandTypography.screenTitle,
      flex: 1,
      color: theme.colors.textPrimary,
    },
    roundButton: {
      width: brandInteraction.hitTarget.min,
      height: brandInteraction.hitTarget.min,
      borderRadius: brandRadius.pill,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.visual.chip.border,
      backgroundColor: theme.visual.chip.fill,
    },
  })
}
