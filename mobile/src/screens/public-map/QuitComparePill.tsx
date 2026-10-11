import { memo, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import { brandMotion, brandRadius, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { GlassSurface } from "../../ui/GlassSurface"
import { MAP_CONTROL_HIT_SLOP, MAP_PILL_HEIGHT } from "./MapChips"

const t = fr.mapLayers.compare

/** Kept clear on both sides: the capsule and the overlay button sit within 72 pt of the right edge. */
const SIDE_INSET = 72
const MAX_WIDTH = 232
const GLYPH_SIZE = 16

export type QuitComparePillProps = {
  /** Distance from the top of the map: level with the capsule's top. */
  top: number
  onQuit: () => void
}

/**
 * The one control of a free comparison (UI-SPEC section 4, U-21): a centred, labelled pill that
 * ends the comparison and keeps side A, the left layer. The screen shows it only while the map is
 * free (the swipe mode off); it hands over to "Terminé" when the swipe mode is on.
 */
export const QuitComparePill = memo(function QuitComparePill({
  top,
  onQuit,
}: QuitComparePillProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <View pointerEvents="box-none" style={[styles.row, { top }]}>
      <Animated.View
        entering={FadeIn.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)}
      >
        <GlassSurface
          tone="auto"
          interactive
          surface={theme.visual.mapControl.glass}
          style={styles.pill}
        >
          <AppPressable
            testID="compare-quit"
            disableScale
            disableRipple
            hitSlop={MAP_CONTROL_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t.exit}
            accessibilityHint={t.exitA11yHint}
            onPress={onQuit}
            style={styles.hit}
          >
            <Ionicons
              name="close-outline"
              size={GLYPH_SIZE}
              color={theme.visual.mapControl.icon}
              style={styles.glyph}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">
              {t.exit}
            </Text>
          </AppPressable>
        </GlassSurface>
      </Animated.View>
    </View>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      position: "absolute",
      left: SIDE_INSET,
      right: SIDE_INSET,
      alignItems: "center",
    },
    pill: {
      height: MAP_PILL_HEIGHT,
      maxWidth: MAX_WIDTH,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.visual.mapControl.hairline,
      justifyContent: "center",
    },
    hit: {
      minHeight: MAP_PILL_HEIGHT,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
    },
    glyph: {
      marginRight: brandSpacing4.xs,
    },
    label: {
      ...brandTypography.meta,
      color: theme.visual.mapControl.text,
      flexShrink: 1,
    },
  })
}
