import type { SurveyRoute } from "@cortege/ibp-domain"
import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import {
  brandDefaultFontFamily,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../../app/brand-tokens"
import { routeDisplayRows } from "../../../app/route-display"
import { type BrandTheme, useBrandTheme } from "../../../app/theme"
import { fr } from "../../../i18n"
import { AppCard } from "../../../ui/AppCard"
import { AppPressable } from "../../../ui/AppPressable"
import { AppSectionHeader } from "../../../ui/AppSectionHeader"
import { AppText as Text } from "../../../ui/AppText"

const t = fr.surveyDetail.route

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
  return (
    <View testID="route-section">
      <AppCard variant="glass" padding={brandSpacing4.md} style={styles.card}>
        <AppSectionHeader title={t.title} titleAccessibilityRole="header" />
        {rows.map((row) => (
          <View key={row.id} style={styles.row} testID={`route-row-${row.id}`}>
            <Text style={styles.caption}>{row.caption}</Text>
            <Text style={styles.value}>{row.value}</Text>
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
    row: {
      gap: brandSpacing4.xs,
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
      justifyContent: "center",
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
