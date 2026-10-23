import { Ionicons } from "@expo/vector-icons"
import type { SurveyRoute } from "@cortege/ibp-domain"
import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import {
  brandDefaultFontFamily,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../../app/brand-tokens"
import { type RouteDisplayRowId, routeDisplayRows } from "../../../app/route-display"
import { type BrandTheme, useBrandTheme } from "../../../app/theme"
import { fr } from "../../../i18n"
import { AppCard } from "../../../ui/AppCard"
import { AppPressable } from "../../../ui/AppPressable"
import { AppSectionHeader } from "../../../ui/AppSectionHeader"
import { AppText as Text } from "../../../ui/AppText"

const t = fr.surveyDetail.route

/** Outline glyphs of the rows (owner check, Phase 30: the card read as a plain list). */
const ROW_ICON: Readonly<Record<RouteDisplayRowId, keyof typeof Ionicons.glyphMap>> = {
  method: "trail-sign-outline",
  counting: "speedometer-outline",
  factors: "layers-outline",
  zone: "scan-outline",
  complement: "eye-outline",
  choice: "sparkles-outline",
  answers: "list-outline",
}

type RouteSectionProps = {
  /** The recorded route (`readSurveyRoute`), or null when absent, older, newer or damaged. */
  route: SurveyRoute | null
  /** False until the route was read: nothing is drawn meanwhile. */
  loaded: boolean
  /** "draft": the survey can still be finished; "readonly": submitted. */
  status: "draft" | "readonly"
  /** True for the observer's own draft only: the link to change or to choose the parcours. */
  editable: boolean
  /** "detail": the Contexte page; "community": another member's survey (O-15). */
  variant: "detail" | "community"
  /** Opens the chooser (edit mode), with or without a recorded route. */
  onEdit?: () => void
}

/**
 * The "Parcours utilisé" card (D-09, spec section 9): the recorded route as text, in the words of
 * the official method. The observer's own draft gets a "Modifier le parcours" link, or, when the
 * draft has no route yet (O-07, O-19), a "Parcours à choisir" card whose link opens the chooser: the
 * parcours must be chosen to finish the survey. A survey submitted before the phase has no route:
 * one discreet line and a sentence say so, nothing is invented (P-3). Another member's survey shows
 * the rows read-only, without the rows that address the reader as the observer, and nothing when
 * it has no route (O-15). No map and no trace (Phase 31).
 */
export function RouteSection({
  route,
  loaded,
  status,
  editable,
  variant,
  onEdit,
}: RouteSectionProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  if (!loaded) return null

  if (route === null) {
    if (variant === "community") return null
    if (editable && status === "draft") {
      return (
        <View testID="route-section">
          <AppCard variant="glass" padding={brandSpacing4.md} style={styles.card}>
            <AppSectionHeader title={t.none} titleAccessibilityRole="header" />
            <Text style={styles.value}>{t.noneBody}</Text>
            {onEdit ? (
              <AppPressable
                testID="route-choose-link"
                accessibilityRole="button"
                accessibilityLabel={t.chooseA11y}
                onPress={onEdit}
                style={styles.link}
              >
                <Text style={styles.linkText}>{t.choose}</Text>
              </AppPressable>
            ) : null}
          </AppCard>
        </View>
      )
    }
    if (status === "readonly") {
      return (
        <View testID="route-section" style={styles.legacy}>
          <Text style={styles.legacyRow} testID="route-legacy">
            {t.legacyRow}
          </Text>
          <Text style={styles.legacyBody}>{t.legacyBody}</Text>
        </View>
      )
    }
    return null
  }

  const rows = routeDisplayRows(route, variant)
  const method = rows.find((row) => row.id === "method")
  const pills = rows.filter((row) => row.id === "counting" || row.id === "zone")
  const others = rows.filter(
    (row) => row.id !== "method" && row.id !== "counting" && row.id !== "zone",
  )
  return (
    <View testID="route-section">
      <AppCard variant="glass" padding={brandSpacing4.md} style={styles.card}>
        <AppSectionHeader title={t.title} titleAccessibilityRole="header" />
        {method === undefined ? null : (
          <View style={styles.hero} testID={`route-row-${method.id}`}>
            <View style={styles.badge}>
              <Ionicons
                name={ROW_ICON.method}
                size={26}
                color={theme.semanticColors.accent}
                accessible={false}
              />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.caption}>{method.caption}</Text>
              <Text style={styles.heroName}>{method.value}</Text>
            </View>
          </View>
        )}
        <View style={styles.pills}>
          {pills.map((row) => (
            <View key={row.id} style={styles.pill} testID={`route-row-${row.id}`}>
              <Ionicons
                name={ROW_ICON[row.id]}
                size={18}
                color={theme.semanticColors.accent}
                accessible={false}
              />
              <View style={styles.pillCopy}>
                <Text style={styles.pillCaption}>{row.caption}</Text>
                <Text style={styles.pillValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>
        {others.map((row) => (
          <View key={row.id} style={styles.row} testID={`route-row-${row.id}`}>
            <Ionicons
              name={ROW_ICON[row.id]}
              size={18}
              color={theme.colors.textSecondary}
              accessible={false}
              style={styles.rowIcon}
            />
            <View style={styles.rowCopy}>
              <Text style={styles.caption}>{row.caption}</Text>
              <Text style={styles.value}>{row.value}</Text>
            </View>
          </View>
        ))}
        {editable && status === "draft" && onEdit ? (
          <AppPressable
            testID="route-edit"
            accessibilityRole="button"
            accessibilityLabel={t.editA11y}
            onPress={onEdit}
            style={styles.link}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={theme.visual.accentText}
              accessible={false}
            />
            <Text style={styles.linkText}>{t.edit}</Text>
          </AppPressable>
        ) : null}
      </AppCard>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    card: {
      gap: brandSpacing4.smd,
    },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.md,
    },
    badge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.semanticColors.surfaceSoft,
    },
    heroCopy: {
      flex: 1,
      gap: brandSpacing4.xxs,
    },
    heroName: {
      ...brandTypeScale.title3,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.colors.textPrimary,
    },
    pills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing4.sm,
    },
    pill: {
      flexGrow: 1,
      flexBasis: 140,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      borderRadius: 16,
      padding: brandSpacing4.smd,
      backgroundColor: theme.semanticColors.surfaceSoft,
    },
    pillCopy: {
      flex: 1,
    },
    pillCaption: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
    },
    pillValue: {
      ...brandTypeScale.subhead,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.colors.textPrimary,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.smd,
    },
    rowIcon: {
      marginTop: 2,
    },
    rowCopy: {
      flex: 1,
      gap: brandSpacing4.xxs,
    },
    caption: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    value: {
      ...brandTypeScale.subhead,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textPrimary,
    },
    link: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      alignSelf: "flex-start",
    },
    linkText: {
      ...brandTypography.sectionHeader,
      color: theme.visual.accentText,
    },
    legacy: {
      gap: brandSpacing4.xs,
      paddingHorizontal: brandSpacing4.xs,
    },
    legacyRow: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    legacyBody: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
  })
}
