// Why custom: the iOS multi-select circle (a ring that fills with the tint and takes a check) has no
// React Native counterpart, and no Ionicons outline glyph lets the ring and the fill take two colours.
import { useEffect, useMemo, useRef } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import { brandMotion } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"

export const SELECTION_CIRCLE_SIZE = 24
const RING_WIDTH = 1.5
const CHECK_SIZE = 16
const CHECK_FROM_SCALE = 0.85

type SelectionCircleProps = {
  selected: boolean
}

/**
 * Phase 32 (redesign A-C3): the leading circle of a multi-select row. Unticked it is a 1.5 pt ring
 * in `colors.inputBorder` (3:1 on the glass card in both schemes, the token made for a control
 * border); ticked it is filled with `semanticColors.ctaPrimary` and carries an outline check in
 * `onCtaPrimary`, so the state is told by the shape and the check, never by colour alone. The check
 * settles from 0.85 to 1 with a snappy spring (`ReduceMotion.System`). Decorative: the pressable
 * around it is the checkbox and speaks for it.
 */
export function SelectionCircle({ selected }: SelectionCircleProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const scale = useSharedValue(1)
  const mounted = useRef(false)

  useEffect(() => {
    // No motion at mount: a list opening with ticked rows must not pop.
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (selected) {
      scale.value = CHECK_FROM_SCALE
      scale.value = withSpring(1, {
        ...brandMotion.springs.snappy,
        reduceMotion: ReduceMotion.System,
      })
    }
  }, [selected, scale])

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <View
      style={[styles.circle, selected ? styles.circleOn : styles.circleOff]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {selected ? (
        <Animated.View style={checkStyle}>
          <Ionicons
            name="checkmark-outline"
            size={CHECK_SIZE}
            color={theme.semanticColors.onCtaPrimary}
            accessible={false}
          />
        </Animated.View>
      ) : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    circle: {
      width: SELECTION_CIRCLE_SIZE,
      height: SELECTION_CIRCLE_SIZE,
      borderRadius: SELECTION_CIRCLE_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    circleOff: {
      borderWidth: RING_WIDTH,
      borderColor: theme.colors.inputBorder,
    },
    circleOn: {
      backgroundColor: theme.semanticColors.ctaPrimary,
    },
  })
}
