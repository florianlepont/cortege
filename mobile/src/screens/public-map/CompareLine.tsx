import { memo, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated"
import { BrandTheme, useBrandTheme } from "../../app/theme"

/** The line is 4 pt wide: a 1 pt graphite edge, a 2 pt white core, a 1 pt graphite edge. */
export const COMPARE_LINE_WIDTH = 4

export type CompareLineProps = {
  /** The line's x, in points from the left edge (the clip hook owns it). */
  lineX: SharedValue<number>
  /** Where the line starts (the top safe area); it runs to the bottom of the map area. */
  top?: number
}

/**
 * The comparison line (UI-SPEC section 5, owner item 13 b): purely decorative. It takes no touch
 * (the grabber is the only grab zone) and is hidden from accessibility; it follows `lineX` on the
 * UI thread.
 */
export const CompareLine = memo(function CompareLine({ lineX, top = 0 }: CompareLineProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const position = useAnimatedStyle(() => ({ left: lineX.value - COMPARE_LINE_WIDTH / 2 }))

  return (
    <Animated.View
      testID="compare-line"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.line, { top }, position]}
    >
      <View style={styles.edge} />
      <View style={styles.core} />
      <View style={styles.edge} />
    </Animated.View>
  )
})

function createStyles(theme: BrandTheme) {
  const { curtain } = theme.visual
  return StyleSheet.create({
    line: { position: "absolute", bottom: 0, width: COMPARE_LINE_WIDTH, flexDirection: "row" },
    edge: { width: 1, backgroundColor: curtain.edge },
    core: { width: 2, backgroundColor: curtain.line },
  })
}
