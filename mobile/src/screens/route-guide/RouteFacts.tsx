import { Ionicons } from "@expo/vector-icons"
import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated"
import { brandMotion, brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
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

type TileProps = {
  index: number
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  valueTestID: string
  caption?: string
}

/** One figure: a round glyph, its label, the value large, and a small note under it. */
function Tile({ index, icon, label, value, valueTestID, caption }: TileProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <Animated.View
      style={styles.tile}
      entering={FadeInDown.delay(index * 90)
        .duration(brandMotion.durations.base)
        .reduceMotion(ReduceMotion.System)}
    >
      <AppCard variant="glass" padding={brandSpacing4.md} style={styles.card}>
        <View style={styles.head}>
          <View style={styles.badge}>
            <Ionicons
              name={icon}
              size={20}
              color={theme.semanticColors.accent}
              accessible={false}
            />
          </View>
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value} testID={valueTestID}>
          {value}
        </Text>
        {caption === undefined ? null : <Text style={styles.caption}>{caption}</Text>}
      </AppCard>
    </Animated.View>
  )
}

/**
 * The two figures an observer plans a survey with, set apart under the forest card (owner check,
 * Phase 30): the surface described and the estimated duration. Information only; each is a tile of
 * its own with a glyph, so it reads first, and the tiles wrap under a large text size.
 */
export function RouteFacts({ hectares, durationRange }: RouteFactsProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  if (hectares === null && durationRange === undefined) return null
  const facts = fr.routeGuide.facts

  return (
    <View style={styles.row} testID="route-facts">
      {hectares === null ? null : (
        <Tile
          index={0}
          icon="scan-outline"
          label={facts.surface}
          value={facts.hectares(hectares)}
          valueTestID="route-fact-surface"
        />
      )}
      {durationRange === undefined ? null : (
        <Tile
          index={1}
          icon="time-outline"
          label={facts.duration}
          value={durationRange}
          valueTestID="route-fact-duration"
          caption={facts.durationCaption}
        />
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
    card: {
      gap: brandSpacing4.sm,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    badge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.semanticColors.surfaceSoft,
    },
    label: {
      flex: 1,
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
    },
    value: {
      ...brandTypeScale.title2,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.colors.textPrimary,
    },
    caption: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
    },
  })
}
