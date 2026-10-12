import { memo, useMemo } from "react"
import { StyleSheet } from "react-native"
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import { brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"

const GLYPH_SIZE = 22

export type CompareUnavailableCardProps = {
  /** The half of the comparison whose layer is not downloaded for the view. */
  side: "left" | "right"
  /** The line's x, in points from the left edge (UI-thread value shared with the line). */
  lineX: SharedValue<number>
  /** The width of the map area. */
  width: number
}

/**
 * The neutral card over a half of the comparison whose layer has no tiles for the view (offline,
 * the view left the downloaded area): the canvas colour and one short text, never raw black. It
 * covers exactly its half and follows the line; it takes no touch.
 */
export const CompareUnavailableCard = memo(function CompareUnavailableCard({
  side,
  lineX,
  width,
}: CompareUnavailableCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const half = useAnimatedStyle(() =>
    side === "left"
      ? { left: 0, width: lineX.value }
      : { left: lineX.value, width: width - lineX.value },
  )
  return (
    <Animated.View
      testID={`compare-unavailable-${side}`}
      pointerEvents="none"
      accessible
      accessibilityLabel={fr.mapLayers.compare.unavailableCard}
      style={[styles.card, half]}
    >
      <Ionicons name="cloud-offline-outline" size={GLYPH_SIZE} color={theme.colors.textSecondary} />
      <Text style={styles.text}>{fr.mapLayers.compare.unavailableCard}</Text>
    </Animated.View>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    card: {
      position: "absolute",
      top: 0,
      bottom: 0,
      backgroundColor: theme.colors.canvas,
      alignItems: "center",
      justifyContent: "center",
      gap: brandSpacing4.sm,
    },
    text: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
  })
}
