import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import type { SectionKey } from "./list-items"

const t = fr.surveyList

/** The two figures under the title (OA-53): how many surveys, and how many are left to finish. */
export function IntroStats({ total, toFinish }: { total: number; toFinish: number }) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <View style={styles.stats}>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{total}</Text>
        <Text style={styles.statLabel}>{t.intro.total(total)}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{toFinish}</Text>
        <Text style={styles.statLabel}>{t.intro.toFinish}</Text>
      </View>
    </View>
  )
}

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
        <Ionicons name="search" size={20} color={theme.colors.forest} />
      </AppPressable>
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={t.a11y.createSurvey}
        onPress={onOpenCreateSurvey}
        style={styles.roundButton}
      >
        <Ionicons name="add" size={24} color={theme.colors.forest} />
      </AppPressable>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    stats: {
      flexDirection: "row",
      gap: 12,
    },
    stat: {
      flex: 1,
      gap: 2,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.semanticColors.surfaceElevated,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    statValue: {
      ...brandTypography.sectionTitle,
      fontSize: 28,
      lineHeight: 32,
      color: theme.colors.forest,
    },
    statLabel: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    sectionTitle: {
      ...brandTypography.sectionTitle,
      fontSize: 20,
      lineHeight: 26,
      color: theme.colors.forest,
      paddingTop: 8,
    },
    sectionCount: {
      ...brandTypography.sectionTitle,
      fontSize: 20,
      lineHeight: 26,
      color: theme.colors.textSecondary,
    },
    titleBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingTop: 4,
    },
    title: {
      ...brandTypography.sectionTitle,
      flex: 1,
      fontSize: 30,
      lineHeight: 36,
      color: theme.colors.forest,
    },
    roundButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.semanticColors.surfaceElevated,
    },
  })
}
