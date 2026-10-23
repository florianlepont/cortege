import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppText as Text } from "../../ui/AppText"

export type RouteFactsProps = {
  /** The surface described, already worded ("2,4"); null when it cannot be told. */
  hectares: string | null
  /** The estimated duration for an observer used to the IBP, already worded ("53 à 63 minutes"). */
  durationRange?: string
}

/**
 * The two figures an observer plans a survey with, set apart under the forest card (owner check,
 * Phase 30): the surface described and the estimated duration. Information only; each is a tile of
 * its own so it reads first, and the tiles wrap under a large text size.
 */
export function RouteFacts({ hectares, durationRange }: RouteFactsProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  if (hectares === null && durationRange === undefined) return null
  const facts = fr.routeGuide.facts

  return (
    <View style={styles.row} testID="route-facts">
      {hectares === null ? null : (
        <AppCard variant="glass" padding={brandSpacing4.md} style={styles.tile}>
          <Text style={styles.label}>{facts.surface}</Text>
          <Text style={styles.value} testID="route-fact-surface">
            {facts.hectares(hectares)}
          </Text>
        </AppCard>
      )}
      {durationRange === undefined ? null : (
        <AppCard variant="glass" padding={brandSpacing4.md} style={styles.tile}>
          <Text style={styles.label}>{facts.duration}</Text>
          <Text style={styles.value} testID="route-fact-duration">
            {durationRange}
          </Text>
          <Text style={styles.caption}>{facts.durationCaption}</Text>
        </AppCard>
      )}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing4.smd,
    },
    tile: {
      flexGrow: 1,
      flexBasis: 150,
    },
    label: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
    },
    value: {
      ...brandTypeScale.title3,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.colors.textPrimary,
      marginTop: brandSpacing4.xxs,
    },
    caption: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
      marginTop: brandSpacing4.xxs,
    },
  })
}
