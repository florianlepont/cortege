import { Ionicons } from "@expo/vector-icons"
import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import type { RouteReasonCode } from "@cortege/ibp-domain"
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { ROUTE_REASON_TEXT } from "../../app/route-text"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppText as Text } from "../../ui/AppText"

/** The most reasons shown (spec section 5: the package returns at most four). */
const MAX_REASONS = 4

export type ReasonsCardProps = {
  /** The package's reason codes, in its order. */
  reasons: readonly RouteReasonCode[]
}

/**
 * "Pourquoi ce conseil ?" (UI-SPEC section 4.2, ROADMAP criterion 2): one plain-French line per
 * reason code of the package, always open, each with a check glyph. The sentences are static
 * catalogue text keyed by the code (`ROUTE_REASON_TEXT`), so nothing here explains a rule of its own.
 */
export function ReasonsCard({ reasons }: ReasonsCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  if (reasons.length === 0) return null

  return (
    <AppCard variant="glass" padding={brandSpacing4.md}>
      <View style={styles.root} testID="route-reasons">
        <Text style={styles.title} accessibilityRole="header">
          {fr.routeGuide.suggestion.reasonsTitle}
        </Text>
        {reasons.slice(0, MAX_REASONS).map((code) => (
          <View key={code} style={styles.line}>
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={theme.colors.textSecondary}
              accessible={false}
              importantForAccessibility="no"
              style={styles.glyph}
            />
            <Text style={styles.reason}>{ROUTE_REASON_TEXT[code]}</Text>
          </View>
        ))}
      </View>
    </AppCard>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    root: {
      gap: brandSpacing4.smd,
    },
    title: {
      ...brandTypeScale.headline,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.colors.textPrimary,
    },
    line: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.smd,
    },
    glyph: {
      marginTop: 1,
    },
    reason: {
      flex: 1,
      ...brandTypeScale.subhead,
      color: theme.colors.textPrimary,
    },
  })
}
